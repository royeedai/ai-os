"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const LAYOUT_VERSION = "11";
const LAYOUT_MODE = "shared-root-default-lane";
const MAX_CANONICAL_YAML_NESTING_DEPTH = 64;
const OWNERSHIP = Object.freeze({
  FRAMEWORK: "framework",
  PROJECT: "project",
  SESSION: "session",
});

class CanonicalParseError extends Error {
  constructor(line, reason) {
    super(`canonical parse error at line ${line}: ${reason}`);
    this.name = "CanonicalParseError";
    this.code = "ERR_CANONICAL_PARSE";
    this.line = line;
    this.reason = reason;
  }
}

class GovernanceValidationError extends Error {
  constructor(reason) {
    super(`governance validation failed: ${reason}`);
    this.name = "GovernanceValidationError";
    this.code = "ERR_GOVERNANCE_VALIDATION";
    this.reason = reason;
  }
}

function splitCanonicalLines(content) {
  if (typeof content !== "string") {
    throw new CanonicalParseError(0, "content must be a string");
  }
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    if (/[\r\u0085\u2028\u2029]/u.test(lines[index])) {
      throw new CanonicalParseError(index + 1, "unsupported line break");
    }
  }
  return lines;
}

function rejectControlCharacters(line, lineNumber) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(line)) {
    throw new CanonicalParseError(lineNumber, "unsupported control character");
  }
}

function trimAsciiSpaces(value) {
  let start = 0;
  while (start < value.length && value.charCodeAt(start) === 0x20) start += 1;
  let end = value.length;
  while (end > start && value.charCodeAt(end - 1) === 0x20) end -= 1;
  return value.slice(start, end);
}

function trimTrailingAsciiSpaces(value) {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 0x20) end -= 1;
  return value.slice(0, end);
}

function countLeadingAsciiSpaces(value) {
  let length = 0;
  while (length < value.length && value.charCodeAt(length) === 0x20) length += 1;
  return length;
}

function parseCanonicalToml(
  content,
  { requiredKeys = [], allowedKeys = requiredKeys } = {},
) {
  const result = Object.create(null);
  const allowed = new Set(allowedKeys);
  const lines = splitCanonicalLines(content);

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    rejectControlCharacters(raw, index + 1);
    const line = trimAsciiSpaces(raw);
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)[ ]*=[ ]*"([^"]*)"$/);
    if (!match) {
      throw new CanonicalParseError(index + 1, "unsupported TOML assignment");
    }
    const [, key, value] = match;
    if (Object.hasOwn(result, key)) {
      throw new CanonicalParseError(index + 1, `duplicate key ${key}`);
    }
    if (!allowed.has(key)) {
      throw new CanonicalParseError(index + 1, `unknown key ${key}`);
    }
    result[key] = value;
  }

  for (const key of requiredKeys) {
    if (!Object.hasOwn(result, key)) {
      throw new CanonicalParseError(0, `missing key ${key}`);
    }
  }
  return result;
}

function stripYamlComment(line) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === "#") return line.slice(0, index);
  }
  return line;
}

function tokenizeCanonicalYaml(content) {
  const tokens = [];
  const lines = splitCanonicalLines(content);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const lineNumber = index + 1;
    if (raw.includes("\t")) {
      throw new CanonicalParseError(lineNumber, "tabs are not supported");
    }
    rejectControlCharacters(raw, lineNumber);
    const uncommented = trimTrailingAsciiSpaces(stripYamlComment(raw));
    if (!uncommented) continue;
    if (uncommented[0] !== " " && /^\s/u.test(uncommented)) {
      throw new CanonicalParseError(lineNumber, "unsupported YAML mapping");
    }
    const indent = countLeadingAsciiSpaces(uncommented);
    if (indent % 2 !== 0) {
      throw new CanonicalParseError(
        lineNumber,
        "indentation must use multiples of two spaces",
      );
    }
    tokens.push({
      line: lineNumber,
      indent,
      text: uncommented.slice(indent),
    });
  }
  return tokens;
}

function parseDoubleQuotedYaml(value, line) {
  let result = "";
  for (let index = 1; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (index !== value.length - 1) {
        throw new CanonicalParseError(line, "unsupported YAML scalar");
      }
      return result;
    }
    if (character !== "\\") {
      result += character;
      continue;
    }

    index += 1;
    if (index >= value.length) {
      throw new CanonicalParseError(line, "unterminated double-quoted string");
    }
    const escaped = value[index];
    const replacements = {
      "\\": "\\",
      '"': '"',
      n: "\n",
      r: "\r",
      t: "\t",
    };
    if (!Object.hasOwn(replacements, escaped)) {
      throw new CanonicalParseError(line, "unsupported escape");
    }
    result += replacements[escaped];
  }
  throw new CanonicalParseError(line, "unterminated double-quoted string");
}

function parseYamlScalar(value, line) {
  if (value === "[]") return [];
  if (value.startsWith('"')) return parseDoubleQuotedYaml(value, line);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^[+-]?(?:0|[1-9][0-9]*)$/.test(value)) {
    const number = Number(value);
    if (!Number.isSafeInteger(number)) {
      throw new CanonicalParseError(line, "integer is outside the safe range");
    }
    return number;
  }
  if (/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value)) return value;
  if (["&", "*", "!", "|", ">", "{", "["].some((prefix) => value.startsWith(prefix))) {
    throw new CanonicalParseError(line, "unsupported YAML form");
  }
  throw new CanonicalParseError(line, "unsupported YAML scalar");
}

function yamlMappingParts(text, line) {
  const match = text.match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
  if (!match || (match[2] && !match[2].startsWith(" "))) {
    throw new CanonicalParseError(line, "unsupported YAML mapping");
  }
  const scalar = trimAsciiSpaces(match[2]);
  if (/^\s/u.test(scalar)) {
    throw new CanonicalParseError(line, "unsupported YAML mapping");
  }
  return { key: match[1], scalar };
}

