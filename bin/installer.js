"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  FILE_SPECS,
  LAYOUT_MODE,
  LAYOUT_VERSION,
  OWNERSHIP,
  inspectPath,
  resolveTargetRoot,
  sha256,
} = require("./doctor-shared");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const INITIAL_BASELINE_FILE_TOKEN = "{{INITIAL_BASELINE_FILE}}";
const DEFAULT_BOOTSTRAP = Object.freeze({
  id: "BL-19700101-000000-bootstrap-unconfirmed",
  file: "BL-19700101-000000-bootstrap-unconfirmed.md",
  date: "1970-01-01T00:00:00.000Z",
});
const GENERATED_SOURCE_PATHS = Object.freeze({
  ".ai-os/lanes/default/baseline-log/{{INITIAL_BASELINE_FILE}}":
    "framework/.agents/templates/lane/baseline-log/BL-template.md",
});
const TEAM_CONFIG_PATHS = new Set([".gitignore", ".gitattributes"]);
const IDE_PATHS = new Set(["CLAUDE.md", "GEMINI.md"]);
const OWNERSHIP_VALUES = new Set(Object.values(OWNERSHIP));

class InstallPlannerError extends Error {
  constructor(message, options) {
    super(`install planner: ${message}`, options);
    this.name = "InstallPlannerError";
    this.code = "ERR_INSTALL_PLANNER";
  }
}

function failPlanner(message, cause) {
  throw new InstallPlannerError(message, cause ? { cause } : undefined);
}

function normalizedRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    failPlanner(`${label} must be a non-empty relative path`);
  }
  if (value.includes("\\") || path.posix.isAbsolute(value)) {
    failPlanner(`${label} is not a normalized relative path: ${value}`);
  }
  const normalized = path.posix.normalize(value);
  if (
    normalized !== value
    || normalized === ".."
    || normalized.startsWith("../")
    || normalized.split("/").includes("..")
  ) {
    failPlanner(`${label} is not a normalized relative path: ${value}`);
  }
  return normalized;
}

function normalizeBootstrap(value) {
  const bootstrap = value === undefined ? DEFAULT_BOOTSTRAP : value;
  if (!bootstrap || typeof bootstrap !== "object") {
    failPlanner("bootstrap must be an object");
  }
  for (const key of ["id", "file", "date"]) {
    if (typeof bootstrap[key] !== "string" || bootstrap[key].length === 0) {
      failPlanner(`bootstrap.${key} must be a non-empty string`);
    }
  }
  if (path.posix.basename(bootstrap.file) !== bootstrap.file || !bootstrap.file.endsWith(".md")) {
    failPlanner(`bootstrap.file must be one markdown filename: ${bootstrap.file}`);
  }
  return Object.freeze({
    id: bootstrap.id,
    file: bootstrap.file,
    date: bootstrap.date,
  });
}

function collectionEntries(value, label) {
  if (value === undefined || value === null) return [];
  if (value instanceof Map) return [...value.entries()];
  if (typeof value === "object" && !Array.isArray(value)) return Object.entries(value);
  failPlanner(`${label} must be a Map or plain object`);
}

function normalizeHashMap(value, label) {
  const result = new Map();
  for (const [rawPath, rawHashes] of collectionEntries(value, label)) {
    const relativePath = normalizedRelativePath(rawPath, `${label} key`);
    let values;
    if (rawHashes instanceof Set || Array.isArray(rawHashes)) values = [...rawHashes];
    else if (typeof rawHashes === "string") values = [rawHashes];
    else failPlanner(`${label}[${relativePath}] must contain hashes`);
    const hashes = new Set();
    for (const hash of values) {
      if (typeof hash !== "string" || !HASH_PATTERN.test(hash)) {
        failPlanner(`${label}[${relativePath}] contains an invalid SHA-256 hash`);
      }
      hashes.add(hash);
    }
    result.set(relativePath, hashes);
  }
  return result;
}

function normalizeSourceOverrides(value) {
  const result = new Map();
  for (const [key, content] of collectionEntries(value, "sourceOverrides")) {
    normalizedRelativePath(key, "sourceOverrides key");
    if (content === null) {
      result.set(key, null);
      continue;
    }
    if (typeof content === "string" || Buffer.isBuffer(content) || ArrayBuffer.isView(content)) {
      result.set(key, Buffer.from(content));
      continue;
    }
    failPlanner(`sourceOverrides[${key}] must be bytes, a string, or null`);
  }
  return result;
}

