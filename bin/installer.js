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
const BASELINE_ID_PATTERN = /^BL-(\d{8})-(\d{6})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const CANONICAL_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.]\d{3}Z$/;
const INITIAL_BASELINE_FILE_TOKEN = "{{INITIAL_BASELINE_FILE}}";
const INITIAL_BASELINE_PATH = `.ai-os/lanes/default/baseline-log/${INITIAL_BASELINE_FILE_TOKEN}`;
const DEFAULT_LANE_METADATA_PATH = ".ai-os/lanes/default/lane.toml";
const FRAMEWORK_METADATA_PATH = ".ai-os/framework.toml";
const V10_COMPAT_MANIFEST_PATH = path.join(
  PACKAGE_ROOT,
  "framework/.agents/compat/v10-template-hashes.json",
);
const V10_SUPPORTED_VERSIONS = new Set([
  "10.0.0",
  "10.1.0",
  "10.1.1",
  "10.1.2",
  "10.3.1",
  "10.5.0",
  "10.5.1",
]);
const V10_INSTALLED_AT_TOKEN = "{{V10_INSTALLED_AT}}";
const V10_UPDATED_AT_TOKEN = "{{V10_UPDATED_AT}}";
const MANAGED_BLOCK_BEGIN = "# BEGIN AI-OS";
const MANAGED_BLOCK_END = "# END AI-OS";
const V10_GITIGNORE_LINES = Object.freeze([
  "# AI-OS v9 managed (session-local and generated files)",
  ".ai-os/lanes/*/STATE.md",
  ".ai-os/framework.toml",
  ".ai-os/managed-files.tsv",
]);
const V10_GITATTRIBUTES_LINES = Object.freeze([
  "# AI-OS v9 managed (append-only knowledge)",
  ".ai-os/memory.md merge=union",
]);
const V11_GITIGNORE_LINES = Object.freeze([".ai-os/lanes/*/STATE.md"]);
const V11_GITATTRIBUTES_LINES = Object.freeze([]);
const V10_PROJECT_UPGRADE_PATHS = new Set([
  "AGENTS.md",
  ".ai-os/lanes/default/tasks.yaml",
].map(filesystemPathKey));
const V10_COMPAT_DESTINATIONS = Object.freeze([
  ".ai-os/MISSION.md",
  ".ai-os/bin/VERSION",
  ".ai-os/bin/ai-os-doctor.js",
  ".ai-os/bin/shared.js",
  ".ai-os/framework.toml",
  ".ai-os/lanes/default/DESIGN.md",
  ".ai-os/lanes/default/MISSION.md",
  ".ai-os/lanes/default/STATE.md",
  INITIAL_BASELINE_PATH,
  ".ai-os/lanes/default/design-pack/parity-map.md",
  ".ai-os/lanes/default/evals/eval-example.md",
  ".ai-os/lanes/default/lane.toml",
  ".ai-os/lanes/default/release-plan.md",
  ".ai-os/lanes/default/risk-register.md",
  ".ai-os/lanes/default/specs/bugfix.spec.md",
  ".ai-os/lanes/default/specs/example.spec.md",
  ".ai-os/lanes/default/tasks.yaml",
  ".ai-os/lanes/default/verification-matrix.yaml",
  ".ai-os/managed-files.tsv",
  ".ai-os/memory.md",
  ".gitattributes",
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
]);
const V10_COMPAT_HASH_COUNTS = Object.freeze({
  ".ai-os/MISSION.md": 1,
  ".ai-os/bin/VERSION": 3,
  ".ai-os/bin/ai-os-doctor.js": 1,
  ".ai-os/bin/shared.js": 1,
  ".ai-os/framework.toml": 7,
  ".ai-os/lanes/default/DESIGN.md": 3,
  ".ai-os/lanes/default/MISSION.md": 2,
  ".ai-os/lanes/default/STATE.md": 1,
  [INITIAL_BASELINE_PATH]: 2,
  ".ai-os/lanes/default/design-pack/parity-map.md": 1,
  ".ai-os/lanes/default/evals/eval-example.md": 1,
  ".ai-os/lanes/default/lane.toml": 1,
  ".ai-os/lanes/default/release-plan.md": 1,
  ".ai-os/lanes/default/risk-register.md": 1,
  ".ai-os/lanes/default/specs/bugfix.spec.md": 1,
  ".ai-os/lanes/default/specs/example.spec.md": 1,
  ".ai-os/lanes/default/tasks.yaml": 4,
  ".ai-os/lanes/default/verification-matrix.yaml": 5,
  ".ai-os/managed-files.tsv": 2,
  ".ai-os/memory.md": 3,
  ".gitattributes": 1,
  ".gitignore": 1,
  "AGENTS.md": 4,
  "CLAUDE.md": 1,
  "GEMINI.md": 1,
});
const GENERATED_SOURCE_PATHS = Object.freeze({
  [INITIAL_BASELINE_PATH]: "framework/.agents/templates/lane/baseline-log/BL-template.md",
});
const TEAM_CONFIG_PATHS = new Set([".gitignore", ".gitattributes"].map(filesystemPathKey));
const IDE_PATHS = new Set(["CLAUDE.md", "GEMINI.md"].map(filesystemPathKey));
const OWNERSHIP_VALUES = new Set(Object.values(OWNERSHIP));
const OBSOLETE_FRAMEWORK_PREFIXES = Object.freeze([".ai-os/bin/"]);
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