function defineYamlKey(target, key, value, line) {
  if (Object.hasOwn(target, key)) {
    throw new CanonicalParseError(line, `duplicate key ${key}`);
  }
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function isYamlSequenceLine(text) {
  return text === "-" || text.startsWith("- ");
}

function parseYamlNode(tokens, index, indent, depth) {
  const token = tokens[index];
  if (!token || token.indent !== indent) {
    throw new CanonicalParseError(token ? token.line : 0, "invalid indentation");
  }
  return isYamlSequenceLine(token.text)
    ? parseYamlSequence(tokens, index, indent, depth)
    : parseYamlMapping(tokens, index, indent, depth);
}

function nextYamlNestingDepth(depth, line) {
  const nextDepth = depth + 1;
  if (nextDepth > MAX_CANONICAL_YAML_NESTING_DEPTH) {
    throw new CanonicalParseError(line, "maximum nesting depth exceeded");
  }
  return nextDepth;
}

function parseYamlMappingEntry(
  tokens,
  nextIndex,
  indent,
  depth,
  target,
  text,
  line,
) {
  const { key, scalar } = yamlMappingParts(text, line);
  if (Object.hasOwn(target, key)) {
    throw new CanonicalParseError(line, `duplicate key ${key}`);
  }
  if (scalar) {
    defineYamlKey(target, key, parseYamlScalar(scalar, line), line);
    return nextIndex;
  }

  const child = tokens[nextIndex];
  if (!child || child.indent <= indent) {
    throw new CanonicalParseError(line, `empty scalar ${key}`);
  }
  if (child.indent !== indent + 2) {
    throw new CanonicalParseError(child.line, "invalid indentation");
  }
  const childDepth = nextYamlNestingDepth(depth, child.line);
  const parsed = parseYamlNode(tokens, nextIndex, indent + 2, childDepth);
  defineYamlKey(target, key, parsed.value, line);
  return parsed.next;
}

function parseYamlMapping(tokens, index, indent, depth) {
  const result = {};
  let cursor = index;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (token.indent < indent) break;
    if (token.indent > indent) {
      throw new CanonicalParseError(token.line, "invalid indentation");
    }
    if (isYamlSequenceLine(token.text)) {
      throw new CanonicalParseError(token.line, "cannot mix mappings and sequences");
    }
    cursor = parseYamlMappingEntry(
      tokens,
      cursor + 1,
      indent,
      depth,
      result,
      token.text,
      token.line,
    );
  }
  return { value: result, next: cursor };
}

function parseYamlSequenceMapping(tokens, index, indent, depth, text, line) {
  const result = {};
  let cursor = parseYamlMappingEntry(
    tokens,
    index + 1,
    indent,
    depth,
    result,
    text,
    line,
  );
  while (cursor < tokens.length && tokens[cursor].indent === indent) {
    const token = tokens[cursor];
    if (isYamlSequenceLine(token.text)) {
      throw new CanonicalParseError(token.line, "cannot mix mappings and sequences");
    }
    cursor = parseYamlMappingEntry(
      tokens,
      cursor + 1,
      indent,
      depth,
      result,
      token.text,
      token.line,
    );
  }
  if (cursor < tokens.length && tokens[cursor].indent > indent) {
    throw new CanonicalParseError(tokens[cursor].line, "invalid indentation");
  }
  return { value: result, next: cursor };
}

function parseYamlSequence(tokens, index, indent, depth) {
  const result = [];
  let cursor = index;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (token.indent < indent) break;
    if (token.indent > indent) {
      throw new CanonicalParseError(token.line, "invalid indentation");
    }
    if (!isYamlSequenceLine(token.text)) {
      throw new CanonicalParseError(token.line, "cannot mix mappings and sequences");
    }
    if (token.text === "-") {
      throw new CanonicalParseError(token.line, "empty sequence item");
    }

    const item = token.text.slice(2);
    if (/^[A-Za-z_][A-Za-z0-9_]*:/.test(item)) {
      const mappingDepth = nextYamlNestingDepth(depth, token.line);
      const parsed = parseYamlSequenceMapping(
        tokens,
        cursor,
        indent + 2,
        mappingDepth,
        item,
        token.line,
      );
      result.push(parsed.value);
      cursor = parsed.next;
      continue;
    }

    result.push(parseYamlScalar(item, token.line));
    cursor += 1;
    if (cursor < tokens.length && tokens[cursor].indent > indent) {
      throw new CanonicalParseError(tokens[cursor].line, "invalid indentation");
    }
  }
  return { value: result, next: cursor };
}

function parseCanonicalYaml(content) {
  const tokens = tokenizeCanonicalYaml(content);
  if (tokens.length === 0) {
    throw new CanonicalParseError(0, "empty YAML document");
  }
  if (tokens[0].indent !== 0) {
    throw new CanonicalParseError(tokens[0].line, "invalid indentation");
  }
  if (isYamlSequenceLine(tokens[0].text)) {
    throw new CanonicalParseError(tokens[0].line, "root must be a mapping");
  }
  const parsed = parseYamlMapping(tokens, 0, 0, 0);
  if (parsed.next !== tokens.length) {
    throw new CanonicalParseError(tokens[parsed.next].line, "invalid indentation");
  }
  return parsed.value;
}

const MANAGED_FILES_HEADER = "# path\ttype\townership\tsource_sha256";
const MAX_MANAGED_FILES_BYTES = 256 * 1024;
const MAX_MANAGED_FILES_ROWS = 4096;
const MAX_MANAGED_FILES_ROW_LENGTH = 4096;
const MAX_MANAGED_PATH_LENGTH = 1024;
const UNSAFE_MANIFEST_FIELD_CHARACTERS =
  /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

