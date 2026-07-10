"use strict";

const crypto = require("node:crypto");
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
const MAX_BACKUP_RESERVATIONS = 8;

class InstallPlannerError extends Error {
  constructor(message, options) {
    super(`install planner: ${message}`, options);
    this.name = "InstallPlannerError";
    this.code = "ERR_INSTALL_PLANNER";
  }
}

class InstallConflictError extends Error {
  constructor(conflicts) {
    const snapshot = [...conflicts]
      .map(({ relativePath, reason }) => Object.freeze({ relativePath, reason }))
      .sort((left, right) => (
        left.relativePath.localeCompare(right.relativePath)
        || left.reason.localeCompare(right.reason)
      ));
    super(`install conflict: ${snapshot
      .map(({ relativePath, reason }) => `${relativePath}: ${reason}`)
      .join("; ")}`);
    this.name = "InstallConflictError";
    this.code = "ERR_INSTALL_CONFLICT";
    Object.defineProperty(this, "conflicts", {
      enumerable: true,
      value: Object.freeze(snapshot),
    });
  }
}

class InstallFilesystemError extends Error {
  constructor(phase, relativePath, cause, cleanupErrors = [], detail = cause.message) {
    const pathContext = relativePath === null ? "" : ` (${relativePath})`;
    super(`install filesystem: ${phase}${pathContext}: ${detail}`, { cause });
    this.name = "InstallFilesystemError";
    this.code = "ERR_INSTALL_FILESYSTEM";
    this.phase = phase;
    this.relativePath = relativePath;
    Object.defineProperty(this, "cleanupErrors", {
      configurable: true,
      enumerable: true,
      value: Object.freeze([...cleanupErrors]),
    });
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

function sourceInventory(options, bootstrap = normalizeBootstrap(options.bootstrap)) {
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

function immutablePlan(targetDir, operations, conflicts, metadata) {
  return Object.freeze({
    targetDir,
    operations: Object.freeze(operations),
    conflicts: Object.freeze(conflicts),
    baselineId: metadata.baselineId,
    layoutVersion: metadata.layoutVersion,
    targetExisted: metadata.targetExisted,
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

  const bootstrap = normalizeBootstrap(options.bootstrap);
  const compatibleHashes = normalizeHashMap(options.compatibleHashes, "compatibleHashes");
  const obsoleteHashes = normalizeHashMap(
    options.obsoleteFrameworkHashes,
    "obsoleteFrameworkHashes",
  );
  const inventory = sourceInventory(options, bootstrap);
  const currentPaths = new Set(inventory.map((entry) => entry.relativePath));
  for (const obsoletePath of obsoleteHashes.keys()) {
    if (currentPaths.has(obsoletePath)) failPlanner(`obsolete path is still current: ${obsoletePath}`);
  }

  let resolvedTarget = path.resolve(targetDir);
  let targetExisted = false;
  try {
    fs.lstatSync(resolvedTarget);
    targetExisted = true;
  } catch (error) {
    if (error.code !== "ENOENT") targetExisted = true;
  }
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

  return immutablePlan(resolvedTarget, operations, conflicts, {
    baselineId: bootstrap.id,
    layoutVersion: LAYOUT_VERSION,
    targetExisted,
  });
}

function createDefaultFsOps() {
  return {
    lstat: (...args) => fs.lstatSync(...args),
    fstat: (...args) => fs.fstatSync(...args),
    readFile: (...args) => fs.readFileSync(...args),
    open: (...args) => fs.openSync(...args),
    write: (...args) => fs.writeSync(...args),
    fsync: (...args) => fs.fsyncSync(...args),
    fchmod: (...args) => fs.fchmodSync(...args),
    close: (...args) => fs.closeSync(...args),
    mkdir: (...args) => fs.mkdirSync(...args),
    link: (...args) => fs.linkSync(...args),
    rename: (...args) => fs.renameSync(...args),
    unlink: (...args) => fs.unlinkSync(...args),
    rmdir: (...args) => fs.rmdirSync(...args),
    readdir: (...args) => fs.readdirSync(...args),
  };
}

function filesystemError(phase, relativePath, cause, detail = cause.message) {
  if (cause instanceof InstallFilesystemError) return cause;
  return new InstallFilesystemError(phase, relativePath, cause, [], detail);
}

function appendCleanupErrors(error, cleanupErrors) {
  if (cleanupErrors.length === 0) return error;
  if (!(error instanceof InstallFilesystemError)) {
    return new InstallFilesystemError(
      "execute install plan",
      null,
      error,
      cleanupErrors,
    );
  }
  Object.defineProperty(error, "cleanupErrors", {
    configurable: true,
    enumerable: true,
    value: Object.freeze([...error.cleanupErrors, ...cleanupErrors]),
  });
  return error;
}

function lstatIfPresent(absolutePath, fsOps, phase, relativePath) {
  try {
    return fsOps.lstat(absolutePath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw filesystemError(phase, relativePath, error);
  }
}

function ensureDirectoryTree(directory, fsOps, tx, context) {
  const missing = [];
  let current = directory;
  for (;;) {
    const stat = lstatIfPresent(current, fsOps, context.phase, context.relativePath);
    if (stat !== null) {
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw filesystemError(
          context.phase,
          context.relativePath,
          new Error(`path is not a safe directory: ${current}`),
        );
      }
      break;
    }
    missing.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      throw filesystemError(
        context.phase,
        context.relativePath,
        new Error(`no existing directory ancestor for ${directory}`),
      );
    }
    current = parent;
  }

  for (const absolutePath of missing.reverse()) {
    const record = {
      absolutePath,
      created: false,
      identity: null,
      phase: context.phase,
      relativePath: context.relativePath,
    };
    tx.createdDirectories.push(record);
    try {
      fsOps.mkdir(absolutePath, { mode: 0o755 });
      record.created = true;
    } catch (error) {
      throw filesystemError(context.phase, context.relativePath, error);
    }
    const createdStat = lstatIfPresent(
      absolutePath,
      fsOps,
      context.phase,
      context.relativePath,
    );
    if (
      createdStat === null
      || createdStat.isSymbolicLink()
      || !createdStat.isDirectory()
    ) {
      throw filesystemError(
        context.phase,
        context.relativePath,
        new Error(`created path is not a safe directory: ${absolutePath}`),
      );
    }
    record.identity = fileIdentity(createdStat);
    if (absolutePath === tx.targetDir) tx.targetCreated = true;
  }
}

function ensureTargetForTransaction(plan, fsOps, tx) {
  ensureDirectoryTree(plan.targetDir, fsOps, tx, {
    phase: "create target",
    relativePath: null,
  });
}

function captureLockIdentity(lock, fsOps) {
  const stat = fsOps.fstat(lock.fd);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("opened lock is not a regular file");
  }
  lock.identity = fileIdentity(stat);
  lock.expectedMode = stat.mode & 0o777;
}

function writeLockNonce(lock, fsOps) {
  let offset = 0;
  while (offset < lock.nonce.length) {
    const written = fsOps.write(
      lock.fd,
      lock.nonce,
      offset,
      lock.nonce.length - offset,
      null,
    );
    if (!Number.isInteger(written) || written <= 0) {
      throw new Error("lock nonce write made no forward progress");
    }
    offset += written;
    lock.expectedHash = sha256(lock.nonce.subarray(0, offset));
  }
  fsOps.fsync(lock.fd);
  lock.nonceWritten = true;
}

function acquireLock(targetDir, fsOps, tx) {
  const lockPath = path.join(targetDir, ".ai-os-install.lock");
  const flags = fs.constants.O_WRONLY
    | fs.constants.O_CREAT
    | fs.constants.O_EXCL
    | (fs.constants.O_NOFOLLOW || 0);
  const nonce = crypto.randomBytes(32);
  try {
    const fd = fsOps.open(lockPath, flags, 0o600);
    const lock = {
      fd,
      path: lockPath,
      closed: false,
      owned: true,
      identity: null,
      nonce,
      nonceWritten: false,
      expectedHash: sha256(Buffer.alloc(0)),
      expectedMode: null,
    };
    tx.lock = lock;
    writeLockNonce(lock, fsOps);
    captureLockIdentity(lock, fsOps);
    return lock;
  } catch (error) {
    const detail = error.code === "EEXIST"
      ? "installation already in progress"
      : error.message;
    throw filesystemError("acquire lock", null, error, detail);
  }
}

function uniqueTransactionPath(destination, kind) {
  const suffix = crypto.randomBytes(12).toString("hex");
  return path.join(
    path.dirname(destination),
    `.${path.basename(destination)}.ai-os-install-${kind}-${process.pid}-${suffix}`,
  );
}

function closeStagedDescriptor(record, fsOps) {
  if (record.fd === null) return null;
  try {
    fsOps.close(record.fd);
    record.fd = null;
    return null;
  } catch (error) {
    return filesystemError("close staged file", record.operation.relativePath, error);
  }
}

function writeStagedContent(record, fsOps) {
  const flags = fs.constants.O_WRONLY
    | fs.constants.O_CREAT
    | fs.constants.O_EXCL
    | (fs.constants.O_NOFOLLOW || 0);
  let failure = null;
  let offset = 0;
  try {
    record.fd = fsOps.open(record.tempPath, flags, 0o600);
    record.tempOwned = true;
    const openedStat = fsOps.fstat(record.fd);
    if (openedStat.isSymbolicLink() || !openedStat.isFile()) {
      throw new Error("opened staged path is not a regular file");
    }
    record.tempIdentity = fileIdentity(openedStat);
    record.tempExpectedMode = openedStat.mode & 0o777;
    const content = record.operation.content;
    while (offset < content.length) {
      const written = fsOps.write(
        record.fd,
        content,
        offset,
        content.length - offset,
        null,
      );
      if (!Number.isInteger(written) || written <= 0) {
        throw new Error("staged write made no forward progress");
      }
      offset += written;
      record.tempExpectedHash = sha256(content.subarray(0, offset));
    }
    fsOps.fsync(record.fd);
    fsOps.fchmod(record.fd, record.operation.mode);
    record.tempExpectedMode = record.operation.mode;
    const finalStat = fsOps.fstat(record.fd);
    if (!matchesFileIdentity(finalStat, record.tempIdentity)) {
      throw new Error("staged descriptor identity changed");
    }
  } catch (error) {
    failure = filesystemError("stage content", record.operation.relativePath, error);
  }

  const closeError = closeStagedDescriptor(record, fsOps);
  if (failure) throw appendCleanupErrors(failure, closeError ? [closeError] : []);
  if (closeError) throw closeError;
}

function stageOperations(plan, fsOps, tx) {
  for (const operation of plan.operations) {
    if (operation.action === "preserve") continue;
    if (![
      "create",
      "replace-framework",
      "replace-pristine-project",
      "remove-framework",
    ].includes(operation.action)) {
      throw filesystemError(
        "stage operation",
        operation.relativePath,
        new Error(`unsupported install action: ${operation.action}`),
      );
    }

    const destination = path.join(plan.targetDir, ...operation.relativePath.split("/"));
    const writesContent = operation.action !== "remove-framework";
    if (writesContent) {
      ensureDirectoryTree(path.dirname(destination), fsOps, tx, {
        phase: "create parent",
        relativePath: operation.relativePath,
      });
    }
    const record = {
      operation,
      destination,
      tempPath: writesContent ? uniqueTransactionPath(destination, "stage") : null,
      backupPath: operation.action === "create"
        ? null
        : uniqueTransactionPath(destination, "backup"),
      fd: null,
      tempOwned: false,
      tempIdentity: null,
      tempExpectedHash: sha256(Buffer.alloc(0)),
      tempExpectedMode: null,
      committed: false,
      backupCreated: false,
      backupOwned: false,
      backupStarted: false,
      backupIdentity: null,
      backupExpectedHash: operation.previousHash,
      backupExpectedMode: null,
      installStarted: false,
      installOwned: false,
      removeStarted: false,
      destinationIdentity: null,
      destinationMode: null,
      stagedIdentity: null,
    };
    tx.staged.push(record);
    if (writesContent) writeStagedContent(record, fsOps);
  }
}

function throwRevalidationError(relativePath, message) {
  throw filesystemError("revalidate commit", relativePath, new Error(message));
}

function validateSafeDirectory(absolutePath, fsOps, relativePath) {
  const stat = lstatIfPresent(
    absolutePath,
    fsOps,
    "revalidate commit",
    relativePath,
  );
  if (stat === null || stat.isSymbolicLink() || !stat.isDirectory()) {
    throwRevalidationError(relativePath, `path is not a safe directory: ${absolutePath}`);
  }
}

function sameFileIdentity(before, after) {
  return before.dev === after.dev
    && before.ino === after.ino
    && before.mode === after.mode;
}

function fileIdentity(stat) {
  return Object.freeze({ dev: stat.dev, ino: stat.ino });
}

function matchesFileIdentity(stat, identity) {
  return identity !== null
    && stat.dev === identity.dev
    && stat.ino === identity.ino;
}

function readStableRegularFile(absolutePath, fsOps, relativePath, label) {
  const before = lstatIfPresent(
    absolutePath,
    fsOps,
    "revalidate commit",
    relativePath,
  );
  if (before === null || before.isSymbolicLink() || !before.isFile()) {
    throwRevalidationError(relativePath, `${label} is not a regular file`);
  }

  let bytes;
  try {
    bytes = fsOps.readFile(absolutePath);
  } catch (error) {
    throw filesystemError("revalidate commit", relativePath, error);
  }

  const after = lstatIfPresent(
    absolutePath,
    fsOps,
    "revalidate commit",
    relativePath,
  );
  if (
    after === null
    || after.isSymbolicLink()
    || !after.isFile()
    || !sameFileIdentity(before, after)
  ) {
    throwRevalidationError(relativePath, `${label} changed during validation`);
  }
  return { bytes, stat: after };
}

function revalidateDestinationsBeforeCommit(plan, fsOps, staged) {
  for (const record of staged) {
    const { operation } = record;
    validateSafeDirectory(plan.targetDir, fsOps, operation.relativePath);
    const segments = operation.relativePath.split("/");
    let parent = plan.targetDir;
    for (const segment of segments.slice(0, -1)) {
      parent = path.join(parent, segment);
      validateSafeDirectory(parent, fsOps, operation.relativePath);
    }

    if (operation.action === "create") {
      const destinationStat = lstatIfPresent(
        record.destination,
        fsOps,
        "revalidate commit",
        operation.relativePath,
      );
      if (destinationStat !== null) {
        throwRevalidationError(
          operation.relativePath,
          "create destination must remain missing",
        );
      }
    } else {
      const destination = readStableRegularFile(
        record.destination,
        fsOps,
        operation.relativePath,
        "destination",
      );
      if (sha256(destination.bytes) !== operation.previousHash) {
        throwRevalidationError(operation.relativePath, "destination bytes changed after planning");
      }
      record.destinationIdentity = fileIdentity(destination.stat);
      record.destinationMode = destination.stat.mode & 0o777;
    }

    if (record.tempPath !== null) {
      const stagedFile = readStableRegularFile(
        record.tempPath,
        fsOps,
        operation.relativePath,
        "staged file",
      );
      if (sha256(stagedFile.bytes) !== sha256(operation.content)) {
        throwRevalidationError(operation.relativePath, "staged file bytes changed");
      }
      if ((stagedFile.stat.mode & 0o777) !== operation.mode) {
        throwRevalidationError(operation.relativePath, "staged file mode changed");
      }
      record.stagedIdentity = fileIdentity(stagedFile.stat);
    }
  }
}

function recordOwnedBackup(record, backupPath) {
  record.backupPath = backupPath;
  record.backupCreated = true;
  record.backupOwned = true;
  record.backupStarted = true;
  record.backupIdentity = record.destinationIdentity;
  record.backupExpectedMode = record.destinationMode;
}

function reserveBackup(plan, record, fsOps) {
  let backupPath = record.backupPath;
  for (let attempt = 0; attempt < MAX_BACKUP_RESERVATIONS; attempt += 1) {
    revalidateDestinationsBeforeCommit(plan, fsOps, [record]);
    try {
      record.backupStarted = true;
      fsOps.link(record.destination, backupPath);
      recordOwnedBackup(record, backupPath);
      return;
    } catch (error) {
      if (error.code === "EEXIST") {
        if (attempt === MAX_BACKUP_RESERVATIONS - 1) {
          throw filesystemError("commit backup", record.operation.relativePath, error);
        }
        backupPath = uniqueTransactionPath(record.destination, "backup");
        continue;
      }
      const inspected = inspectRollbackFile(
        backupPath,
        record.destinationIdentity,
        record.operation.previousHash,
        record.destinationMode,
        fsOps,
        record.operation.relativePath,
        "commit backup",
      );
      if (!inspected.error && inspected.state === "owned") {
        recordOwnedBackup(record, backupPath);
        throw filesystemError("commit backup", record.operation.relativePath, error);
      }
      throw filesystemError("commit backup", record.operation.relativePath, error);
    }
  }
}

function commitStaged(plan, staged, fsOps) {
  for (const record of staged) {
    if (record.operation.action === "create") {
      revalidateDestinationsBeforeCommit(plan, fsOps, [record]);
      try {
        record.installStarted = true;
        fsOps.link(record.tempPath, record.destination);
        record.installOwned = true;
        record.committed = true;
        const cleanupErrors = unlinkOwnedRecordPath(record, "temp", fsOps, "commit create");
        if (cleanupErrors.length > 0) {
          throw appendCleanupErrors(cleanupErrors[0], cleanupErrors.slice(1));
        }
      } catch (error) {
        let ownershipError = null;
        if (error.code !== "EEXIST" && !record.installOwned) {
          const inspected = inspectRollbackFile(
            record.destination,
            record.stagedIdentity,
            sha256(record.operation.content),
            record.operation.mode,
            fsOps,
            record.operation.relativePath,
            "commit create",
          );
          if (!inspected.error && inspected.state === "owned") {
            record.installOwned = true;
          } else if (inspected.error) {
            ownershipError = inspected.error;
          } else if (inspected.state === "foreign") {
            ownershipError = filesystemError(
              "rollback create",
              record.operation.relativePath,
              new Error("create destination is no longer owned by this transaction"),
            );
          }
        }
        throw appendCleanupErrors(
          filesystemError("commit create", record.operation.relativePath, error),
          ownershipError === null ? [] : [ownershipError],
        );
      }
      continue;
    }
    if (record.operation.action !== "create") {
      reserveBackup(plan, record, fsOps);
    }
    revalidateDestinationsBeforeCommit(plan, fsOps, [record]);
    if (record.operation.action === "remove-framework") {
      try {
        record.removeStarted = true;
        fsOps.unlink(record.destination);
        record.committed = true;
      } catch (error) {
        throw filesystemError("commit removal", record.operation.relativePath, error);
      }
      continue;
    }
    try {
      record.installStarted = true;
      fsOps.rename(record.tempPath, record.destination);
      record.committed = true;
      record.tempOwned = false;
      record.tempPath = null;
    } catch (error) {
      const phase = record.operation.action === "create"
        ? "commit create"
        : "commit replacement";
      throw filesystemError(phase, record.operation.relativePath, error);
    }
  }
}

function inspectRollbackFile(
  absolutePath,
  expectedIdentity,
  expectedHash,
  expectedMode,
  fsOps,
  relativePath,
  phase = "inspect rollback",
) {
  let before;
  try {
    before = fsOps.lstat(absolutePath);
  } catch (error) {
    if (error.code === "ENOENT") return { state: "missing", error: null };
    return {
      state: "unknown",
      error: filesystemError(phase, relativePath, error),
    };
  }
  if (
    before.isSymbolicLink()
    || !before.isFile()
    || !matchesFileIdentity(before, expectedIdentity)
  ) {
    return { state: "foreign", error: null };
  }

  let bytes;
  let after;
  try {
    bytes = fsOps.readFile(absolutePath);
    after = fsOps.lstat(absolutePath);
  } catch (error) {
    return {
      state: "unknown",
      error: filesystemError(phase, relativePath, error),
    };
  }
  if (
    after.isSymbolicLink()
    || !after.isFile()
    || !sameFileIdentity(before, after)
    || sha256(bytes) !== expectedHash
    || (after.mode & 0o777) !== expectedMode
  ) {
    return { state: "foreign", error: null };
  }
  return { state: "owned", error: null };
}

function unlinkVerifiedPath(
  absolutePath,
  expectedIdentity,
  expectedHash,
  expectedMode,
  fsOps,
  phase,
  relativePath,
  label,
) {
  const errors = [];
  const before = inspectRollbackFile(
    absolutePath,
    expectedIdentity,
    expectedHash,
    expectedMode,
    fsOps,
    relativePath,
    phase,
  );
  if (before.error) return { relinquished: false, errors: [before.error] };
  if (before.state === "missing") return { relinquished: true, errors };
  if (before.state !== "owned") {
    return {
      relinquished: true,
      errors: [filesystemError(
        phase,
        relativePath,
        new Error(`${label} is no longer owned by this transaction`),
      )],
    };
  }

  try {
    fsOps.unlink(absolutePath);
    return { relinquished: true, errors };
  } catch (error) {
    errors.push(filesystemError(phase, relativePath, error));
  }

  const after = inspectRollbackFile(
    absolutePath,
    expectedIdentity,
    expectedHash,
    expectedMode,
    fsOps,
    relativePath,
    phase,
  );
  if (after.error) errors.push(after.error);
  else if (after.state === "foreign") {
    errors.push(filesystemError(
      phase,
      relativePath,
      new Error(`${label} is no longer owned by this transaction`),
    ));
  }
  return {
    relinquished: after.state === "missing" || after.state === "foreign",
    errors,
  };
}

function unlinkOwnedRecordPath(record, kind, fsOps, phase) {
  const result = unlinkVerifiedPath(
    record[`${kind}Path`],
    record[`${kind}Identity`],
    record[`${kind}ExpectedHash`],
    record[`${kind}ExpectedMode`],
    fsOps,
    phase,
    record.operation.relativePath,
    `${kind} path`,
  );
  if (result.relinquished) {
    record[`${kind}Owned`] = false;
    record[`${kind}Path`] = null;
  }
  return result.errors;
}

function rollbackStaged(staged, fsOps) {
  const errors = [];
  for (const record of [...staged].reverse()) {
    const relativePath = record.operation.relativePath;
    if (record.operation.action === "create") {
      if (!record.installOwned) continue;
      const result = unlinkVerifiedPath(
        record.destination,
        record.stagedIdentity,
        sha256(record.operation.content),
        record.operation.mode,
        fsOps,
        "rollback create",
        relativePath,
        "create destination",
      );
      errors.push(...result.errors);
      if (result.relinquished) {
        record.installStarted = false;
        record.installOwned = false;
        record.committed = false;
      }
      continue;
    }

    if (!record.backupStarted && !record.installStarted && !record.removeStarted) continue;

    const original = inspectRollbackFile(
      record.destination,
      record.destinationIdentity,
      record.operation.previousHash,
      record.destinationMode,
      fsOps,
      relativePath,
    );
    if (original.error) {
      errors.push(original.error);
      continue;
    }

    let destinationState = original.state;
    if (destinationState !== "owned" && record.operation.action !== "remove-framework") {
      const installed = inspectRollbackFile(
        record.destination,
        record.stagedIdentity,
        sha256(record.operation.content),
        record.operation.mode,
        fsOps,
        relativePath,
      );
      if (installed.error) {
        errors.push(installed.error);
        continue;
      }
      if (installed.state === "owned") {
        const result = unlinkVerifiedPath(
          record.destination,
          record.stagedIdentity,
          sha256(record.operation.content),
          record.operation.mode,
          fsOps,
          "rollback replacement",
          relativePath,
          "replacement destination",
        );
        errors.push(...result.errors);
        if (!result.relinquished) continue;
        destinationState = "missing";
      }
    }

    if (destinationState === "foreign") {
      errors.push(filesystemError(
        "rollback backup",
        relativePath,
        new Error("planned destination could not be restored over a foreign destination"),
      ));
      continue;
    }

    const backup = record.backupOwned
      ? inspectRollbackFile(
        record.backupPath,
        record.backupIdentity,
        record.backupExpectedHash,
        record.backupExpectedMode,
        fsOps,
        relativePath,
      )
      : { state: "missing", error: null };
    if (backup.error) {
      errors.push(backup.error);
      continue;
    }
    if (backup.state === "foreign") {
      errors.push(filesystemError(
        "rollback backup",
        relativePath,
        new Error("backup was not the planned destination file"),
      ));
      continue;
    }

    if (destinationState === "missing") {
      if (backup.state !== "owned") {
        errors.push(filesystemError(
          "rollback backup",
          relativePath,
          new Error("planned destination bytes could not be restored because backup is missing"),
        ));
        continue;
      }
      try {
        fsOps.link(record.backupPath, record.destination);
      } catch (error) {
        const restored = inspectRollbackFile(
          record.destination,
          record.destinationIdentity,
          record.operation.previousHash,
          record.destinationMode,
          fsOps,
          relativePath,
        );
        errors.push(filesystemError("rollback backup", relativePath, error));
        if (restored.error || restored.state !== "owned") continue;
      }
    }

    if (record.backupOwned) {
      errors.push(...unlinkOwnedRecordPath(record, "backup", fsOps, "rollback backup"));
      if (record.backupOwned) continue;
    }
    record.backupCreated = false;
    record.backupStarted = false;
    record.installStarted = false;
    record.removeStarted = false;
    record.committed = false;
  }
  return errors;
}

function cleanupStaged(tx, fsOps) {
  const errors = [];
  for (const record of [...tx.staged].reverse()) {
    const closeError = closeStagedDescriptor(record, fsOps);
    if (closeError) errors.push(closeError);
    if (record.tempOwned) {
      errors.push(...unlinkOwnedRecordPath(record, "temp", fsOps, "cleanup staged file"));
    }
    if (tx.committed && record.backupOwned) {
      errors.push(...unlinkOwnedRecordPath(record, "backup", fsOps, "cleanup backup file"));
    }
  }
  return errors;
}

function inspectLockByNonce(lock, fsOps) {
  if (!lock.nonceWritten) {
    const cause = new Error("lock identity and complete nonce are unavailable");
    return { state: "unknown", error: filesystemError("remove lock", null, cause) };
  }

  let before;
  try {
    before = fsOps.lstat(lock.path);
  } catch (error) {
    if (error.code === "ENOENT") return { state: "missing", error: null };
    return { state: "unknown", error: filesystemError("remove lock", null, error) };
  }
  if (before.isSymbolicLink() || !before.isFile()) {
    return { state: "foreign", error: null };
  }

  let bytes;
  let after;
  try {
    bytes = fsOps.readFile(lock.path);
    after = fsOps.lstat(lock.path);
  } catch (error) {
    return { state: "unknown", error: filesystemError("remove lock", null, error) };
  }
  if (
    after.isSymbolicLink()
    || !after.isFile()
    || !sameFileIdentity(before, after)
    || !Buffer.isBuffer(bytes)
    || !bytes.equals(lock.nonce)
  ) {
    return { state: "foreign", error: null };
  }
  return { state: "owned", error: null, identity: fileIdentity(after), mode: after.mode & 0o777 };
}

function unlinkLockByNonce(lock, fsOps) {
  const inspected = inspectLockByNonce(lock, fsOps);
  if (inspected.error) return { relinquished: false, errors: [inspected.error] };
  if (inspected.state === "missing") return { relinquished: true, errors: [] };
  if (inspected.state === "foreign") {
    return {
      relinquished: true,
      errors: [filesystemError(
        "remove lock",
        null,
        new Error("lock path is no longer owned by this transaction"),
      )],
    };
  }
  return unlinkVerifiedPath(lock.path, inspected.identity, sha256(lock.nonce), inspected.mode,
    fsOps, "remove lock", null, "lock path");
}

function releaseLock(lock, fsOps) {
  const errors = [];
  if (!lock.closed && lock.identity === null) {
    try {
      captureLockIdentity(lock, fsOps);
    } catch (error) {
      errors.push(filesystemError("capture lock identity", null, error));
    }
  }
  if (!lock.closed) {
    try {
      fsOps.close(lock.fd);
      lock.closed = true;
    } catch (error) {
      errors.push(filesystemError("close lock", null, error));
      return errors;
    }
  }
  if (lock.owned) {
    const result = lock.identity === null
      ? unlinkLockByNonce(lock, fsOps)
      : unlinkVerifiedPath(
        lock.path,
        lock.identity,
        lock.expectedHash,
        lock.expectedMode,
        fsOps,
        "remove lock",
        null,
        "lock path",
      );
    errors.push(...result.errors);
    if (result.relinquished) {
      lock.owned = false;
      lock.path = null;
    }
  }
  return errors;
}

function cleanupCreatedDirectories(createdDirectories, fsOps) {
  const errors = [];
  for (const record of [...createdDirectories].reverse()) {
    if (!record.created) continue;
    let stat;
    try {
      stat = fsOps.lstat(record.absolutePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        record.created = false;
        continue;
      }
      errors.push(filesystemError("cleanup directory", record.relativePath, error));
      continue;
    }
    if (
      stat.isSymbolicLink()
      || !stat.isDirectory()
      || !matchesFileIdentity(stat, record.identity)
    ) {
      errors.push(filesystemError(
        "cleanup directory",
        record.relativePath,
        new Error("directory is no longer owned by this transaction"),
      ));
      continue;
    }
    try {
      fsOps.rmdir(record.absolutePath);
      record.created = false;
    } catch (error) {
      if (["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) continue;
      errors.push(filesystemError(
        "cleanup directory",
        record.relativePath,
        error,
      ));
    }
  }
  return errors;
}

function installResult(plan) {
  const result = {
    created: 0,
    replaced: 0,
    preserved: 0,
    warnings: Object.freeze([]),
    baselineId: plan.baselineId,
    layoutVersion: plan.layoutVersion,
  };
  for (const operation of plan.operations) {
    if (operation.action === "create") result.created += 1;
    else if (["replace-framework", "replace-pristine-project", "remove-framework"].includes(operation.action)) {
      result.replaced += 1;
    } else if (operation.action === "preserve") result.preserved += 1;
  }
  return Object.freeze(result);
}

function executeInstallPlan(plan, { fsOps: overrides = {} } = {}) {
  if (plan.conflicts.length > 0) throw new InstallConflictError(plan.conflicts);

  const fsOps = { ...createDefaultFsOps(), ...overrides };
  const tx = {
    targetDir: plan.targetDir,
    targetCreated: false,
    createdDirectories: [],
    lock: null,
    staged: [],
    committed: false,
  };
  let result = null;
  let failure = null;

  try {
    ensureTargetForTransaction(plan, fsOps, tx);
    acquireLock(plan.targetDir, fsOps, tx);
    stageOperations(plan, fsOps, tx);
    commitStaged(plan, tx.staged, fsOps);
    tx.committed = true;
    result = installResult(plan);
  } catch (error) {
    failure = error instanceof InstallFilesystemError
      ? error
      : filesystemError("execute install plan", null, error);
  }

  const cleanupErrors = [];
  if (failure) {
    cleanupErrors.push(...rollbackStaged(tx.staged, fsOps));
    cleanupErrors.push(...rollbackStaged(tx.staged, fsOps));
  }
  cleanupErrors.push(...cleanupStaged(tx, fsOps));
  cleanupErrors.push(...cleanupStaged(tx, fsOps));
  if (tx.lock !== null) {
    cleanupErrors.push(...releaseLock(tx.lock, fsOps));
    cleanupErrors.push(...releaseLock(tx.lock, fsOps));
  }
  if (!tx.committed) {
    cleanupErrors.push(...cleanupCreatedDirectories(tx.createdDirectories, fsOps));
    cleanupErrors.push(...cleanupCreatedDirectories(tx.createdDirectories, fsOps));
  }

  if (failure) throw appendCleanupErrors(failure, cleanupErrors);
  if (cleanupErrors.length > 0) {
    throw appendCleanupErrors(cleanupErrors[0], cleanupErrors.slice(1));
  }
  return result;
}

function installProject(targetDir, options = {}) {
  const { fsOps, ...plannerOptions } = options;
  const plan = buildInstallPlan(targetDir, plannerOptions);
  return executeInstallPlan(plan, { fsOps });
}

module.exports = {
  InstallConflictError,
  InstallFilesystemError,
  InstallPlannerError,
  buildInstallPlan,
  classifyDestination,
  createDefaultFsOps,
  executeInstallPlan,
  installProject,
};
