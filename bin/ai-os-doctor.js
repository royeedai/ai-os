#!/usr/bin/env node

/**
 * AI-OS doctor
 *
 * Checks installed layout and deterministic delivery readiness without
 * consulting package-source bytes for target truth.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { performance } = require("node:perf_hooks");
const { TextDecoder } = require("node:util");

const {
  CanonicalParseError,
  GovernanceValidationError,
  FILE_SPECS,
  LAYOUT_MODE,
  LAYOUT_VERSION,
  OWNERSHIP,
  extractDesignAcceptanceIds,
  parseBaselineRecord,
  parseCanonicalToml,
  parseCanonicalYaml,
  parseEffectiveGitignoreRules,
  parseManagedBlock,
  parseManagedFiles,
  projectTasksForEvidence,
  isPathIgnored,
  validateTasksV5,
} = require("./doctor-shared");

const PROJECT_STATE_ROOT = ".ai-os";
const LANES_ROOT = ".ai-os/lanes";
const DEFAULT_LANE_ID = "default";
const METADATA_PATH = ".ai-os/framework.toml";
const MANIFEST_PATH = ".ai-os/managed-files.tsv";
const MANAGED_BLOCK_BEGIN = "# BEGIN AI-OS";
const MANAGED_BLOCK_END = "# END AI-OS";
const TARGET_VERSION_PATH = ".ai-os/bin/VERSION";
const PINNED_PUBLIC_INSTALL = "npx --yes github:royeedai/ai-os#v10.5.1 .";

const METADATA_KEYS = Object.freeze([
  "schema_version",
  "layout_version",
  "layout_mode",
  "default_lane",
  "framework_version",
]);
const LANE_KEYS = Object.freeze([
  "id",
  "title",
  "status",
  "baseline_id",
  "quality_tier",
  "risk_tier",
  "governance_tier",
]);
const OPTIONAL_INVENTORY_PAIRS = Object.freeze([
  Object.freeze([".gitattributes", ".gitignore"]),
  Object.freeze(["CLAUDE.md", "GEMINI.md"]),
]);
const INITIAL_BASELINE_TEMPLATE_PATH =
  ".ai-os/lanes/default/baseline-log/{{INITIAL_BASELINE_FILE}}";
const INITIAL_BASELINE_PATTERN =
  /^\.ai-os\/lanes\/default\/baseline-log\/BL-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u;
const BASELINE_RECORD_PATTERN =
  /^(?:CR|BL)-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/u;
const BASELINE_ID_PATTERN =
  /^(?:CR|BL)-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_BASELINE_ID_LENGTH = 128;
const SEMANTIC_WARNING_CODES = new Set(["W070", "W071", "W072"]);
const CONSTITUTION_ANCHORS = Object.freeze([
  "## 五条核心要求",
  "## 绝对禁止",
]);
const SEVERITY_RANK = Object.freeze({ error: 0, warning: 1, info: 2 });
const ISSUE_SEVERITY = Object.freeze({
  E001: "error",
  E002: "error",
  E003: "error",
  E004: "error",
  E010: "error",
  E020: "error",
  E022: "error",
  E050: "error",
  E051: "error",
  W010: "warning",
  W011: "warning",
  W030: "warning",
  W031: "warning",
  W040: "warning",
  W041: "warning",
  W070: "warning",
  W071: "warning",
  W072: "warning",
  I020: "info",
  R001: "info",
  R002: "info",
  R010: "info",
  R020: "info",
  R021: "info",
  R022: "info",
  R030: "info",
  R031: "info",
});
const MAX_EXECUTOR_VERSION_BYTES = 1024;
const MAX_TARGET_VERSION_BYTES = 1024;
const MAX_TOML_BYTES = 64 * 1024;
const MAX_MANIFEST_BYTES = 256 * 1024;
const MAX_TARGET_TEXT_BYTES = 1024 * 1024;
const MAX_FRAMEWORK_HASH_BYTES = 16 * 1024 * 1024;
const MAX_LANE_ENTRIES = 256;
const MAX_BASELINE_ENTRIES = 4096;
const HASH_CHUNK_BYTES = 64 * 1024;
const DEFAULT_GIT_LIMITS = Object.freeze({
  uniqueShas: 64,
  commandTimeoutMs: 3000,
  totalTimeoutMs: 15000,
  statusBytes: 4 * 1024 * 1024,
  diffBytes: 4 * 1024 * 1024,
  metadataBytes: 64 * 1024,
  historicalTasksBytes: 1024 * 1024,
  pathRecords: 65536,
});
const GIT_OPERATIONS = new Set([
  "inside-work-tree",
  "repository-root",
  "project-prefix",
  "object-format",
  "head",
  "status",
  "ancestor",
  "diff",
  "historical-tree",
  "historical-tasks",
]);
const UNSAFE_OUTPUT_VALUE_CHARACTERS =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/gu;
const UNSAFE_SERIALIZED_JSON_CHARACTERS =
  /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/gu;

class TargetFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = "TargetFormatError";
  }
}

function printHelp(io) {
  io.stdout.write(`create-ai-os doctor — Check installed layout and delivery readiness

Usage:
  create-ai-os doctor [target-dir]

Options:
  --json            Output JSON for CI integration
  --strict          Require delivery readiness in addition to layout health
  -h, --help        Show this help

Exit codes:
  0  Layout checks pass (normal mode)
  1  Layout checks fail, or strict delivery readiness is not satisfied
  2  Target is not an AI-OS project (no .ai-os/ found)
`);
}

function parseArgs(argv) {
  const opts = { target: "", json: false, strict: false, help: false };
  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--strict") {
      opts.strict = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown option: ${arg}`);
    } else if (opts.target) {
      throw new Error(`unexpected argument: ${arg}`);
    } else {
      opts.target = arg;
    }
  }
  return opts;
}

function isAbsentFilesystemError(error) {
  return error && (error.code === "ENOENT" || error.code === "ENOTDIR");
}

function fileExists(absolutePath) {
  try {
    fs.accessSync(absolutePath);
    return true;
  } catch (error) {
    if (isAbsentFilesystemError(error)) return false;
    throw error;
  }
}

function lstatIfPresent(absolutePath) {
  try {
    return fs.lstatSync(absolutePath);
  } catch (error) {
    if (isAbsentFilesystemError(error)) return null;
    throw error;
  }
}

function readFrameworkVersion() {
  for (const candidate of [
    path.join(__dirname, "VERSION"),
    path.resolve(__dirname, "..", "VERSION"),
  ]) {
    try {
      const content = decodeTargetText(
        readFileBytesBounded(
          candidate,
          "executor VERSION",
          MAX_EXECUTOR_VERSION_BYTES,
        ),
        "executor VERSION",
        { lfOnly: true },
      );
      const version = content.endsWith("\n") ? content.slice(0, -1) : content;
      if (isSemanticVersion(version) && !version.includes("\n")) return version;
      return "unknown";
    } catch (error) {
      if (error instanceof TargetFormatError) return "unknown";
      if (!isAbsentFilesystemError(error)) throw error;
    }
  }
  return "0.0.0";
}

function compareCodePointText(left, right) {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0));
  const rightPoints = Array.from(right, (character) => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] < rightPoints[index] ? -1 : 1;
    }
  }
  return leftPoints.length - rightPoints.length;
}

function compareIssues(left, right) {
  for (const [leftValue, rightValue] of [
    [left.lane_id ?? "", right.lane_id ?? ""],
    [left.path ?? "", right.path ?? ""],
  ]) {
    const comparison = compareCodePointText(leftValue, rightValue);
    if (comparison !== 0) return comparison;
  }
  const severityComparison =
    SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  if (severityComparison !== 0) return severityComparison;
  for (const [leftValue, rightValue] of [
    [left.code, right.code],
    [left.message, right.message],
  ]) {
    const comparison = compareCodePointText(leftValue, rightValue);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function makeIssue(severity, code, message, issuePath = null, laneId = null) {
  const catalogSeverity = ISSUE_SEVERITY[code];
  if (!catalogSeverity) throw new Error(`unknown doctor issue code: ${code}`);
  if (severity !== catalogSeverity) {
    throw new Error(`doctor issue ${code} must use severity ${catalogSeverity}`);
  }
  return {
    level: severity,
    code,
    message: escapeUnsafeOutputValue(message),
    severity,
    path: issuePath,
    lane_id: laneId,
  };
}

function escapeUnsafeOutputValue(value) {
  return String(value).replace(
    UNSAFE_OUTPUT_VALUE_CHARACTERS,
    (character) => `\\u${character.codePointAt(0).toString(16).padStart(4, "0")}`,
  );
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2).replace(
    UNSAFE_SERIALIZED_JSON_CHARACTERS,
    (character) => `\\u${character.codePointAt(0).toString(16).padStart(4, "0")}`,
  )}\n`;
}

function decodeTargetText(bytes, label, { lfOnly = false } = {}) {
  if (
    bytes.length >= 3
    && bytes[0] === 0xef
    && bytes[1] === 0xbb
    && bytes[2] === 0xbf
  ) {
    throw new TargetFormatError(`${label} must not contain a UTF-8 BOM`);
  }
  let content;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TargetFormatError(`${label} is not valid UTF-8`);
  }
  if (lfOnly && content.includes("\r")) {
    throw new TargetFormatError(`${label} must use LF line endings only`);
  }
  if (!lfOnly && /\r(?!\n)/u.test(content)) {
    throw new TargetFormatError(`${label} contains a bare carriage return`);
  }
  return content;
}

function readFileBytesBounded(absolutePath, label, maxBytes) {
  const descriptor = openReadOnlyNoFollow(absolutePath, label);
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile()) {
      throw new TargetFormatError(`${label} is not a regular file`);
    }
    if (stat.size > maxBytes) {
      throw new TargetFormatError(`${label} exceeds the ${maxBytes}-byte size limit`);
    }
    const buffer = Buffer.allocUnsafe(maxBytes + 1);
    let total = 0;
    while (total < buffer.length) {
      const bytesRead = fs.readSync(
        descriptor,
        buffer,
        total,
        buffer.length - total,
        null,
      );
      if (bytesRead === 0) break;
      total += bytesRead;
    }
    if (total > maxBytes) {
      throw new TargetFormatError(`${label} exceeds the ${maxBytes}-byte size limit`);
    }
    return buffer.subarray(0, total);
  } finally {
    fs.closeSync(descriptor);
  }
}

function openReadOnlyNoFollow(absolutePath, label) {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  try {
    return fs.openSync(absolutePath, flags);
  } catch (error) {
    if (error && ["ELOOP", "EMLINK"].includes(error.code)) {
      throw new TargetFormatError(`${label} cannot be opened without following a link`);
    }
    throw error;
  }
}

function readTargetText(
  absolutePath,
  label,
  { lfOnly = false, maxBytes = MAX_TARGET_TEXT_BYTES } = {},
) {
  return decodeTargetText(
    readFileBytesBounded(absolutePath, label, maxBytes),
    label,
    { lfOnly },
  );
}

function hashManagedFrameworkFile(absolutePath, label) {
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.allocUnsafe(HASH_CHUNK_BYTES);
  const descriptor = openReadOnlyNoFollow(absolutePath, label);
  let total = 0;
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile()) {
      throw new TargetFormatError(`${label} is not a regular file`);
    }
    if (stat.size > MAX_FRAMEWORK_HASH_BYTES) {
      throw new TargetFormatError(
        `${label} exceeds the ${MAX_FRAMEWORK_HASH_BYTES}-byte framework hash limit`,
      );
    }
    for (;;) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > MAX_FRAMEWORK_HASH_BYTES) {
        throw new TargetFormatError(
          `${label} exceeds the ${MAX_FRAMEWORK_HASH_BYTES}-byte framework hash limit`,
        );
      }
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
}

function readDirectoryNamesBounded(absolutePath, maxEntries, label) {
  const directory = fs.opendirSync(absolutePath);
  const names = [];
  try {
    for (;;) {
      const entry = directory.readSync();
      if (entry === null) break;
      if (names.length >= maxEntries) {
        throw new TargetFormatError(`${label} exceeds the ${maxEntries}-entry limit`);
      }
      names.push(entry.name);
    }
  } finally {
    directory.closeSync();
  }
  return names;
}

function createGitEnvironment(environment = process.env) {
  const allowed = Object.create(null);
  if (typeof environment.PATH === "string") allowed.PATH = environment.PATH;
  if (process.platform === "win32") {
    for (const key of ["SystemRoot", "WINDIR", "ComSpec", "PATHEXT", "TEMP", "TMP"]) {
      if (typeof environment[key] === "string") allowed[key] = environment[key];
    }
  }
  Object.assign(allowed, {
    GIT_NO_LAZY_FETCH: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_GRAFT_FILE: os.devNull,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: os.devNull,
    GIT_PAGER: "cat",
    LC_ALL: "C",
    LANG: "C",
    TZ: "UTC",
  });
  // Node's coverage runtime may append NODE_V8_COVERAGE while spawning a child.
  // Keep the allowlisted environment mutable for child_process compatibility;
  // a fresh object is still created for every runner and is never shared.
  return allowed;
}

function isFullObjectId(value) {
  return typeof value === "string" && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(value);
}

function isSafeGitPath(value) {
  return typeof value === "string"
    && value.length > 0
    && !value.includes("\0")
    && !value.includes("\r")
    && !value.includes("\n")
    && !path.isAbsolute(value)
    && value.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

function isAllowedGitCommand(operation, args) {
  const exact = {
    "inside-work-tree": ["rev-parse", "--is-inside-work-tree"],
    "repository-root": ["rev-parse", "--path-format=absolute", "--show-toplevel"],
    "project-prefix": ["rev-parse", "--show-prefix"],
    "object-format": ["rev-parse", "--show-object-format"],
    head: ["rev-parse", "--verify", "--end-of-options", "HEAD^{commit}"],
    status: [
      "status",
      "--porcelain=v2",
      "-z",
      "--untracked-files=all",
      "--ignore-submodules=none",
      "--no-renames",
    ],
  };
  if (Object.hasOwn(exact, operation)) {
    return args.length === exact[operation].length
      && args.every((value, index) => value === exact[operation][index]);
  }
  if (operation === "ancestor") {
    return args.length === 4
      && args[0] === "merge-base"
      && args[1] === "--is-ancestor"
      && isFullObjectId(args[2])
      && isFullObjectId(args[3]);
  }
  if (operation === "diff") {
    return args.length === 9
      && args.slice(0, 6).every((value, index) => value === [
        "diff", "--no-ext-diff", "--no-textconv", "--no-renames", "--name-only", "-z",
      ][index])
      && isFullObjectId(args[6])
      && isFullObjectId(args[7])
      && args[8] === "--";
  }
  if (operation === "historical-tree") {
    return args.length === 7
      && args[0] === "--literal-pathspecs"
      && args[1] === "ls-tree"
      && args[2] === "-z"
      && args[3] === "--full-tree"
      && isFullObjectId(args[4])
      && args[5] === "--"
      && isSafeGitPath(args[6]);
  }
  if (operation === "historical-tasks") {
    return args.length === 3
      && args[0] === "cat-file"
      && args[1] === "blob"
      && isFullObjectId(args[2]);
  }
  return false;
}

function unavailableGit(reason) {
  return Object.freeze({ state: "unavailable", reason });
}

function createLocalGitRunner({
  spawnSyncImpl = spawnSync,
  monotonicNow = () => performance.now(),
  limits = {},
} = {}) {
  const effectiveLimits = Object.freeze({ ...DEFAULT_GIT_LIMITS, ...limits });
  const startedAt = monotonicNow();
  const environment = createGitEnvironment();
  return function runGit({ operation, cwd, args, maxOutputBytes }) {
    if (!GIT_OPERATIONS.has(operation) || !Array.isArray(args)) {
      return unavailableGit("command-not-allowed");
    }
    if (!isAllowedGitCommand(operation, args)) {
      return unavailableGit("command-not-allowed");
    }
    if (typeof cwd !== "string" || !path.isAbsolute(cwd)) {
      return unavailableGit("invalid-working-directory");
    }
    if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes <= 0) {
      return unavailableGit("invalid-output-budget");
    }
    const elapsed = monotonicNow() - startedAt;
    const remaining = effectiveLimits.totalTimeoutMs - elapsed;
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return unavailableGit("total-timeout");
    }
    const timeout = Math.max(
      1,
      Math.floor(Math.min(effectiveLimits.commandTimeoutMs, remaining)),
    );
    const prefix = [
      "--no-pager",
      "-c", "core.fsmonitor=false",
      "-c", "core.untrackedCache=false",
      "-c", "protocol.allow=never",
      "-C", cwd,
    ];
    let result;
    try {
      result = spawnSyncImpl("git", [...prefix, ...args], {
        encoding: null,
        env: environment,
        maxBuffer: maxOutputBytes,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        timeout,
        windowsHide: true,
      });
    } catch {
      return unavailableGit("git-unavailable");
    }
    if (result && result.error) {
      if (result.error.code === "ETIMEDOUT") return unavailableGit("command-timeout");
      if (result.error.code === "ENOBUFS") return unavailableGit("output-limit");
      return unavailableGit("git-unavailable");
    }
    if (!result || result.signal) return unavailableGit("command-failed");
    const stdout = Buffer.isBuffer(result.stdout)
      ? result.stdout
      : Buffer.from(result.stdout || "");
    if (stdout.length > maxOutputBytes) return unavailableGit("output-limit");
    return Object.freeze({
      state: "completed",
      exit_code: Number.isInteger(result.status) ? result.status : null,
      stdout,
    });
  };
}

function decodeGitLine(bytes) {
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new TargetFormatError("Git metadata is not valid UTF-8");
  }
  if (!value.endsWith("\n") || value.slice(0, -1).includes("\n") || value.includes("\r")) {
    throw new TargetFormatError("Git metadata is not one canonical line");
  }
  return value.slice(0, -1);
}

function parseGitNulRecords(bytes, maxRecords) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return [];
  if (bytes[bytes.length - 1] !== 0) {
    throw new TargetFormatError("Git NUL output has no terminal delimiter");
  }
  const records = [];
  let start = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] !== 0) continue;
    if (index === start) throw new TargetFormatError("Git NUL output has an empty record");
    if (records.length >= maxRecords) {
      throw new TargetFormatError("Git NUL output exceeds the record limit");
    }
    let record;
    try {
      record = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(start, index));
    } catch {
      throw new TargetFormatError("Git NUL output is not valid UTF-8");
    }
    records.push(record);
    start = index + 1;
  }
  return [...new Set(records)].sort(compareCodePointText);
}

function gitCompleted(runGit, request, acceptedExitCodes = [0]) {
  const result = runGit(request);
  if (!result || result.state !== "completed") {
    return { ok: false, reason: result && result.reason ? result.reason : "command-failed" };
  }
  if (!acceptedExitCodes.includes(result.exit_code)) {
    return { ok: false, reason: "command-failed" };
  }
  return { ok: true, exitCode: result.exit_code, stdout: result.stdout };
}

function freezeGitRepository(repository) {
  return Object.freeze({
    root: repository.root,
    project_prefix: repository.project_prefix,
    object_format: repository.object_format,
    head_sha: repository.head_sha,
    dirty: repository.dirty,
  });
}

function resolveGitState(targetDir, { runGit = createLocalGitRunner() } = {}) {
  const target = path.resolve(targetDir || ".");
  try {
    const inside = gitCompleted(runGit, {
      operation: "inside-work-tree",
      cwd: target,
      args: ["rev-parse", "--is-inside-work-tree"],
      maxOutputBytes: DEFAULT_GIT_LIMITS.metadataBytes,
    });
    if (!inside.ok || decodeGitLine(inside.stdout) !== "true") {
      return unavailableGit(inside.reason || "not-a-work-tree");
    }
    const rootResult = gitCompleted(runGit, {
      operation: "repository-root",
      cwd: target,
      args: ["rev-parse", "--path-format=absolute", "--show-toplevel"],
      maxOutputBytes: DEFAULT_GIT_LIMITS.metadataBytes,
    });
    if (!rootResult.ok) return unavailableGit(rootResult.reason);
    const root = decodeGitLine(rootResult.stdout);
    if (!path.isAbsolute(root)) return unavailableGit("invalid-repository-root");

    const prefixResult = gitCompleted(runGit, {
      operation: "project-prefix",
      cwd: target,
      args: ["rev-parse", "--show-prefix"],
      maxOutputBytes: DEFAULT_GIT_LIMITS.metadataBytes,
    });
    const formatResult = gitCompleted(runGit, {
      operation: "object-format",
      cwd: root,
      args: ["rev-parse", "--show-object-format"],
      maxOutputBytes: DEFAULT_GIT_LIMITS.metadataBytes,
    });
    const headResult = gitCompleted(runGit, {
      operation: "head",
      cwd: root,
      args: ["rev-parse", "--verify", "--end-of-options", "HEAD^{commit}"],
      maxOutputBytes: DEFAULT_GIT_LIMITS.metadataBytes,
    });
    const statusResult = gitCompleted(runGit, {
      operation: "status",
      cwd: root,
      args: [
        "status", "--porcelain=v2", "-z", "--untracked-files=all",
        "--ignore-submodules=none", "--no-renames",
      ],
      maxOutputBytes: DEFAULT_GIT_LIMITS.statusBytes,
    });
    for (const result of [prefixResult, formatResult, headResult, statusResult]) {
      if (!result.ok) return unavailableGit(result.reason);
    }
    const projectPrefix = decodeGitLine(prefixResult.stdout);
    const expectedPrefix = path.relative(root, target).split(path.sep).join("/");
    const normalizedExpectedPrefix = expectedPrefix ? `${expectedPrefix}/` : "";
    if (projectPrefix !== normalizedExpectedPrefix || expectedPrefix.startsWith("..")) {
      return unavailableGit("project-outside-repository");
    }
    const objectFormat = decodeGitLine(formatResult.stdout);
    if (!new Set(["sha1", "sha256"]).has(objectFormat)) {
      return unavailableGit("unsupported-object-format");
    }
    const headSha = decodeGitLine(headResult.stdout);
    const expectedLength = objectFormat === "sha1" ? 40 : 64;
    if (!new RegExp(`^[a-f0-9]{${expectedLength}}$`, "u").test(headSha)) {
      return unavailableGit("invalid-head");
    }
    if (statusResult.stdout.length > 0) {
      parseGitNulRecords(statusResult.stdout, DEFAULT_GIT_LIMITS.pathRecords);
    }
    return Object.freeze({
      state: "available",
      repository: freezeGitRepository({
        root,
        project_prefix: projectPrefix,
        object_format: objectFormat,
        head_sha: headSha,
        dirty: statusResult.stdout.length > 0,
      }),
    });
  } catch (error) {
    if (!(error instanceof TargetFormatError)) throw error;
    return unavailableGit("invalid-git-output");
  }
}

function resolveEvidenceGitEnvelope(
  targetDir,
  laneId,
  observedShas,
  { runGit = createLocalGitRunner(), gitState = null, limits = {} } = {},
) {
  const effectiveLimits = Object.freeze({ ...DEFAULT_GIT_LIMITS, ...limits });
  if (!Array.isArray(observedShas)) return unavailableGit("invalid-observed-commits");
  const shas = [...new Set(observedShas)].sort(compareCodePointText);
  if (shas.length > effectiveLimits.uniqueShas || !shas.every(isFullObjectId)) {
    return unavailableGit("invalid-observed-commits");
  }
  const state = gitState || resolveGitState(targetDir, { runGit });
  if (!state || state.state !== "available") return state || unavailableGit("git-unavailable");
  const repository = state.repository;
  const expectedLength = repository.object_format === "sha1" ? 40 : 64;
  if (shas.some((sha) => sha.length !== expectedLength)) {
    return unavailableGit("invalid-observed-commits");
  }
  if (repository.dirty) return unavailableGit("dirty-work-tree");
  const tasksPath = `${repository.project_prefix}.ai-os/lanes/${laneId}/tasks.yaml`;
  if (!isSafeGitPath(tasksPath)) return unavailableGit("invalid-tasks-path");
  const observations = [];
  try {
    for (const sha of shas) {
      const ancestor = gitCompleted(runGit, {
        operation: "ancestor",
        cwd: repository.root,
        args: ["merge-base", "--is-ancestor", sha, repository.head_sha],
        maxOutputBytes: effectiveLimits.metadataBytes,
      }, [0, 1]);
      if (!ancestor.ok) return unavailableGit(ancestor.reason);
      const diff = gitCompleted(runGit, {
        operation: "diff",
        cwd: repository.root,
        args: [
          "diff", "--no-ext-diff", "--no-textconv", "--no-renames", "--name-only", "-z",
          sha, repository.head_sha, "--",
        ],
        maxOutputBytes: effectiveLimits.diffBytes,
      });
      if (!diff.ok) return unavailableGit(diff.reason);
      const changedPaths = parseGitNulRecords(diff.stdout, effectiveLimits.pathRecords);
      const tree = gitCompleted(runGit, {
        operation: "historical-tree",
        cwd: repository.root,
        args: ["--literal-pathspecs", "ls-tree", "-z", "--full-tree", sha, "--", tasksPath],
        maxOutputBytes: effectiveLimits.metadataBytes,
      });
      if (!tree.ok) return unavailableGit(tree.reason);
      const treeRecords = parseGitNulRecords(tree.stdout, 2);
      if (treeRecords.length !== 1) return unavailableGit("historical-tasks-missing");
      const treeMatch = treeRecords[0].match(/^(100644|100755) blob ([a-f0-9]+)\t(.+)$/u);
      if (!treeMatch || treeMatch[3] !== tasksPath || treeMatch[2].length !== expectedLength) {
        return unavailableGit("historical-tasks-invalid");
      }
      const historical = gitCompleted(runGit, {
        operation: "historical-tasks",
        cwd: repository.root,
        args: ["cat-file", "blob", treeMatch[2]],
        maxOutputBytes: effectiveLimits.historicalTasksBytes,
      });
      if (!historical.ok) return unavailableGit(historical.reason);
      const historicalText = decodeTargetText(historical.stdout, "historical tasks.yaml");
      const historicalTasks = validateTasksV5(parseCanonicalYaml(historicalText));
      observations.push(Object.freeze({
        git_sha: sha,
        ancestor: ancestor.exitCode === 0,
        changed_paths: Object.freeze(changedPaths),
        historical_tasks: historicalTasks,
      }));
    }
  } catch (error) {
    if (
      !(error instanceof TargetFormatError)
      && !(error instanceof CanonicalParseError)
      && !(error instanceof GovernanceValidationError)
    ) throw error;
    return unavailableGit("invalid-git-output");
  }
  return Object.freeze({
    state: "available",
    repository,
    tasks_path: tasksPath,
    observations: Object.freeze(observations),
  });
}

function targetPath(targetDir, relativePath) {
  return path.join(targetDir, ...relativePath.split("/"));
}

function inspectTargetPathChain(targetDir, relativePath) {
  const segments = relativePath.split("/");
  let absolute = targetDir;
  const traversed = [];
  for (let index = 0; index < segments.length; index += 1) {
    absolute = path.join(absolute, segments[index]);
    traversed.push(segments[index]);
    const stat = lstatIfPresent(absolute);
    if (stat === null) {
      return { kind: "missing", absolute, relativePath: traversed.join("/"), stat: null };
    }
    if (stat.isSymbolicLink()) {
      return { kind: "link", absolute, relativePath: traversed.join("/"), stat };
    }
    if (index < segments.length - 1 && !stat.isDirectory()) {
      return { kind: "parent-type", absolute, relativePath: traversed.join("/"), stat };
    }
    if (index === segments.length - 1) {
      return { kind: "ok", absolute, relativePath, stat };
    }
  }
  return { kind: "missing", absolute, relativePath, stat: null };
}

function isSemanticVersion(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/u.test(value);
}

function inspectMetadata(targetDir, addGlobalIssue) {
  const absolute = targetPath(targetDir, METADATA_PATH);
  const inspection = inspectTargetPathChain(targetDir, METADATA_PATH);
  let metadata = null;
  let trusted = true;

  if (inspection.kind === "missing") {
    addGlobalIssue("error", "E001", "Missing .ai-os/framework.toml metadata.");
    trusted = false;
  } else if (inspection.kind === "link") {
    addGlobalIssue(
      "error",
      "E004",
      `${inspection.relativePath} in the framework metadata path is a symbolic link or junction.`,
    );
    trusted = false;
  } else if (inspection.kind === "parent-type") {
    addGlobalIssue(
      "error",
      "E022",
      `${inspection.relativePath} in the framework metadata path is not a directory.`,
    );
    trusted = false;
  } else {
    const followed = fs.statSync(absolute);
    if (!followed.isFile()) {
      addGlobalIssue("error", "E022", ".ai-os/framework.toml metadata is not a file.");
      trusted = false;
    } else {
      try {
        const content = readTargetText(absolute, ".ai-os/framework.toml metadata", {
          maxBytes: MAX_TOML_BYTES,
        });
        metadata = parseCanonicalToml(content, {
          requiredKeys: METADATA_KEYS,
          allowedKeys: METADATA_KEYS,
        });
      } catch (error) {
        if (error instanceof CanonicalParseError && /^missing key /u.test(error.reason)) {
          const field = error.reason.slice("missing key ".length);
          addGlobalIssue(
            "error",
            "E002",
            `.ai-os/framework.toml metadata is missing required field ${field}.`,
          );
        } else if (error instanceof CanonicalParseError || error instanceof TargetFormatError) {
          addGlobalIssue(
            "error",
            "E003",
            `.ai-os/framework.toml metadata is not canonical: ${error.message}`,
          );
        } else {
          throw error;
        }
        trusted = false;
      }
    }
  }

  let targetVersion = null;
  const versionAbsolute = targetPath(targetDir, TARGET_VERSION_PATH);
  const versionInspection = inspectTargetPathChain(targetDir, TARGET_VERSION_PATH);
  if (versionInspection.kind === "missing") {
    addGlobalIssue(
      "error",
      "E002",
      "framework_version cannot be verified because .ai-os/bin/VERSION is missing.",
    );
    trusted = false;
  } else if (versionInspection.kind === "link") {
    addGlobalIssue(
      "error",
      "E004",
      `${versionInspection.relativePath} in the target VERSION path is a symbolic link or junction.`,
    );
    trusted = false;
  } else if (versionInspection.kind === "parent-type") {
    addGlobalIssue(
      "error",
      "E022",
      `${versionInspection.relativePath} in the target VERSION path is not a directory.`,
    );
    trusted = false;
  } else {
    const followed = fs.statSync(versionAbsolute);
    if (!followed.isFile()) {
      addGlobalIssue("error", "E022", ".ai-os/bin/VERSION is not a file.");
      trusted = false;
    } else {
      try {
        const content = readTargetText(versionAbsolute, ".ai-os/bin/VERSION", {
          maxBytes: MAX_TARGET_VERSION_BYTES,
        });
        const candidateVersion = content.replace(/(?:\r?\n)?$/u, "");
        if (!isSemanticVersion(candidateVersion) || /[\r\n]/u.test(candidateVersion)) {
          addGlobalIssue(
            "error",
            "E002",
            ".ai-os/bin/VERSION must contain exactly one semantic framework version.",
          );
          targetVersion = null;
          trusted = false;
        } else {
          targetVersion = candidateVersion;
        }
      } catch (error) {
        if (!(error instanceof TargetFormatError)) throw error;
        addGlobalIssue("error", "E003", `.ai-os/bin/VERSION is invalid: ${error.message}`);
        trusted = false;
      }
    }
  }

  if (metadata) {
    const expectedValues = {
      schema_version: LAYOUT_VERSION,
      layout_version: LAYOUT_VERSION,
      layout_mode: LAYOUT_MODE,
      default_lane: DEFAULT_LANE_ID,
    };
    for (const [field, expected] of Object.entries(expectedValues)) {
      if (metadata[field] !== expected) {
        addGlobalIssue(
          "error",
          "E002",
          `framework.toml ${field} is "${metadata[field]}", expected "${expected}".`,
        );
        trusted = false;
      }
    }
    if (!isSemanticVersion(metadata.framework_version)) {
      addGlobalIssue(
        "error",
        "E002",
        "framework.toml framework_version must be a semantic version.",
      );
      trusted = false;
    } else if (targetVersion && metadata.framework_version !== targetVersion) {
      addGlobalIssue(
        "error",
        "E002",
        `framework.toml framework_version "${metadata.framework_version}" does not match target VERSION "${targetVersion}".`,
      );
      trusted = false;
    }
  }

  return {
    metadata,
    trusted,
    installedVersion: trusted ? metadata.framework_version : null,
    layoutVersion: trusted ? metadata.layout_version : null,
    layoutMode: trusted ? metadata.layout_mode : null,
  };
}

function descriptorForManifestPath(relativePath) {
  if (INITIAL_BASELINE_PATTERN.test(relativePath)) {
    return FILE_SPECS[INITIAL_BASELINE_TEMPLATE_PATH];
  }
  return FILE_SPECS[relativePath] || null;
}

function validateManifestInventory(rows, addManifestIssue) {
  const rowPaths = new Set(rows.map((row) => row.path));
  let baselineCount = 0;

  for (const row of rows) {
    const descriptor = descriptorForManifestPath(row.path);
    if (!descriptor || row.path === MANIFEST_PATH) {
      addManifestIssue(`manifest contains an extra or unknown path: ${row.path}`);
      continue;
    }
    if (INITIAL_BASELINE_PATTERN.test(row.path)) baselineCount += 1;
    if (row.type !== descriptor.type) {
      addManifestIssue(`manifest type for ${row.path} does not match the canonical inventory`);
    }
    if (row.ownership !== descriptor.ownership) {
      addManifestIssue(`manifest ownership for ${row.path} does not match the canonical inventory`);
    }
  }

  if (baselineCount !== 1) {
    addManifestIssue("manifest inventory must contain exactly one installer baseline BL record");
  }

  const optionalPaths = new Set(OPTIONAL_INVENTORY_PAIRS.flat());
  for (const pair of OPTIONAL_INVENTORY_PAIRS) {
    const count = pair.filter((relativePath) => rowPaths.has(relativePath)).length;
    if (count !== 0 && count !== pair.length) {
      addManifestIssue(
        `optional manifest inventory pair must include both or neither of ${pair.join(" and ")}`,
      );
    }
  }

  for (const relativePath of Object.keys(FILE_SPECS)) {
    if (
      relativePath === MANIFEST_PATH
      || relativePath === INITIAL_BASELINE_TEMPLATE_PATH
      || optionalPaths.has(relativePath)
    ) {
      continue;
    }
    if (!rowPaths.has(relativePath)) {
      addManifestIssue(`manifest inventory is missing required path: ${relativePath}`);
    }
  }
}

function inspectManifest(targetDir, addGlobalIssue) {
  const absolute = targetPath(targetDir, MANIFEST_PATH);
  const inspection = inspectTargetPathChain(targetDir, MANIFEST_PATH);
  if (inspection.kind === "missing") {
    addGlobalIssue("error", "E020", "Missing core manifest .ai-os/managed-files.tsv.");
    return { metadataTrusted: false, rows: [] };
  }
  if (inspection.kind === "link") {
    addGlobalIssue(
      "error",
      "E004",
      `${inspection.relativePath} in the manifest path is a symbolic link or junction.`,
    );
    return { metadataTrusted: false, rows: [] };
  }
  if (inspection.kind === "parent-type") {
    addGlobalIssue(
      "error",
      "E022",
      `${inspection.relativePath} in the manifest path is not a directory.`,
    );
    return { metadataTrusted: false, rows: [] };
  }
  if (!fs.statSync(absolute).isFile()) {
    addGlobalIssue(
      "error",
      "E022",
      ".ai-os/managed-files.tsv manifest is not a file (wrong type).",
    );
    return { metadataTrusted: false, rows: [] };
  }

  let rows;
  try {
    const content = readTargetText(absolute, ".ai-os/managed-files.tsv manifest", {
      lfOnly: true,
      maxBytes: MAX_MANIFEST_BYTES,
    });
    rows = parseManagedFiles(content);
  } catch (error) {
    if (!(error instanceof CanonicalParseError) && !(error instanceof TargetFormatError)) {
      throw error;
    }
    addGlobalIssue(
      "error",
      error.manifestIssueCode || "E003",
      `.ai-os/managed-files.tsv manifest is not canonical: ${error.message}`,
    );
    return { metadataTrusted: false, rows: [] };
  }

  const inventoryMessages = new Set();
  const addManifestIssue = (message) => inventoryMessages.add(message);
  validateManifestInventory(rows, addManifestIssue);
  for (const message of inventoryMessages) {
    addGlobalIssue("error", "E004", `.ai-os/managed-files.tsv ${message}.`);
  }

  let metadataTrusted = inventoryMessages.size === 0;
  const unsafeFrameworkParents = new Set();
  for (const row of rows) {
    const descriptor = descriptorForManifestPath(row.path);
    if (!descriptor || row.path === MANIFEST_PATH) continue;
    if (row.ownership !== OWNERSHIP.FRAMEWORK) continue;
    const managedInspection = inspectTargetPathChain(targetDir, row.path);
    const managedAbsolute = targetPath(targetDir, row.path);
    const metadataRow = row.path === METADATA_PATH;
    const hasDedicatedChecker = metadataRow || row.path === TARGET_VERSION_PATH;
    if (managedInspection.kind === "missing") {
      if (!hasDedicatedChecker) {
        addGlobalIssue(
          "error",
          "E020",
          `Managed manifest path is missing: ${row.path}.`,
        );
        if (metadataRow) metadataTrusted = false;
      } else if (metadataRow) metadataTrusted = false;
      continue;
    }
    if (managedInspection.kind === "link") {
      if (!hasDedicatedChecker && !unsafeFrameworkParents.has(managedInspection.relativePath)) {
        unsafeFrameworkParents.add(managedInspection.relativePath);
        addGlobalIssue(
          "error",
          "E004",
          `${managedInspection.relativePath} in a managed framework path is a symbolic link or junction.`,
        );
      }
      if (metadataRow) metadataTrusted = false;
      continue;
    }
    if (managedInspection.kind === "parent-type") {
      if (!hasDedicatedChecker && !unsafeFrameworkParents.has(managedInspection.relativePath)) {
        unsafeFrameworkParents.add(managedInspection.relativePath);
        addGlobalIssue(
          "error",
          "E022",
          `${managedInspection.relativePath} in a managed framework path is not a directory.`,
        );
      }
      if (metadataRow) metadataTrusted = false;
      continue;
    }
    if (!fs.statSync(managedAbsolute).isFile()) {
      if (!hasDedicatedChecker) {
        addGlobalIssue(
          "error",
          "E022",
          `Managed manifest path is not a regular file (wrong type): ${row.path}.`,
        );
      }
      if (metadataRow) metadataTrusted = false;
      continue;
    }
    if (row.ownership === OWNERSHIP.FRAMEWORK) {
      let actualHash;
      try {
        actualHash = hashManagedFrameworkFile(managedAbsolute, row.path);
      } catch (error) {
        if (!(error instanceof TargetFormatError)) throw error;
        addGlobalIssue(
          "error",
          "E003",
          `Managed framework file cannot be hashed safely: ${row.path} exceeds the size limit.`,
        );
        if (metadataRow) metadataTrusted = false;
        continue;
      }
      if (actualHash !== row.source_sha256) {
        addGlobalIssue(
          "error",
          "E004",
          `.ai-os/managed-files.tsv manifest hash mismatch for managed framework path ${row.path}.`,
        );
        if (metadataRow) metadataTrusted = false;
      }
    }
  }
  return { metadataTrusted, rows };
}

function inspectGlobalRegularFile(
  targetDir,
  relativePath,
  addGlobalIssue,
  { missingCode = "E020", missingMessage = null } = {},
) {
  const absolute = targetPath(targetDir, relativePath);
  const inspection = inspectTargetPathChain(targetDir, relativePath);
  if (inspection.kind === "missing") {
    addGlobalIssue(
      "error",
      missingCode,
      missingMessage || `Missing core file: ${relativePath}.`,
    );
    return false;
  }
  if (inspection.kind === "link") {
    addGlobalIssue(
      "error",
      "E004",
      `${inspection.relativePath} in ${relativePath} is a symbolic link or junction.`,
    );
    return false;
  }
  if (inspection.kind === "parent-type") {
    addGlobalIssue(
      "error",
      "E022",
      `${inspection.relativePath} in ${relativePath} is not a directory.`,
    );
    return false;
  }
  if (!fs.statSync(absolute).isFile()) {
    addGlobalIssue("error", "E022", `${relativePath} exists but is not a file.`);
    return false;
  }
  return true;
}

function logicalLines(content) {
  if (!content) return [];
  const lines = content.split(/\r\n|\n/u);
  if (/(?:\r\n|\n)$/u.test(content)) lines.pop();
  return lines;
}

function stripHtmlComments(line, state) {
  let cursor = 0;
  let visible = "";
  while (cursor < line.length) {
    if (state.inComment) {
      const close = line.indexOf("-->", cursor);
      if (close === -1) return visible;
      state.inComment = false;
      cursor = close + 3;
      continue;
    }
    const open = line.indexOf("<!--", cursor);
    if (open === -1) return visible + line.slice(cursor);
    visible += line.slice(cursor, open);
    state.inComment = true;
    cursor = open + 4;
  }
  return visible;
}

function constitutionAnchorCounts(lines) {
  const counts = new Map(CONSTITUTION_ANCHORS.map((anchor) => [anchor, 0]));
  const commentState = { inComment: false };
  let fence = null;

  for (const rawLine of lines) {
    if (fence) {
      // Fenced code is literal: comment markers neither open comments nor get
      // stripped into an otherwise-valid closing fence.
      const closer = rawLine.match(/^ {0,3}([`~]+)[ \t]*$/u);
      if (
        closer
        && closer[1][0] === fence.character
        && Array.from(closer[1]).every((character) => character === fence.character)
        && closer[1].length >= fence.length
      ) {
        fence = null;
      }
      continue;
    }

    const line = stripHtmlComments(rawLine, commentState);
    if (commentState.inComment && !line) continue;

    const opener = line.match(/^ {0,3}((`{3,})|(~{3,}))(.*)$/u);
    if (opener) {
      const run = opener[1];
      const suffix = opener[4];
      if (run[0] !== "`" || !suffix.includes("`")) {
        fence = { character: run[0], length: run.length };
        continue;
      }
    }

    for (const anchor of CONSTITUTION_ANCHORS) {
      const match = line.match(/^ {0,3}(.*?)[ \t]*$/u);
      if (match && match[1] === anchor) counts.set(anchor, counts.get(anchor) + 1);
    }
  }
  return counts;
}

function inspectConstitution(targetDir, addGlobalIssue) {
  if (!inspectGlobalRegularFile(targetDir, "AGENTS.md", addGlobalIssue, {
    missingCode: "E010",
    missingMessage: "Missing AGENTS.md at project root. This is the delivery constitution.",
  })) {
    return;
  }

  let content;
  try {
    content = readTargetText(targetPath(targetDir, "AGENTS.md"), "AGENTS.md", {
      maxBytes: MAX_TARGET_TEXT_BYTES,
    });
  } catch (error) {
    if (!(error instanceof TargetFormatError)) throw error;
    addGlobalIssue("error", "E003", `AGENTS.md is invalid: ${error.message}`);
    return;
  }

  const lines = logicalLines(content);
  if (lines.length > 150) {
    addGlobalIssue(
      "warning",
      "W010",
      `AGENTS.md is ${lines.length} lines (target: <=150). Consider trimming.`,
    );
  }
  for (const [anchor, count] of constitutionAnchorCounts(lines)) {
    if (count === 0) {
      addGlobalIssue(
        "warning",
        "W011",
        `AGENTS.md required live heading "${anchor}" is missing; expected exactly once.`,
      );
    } else if (count > 1) {
      addGlobalIssue(
        "warning",
        "W011",
        `AGENTS.md has a duplicate live heading "${anchor}"; expected exactly once.`,
      );
    }
  }
}

function inspectGitignore(targetDir, addGlobalIssue, { managed = false } = {}) {
  const relativePath = ".gitignore";
  const absolute = targetPath(targetDir, relativePath);
  const stat = lstatIfPresent(absolute);
  if (stat === null) {
    if (managed) {
      addGlobalIssue("error", "E020", "Managed project file is missing: .gitignore.");
    } else {
      addGlobalIssue(
        "warning",
        "W040",
        ".gitignore not found. AI-OS lane STATE.md should be session-local.",
      );
    }
    return;
  }
  if (stat.isSymbolicLink()) {
    addGlobalIssue("error", "E004", ".gitignore is a symbolic link.");
    return;
  }
  if (!fs.statSync(absolute).isFile()) {
    addGlobalIssue("error", "E022", ".gitignore exists but is not a file.");
    return;
  }
  let content;
  try {
    content = readTargetText(absolute, ".gitignore", {
      maxBytes: MAX_TARGET_TEXT_BYTES,
    });
  } catch (error) {
    if (!(error instanceof TargetFormatError)) throw error;
    addGlobalIssue("error", "E003", `.gitignore is invalid: ${error.message}`);
    return;
  }
  let rules;
  try {
    if (managed) parseManagedBlock(content, MANAGED_BLOCK_BEGIN, MANAGED_BLOCK_END);
    rules = parseEffectiveGitignoreRules(content);
  } catch (error) {
    if (!(error instanceof GovernanceValidationError) && !(error instanceof CanonicalParseError)) {
      throw error;
    }
    addGlobalIssue("error", "E003", `.gitignore managed structure is invalid: ${error.message}`);
    return;
  }
  const sessionState = ".ai-os/lanes/*/STATE.md";
  if (!isPathIgnored(rules, ".ai-os/lanes/default/STATE.md")) {
    addGlobalIssue(
      "warning",
      "W041",
      `.gitignore does not contain "${sessionState}". Session-local state may be accidentally committed.`,
    );
  }
}

