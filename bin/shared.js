/**
 * AI-OS CLI — shared utilities
 *
 * Common helpers used by create-ai-os, plan, doctor, diff, and upgrade commands.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const FRAMEWORK_ROOT = path.join(PACKAGE_ROOT, "framework");
const INSTALL_PROFILES_MANIFEST = path.join(PACKAGE_ROOT, "manifests", "install-profiles.json");
const MANAGED_ROOTS = ["AGENTS.md", ".agents"];
const PROJECT_STATE_ROOT = ".ai-os";
const PROJECT_METADATA_FILE = "framework.toml";
const PROJECT_MANAGED_FILES_MANIFEST = "managed-files.tsv";
const PROJECT_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "project");
const BASELINE_LOG_TEMPLATE_FILE = path.posix.join("baseline-log", "BL-template.md");
const INITIAL_BASELINE_SLUG = "initial-baseline";
const TEMPLATE_TOKEN_INITIAL_BASELINE_ID = "{{INITIAL_BASELINE_ID}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_FILE = "{{INITIAL_BASELINE_FILE}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_DATE = "{{INITIAL_BASELINE_DATE}}";

const PROJECT_CORE_ARTIFACT_FILES = [
  "MISSION.md",
  "DESIGN.md",
  "CONVENTIONS.md",
  "tasks.yaml",
  "acceptance.yaml",
  "STATE.md",
  "memory.md",
];
const PROJECT_OPTIONAL_ARTIFACT_FILES = [
  "risk-register.md",
  "release-plan.md",
  "verification-matrix.yaml",
];
const PROJECT_CORE_ARTIFACT_DIRS = ["baseline-log", "specs"];
const PROJECT_OPTIONAL_ARTIFACT_DIRS = ["design-pack", "evals"];
const PROJECT_ARTIFACT_FILES = [
  ...PROJECT_CORE_ARTIFACT_FILES,
  ...PROJECT_OPTIONAL_ARTIFACT_FILES,
];
const PROJECT_ARTIFACT_DIRS = [
  ...PROJECT_CORE_ARTIFACT_DIRS,
  ...PROJECT_OPTIONAL_ARTIFACT_DIRS,
];
const LITE_INCLUDES = [
  "AGENTS.md",
  // workflows: all phases + key specialized/continue
  ".agents/workflows/AGENTS.md",
  ".agents/workflows/align.md",
  ".agents/workflows/design.md",
  ".agents/workflows/plan.md",
  ".agents/workflows/build.md",
  ".agents/workflows/verify.md",
  ".agents/workflows/ship.md",
  ".agents/workflows/debug.md",
  ".agents/workflows/change-request.md",
  ".agents/workflows/resume.md",
  ".agents/workflows/status.md",
  // skills: only those referenced by workflows
  ".agents/skills/AGENTS.md",
  ".agents/skills/project-planner/SKILL.md",
  ".agents/skills/acceptance-gate/SKILL.md",
  ".agents/skills/memory-manager/SKILL.md",
  ".agents/skills/spec-validator/SKILL.md",
  ".agents/skills/task-orchestrator/SKILL.md",
  ".agents/skills/code-review-guard/SKILL.md",
  ".agents/skills/fullstack-dev-checklist/SKILL.md",
  ".agents/skills/testing-strategies/SKILL.md",
  ".agents/skills/release-manager/SKILL.md",
  ".agents/skills/subagent-executor/SKILL.md",
  ".agents/skills/reverse-engineer/SKILL.md",
  // references and policies
  ".agents/references/derived-rules.md",
  ".agents/references/risk-triggers.md",
  ".agents/policies/approval-policy.md",
];
const LITE_DIR_PREFIXES = [
  ".agents/templates/",
];

const QUALITY_TIERS = ["exploratory", "standard", "high-risk"];
const IMPACT_TAGS = [
  "entrypoint",
  "transport",
  "gateway",
  "auth",
  "schema",
  "mapping",
  "storage",
  "runtime-config",
  "external-dependency",
  "state-transition",
  "async-processing",
];
const HIGH_RISK_SPECIAL_REVIEWS = [
  "security-guard",
  "authorization-boundary-check",
  "concurrency-safety-check",
];

// ---------------------------------------------------------------------------
// Team collaboration: .gitignore / .gitattributes entries
// ---------------------------------------------------------------------------

const GITIGNORE_MARKER = "# AI-OS session & metadata";
const GITIGNORE_ENTRIES = [
  `${GITIGNORE_MARKER}`,
  `${PROJECT_STATE_ROOT}/STATE.md`,
  `${PROJECT_STATE_ROOT}/context-snapshot.md`,
  `${PROJECT_STATE_ROOT}/codebase-map.md`,
  `${PROJECT_STATE_ROOT}/${PROJECT_METADATA_FILE}`,
  `${PROJECT_STATE_ROOT}/${PROJECT_MANAGED_FILES_MANIFEST}`,
  "# IDE integration files (CLAUDE.md, GEMINI.md, .cursor/) are team-shareable — do NOT gitignore them",
];

const GITATTRIBUTES_MARKER = "# AI-OS merge strategies";
const GITATTRIBUTES_ENTRIES = [
  `${GITATTRIBUTES_MARKER}`,
  `${PROJECT_STATE_ROOT}/memory.md merge=union`,
];
const OBSOLETE_GITATTRIBUTES_ENTRIES = [
  `${PROJECT_STATE_ROOT}/tasks.yaml merge=union`,
];

/**
 * Append AI-OS entries to .gitignore if not already present.
 * Idempotent — skips if the marker comment is found.
 */
function appendGitignoreEntries(targetDir, options = {}) {
  const { logger = defaultLogger } = options;
  const gitignorePath = path.join(targetDir, ".gitignore");

  let existing = "";
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, "utf8");
    if (existing.includes(GITIGNORE_MARKER)) {
      logger("skip .gitignore (AI-OS entries already present)");
      return false;
    }
  }

  const separator = existing && !existing.endsWith("\n") ? "\n\n" : existing ? "\n" : "";
  fs.writeFileSync(
    gitignorePath,
    existing + separator + GITIGNORE_ENTRIES.join("\n") + "\n",
    "utf8"
  );
  logger("appended AI-OS session entries to .gitignore");
  return true;
}

/**
 * Align AI-OS merge strategy entries in .gitattributes.
 * Adds missing current entries, removes obsolete ones, and inserts the marker
 * block when absent.  Idempotent — skips when all entries are already aligned.
 */
