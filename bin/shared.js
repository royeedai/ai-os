/**
 * AI-OS CLI — shared utilities
 *
 * Common helpers used by create-ai-os, doctor, diff, and upgrade commands.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const MANAGED_ROOTS = ["AGENTS.md", ".agents"];
const PROJECT_STATE_ROOT = ".ai-os-project";
const PROJECT_METADATA_FILE = "framework.toml";
const PROJECT_MANAGED_FILES_MANIFEST = "managed-files.tsv";
const PROJECT_TEMPLATE_ROOT = path.join(PACKAGE_ROOT, ".agents", "templates", "project");
const PROJECT_ARTIFACT_FILES = [
  "project-charter.md",
  "risk-register.md",
  "tasks.yaml",
  "acceptance.yaml",
  "release-plan.md",
  "memory.md",
  "STATE.md",
  "verification-matrix.yaml",
];
const PROJECT_ARTIFACT_DIRS = ["specs", "evals"];

// ---------------------------------------------------------------------------
// Read metadata from the AI-OS source (mother repo)
// ---------------------------------------------------------------------------

function readFrameworkVersion() {
  return fs.readFileSync(path.join(PACKAGE_ROOT, "VERSION"), "utf8").trim();
}

function readPackageJson() {
  return JSON.parse(
    fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8")
  );
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * Compute SHA-256 hex digest of a file.
 */
function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Recursively list all files under `rootDir`, returning sorted absolute paths.
 * Skips `.DS_Store`.
 */
function listFilesRecursively(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store") continue;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        results.push(absolutePath);
      }
    }
  }

  walk(rootDir);
  return results.sort();
}

/**
 * List all framework-managed file paths (relative to `baseDir`).
 * Returns sorted array of relative paths like "AGENTS.md", ".agents/skills/foo/SKILL.md".
 */
function listManagedFiles(baseDir) {
  const relativePaths = [];
  for (const rootRel of MANAGED_ROOTS) {
    const srcRoot = path.join(baseDir, rootRel);
    if (!fs.existsSync(srcRoot)) continue;
    if (fs.statSync(srcRoot).isFile()) {
      relativePaths.push(rootRel);
      continue;
    }
    const files = listFilesRecursively(srcRoot);
    for (const absFile of files) {
      relativePaths.push(path.relative(baseDir, absFile));
    }
  }
  return relativePaths.sort();
}

function getProjectRoot(targetDir) {
  return path.join(targetDir, PROJECT_STATE_ROOT);
}

function getProjectFilePath(targetDir, relPath = "") {
  return path.join(getProjectRoot(targetDir), relPath);
}

function getProjectRelativePath(relPath = "") {
  return path.posix.join(PROJECT_STATE_ROOT, relPath).replace(/\\/g, "/");
}

function getProjectMetadataPath(targetDir) {
  return getProjectFilePath(targetDir, PROJECT_METADATA_FILE);
}

function normalizeRelativePath(relPath = "") {
  return relPath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isProjectArtifactPath(relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (!normalized) {
    return false;
  }
  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
    return true;
  }
  if (PROJECT_ARTIFACT_FILES.includes(normalized)) {
    return true;
  }
  return PROJECT_ARTIFACT_DIRS.some((dirName) => normalized === dirName || normalized.startsWith(`${dirName}/`));
}

function resolveProjectPath(targetDir, relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (isProjectArtifactPath(normalized)) {
    if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
      return path.join(targetDir, normalized);
    }
    return getProjectFilePath(targetDir, normalized);
  }
  return path.join(targetDir, normalized);
}

function formatProjectPath(relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (!normalized) {
    return PROJECT_STATE_ROOT;
  }
  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
    return normalized;
  }
  if (isProjectArtifactPath(normalized)) {
    return getProjectRelativePath(normalized);
  }
  return normalized;
}

function parseSimpleToml(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*"([^"]*)"$/);
    if (match) {
      values[match[1]] = match[2];
    }
  }

  return values;
}

// ---------------------------------------------------------------------------
// Read target project metadata
// ---------------------------------------------------------------------------

/**
 * Read the installed AI-OS metadata from a target project.
 * Returns { exists, version, mode, frameworkTomlPath } or { exists: false }.
 */
function readInstalledMeta(targetDir) {
  const tomlPath = getProjectMetadataPath(targetDir);

  if (!fs.existsSync(tomlPath)) {
    return { exists: false, version: null, mode: null, frameworkTomlPath: tomlPath };
  }

  const content = fs.readFileSync(tomlPath, "utf8");
  const values = parseSimpleToml(content);

  return {
    exists: true,
    version: values.framework_version || "unknown",
    mode: values.mode || "unknown",
    frameworkTomlPath: tomlPath,
    values,
  };
}

// ---------------------------------------------------------------------------
// File copy helper
// ---------------------------------------------------------------------------

function copyFileWithMode(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, fs.statSync(src).mode);
}