function normalizeTaskScalar(value) {
  return String(value || "").trim().replace(/^["']|["']$/gu, "");
}

function collectTopLevelTasks(tasksContent) {
  const tasks = [];
  let inTasks = false;
  let currentTask = null;
  let currentTaskIndent = -1;
  let currentField = null;
  let currentFieldIndent = -1;

  const closeTask = () => {
    if (currentTask) tasks.push(currentTask);
    currentTask = null;
    currentTaskIndent = -1;
    currentField = null;
    currentFieldIndent = -1;
  };

  for (const line of tasksContent.split(/\r?\n/u)) {
    const topLevel = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/u);
    if (topLevel) {
      closeTask();
      inTasks = topLevel[1] === "tasks";
      continue;
    }
    if (!inTasks) continue;
    const idMatch = line.match(/^(\s+)-\s*id:\s*(.+?)\s*$/u);
    if (idMatch && idMatch[1].length === 2) {
      closeTask();
      const fields = Object.create(null);
      fields.id = [idMatch[2].trim()];
      currentTask = {
        id: normalizeTaskScalar(idMatch[2]),
        fields,
      };
      currentTaskIndent = idMatch[1].length;
      continue;
    }
    if (!currentTask || /^\s*$/u.test(line) || line.trim().startsWith("#")) continue;
    const indent = (line.match(/^(\s*)/u) || ["", ""])[1].length;
    if (indent <= currentTaskIndent) {
      closeTask();
      continue;
    }
    const fieldMatch = line.match(/^(\s+)([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/u);
    if (fieldMatch && fieldMatch[1].length > currentTaskIndent) {
      currentField = fieldMatch[2];
      currentFieldIndent = fieldMatch[1].length;
      if (!Object.hasOwn(currentTask.fields, currentField)) {
        currentTask.fields[currentField] = [];
      }
      if (fieldMatch[3].trim()) currentTask.fields[currentField].push(fieldMatch[3].trim());
      continue;
    }
    if (currentField && indent > currentFieldIndent) {
      currentTask.fields[currentField].push(line.trim());
    }
  }
  closeTask();
  return tasks;
}

function hasMeaningfulTaskValue(value) {
  const normalized = normalizeTaskScalar(value).replace(/^-\s*/u, "").trim();
  if (!normalized || normalized === "[]" || normalized === "{}") return false;
  if (/^(?:none|null|n\/a)$/iu.test(normalized)) return false;
  return !normalized.includes("[") && !normalized.includes("]");
}

function markdownCells(line, expectedCount) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || trimmed.includes("\\|")) {
    return null;
  }
  const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length === expectedCount ? cells : null;
}

function requireMarkdownSections(content, headings) {
  const lines = visibleMarkdownContentLines(content);
  for (const heading of headings) {
    const marker = `## ${heading}`;
    const indexes = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index].trim() === marker) indexes.push(index);
    }
    if (indexes.length !== 1) throw new GovernanceValidationError(`${marker} must occur once`);
    let hasContent = false;
    for (let index = indexes[0] + 1; index < lines.length; index += 1) {
      if (/^ {0,3}##(?: |$)/u.test(lines[index])) break;
      if (lines[index].trim()) hasContent = true;
    }
    if (!hasContent) throw new GovernanceValidationError(`${marker} must be non-empty`);
  }
  return lines;
}