function validateDescriptor(descriptor) {
  if (!descriptor || typeof descriptor !== "object") {
    failPlanner("source inventory descriptor must be an object");
  }
  const rawPath = normalizedRelativePath(descriptor.path, "source inventory destination");
  if (descriptor.type !== "file") {
    failPlanner(`unsupported source type for ${rawPath}: ${descriptor.type}`);
  }
  if (!OWNERSHIP_VALUES.has(descriptor.ownership)) {
    failPlanner(`unknown ownership for ${rawPath}: ${descriptor.ownership}`);
  }
  if (![0o644, 0o755].includes(descriptor.mode)) {
    failPlanner(`unsupported mode for ${rawPath}: ${descriptor.mode}`);
  }
  if (typeof descriptor.generated !== "boolean") {
    failPlanner(`generated metadata must be boolean for ${rawPath}`);
  }
  if (descriptor.generated) {
    if (descriptor.source !== null) failPlanner(`generated source must be null for ${rawPath}`);
  } else {
    normalizedRelativePath(descriptor.source, `packaged source for ${rawPath}`);
  }
  return rawPath;
}

function readPackagedBytes(sourceRoot, sourcePath, expectedMode, overrides, destinationPath) {
  const overrideKey = overrides.has(sourcePath)
    ? sourcePath
    : overrides.has(destinationPath) ? destinationPath : null;

  let inspected;
  try {
    inspected = inspectPath(sourceRoot, sourcePath);
  } catch (error) {
    return { error: `packaged source ${sourcePath}: ${error.message}` };
  }
  if (!inspected.exists) return { error: `packaged source ${sourcePath} is missing` };
  if (inspected.kind !== "file") {
    return { error: `packaged source ${sourcePath} is not a regular file` };
  }

  let stat;
  try {
    stat = fs.lstatSync(inspected.absolute);
  } catch (error) {
    return { error: `packaged source ${sourcePath} is unreadable: ${error.message}` };
  }
  const actualExecutable = Boolean((stat.mode & 0o777) & 0o111);
  const expectedExecutable = Boolean(expectedMode & 0o111);
  if (actualExecutable !== expectedExecutable) {
    const actual = (stat.mode & 0o777).toString(8);
    const expected = expectedExecutable ? "executable" : "data";
    return { error: `packaged source ${sourcePath} has unsupported source mode ${actual}; expected ${expected}` };
  }

  try {
    const packagedBytes = fs.readFileSync(inspected.absolute);
    if (overrideKey === null) return { bytes: packagedBytes };
    const overrideBytes = overrides.get(overrideKey);
    if (overrideBytes === null) return { error: `packaged source ${sourcePath} is missing` };
    return { bytes: Buffer.from(overrideBytes) };
  } catch (error) {
    return { error: `packaged source ${sourcePath} is unreadable: ${error.message}` };
  }
}

function replaceBootstrapTokens(bytes, bootstrap) {
  const content = bytes.toString("utf8")
    .split("{{INITIAL_BASELINE_ID}}").join(bootstrap.id)
    .split(INITIAL_BASELINE_FILE_TOKEN).join(bootstrap.file)
    .split("{{INITIAL_BASELINE_DATE}}").join(bootstrap.date);
  return Buffer.from(content, "utf8");
}

function frameworkMetadata(version) {
  return Buffer.from([
    "# AI-OS framework metadata",
    `schema_version = "${LAYOUT_VERSION}"`,
    `layout_version = "${LAYOUT_VERSION}"`,
    `layout_mode = "${LAYOUT_MODE}"`,
    'default_lane = "default"',
    `framework_version = "${version}"`,
    "",
  ].join("\n"));
}

function generatedTeamConfig(relativePath) {
  if (relativePath === ".gitignore") {
    return Buffer.from([
      "# AI-OS managed (session-local and generated files)",
      ".ai-os/lanes/*/STATE.md",
      ".ai-os/framework.toml",
      ".ai-os/managed-files.tsv",
      "",
    ].join("\n"));
  }
  return Buffer.from([
    "# AI-OS managed (append-only knowledge)",
    ".ai-os/memory.md merge=union",
    "",
  ].join("\n"));
}

function managedFilesManifest(entries) {
  const rows = entries
    .filter((entry) => entry.relativePath !== ".ai-os/managed-files.tsv")
    .map((entry) => {
      const sourceHash = entry.ownership === OWNERSHIP.FRAMEWORK && entry.content
        ? sha256(entry.content)
        : "";
      return `${entry.relativePath}\t${entry.type}\t${entry.ownership}\t${sourceHash}`;
    })
    .sort();
  return Buffer.from(["# path\ttype\townership\tsource_sha256", ...rows, ""].join("\n"));
}

