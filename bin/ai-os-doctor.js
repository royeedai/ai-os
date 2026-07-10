#!/usr/bin/env node

/**
 * AI-OS doctor
 *
 * Checks the installed layout without consulting package-source bytes for
 * target truth. Delivery-readiness evaluation is added by the next phase; in
 * this phase it intentionally remains false for every active lane.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { TextDecoder } = require("node:util");

const {
  CanonicalParseError,
  FILE_SPECS,
  LAYOUT_MODE,
  LAYOUT_VERSION,
  OWNERSHIP,
  parseCanonicalToml,
  parseManagedFiles,
} = require("./doctor-shared");

const PROJECT_STATE_ROOT = ".ai-os";
const LANES_ROOT = ".ai-os/lanes";
const DEFAULT_LANE_ID = "default";
const METADATA_PATH = ".ai-os/framework.toml";
const MANIFEST_PATH = ".ai-os/managed-files.tsv";
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
const SEMANTIC_WARNING_CODES = new Set(["W070", "W071"]);
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
  I020: "info",
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
  const sessionState = ".ai-os/lanes/*/STATE.md";
  if (!content.includes(sessionState)) {
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
    if (idMatch) {
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

function inspectProject(targetDir, { strict = false } = {}) {
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

  issues.sort(compareIssues);
  const semanticWarnings = issues.filter((item) => SEMANTIC_WARNING_CODES.has(item.code));
  const layoutOk = !issues.some((item) => item.severity === "error");
  const deliveryReady = false;
  const ok = layoutOk && (!strict || deliveryReady);

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

module.exports = { main, inspectProject };