function failPlanner(message, ...causes) {
  throw new InstallPlannerError(
    message,
    causes.length === 0 ? undefined : { cause: causes[0] },
  );
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

function filesystemPathKey(relativePath) {
  return relativePath.replace(/[A-Z]/g, (character) => character.toLowerCase());
}

function requirePortablePathSpelling(relativePath, label) {
  if (!/^[ -~]+$/.test(relativePath)) {
    failPlanner(`${label} must use printable ASCII path spelling: ${relativePath}`);
  }
  for (const segment of relativePath.split("/")) {
    if (segment.startsWith(" ")) {
      failPlanner(`${label} must use portable path spelling; segment starts with space: ${relativePath}`);
    }
    if (/[. ]$/.test(segment)) {
      failPlanner(`${label} must use portable path spelling; segment ends with dot or space: ${relativePath}`);
    }
    if (/[<>:"|?*~$]/.test(segment)) {
      failPlanner(`${label} must use portable path spelling; segment has an unsafe character: ${relativePath}`);
    }
    const basename = segment.split(".", 1)[0].replace(/ +$/g, "");
    if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(basename)) {
      failPlanner(`${label} must use portable path spelling; segment has a reserved device name: ${relativePath}`);
    }
  }
}

function isLaneNamespacePath(relativePath) {
  const key = filesystemPathKey(relativePath);
  return key === ".ai-os/lanes" || key.startsWith(".ai-os/lanes/");
}

function bootstrapTimestamp(date) {
  return `${date.slice(0, 10).replaceAll("-", "")}-${date
    .slice(11, 19)
    .replaceAll(":", "")}`;
}

function generatedBootstrap(value) {
  const clock = value === undefined ? () => new Date() : value;
  if (typeof clock !== "function") failPlanner("clock must be a function");

  let instant;
  try {
    instant = clock();
  } catch (cause) {
    failPlanner("clock failed while generating bootstrap", cause);
  }

  let milliseconds;
  try {
    milliseconds = Date.prototype.getTime.call(instant);
  } catch (cause) {
    failPlanner("clock must return a valid Date", cause);
  }
  if (!Number.isFinite(milliseconds)) failPlanner("clock must return a valid Date");

  let date;
  try {
    date = Date.prototype.toISOString.call(instant);
  } catch (cause) {
    failPlanner("clock must return a valid Date", cause);
  }
  if (!CANONICAL_ISO_PATTERN.test(date)) {
    failPlanner("clock must return a Date with a four-digit UTC year");
  }
  const timestamp = bootstrapTimestamp(date);
  const id = `BL-${timestamp}-bootstrap-unconfirmed`;
  return { id, file: `${id}.md`, date };
}

function normalizeBootstrap(value, clock) {
  const bootstrap = value === undefined ? generatedBootstrap(clock) : value;
  if (!bootstrap || typeof bootstrap !== "object") {
    failPlanner("bootstrap must be an object");
  }
  for (const key of ["id", "file", "date"]) {
    if (typeof bootstrap[key] !== "string" || bootstrap[key].length === 0) {
      failPlanner(`bootstrap.${key} must be a non-empty string`);
    }
  }
  const idMatch = bootstrap.id.match(BASELINE_ID_PATTERN);
  if (!idMatch) {
    failPlanner("bootstrap.id must match BL-YYYYMMDD-HHMMSS-<slug>");
  }
  if (bootstrap.file !== `${bootstrap.id}.md`) {
    failPlanner(`bootstrap.file must equal ${bootstrap.id}.md`);
  }
  if (!CANONICAL_ISO_PATTERN.test(bootstrap.date)) {
    failPlanner("bootstrap.date must be canonical UTC ISO YYYY-MM-DDTHH:mm:ss.sssZ");
  }
  const parsedDate = new Date(bootstrap.date);
  if (
    !Number.isFinite(Date.prototype.getTime.call(parsedDate))
    || Date.prototype.toISOString.call(parsedDate) !== bootstrap.date
  ) {
    failPlanner("bootstrap.date must be canonical UTC ISO YYYY-MM-DDTHH:mm:ss.sssZ");
  }
  if (`${idMatch[1]}-${idMatch[2]}` !== bootstrapTimestamp(bootstrap.date)) {
    failPlanner("bootstrap.date must match bootstrap.id UTC second");
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
  const filesystemPaths = new Map();
  for (const [rawPath, rawHashes] of collectionEntries(value, label)) {
    const relativePath = normalizedRelativePath(rawPath, `${label} key`);
    requirePortablePathSpelling(relativePath, `${label} key`);
    const pathKey = filesystemPathKey(relativePath);
    if (filesystemPaths.has(pathKey)) {
      failPlanner(
        `${label} contains duplicate filesystem path aliases: ${filesystemPaths.get(pathKey)}, ${relativePath}`,
      );
    }
    filesystemPaths.set(pathKey, relativePath);
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

function compatJsonString(source, cursor) {
  if (source[cursor.index] !== '"') failPlanner("v10 compatibility manifest expected a string");
  const start = cursor.index;
  cursor.index += 1;
  let escaped = false;
  while (cursor.index < source.length) {
    const character = source[cursor.index];
    cursor.index += 1;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      try {
        return JSON.parse(source.slice(start, cursor.index));
      } catch (cause) {
        failPlanner("v10 compatibility manifest contains an invalid string", cause);
      }
    }
    if (character.charCodeAt(0) < 0x20) {
      failPlanner("v10 compatibility manifest string contains a control character");
    }
  }
  failPlanner("v10 compatibility manifest contains an unterminated string");
}

function compatSkipWhitespace(source, cursor) {
  while (/\s/.test(source[cursor.index] || "")) cursor.index += 1;
}

function compatExpect(source, cursor, expected) {
  compatSkipWhitespace(source, cursor);
  if (source[cursor.index] !== expected) {
    failPlanner(`v10 compatibility manifest expected ${expected}`);
  }
  cursor.index += 1;
}

function parseCompatManifest(source) {
  if (typeof source !== "string") failPlanner("v10 compatibility manifest must be UTF-8 text");
  const cursor = { index: 0 };
  const entries = [];
  const paths = new Set();
  compatExpect(source, cursor, "{");
  compatSkipWhitespace(source, cursor);
  if (source[cursor.index] === "}") {
    cursor.index += 1;
  } else {
    for (;;) {
      compatSkipWhitespace(source, cursor);
      const relativePath = compatJsonString(source, cursor);
      if (paths.has(relativePath)) {
        failPlanner(`v10 compatibility manifest contains duplicate path: ${relativePath}`);
      }
      paths.add(relativePath);
      compatExpect(source, cursor, ":");
      compatExpect(source, cursor, "[");
      const hashes = [];
      compatSkipWhitespace(source, cursor);
      if (source[cursor.index] === "]") {
        cursor.index += 1;
      } else {
        for (;;) {
          compatSkipWhitespace(source, cursor);
          hashes.push(compatJsonString(source, cursor));
          compatSkipWhitespace(source, cursor);
          if (source[cursor.index] === "]") {
            cursor.index += 1;
            break;
          }
          compatExpect(source, cursor, ",");
        }
      }
      entries.push([relativePath, hashes]);
      compatSkipWhitespace(source, cursor);
      if (source[cursor.index] === "}") {
        cursor.index += 1;
        break;
      }
      compatExpect(source, cursor, ",");
    }
  }
  compatSkipWhitespace(source, cursor);
  if (cursor.index !== source.length) {
    failPlanner("v10 compatibility manifest contains trailing content");
  }
  return entries;
}

function loadCompatHashes(manifestPath = V10_COMPAT_MANIFEST_PATH) {
  let stat;
  let source;
  try {
    let inspectedPath = path.resolve(manifestPath);
    if (inspectedPath === path.resolve(V10_COMPAT_MANIFEST_PATH)) {
      const inspected = inspectPath(
        PACKAGE_ROOT,
        "framework/.agents/compat/v10-template-hashes.json",
      );
      if (!inspected.exists || inspected.kind !== "file") {
        failPlanner("v10 compatibility manifest must be a regular packaged file");
      }
      inspectedPath = inspected.absolute;
    } else {
      const parentStat = fs.lstatSync(path.dirname(inspectedPath));
      if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) {
        failPlanner("v10 compatibility manifest parent must be a safe directory");
      }
    }
    stat = fs.lstatSync(inspectedPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      failPlanner("v10 compatibility manifest must be a regular file");
    }
    source = fs.readFileSync(inspectedPath, "utf8");
  } catch (cause) {
    if (cause instanceof InstallPlannerError) throw cause;
    failPlanner("v10 compatibility manifest is unavailable", cause);
  }

  const entries = parseCompatManifest(source);
  const expectedPaths = [...V10_COMPAT_DESTINATIONS].sort();
  const actualPaths = entries.map(([relativePath]) => relativePath);
  if (actualPaths.length !== expectedPaths.length) {
    failPlanner("v10 compatibility manifest must contain the exact destination allowlist");
  }
  if (actualPaths.some((relativePath, index) => relativePath !== expectedPaths[index])) {
    failPlanner("v10 compatibility manifest paths must be canonical and sorted");
  }

  const result = new Map();
  const filesystemPaths = new Map();
  for (const [relativePath, hashes] of entries) {
    normalizedRelativePath(relativePath, "v10 compatibility manifest path");
    requirePortablePathSpelling(relativePath, "v10 compatibility manifest path");
    const key = filesystemPathKey(relativePath);
    if (filesystemPaths.has(key)) {
      failPlanner("v10 compatibility manifest contains duplicate filesystem path aliases");
    }
    filesystemPaths.set(key, relativePath);
    if (hashes.length !== V10_COMPAT_HASH_COUNTS[relativePath]) {
      failPlanner(`v10 compatibility manifest has the wrong hash count: ${relativePath}`);
    }
    const sorted = [...hashes].sort();
    if (hashes.some((hash, index) => hash !== sorted[index])) {
      failPlanner(`v10 compatibility manifest hashes must be sorted: ${relativePath}`);
    }
    const accepted = new Set();
    for (const hash of hashes) {
      if (!HASH_PATTERN.test(hash)) {
        failPlanner(`v10 compatibility manifest contains an invalid SHA-256: ${relativePath}`);
      }
      if (accepted.has(hash)) {
        failPlanner(`v10 compatibility manifest contains a duplicate hash: ${relativePath}`);
      }
      accepted.add(hash);
    }
    result.set(relativePath, accepted);
  }
  const canonical = `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`;
  if (source !== canonical) {
    failPlanner("v10 compatibility manifest bytes are not canonical sorted JSON");
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
  requirePortablePathSpelling(rawPath, "source inventory destination");
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

function textLines(content) {
  const lines = [];
  let cursor = 0;
  while (cursor < content.length) {
    const start = cursor;
    const newline = content.indexOf("\n", cursor);
    if (newline === -1) {
      lines.push({
        start,
        end: content.length,
        fullEnd: content.length,
        text: content.slice(start),
        eol: "",
      });
      break;
    }
    const hasCarriageReturn = newline > start && content[newline - 1] === "\r";
    const end = hasCarriageReturn ? newline - 1 : newline;
    lines.push({
      start,
      end,
      fullEnd: newline + 1,
      text: content.slice(start, end),
      eol: hasCarriageReturn ? "\r\n" : "\n",
    });
    cursor = newline + 1;
  }
  return lines;
}

function validateManagedArguments(begin, end, lines) {
  for (const [label, value] of [["begin", begin], ["end", end]]) {
    if (typeof value !== "string" || value.length === 0 || /[\r\n]/.test(value)) {
      failPlanner(`managed block ${label} must be one non-empty line`);
    }
  }
  if (begin === end) failPlanner("managed block markers must be different");
  if (!Array.isArray(lines)) failPlanner("managed block lines must be an array");
  for (const line of lines) {
    if (
      typeof line !== "string"
      || /[\r\n]/.test(line)
      || line.includes(begin)
      || line.includes(end)
    ) {
      failPlanner("managed block contains an invalid managed line");
    }
  }
}

function replaceManagedBlock(content, begin, end, lines) {
  if (typeof content !== "string") failPlanner("managed block content must be a string");
  validateManagedArguments(begin, end, lines);
  const bom = content.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = bom ? content.slice(1) : content;
  const parsed = textLines(body);
  const begins = [];
  const ends = [];
  for (let index = 0; index < parsed.length; index += 1) {
    const line = parsed[index].text;
    if (line === begin) begins.push(index);
    else if (line.includes(begin)) failPlanner("managed block contains a marker-like begin line");
    if (line === end) ends.push(index);
    else if (line.includes(end)) failPlanner("managed block contains a marker-like end line");
  }

  if (begins.length === 0 && ends.length === 0) {
    const eol = parsed.find((line) => line.eol)?.eol || "\n";
    const separator = body.length === 0 || /\r?\n$/.test(body) ? "" : eol;
    const block = [begin, ...lines, end].join(eol) + eol;
    return bom + body + separator + block;
  }
  if (begins.length !== 1 || ends.length !== 1 || ends[0] <= begins[0]) {
    failPlanner("managed block markers must form exactly one ordered range");
  }
  const beginIndex = begins[0];
  const endIndex = ends[0];
  const existing = parsed.slice(beginIndex + 1, endIndex).map((line) => line.text);
  if (
    existing.length !== lines.length
    || existing.some((line, index) => line !== lines[index])
  ) {
    failPlanner("managed block contains user-modified managed lines");
  }
  const beginLine = parsed[beginIndex];
  const endLine = parsed[endIndex];
  const eol = beginLine.eol || endLine.eol || "\n";
  const trailing = endLine.eol ? eol : "";
  const block = [begin, ...lines, end].join(eol) + trailing;
  return bom + body.slice(0, beginLine.start) + block + body.slice(endLine.fullEnd);
}

function replaceLegacyTeamConfig(content, relativePath) {
  if (!Buffer.isBuffer(content)) failPlanner("legacy team configuration must be bytes");
  if (content.includes(0)) failPlanner(`${relativePath} contains non-text bytes`);
  const decoded = content.toString("utf8");
  if (!Buffer.from(decoded, "utf8").equals(content)) {
    failPlanner(`${relativePath} is not canonical UTF-8`);
  }
  const bom = decoded.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = bom ? decoded.slice(1) : decoded;
  const legacy = relativePath === ".gitignore"
    ? V10_GITIGNORE_LINES
    : V10_GITATTRIBUTES_LINES;
  const desired = relativePath === ".gitignore"
    ? V11_GITIGNORE_LINES
    : V11_GITATTRIBUTES_LINES;
  const parsed = textLines(body);
  const header = legacy[0];
  const headerIndexes = [];
  let hasNewMarker = false;
  for (let index = 0; index < parsed.length; index += 1) {
    const line = parsed[index].text;
    if (line === header) headerIndexes.push(index);
    else if (line.includes(header)) {
      failPlanner(`${relativePath} contains a marker-like legacy AI-OS header`);
    }
    if (
      line.includes("# AI-OS")
      && line !== header
      && line !== MANAGED_BLOCK_BEGIN
      && line !== MANAGED_BLOCK_END
    ) {
      failPlanner(`${relativePath} contains an unrecognized AI-OS marker-like line`);
    }
    if (line === MANAGED_BLOCK_BEGIN || line === MANAGED_BLOCK_END) hasNewMarker = true;
    if (
      line !== MANAGED_BLOCK_BEGIN
      && line !== MANAGED_BLOCK_END
      && (line.includes(MANAGED_BLOCK_BEGIN) || line.includes(MANAGED_BLOCK_END))
    ) {
      failPlanner(`${relativePath} contains a marker-like AI-OS block marker`);
    }
  }
  if (headerIndexes.length > 0 && hasNewMarker) {
    failPlanner(`${relativePath} contains both legacy and current AI-OS managed blocks`);
  }
  if (hasNewMarker) {
    const beginIndex = parsed.findIndex((line) => line.text === MANAGED_BLOCK_BEGIN);
    const endIndex = parsed.findIndex((line) => line.text === MANAGED_BLOCK_END);
    if (beginIndex === -1 || endIndex <= beginIndex) {
      failPlanner(`${relativePath} contains malformed current AI-OS managed markers`);
    }
    if (legacy.slice(1).some((managedLine) => parsed.some((line, index) => (
      line.text === managedLine && (index <= beginIndex || index >= endIndex)
    )))) {
      failPlanner(`${relativePath} contains a legacy AI-OS rule outside the current block`);
    }
    return Buffer.from(replaceManagedBlock(decoded, MANAGED_BLOCK_BEGIN, MANAGED_BLOCK_END, desired));
  }
  if (headerIndexes.length === 0) {
    if (
      body.includes("# AI-OS")
      || legacy.slice(1).some((managedLine) => parsed.some((line) => line.text === managedLine))
    ) {
      failPlanner(`${relativePath} contains an unrecognized AI-OS managed marker`);
    }
    return Buffer.from(replaceManagedBlock(decoded, MANAGED_BLOCK_BEGIN, MANAGED_BLOCK_END, desired));
  }
  if (headerIndexes.length !== 1) {
    failPlanner(`${relativePath} must contain exactly one legacy AI-OS managed block`);
  }
  const startIndex = headerIndexes[0];
  const candidate = parsed.slice(startIndex, startIndex + legacy.length);
  if (
    candidate.length !== legacy.length
    || candidate.some((line, index) => line.text !== legacy[index])
  ) {
    failPlanner(`${relativePath} contains a modified legacy AI-OS managed block`);
  }
  const candidateIndexes = new Set(candidate.map((line) => parsed.indexOf(line)));
  if (legacy.slice(1).some((managedLine) => parsed.some((line, index) => (
    line.text === managedLine && !candidateIndexes.has(index)
  )))) {
    failPlanner(`${relativePath} contains a duplicate legacy AI-OS managed rule outside the block`);
  }
  const first = candidate[0];
  const last = candidate[candidate.length - 1];
  const eol = first.eol || last.eol || "\n";
  if (candidate.slice(0, -1).some((line) => line.eol !== eol)) {
    failPlanner(`${relativePath} legacy AI-OS block uses inconsistent line endings`);
  }
  const trailing = last.eol ? eol : "";
  const replacement = [MANAGED_BLOCK_BEGIN, ...desired, MANAGED_BLOCK_END].join(eol) + trailing;
  return Buffer.from(
    bom + body.slice(0, first.start) + replacement + body.slice(last.fullEnd),
    "utf8",
  );
}

function generatedTeamConfig(relativePath) {
  if (relativePath === ".gitignore") {
    return Buffer.from([
      MANAGED_BLOCK_BEGIN,
      ...V11_GITIGNORE_LINES,
      MANAGED_BLOCK_END,
      "",
    ].join("\n"));
  }
  return Buffer.from([
    MANAGED_BLOCK_BEGIN,
    ...V11_GITATTRIBUTES_LINES,
    MANAGED_BLOCK_END,
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

function canonicalDestinationContracts(bootstrap) {
  return new Map(Object.values(FILE_SPECS).map((descriptor) => {
    const relativePath = descriptor.path
      .split(INITIAL_BASELINE_FILE_TOKEN)
      .join(bootstrap.file);
    return [filesystemPathKey(relativePath), { relativePath, descriptor }];
  }));
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
  const canonicalContracts = canonicalDestinationContracts(bootstrap);
  for (const descriptor of descriptors) {
    const rawPath = validateDescriptor(descriptor);
    const rawPathKey = filesystemPathKey(rawPath);
    if (options.teamConfig === false && TEAM_CONFIG_PATHS.has(rawPathKey)) continue;
    if (options.ideFiles === false && IDE_PATHS.has(rawPathKey)) continue;
    const relativePath = normalizedRelativePath(
      rawPath.split(INITIAL_BASELINE_FILE_TOKEN).join(bootstrap.file),
      "rendered destination",
    );
    const relativePathKey = filesystemPathKey(relativePath);
    const canonical = canonicalContracts.get(relativePathKey);
    if (canonical && descriptor.ownership !== canonical.descriptor.ownership) {
      failPlanner(
        `${relativePath} must use canonical ownership ${canonical.descriptor.ownership}; received ${descriptor.ownership}`,
      );
    }
    if (isLaneNamespacePath(relativePath) && descriptor.ownership === OWNERSHIP.FRAMEWORK) {
      failPlanner(`${relativePath} is a lane path and cannot use framework ownership`);
    }
    if (canonical && descriptor.type !== canonical.descriptor.type) {
      failPlanner(
        `${relativePath} must use canonical type ${canonical.descriptor.type}; received ${descriptor.type}`,
      );
    }
    if (canonical && relativePath !== canonical.relativePath) {
      failPlanner(`${relativePath} must use canonical path spelling ${canonical.relativePath}`);
    }
    if (destinations.has(relativePathKey)) failPlanner(`duplicate destination: ${relativePath}`);
    destinations.add(relativePathKey);
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
    } else if (TEAM_CONFIG_PATHS.has(filesystemPathKey(entry.relativePath))) {
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

function isAllowedObsoleteFrameworkPath(relativePath) {
  return OBSOLETE_FRAMEWORK_PREFIXES.some((prefix) => (
    relativePath.startsWith(prefix) && relativePath.length > prefix.length
  ));
}

function inspectDestination(targetRoot, relativePath) {
  let inspected;
  try {
    inspected = inspectPath(targetRoot, relativePath);
  } catch (error) {
    return { exists: true, kind: "invalid", hash: null, error: error.message };
  }
  if (!inspected.exists) {
    return { exists: false, kind: "missing", hash: null, mode: null, error: null };
  }
  if (inspected.kind !== "file") {
    return {
      exists: true,
      kind: inspected.kind,
      hash: null,
      mode: null,
      error: `destination is not a regular file: ${relativePath}`,
    };
  }
  try {
    const stat = fs.lstatSync(inspected.absolute);
    const bytes = fs.readFileSync(inspected.absolute);
    return {
      exists: true,
      kind: "file",
      hash: sha256(bytes),
      mode: stat.mode & 0o777,
      bytes,
      error: null,
    };
  } catch (error) {
    return {
      exists: true,
      kind: "file",
      hash: null,
      mode: null,
      error: `destination is unreadable: ${error.message}`,
    };
  }
}

function canonicalBaselineBootstrap(baselineId) {
  const match = baselineId.match(BASELINE_ID_PATTERN);
  if (!match) {
    return { error: "lane.toml baseline_id must be a canonical BL identifier" };
  }
  if (match[3] === "retrospective") {
    return { error: "lane.toml baseline_id cannot point to a retrospective record" };
  }

  const compactDate = match[1];
  const compactTime = match[2];
  const date = [
    compactDate.slice(0, 4),
    "-",
    compactDate.slice(4, 6),
    "-",
    compactDate.slice(6, 8),
    "T",
    compactTime.slice(0, 2),
    ":",
    compactTime.slice(2, 4),
    ":",
    compactTime.slice(4, 6),
    ".000Z",
  ].join("");
  const parsed = new Date(date);
  if (
    !Number.isFinite(Date.prototype.getTime.call(parsed))
    || Date.prototype.toISOString.call(parsed) !== date
  ) {
    return { error: "lane.toml baseline_id must contain a canonical UTC second" };
  }
  return {
    bootstrap: Object.freeze({
      id: baselineId,
      file: `${baselineId}.md`,
      date,
    }),
  };
}

function findTomlMultilineClose(line, delimiter, start) {
  let index = line.indexOf(delimiter, start);
  while (index !== -1) {
    if (delimiter === "'''") return index;
    let escapes = 0;
    for (let cursor = index - 1; cursor >= 0 && line[cursor] === "\\"; cursor -= 1) {
      escapes += 1;
    }
    if (escapes % 2 === 0) return index;
    index = line.indexOf(delimiter, index + delimiter.length);
  }
  return -1;
}

function tomlCodeOutsideMultiline(line, activeDelimiter) {
  if (activeDelimiter !== null) {
    const close = findTomlMultilineClose(line, activeDelimiter, 0);
    return {
      code: "",
      activeDelimiter: close === -1 ? activeDelimiter : null,
      error: null,
    };
  }

  let code = "";
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote !== null) {
      code += character;
      if (quote === '"' && character === "\\") {
        index += 1;
        if (index < line.length) code += line[index];
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "#") break;
    const delimiter = line.startsWith('"""', index)
      ? '"""'
      : line.startsWith("'''", index) ? "'''" : null;
    if (delimiter !== null) {
      code += delimiter;
      const close = findTomlMultilineClose(line, delimiter, index + delimiter.length);
      if (close === -1) return { code, activeDelimiter: delimiter, error: null };
      code += delimiter;
      index = close + delimiter.length - 1;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    code += character;
  }
  const kind = quote === '"' ? "basic" : "literal";
  return {
    code,
    activeDelimiter: null,
    error: quote === null ? null : `lane.toml contains an unterminated ${kind} string`,
  };
}

function decodeTomlBasicKey(raw) {
  const simpleEscapes = {
    b: "\b",
    t: "\t",
    n: "\n",
    f: "\f",
    r: "\r",
    '"': '"',
    "\\": "\\",
  };
  let decoded = "";
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== "\\") {
      decoded += raw[index];
      continue;
    }
    index += 1;
    const escape = raw[index];
    if (Object.hasOwn(simpleEscapes, escape)) {
      decoded += simpleEscapes[escape];
      continue;
    }
    if (escape !== "u" && escape !== "U") {
      return { error: "lane.toml contains an invalid escape in a quoted root key" };
    }
    const length = escape === "u" ? 4 : 8;
    const digits = raw.slice(index + 1, index + 1 + length);
    if (digits.length !== length || !/^[a-fA-F0-9]+$/.test(digits)) {
      return { error: "lane.toml contains an invalid Unicode escape in a quoted root key" };
    }
    const codePoint = Number.parseInt(digits, 16);
    if (codePoint > 0x10FFFF || (codePoint >= 0xD800 && codePoint <= 0xDFFF)) {
      return { error: "lane.toml contains an invalid Unicode scalar in a quoted root key" };
    }
    decoded += String.fromCodePoint(codePoint);
    index += length;
  }
  return { value: decoded };
}

function tomlRootKey(code) {
  const bare = code.match(/^([A-Za-z0-9_-]+)\s*=/);
  if (bare) return { value: bare[1], error: null };
  const literal = code.match(/^'([^']*)'\s*=/);
  if (literal) return { value: literal[1], error: null };
  const basic = code.match(/^"((?:\\.|[^"\\])*)"\s*=/);
  if (basic) {
    const decoded = decodeTomlBasicKey(basic[1]);
    return decoded.error
      ? { value: null, error: decoded.error }
      : { value: decoded.value, error: null };
  }
  if (code.startsWith('"') || code.startsWith("'")) {
    return { value: null, error: "lane.toml contains a malformed quoted root key" };
  }
  return { value: null, error: null };
}

function rootBaselineDeclarations(content) {
  const declarations = [];
  let activeDelimiter = null;
  let insideTable = false;
  for (const line of content.split(/\r?\n/)) {
    const scanned = tomlCodeOutsideMultiline(line, activeDelimiter);
    if (scanned.error !== null) return { declarations, error: scanned.error };
    activeDelimiter = scanned.activeDelimiter;
    const trimmed = scanned.code.trimStart();
    if (trimmed.length === 0) continue;
    if (trimmed.startsWith("[")) {
      insideTable = true;
      continue;
    }
    if (insideTable) continue;
    const key = tomlRootKey(trimmed);
    if (key.error !== null) return { declarations, error: key.error };
    if (key.value === "baseline_id") declarations.push(line);
  }
  return {
    declarations,
    error: activeDelimiter === null ? null : "lane.toml contains an unterminated multiline string",
  };
}

function existingLaneBootstrap(destination) {
  if (!destination.exists) {
    return { exists: false, bootstrap: null, error: null };
  }
  if (destination.error || destination.kind !== "file" || !destination.bytes) {
    return {
      exists: true,
      bootstrap: null,
      error: destination.error || "lane.toml is not a regular file",
    };
  }

  const scanned = rootBaselineDeclarations(destination.bytes.toString("utf8"));
  if (scanned.error !== null) {
    return { exists: true, bootstrap: null, error: scanned.error };
  }
  const { declarations } = scanned;
  if (declarations.length !== 1) {
    return {
      exists: true,
      bootstrap: null,
      error: `lane.toml must contain exactly one baseline_id declaration at TOML root; found ${declarations.length}`,
    };
  }

  const declaration = declarations[0].match(/^baseline_id = "([^"]+)"$/);
  if (!declaration) {
    return {
      exists: true,
      bootstrap: null,
      error: "lane.toml baseline_id declaration must use canonical baseline_id syntax",
    };
  }
  const parsed = canonicalBaselineBootstrap(declaration[1]);
  if (parsed.error) {
    return {
      exists: true,
      bootstrap: null,
      error: parsed.error,
    };
  }
  return { exists: true, bootstrap: parsed.bootstrap, error: null };
}

function canonicalIsoValue(value) {
  if (typeof value !== "string" || !CANONICAL_ISO_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(Date.prototype.getTime.call(parsed))
    && Date.prototype.toISOString.call(parsed) === value;
}

function validV10Context(context) {
  if (!context || typeof context !== "object" || Array.isArray(context)) return false;
  const parsed = typeof context.baselineId === "string"
    ? canonicalBaselineBootstrap(context.baselineId)
    : { error: "missing baseline ID" };
  if (parsed.error || context.baselineFile !== `${context.baselineId}.md`) return false;
  const slug = context.baselineId.match(BASELINE_ID_PATTERN)?.[3] || "";
  if (slug.split("-").includes("retrospective")) return false;
  return canonicalIsoValue(context.baselineDate)
    && canonicalIsoValue(context.installedAt)
    && canonicalIsoValue(context.updatedAt)
    && V10_SUPPORTED_VERSIONS.has(context.frameworkVersion);
}

function replaceCapturedValue(content, expression, expected, replacement) {
  const matches = [...content.matchAll(expression)];
  if (matches.length !== 1 || matches[0][1] !== expected) return null;
  const match = matches[0];
  const offset = match.index + match[0].indexOf(match[1]);
  return content.slice(0, offset) + replacement + content.slice(offset + match[1].length);
}

function normalizeV10Candidate(relativePath, bytes, context) {
  normalizedRelativePath(relativePath, "v10 candidate path");
  if (!Buffer.isBuffer(bytes)) failPlanner("v10 candidate bytes must be a Buffer");
  if (!validV10Context(context)) failPlanner("v10 normalization context is invalid");
  const original = Buffer.from(bytes);
  const content = original.toString("utf8");
  if (!Buffer.from(content, "utf8").equals(original)) return original;

  let normalized;
  if (relativePath === DEFAULT_LANE_METADATA_PATH) {
    normalized = replaceCapturedValue(
      content,
      /^baseline_id = "([^"\r\n]+)"\r?$/gm,
      context.baselineId,
      "{{INITIAL_BASELINE_ID}}",
    );
  } else if (relativePath === ".ai-os/lanes/default/MISSION.md") {
    normalized = replaceCapturedValue(
      content,
      /^- \*\*当前基线 ID\*\*：([^\r\n]+)\r?$/gm,
      context.baselineId,
      "{{INITIAL_BASELINE_ID}}",
    );
  } else if (relativePath === ".ai-os/lanes/default/tasks.yaml") {
    normalized = replaceCapturedValue(
      content,
      /^baseline_id: "([^"\r\n]+)"\r?$/gm,
      context.baselineId,
      "{{INITIAL_BASELINE_ID}}",
    );
  } else if (
    relativePath
      === `.ai-os/lanes/default/baseline-log/${context.baselineFile}`
  ) {
    normalized = replaceCapturedValue(
      content,
      /^# ([^\r\n]+)\r?$/gm,
      context.baselineId,
      "{{INITIAL_BASELINE_ID}}",
    );
    if (normalized !== null) {
      normalized = replaceCapturedValue(
        normalized,
        /^- \*\*Confirmed At\*\*: ([^\r\n]+)\r?$/gm,
        context.baselineDate,
        "{{INITIAL_BASELINE_DATE}}",
      );
    }
  } else if (relativePath === FRAMEWORK_METADATA_PATH) {
    normalized = replaceCapturedValue(
      content,
      /^installed_at = "([^"\r\n]+)"\r?$/gm,
      context.installedAt,
      V10_INSTALLED_AT_TOKEN,
    );
    if (normalized !== null) {
      normalized = replaceCapturedValue(
        normalized,
        /^updated_at = "([^"\r\n]+)"\r?$/gm,
        context.updatedAt,
        V10_UPDATED_AT_TOKEN,
      );
    }
  } else {
    return original;
  }
  return normalized === null ? original : Buffer.from(normalized, "utf8");
}