function appendGitattributesEntries(targetDir, options = {}) {
  const { logger = defaultLogger } = options;
  const gitattrsPath = path.join(targetDir, ".gitattributes");

  let existing = "";
  if (fs.existsSync(gitattrsPath)) {
    existing = fs.readFileSync(gitattrsPath, "utf8");
  }

  let nextContent = existing;
  let changed = false;

  for (const obsoleteEntry of OBSOLETE_GITATTRIBUTES_ENTRIES) {
    const obsoletePattern = new RegExp(`^${escapeRegExp(obsoleteEntry)}\\r?\\n?`, "gm");
    if (obsoletePattern.test(nextContent)) {
      nextContent = nextContent.replace(obsoletePattern, "");
      changed = true;
    }
  }

  if (nextContent.includes(GITATTRIBUTES_MARKER)) {
    for (const entry of GITATTRIBUTES_ENTRIES.slice(1)) {
      if (!nextContent.includes(entry)) {
        nextContent = nextContent.replace(
          GITATTRIBUTES_MARKER,
          `${GITATTRIBUTES_MARKER}\n${entry}`
        );
        changed = true;
      }
    }
  } else {
    const separator = nextContent && !nextContent.endsWith("\n") ? "\n\n" : nextContent ? "\n" : "";
    nextContent += separator + GITATTRIBUTES_ENTRIES.join("\n") + "\n";
    changed = true;
  }

  if (!changed) {
    logger("skip .gitattributes (AI-OS entries already aligned)");
    return false;
  }

  if (nextContent && !nextContent.endsWith("\n")) {
    nextContent += "\n";
  }
  fs.writeFileSync(gitattrsPath, nextContent, "utf8");
  logger("aligned AI-OS merge strategies in .gitattributes");
  return true;
}

// ---------------------------------------------------------------------------
// Read metadata from the AI-OS source (mother repo)
// ---------------------------------------------------------------------------

function readFrameworkVersion() {
  const versionPath = path.join(PACKAGE_ROOT, "VERSION");
  if (!fs.existsSync(versionPath)) {
    fail(`VERSION file not found at ${versionPath}`);
  }
  return fs.readFileSync(versionPath, "utf8").trim();
}

function readPackageJson() {
  const pkgPath = path.join(PACKAGE_ROOT, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fail(`package.json not found at ${pkgPath}`);
  }
  return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
}

function readInstallProfiles() {
  return JSON.parse(fs.readFileSync(INSTALL_PROFILES_MANIFEST, "utf8"));
}

function getDefaultInstallProfileName() {
  const manifest = readInstallProfiles();
  return manifest.defaultProfile || "core";
}

function getInstallProfile(profileName) {
  const manifest = readInstallProfiles();
  const resolvedName = profileName || manifest.defaultProfile || "core";
  const profile = manifest.profiles && manifest.profiles[resolvedName];

  if (!profile) {
    const knownProfiles = Object.keys(manifest.profiles || {}).sort();
    throw new Error(
      `unknown install profile: ${resolvedName}` +
      (knownProfiles.length > 0 ? ` (expected one of: ${knownProfiles.join(", ")})` : "")
    );
  }

  return {
    name: resolvedName,
    description: profile.description || "",
    includeProjectFiles: Boolean(profile.includeProjectFiles),
  };
}

function detectInstallProfileName(targetDir, options = {}) {
  const meta = options.meta || readInstalledMeta(targetDir);
  if (meta.installProfile) {
    return meta.installProfile;
  }

  const hasProjectArtifacts = [
    ...PROJECT_ARTIFACT_FILES.map((relPath) => getProjectFilePath(targetDir, relPath)),
    ...PROJECT_ARTIFACT_DIRS.map((relPath) => getProjectFilePath(targetDir, relPath)),
    getProjectFilePath(targetDir, path.join("specs", "example.spec.md")),
  ].some((absolutePath) => fs.existsSync(absolutePath));

  return hasProjectArtifacts ? "project" : getDefaultInstallProfileName();
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

function normalizeFrameworkFootprint(value) {
  return value === "lite" ? "lite" : "full";
}

function detectFrameworkFootprint(targetDir, options = {}) {
  const meta = options.meta || readInstalledMeta(targetDir);
  const managedFiles = options.managedFiles || listManagedFiles(targetDir);
  const sourceManaged = new Set(listManagedFiles(FRAMEWORK_ROOT));
  const installedSourceManaged = managedFiles.filter((relPath) => sourceManaged.has(relPath));

  if (installedSourceManaged.some((relPath) => !isLiteIncluded(relPath))) {
    return "full";
  }

  if (meta.frameworkFootprint) {
    return normalizeFrameworkFootprint(meta.frameworkFootprint);
  }

  if (installedSourceManaged.length > 0) {
    return "lite";
  }

  return "full";
}

function listSourceManagedFiles(options = {}) {
  const frameworkFootprint = normalizeFrameworkFootprint(options.frameworkFootprint);
  return listManagedFiles(FRAMEWORK_ROOT)
    .filter((relPath) => frameworkFootprint !== "lite" || isLiteIncluded(relPath));
}

function getProjectRoot(targetDir) {
  return path.join(targetDir, PROJECT_STATE_ROOT);
}

function normalizeRelativePath(relPath = "") {
  return relPath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripProjectRootPrefix(relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
    return normalized.slice(PROJECT_STATE_ROOT.length + 1);
  }
  if (normalized === PROJECT_STATE_ROOT) {
    return "";
  }
  return normalized;
}

function getProjectFilePath(targetDir, relPath = "") {
  const normalized = stripProjectRootPrefix(relPath);
  return path.join(getProjectRoot(targetDir), normalized);
}

function getProjectRelativePath(relPath = "") {
  const normalized = stripProjectRootPrefix(relPath);
  return normalized
    ? path.posix.join(PROJECT_STATE_ROOT, normalized).replace(/\\/g, "/")
    : PROJECT_STATE_ROOT;
}

function getProjectMetadataPath(targetDir) {
  return getProjectFilePath(targetDir, PROJECT_METADATA_FILE);
}

function isProjectArtifactPath(relPath = "") {
  const normalized = stripProjectRootPrefix(relPath);
  if (!normalized) {
    return false;
  }
  if (PROJECT_ARTIFACT_FILES.includes(normalized)) {
    return true;
  }
  return PROJECT_ARTIFACT_DIRS.some(
    (dirName) => normalized === dirName || normalized.startsWith(`${dirName}/`)
  );
}

function resolveProjectPath(targetDir, relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (isProjectArtifactPath(normalized)) {
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

    const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*"((?:[^"\\]|\\.)*)"$/);
    if (match) {
      values[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }

  return values;
}

