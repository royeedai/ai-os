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
const FRAMEWORK_ROOT = path.join(PACKAGE_ROOT, "framework");
const MANAGED_ROOTS = ["AGENTS.md", ".agents"];
const PROJECT_STATE_ROOT = ".ai-os";
const PROJECT_METADATA_FILE = "framework.toml";
const PROJECT_MANAGED_FILES_MANIFEST = "managed-files.tsv";
const PROJECT_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "project");

const PROJECT_CORE_ARTIFACT_FILES = [
  "MISSION.md",
  "DESIGN.md",
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
const PROJECT_CORE_ARTIFACT_DIRS = ["specs"];
const PROJECT_OPTIONAL_ARTIFACT_DIRS = ["design-pack", "evals"];
const PROJECT_ARTIFACT_FILES = [
  ...PROJECT_CORE_ARTIFACT_FILES,
  ...PROJECT_OPTIONAL_ARTIFACT_FILES,
];
const PROJECT_ARTIFACT_DIRS = [
  ...PROJECT_CORE_ARTIFACT_DIRS,
  ...PROJECT_OPTIONAL_ARTIFACT_DIRS,
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

function normalizeRelativePath(relPath = "") {
  return relPath.replace(/\\/g, "/").replace(/^\.\//, "");
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
    const srcRoot = path.join(FRAMEWORK_ROOT, rootRel);
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
      const relativePath = path.relative(FRAMEWORK_ROOT, srcFile);
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

  ensureDir(getProjectRoot(targetDir));
  for (const dirName of PROJECT_CORE_ARTIFACT_DIRS) {
    ensureDir(getProjectFilePath(targetDir, dirName));
  }

  for (const fileName of PROJECT_CORE_ARTIFACT_FILES) {
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
    "1. 任务定义",
    "2. 用户与场景",
    "3. 项目模式、质量目标与关键选型",
    "4. 范围边界",
    "5. 阶段计划",
    "6. 已知输入与待确认项",
    "7. 风险与外部依赖",
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
    "mission:",
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
  ],
  tasksTransitionalMarkers: [
    "impact_tags:",
    "derived_checks:",
    "risk_triggers:",
  ],
  acceptanceMarkers: [
    "version:",
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
  ],
  verificationMatrixMarkers: [
    "commands:",
    "rules:",
    "impact_rules:",
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PACKAGE_ROOT,
  FRAMEWORK_ROOT,
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
  QUALITY_TIERS,
  IMPACT_TAGS,
  HIGH_RISK_SPECIAL_REVIEWS,
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
  VALIDATION_SCHEMAS,
};