function manifestParseError(line, reason, issueCode = "E003") {
  const error = new CanonicalParseError(line, reason);
  Object.defineProperty(error, "manifestIssueCode", {
    configurable: true,
    enumerable: false,
    value: issueCode,
  });
  return error;
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

function assertSafeManagedPath(relativePath, line) {
  if (
    !relativePath
    || !/^[ -~]+$/u.test(relativePath)
    || relativePath.includes("\\")
    || relativePath.startsWith("/")
    || /^[A-Za-z]:/u.test(relativePath)
  ) {
    throw manifestParseError(
      line,
      "manifest path must use printable ASCII portable spelling",
      "E004",
    );
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw manifestParseError(line, "manifest contains an unsafe path", "E004");
  }
  for (const segment of segments) {
    const basename = segment.split(".", 1)[0].replace(/ +$/gu, "");
    if (
      segment.startsWith(" ")
      || /[. ]$/u.test(segment)
      || /[<>:"|?*~$]/u.test(segment)
      || /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/iu.test(basename)
    ) {
      throw manifestParseError(
        line,
        "manifest path must use portable path spelling",
        "E004",
      );
    }
  }
  if (relativePath === ".ai-os/managed-files.tsv") {
    throw manifestParseError(
      line,
      "manifest must not list itself recursively",
      "E004",
    );
  }
}

function rejectUnsafeManifestField(value, line) {
  if (UNSAFE_MANIFEST_FIELD_CHARACTERS.test(value)) {
    throw manifestParseError(
      line,
      "manifest field contains unsafe characters",
      "E004",
    );
  }
}

function parseManagedFiles(content) {
  if (typeof content !== "string") {
    throw manifestParseError(0, "manifest content must be a string");
  }
  if (content.charCodeAt(0) === 0xfeff) {
    throw manifestParseError(1, "manifest must not contain a UTF-8 BOM");
  }
  if (Buffer.byteLength(content, "utf8") > MAX_MANAGED_FILES_BYTES) {
    throw manifestParseError(0, "manifest exceeds the canonical size limit");
  }
  if (content.includes("\r")) {
    throw manifestParseError(1, "manifest must use LF line endings only");
  }
  if (!content.endsWith("\n")) {
    throw manifestParseError(0, "manifest must end with one terminal LF");
  }
  if (content.endsWith("\n\n")) {
    throw manifestParseError(0, "manifest has a blank row or extra terminal LF");
  }

  const lines = content.slice(0, -1).split("\n");
  if (lines[0] !== MANAGED_FILES_HEADER) {
    throw manifestParseError(1, "manifest header must have exactly four canonical columns");
  }
  if (lines.length - 1 > MAX_MANAGED_FILES_ROWS) {
    throw manifestParseError(0, "manifest contains too many rows");
  }

  const rows = [];
  const paths = new Set();
  const pathKeys = new Set();
  let previousPath = null;
  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    if (lines[index].length > MAX_MANAGED_FILES_ROW_LENGTH) {
      throw manifestParseError(lineNumber, "manifest row exceeds the length limit");
    }
    const fields = lines[index].split("\t");
    if (fields.length !== 4) {
      throw manifestParseError(lineNumber, "manifest row must have exactly four columns");
    }
    const [relativePath, type, ownership, sourceSha256] = fields;
    if (relativePath.length > MAX_MANAGED_PATH_LENGTH) {
      throw manifestParseError(
        lineNumber,
        "manifest path exceeds the length limit",
        "E004",
      );
    }
    for (const field of fields) rejectUnsafeManifestField(field, lineNumber);
    assertSafeManagedPath(relativePath, lineNumber);
    if (paths.has(relativePath)) {
      throw manifestParseError(lineNumber, "manifest contains a duplicate path");
    }
    const pathKey = relativePath.replace(/[A-Z]/gu, (character) => character.toLowerCase());
    if (pathKeys.has(pathKey)) {
      throw manifestParseError(
        lineNumber,
        "manifest contains a case-fold path alias",
        "E004",
      );
    }
    if (previousPath !== null && compareCodePointText(previousPath, relativePath) >= 0) {
      throw manifestParseError(
        lineNumber,
        "manifest rows must be sorted in code-point path order",
      );
    }
    if (type !== "file") {
      throw manifestParseError(lineNumber, "manifest has an unsupported type", "E004");
    }
    if (![OWNERSHIP.FRAMEWORK, OWNERSHIP.PROJECT, OWNERSHIP.SESSION].includes(ownership)) {
      throw manifestParseError(lineNumber, "manifest has unknown ownership", "E004");
    }
    if (ownership === OWNERSHIP.FRAMEWORK) {
      if (!/^[a-f0-9]{64}$/u.test(sourceSha256)) {
        throw manifestParseError(
          lineNumber,
          "framework manifest row requires a lowercase SHA-256 hash",
          "E004",
        );
      }
    } else if (sourceSha256 !== "") {
      throw manifestParseError(
        lineNumber,
        `${ownership} manifest row must have an empty source hash`,
        "E004",
      );
    }
    paths.add(relativePath);
    pathKeys.add(pathKey);
    previousPath = relativePath;
    rows.push({
      path: relativePath,
      type,
      ownership,
      source_sha256: sourceSha256,
    });
  }
  return rows;
}

const BASELINE_ID_PATTERN = /^BL-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const CR_ID_PATTERN = /^CR-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const RETROSPECTIVE_ID_PATTERN = /^BL-\d{8}-\d{6}-retrospective$/u;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.]\d{3}Z$/u;
const RESERVED_AI_IDENTITIES = new Set([
  "ai",
  "agent",
  "assistant",
  "bot",
  "model",
  "chatgpt",
  "codex",
  "claude",
  "gemini",
]);

function governanceFail(reason) {
  throw new GovernanceValidationError(reason);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isCanonicalUtc(value) {
  if (typeof value !== "string" || !CANONICAL_UTC_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function assertCanonicalUtc(value, label) {
  if (!isCanonicalUtc(value)) governanceFail(`${label} must be canonical UTC milliseconds`);
  return value;
}

function assertDeclaredHuman(value, label) {
  if (
    typeof value !== "string"
    || !value.trim()
    || value !== value.trim()
    || value.length > 200
    || /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(value)
  ) {
    governanceFail(`${label} must contain a declared human identity`);
  }
  if (RESERVED_AI_IDENTITIES.has(value.trim().toLowerCase())) {
    governanceFail(`${label} must not use a reserved AI identity`);
  }
  return value;
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    governanceFail(`${label} must be a mapping`);
  }
  const actual = Object.keys(value).sort(compareCodePointText);
  const canonical = [...expected].sort(compareCodePointText);
  if (actual.length !== canonical.length || actual.some((key, index) => key !== canonical[index])) {
    governanceFail(`${label} keys must be exact`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim()) governanceFail(`${label} must be non-empty`);
  return value;
}

function assertStringList(value, label, { nonEmpty = false, unique = false } = {}) {
  if (!Array.isArray(value)) governanceFail(`${label} must be a string list`);
  if (nonEmpty && value.length === 0) governanceFail(`${label} must be non-empty`);
  const result = value.map((item, index) => assertNonEmptyString(item, `${label}[${index}]`));
  if (unique && new Set(result).size !== result.length) governanceFail(`${label} must be unique`);
  return result;
}

function recordScalar(value) {
  const trimmed = value.trim();
  if (trimmed === '""') return "";
  if (trimmed === "[]") return [];
  return trimmed;
}

function parseRecordMetadata(lines) {
  const fields = Object.create(null);
  let currentKey = null;
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    const top = line.match(/^- \*\*([A-Za-z_][A-Za-z0-9_]*|Created At|Type|Status)\*\*: ?(.*)$/u);
    if (top) {
      const [, key, rawValue] = top;
      if (Object.hasOwn(fields, key)) governanceFail(`record contains duplicate key ${key}`);
      currentKey = key;
      const value = recordScalar(rawValue);
      fields[key] = value === "" && rawValue === "" ? [] : value;
      continue;
    }
    const nested = line.match(/^  - \*\*([a-z_][a-z0-9_]*)\*\*: ?(.*)$/u);
    if (nested) {
      if (currentKey !== "preventability_review") {
        governanceFail("nested record field is outside preventability_review");
      }
      if (Array.isArray(fields[currentKey])) fields[currentKey] = Object.create(null);
      const [, key, rawValue] = nested;
      if (Object.hasOwn(fields[currentKey], key)) {
        governanceFail(`preventability_review contains duplicate key ${key}`);
      }
      fields[currentKey][key] = recordScalar(rawValue);
      continue;
    }
    const item = line.match(/^  - (.+)$/u);
    if (item) {
      if (!currentKey || !Array.isArray(fields[currentKey])) {
        governanceFail("record list item has no list field");
      }
      fields[currentKey].push(recordScalar(item[1]));
      continue;
    }
    governanceFail("record metadata contains unsupported syntax");
  }
  return fields;
}

function timestampFromRecordId(recordId) {
  const match = recordId.match(/^(?:BL|CR)-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})-/u);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const value = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  return isCanonicalUtc(value) ? value : null;
}