function serializeSimpleToml(values) {
  const lines = [];
  for (const [key, value] of Object.entries(values)) {
    const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`${key} = "${escaped}"`);
  }
  lines.push("");
  return lines.join("\n");
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatBaselineTimestamp(date = new Date()) {
  return [
    String(date.getUTCFullYear()),
    padNumber(date.getUTCMonth() + 1),
    padNumber(date.getUTCDate()),
  ].join("") +
    "-" +
    [
      padNumber(date.getUTCHours()),
      padNumber(date.getUTCMinutes()),
      padNumber(date.getUTCSeconds()),
    ].join("");
}

function formatBaselineConfirmedDate(date = new Date()) {
  return [
    String(date.getUTCFullYear()),
    padNumber(date.getUTCMonth() + 1),
    padNumber(date.getUTCDate()),
  ].join("-");
}

function sanitizeBaselineSlug(value, fallback = INITIAL_BASELINE_SLUG) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || fallback;
}

function buildBaselineRecordId(prefix, slug, options = {}) {
  const timestamp = options.timestamp || formatBaselineTimestamp(options.date || new Date());
  return `${prefix}-${timestamp}-${sanitizeBaselineSlug(
    slug,
    prefix === "CR" ? "change-request" : INITIAL_BASELINE_SLUG
  )}`;
}

function createInitialBaselineContext(options = {}) {
  const date = options.date || new Date();
  const baselineId = options.baselineId || buildBaselineRecordId(
    "BL",
    options.slug || INITIAL_BASELINE_SLUG,
    { date, timestamp: options.timestamp }
  );
  return {
    baselineId,
    baselineFileName: `${baselineId}.md`,
    baselineRecordRelPath: path.posix.join("baseline-log", `${baselineId}.md`),
    confirmedDate: options.confirmedDate || formatBaselineConfirmedDate(date),
  };
}

// ---------------------------------------------------------------------------
// Read target project metadata
// ---------------------------------------------------------------------------

/**
 * Read the installed AI-OS metadata from a target project.
 * Returns { exists, version, mode, installProfile, frameworkFootprint, frameworkTomlPath }
 * or { exists: false }.
 */