function getProjectTemplatePath(fileName) {
  const templatePath = path.join(PROJECT_TEMPLATE_ROOT, fileName);
  if (!fs.existsSync(templatePath)) {
    fail(`missing project template: ${templatePath}`);
  }
  return templatePath;
}

function defaultLogger(message) {
  process.stdout.write(`${message}\n`);
}

function copyFramework(targetDir, options = {}) {
  const { overwrite = false, logger = defaultLogger } = options;

  for (const rootRel of MANAGED_ROOTS) {
    const srcRoot = path.join(PACKAGE_ROOT, rootRel);
    const dstRoot = path.join(targetDir, rootRel);

    if (fs.statSync(srcRoot).isFile()) {
      if (fs.existsSync(dstRoot) && !overwrite) {
        logger(`keep existing managed file: ${rootRel}`);
        continue;
      }
      copyFileWithMode(srcRoot, dstRoot);
      logger(`copied: ${rootRel}`);
      continue;
    }

    const files = listFilesRecursively(srcRoot);
    for (const srcFile of files) {
      const relativePath = path.relative(PACKAGE_ROOT, srcFile);
      const dstFile = path.join(targetDir, relativePath);
      if (fs.existsSync(dstFile) && !overwrite) {
        logger(`keep existing managed file: ${relativePath}`);
        continue;
      }
      copyFileWithMode(srcFile, dstFile);
      logger(`copied: ${relativePath}`);
    }
  }
}

function copyTemplateIfMissing(targetDir, src, dst, options = {}) {
  const { logger = defaultLogger } = options;

  ensureDir(path.dirname(dst));
  if (fs.existsSync(dst)) {
    logger(`keep existing project file: ${path.relative(targetDir, dst)}`);
    return false;
  }

  copyFileWithMode(src, dst);
  logger(`created project file: ${path.relative(targetDir, dst)}`);
  return true;
}

function createProjectFiles(targetDir, options = {}) {
  const { logger = defaultLogger } = options;

  for (const dirName of PROJECT_ARTIFACT_DIRS) {
    ensureDir(getProjectFilePath(targetDir, dirName));
  }
  ensureDir(getProjectRoot(targetDir));

  for (const fileName of PROJECT_ARTIFACT_FILES) {
    copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(fileName),
      getProjectFilePath(targetDir, fileName),
      { logger }
    );
  }

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath(path.join("specs", "example.spec.md")),
    getProjectFilePath(targetDir, path.join("specs", "example.spec.md")),
    { logger }
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath(path.join("evals", "eval-example.md")),
    getProjectFilePath(targetDir, path.join("evals", "eval-example.md")),
    { logger }
  );
}

function writeMetadata(targetDir) {
  const metadataDir = getProjectRoot(targetDir);
  const metadataFile = getProjectFilePath(targetDir, PROJECT_METADATA_FILE);
  const frameworkVersion = readFrameworkVersion();
  const packageJson = readPackageJson();

  ensureDir(metadataDir);
  fs.writeFileSync(
    metadataFile,
    [
      'mode = "npx-git"',
      `framework_version = "${frameworkVersion}"`,
      `package_name = "${packageJson.name}"`,
      `package_version = "${packageJson.version}"`,
      `managed_files_manifest = "${getProjectRelativePath(PROJECT_MANAGED_FILES_MANIFEST)}"`,
      ""
    ].join("\n"),
    "utf8"
  );
}

function writeManagedFilesManifest(targetDir) {
  const manifestPath = getProjectFilePath(targetDir, PROJECT_MANAGED_FILES_MANIFEST);
  const lines = listManagedFiles(targetDir).map((relPath) => `${sha256File(path.join(targetDir, relPath))}\t${relPath}`);
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, [...lines, ""].join("\n"), "utf8");
}

function removeManagedPaths(targetDir) {
  for (const relPath of MANAGED_ROOTS) {
    const absolutePath = path.join(targetDir, relPath);
    let exists = false;
    try {
      fs.lstatSync(absolutePath);
      exists = true;
    } catch (_error) {
      exists = false;
    }

    if (!exists) {
      continue;
    }
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PACKAGE_ROOT,
  MANAGED_ROOTS,
  PROJECT_STATE_ROOT,
  PROJECT_METADATA_FILE,
  PROJECT_MANAGED_FILES_MANIFEST,
  PROJECT_TEMPLATE_ROOT,
  PROJECT_ARTIFACT_FILES,
  PROJECT_ARTIFACT_DIRS,
  readFrameworkVersion,
  readPackageJson,
  ensureDir,
  fail,
  sha256File,
  listFilesRecursively,
  listManagedFiles,
  getProjectRoot,
  getProjectFilePath,
  getProjectRelativePath,
  getProjectMetadataPath,
  normalizeRelativePath,
  isProjectArtifactPath,
  resolveProjectPath,
  formatProjectPath,
  parseSimpleToml,
  readInstalledMeta,
  copyFileWithMode,
  getProjectTemplatePath,
  copyFramework,
  copyTemplateIfMissing,
  createProjectFiles,
  writeMetadata,
  writeManagedFilesManifest,
  removeManagedPaths,
};