function parseBaselineRecord(content, filename) {
  if (typeof content !== "string") governanceFail("record content must be a string");
  if (typeof filename !== "string" || !filename.endsWith(".md")) {
    governanceFail("record filename must end in .md");
  }
  const allLines = splitCanonicalLines(content);
  const firstH2 = allLines.findIndex((line, index) => index > 0 && /^##(?: |$)/u.test(line));
  const lines = allLines.slice(0, firstH2 === -1 ? allLines.length : firstH2);
  if (!lines[0] || !/^# [^#].*$/u.test(lines[0])) {
    governanceFail("record must start with the first H1 record ID");
  }
  if (lines.filter((line) => /^# /u.test(line)).length !== 1) {
    governanceFail("record region must contain exactly one H1");
  }
  const id = lines[0].slice(2);
  const stem = filename.slice(0, -3);
  if (id !== stem) governanceFail("record ID must match filename stem");
  const fields = parseRecordMetadata(lines);
  const type = fields.Type;
  const status = fields.Status;

  if (type === "bootstrap") {
    assertExactKeys(fields, ["Type", "Status", "Created At"], "bootstrap record");
    if (!BASELINE_ID_PATTERN.test(id) || RETROSPECTIVE_ID_PATTERN.test(id)) {
      governanceFail("bootstrap record ID is invalid");
    }
    if (status !== "unconfirmed") governanceFail("bootstrap status must be unconfirmed");
    const createdAt = assertCanonicalUtc(fields["Created At"], "bootstrap Created At");
    if (timestampFromRecordId(id) !== createdAt) {
      governanceFail("bootstrap Created At must match its record ID UTC second");
    }
    return deepFreeze({ id, type, status, created_at: createdAt });
  }

  if (type === "baseline") {
    assertExactKeys(
      fields,
      ["Type", "Status", "previous_baseline_id", "confirmed_by", "confirmed_at", "source_refs"],
      "confirmed baseline record",
    );
    if (!BASELINE_ID_PATTERN.test(id) || RETROSPECTIVE_ID_PATTERN.test(id)) {
      governanceFail("confirmed baseline record ID is invalid");
    }
    if (status !== "confirmed") governanceFail("baseline status must be confirmed");
    if (!BASELINE_ID_PATTERN.test(fields.previous_baseline_id)) {
      governanceFail("previous_baseline_id must be a BL ID");
    }
    assertDeclaredHuman(fields.confirmed_by, "confirmed_by");
    assertCanonicalUtc(fields.confirmed_at, "confirmed_at");
    const sourceRefs = assertStringList(fields.source_refs, "source_refs", { nonEmpty: true });
    return deepFreeze({
      id,
      type,
      status,
      previous_baseline_id: fields.previous_baseline_id,
      confirmed_by: fields.confirmed_by,
      confirmed_at: fields.confirmed_at,
      source_refs: [...sourceRefs],
    });
  }

  if (type === "change") {
    assertExactKeys(fields, [
      "Type", "Status", "current_behavior", "proposed_delta", "affected_artifacts",
      "acceptance_delta", "approval", "close_condition", "preventability_review",
      "result_baseline_id",
    ], "change request record");
    if (!CR_ID_PATTERN.test(id)) governanceFail("change request ID is invalid");
    if (!["proposed", "approved", "applied", "rejected"].includes(status)) {
      governanceFail("change request status is invalid");
    }
    for (const key of ["current_behavior", "proposed_delta", "close_condition"]) {
      assertNonEmptyString(fields[key], `change request ${key}`);
    }
    const affected = assertStringList(fields.affected_artifacts, "affected_artifacts", {
      nonEmpty: true,
      unique: true,
    });
    const acceptance = assertStringList(fields.acceptance_delta, "acceptance_delta", {
      nonEmpty: true,
      unique: true,
    });
    assertExactKeys(
      fields.preventability_review,
      ["status", "preventable", "root_cause", "suggested_guard"],
      "preventability_review",
    );
    const review = fields.preventability_review;
    if (!["pending", "completed"].includes(review.status)) {
      governanceFail("preventability_review status is invalid");
    }
    if (review.status === "pending") {
      if ([review.preventable, review.root_cause, review.suggested_guard].some((value) => value !== "")) {
        governanceFail("pending preventability review fields must be empty");
      }
    } else {
      if (!["yes", "no", "partial"].includes(review.preventable)) {
        governanceFail("completed preventability review has invalid preventable value");
      }
      assertNonEmptyString(review.root_cause, "preventability root_cause");
      assertNonEmptyString(review.suggested_guard, "preventability suggested_guard");
    }
    const approval = fields.approval;
    const resultId = fields.result_baseline_id;
    if (status === "proposed" && (approval !== "" || resultId !== "")) {
      governanceFail("proposed change requires empty approval and result baseline");
    }
    if (status === "approved" && (!approval || resultId !== "")) {
      governanceFail("approved change requires approval and empty result baseline");
    }
    if (status === "applied") {
      if (!approval || review.status !== "completed" || !BASELINE_ID_PATTERN.test(resultId)) {
        governanceFail("applied change requires approval, completed review, and result BL");
      }
    }
    if (status === "rejected" && (!approval || review.status !== "completed" || resultId !== "")) {
      governanceFail("rejected change requires approval, completed review, and empty result BL");
    }
    return deepFreeze({
      id,
      type,
      status,
      current_behavior: fields.current_behavior,
      proposed_delta: fields.proposed_delta,
      affected_artifacts: [...affected],
      acceptance_delta: [...acceptance],
      approval,
      close_condition: fields.close_condition,
      preventability_review: { ...review },
      result_baseline_id: resultId,
    });
  }

  if (type === "retrospective") {
    assertExactKeys(
      fields,
      ["Type", "Status", "source_cr_ids", "preventable_findings", "suggested_framework_changes"],
      "retrospective record",
    );
    if (!RETROSPECTIVE_ID_PATTERN.test(id)) governanceFail("retrospective filename is invalid");
    if (status !== "closed") governanceFail("retrospective status must be closed");
    const sourceCrIds = assertStringList(fields.source_cr_ids, "source_cr_ids", {
      nonEmpty: true,
      unique: true,
    });
    if (sourceCrIds.some((sourceId) => !CR_ID_PATTERN.test(sourceId))) {
      governanceFail("retrospective source_cr_ids must contain CR IDs");
    }
    const findings = assertStringList(fields.preventable_findings, "preventable_findings");
    const changes = assertStringList(fields.suggested_framework_changes, "suggested_framework_changes");
    return deepFreeze({
      id,
      type,
      status,
      source_cr_ids: [...sourceCrIds],
      preventable_findings: [...findings],
      suggested_framework_changes: [...changes],
    });
  }

  governanceFail("record Type is invalid");
}

function visibleMarkdownLines(content) {
  const result = [];
  const lines = splitCanonicalLines(content);
  let fence = null;
  let inComment = false;
  for (const rawLine of lines) {
    if (fence) {
      const closer = rawLine.match(/^ {0,3}([`~]+)[ \t]*$/u);
      if (closer && closer[1][0] === fence.character && closer[1].length >= fence.length
        && [...closer[1]].every((character) => character === fence.character)) {
        fence = null;
      }
      result.push(null);
      continue;
    }
    let cursor = 0;
    let visible = "";
    while (cursor < rawLine.length) {
      if (inComment) {
        const close = rawLine.indexOf("-->", cursor);
        if (close === -1) {
          break;
        }
        inComment = false;
        cursor = close + 3;
        continue;
      }
      const open = rawLine.indexOf("<!--", cursor);
      if (open === -1) {
        visible += rawLine.slice(cursor);
        break;
      }
      visible += rawLine.slice(cursor, open);
      inComment = true;
      cursor = open + 4;
    }
    const opener = visible.match(/^ {0,3}((`{3,})|(~{3,}))(.*)$/u);
    if (opener && (opener[1][0] !== "`" || !opener[4].includes("`"))) {
      fence = { character: opener[1][0], length: opener[1].length };
      result.push(null);
      continue;
    }
    result.push(visible);
  }
  return result;
}

function markdownTableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || trimmed.includes("\\|")) {
    return null;
  }
  const cells = trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
  return cells.length === 5 ? cells : null;
}

function extractDesignAcceptanceIds(content) {
  if (typeof content !== "string") governanceFail("DESIGN content must be a string");
  const lines = visibleMarkdownLines(content);
  const headingIndexes = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] && /^ {0,3}## 9[.] 验收标准[ \t]*$/u.test(lines[index])) {
      headingIndexes.push(index);
    }
  }
  if (headingIndexes.length !== 1) governanceFail("DESIGN must contain exactly one live acceptance heading");
  const start = headingIndexes[0] + 1;
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index] && /^ {0,3}##(?: |$)/u.test(lines[index])) {
      end = index;
      break;
    }
  }
  const expectedHeader = ["AC ID", "需求 ID", "验收描述", "验证方式", "证据"];
  let headerIndex = -1;
  for (let index = start; index < end; index += 1) {
    const cells = lines[index] === null ? null : markdownTableCells(lines[index]);
    if (cells && cells.every((cell, cellIndex) => cell === expectedHeader[cellIndex])) {
      headerIndex = index;
      break;
    }
  }
  if (headerIndex === -1) governanceFail("DESIGN acceptance table header is missing");
  const separator = lines[headerIndex + 1] === null ? null : markdownTableCells(lines[headerIndex + 1]);
  if (!separator || separator.some((cell) => cell !== "---")) {
    governanceFail("DESIGN acceptance table separator is not canonical");
  }
  const ids = [];
  for (let index = headerIndex + 2; index < end; index += 1) {
    if (lines[index] === null || !lines[index].trim()) break;
    const cells = markdownTableCells(lines[index]);
    if (!cells || cells.some((cell) => !cell)) governanceFail("DESIGN acceptance row must have five non-empty cells");
    if (!/^AC-[0-9]{3,}$/u.test(cells[0])) governanceFail("DESIGN acceptance ID is invalid");
    ids.push(cells[0]);
  }
  if (ids.length === 0) governanceFail("DESIGN acceptance table must have at least one row");
  if (new Set(ids).size !== ids.length) governanceFail("DESIGN acceptance IDs must be unique");
  return Object.freeze([...ids]);
}