function readInstalledMeta(targetDir) {
  const tomlPath = getProjectMetadataPath(targetDir);

  if (!fs.existsSync(tomlPath)) {
    return {
      exists: false,
      version: null,
      mode: null,
      installProfile: null,
      frameworkFootprint: null,
      frameworkTomlPath: tomlPath,
    };
  }

  const content = fs.readFileSync(tomlPath, "utf8");
  const values = parseSimpleToml(content);

  return {
    exists: true,
    version: values.framework_version || "unknown",
    mode: values.mode || "unknown",
    installProfile: values.install_profile || null,
    frameworkFootprint: values.framework_footprint || null,
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

function isLiteIncluded(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (LITE_INCLUDES.includes(normalized)) return true;
  return LITE_DIR_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function copyFramework(targetDir, options = {}) {
  const { overwrite = false, lite = false, logger = defaultLogger } = options;

  for (const rootRel of MANAGED_ROOTS) {
    const srcRoot = path.join(FRAMEWORK_ROOT, rootRel);
    const dstRoot = path.join(targetDir, rootRel);

    if (fs.statSync(srcRoot).isFile()) {
      if (lite && !isLiteIncluded(rootRel)) continue;
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
      const relativePath = path.relative(FRAMEWORK_ROOT, srcFile);
      if (lite && !isLiteIncluded(relativePath.replace(/\\/g, "/"))) continue;
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

function applyProjectTemplateTokens(filePath, values) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  for (const [token, value] of Object.entries(values)) {
    if (!content.includes(token)) {
      continue;
    }
    content = content.split(token).join(value);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function listBaselineRecordRelativePaths(targetDir) {
  const baselineDir = getProjectFilePath(targetDir, "baseline-log");
  if (!fs.existsSync(baselineDir) || !fs.statSync(baselineDir).isDirectory()) {
    return [];
  }
  return fs.readdirSync(baselineDir)
    .filter((name) => name.endsWith(".md") && name !== ".DS_Store")
    .sort()
    .map((name) => path.posix.join("baseline-log", name));
}

function deriveBaselineContextFromExistingRecords(recordRelPaths, fallbackContext) {
  const preferredRelPath = [...recordRelPaths]
    .sort()
    .filter((relPath) => path.posix.basename(relPath).startsWith("BL-"))
    .pop() || [...recordRelPaths].sort().pop();

  if (!preferredRelPath) {
    return fallbackContext;
  }

  const baselineFileName = path.posix.basename(preferredRelPath);
  return {
    ...fallbackContext,
    baselineId: baselineFileName.replace(/\.md$/, ""),
    baselineFileName,
    baselineRecordRelPath: preferredRelPath,
  };
}

function createProjectFiles(targetDir, options = {}) {
  const { logger = defaultLogger } = options;
  const requestedBaselineContext = options.baselineContext || createInitialBaselineContext();
  const existingBaselineRecords = listBaselineRecordRelativePaths(targetDir);
  const baselineContext = existingBaselineRecords.length > 0
    ? deriveBaselineContextFromExistingRecords(existingBaselineRecords, requestedBaselineContext)
    : requestedBaselineContext;
  const createdPaths = [];

  ensureDir(getProjectRoot(targetDir));
  for (const dirName of PROJECT_CORE_ARTIFACT_DIRS) {
    ensureDir(getProjectFilePath(targetDir, dirName));
  }

  for (const fileName of PROJECT_CORE_ARTIFACT_FILES) {
    const destinationPath = getProjectFilePath(targetDir, fileName);
    if (copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(fileName),
      destinationPath,
      { logger }
    )) {
      createdPaths.push(destinationPath);
    }
  }

  const exampleSpecPath = getProjectFilePath(targetDir, path.join("specs", "example.spec.md"));
  if (copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath(path.join("specs", "example.spec.md")),
    exampleSpecPath,
    { logger }
  )) {
    createdPaths.push(exampleSpecPath);
  }

  if (existingBaselineRecords.length === 0) {
    const baselineRecordPath = getProjectFilePath(targetDir, baselineContext.baselineRecordRelPath);
    if (copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(BASELINE_LOG_TEMPLATE_FILE),
      baselineRecordPath,
      { logger }
    )) {
      createdPaths.push(baselineRecordPath);
    }
  }

  const tokenValues = {
    [TEMPLATE_TOKEN_INITIAL_BASELINE_ID]: baselineContext.baselineId,
    [TEMPLATE_TOKEN_INITIAL_BASELINE_FILE]: baselineContext.baselineFileName,
    [TEMPLATE_TOKEN_INITIAL_BASELINE_DATE]: baselineContext.confirmedDate,
  };
  for (const filePath of createdPaths) {
    applyProjectTemplateTokens(filePath, tokenValues);
  }
}

function getProjectArtifactEntries(targetDir, options = {}) {
  const baselineContext = options.baselineContext || createInitialBaselineContext();
  const baselineRecordRelPaths = listBaselineRecordRelativePaths(targetDir);
  return [
    ...PROJECT_CORE_ARTIFACT_FILES.map((relPath) => ({
      kind: "file",
      relPath: getProjectRelativePath(relPath),
      absolutePath: getProjectFilePath(targetDir, relPath),
    })),
    ...PROJECT_CORE_ARTIFACT_DIRS.map((relPath) => ({
      kind: "dir",
      relPath: getProjectRelativePath(relPath),
      absolutePath: getProjectFilePath(targetDir, relPath),
    })),
    ...(baselineRecordRelPaths.length > 0 ? baselineRecordRelPaths : [baselineContext.baselineRecordRelPath]).map((relPath) => ({
      kind: "file",
      relPath: getProjectRelativePath(relPath),
      absolutePath: getProjectFilePath(targetDir, relPath),
    })),
    {
      kind: "file",
      relPath: getProjectRelativePath(path.join("specs", "example.spec.md")),
      absolutePath: getProjectFilePath(targetDir, path.join("specs", "example.spec.md")),
    },
  ];
}

function buildInstallPlan(targetDir, options = {}) {
  const profile = getInstallProfile(options.installProfile);
  const overwriteFramework = Boolean(options.overwriteFramework);
  const lite = Boolean(options.lite);
  const baselineContext = options.baselineContext || createInitialBaselineContext();
  const frameworkFiles = listManagedFiles(FRAMEWORK_ROOT)
    .filter((relPath) => !lite || isLiteIncluded(relPath))
    .map((relPath) => {
    const destinationPath = path.join(targetDir, relPath);
    const exists = fs.existsSync(destinationPath);
    return {
      kind: "framework",
      relPath,
      absolutePath: destinationPath,
      exists,
      action: exists && !overwriteFramework ? "keep" : "copy",
    };
    });

  const metadataFiles = [
    getProjectRelativePath(PROJECT_METADATA_FILE),
    getProjectRelativePath(PROJECT_MANAGED_FILES_MANIFEST),
  ].map((relPath) => ({
    kind: "metadata",
    relPath,
    absolutePath: resolveProjectPath(targetDir, relPath),
    exists: fs.existsSync(resolveProjectPath(targetDir, relPath)),
    action: "write",
  }));

  const projectEntries = profile.includeProjectFiles
    ? getProjectArtifactEntries(targetDir, { baselineContext }).map((entry) => {
      const exists = fs.existsSync(entry.absolutePath);
      return {
        kind: entry.kind === "dir" ? "project-dir" : "project-file",
        relPath: entry.relPath,
        absolutePath: entry.absolutePath,
        exists,
        action: exists ? "keep" : "create",
      };
    })
    : [];

  const allEntries = [...frameworkFiles, ...metadataFiles, ...projectEntries];
  const summary = {
    frameworkCopyCount: frameworkFiles.filter((entry) => entry.action === "copy").length,
    frameworkKeepCount: frameworkFiles.filter((entry) => entry.action === "keep").length,
    metadataWriteCount: metadataFiles.length,
    projectCreateCount: projectEntries.filter((entry) => entry.action === "create").length,
    projectKeepCount: projectEntries.filter((entry) => entry.action === "keep").length,
    totalEntries: allEntries.length,
  };

  return {
    targetDir,
    profile,
    lite,
    entries: allEntries,
    frameworkFiles,
    metadataFiles,
    projectEntries,
    summary,
  };
}

function writeMetadata(targetDir, options = {}) {
  const metadataDir = getProjectRoot(targetDir);
  const metadataFile = getProjectFilePath(targetDir, PROJECT_METADATA_FILE);
  const frameworkVersion = readFrameworkVersion();
  const packageJson = readPackageJson();
  const profileName = getInstallProfile(
    options.installProfile || detectInstallProfileName(targetDir)
  ).name;
  const frameworkFootprint = normalizeFrameworkFootprint(
    options.frameworkFootprint || detectFrameworkFootprint(targetDir)
  );

  ensureDir(metadataDir);
  fs.writeFileSync(
    metadataFile,
    serializeSimpleToml({
      mode: "npx-git",
      framework_version: frameworkVersion,
      package_name: packageJson.name,
      package_version: packageJson.version,
      install_profile: profileName,
      framework_footprint: frameworkFootprint,
      managed_files_manifest: getProjectRelativePath(PROJECT_MANAGED_FILES_MANIFEST),
    }),
    "utf8"
  );
}

function writeManagedFilesManifest(targetDir, options = {}) {
  const manifestPath = getProjectFilePath(targetDir, PROJECT_MANAGED_FILES_MANIFEST);
  const frameworkFootprint = normalizeFrameworkFootprint(
    options.frameworkFootprint || detectFrameworkFootprint(targetDir)
  );
  const lines = listSourceManagedFiles({ frameworkFootprint })
    .filter((relPath) => fs.existsSync(path.join(targetDir, relPath)))
    .map((relPath) => `${sha256File(path.join(targetDir, relPath))}\t${relPath}`);
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, [...lines, ""].join("\n"), "utf8");
}

function removeManagedPaths(targetDir) {
  for (const relPath of MANAGED_ROOTS) {
    const absolutePath = path.join(targetDir, relPath);
    try {
      fs.lstatSync(absolutePath);
    } catch (_e) {
      continue;
    }
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// YAML utilities shared by project-state and CLI validators
// ---------------------------------------------------------------------------

function cleanYamlScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }
  const body = trimmed.slice(1, -1).trim();
  if (!body) {
    return [];
  }
  return body
    .split(",")
    .map((item) => cleanYamlScalar(item))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// ANSI output symbols and colors
// ---------------------------------------------------------------------------

const SYM_OK = "\x1b[32m✓\x1b[0m";
const SYM_FAIL = "\x1b[31m✗\x1b[0m";
const SYM_WARN = "\x1b[33m⚠\x1b[0m";

const C_RESET = "\x1b[0m";
const C_RED = "\x1b[31m";
const C_GREEN = "\x1b[32m";
const C_YELLOW = "\x1b[33m";
const C_CYAN = "\x1b[36m";
const C_DIM = "\x1b[2m";

// ---------------------------------------------------------------------------
// Validation schemas (section names for artifact validation)
// ---------------------------------------------------------------------------

const VALIDATION_SCHEMAS = {
  mission: [
    "1. 交付基线摘要",
    "2. 用户与闭环场景",
    "3. 已确认约束与关键决策",
    "4. 范围边界与非目标",
    "5. 稳定风险与外部依赖",
  ],
  missionLegacy: [
    ["1. 宿主项目与当前交付定义", "1. 当前交付定义", "1. 任务定义"],
    "2. 用户与场景",
    "3. 项目模式、质量目标与关键选型",
    "4. 范围边界",
    "5. 阶段计划",
    "6. 已知输入与待确认项",
    "7. 风险与外部依赖",
  ],
  missionLegacyHotspots: [
    "## 5. 阶段计划",
    "### 待确认项",
    "### 澄清问题清单",
    "### 需求变更同步记录",
    "**当前阶段**",
    "**最新需求基准状态**",
    "**最近一次用户确认**",
  ],
  baselineRecordFields: [
    "Type",
    "Status",
    "Summary",
    "Affects",
    "Confirmed At",
  ],
  design: [
    "1. 设计目标",
    "2. 信息架构",
    "3. 关键页面与交互",
    "4. 关键流程",
    "5. 视觉方向",
    "6. 设计确认记录",
    "7. 差异与待确认项",
  ],
  releasePlan: [
    "1. 交付前检查",
    "2. 变更范围与依赖",
    "3. 发布步骤",
    "4. 运行态验证",
    "5. 回滚触发条件",
    "6. 交付说明与移交",
  ],
  memory: [
    "元数据",
    "1. 设计决策",
    "2. 逻辑与契约决策",
    "3. 工程约束",
    "4. 用户偏好",
    "5. 已知坑点",
  ],
  state: [
    "当前方位",
    "进度概览",
    "已锁定内容",
    "待确认项",
    "最近偏差 / 回退",
    "下一步",
    "最小阅读集",
  ],
  statePositionFields: [
    "项目模式",
    "当前阶段",
    "当前目标",
    "当前任务",
    "当前交付档位",
    "当前质量焦点",
    "当前确认停点",
    "最新需求基准状态",
  ],
  stateDeprecatedPositionFields: [
    "阶段",
  ],
  spec: [
    "1. 模块概述",
    "2. 业务规则与目标",
    "3. 界面 / 接口 / 命令清单",
    "4. 关键流程与状态流转",
    "5. 数据与契约",
    "6. 边界条件与异常处理",
    "7. 验收与证据",
  ],
  specMarkers: [
    "**交互模式**",
    "**推荐模式理由**",
    "**拒绝的交互模式**",
    "**契约基准**",
    "**字段映射/适配说明**",
    "**集成触点**",
    "**异常/空数据证据**",
  ],
  riskRegisterTablePattern: /\| ID \| 风险 \| 类型 \|/,
  tasksMarkers: [
    "version:",
    "baseline_id:",
    "milestones:",
    "tasks:",
    "wave:",
    "execution_role:",
    "approval_required:",
    "context_files:",
    "definition_of_ready:",
    "definition_of_done:",
    "evidence_required:",
    "parity_evidence_required:",
    "measurable_outcome:",
    "edge_cases:",
  ],
  tasksTransitionalMarkers: [
    "impact_tags:",
    "derived_checks:",
    "risk_triggers:",
  ],
  acceptanceMarkers: [
    "version:",
    "baseline_id:",
    "scope:",
    "gates:",
    "design-confirmation",
    "logic-confirmation",
    "implementation-quality",
    "delivery-readiness",
    "parity-gate",
  ],
  acceptanceMarkersTransitional: [
    "quality_tier:",
    "required_special_reviews:",
    "contract-baseline-check",
    "degraded-path-check",
    "static-validation-check",
    "manual-action-note",
  ],
  verificationMatrixMarkers: [
    "commands:",
    "rules:",
    "impact_rules:",
  ],
  releasePlanMarkersTransitional: [
    "AI 已完成",
    "需人工执行",
    "静态校验",
  ],
};

// ---------------------------------------------------------------------------
// IDE integration — generate Cursor / Claude Code / Antigravity files
// ---------------------------------------------------------------------------

const IDE_GENERATED_MARKER = "<!-- ai-os-generated -->";

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { name: "", description: "", body: content };
  const fm = match[1];
  const body = content.slice(match[0].length);
  let name = "";
  let description = "";
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  if (nameMatch) name = nameMatch[1].trim();
  const descMatch = fm.match(/^description:\s*(.+)$/m);
  if (descMatch) {
    const val = descMatch[1].trim();
    if (val !== ">" && val !== ">-") {
      description = val;
    }
  }
  if (!description) {
    const multiDescMatch = fm.match(/^description:\s*>-?\s*\n([\s\S]*?)(?=\n[a-zA-Z_-]+:|\s*$)/m);
    if (multiDescMatch) {
      description = multiDescMatch[1].replace(/\n\s+/g, " ").trim();
    }
  }
  return { name, description, body };
}

function sanitizeSlug(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Collect workflow metadata from the installed .agents/workflows/ directory.
 * Returns array of { slug, name, description, filePath }.
 */
function collectWorkflows(targetDir) {
  const workflowsDir = path.join(targetDir, ".agents", "workflows");
  if (!fs.existsSync(workflowsDir)) return [];
  const results = [];
  const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".md") && f !== "AGENTS.md");
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
    const { name, description } = extractFrontmatter(content);
    const slug = file.replace(/\.md$/, "");
    results.push({
      slug,
      name: name || slug,
      description: description || `AI-OS /${slug} workflow`,
      filePath: `.agents/workflows/${file}`,
    });
  }
  return results;
}

/**
 * Collect skill metadata from the installed .agents/skills/ directory.
 * Returns array of { slug, name, description, filePath }.
 */
function collectSkills(targetDir) {
  const skillsDir = path.join(targetDir, ".agents", "skills");
  if (!fs.existsSync(skillsDir)) return [];
  const results = [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, "utf8");
    const { name, description } = extractFrontmatter(content);
    results.push({
      slug: entry.name,
      name: name || entry.name,
      description: description || `AI-OS skill: ${entry.name}`,
      filePath: `.agents/skills/${entry.name}/SKILL.md`,
    });
  }
  return results;
}