function validateRiskRegister(content) {
  const lines = visibleMarkdownContentLines(content);
  const header = "| ID | Risk | Impact | Mitigation | Status |";
  const indexes = lines.flatMap((line, index) => line.trim() === header ? [index] : []);
  if (indexes.length !== 1) throw new GovernanceValidationError("risk table header must occur once");
  const separator = markdownCells(lines[indexes[0] + 1] || "", 5);
  if (!separator || separator.some((cell) => cell !== "---")) {
    throw new GovernanceValidationError("risk table separator is invalid");
  }
  const ids = new Set();
  let rows = 0;
  for (let index = indexes[0] + 2; index < lines.length; index += 1) {
    if (!lines[index].trim()) break;
    const cells = markdownCells(lines[index], 5);
    if (!cells || cells.some((cell) => !cell)) {
      throw new GovernanceValidationError("risk rows must contain five non-empty cells");
    }
    if (!/^R-[A-Za-z0-9][A-Za-z0-9-]*$/u.test(cells[0]) || ids.has(cells[0])) {
      throw new GovernanceValidationError("risk IDs must be valid and unique");
    }
    if (!new Set(["open", "mitigated", "accepted", "closed"]).has(cells[4])) {
      throw new GovernanceValidationError("risk status is invalid");
    }
    ids.add(cells[0]);
    rows += 1;
  }
  if (rows === 0) throw new GovernanceValidationError("risk register must contain a risk row");
}