const TASK_TOP_KEYS = ["version", "baseline_id", "scope", "milestones", "tasks"];
const TASK_SCOPE_KEYS = ["mode", "focus", "baseline_source"];
const MILESTONE_KEYS = ["id", "title", "goal"];
const TASK_KEYS = [
  "id", "title", "milestone", "status", "owner", "priority", "approval",
  "depends_on", "acceptance_refs", "evidence_required", "evidence_produced",
  "delivery_state", "change_scope",
];
const APPROVAL_KEYS = [
  "required", "status", "decided_by", "decided_at", "baseline_id",
  "approved_scope", "conditions", "evidence_ref",
];
const EVIDENCE_KEYS = [
  "id", "kind", "command", "exit_code", "git_sha", "environment",
  "observed_at", "artifact", "confidence",
];
const DELIVERY_KEYS = ["code", "data", "runtime"];

function canonicalStringSet(value, label, options) {
  return assertStringList(value, label, { ...options, unique: true }).sort(compareCodePointText);
}

function validateApproval(value, label) {
  assertExactKeys(value, APPROVAL_KEYS, label);
  if (typeof value.required !== "boolean") governanceFail(`${label}.required must be boolean`);
  if (!["not-required", "pending", "approved", "rejected", "expired"].includes(value.status)) {
    governanceFail(`${label}.status is invalid`);
  }
  for (const key of ["decided_by", "decided_at", "baseline_id", "evidence_ref"]) {
    if (typeof value[key] !== "string") governanceFail(`${label}.${key} must be a string`);
  }
  assertNonEmptyString(value.baseline_id, `${label}.baseline_id`);
  const scope = canonicalStringSet(value.approved_scope, `${label}.approved_scope`);
  const conditions = canonicalStringSet(value.conditions, `${label}.conditions`);
  if (value.status === "not-required") {
    if (value.required || value.decided_by || value.decided_at || value.evidence_ref
      || scope.length || conditions.length) governanceFail(`${label} not-required shape is invalid`);
  } else if (value.status === "pending") {
    if (!value.required || value.decided_by || value.decided_at || value.evidence_ref
      || scope.length || conditions.length) governanceFail(`${label} pending shape is invalid`);
  } else {
    if (!value.required) governanceFail(`${label} decided status requires required=true`);
    assertDeclaredHuman(value.decided_by, `${label}.decided_by`);
    assertCanonicalUtc(value.decided_at, `${label}.decided_at`);
    assertNonEmptyString(value.evidence_ref, `${label}.evidence_ref`);
    if (value.status === "approved" && scope.length === 0) {
      governanceFail(`${label}.approved_scope must be non-empty when approved`);
    }
    if (value.status !== "approved" && scope.length !== 0) {
      governanceFail(`${label}.approved_scope must be empty unless approved`);
    }
  }
  return {
    required: value.required,
    status: value.status,
    decided_by: value.decided_by,
    decided_at: value.decided_at,
    baseline_id: value.baseline_id,
    approved_scope: scope,
    conditions,
    evidence_ref: value.evidence_ref,
  };
}