const WORKFLOW_CURSOR_DESCRIPTIONS = {
  align: "AI-OS /align workflow：澄清目标、用户、范围、项目模式和质量标准。当用户提到 /align、需求对齐、项目启动、需求不清、目标确认、clarify goals 时触发。",
  design: "AI-OS /design workflow：锁定信息架构、关键页面、交互和视觉方向。当用户提到 /design、设计方案、锁定设计、页面设计、UI设计、lock design 时触发。",
  plan: "AI-OS /plan workflow：生成 spec、任务波次和验收计划。当用户提到 /plan、任务拆解、拆任务、规划任务、task planning 时触发。",
  build: "AI-OS /build workflow：按 wave 实现已确认的任务。当用户提到 /build、开始实现、开始开发、start building、implement 时触发。",
  verify: "AI-OS /verify workflow：验证设计一致性、逻辑正确性和交付证据。当用户提到 /verify、验证、验收、质量检查、quality check 时触发。",
  ship: "AI-OS /ship workflow：交付、发布、回滚和移交。当用户提到 /ship、发布、上线、交付、deploy、release 时触发。",
  "change-request": "AI-OS /change-request workflow：需求变更管理。当用户提到 /change-request、需求变更、改需求、scope change 时触发。",
  debug: "AI-OS /debug workflow：单点 bug 修复的轻量闭环。当用户提到 /debug、修 bug、调试、fix bug、troubleshoot 时触发。",
  review: "AI-OS /review workflow：多维度结构化审查。当用户提到 /review、代码审查、方案审查、code review 时触发。",
  postmortem: "AI-OS /postmortem workflow：复盘并沉淀经验。当用户提到 /postmortem、复盘、回顾、retrospective 时触发。",
  status: "AI-OS /status workflow：查看当前方位和进度。当用户提到 /status、项目状态、当前进度、project status 时触发。",
  next: "AI-OS /next workflow：推断下一个就绪任务。当用户提到 /next、下一步、接下来做什么、what's next 时触发。",
  resume: "AI-OS /resume workflow：恢复项目上下文。当用户提到 /resume、恢复上下文、继续项目、resume project 时触发。",
  "auto-advance": "AI-OS /auto-advance workflow：自动按任务波次推进。当用户提到 /auto-advance、自动推进、批量执行 时触发。",
};