function validateReleasePlan(content) {
  requireMarkdownSections(content, [
    "Release intent",
    "Release steps",
    "Rollback conditions",
    "Blockers",
    "Manual steps",
  ]);
}

function assertMappingKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GovernanceValidationError(`${label} must be a mapping`);
  }
  const actual = Object.keys(value).sort(compareCodePointText);
  const expected = [...keys].sort(compareCodePointText);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new GovernanceValidationError(`${label} keys must be exact`);
  }
}

function assertNonEmptySchemaString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new GovernanceValidationError(`${label} must be non-empty`);
  }
}

function validateVerificationMatrix(content) {
  const document = parseCanonicalYaml(content);
  assertMappingKeys(document, ["impact_rules", "failure_modes"], "verification matrix");
  if (!Array.isArray(document.impact_rules) || !Array.isArray(document.failure_modes)) {
    throw new GovernanceValidationError("verification matrix values must be lists");
  }
  for (const [index, rule] of document.impact_rules.entries()) {
    assertMappingKeys(rule, ["when", "run"], `impact_rules[${index}]`);
    assertNonEmptySchemaString(rule.when, `impact_rules[${index}].when`);
    assertNonEmptySchemaString(rule.run, `impact_rules[${index}].run`);
  }
  if (document.failure_modes.length === 0) {
    throw new GovernanceValidationError("verification matrix needs a failure mode");
  }
  const ids = new Set();
  for (const [index, mode] of document.failure_modes.entries()) {
    assertMappingKeys(mode, ["id", "scenario", "expected", "guard"], `failure_modes[${index}]`);
    for (const key of ["id", "scenario", "expected", "guard"]) {
      assertNonEmptySchemaString(mode[key], `failure_modes[${index}].${key}`);
    }
    if (ids.has(mode.id)) throw new GovernanceValidationError("failure mode IDs must be unique");
    ids.add(mode.id);
  }
}