function validateEvidence(value, label, requiredIds, seenIds) {
  assertExactKeys(value, EVIDENCE_KEYS, label);
  for (const key of ["id", "kind", "command", "git_sha", "environment", "observed_at", "artifact", "confidence"]) {
    if (typeof value[key] !== "string") governanceFail(`${label}.${key} must be a string`);
  }
  assertNonEmptyString(value.id, `${label}.id`);
  if (seenIds.has(value.id)) governanceFail(`${label}.id must be unique within its task`);
  seenIds.add(value.id);
  if (!requiredIds.has(value.id)) governanceFail(`${label}.id must bind an evidence_required ID`);
  if (!["static", "test", "runtime", "data", "manual", "release"].includes(value.kind)) {
    governanceFail(`${label}.kind is invalid`);
  }
  assertNonEmptyString(value.command, `${label}.command`);
  if (!Number.isInteger(value.exit_code)) governanceFail(`${label}.exit_code must be an integer`);
  assertNonEmptyString(value.git_sha, `${label}.git_sha`);
  assertNonEmptyString(value.environment, `${label}.environment`);
  assertCanonicalUtc(value.observed_at, `${label}.observed_at`);
  assertNonEmptyString(value.artifact, `${label}.artifact`);
  if (!["observed", "inferred", "unknown"].includes(value.confidence)) {
    governanceFail(`${label}.confidence is invalid`);
  }
  return { ...value };
}

function validateTasksV5(document, { acceptanceIds = null } = {}) {
  assertExactKeys(document, TASK_TOP_KEYS, "tasks document");
  if (document.version !== 5) governanceFail("tasks document version must be integer 5");
  assertNonEmptyString(document.baseline_id, "tasks baseline_id");
  assertExactKeys(document.scope, TASK_SCOPE_KEYS, "tasks scope");
  if (!["change", "release"].includes(document.scope.mode)) governanceFail("tasks scope.mode is invalid");
  assertNonEmptyString(document.scope.focus, "tasks scope.focus");
  assertNonEmptyString(document.scope.baseline_source, "tasks scope.baseline_source");
  if (!Array.isArray(document.milestones)) governanceFail("milestones must be a list");
  if (!Array.isArray(document.tasks)) governanceFail("tasks must be a list");

  const milestoneIds = new Set();
  const milestones = document.milestones.map((milestone, index) => {
    const label = `milestones[${index}]`;
    assertExactKeys(milestone, MILESTONE_KEYS, label);
    for (const key of MILESTONE_KEYS) assertNonEmptyString(milestone[key], `${label}.${key}`);
    if (milestoneIds.has(milestone.id)) governanceFail("milestone IDs must be unique");
    milestoneIds.add(milestone.id);
    return { id: milestone.id, title: milestone.title, goal: milestone.goal };
  }).sort((left, right) => compareCodePointText(left.id, right.id));

  const acceptanceSet = acceptanceIds === null ? null : new Set(acceptanceIds);
  const referencedAcceptance = new Set();
  const taskIds = new Set();
  const tasks = document.tasks.map((task, index) => {
    const label = `tasks[${index}]`;
    assertExactKeys(task, TASK_KEYS, label);
    for (const key of ["id", "title", "milestone", "status", "owner", "priority"]) {
      assertNonEmptyString(task[key], `${label}.${key}`);
    }
    if (taskIds.has(task.id)) governanceFail("task IDs must be unique");
    taskIds.add(task.id);
    if (!milestoneIds.has(task.milestone)) governanceFail(`${label}.milestone must reference a milestone`);
    if (!["todo", "in-progress", "blocked", "done", "shipped"].includes(task.status)) {
      governanceFail(`${label}.status is invalid`);
    }
    if (!/^P[0-3]$/u.test(task.priority)) governanceFail(`${label}.priority is invalid`);
    const approval = validateApproval(task.approval, `${label}.approval`);
    const dependsOn = canonicalStringSet(task.depends_on, `${label}.depends_on`);
    const acceptanceRefs = canonicalStringSet(task.acceptance_refs, `${label}.acceptance_refs`);
    for (const acceptanceId of acceptanceRefs) {
      if (!/^AC-[0-9]{3,}$/u.test(acceptanceId)) governanceFail(`${label}.acceptance_refs contains an invalid ID`);
      if (acceptanceSet && !acceptanceSet.has(acceptanceId)) {
        governanceFail(`${label}.acceptance_refs contains an unknown DESIGN AC`);
      }
      referencedAcceptance.add(acceptanceId);
    }
    const evidenceRequired = canonicalStringSet(task.evidence_required, `${label}.evidence_required`);
    const requiredIds = new Set(evidenceRequired);
    if (!Array.isArray(task.evidence_produced)) governanceFail(`${label}.evidence_produced must be a list`);
    const seenEvidence = new Set();
    const evidenceProduced = task.evidence_produced.map((evidence, evidenceIndex) => (
      validateEvidence(evidence, `${label}.evidence_produced[${evidenceIndex}]`, requiredIds, seenEvidence)
    )).sort((left, right) => compareCodePointText(left.id, right.id));
    assertExactKeys(task.delivery_state, DELIVERY_KEYS, `${label}.delivery_state`);
    const deliveryState = {};
    for (const key of DELIVERY_KEYS) {
      if (!["observed", "inferred", "unknown", "not-applicable"].includes(task.delivery_state[key])) {
        governanceFail(`${label}.delivery_state.${key} is invalid`);
      }
      deliveryState[key] = task.delivery_state[key];
    }
    const changeScope = canonicalStringSet(task.change_scope, `${label}.change_scope`);
    return {
      id: task.id,
      title: task.title,
      milestone: task.milestone,
      status: task.status,
      owner: task.owner,
      priority: task.priority,
      approval,
      depends_on: dependsOn,
      acceptance_refs: acceptanceRefs,
      evidence_required: evidenceRequired,
      evidence_produced: evidenceProduced,
      delivery_state: deliveryState,
      change_scope: changeScope,
    };
  }).sort((left, right) => compareCodePointText(left.id, right.id));

  for (const task of tasks) {
    for (const dependency of task.depends_on) {
      if (!taskIds.has(dependency)) governanceFail(`task ${task.id} depends on an unknown task`);
      if (dependency === task.id) governanceFail(`task ${task.id} must not depend on itself`);
    }
  }
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visiting = new Set();
  const visited = new Set();
  const visit = (taskId) => {
    if (visiting.has(taskId)) governanceFail("task dependencies must be acyclic");
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const dependency of byId.get(taskId).depends_on) visit(dependency);
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const task of tasks) visit(task.id);
  if (acceptanceSet) {
    for (const acceptanceId of acceptanceSet) {
      if (!referencedAcceptance.has(acceptanceId)) governanceFail(`DESIGN acceptance ${acceptanceId} is not covered by a task`);
    }
  }
  return deepFreeze({
    version: 5,
    baseline_id: document.baseline_id,
    scope: {
      mode: document.scope.mode,
      focus: document.scope.focus,
      baseline_source: document.scope.baseline_source,
    },
    milestones,
    tasks,
  });
}