const WORKFLOW_SUMMARIES = {
  align: "当用户需要澄清项目目标、启动新项目或处理模糊需求时使用。\n\n## 快速入口\n\n- 新项目/新模块/需求模糊 → 完整 /align\n- 已有项目局部变更 → 轻量确认目标、范围、验收",
  design: "当需要锁定关键页面、信息架构、交互和视觉方向时使用。\n\n## 快速入口\n\n- 有设计素材（截图/参考站） → 先收敛为 IA 和关键页面\n- 纯技术方案 → 锁定架构、接口和状态流转",
  plan: "当需求和设计已确认，需要拆解为可执行任务时使用。\n\n## 快速入口\n\n- P0 任务 → 完整拆解 spec / tasks / acceptance\n- P1 任务 → 轻量任务清单 + 验收标准",
  build: "当任务已确认，准备按 wave 实现时使用。\n\n## 快速入口\n\n- 有审批停点的任务 → 逐个确认后推进\n- 简单任务 → 按波次批量实现",
  verify: "当实现完成，需要验证质量和收集交付证据时使用。\n\n## 快速入口\n\n- 逐项核验需求 / 设计 / spec 的覆盖\n- 收集编译、测试、运行态证据",
  ship: "当验证通过，准备交付和发布时使用。\n\n## 快速入口\n\n- 输出交付说明、已实现/未实现清单\n- 确认回滚条件和人工操作清单",
  "change-request": "当已确认的需求发生变化时使用。\n\n## 快速入口\n\n- 先分析影响范围\n- 更新 MISSION / spec / DESIGN 基准后再执行",
  debug: "当遇到单点 bug 或轻量改动时使用。\n\n## 快速入口\n\n- 先定界：根因、影响、修复方案\n- 确认后定点修改 + 回归验证",
  review: "当需要对方案或代码做结构化审查时使用。\n\n## 快速入口\n\n- 输出带风险等级的问题清单\n- 按维度逐项审查",
  postmortem: "当项目或里程碑完成后需要复盘时使用。\n\n## 快速入口\n\n- 做得好/做得不好/改进措施\n- 沉淀到 memory.md",
  status: "查看当前项目状态、进度和待确认项。",
  next: "推断当前最值得执行且已满足条件的就绪任务。",
  resume: "从 STATE.md 恢复项目上下文和最小阅读集，用于新 session 或中断后继续。",
  "auto-advance": "在设计门和逻辑门通过后，按任务波次自动推进实现。需要用户明确授权。",
};

// --- Cursor generation ---

function generateCursorConstitutionRule(targetDir) {
  const cursorRulesDir = path.join(targetDir, ".cursor", "rules");
  ensureDir(cursorRulesDir);

  const agentsMdPath = path.join(targetDir, "AGENTS.md");
  if (!fs.existsSync(agentsMdPath)) return 0;

  const constitution = fs.readFileSync(agentsMdPath, "utf8");

  const workflowRouterPath = path.join(targetDir, ".agents", "workflows", "AGENTS.md");
  let routerSection = "";
  if (fs.existsSync(workflowRouterPath)) {
    routerSection = "\n\n---\n\n" + fs.readFileSync(workflowRouterPath, "utf8");
  }

  const skillRouterPath = path.join(targetDir, ".agents", "skills", "AGENTS.md");
  if (fs.existsSync(skillRouterPath)) {
    routerSection += "\n\n---\n\n" + fs.readFileSync(skillRouterPath, "utf8");
  }

  const lines = [
    "---",
    'description: "AI-OS delivery constitution — core rules for all AI actions in this project"',
    "alwaysApply: true",
    "---",
    "",
    IDE_GENERATED_MARKER,
    "",
    constitution.trim(),
    routerSection.trim(),
    "",
  ];

  fs.writeFileSync(
    path.join(cursorRulesDir, "ai-os-constitution.mdc"),
    lines.join("\n"),
    "utf8"
  );
  return 1;
}