function sourceInventory(options) {
  const bootstrap = normalizeBootstrap(options.bootstrap);
  const sourceRoot = path.resolve(options.sourceRoot || PACKAGE_ROOT);
  const overrides = normalizeSourceOverrides(options.sourceOverrides);
  const descriptors = options.fileSpecs === undefined
    ? Object.values(FILE_SPECS)
    : options.fileSpecs;
  if (!Array.isArray(descriptors)) failPlanner("fileSpecs must be an array");

  const entries = [];
  const destinations = new Set();
  for (const descriptor of descriptors) {
    const rawPath = validateDescriptor(descriptor);
    if (options.teamConfig === false && TEAM_CONFIG_PATHS.has(rawPath)) continue;
    if (options.ideFiles === false && IDE_PATHS.has(rawPath)) continue;
    const relativePath = normalizedRelativePath(
      rawPath.split(INITIAL_BASELINE_FILE_TOKEN).join(bootstrap.file),
      "rendered destination",
    );
    if (destinations.has(relativePath)) failPlanner(`duplicate destination: ${relativePath}`);
    destinations.add(relativePath);
    entries.push({
      rawPath,
      relativePath,
      type: descriptor.type,
      ownership: descriptor.ownership,
      mode: descriptor.mode,
      sourcePath: descriptor.source || GENERATED_SOURCE_PATHS[rawPath] || null,
      generated: descriptor.generated,
      content: null,
      error: null,
    });
  }

  for (const entry of entries) {
    if (entry.sourcePath === null) continue;
    const result = readPackagedBytes(
      sourceRoot,
      entry.sourcePath,
      entry.mode,
      overrides,
      entry.relativePath,
    );
    if (result.error) entry.error = result.error;
    else {
      entry.content = entry.ownership === OWNERSHIP.FRAMEWORK
        ? Buffer.from(result.bytes)
        : replaceBootstrapTokens(result.bytes, bootstrap);
    }
  }

  const versionEntry = entries.find((entry) => entry.relativePath === ".ai-os/bin/VERSION");
  for (const entry of entries) {
    if (!entry.generated || entry.content !== null || entry.error) continue;
    if (entry.relativePath === ".ai-os/framework.toml") {
      if (!versionEntry || versionEntry.error || !versionEntry.content) {
        entry.error = "packaged source VERSION is unavailable for generated framework metadata";
      } else {
        entry.content = frameworkMetadata(versionEntry.content.toString("utf8").trim());
      }
    } else if (TEAM_CONFIG_PATHS.has(entry.relativePath)) {
      entry.content = generatedTeamConfig(entry.relativePath);
    }
  }

  const manifest = entries.find((entry) => entry.relativePath === ".ai-os/managed-files.tsv");
  if (manifest && !manifest.error) manifest.content = managedFilesManifest(entries);

  for (const entry of entries) {
    if (!entry.error && entry.content === null) {
      entry.error = `no deterministic content generator for ${entry.relativePath}`;
    }
  }
  return entries;
}

function inspectDestination(targetRoot, relativePath) {
  let inspected;
  try {
    inspected = inspectPath(targetRoot, relativePath);
  } catch (error) {
    return { exists: true, kind: "invalid", hash: null, error: error.message };
  }
  if (!inspected.exists) return { exists: false, kind: "missing", hash: null, error: null };
  if (inspected.kind !== "file") {
    return {
      exists: true,
      kind: inspected.kind,
      hash: null,
      error: `destination is not a regular file: ${relativePath}`,
    };
  }
  try {
    const bytes = fs.readFileSync(inspected.absolute);
    return { exists: true, kind: "file", hash: sha256(bytes), bytes, error: null };
  } catch (error) {
    return { exists: true, kind: "file", hash: null, error: `destination is unreadable: ${error.message}` };
  }
}

function classifyDestination(source, destination, options = {}) {
  if (destination.error || (destination.exists && destination.kind !== "file")) return "conflict";
  if (!destination.exists) return "create";
  if (source.ownership === OWNERSHIP.SESSION) return "preserve";
  if (source.ownership === OWNERSHIP.PROJECT) {
    if (source.compatibleHashes.has(destination.hash)) return "replace-pristine-project";
    return source.relativePath === "AGENTS.md" ? "conflict" : "preserve";
  }
  return options.force || destination.hash !== source.hash ? "replace-framework" : "preserve";
}