function projectTasksForEvidence(document) {
  const tasks = document.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    milestone: task.milestone,
    owner: task.owner,
    priority: task.priority,
    approval: task.approval,
    depends_on: task.depends_on,
    acceptance_refs: task.acceptance_refs,
    evidence_required: task.evidence_required,
    change_scope: task.change_scope,
  })).sort((left, right) => compareCodePointText(left.id, right.id));
  return deepFreeze({
    version: document.version,
    baseline_id: document.baseline_id,
    scope: document.scope,
    milestones: [...document.milestones].sort((left, right) => compareCodePointText(left.id, right.id)),
    tasks,
  });
}

function parseManagedBlock(content, begin, end) {
  if (typeof content !== "string") governanceFail("managed block content must be a string");
  for (const [label, marker] of [["begin", begin], ["end", end]]) {
    if (typeof marker !== "string" || !marker || /[\r\n]/u.test(marker)) {
      governanceFail(`managed block ${label} marker must be one non-empty line`);
    }
  }
  if (begin === end) governanceFail("managed block markers must differ");
  const lines = splitCanonicalLines(content);
  const begins = [];
  const ends = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === begin) begins.push(index);
    if (lines[index] === end) ends.push(index);
  }
  if (begins.length !== 1 || ends.length !== 1 || ends[0] <= begins[0]) {
    governanceFail("managed block markers must form exactly one ordered range");
  }
  return Object.freeze(lines.slice(begins[0] + 1, ends[0]));
}

function parseEffectiveGitignoreRules(content) {
  if (typeof content !== "string") governanceFail("gitignore content must be a string");
  const rules = [];
  for (const line of splitCanonicalLines(content)) {
    if (!line || line.startsWith("#")) continue;
    if (line.includes("\0") || line.length > 4096) {
      governanceFail("gitignore rule exceeds the canonical resource boundary");
    }
    if (rules.length >= 4096) governanceFail("gitignore exceeds the canonical rule limit");
    rules.push(line);
  }
  return Object.freeze(rules);
}

function escapeRegexCharacter(character) {
  return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
}

function gitignoreGlobSource(pattern) {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") {
        source += "(?:.*/)?";
        index += 2;
      } else {
        source += ".*";
        index += 1;
      }
    } else if (character === "*") {
      source += "[^/]*";
    } else if (character === "?" || character === "[" || character === "]" || character === "\\") {
      return null;
    } else {
      source += escapeRegexCharacter(character);
    }
  }
  return source;
}

function gitignoreRuleMatches(rule, relativePath) {
  let pattern = rule;
  if (pattern.startsWith("\\#") || pattern.startsWith("\\!")) pattern = pattern.slice(1);
  const anchored = pattern.startsWith("/");
  if (anchored) pattern = pattern.slice(1);
  const directory = pattern.endsWith("/");
  if (directory) pattern = pattern.slice(0, -1);
  if (!pattern) return false;
  const source = gitignoreGlobSource(pattern);
  if (source === null) return null;
  const containsSlash = pattern.includes("/");
  const prefix = anchored || containsSlash ? "^" : "(?:^|/)";
  const suffix = directory ? "(?:/.*)?$" : "$";
  return new RegExp(`${prefix}${source}${suffix}`, "u").test(relativePath);
}

function isPathIgnored(rules, relativePath) {
  if (!Array.isArray(rules) || typeof relativePath !== "string") return false;
  if (
    !relativePath
    || relativePath.startsWith("/")
    || relativePath.includes("\\")
    || relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) return false;
  let ignored = false;
  for (const rawRule of rules) {
    if (typeof rawRule !== "string" || !rawRule) continue;
    const escapedMarker = rawRule.startsWith("\\#") || rawRule.startsWith("\\!");
    const negated = !escapedMarker && rawRule.startsWith("!");
    const rule = negated ? rawRule.slice(1) : rawRule;
    const matches = gitignoreRuleMatches(rule, relativePath);
    if (matches === true) ignored = !negated;
    if (matches === null && negated) ignored = false;
  }
  return ignored;
}

function fileSpec(relativePath, ownership, source = null, generated = false, mode = 0o644) {
  return Object.freeze({
    path: relativePath,
    type: "file",
    ownership,
    mode,
    source,
    generated,
  });
}