function generateCursorSkills(targetDir) {
  const cursorSkillsDir = path.join(targetDir, ".cursor", "skills");
  let count = 0;

  const workflows = collectWorkflows(targetDir);
  for (const wf of workflows) {
    const skillDir = path.join(cursorSkillsDir, `ai-os-${sanitizeSlug(wf.slug)}`);
    ensureDir(skillDir);

    const desc = WORKFLOW_CURSOR_DESCRIPTIONS[wf.slug] ||
      `AI-OS /${wf.slug} workflow：${wf.description}。当用户提到 /${wf.slug} 时触发。`;
    const summary = WORKFLOW_SUMMARIES[wf.slug] || wf.description;

    const content = [
      "---",
      `name: ai-os-${sanitizeSlug(wf.slug)}`,
      "description: >-",
      `  ${desc}`,
      "---",
      IDE_GENERATED_MARKER,
      "",
      `# /${wf.slug} — ${wf.description}`,
      "",
      summary,
      "",
      "## 详细流程",
      "",
      `完整的 /${wf.slug} 工作流定义在 \`${wf.filePath}\`，请阅读该文件获取完整步骤和禁止事项。`,
      "",
    ];

    fs.writeFileSync(path.join(skillDir, "SKILL.md"), content.join("\n"), "utf8");
    count += 1;
  }

  const skills = collectSkills(targetDir);
  for (const sk of skills) {
    const skillDir = path.join(cursorSkillsDir, `ai-os-${sanitizeSlug(sk.slug)}`);
    ensureDir(skillDir);

    const content = [
      "---",
      `name: ai-os-${sanitizeSlug(sk.slug)}`,
      "description: >-",
      `  AI-OS skill：${sk.description}`,
      "---",
      IDE_GENERATED_MARKER,
      "",
      `# ${sk.name}`,
      "",
      sk.description,
      "",
      "## 详细指引",
      "",
      `完整的 skill 定义在 \`${sk.filePath}\`，请阅读该文件获取完整步骤。`,
      "",
    ];

    fs.writeFileSync(path.join(skillDir, "SKILL.md"), content.join("\n"), "utf8");
    count += 1;
  }

  return count;
}

// --- Claude Code generation ---

function generateClaudeMd(targetDir) {
  const claudePath = path.join(targetDir, "CLAUDE.md");

  if (fs.existsSync(claudePath)) {
    const existing = fs.readFileSync(claudePath, "utf8");
    if (!existing.includes(IDE_GENERATED_MARKER)) return 0;
  }

  const workflows = collectWorkflows(targetDir);
  const skills = collectSkills(targetDir);

  const wfRows = workflows.map((wf) =>
    `| /${wf.slug} | ${wf.description} | \`${wf.filePath}\` |`
  );

  const skRows = skills.map((sk) =>
    `| ${sk.name} | ${sk.description.slice(0, 80)}${sk.description.length > 80 ? "…" : ""} | \`${sk.filePath}\` |`
  );

  const lines = [
    IDE_GENERATED_MARKER,
    "",
    "# AI-OS 项目交付操作系统",
    "",
    "本项目使用 AI-OS 进行交付管理。完整规则见 `AGENTS.md`。",
    "",
    "## 会话初始化",
    "",
    "每次新 session 启动时，依次读取以下文件了解项目当前状态：",
    "",
    "1. `.ai-os/STATE.md` — 当前阶段、进度和待确认项",
    "2. `.ai-os/MISSION.md` — 已确认的当前交付基线章程",
    "3. `.ai-os/baseline-log/` — 最近的共享基线记录目录（优先读最新 confirmed 记录）",
    "4. `.ai-os/memory.md` — 稳定决策和约束（优先读 active 条目）",
    "",
    "如果上述文件不存在，说明项目尚未初始化，从 `/align` 开始。",
    "",
    "## 核心原则",
    "",
    "- 无已确认需求基准不编写业务代码",
    "- 关键设计和逻辑未锁定不大规模实现",
    "- 需求变更先更新基准再改代码",
    "- 完成必须有证据，不接受口头声明",
    "- 详细规则见 `AGENTS.md`",
    "",
    "## Workflow 命令",
    "",
    "| 命令 | 用途 | 详细流程 |",
    "|------|------|---------|",
    ...wfRows,
    "",
    "## Skill 能力",
    "",
    "遇到以下场景时，读取对应 skill 文件获取详细指引：",
    "",
    "| Skill | 触发场景 | 文件 |",
    "|-------|---------|------|",
    ...skRows,
    "",
    "## 分级流程",
    "",
    "- **P0**（新项目/大变更）：/align → /design → /plan → /build → /verify → /ship",
    "- **P1**（小功能）：/change-request → /plan → /build → /verify",
    "- **P2**（bug/微调）：/debug（方案确认 → 定界修改 → 验证回归）",
    "",
  ];

  fs.writeFileSync(claudePath, lines.join("\n"), "utf8");
  return 1;
}

// --- Antigravity (Gemini) generation ---

function generateGeminiMd(targetDir) {
  const geminiPath = path.join(targetDir, "GEMINI.md");

  if (fs.existsSync(geminiPath)) {
    const existing = fs.readFileSync(geminiPath, "utf8");
    if (!existing.includes(IDE_GENERATED_MARKER)) return 0;
  }

  const workflows = collectWorkflows(targetDir);

  const wfRows = workflows.map((wf) =>
    `| /${wf.slug} | ${wf.description} | \`${wf.filePath}\` |`
  );

  const lines = [
    IDE_GENERATED_MARKER,
    "",
    "# AI-OS 项目交付操作系统",
    "",
    "本项目使用 AI-OS 进行交付管理。完整规则已在 `AGENTS.md` 中定义（Antigravity 会自动加载）。",
    "本文件提供补充的快速参考。",
    "",
    "## 会话初始化",
    "",
    "每次新 session 启动时，依次读取：",
    "",
    "1. `.ai-os/STATE.md` — 当前阶段和进度",
    "2. `.ai-os/MISSION.md` — 已确认的当前交付基线",
    "3. `.ai-os/baseline-log/` — 最新基线确认记录目录",
    "4. `.ai-os/memory.md` — 稳定决策和约束",
    "",
    "## Workflow 命令",
    "",
    "| 命令 | 用途 | 详细流程 |",
    "|------|------|---------|",
    ...wfRows,
    "",
    "## Skill 引用",
    "",
    "专项能力定义在 `.agents/skills/` 下，每个子目录包含 `SKILL.md`。",
    "关键 skill 触发条件见 `.agents/skills/AGENTS.md`。",
    "",
  ];

  fs.writeFileSync(geminiPath, lines.join("\n"), "utf8");
  return 1;
}

// --- Clean generated IDE files ---