function validateSpec(content) {
  requireMarkdownSections(content, [
    "Interface contract",
    "Data contract",
    "Behavior contract",
    "Acceptance mapping",
  ]);
}

function validateParityMap(content) {
  const lines = requireMarkdownSections(content, [
    "Capture manifest",
    "Visual parity",
    "Interaction parity",
    "API parity",
    "Evidence",
  ]);
  const header = "| ID | Reference | Confidence |";
  const indexes = lines.flatMap((line, index) => line.trim() === header ? [index] : []);
  if (indexes.length !== 1) throw new GovernanceValidationError("parity evidence table must occur once");
  const separator = markdownCells(lines[indexes[0] + 1] || "", 3);
  if (!separator || separator.some((cell) => cell !== "---")) {
    throw new GovernanceValidationError("parity evidence separator is invalid");
  }
  const ids = new Set();
  let rows = 0;
  for (let index = indexes[0] + 2; index < lines.length; index += 1) {
    if (!lines[index].trim() || /^ {0,3}##(?: |$)/u.test(lines[index])) break;
    const cells = markdownCells(lines[index], 3);
    if (!cells || cells.some((cell) => !cell) || ids.has(cells[0])) {
      throw new GovernanceValidationError("parity evidence rows must be non-empty and unique");
    }
    if (!new Set(["observed", "inferred", "unknown"]).has(cells[2])) {
      throw new GovernanceValidationError("parity evidence confidence is invalid");
    }
    ids.add(cells[0]);
    rows += 1;
  }
  if (rows === 0) throw new GovernanceValidationError("parity evidence must not be empty");
}

function validateLaneEval(content) {
  const lines = content.split(/\r?\n/u);
  if (lines[0] !== "---") throw new GovernanceValidationError("eval frontmatter is missing");
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new GovernanceValidationError("eval frontmatter is unclosed");
  const document = parseCanonicalYaml(lines.slice(1, end).join("\n"));
  const requiredKeys = [
    "oracle_version",
    "framework_version",
    "trigger_source",
    "first_baseline_id",
    "risk_source",
    "failure_mode",
    "harm",
    "artifact_gate",
  ];
  const allowedKeys = new Set([...requiredKeys, "trajectory_signature"]);
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new GovernanceValidationError("eval frontmatter must be a mapping");
  }
  if (
    requiredKeys.some((key) => !Object.hasOwn(document, key))
    || Object.keys(document).some((key) => !allowedKeys.has(key))
  ) {
    throw new GovernanceValidationError("eval frontmatter keys must be exact");
  }
  if (document.oracle_version !== 1) {
    throw new GovernanceValidationError("eval oracle_version must be 1");
  }
  if (typeof document.framework_version !== "string" || !/^11\.\d+\.\d+$/u.test(document.framework_version)) {
    throw new GovernanceValidationError("eval framework_version must be a v11 semantic version");
  }
  if (!new Set(["manual", "promoted-from-verification-matrix"]).has(document.trigger_source)) {
    throw new GovernanceValidationError("eval trigger_source is invalid");
  }
  if (typeof document.first_baseline_id !== "string") {
    throw new GovernanceValidationError("eval first_baseline_id must be a string");
  }
  if (
    document.trigger_source === "promoted-from-verification-matrix"
    && !BASELINE_ID_PATTERN.test(document.first_baseline_id)
  ) {
    throw new GovernanceValidationError("promoted eval first_baseline_id must be canonical");
  }
  if (document.risk_source !== "delivery-governance") {
    throw new GovernanceValidationError("eval risk_source is invalid");
  }
  if (!new Set(["delivery-regression", "hidden-regression", "wrong-work", "false-completion"]).has(document.harm)) {
    throw new GovernanceValidationError("eval harm is invalid");
  }
  if (typeof document.failure_mode !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(document.failure_mode)) {
    throw new GovernanceValidationError("eval failure_mode is invalid");
  }
  assertNonEmptySchemaString(document.artifact_gate, "eval artifact_gate");
  if (Object.hasOwn(document, "trajectory_signature")) {
    assertNonEmptySchemaString(document.trajectory_signature, "eval trajectory_signature");
  }

  const body = lines.slice(end + 1).join("\n");
  const visible = visibleMarkdownContentLines(body);
  const headings = visible
    .map((line) => line.match(/^ {0,3}## (.+)$/u))
    .filter(Boolean)
    .map((match) => match[1]);
  const requiredHeadings = [
    "Input",
    "Expected decisions",
    "Forbidden actions",
    "Required artifact deltas",
    "Minimum evidence",
    "Framework change targets",
  ];
  if (JSON.stringify(headings) !== JSON.stringify(requiredHeadings)) {
    throw new GovernanceValidationError("eval headings must be exact and ordered");
  }
  requireMarkdownSections(body, requiredHeadings);
  const prefixes = new Map([
    ["Expected decisions", "DECISION:"],
    ["Forbidden actions", "FORBID:"],
    ["Required artifact deltas", "DELTA:"],
    ["Minimum evidence", "EVIDENCE:"],
    ["Framework change targets", "TARGET:"],
  ]);
  for (let index = 0; index < visible.length; index += 1) {
    const heading = visible[index].match(/^ {0,3}## (.+)$/u);
    if (!heading || !prefixes.has(heading[1])) continue;
    const prefix = prefixes.get(heading[1]);
    for (index += 1; index < visible.length && !/^ {0,3}##(?: |$)/u.test(visible[index]); index += 1) {
      if (visible[index].trim() && !visible[index].startsWith(`- ${prefix} `)) {
        throw new GovernanceValidationError(`eval ${heading[1]} items must use ${prefix}`);
      }
    }
    index -= 1;
  }
}

function inspectOptionalSchemaFile(
  targetDir,
  relativePath,
  validator,
  addLaneIssue,
  { required = false } = {},
) {
  const inspection = inspectTargetPathChain(targetDir, relativePath);
  if (inspection.kind === "missing") {
    if (required) addLaneIssue("error", "E003", `${relativePath} is required when its directory exists.`, relativePath);
    return;
  }
  if (inspection.kind === "link") {
    addLaneIssue("error", "E004", `${relativePath} is a symbolic link.`, relativePath);
    return;
  }
  if (inspection.kind !== "ok" || !fs.statSync(inspection.absolute).isFile()) {
    addLaneIssue("error", "E022", `${relativePath} exists but is not a file.`, relativePath);
    return;
  }
  try {
    const content = readTargetText(inspection.absolute, relativePath, {
      maxBytes: MAX_TARGET_TEXT_BYTES,
    });
    validator(content);
  } catch (error) {
    if (
      !(error instanceof TargetFormatError)
      && !(error instanceof GovernanceValidationError)
      && !(error instanceof CanonicalParseError)
    ) throw error;
    addLaneIssue("error", "E003", `${relativePath} has an invalid canonical schema.`, relativePath);
  }
}

function inspectOptionalSchemaDirectory(
  targetDir,
  laneRootPath,
  name,
  suffix,
  validator,
  addLaneIssue,
) {
  const relativePath = `${laneRootPath}/${name}`;
  const inspection = inspectTargetPathChain(targetDir, relativePath);
  if (inspection.kind === "missing") return;
  if (inspection.kind === "link") {
    addLaneIssue("error", "E004", `${relativePath} is a symbolic link.`, relativePath);
    return;
  }
  if (inspection.kind !== "ok" || !fs.statSync(inspection.absolute).isDirectory()) {
    addLaneIssue("error", "E022", `${relativePath} exists but is not a directory.`, relativePath);
    return;
  }
  let entries;
  try {
    entries = readDirectoryNamesBounded(inspection.absolute, 256, relativePath)
      .sort(compareCodePointText);
  } catch (error) {
    if (!(error instanceof TargetFormatError)) throw error;
    addLaneIssue("error", "E003", `${relativePath} exceeds the bounded entry limit.`, relativePath);
    return;
  }
  for (const entry of entries) {
    const entryPath = `${relativePath}/${entry}`;
    if (!entry.endsWith(suffix)) {
      addLaneIssue("error", "E003", `${entryPath} does not use the canonical suffix ${suffix}.`, entryPath);
      continue;
    }
    inspectOptionalSchemaFile(targetDir, entryPath, validator, addLaneIssue, { required: true });
  }
}

function inspectOnDemandArtifacts(targetDir, laneRootPath, addLaneIssue) {
  for (const [name, validator] of [
    ["risk-register.md", validateRiskRegister],
    ["release-plan.md", validateReleasePlan],
    ["verification-matrix.yaml", validateVerificationMatrix],
  ]) {
    inspectOptionalSchemaFile(
      targetDir,
      `${laneRootPath}/${name}`,
      validator,
      addLaneIssue,
    );
  }
  inspectOptionalSchemaDirectory(
    targetDir,
    laneRootPath,
    "specs",
    ".spec.md",
    validateSpec,
    addLaneIssue,
  );
  inspectOptionalSchemaDirectory(
    targetDir,
    laneRootPath,
    "evals",
    ".md",
    validateLaneEval,
    addLaneIssue,
  );
  const designPackPath = `${laneRootPath}/design-pack`;
  const designPack = inspectTargetPathChain(targetDir, designPackPath);
  if (designPack.kind === "missing") return;
  if (designPack.kind === "link") {
    addLaneIssue("error", "E004", `${designPackPath} is a symbolic link.`, designPackPath);
  } else if (designPack.kind !== "ok" || !fs.statSync(designPack.absolute).isDirectory()) {
    addLaneIssue("error", "E022", `${designPackPath} exists but is not a directory.`, designPackPath);
  } else {
    inspectOptionalSchemaFile(
      targetDir,
      `${designPackPath}/parity-map.md`,
      validateParityMap,
      addLaneIssue,
      { required: true },
    );
  }
}

function inspectLane(targetDir, lanesAbsolute, laneId, addTopIssue, managedLanePaths) {
  const laneIssues = [];
  const laneRootPath = `${LANES_ROOT}/${laneId}`;
  const addLaneIssue = (severity, code, message, relativePath = laneRootPath) => {
    const item = makeIssue(severity, code, message, relativePath, laneId);
    const existing = laneIssues.find((item) => (
      item.severity === severity
      && item.code === code
      && item.message === escapeUnsafeOutputValue(message)
      && item.path === relativePath
    ));
    if (existing) return existing;
    laneIssues.push(item);
    addTopIssue(item);
    return item;
  };

  const laneAbsolute = path.join(lanesAbsolute, laneId);
  const laneLstat = lstatIfPresent(laneAbsolute);
  if (laneLstat && laneLstat.isSymbolicLink()) {
    addLaneIssue("error", "E004", `Lane "${laneId}" is a symbolic link.`);
  } else if (!laneLstat || !fs.statSync(laneAbsolute).isDirectory()) {
    addLaneIssue("error", "E022", `Lane "${laneId}" is not a directory (wrong type).`);
  } else {
    const checked = new Map();
    const checkLaneEntry = (name, expectedType, { session = false } = {}) => {
      const relativePath = `${laneRootPath}/${name}`;
      const absolute = path.join(laneAbsolute, name);
      const stat = lstatIfPresent(absolute);
      if (stat === null) {
        if (session) {
          addLaneIssue(
            "info",
            "I020",
            `${relativePath} is absent; session-local state will be recreated on first session.`,
            relativePath,
          );
        } else {
          addLaneIssue(
            "error",
            "E020",
            `Missing core ${expectedType}: ${relativePath}.`,
            relativePath,
          );
        }
        checked.set(name, false);
        return false;
      }
      if (stat.isSymbolicLink()) {
        addLaneIssue(
          "error",
          "E004",
          `${relativePath} is a symbolic link.`,
          relativePath,
        );
        checked.set(name, false);
        return false;
      }
      const followed = fs.statSync(absolute);
      const valid = expectedType === "file" ? followed.isFile() : followed.isDirectory();
      if (!valid) {
        addLaneIssue(
          "error",
          "E022",
          `${relativePath} exists but is not a ${expectedType}.`,
          relativePath,
        );
        checked.set(name, false);
        return false;
      }
      checked.set(name, true);
      return true;
    };

    checkLaneEntry("lane.toml", "file");
    checkLaneEntry("MISSION.md", "file");
    checkLaneEntry("DESIGN.md", "file");
    checkLaneEntry("tasks.yaml", "file");
    checkLaneEntry("STATE.md", "file", { session: true });
    checkLaneEntry("baseline-log", "directory");

    if (checked.get("lane.toml")) {
      const relativePath = `${laneRootPath}/lane.toml`;
      try {
        const content = readTargetText(path.join(laneAbsolute, "lane.toml"), relativePath, {
          maxBytes: MAX_TOML_BYTES,
        });
        const laneMetadata = parseCanonicalToml(content, {
          requiredKeys: LANE_KEYS,
          allowedKeys: LANE_KEYS,
        });
        if (laneMetadata.id !== laneId) {
          addLaneIssue(
            "error",
            "E003",
            `${relativePath} id "${laneMetadata.id}" does not match lane directory "${laneId}".`,
            relativePath,
          );
        }
        for (const key of LANE_KEYS) {
          if (!laneMetadata[key]) {
            addLaneIssue(
              "error",
              "E003",
              `${relativePath} has an empty required field ${key}.`,
              relativePath,
            );
          }
        }
      } catch (error) {
        if (!(error instanceof CanonicalParseError) && !(error instanceof TargetFormatError)) {
          throw error;
        }
        addLaneIssue(
          "error",
          "E003",
          `${relativePath} is not canonical: ${error.message}`,
          relativePath,
        );
      }
    }

    if (checked.get("baseline-log")) {
      const baselineAbsolute = path.join(laneAbsolute, "baseline-log");
      let entries = null;
      try {
        entries = readDirectoryNamesBounded(
          baselineAbsolute,
          MAX_BASELINE_ENTRIES,
          `${laneRootPath}/baseline-log`,
        ).sort(compareCodePointText);
      } catch (error) {
        if (!(error instanceof TargetFormatError)) throw error;
        addLaneIssue(
          "error",
          "E003",
          `${laneRootPath}/baseline-log exceeds the bounded entry limit.`,
          `${laneRootPath}/baseline-log`,
        );
      }
      if (entries !== null) {
        const markdownEntries = entries.filter((entry) => entry.endsWith(".md"));
        if (markdownEntries.length === 0) {
          addLaneIssue(
            "warning",
            "W030",
            `${laneRootPath}/baseline-log is empty; expected at least one baseline record.`,
            `${laneRootPath}/baseline-log`,
          );
        }
        for (const entry of markdownEntries) {
          const relativePath = `${laneRootPath}/baseline-log/${entry}`;
          const absolute = path.join(baselineAbsolute, entry);
          const stat = lstatIfPresent(absolute);
          if (stat && stat.isSymbolicLink()) {
            addLaneIssue("error", "E004", `${relativePath} is a symbolic link.`, relativePath);
          } else if (!stat || !fs.statSync(absolute).isFile()) {
            addLaneIssue("error", "E022", `${relativePath} is not a file.`, relativePath);
          }
          if (!BASELINE_RECORD_PATTERN.test(entry)) {
            addLaneIssue(
              "warning",
              "W031",
              `${relativePath} does not follow the canonical CR/BL record naming convention.`,
              relativePath,
            );
          }
        }

        for (const relativePath of managedLanePaths) {
          if (!relativePath.startsWith(`${laneRootPath}/baseline-log/`)) continue;
          const managedInspection = inspectTargetPathChain(targetDir, relativePath);
          if (managedInspection.kind === "missing") {
            addLaneIssue(
              "error",
              "E020",
              `Managed installer baseline is missing: ${relativePath}.`,
              relativePath,
            );
          }
        }
      }
    }

    if (checked.get("MISSION.md")) {
      const relativePath = `${laneRootPath}/MISSION.md`;
      let content = null;
      try {
        content = readTargetText(path.join(laneAbsolute, "MISSION.md"), relativePath, {
          maxBytes: MAX_TARGET_TEXT_BYTES,
        });
      } catch (error) {
        if (!(error instanceof TargetFormatError)) throw error;
        addLaneIssue("error", "E003", `${relativePath} is invalid: ${error.message}`, relativePath);
      }
      if (content !== null) {
        const baselineId = parseMissionBaselineId(content);
        if (baselineId) {
          if (
            baselineId.length > MAX_BASELINE_ID_LENGTH
            || !BASELINE_ID_PATTERN.test(baselineId)
          ) {
            addLaneIssue(
              "warning",
              "W070",
              "lane MISSION.md has a non-canonical 当前基线 ID; expected a canonical BL/CR identifier.",
              relativePath,
            );
          } else {
            const expected = path.join(laneAbsolute, "baseline-log", `${baselineId}.md`);
            if (lstatIfPresent(expected) === null) {
              addLaneIssue(
                "warning",
                "W070",
                `lane MISSION.md references 当前基线 ID "${baselineId}" but ${laneRootPath}/baseline-log/${baselineId}.md does not exist.`,
                relativePath,
              );
            }
          }
        }
      }
    }

    if (checked.get("tasks.yaml")) {
      const relativePath = `${laneRootPath}/tasks.yaml`;
      let content = null;
      try {
        content = readTargetText(path.join(laneAbsolute, "tasks.yaml"), relativePath, {
          maxBytes: MAX_TARGET_TEXT_BYTES,
        });
      } catch (error) {
        if (!(error instanceof TargetFormatError)) throw error;
        addLaneIssue("error", "E003", `${relativePath} is invalid: ${error.message}`, relativePath);
      }
      if (content !== null) {
        const tasksWithoutOwner = collectTopLevelTasks(content)
          .filter((task) => !(task.fields.owner || []).some(hasMeaningfulTaskValue))
          .map((task) => task.id);
        if (tasksWithoutOwner.length > 0) {
          addLaneIssue(
            "warning",
            "W071",
            `tasks.yaml has ${tasksWithoutOwner.length} task(s) without an owner field: ${tasksWithoutOwner.join(", ")}`,
            relativePath,
          );
        }
      }
    }

    inspectOnDemandArtifacts(targetDir, laneRootPath, addLaneIssue);
  }

  laneIssues.sort(compareIssues);
  return {
    layout_ok: !laneIssues.some((item) => item.severity === "error"),
    delivery_ready: false,
    issues: laneIssues,
  };
}

function parseMissionBaselineId(content) {
  for (const line of String(content || "").split(/\r?\n/u)) {
    const match = line.match(/当前基线 ID[^:：]*[:：]\s*(.+)\s*$/u);
    if (!match) continue;
    const value = match[1].trim();
    if (value && !value.includes("{{")) return value;
  }
  return null;
}

function visibleMarkdownContentLines(content) {
  const result = [];
  const commentState = { inComment: false };
  let fence = null;
  for (const rawLine of logicalLines(content)) {
    if (fence) {
      const closer = rawLine.match(/^ {0,3}([`~]+)[ \t]*$/u);
      if (
        closer
        && closer[1][0] === fence.character
        && closer[1].length >= fence.length
        && [...closer[1]].every((character) => character === fence.character)
      ) fence = null;
      continue;
    }
    const line = stripHtmlComments(rawLine, commentState);
    if (commentState.inComment && !line) continue;
    const opener = line.match(/^ {0,3}((`{3,})|(~{3,}))(.*)$/u);
    if (opener) {
      const run = opener[1];
      if (run[0] !== "`" || !opener[4].includes("`")) {
        fence = { character: run[0], length: run.length };
        continue;
      }
    }
    result.push(line);
  }
  return result;
}

function extractReadableMirror(content, label) {
  const prefixes = {
    "当前质量档位": "- **当前质量档位（quality_tier，lane.toml 镜像）**：",
    "当前风险档位": "- **当前风险档位（risk_tier，lane.toml 镜像）**：",
    "当前治理档位": "- **当前治理档位（governance_tier，lane.toml 镜像）**：",
    "当前基线 ID": "- **当前基线 ID（lane.toml.baseline_id 镜像）**：",
  };
  const prefix = prefixes[label];
  if (!prefix) return null;
  const matches = visibleMarkdownContentLines(content)
    .filter((line) => line.startsWith(prefix))
    .map((line) => line.slice(prefix.length).trim());
  return matches.length === 1 && matches[0] ? matches[0] : null;
}

function readLaneReadinessText(laneAbsolute, name) {
  const absolute = path.join(laneAbsolute, name);
  const stat = lstatIfPresent(absolute);
  if (!stat || stat.isSymbolicLink() || !fs.statSync(absolute).isFile()) return null;
  try {
    return readTargetText(absolute, name, { maxBytes: MAX_TARGET_TEXT_BYTES });
  } catch (error) {
    if (!(error instanceof TargetFormatError)) throw error;
    return null;
  }
}

function inspectBaselineReadiness(laneAbsolute, currentId) {
  const baselineAbsolute = path.join(laneAbsolute, "baseline-log");
  const result = {
    confirmedAt: null,
    currentBootstrap: false,
    ready: false,
  };
  try {
    const stat = lstatIfPresent(baselineAbsolute);
    if (!stat || stat.isSymbolicLink() || !fs.statSync(baselineAbsolute).isDirectory()) {
      return result;
    }
    const entries = readDirectoryNamesBounded(
      baselineAbsolute,
      MAX_BASELINE_ENTRIES,
      "baseline-log",
    ).filter((entry) => entry.endsWith(".md")).sort(compareCodePointText);
    const records = new Map();
    for (const entry of entries) {
      const absolute = path.join(baselineAbsolute, entry);
      const entryStat = lstatIfPresent(absolute);
      if (!entryStat || entryStat.isSymbolicLink() || !fs.statSync(absolute).isFile()) {
        return result;
      }
      const content = readTargetText(absolute, entry, { maxBytes: MAX_TARGET_TEXT_BYTES });
      const record = parseBaselineRecord(content, entry);
      if (records.has(record.id)) return result;
      records.set(record.id, record);
    }
    const current = records.get(currentId);
    if (!current) return result;
    if (current.type === "bootstrap" && current.status === "unconfirmed") {
      result.currentBootstrap = true;
      return result;
    }
    if (current.type !== "baseline" || current.status !== "confirmed") return result;
    const lineage = new Set();
    let cursor = current;
    for (;;) {
      if (lineage.has(cursor.id)) return result;
      lineage.add(cursor.id);
      const previous = records.get(cursor.previous_baseline_id);
      if (!previous) return result;
      if (previous.type === "bootstrap" && previous.status === "unconfirmed") {
        lineage.add(previous.id);
        break;
      }
      if (previous.type !== "baseline" || previous.status !== "confirmed") return result;
      cursor = previous;
    }
    for (const record of records.values()) {
      if (
        record.type === "change"
        && record.status === "applied"
        && !lineage.has(record.result_baseline_id)
      ) return result;
      if (record.type === "retrospective") {
        for (const sourceId of record.source_cr_ids) {
          const source = records.get(sourceId);
          if (!source || source.type !== "change" || !["applied", "rejected"].includes(source.status)) {
            return result;
          }
        }
      }
    }
    result.confirmedAt = current.confirmed_at;
    result.ready = true;
    return result;
  } catch (error) {
    if (
      !(error instanceof TargetFormatError)
      && !(error instanceof GovernanceValidationError)
      && !(error instanceof CanonicalParseError)
    ) throw error;
    return result;
  }
}

function tierReadiness(metadata, mission) {
  const ranks = {
    quality_tier: { exploratory: 0, standard: 1, strict: 2 },
    risk_tier: { low: 0, medium: 1, high: 2 },
    governance_tier: { G0: 0, G1: 1, G2: 2 },
  };
  const labels = {
    quality_tier: "当前质量档位",
    risk_tier: "当前风险档位",
    governance_tier: "当前治理档位",
  };
  for (const key of Object.keys(ranks)) {
    if (!Object.hasOwn(ranks[key], metadata[key])) return false;
    if (extractReadableMirror(mission, labels[key]) !== metadata[key]) return false;
  }
  return ranks.governance_tier[metadata.governance_tier]
    >= Math.max(ranks.quality_tier[metadata.quality_tier], ranks.risk_tier[metadata.risk_tier]);
}

function isTerminalTask(task) {
  return task.status === "done" || task.status === "shipped";
}

function taskCompletionReady(tasks) {
  if (tasks.tasks.length === 0 || tasks.tasks.some((task) => !isTerminalTask(task))) return false;
  const byId = new Map(tasks.tasks.map((task) => [task.id, task]));
  for (const task of tasks.tasks) {
    if (
      task.acceptance_refs.length === 0
      || task.evidence_required.length === 0
      || task.change_scope.length === 0
      || task.depends_on.some((dependency) => !isTerminalTask(byId.get(dependency)))
      || Object.values(task.delivery_state).some(
        (value) => !["observed", "not-applicable"].includes(value),
      )
    ) return false;
    const required = [...task.evidence_required].sort(compareCodePointText);
    const produced = task.evidence_produced.map((item) => item.id).sort(compareCodePointText);
    if (JSON.stringify(required) !== JSON.stringify(produced)) return false;
  }
  return true;
}

function approvalReadiness(tasks, governanceTier, baselineId, confirmedAt, fixedNowMs) {
  const confirmedMs = Date.parse(confirmedAt);
  for (const task of tasks.tasks) {
    const approval = task.approval;
    if (approval.baseline_id !== baselineId) return false;
    const mustApprove = approval.required || governanceTier === "G2";
    if (mustApprove && approval.status !== "approved") return false;
    if (["approved", "rejected", "expired"].includes(approval.status)) {
      const decidedMs = Date.parse(approval.decided_at);
      if (decidedMs < confirmedMs || decidedMs > fixedNowMs) return false;
    }
  }
  return true;
}

function pureEvidenceReadiness(tasks, baselineId, confirmedAt, fixedNowMs) {
  if (tasks.baseline_id !== baselineId) return { ready: false, shas: [] };
  const confirmedMs = Date.parse(confirmedAt);
  const shas = [];
  for (const task of tasks.tasks) {
    for (const evidence of task.evidence_produced) {
      const observedMs = Date.parse(evidence.observed_at);
      if (
        evidence.exit_code !== 0
        || evidence.confidence !== "observed"
        || !isFullObjectId(evidence.git_sha)
        || observedMs < confirmedMs
        || observedMs > fixedNowMs
      ) return { ready: false, shas: [] };
      if (task.approval.required && Date.parse(task.approval.decided_at) > observedMs) {
        return { ready: false, shas: [] };
      }
      shas.push(evidence.git_sha);
    }
  }
  return { ready: true, shas };
}

function requiredArtifactsReady(laneAbsolute, governanceTier, scopeMode) {
  const required = [];
  if (governanceTier === "G2") {
    required.push("risk-register.md", "verification-matrix.yaml");
  }
  if (scopeMode === "release") required.push("release-plan.md");
  for (const name of required) {
    const absolute = path.join(laneAbsolute, name);
    const stat = lstatIfPresent(absolute);
    if (!stat || stat.isSymbolicLink() || !fs.statSync(absolute).isFile() || stat.size === 0) {
      return false;
    }
  }
  return true;
}

function evidenceEnvelopeReady(envelope, currentTasks, laneId) {
  if (!envelope || envelope.state !== "available") return false;
  const laneRoot = `${envelope.repository.project_prefix}.ai-os/lanes/`;
  const currentProjection = JSON.stringify(projectTasksForEvidence(currentTasks));
  for (const observation of envelope.observations) {
    if (!observation.ancestor) return false;
    const impactPaths = observation.changed_paths.filter((changedPath) => {
      if (!changedPath.startsWith(laneRoot)) return true;
      const remainder = changedPath.slice(laneRoot.length);
      const separator = remainder.indexOf("/");
      return separator === -1 || remainder.slice(0, separator) === laneId;
    });
    if (impactPaths.some((changedPath) => changedPath !== envelope.tasks_path)) return false;
    if (JSON.stringify(projectTasksForEvidence(observation.historical_tasks)) !== currentProjection) {
      return false;
    }
  }
  return true;
}

function addLaneReadinessIssue(issues, laneReport, laneId, code, message, issuePath) {
  const existing = laneReport.issues.find((item) => item.code === code);
  if (existing) return existing;
  const item = makeIssue("info", code, message, issuePath, laneId);
  laneReport.issues.push(item);
  issues.push(item);
  return item;
}

function addStateDriftWarning(issues, laneReport, laneId, issuePath) {
  if (laneReport.issues.some((item) => item.code === "W072")) return;
  const item = makeIssue(
    "warning",
    "W072",
    "STATE.md mirrors are stale; rebuild session state from committed lane truth.",
    issuePath,
    laneId,
  );
  laneReport.issues.push(item);
  issues.push(item);
}

function evaluateLaneReadiness(
  targetDir,
  laneId,
  laneReport,
  issues,
  { fixedNowMs, runGit, gitCache },
) {
  const laneRootPath = `${LANES_ROOT}/${laneId}`;
  const laneAbsolute = targetPath(targetDir, laneRootPath);
  const readinessPath = `${laneRootPath}/lane.toml`;
  const add = (code, message, relativePath = readinessPath) => (
    addLaneReadinessIssue(issues, laneReport, laneId, code, message, relativePath)
  );
  let metadata;
  try {
    const text = readLaneReadinessText(laneAbsolute, "lane.toml");
    if (text === null) throw new TargetFormatError("lane metadata unavailable");
    metadata = parseCanonicalToml(text, { requiredKeys: LANE_KEYS, allowedKeys: LANE_KEYS });
  } catch (error) {
    if (!(error instanceof TargetFormatError) && !(error instanceof CanonicalParseError)) throw error;
    add("R002", "Lane status and tier metadata are not ready.");
    laneReport.delivery_ready = false;
    return { active: true, ready: false };
  }
  const closed = metadata.status === "closed";
  const active = !closed;
  if (!new Set(["active", "closed"]).has(metadata.status)) {
    add("R002", "Lane status must be active or closed.");
  }

  const mission = readLaneReadinessText(laneAbsolute, "MISSION.md");
  const state = readLaneReadinessText(laneAbsolute, "STATE.md");
  if (mission === null || extractReadableMirror(mission, "当前基线 ID") !== metadata.baseline_id) {
    add("R010", "MISSION baseline mirror must equal lane.toml baseline_id.", `${laneRootPath}/MISSION.md`);
  }
  if (state !== null) {
    const stateMirrors = [
      ["当前质量档位", metadata.quality_tier],
      ["当前风险档位", metadata.risk_tier],
      ["当前治理档位", metadata.governance_tier],
      ["当前基线 ID", metadata.baseline_id],
    ];
    if (stateMirrors.some(([label, value]) => extractReadableMirror(state, label) !== value)) {
      addStateDriftWarning(issues, laneReport, laneId, `${laneRootPath}/STATE.md`);
    }
  }

  const baseline = inspectBaselineReadiness(laneAbsolute, metadata.baseline_id);
  if (baseline.currentBootstrap) {
    add("R001", "Current baseline is the unconfirmed bootstrap record.", `${laneRootPath}/baseline-log/${metadata.baseline_id}.md`);
  } else if (!baseline.ready) {
    add("R010", "Current baseline lifecycle or history is not ready.", `${laneRootPath}/baseline-log`);
  }

  let tasks = null;
  try {
    const designText = readLaneReadinessText(laneAbsolute, "DESIGN.md");
    const tasksText = readLaneReadinessText(laneAbsolute, "tasks.yaml");
    if (designText === null || tasksText === null) throw new GovernanceValidationError("task inputs unavailable");
    const acceptanceIds = extractDesignAcceptanceIds(designText);
    tasks = validateTasksV5(parseCanonicalYaml(tasksText), { acceptanceIds });
    if (tasks.baseline_id !== metadata.baseline_id) {
      add("R010", "tasks.yaml baseline_id must equal lane.toml baseline_id.", `${laneRootPath}/tasks.yaml`);
    }
  } catch (error) {
    if (!(error instanceof GovernanceValidationError) && !(error instanceof CanonicalParseError)) {
      throw error;
    }
    add("R020", "Task schema, dependencies, or DESIGN acceptance coverage is not ready.", `${laneRootPath}/tasks.yaml`);
  }

  if (closed) {
    laneReport.delivery_ready = false;
    laneReport.issues.sort(compareIssues);
    return { active: false, ready: false };
  }
  if (mission === null || !tierReadiness(metadata, mission)) {
    add("R002", "Lane tiers are unassessed, inconsistent, or below the required governance floor.");
  }
  if (tasks === null) {
    laneReport.delivery_ready = false;
    laneReport.issues.sort(compareIssues);
    return { active, ready: false };
  }
  if (!taskCompletionReady(tasks)) {
    add("R020", "Every active task must be terminal with complete AC, dependency, evidence, and delivery state.", `${laneRootPath}/tasks.yaml`);
    laneReport.delivery_ready = false;
    laneReport.issues.sort(compareIssues);
    return { active, ready: false };
  }
  if (!baseline.ready) {
    laneReport.delivery_ready = false;
    laneReport.issues.sort(compareIssues);
    return { active, ready: false };
  }
  if (!approvalReadiness(
    tasks,
    metadata.governance_tier,
    metadata.baseline_id,
    baseline.confirmedAt,
    fixedNowMs,
  )) add("R030", "Task approval declarations are not ready for the active baseline.", `${laneRootPath}/tasks.yaml`);

  const evidence = pureEvidenceReadiness(
    tasks,
    metadata.baseline_id,
    baseline.confirmedAt,
    fixedNowMs,
  );
  if (!evidence.ready) {
    add("R021", "Task evidence is incomplete, stale, inferred, or invalid.", `${laneRootPath}/tasks.yaml`);
  }
  if (!requiredArtifactsReady(laneAbsolute, metadata.governance_tier, tasks.scope.mode)) {
    add("R031", "Required governance artifacts are missing, empty, or not regular files.", laneRootPath);
  }

  if (evidence.ready && !laneReport.issues.some((item) => ["R030", "R031"].includes(item.code))) {
    if (!gitCache.resolved) {
      gitCache.value = resolveGitState(targetDir, { runGit });
      gitCache.resolved = true;
    }
    if (gitCache.value.state !== "available" || gitCache.value.repository.dirty) {
      add("R022", "Local Git state is unavailable, dirty, or outside its resource budget.", `${laneRootPath}/tasks.yaml`);
    } else {
      const envelope = resolveEvidenceGitEnvelope(targetDir, laneId, evidence.shas, {
        gitState: gitCache.value,
        runGit,
      });
      if (envelope.state !== "available") {
        const gitReasons = new Set([
          "git-unavailable", "command-failed", "command-timeout", "total-timeout",
          "output-limit", "dirty-work-tree", "invalid-git-output",
        ]);
        add(
          gitReasons.has(envelope.reason) ? "R022" : "R021",
          gitReasons.has(envelope.reason)
            ? "Local Git evidence inspection was unavailable or exceeded its resource budget."
            : "Historical evidence binding is invalid.",
          `${laneRootPath}/tasks.yaml`,
        );
      } else if (!evidenceEnvelopeReady(envelope, tasks, laneId)) {
        add("R021", "Evidence commit ancestry, impact scope, or historical task semantics are invalid.", `${laneRootPath}/tasks.yaml`);
      }
    }
  }

  const ready = laneReport.layout_ok
    && !laneReport.issues.some((item) => item.code.startsWith("R"));
  laneReport.delivery_ready = ready;
  laneReport.issues.sort(compareIssues);
  return { active, ready };
}

function evaluateReadiness(targetDir, lanes, issues, options) {
  const gitCache = { resolved: false, value: null };
  const states = [];
  for (const laneId of Object.keys(lanes).sort(compareCodePointText)) {
    states.push(evaluateLaneReadiness(
      targetDir,
      laneId,
      lanes[laneId],
      issues,
      { ...options, gitCache },
    ));
  }
  const active = states.filter((state) => state.active);
  if (active.length === 0) {
    issues.push(makeIssue(
      "info",
      "R020",
      "No active lane exists; delivery readiness cannot be vacuously true.",
      null,
      null,
    ));
    return false;
  }
  return active.every((state) => state.ready);
}

function inspectLanes(targetDir, addGlobalIssue, addTopIssue, manifestRows) {
  const lanes = {};
  const lanesAbsolute = targetPath(targetDir, LANES_ROOT);
  const stat = lstatIfPresent(lanesAbsolute);
  if (stat === null) {
    addGlobalIssue("error", "E050", ".ai-os/lanes is missing or not a directory.");
    addGlobalIssue("error", "E051", "Missing required default lane at .ai-os/lanes/default.");
    return lanes;
  }
  if (stat.isSymbolicLink()) {
    addGlobalIssue("error", "E004", ".ai-os/lanes is a symbolic link.");
    addGlobalIssue("error", "E051", "Missing required default lane at .ai-os/lanes/default.");
    return lanes;
  }
  if (!fs.statSync(lanesAbsolute).isDirectory()) {
    addGlobalIssue("error", "E050", ".ai-os/lanes exists but is not a directory (wrong type).");
    addGlobalIssue("error", "E051", "Missing required default lane at .ai-os/lanes/default.");
    return lanes;
  }

  let laneIds;
  try {
    laneIds = readDirectoryNamesBounded(
      lanesAbsolute,
      MAX_LANE_ENTRIES,
      ".ai-os/lanes",
    ).sort(compareCodePointText);
  } catch (error) {
    if (!(error instanceof TargetFormatError)) throw error;
    addGlobalIssue("error", "E003", ".ai-os/lanes exceeds the bounded lane entry limit.");
    return lanes;
  }
  const managedLanePaths = new Set(manifestRows
    .map((row) => row.path)
    .filter((relativePath) => relativePath.startsWith(`${LANES_ROOT}/`)));
  if (!laneIds.includes(DEFAULT_LANE_ID)) {
    addGlobalIssue("error", "E051", "Missing required default lane at .ai-os/lanes/default.");
  }
  for (const laneId of laneIds) {
    const laneReport = inspectLane(
      targetDir,
      lanesAbsolute,
      laneId,
      addTopIssue,
      managedLanePaths,
    );
    Object.defineProperty(lanes, laneId, {
      configurable: true,
      enumerable: true,
      value: laneReport,
      writable: true,
    });
  }
  return lanes;
}

function inspectProject(
  targetDir,
  {
    strict = false,
    now = () => new Date(),
    runGit = createLocalGitRunner(),
  } = {},
) {
  const resolvedTarget = path.resolve(targetDir || ".");
  const stateRoot = targetPath(resolvedTarget, PROJECT_STATE_ROOT);
  const initialStateStat = lstatIfPresent(stateRoot);
  if (initialStateStat === null) {
    // Keep access failures observable instead of treating them as absence.
    fileExists(stateRoot);
    return {
      ok: false,
      reason: "not-an-ai-os-project",
      targetDir: resolvedTarget,
    };
  }
  // Preserve the historical access probe for permissions diagnostics. A
  // broken link can return false here, but its lstat identity still makes it
  // an unsafe AI-OS root rather than the not-project union.
  fileExists(stateRoot);

  const version = readFrameworkVersion();
  const issues = [];
  const addTopIssue = (item) => {
    issues.push(item);
    return item;
  };
  const addGlobalIssue = (severity, code, message) => (
    addTopIssue(makeIssue(severity, code, message, null, null))
  );

  const stateStat = initialStateStat;
  let stateRootUsable = true;
  if (stateStat && stateStat.isSymbolicLink()) {
    addGlobalIssue("error", "E004", ".ai-os project state root is a symbolic link.");
    stateRootUsable = false;
  } else if (!stateStat || !fs.statSync(stateRoot).isDirectory()) {
    addGlobalIssue("error", "E022", ".ai-os project state root is not a directory.");
    stateRootUsable = false;
  }

  let metadataResult = {
    metadata: null,
    trusted: false,
    installedVersion: null,
    layoutVersion: null,
    layoutMode: null,
  };
  let lanes = {};
  if (stateRootUsable) {
    metadataResult = inspectMetadata(resolvedTarget, addGlobalIssue);
    const manifestResult = inspectManifest(resolvedTarget, addGlobalIssue);
    const manifestPaths = new Set(manifestResult.rows.map((row) => row.path));
    if (!manifestResult.metadataTrusted) {
      metadataResult.trusted = false;
      metadataResult.installedVersion = null;
      metadataResult.layoutVersion = null;
      metadataResult.layoutMode = null;
    }

    inspectConstitution(resolvedTarget, addGlobalIssue);
    inspectGlobalRegularFile(resolvedTarget, ".ai-os/MISSION.md", addGlobalIssue);
    inspectGlobalRegularFile(resolvedTarget, ".ai-os/memory.md", addGlobalIssue);
    for (const optionalProjectPath of [".gitattributes", "CLAUDE.md", "GEMINI.md"]) {
      if (manifestPaths.has(optionalProjectPath)) {
        inspectGlobalRegularFile(resolvedTarget, optionalProjectPath, addGlobalIssue);
      }
    }
    lanes = inspectLanes(
      resolvedTarget,
      addGlobalIssue,
      addTopIssue,
      manifestResult.rows,
    );
    inspectGitignore(resolvedTarget, addGlobalIssue, {
      managed: manifestPaths.has(".gitignore"),
    });
  }

  let deliveryReady = false;
  if (stateRootUsable) {
    const fixedNow = now();
    if (!(fixedNow instanceof Date) || !Number.isFinite(fixedNow.getTime())) {
      throw new TypeError("doctor now() must return a valid Date");
    }
    deliveryReady = evaluateReadiness(resolvedTarget, lanes, issues, {
      fixedNowMs: fixedNow.getTime(),
      runGit,
    });
  }
  issues.sort(compareIssues);
  const semanticWarnings = issues.filter((item) => SEMANTIC_WARNING_CODES.has(item.code));
  const layoutOk = !issues.some((item) => item.severity === "error");
  const ok = strict
    ? layoutOk && deliveryReady && !issues.some((item) => item.severity === "warning")
    : layoutOk;

  return {
    ok,
    version,
    package: `create-ai-os@${version}`,
    targetDir: resolvedTarget,
    installedVersion: metadataResult.installedVersion,
    layout_version: metadataResult.layoutVersion,
    layout_mode: metadataResult.layoutMode,
    issues,
    semantic_warnings: semanticWarnings,
    layout_ok: layoutOk,
    delivery_ready: deliveryReady,
    lanes,
  };
}

function formatIssues(issues) {
  if (issues.length === 0) return "No layout issues found.\n";
  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;
  const infos = issues.filter((item) => item.severity === "info").length;
  const lines = [
    `Found ${errors} error(s), ${warnings} warning(s), ${infos} info:`,
    "",
  ];
  for (const item of issues) {
    const label = item.severity === "error"
      ? "ERROR"
      : item.severity === "warning"
        ? "WARN "
        : "INFO ";
    lines.push(`  ${label} [${item.code}] ${item.message}`);
  }
  return `${lines.join("\n")}\n`;
}

function formatTextReport(report) {
  const installed = report.installedVersion === null
    ? "unknown"
    : `v${report.installedVersion}`;
  const layout = report.layout_mode === null ? "unknown" : report.layout_mode;
  return [
    `AI-OS doctor for ${escapeUnsafeOutputValue(report.targetDir)}`,
    `Framework: ${escapeUnsafeOutputValue(report.package)}`,
    `Installed: ${escapeUnsafeOutputValue(installed)}`,
    `Layout: ${escapeUnsafeOutputValue(layout)}`,
    `Layout checks: ${report.layout_ok ? "PASS" : "FAIL"}`,
    `Delivery ready: ${report.delivery_ready ? "YES" : "NO"}`,
    "",
    formatIssues(report.issues).trimEnd(),
    "",
  ].join("\n");
}

function runDoctor(opts, io) {
  if (opts.help) {
    printHelp(io);
    return 0;
  }
  const report = inspectProject(opts.target || ".", { strict: opts.strict });
  if (report.reason === "not-an-ai-os-project") {
    if (opts.json) {
      io.stdout.write(serializeJson(report));
    } else {
      io.stderr.write(
        `Not an AI-OS project: ${escapeUnsafeOutputValue(report.targetDir)} has no .ai-os/ directory.\n`,
      );
      io.stderr.write(`Install the pinned public release with: ${PINNED_PUBLIC_INSTALL}\n`);
    }
    return 2;
  }

  const output = opts.json
    ? serializeJson(report)
    : formatTextReport(report);
  io.stdout.write(output);
  return report.ok ? 0 : 1;
}

function main(argv = process.argv.slice(2), io = process) {
  try {
    return runDoctor(parseArgs(argv), io);
  } catch (error) {
    const message = String(error && error.message ? error.message : error)
      .replace(/[\r\n]+/gu, " ")
      .trim();
    io.stderr.write(`Error: ${escapeUnsafeOutputValue(message)}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main();

module.exports = {
  createLocalGitRunner,
  inspectProject,
  main,
  resolveEvidenceGitEnvelope,
  resolveGitState,
};
