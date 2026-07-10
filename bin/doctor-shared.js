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
  parseCanonicalToml,
  parseCanonicalYaml,
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
