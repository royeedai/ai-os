"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const LAYOUT_VERSION = "11";
const LAYOUT_MODE = "shared-root-default-lane";
const OWNERSHIP = Object.freeze({
  FRAMEWORK: "framework",
  PROJECT: "project",
  SESSION: "session",
});

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