function cleanGeneratedIdeFiles(targetDir) {
  let removed = 0;

  const cursorRulesDir = path.join(targetDir, ".cursor", "rules");
  if (fs.existsSync(cursorRulesDir)) {
    for (const file of fs.readdirSync(cursorRulesDir).filter((f) => f.endsWith(".mdc"))) {
      const content = fs.readFileSync(path.join(cursorRulesDir, file), "utf8");
      if (content.includes(IDE_GENERATED_MARKER)) {
        fs.unlinkSync(path.join(cursorRulesDir, file));
        removed += 1;
      }
    }
  }

  const cursorSkillsDir = path.join(targetDir, ".cursor", "skills");
  if (fs.existsSync(cursorSkillsDir)) {
    for (const entry of fs.readdirSync(cursorSkillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("ai-os-")) continue;
      const skillMd = path.join(cursorSkillsDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillMd)) {
        const content = fs.readFileSync(skillMd, "utf8");
        if (content.includes(IDE_GENERATED_MARKER)) {
          fs.rmSync(path.join(cursorSkillsDir, entry.name), { recursive: true, force: true });
          removed += 1;
        }
      }
    }
  }

  for (const file of ["CLAUDE.md", "GEMINI.md"]) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes(IDE_GENERATED_MARKER)) {
        fs.unlinkSync(filePath);
        removed += 1;
      }
    }
  }

  return removed;
}

/**
 * Generate IDE integration files for Cursor, Claude Code, and Antigravity.
 * Codex CLI needs no extra files (.agents/skills/ is natively compatible).
 */
function generateIdeFiles(targetDir, options = {}) {
  const { logger = defaultLogger } = options;

  if (!fs.existsSync(path.join(targetDir, "AGENTS.md"))) return null;

  cleanGeneratedIdeFiles(targetDir);

  const count = { cursor: 0, claude: 0, gemini: 0 };

  count.cursor += generateCursorConstitutionRule(targetDir);
  count.cursor += generateCursorSkills(targetDir);
  count.claude += generateClaudeMd(targetDir);
  count.gemini += generateGeminiMd(targetDir);

  logger(
    `IDE integration: Cursor (1 rule + ${count.cursor - 1} skills), ` +
    `Claude Code (CLAUDE.md), Antigravity (GEMINI.md)`
  );

  return count;
}

// ---------------------------------------------------------------------------
// Shared argument parsing
// ---------------------------------------------------------------------------

function parseCliArgs(argv, spec = {}) {
  const booleanFlags = spec.booleanFlags || [];
  const valuedFlags = spec.valuedFlags || [];
  const result = { positional: "", flags: {} };

  for (const flag of booleanFlags) {
    result.flags[flag.replace(/^--/, "")] = false;
  }

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      result.flags.help = true;
      continue;
    }
    if (booleanFlags.includes(arg)) {
      result.flags[arg.replace(/^--/, "")] = true;
      continue;
    }
    const valuedMatch = valuedFlags.find((f) => arg === f);
    if (valuedMatch) {
      if (i + 1 >= args.length) {
        fail(`${arg} requires a value`);
      }
      result.flags[arg.replace(/^--/, "")] = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      fail(`unknown option: ${arg}`);
    }
    if (result.positional) {
      fail(`unexpected argument: ${arg}`);
    }
    result.positional = arg;
  }

  return result;
}

function resolveTargetDir(positionalArg) {
  const targetDir = path.resolve(positionalArg || ".");
  if (!fs.existsSync(targetDir)) {
    fail(`target directory does not exist: ${targetDir}`);
  }
  return targetDir;
}

// ---------------------------------------------------------------------------
// Shared reporter factory
// ---------------------------------------------------------------------------

function createReporter() {
  let hasFailure = false;
  let warningCount = 0;

  function report(ok, label, options = {}) {
    const { warnOnly = false, details = [] } = typeof options === "object" && !Array.isArray(options)
      ? options
      : { details: Array.isArray(options) ? options : [] };

    if (ok) {
      process.stdout.write(`  ${SYM_OK}  ${label}\n`);
      return;
    }

    if (warnOnly) {
      warningCount += 1;
      process.stdout.write(`  ${SYM_WARN}  ${label}\n`);
    } else {
      hasFailure = true;
      process.stdout.write(`  ${SYM_FAIL}  ${label}\n`);
    }

    for (const detail of details) {
      process.stdout.write(`       - ${detail}\n`);
    }
  }

  return {
    report,
    markFailure() { hasFailure = true; },
    get hasFailure() { return hasFailure; },
    get warningCount() { return warningCount; },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PACKAGE_ROOT,
  FRAMEWORK_ROOT,
  INSTALL_PROFILES_MANIFEST,
  MANAGED_ROOTS,
  PROJECT_STATE_ROOT,
  PROJECT_METADATA_FILE,
  PROJECT_MANAGED_FILES_MANIFEST,
  PROJECT_TEMPLATE_ROOT,
  PROJECT_CORE_ARTIFACT_FILES,
  PROJECT_OPTIONAL_ARTIFACT_FILES,
  PROJECT_ARTIFACT_FILES,
  PROJECT_CORE_ARTIFACT_DIRS,
  PROJECT_OPTIONAL_ARTIFACT_DIRS,
  PROJECT_ARTIFACT_DIRS,
  LITE_INCLUDES,
  LITE_DIR_PREFIXES,
  isLiteIncluded,
  QUALITY_TIERS,
  IMPACT_TAGS,
  HIGH_RISK_SPECIAL_REVIEWS,
  readFrameworkVersion,
  readPackageJson,
  readInstallProfiles,
  detectInstallProfileName,
  detectFrameworkFootprint,
  getDefaultInstallProfileName,
  getInstallProfile,
  listSourceManagedFiles,
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
  serializeSimpleToml,
  readInstalledMeta,
  copyFileWithMode,
  getProjectTemplatePath,
  copyFramework,
  copyTemplateIfMissing,
  createProjectFiles,
  getProjectArtifactEntries,
  buildInstallPlan,
  writeMetadata,
  writeManagedFilesManifest,
  removeManagedPaths,
  appendGitignoreEntries,
  appendGitattributesEntries,
  GITIGNORE_ENTRIES,
  GITATTRIBUTES_ENTRIES,
  cleanYamlScalar,
  parseInlineArray,
  SYM_OK,
  SYM_FAIL,
  SYM_WARN,
  C_RESET,
  C_RED,
  C_GREEN,
  C_YELLOW,
  C_CYAN,
  C_DIM,
  parseCliArgs,
  resolveTargetDir,
  createReporter,
  VALIDATION_SCHEMAS,
  IDE_GENERATED_MARKER,
  generateIdeFiles,
  cleanGeneratedIdeFiles,
};