function strictV10Metadata(destination) {
  if (
    !destination.exists
    || destination.error
    || destination.kind !== "file"
    || !destination.bytes
  ) {
    return { active: false, context: null, error: null };
  }
  const content = destination.bytes.toString("utf8");
  const active = /^framework_version\s*=\s*["']?10(?:[.]|["']?\s*$)/m.test(content)
    || /^schema_version\s*=\s*["']?9(?:["']?\s*$)/m.test(content);
  if (!active) return { active: false, context: null, error: null };
  if (!Buffer.from(content, "utf8").equals(destination.bytes) || content.includes("\r")) {
    return { active: true, context: null, error: "v10 metadata must be canonical UTF-8 with LF line endings" };
  }
  const lines = content.split("\n");
  if (lines.length !== 9 || lines[8] !== "") {
    return { active: true, context: null, error: "v10 metadata must contain the exact canonical fields" };
  }
  const expectedStatic = [
    [0, "# AI-OS framework metadata"],
    [1, 'schema_version = "9"'],
    [2, 'layout_version = "9"'],
    [3, 'layout_mode = "shared-root-default-lane"'],
    [4, 'default_lane = "default"'],
  ];
  if (expectedStatic.some(([index, value]) => lines[index] !== value)) {
    return { active: true, context: null, error: "v10 metadata has unsupported layout identity" };
  }
  const version = lines[5].match(/^framework_version = "([^"]+)"$/)?.[1];
  const installedAt = lines[6].match(/^installed_at = "([^"]+)"$/)?.[1];
  const updatedAt = lines[7].match(/^updated_at = "([^"]+)"$/)?.[1];
  if (!version || !V10_SUPPORTED_VERSIONS.has(version)) {
    return { active: true, context: null, error: "v10 metadata framework_version is unsupported" };
  }
  if (!canonicalIsoValue(installedAt) || !canonicalIsoValue(updatedAt)) {
    return { active: true, context: null, error: "v10 metadata timestamps must be canonical UTC ISO values" };
  }
  return {
    active: true,
    error: null,
    context: { frameworkVersion: version, installedAt, updatedAt },
  };
}