const FILE_SPEC_LIST = [
  fileSpec(".ai-os/bin/VERSION", OWNERSHIP.FRAMEWORK, "VERSION"),
  fileSpec(".ai-os/bin/ai-os-doctor.js", OWNERSHIP.FRAMEWORK, "bin/ai-os-doctor.js"),
  fileSpec(".ai-os/bin/doctor-shared.js", OWNERSHIP.FRAMEWORK, "bin/doctor-shared.js"),
  fileSpec(".ai-os/framework.toml", OWNERSHIP.FRAMEWORK, null, true),
  fileSpec(".ai-os/managed-files.tsv", OWNERSHIP.FRAMEWORK, null, true),
  fileSpec(".ai-os/reference/artifacts.md", OWNERSHIP.FRAMEWORK, "docs/artifacts.md"),

  fileSpec(".gitattributes", OWNERSHIP.PROJECT, null, true),
  fileSpec(".gitignore", OWNERSHIP.PROJECT, null, true),
  fileSpec("AGENTS.md", OWNERSHIP.PROJECT, "framework/.agents/templates/root/AGENTS.md"),
  fileSpec("CLAUDE.md", OWNERSHIP.PROJECT, "framework/.agents/templates/ide-pointers/CLAUDE.md"),
  fileSpec("GEMINI.md", OWNERSHIP.PROJECT, "framework/.agents/templates/ide-pointers/GEMINI.md"),
  fileSpec(".ai-os/MISSION.md", OWNERSHIP.PROJECT, "framework/.agents/templates/shared-root/MISSION.md"),
  fileSpec(".ai-os/memory.md", OWNERSHIP.PROJECT, "framework/.agents/templates/shared-root/memory.md"),
  fileSpec(".ai-os/lanes/default/DESIGN.md", OWNERSHIP.PROJECT, "framework/.agents/templates/lane/DESIGN.md"),
  fileSpec(".ai-os/lanes/default/MISSION.md", OWNERSHIP.PROJECT, "framework/.agents/templates/lane/MISSION.md"),
  fileSpec(".ai-os/lanes/default/baseline-log/{{INITIAL_BASELINE_FILE}}", OWNERSHIP.PROJECT, null, true),
  fileSpec(".ai-os/lanes/default/lane.toml", OWNERSHIP.PROJECT, "framework/.agents/templates/lane/lane.toml"),
  fileSpec(".ai-os/lanes/default/tasks.yaml", OWNERSHIP.PROJECT, "framework/.agents/templates/lane/tasks.yaml"),

  fileSpec(".ai-os/lanes/default/STATE.md", OWNERSHIP.SESSION, "framework/.agents/templates/lane/STATE.md"),
];

const FILE_SPECS = Object.freeze(Object.fromEntries(
  FILE_SPEC_LIST.map((descriptor) => [descriptor.path, descriptor]),
));
const FRAMEWORK_FILES = Object.freeze(FILE_SPEC_LIST
  .filter((descriptor) => descriptor.ownership === OWNERSHIP.FRAMEWORK)
  .map((descriptor) => descriptor.path));
const PROJECT_FILES = Object.freeze(FILE_SPEC_LIST
  .filter((descriptor) => descriptor.ownership === OWNERSHIP.PROJECT)
  .map((descriptor) => descriptor.path));
const SESSION_FILES = Object.freeze(FILE_SPEC_LIST
  .filter((descriptor) => descriptor.ownership === OWNERSHIP.SESSION)
  .map((descriptor) => descriptor.path));

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function lstatIfPresent(absolute) {
  try {
    return fs.lstatSync(absolute);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function rejectLink(absolute) {
  throw new Error(`symbolic link or junction rejected: ${absolute}`);
}

function assertNoWindowsJunction(absolute, expected) {
  if (process.platform !== "win32") return absolute;
  const canonical = fs.realpathSync.native(absolute);
  if (path.resolve(canonical).toLowerCase() !== path.resolve(expected).toLowerCase()) rejectLink(absolute);
  return canonical;
}

function resolveTargetRoot(target) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  const segments = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let cursor = parsed.root;
  let deepestExisting = parsed.root;
  let canonicalCursor = process.platform === "win32"
    ? fs.realpathSync.native(parsed.root)
    : parsed.root;
  let missingAt = segments.length;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    cursor = path.join(cursor, segment);
    const stat = lstatIfPresent(cursor);
    if (stat === null) {
      missingAt = index;
      break;
    }
    if (stat.isSymbolicLink()) rejectLink(cursor);
    if (!stat.isDirectory()) {
      const role = index === segments.length - 1 ? "target root" : "non-directory parent";
      throw new Error(`${role} is not a directory: ${cursor}`);
    }

    deepestExisting = cursor;
    if (process.platform === "win32") {
      const expected = path.join(canonicalCursor, segment);
      canonicalCursor = assertNoWindowsJunction(cursor, expected);
    }
  }

  const canonicalExisting = process.platform === "win32"
    ? canonicalCursor
    : fs.realpathSync.native(deepestExisting);
  return path.resolve(canonicalExisting, ...segments.slice(missingAt));
}

function assertContained(root, absolute) {
  const relative = path.relative(root, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`destination is outside target: ${absolute}`);
  }
}

function inspectedResult(absolute, stat) {
  if (stat === null) {
    return { absolute, exists: false, kind: "missing", link: false, contained: true };
  }
  const kind = stat.isFile() ? "file" : stat.isDirectory() ? "dir" : "other";
  return { absolute, exists: true, kind, link: false, contained: true };
}

function inspectPath(root, relative) {
  const targetRoot = resolveTargetRoot(root);
  const absolute = path.resolve(targetRoot, relative);
  assertContained(targetRoot, absolute);

  const segments = path.relative(targetRoot, absolute).split(path.sep).filter(Boolean);
  let cursor = targetRoot;
  let stat = lstatIfPresent(cursor);
  if (stat && stat.isSymbolicLink()) rejectLink(cursor);
  if (stat && !stat.isDirectory()) {
    throw new Error(`target root is not a directory: ${cursor}`);
  }
  if (stat) assertNoWindowsJunction(cursor, targetRoot);

  for (let index = 0; index < segments.length; index += 1) {
    cursor = path.join(cursor, segments[index]);
    stat = lstatIfPresent(cursor);
    if (stat === null) continue;
    if (stat.isSymbolicLink()) rejectLink(cursor);
    assertNoWindowsJunction(cursor, cursor);
    if (index < segments.length - 1 && !stat.isDirectory()) {
      throw new Error(`non-directory parent rejected: ${cursor}`);
    }
  }

  if (segments.length === 0) return inspectedResult(absolute, stat);
  return inspectedResult(absolute, lstatIfPresent(absolute));
}

module.exports = {
  CanonicalParseError,
  GovernanceValidationError,
  parseCanonicalToml,
  parseCanonicalYaml,
  parseManagedFiles,
  parseBaselineRecord,
  extractDesignAcceptanceIds,
  validateTasksV5,
  projectTasksForEvidence,
  isCanonicalUtc,
  parseManagedBlock,
  parseEffectiveGitignoreRules,
  isPathIgnored,
  LAYOUT_VERSION,
  LAYOUT_MODE,
  OWNERSHIP,
  FRAMEWORK_FILES,
  PROJECT_FILES,
  SESSION_FILES,
  FILE_SPECS,
  sha256,
  resolveTargetRoot,
  inspectPath,
};