function metadataIsSupported(bytes) {
  const values = {};
  for (const line of bytes.toString("utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]+)\s*=\s*"([^"]*)"\s*$/);
    if (match) values[match[1]] = match[2];
  }
  if (!["10", "11"].includes(values.schema_version)) return false;
  if (values.layout_version && !["10", "11"].includes(values.layout_version)) return false;
  if (values.layout_mode && values.layout_mode !== LAYOUT_MODE) return false;
  return true;
}

function immutableOperation(fields) {
  const content = fields.content === null ? null : Buffer.from(fields.content);
  const operation = {
    relativePath: fields.relativePath,
    type: fields.type,
    ownership: fields.ownership,
    action: fields.action,
    mode: fields.mode,
    previousHash: fields.previousHash,
  };
  Object.defineProperty(operation, "content", {
    enumerable: true,
    get() {
      return content === null ? null : Buffer.from(content);
    },
  });
  return Object.freeze(operation);
}

function immutableConflict(relativePath, reason) {
  return Object.freeze({ relativePath, reason });
}

function immutablePlan(targetDir, operations, conflicts) {
  return Object.freeze({
    targetDir,
    operations: Object.freeze(operations),
    conflicts: Object.freeze(conflicts),
  });
}

function destinationConflictReason(relativePath, destination) {
  if (destination.error) return destination.error;
  return `destination is not a regular file: ${relativePath}`;
}

function buildInstallPlan(targetDir, options = {}) {
  if (typeof targetDir !== "string" || targetDir.length === 0) {
    failPlanner("targetDir must be a non-empty string");
  }

  const compatibleHashes = normalizeHashMap(options.compatibleHashes, "compatibleHashes");
  const obsoleteHashes = normalizeHashMap(
    options.obsoleteFrameworkHashes,
    "obsoleteFrameworkHashes",
  );
  const inventory = sourceInventory(options);
  const currentPaths = new Set(inventory.map((entry) => entry.relativePath));
  for (const obsoletePath of obsoleteHashes.keys()) {
    if (currentPaths.has(obsoletePath)) failPlanner(`obsolete path is still current: ${obsoletePath}`);
  }

  let resolvedTarget = path.resolve(targetDir);
  let targetError = null;
  try {
    resolvedTarget = resolveTargetRoot(targetDir);
  } catch (error) {
    targetError = error;
  }

  const operations = [];
  const conflicts = [];
  for (const entry of inventory) {
    const destination = targetError
      ? { exists: true, kind: "invalid", hash: null, error: targetError.message }
      : inspectDestination(resolvedTarget, entry.relativePath);
    const accepted = new Set(compatibleHashes.get(entry.relativePath) || []);
    const sourceHash = entry.content === null ? null : sha256(entry.content);
    if (entry.ownership === OWNERSHIP.PROJECT && sourceHash) accepted.add(sourceHash);
    const source = {
      relativePath: entry.relativePath,
      ownership: entry.ownership,
      hash: sourceHash,
      compatibleHashes: accepted,
    };

    let action;
    let reason = null;
    if (entry.error) {
      action = "conflict";
      reason = entry.error;
    } else {
      action = classifyDestination(source, destination, { force: options.force === true });
      if (action === "conflict") {
        reason = destination.error
          ? destinationConflictReason(entry.relativePath, destination)
          : entry.relativePath === "AGENTS.md"
            ? "AGENTS.md requires manual merge because its full-content hash is unknown"
            : `destination conflict: ${entry.relativePath}`;
      } else if (
        entry.relativePath === ".ai-os/framework.toml"
        && destination.exists
        && destination.bytes
        && !metadataIsSupported(destination.bytes)
      ) {
        action = "conflict";
        reason = "unsupported metadata in .ai-os/framework.toml";
      }
    }

    const operation = immutableOperation({
      relativePath: entry.relativePath,
      type: entry.type,
      ownership: entry.ownership,
      action,
      content: entry.content,
      mode: entry.mode,
      previousHash: destination.hash,
    });
    operations.push(operation);
    if (reason !== null) conflicts.push(immutableConflict(entry.relativePath, reason));
  }

  if (!targetError) {
    for (const [relativePath, acceptedHashes] of [...obsoleteHashes.entries()].sort()) {
      const destination = inspectDestination(resolvedTarget, relativePath);
      if (!destination.exists) continue;
      let action;
      let reason = null;
      if (destination.error || destination.kind !== "file") {
        action = "conflict";
        reason = destinationConflictReason(relativePath, destination);
      } else if (acceptedHashes.has(destination.hash)) {
        action = "remove-framework";
      } else {
        action = "conflict";
        reason = `unrecognized obsolete framework bytes at ${relativePath}`;
      }
      operations.push(immutableOperation({
        relativePath,
        type: "file",
        ownership: OWNERSHIP.FRAMEWORK,
        action,
        content: null,
        mode: 0o644,
        previousHash: destination.hash,
      }));
      if (reason !== null) conflicts.push(immutableConflict(relativePath, reason));
    }
  }

  return immutablePlan(resolvedTarget, operations, conflicts);
}

module.exports = {
  InstallPlannerError,
  buildInstallPlan,
  classifyDestination,
};