function exactField(destination, relativePath, expression, label) {
  const text = canonicalContextText(destination, relativePath, label);
  if (text.error) return { error: text.error, value: null };
  const matches = [...text.content.matchAll(expression)];
  if (matches.length !== 1) {
    return { error: `${label} must contain exactly one canonical value`, value: null };
  }
  return { error: null, value: matches[0][1] };
}

function canonicalContextText(destination, relativePath, label) {
  if (!destination.exists) return { error: `${label} is missing`, content: null };
  if (destination.error || destination.kind !== "file" || !destination.bytes) {
    return {
      error: destination.error || `destination is not a regular file: ${relativePath}`,
      content: null,
    };
  }
  const content = destination.bytes.toString("utf8");
  if (
    !Buffer.from(content, "utf8").equals(destination.bytes)
    || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(content)
  ) {
    return { error: `${label} must be canonical UTF-8 text without control bytes`, content: null };
  }
  return { error: null, content };
}

function visibleMarkdownLines(content) {
  const result = [];
  let fence = null;
  let inComment = false;
  for (const raw of content.split(/\r?\n/)) {
    let visible = "";
    let cursor = 0;
    while (cursor < raw.length) {
      if (inComment) {
        const close = raw.indexOf("-->", cursor);
        if (close === -1) {
          break;
        }
        inComment = false;
        cursor = close + 3;
        continue;
      }
      const open = raw.indexOf("<!--", cursor);
      if (open === -1) {
        visible += raw.slice(cursor);
        break;
      }
      visible += raw.slice(cursor, open);
      inComment = true;
      cursor = open + 4;
    }
    const trimmed = visible.trimStart();
    const marker = trimmed.match(/^(`{3,}|~{3,})/)?.[1] || null;
    if (fence !== null) {
      result.push("");
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker !== null) {
      fence = marker;
      result.push("");
      continue;
    }
    result.push(visible);
  }
  return result;
}

function strictV10MissionBaseline(destination, relativePath) {
  const text = canonicalContextText(destination, relativePath, "v10 lane MISSION");
  if (text.error) return { error: text.error, value: null };
  const values = [];
  for (const line of visibleMarkdownLines(text.content)) {
    const match = line.match(/^- \*\*当前基线 ID\*\*：([^\r\n]+)$/);
    if (match) values.push(match[1]);
    else if (line.includes("当前基线 ID")) {
      return { error: "v10 lane MISSION contains a non-canonical baseline ID field", value: null };
    }
  }
  if (values.length !== 1) {
    return { error: "v10 lane MISSION must contain exactly one canonical baseline ID", value: null };
  }
  return { error: null, value: values[0] };
}

function strictV10TasksBaseline(destination, relativePath) {
  const text = canonicalContextText(destination, relativePath, "v10 tasks.yaml");
  if (text.error) return { error: text.error, value: null };
  const values = [];
  for (const line of text.content.split(/\r?\n/)) {
    if (/^(?:---|[.][.][.])(?:\s|$)/.test(line)) {
      return { error: "v10 tasks.yaml must contain exactly one YAML document", value: null };
    }
    if (/^[ \t]/.test(line) || /^\s*(?:#|$)/.test(line)) continue;
    const canonical = line.match(/^baseline_id: "([^"\r\n]+)"$/);
    if (canonical) {
      values.push(canonical[1]);
      continue;
    }
    if (
      /^(?:baseline_id|'baseline_id'|"baseline_id")\s*:/.test(line)
      || /^\?\s*(?:baseline_id|'baseline_id'|"baseline_id")/.test(line)
      || /^<<\s*:/.test(line)
    ) {
      return { error: "v10 tasks.yaml contains a non-canonical or merged baseline_id", value: null };
    }
  }
  if (values.length !== 1) {
    return { error: "v10 tasks.yaml must contain exactly one canonical root baseline_id", value: null };
  }
  return { error: null, value: values[0] };
}

function exactV10RecordFields(destination, relativePath) {
  const text = canonicalContextText(destination, relativePath, "v10 current baseline record");
  if (text.error) return { error: text.error };
  const lines = visibleMarkdownLines(text.content);
  const heading = lines[0]?.match(/^# ([^\r\n]+)$/)?.[1];
  if (!heading) return { error: "v10 current baseline record must start with one canonical H1" };
  const recordEnd = lines.findIndex((line, index) => index > 0 && /^##(?:\s|$)/.test(line));
  const region = lines.slice(1, recordEnd === -1 ? lines.length : recordEnd);
  if (region.some((line) => /^# /.test(line))) {
    return { error: "v10 current baseline record region contains a duplicate H1" };
  }
  const dates = [];
  for (const line of region) {
    const match = line.match(/^- \*\*Confirmed At\*\*: ([^\r\n]+)$/);
    if (match) dates.push(match[1]);
    else if (line.includes("Confirmed At")) {
      return { error: "v10 current baseline record has a non-canonical Confirmed At" };
    }
  }
  if (dates.length !== 1) {
    return { error: "v10 current baseline record must contain exactly one Confirmed At" };
  }
  if (!canonicalIsoValue(dates[0])) {
    return { error: "v10 current baseline Confirmed At must be canonical UTC ISO" };
  }
  return { error: null, heading, date: dates[0] };
}

function v10ManifestKey(relativePath, context) {
  return relativePath === `.ai-os/lanes/default/baseline-log/${context.baselineFile}`
    ? INITIAL_BASELINE_PATH
    : relativePath;
}

function v10CandidateIsRecognized(relativePath, destination, context, compatHashes) {
  if (
    !destination.exists
    || destination.error
    || destination.kind !== "file"
    || !destination.bytes
  ) return false;
  const manifestPath = v10ManifestKey(relativePath, context);
  const accepted = compatHashes.get(manifestPath);
  if (!accepted) return false;
  return accepted.has(sha256(normalizeV10Candidate(relativePath, destination.bytes, context)));
}

function inspectV10MigrationContext(targetRoot, metadataDestination, laneDestination, snapshots) {
  const metadata = strictV10Metadata(metadataDestination);
  if (!metadata.active) return { active: false, context: null, conflicts: new Map() };
  const conflicts = new Map();
  if (metadata.error) {
    conflicts.set(FRAMEWORK_METADATA_PATH, metadata.error);
    return { active: true, context: null, conflicts };
  }

  const lane = exactField(
    laneDestination,
    DEFAULT_LANE_METADATA_PATH,
    /^baseline_id = "([^"\r\n]+)"\r?$/gm,
    "v10 lane.toml baseline_id",
  );
  if (lane.error) conflicts.set(DEFAULT_LANE_METADATA_PATH, lane.error);
  let baselineId = lane.value;
  let baselineFile = baselineId === null ? null : `${baselineId}.md`;
  if (baselineId !== null) {
    const parsed = canonicalBaselineBootstrap(baselineId);
    const slug = baselineId.match(BASELINE_ID_PATTERN)?.[3] || "";
    if (parsed.error || slug.split("-").includes("retrospective")) {
      conflicts.set(DEFAULT_LANE_METADATA_PATH, parsed.error || "v10 baseline_id cannot be retrospective");
      baselineId = null;
      baselineFile = null;
    }
  }

  const fields = [
    [".ai-os/lanes/default/MISSION.md", strictV10MissionBaseline],
    [".ai-os/lanes/default/tasks.yaml", strictV10TasksBaseline],
  ];
  const values = [];
  for (const [relativePath, extractor] of fields) {
    const destination = snapshots.has(relativePath)
      ? snapshots.get(relativePath)
      : inspectDestination(targetRoot, relativePath);
    snapshots.set(relativePath, destination);
    const extracted = extractor(destination, relativePath);
    if (extracted.error) conflicts.set(relativePath, extracted.error);
    else values.push([relativePath, extracted.value]);
  }

  let recordPath = null;
  let baselineDate = null;
  if (baselineFile !== null) {
    recordPath = `.ai-os/lanes/default/baseline-log/${baselineFile}`;
    const destination = snapshots.has(recordPath)
      ? snapshots.get(recordPath)
      : inspectDestination(targetRoot, recordPath);
    snapshots.set(recordPath, destination);
    const record = exactV10RecordFields(destination, recordPath);
    if (record.error) conflicts.set(recordPath, record.error);
    else {
      values.push([recordPath, record.heading]);
      baselineDate = record.date;
    }
  }

  if (baselineId !== null) {
    for (const [relativePath, value] of values) {
      if (value !== baselineId) {
        conflicts.set(relativePath, `v10 baseline context disagrees with lane.toml: ${relativePath}`);
      }
    }
  }
  if (conflicts.size > 0 || baselineId === null || baselineDate === null) {
    return { active: true, context: null, conflicts };
  }
  return {
    active: true,
    conflicts,
    context: Object.freeze({
      baselineId,
      baselineFile,
      baselineDate,
      frameworkVersion: metadata.context.frameworkVersion,
      installedAt: metadata.context.installedAt,
      updatedAt: metadata.context.updatedAt,
      recordPath,
    }),
  };
}

function migratePristineV10Lane(bytes, baselineId) {
  const content = bytes.toString("utf8");
  const expected = [
    'id = "default"',
    'title = "默认交付线"',
    'status = "active"',
    `baseline_id = "${baselineId}"`,
    'quality_tier = "standard"',
    'risk_tier = "medium"',
  ];
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const trailing = content.endsWith(eol) ? eol : "";
  if (content !== expected.join(eol) + trailing) {
    failPlanner("recognized v10 lane.toml does not have canonical pristine structure");
  }
  return Buffer.from([
    ...expected,
    'governance_tier = "unassessed"',
  ].join(eol) + trailing);
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
  const content = bytes.toString("utf8");
  if (!Buffer.from(content, "utf8").equals(bytes) || content.includes("\r")) return false;
  const lines = content.split("\n");
  if (lines.length !== 7 || lines[6] !== "") return false;
  return lines[0] === "# AI-OS framework metadata"
    && lines[1] === 'schema_version = "11"'
    && lines[2] === 'layout_version = "11"'
    && lines[3] === `layout_mode = "${LAYOUT_MODE}"`
    && lines[4] === 'default_lane = "default"'
    && /^framework_version = "11[.][0-9]+[.][0-9]+"$/.test(lines[5]);
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

  const compatibleHashes = normalizeHashMap(options.compatibleHashes, "compatibleHashes");
  let obsoleteHashes = normalizeHashMap(
    options.obsoleteFrameworkHashes,
    "obsoleteFrameworkHashes",
  );

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
  const destinationSnapshots = new Map();
  const laneDestination = targetError
    ? { exists: true, kind: "invalid", hash: null, bytes: null, error: targetError.message }
    : inspectDestination(resolvedTarget, DEFAULT_LANE_METADATA_PATH);
  destinationSnapshots.set(DEFAULT_LANE_METADATA_PATH, laneDestination);
  const metadataDestination = targetError
    ? { exists: true, kind: "invalid", hash: null, error: targetError.message }
    : inspectDestination(resolvedTarget, FRAMEWORK_METADATA_PATH);
  destinationSnapshots.set(FRAMEWORK_METADATA_PATH, metadataDestination);
  const preliminaryV10Metadata = strictV10Metadata(metadataDestination);
  if (preliminaryV10Metadata.active) {
    for (const seam of ["fileSpecs", "sourceOverrides", "sourceRoot", "compatManifestPath"]) {
      if (options[seam] !== undefined) {
        failPlanner(`v10 migration does not allow the internal ${seam} seam`);
      }
    }
  }
  if (
    targetError === null
    && metadataDestination.exists
    && !preliminaryV10Metadata.active
    && (
      metadataDestination.error
      || metadataDestination.kind !== "file"
      || !metadataDestination.bytes
      || !metadataIsSupported(metadataDestination.bytes)
    )
  ) {
    const reason = metadataDestination.error
      || "unsupported metadata in .ai-os/framework.toml";
    return immutablePlan(
      resolvedTarget,
      [immutableOperation({
        relativePath: FRAMEWORK_METADATA_PATH,
        type: "file",
        ownership: OWNERSHIP.FRAMEWORK,
        action: "conflict",
        content: null,
        mode: 0o644,
        previousHash: metadataDestination.hash,
      })],
      [immutableConflict(FRAMEWORK_METADATA_PATH, reason)],
      { baselineId: null, layoutVersion: LAYOUT_VERSION, targetExisted },
    );
  }
  const laneContext = targetError === null
    ? existingLaneBootstrap(laneDestination)
    : { exists: false, bootstrap: null, error: null };
  if (laneContext.error !== null) {
    return immutablePlan(
      resolvedTarget,
      [immutableOperation({
        relativePath: DEFAULT_LANE_METADATA_PATH,
        type: "file",
        ownership: OWNERSHIP.PROJECT,
        action: "conflict",
        content: null,
        mode: 0o644,
        previousHash: laneDestination.hash,
      })],
      [immutableConflict(DEFAULT_LANE_METADATA_PATH, laneContext.error)],
      {
        baselineId: null,
        layoutVersion: LAYOUT_VERSION,
        targetExisted,
      },
    );
  }
  if (!laneContext.exists && preliminaryV10Metadata.active) {
    const metadataReason = preliminaryV10Metadata.error;
    const operations = [];
    const conflicts = [];
    if (metadataReason !== null) {
      operations.push(immutableOperation({
        relativePath: FRAMEWORK_METADATA_PATH,
        type: "file",
        ownership: OWNERSHIP.FRAMEWORK,
        action: "conflict",
        content: null,
        mode: 0o644,
        previousHash: metadataDestination.hash,
      }));
      conflicts.push(immutableConflict(FRAMEWORK_METADATA_PATH, metadataReason));
    }
    operations.push(immutableOperation({
      relativePath: DEFAULT_LANE_METADATA_PATH,
      type: "file",
      ownership: OWNERSHIP.PROJECT,
      action: "conflict",
      content: null,
      mode: 0o644,
      previousHash: laneDestination.hash,
    }));
    conflicts.push(immutableConflict(
      DEFAULT_LANE_METADATA_PATH,
      "v10 lane.toml baseline_id is missing",
    ));
    return immutablePlan(resolvedTarget, operations, conflicts, {
      baselineId: null,
      layoutVersion: LAYOUT_VERSION,
      targetExisted,
    });
  }
  const bootstrap = laneContext.exists
    ? laneContext.bootstrap
    : normalizeBootstrap(options.bootstrap, options.clock);
  let currentBaselineRelativePath = null;
  let currentBaselineDestination = null;
  let currentBaselineError = null;
  if (laneContext.exists && laneContext.error === null) {
    currentBaselineRelativePath = (
      `.ai-os/lanes/default/baseline-log/${laneContext.bootstrap.file}`
    );
    currentBaselineDestination = inspectDestination(
      resolvedTarget,
      currentBaselineRelativePath,
    );
    destinationSnapshots.set(currentBaselineRelativePath, currentBaselineDestination);
    if (!currentBaselineDestination.exists) {
      currentBaselineError = "current baseline record is missing";
    } else if (
      currentBaselineDestination.error
      || currentBaselineDestination.kind !== "file"
    ) {
      currentBaselineError = destinationConflictReason(
        currentBaselineRelativePath,
        currentBaselineDestination,
      );
    }
  }
  const migration = targetError === null
    ? inspectV10MigrationContext(
      resolvedTarget,
      metadataDestination,
      laneDestination,
      destinationSnapshots,
    )
    : { active: false, context: null, conflicts: new Map() };
  let v10CompatHashes = null;
  const migrationContent = new Map();
  if (migration.active && migration.context !== null) {
    v10CompatHashes = loadCompatHashes();
    if (!v10CandidateIsRecognized(
      FRAMEWORK_METADATA_PATH,
      metadataDestination,
      migration.context,
      v10CompatHashes,
    )) {
      migration.conflicts.set(
        FRAMEWORK_METADATA_PATH,
        "v10 metadata bytes are not recognized by the compatibility manifest",
      );
    }
    const sharedHashes = v10CompatHashes.get(".ai-os/bin/shared.js");
    obsoleteHashes = new Map([[".ai-os/bin/shared.js", new Set(sharedHashes)]]);

    if (options.teamConfig !== false) {
      for (const relativePath of [".gitignore", ".gitattributes"]) {
        const destination = destinationSnapshots.has(relativePath)
          ? destinationSnapshots.get(relativePath)
          : inspectDestination(resolvedTarget, relativePath);
        destinationSnapshots.set(relativePath, destination);
        if (!destination.exists) continue;
        if (destination.error || destination.kind !== "file" || !destination.bytes) {
          migration.conflicts.set(
            relativePath,
            destinationConflictReason(relativePath, destination),
          );
          continue;
        }
        try {
          migrationContent.set(
            relativePath,
            replaceLegacyTeamConfig(destination.bytes, relativePath),
          );
        } catch (error) {
          migration.conflicts.set(relativePath, error.message);
        }
      }
    }
  }
  const inventory = sourceInventory(options, bootstrap);
  const currentPaths = new Set(Object.values(FILE_SPECS).map((descriptor) => (
    filesystemPathKey(
      descriptor.path.split(INITIAL_BASELINE_FILE_TOKEN).join(bootstrap.file),
    )
  )));
  for (const entry of inventory) currentPaths.add(filesystemPathKey(entry.relativePath));
  for (const obsoletePath of obsoleteHashes.keys()) {
    if (currentPaths.has(filesystemPathKey(obsoletePath))) {
      failPlanner(`obsolete path is still current: ${obsoletePath}`);
    }
    if (!isAllowedObsoleteFrameworkPath(obsoletePath)) {
      failPlanner(`obsolete framework path is outside the allowed namespace: ${obsoletePath}`);
    }
  }

  for (const entry of inventory) {
    if (destinationSnapshots.has(entry.relativePath)) continue;
    destinationSnapshots.set(
      entry.relativePath,
      targetError
        ? { exists: true, kind: "invalid", hash: null, error: targetError.message }
        : inspectDestination(resolvedTarget, entry.relativePath),
    );
  }
  const freshDefaultLane = targetError === null
    && !laneContext.exists;

  const operations = [];
  const conflicts = [];
  for (const entry of inventory) {
    const destination = destinationSnapshots.get(entry.relativePath);
    const recognizedV10 = migration.context !== null
      && v10CandidateIsRecognized(
        entry.relativePath,
        destination,
        migration.context,
        v10CompatHashes,
      );
    let plannedContent = migrationContent.get(entry.relativePath) || entry.content;
    if (
      recognizedV10
      && entry.relativePath === DEFAULT_LANE_METADATA_PATH
    ) {
      plannedContent = migratePristineV10Lane(destination.bytes, migration.context.baselineId);
    }
    const accepted = new Set(compatibleHashes.get(entry.relativePath) || []);
    const sourceHash = plannedContent === null ? null : sha256(plannedContent);
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
    } else if (migration.conflicts.has(entry.relativePath)) {
      action = "conflict";
      reason = migration.conflicts.get(entry.relativePath);
    } else if (
      laneContext.exists
      && entry.relativePath === currentBaselineRelativePath
    ) {
      if (currentBaselineError !== null) {
        action = "conflict";
        reason = currentBaselineError;
      } else {
        action = "preserve";
      }
    } else if (migration.context !== null && TEAM_CONFIG_PATHS.has(
      filesystemPathKey(entry.relativePath),
    )) {
      if (!destination.exists) action = "create";
      else if (destination.error || destination.kind !== "file") {
        action = "conflict";
        reason = destinationConflictReason(entry.relativePath, destination);
      } else if (destination.hash === sourceHash) action = "preserve";
      else action = "replace-pristine-project";
    } else if (migration.context !== null && entry.ownership === OWNERSHIP.FRAMEWORK) {
      if (!destination.exists) action = "create";
      else if (destination.error || destination.kind !== "file") {
        action = "conflict";
        reason = destinationConflictReason(entry.relativePath, destination);
      } else if (recognizedV10) action = "replace-framework";
      else {
        action = "conflict";
        reason = `unrecognized v10 framework bytes at ${entry.relativePath}`;
      }
    } else if (
      migration.context !== null
      && entry.ownership === OWNERSHIP.PROJECT
      && destination.exists
      && destination.kind === "file"
      && !destination.error
    ) {
      if (entry.relativePath === DEFAULT_LANE_METADATA_PATH && recognizedV10) {
        action = "replace-pristine-project";
      } else if (V10_PROJECT_UPGRADE_PATHS.has(filesystemPathKey(entry.relativePath))) {
        if (recognizedV10) action = "replace-pristine-project";
        else if (entry.relativePath === "AGENTS.md") {
          action = "conflict";
          reason = "AGENTS.md requires manual merge because its v10 full-content hash is unknown";
        } else action = "preserve";
      } else {
        action = "preserve";
      }
    } else if (
      freshDefaultLane
      && entry.relativePath === `.ai-os/lanes/default/baseline-log/${bootstrap.file}`
      && destination.exists
      && destination.kind === "file"
      && !destination.error
      && destination.hash !== sourceHash
    ) {
      action = "conflict";
      reason = "fresh bootstrap record collision: existing bytes do not match expected bootstrap";
    } else if (
      laneContext.exists
      && entry.relativePath === "AGENTS.md"
      && destination.exists
      && destination.kind === "file"
      && !destination.error
      && destination.hash === sourceHash
    ) {
      action = "preserve";
    } else if (
      laneContext.exists
      && entry.relativePath !== "AGENTS.md"
      && [OWNERSHIP.PROJECT, OWNERSHIP.SESSION].includes(entry.ownership)
      && destination.exists
      && destination.kind === "file"
      && !destination.error
    ) {
      action = "preserve";
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
      content: plannedContent,
      mode: action === "replace-pristine-project" && destination.mode !== null
        ? destination.mode
        : entry.mode,
      previousHash: destination.hash,
    });
    operations.push(operation);
    if (reason !== null) conflicts.push(immutableConflict(entry.relativePath, reason));
  }

  const plannedPaths = new Set(operations.map((operation) => operation.relativePath));
  if (laneContext.exists && !plannedPaths.has(DEFAULT_LANE_METADATA_PATH)) {
    operations.push(immutableOperation({
      relativePath: DEFAULT_LANE_METADATA_PATH,
      type: "file",
      ownership: OWNERSHIP.PROJECT,
      action: "preserve",
      content: null,
      mode: 0o644,
      previousHash: laneDestination.hash,
    }));
  }
  if (
    currentBaselineRelativePath !== null
    && !plannedPaths.has(currentBaselineRelativePath)
  ) {
    const action = currentBaselineError === null ? "preserve" : "conflict";
    operations.push(immutableOperation({
      relativePath: currentBaselineRelativePath,
      type: "file",
      ownership: OWNERSHIP.PROJECT,
      action,
      content: null,
      mode: 0o644,
      previousHash: currentBaselineDestination.hash,
    }));
    if (currentBaselineError !== null) {
      conflicts.push(immutableConflict(currentBaselineRelativePath, currentBaselineError));
    }
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

function throwRevalidationError(relativePath, message, phase = "revalidate commit") {
  throw filesystemError(phase, relativePath, new Error(message));
}

function validateSafeDirectory(
  absolutePath,
  fsOps,
  relativePath,
  phase = "revalidate commit",
) {
  const stat = lstatIfPresent(
    absolutePath,
    fsOps,
    phase,
    relativePath,
  );
  if (stat === null || stat.isSymbolicLink() || !stat.isDirectory()) {
    throwRevalidationError(
      relativePath,
      `path is not a safe directory: ${absolutePath}`,
      phase,
    );
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

function readStableRegularFile(
  absolutePath,
  fsOps,
  relativePath,
  label,
  phase = "revalidate commit",
) {
  const before = lstatIfPresent(
    absolutePath,
    fsOps,
    phase,
    relativePath,
  );
  if (before === null || before.isSymbolicLink() || !before.isFile()) {
    throwRevalidationError(relativePath, `${label} is not a regular file`, phase);
  }

  let bytes;
  try {
    bytes = fsOps.readFile(absolutePath);
  } catch (error) {
    throw filesystemError(phase, relativePath, error);
  }

  const after = lstatIfPresent(
    absolutePath,
    fsOps,
    phase,
    relativePath,
  );
  if (
    after === null
    || after.isSymbolicLink()
    || !after.isFile()
    || !sameFileIdentity(before, after)
  ) {
    throwRevalidationError(relativePath, `${label} changed during validation`, phase);
  }
  return { bytes, stat: after };
}

function validateSafeDestinationPath(plan, fsOps, relativePath, phase) {
  validateSafeDirectory(plan.targetDir, fsOps, relativePath, phase);
  const segments = relativePath.split("/");
  let parent = plan.targetDir;
  for (const segment of segments.slice(0, -1)) {
    parent = path.join(parent, segment);
    validateSafeDirectory(parent, fsOps, relativePath, phase);
  }
}

function revalidatePreservedDestinations(plan, fsOps) {
  const phase = "revalidate preserve";
  for (const operation of plan.operations) {
    if (operation.action !== "preserve") continue;
    validateSafeDestinationPath(plan, fsOps, operation.relativePath, phase);
    const absolutePath = path.join(
      plan.targetDir,
      ...operation.relativePath.split("/"),
    );
    const destination = readStableRegularFile(
      absolutePath,
      fsOps,
      operation.relativePath,
      "preserved destination",
      phase,
    );
    if (sha256(destination.bytes) !== operation.previousHash) {
      throwRevalidationError(
        operation.relativePath,
        "preserved destination bytes changed after planning",
        phase,
      );
    }
  }
}

function revalidateDestinationsBeforeCommit(plan, fsOps, staged) {
  for (const record of staged) {
    const { operation } = record;
    validateSafeDestinationPath(
      plan,
      fsOps,
      operation.relativePath,
      "revalidate commit",
    );

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
      if (
        operation.action === "replace-pristine-project"
        && (destination.stat.mode & 0o777) !== operation.mode
      ) {
        throwRevalidationError(operation.relativePath, "project destination mode changed after planning");
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
    revalidatePreservedDestinations(plan, fsOps);
    stageOperations(plan, fsOps, tx);
    commitStaged(plan, tx.staged, fsOps);
    revalidatePreservedDestinations(plan, fsOps);
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
  loadCompatHashes,
  normalizeV10Candidate,
  replaceManagedBlock,
};
