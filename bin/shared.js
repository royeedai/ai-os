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
const LITE_INCLUDES = [
  "AGENTS.md",
  ".agents/workflows/AGENTS.md",
  ".agents/workflows/align.md",
  ".agents/workflows/design.md",
  ".agents/workflows/build.md",
  ".agents/workflows/verify.md",
  ".agents/workflows/debug.md",
  ".agents/skills/AGENTS.md",
  ".agents/skills/acceptance-gate/SKILL.md",
  ".agents/skills/memory-manager/SKILL.md",
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
];

const GITATTRIBUTES_MARKER = "# AI-OS merge strategies";
const GITATTRIBUTES_ENTRIES = [
  `${GITATTRIBUTES_MARKER}`,
  `${PROJECT_STATE_ROOT}/memory.md merge=union`,
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
 * Append AI-OS merge strategy entries to .gitattributes if not already present.
 * Idempotent — skips if the marker comment is found.
 */
function appendGitattributesEntries(targetDir, options = {}) {
  const { logger = defaultLogger } = options;
  const gitattrsPath = path.join(targetDir, ".gitattributes");

  let existing = "";
  if (fs.existsSync(gitattrsPath)) {
    existing = fs.readFileSync(gitattrsPath, "utf8");
    if (existing.includes(GITATTRIBUTES_MARKER)) {
      logger("skip .gitattributes (AI-OS entries already present)");
      return false;
    }
  }

  const separator = existing && !existing.endsWith("\n") ? "\n\n" : existing ? "\n" : "";
  fs.writeFileSync(
    gitattrsPath,
    existing + separator + GITATTRIBUTES_ENTRIES.join("\n") + "\n",
    "utf8"
  );
  logger("appended AI-OS merge strategies to .gitattributes");
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

function getProjectArtifactEntries(targetDir) {
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
    ? getProjectArtifactEntries(targetDir).map((entry) => {
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
    ["1. 宿主项目与当前交付定义", "1. 当前交付定义", "1. 任务定义"],
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
};
