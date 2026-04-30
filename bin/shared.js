/**
 * AI-OS v9 CLI shared utilities
 *
 * Zero external dependencies. Used by create-ai-os, ai-os-doctor, and ai-os-upgrade.
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const FRAMEWORK_ROOT = path.join(PACKAGE_ROOT, "framework");
const SHARED_ROOT_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "shared-root");
const LANE_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "lane");
const IDE_POINTERS_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "ide-pointers");
const ROOT_AGENTS_FILE = path.join(PACKAGE_ROOT, "AGENTS.md");

const PROJECT_STATE_ROOT = ".ai-os";
const LANES_ROOT = "lanes";
const DEFAULT_LANE_ID = "default";
const METADATA_FILE = "framework.toml";
const MANAGED_FILES_MANIFEST = "managed-files.tsv";
const LAYOUT_VERSION = "9";
const LAYOUT_MODE_DEFAULT = "shared-root-default-lane";
const LAYOUT_MODE_ROOT_ONLY = "root-only-legacy";
const LAYOUT_MODE_HYBRID = "hybrid-drift";
const LAYOUT_MODE_UNKNOWN = "unknown";

// Initial baseline placeholders
const TEMPLATE_TOKEN_INITIAL_BASELINE_ID = "{{INITIAL_BASELINE_ID}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_FILE = "{{INITIAL_BASELINE_FILE}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_DATE = "{{INITIAL_BASELINE_DATE}}";
const INITIAL_BASELINE_SLUG = "initial-baseline";

// Shared root artifacts (v9)
const SHARED_ROOT_FILES = [
  "MISSION.md",
  "memory.md",
];

// Lane artifacts (v9)
const LANE_CORE_FILES = [
  "MISSION.md",
  "DESIGN.md",
  "STATE.md",
];
const LANE_CORE_DIRS = [
  "baseline-log",
];
const LANE_EXTENSION_FILES = [
  "tasks.yaml",
  "risk-register.md",
  "release-plan.md",
  "verification-matrix.yaml",
];
const LANE_EXTENSION_DIRS = [
  "specs",
  "design-pack",
  "evals",
];
const ALL_LANE_FILES = [...LANE_CORE_FILES, ...LANE_EXTENSION_FILES];
const ALL_LANE_DIRS = [...LANE_CORE_DIRS, ...LANE_EXTENSION_DIRS];

// Legacy root-only lane-scoped artifacts from v8
const ROOT_ONLY_LEGACY_FILES = [
  "MISSION.md",
  "DESIGN.md",
  "STATE.md",
  "tasks.yaml",
  "risk-register.md",
  "release-plan.md",
  "verification-matrix.yaml",
];
const ROOT_ONLY_LEGACY_DIRS = [
  "baseline-log",
  "specs",
  "design-pack",
  "evals",
];

// Files that are session-local (never version-controlled)
const SESSION_LOCAL_FILES = ["STATE.md"];

// IDE integration files (root-level, cross-tool)
const IDE_POINTER_FILES = ["CLAUDE.md", "GEMINI.md"];

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

function readFrameworkVersion() {
  try {
    const raw = fs.readFileSync(path.join(PACKAGE_ROOT, "VERSION"), "utf8").trim();
    return raw || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readPackageJson() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, "package.json"), "utf8"));
  } catch {
    return { name: "create-ai-os", version: "0.0.0" };
  }
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function fail(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileExists(absPath) {
  try {
    fs.accessSync(absPath);
    return true;
  } catch {
    return false;
  }
}

function isDirectory(absPath) {
  return fileExists(absPath) && fs.statSync(absPath).isDirectory();
}

function readText(absPath) {
  return fileExists(absPath) ? fs.readFileSync(absPath, "utf8") : "";
}

// ---------------------------------------------------------------------------
// Baseline ID
// ---------------------------------------------------------------------------

function formatTimestamp(date = new Date()) {
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}${m}${d}-${h}${mm}${s}`;
}

function generateInitialBaseline() {
  const ts = formatTimestamp();
  const id = `BL-${ts}-${INITIAL_BASELINE_SLUG}`;
  return {
    id,
    file: `${id}.md`,
    date: new Date().toISOString(),
  };
}

function replaceBaselineTokens(content, baseline) {
  return content
    .split(TEMPLATE_TOKEN_INITIAL_BASELINE_ID).join(baseline.id)
    .split(TEMPLATE_TOKEN_INITIAL_BASELINE_FILE).join(baseline.file)
    .split(TEMPLATE_TOKEN_INITIAL_BASELINE_DATE).join(baseline.date);
}

function renderTemplate(srcPath, baseline) {
  let content = fs.readFileSync(srcPath, "utf8");
  if (baseline) content = replaceBaselineTokens(content, baseline);
  return content;
}

// ---------------------------------------------------------------------------
// AGENTS.md installation
// ---------------------------------------------------------------------------

function installAgentsMd(targetDir, { overwrite = false } = {}) {
  const destPath = path.join(targetDir, "AGENTS.md");
  if (fileExists(destPath) && !overwrite) return false;
  if (!fileExists(ROOT_AGENTS_FILE)) {
    fail(`Missing source AGENTS.md at ${ROOT_AGENTS_FILE}`);
  }
  fs.copyFileSync(ROOT_AGENTS_FILE, destPath);
  return true;
}

// ---------------------------------------------------------------------------
// v9 artifact installation
// ---------------------------------------------------------------------------

function getAiOsDir(targetDir) {
  return path.join(targetDir, PROJECT_STATE_ROOT);
}

function getLaneDir(targetDir, laneId = DEFAULT_LANE_ID) {
  return path.join(getAiOsDir(targetDir), LANES_ROOT, laneId);
}

function writeTemplateFile(src, dest, { overwrite = false, baseline = null } = {}) {
  if (!fileExists(src)) return false;
  if (fileExists(dest) && !overwrite) return false;
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, renderTemplate(src, baseline));
  return true;
}

function installArtifacts(targetDir, { overwrite = false, laneId = DEFAULT_LANE_ID, createInitialBaselineRecord = true } = {}) {
  const baseline = generateInitialBaseline();
  const aiOsDir = getAiOsDir(targetDir);
  const laneDir = getLaneDir(targetDir, laneId);
  ensureDir(aiOsDir);
  ensureDir(laneDir);

  const installed = [];

  for (const file of SHARED_ROOT_FILES) {
    const src = path.join(SHARED_ROOT_TEMPLATE_ROOT, file);
    const dest = path.join(aiOsDir, file);
    if (writeTemplateFile(src, dest, { overwrite })) {
      installed.push(`${PROJECT_STATE_ROOT}/${file}`);
    }
  }

  const laneTomlSrc = path.join(LANE_TEMPLATE_ROOT, "lane.toml");
  const laneTomlDest = path.join(laneDir, "lane.toml");
  if (writeTemplateFile(laneTomlSrc, laneTomlDest, { overwrite, baseline })) {
    installed.push(`${PROJECT_STATE_ROOT}/${LANES_ROOT}/${laneId}/lane.toml`);
  }

  for (const file of ALL_LANE_FILES) {
    const src = path.join(LANE_TEMPLATE_ROOT, file);
    const dest = path.join(laneDir, file);
    if (writeTemplateFile(src, dest, { overwrite, baseline })) {
      installed.push(`${PROJECT_STATE_ROOT}/${LANES_ROOT}/${laneId}/${file}`);
    }
  }

  for (const dirName of ALL_LANE_DIRS) {
    const srcDir = path.join(LANE_TEMPLATE_ROOT, dirName);
    const destDir = path.join(laneDir, dirName);
    if (!fileExists(srcDir)) continue;
    ensureDir(destDir);
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (dirName === "baseline-log" && !createInitialBaselineRecord) continue;
      const srcFile = path.join(srcDir, entry.name);
      let destName = entry.name;
      if (dirName === "baseline-log" && destName === "BL-template.md") {
        destName = `${baseline.id}.md`;
      }
      const destFile = path.join(destDir, destName);
      if (fileExists(destFile) && !overwrite) continue;
      fs.writeFileSync(destFile, renderTemplate(srcFile, baseline));
      installed.push(`${PROJECT_STATE_ROOT}/${LANES_ROOT}/${laneId}/${dirName}/${destName}`);
    }
  }

  return { installed, baseline };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

function writeMetadata(targetDir, { version, layoutMode = LAYOUT_MODE_DEFAULT } = {}) {
  const dir = getAiOsDir(targetDir);
  ensureDir(dir);
  const tomlPath = path.join(dir, METADATA_FILE);
  const now = new Date().toISOString();
  const existing = readMetadata(targetDir);
  const installedAt = existing && existing.installed_at ? existing.installed_at : now;
  const contents = [
    "# AI-OS framework metadata",
    `schema_version = "${LAYOUT_VERSION}"`,
    `layout_version = "${LAYOUT_VERSION}"`,
    `layout_mode = "${layoutMode}"`,
    `default_lane = "${DEFAULT_LANE_ID}"`,
    `framework_version = "${version}"`,
    `installed_at = "${installedAt}"`,
    `updated_at = "${now}"`,
    "",
  ].join("\n");
  fs.writeFileSync(tomlPath, contents);
}

function readMetadata(targetDir) {
  const tomlPath = path.join(getAiOsDir(targetDir), METADATA_FILE);
  if (!fileExists(tomlPath)) return null;
  const content = fs.readFileSync(tomlPath, "utf8");
  const meta = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([a-zA-Z_]+)\s*=\s*"([^"]*)"\s*$/);
    if (match) meta[match[1]] = match[2];
  }
  return meta;
}

function writeManagedFilesManifest(targetDir, { laneId = DEFAULT_LANE_ID } = {}) {
  const dir = getAiOsDir(targetDir);
  ensureDir(dir);
  const manifestPath = path.join(dir, MANAGED_FILES_MANIFEST);
  const lanePrefix = `${PROJECT_STATE_ROOT}/${LANES_ROOT}/${laneId}`;
  const lines = ["# path\ttype"];
  lines.push("AGENTS.md\tfile");
  for (const file of SHARED_ROOT_FILES) {
    lines.push(`${PROJECT_STATE_ROOT}/${file}\tfile`);
  }
  lines.push(`${PROJECT_STATE_ROOT}/${LANES_ROOT}\tdir`);
  lines.push(`${lanePrefix}\tdir`);
  lines.push(`${lanePrefix}/lane.toml\tfile`);
  for (const file of ALL_LANE_FILES) {
    lines.push(`${lanePrefix}/${file}\tfile`);
  }
  for (const dirName of ALL_LANE_DIRS) {
    lines.push(`${lanePrefix}/${dirName}\tdir`);
  }
  fs.writeFileSync(manifestPath, `${lines.join("\n")}\n`);
}

// ---------------------------------------------------------------------------
// IDE adapter files (lightweight pointers to AGENTS.md)
// ---------------------------------------------------------------------------

// v9.1: thin stubs only. Do NOT duplicate constitution rules in these templates
// — drift risk. The full constitution lives in AGENTS.md. These files exist
// only because some agents (e.g. Claude Code as of 2026-03) do not yet
// auto-load AGENTS.md.
function installIdeFiles(targetDir, { overwrite = false } = {}) {
  const installed = [];
  for (const name of IDE_POINTER_FILES) {
    const src = path.join(IDE_POINTERS_TEMPLATE_ROOT, name);
    if (!fileExists(src)) continue;
    const dest = path.join(targetDir, name);
    if (fileExists(dest) && !overwrite) continue;
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
    installed.push(name);
  }
  return installed;
}

// ---------------------------------------------------------------------------
// .gitignore and .gitattributes (team collaboration)
// ---------------------------------------------------------------------------

const GITIGNORE_SECTION_HEADER = "# AI-OS v9 managed (session-local and generated files)";
const GITIGNORE_ENTRIES = [
  GITIGNORE_SECTION_HEADER,
  `${PROJECT_STATE_ROOT}/${LANES_ROOT}/*/STATE.md`,
  `${PROJECT_STATE_ROOT}/${METADATA_FILE}`,
  `${PROJECT_STATE_ROOT}/${MANAGED_FILES_MANIFEST}`,
];

const GITATTRIBUTES_SECTION_HEADER = "# AI-OS v9 managed (append-only knowledge)";
const GITATTRIBUTES_ENTRIES = [
  GITATTRIBUTES_SECTION_HEADER,
  `${PROJECT_STATE_ROOT}/memory.md merge=union`,
];

function appendUniqueLines(filePath, header, lines) {
  let existing = "";
  if (fileExists(filePath)) existing = fs.readFileSync(filePath, "utf8");
  if (existing.includes(header)) return false;
  const trailingNewline = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  const block = `${trailingNewline}${existing ? "\n" : ""}${lines.join("\n")}\n`;
  fs.writeFileSync(filePath, existing + block);
  return true;
}

function appendGitignoreEntries(targetDir) {
  const filePath = path.join(targetDir, ".gitignore");
  return appendUniqueLines(filePath, GITIGNORE_SECTION_HEADER, GITIGNORE_ENTRIES);
}

function appendGitattributesEntries(targetDir) {
  const filePath = path.join(targetDir, ".gitattributes");
  return appendUniqueLines(filePath, GITATTRIBUTES_SECTION_HEADER, GITATTRIBUTES_ENTRIES);
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function detectLayout(targetDir) {
  const aiOsDir = getAiOsDir(targetDir);
  if (!isDirectory(aiOsDir)) return LAYOUT_MODE_UNKNOWN;

  const defaultLaneDir = getLaneDir(targetDir, DEFAULT_LANE_ID);
  const hasDefaultLane = isDirectory(defaultLaneDir);
  const hasRootSharedMission = fileExists(path.join(aiOsDir, "MISSION.md"));
  const hasRootMemory = fileExists(path.join(aiOsDir, "memory.md"));
  const hasRootLaneScopedDuplicates = ROOT_ONLY_LEGACY_FILES
    .filter((name) => name !== "MISSION.md")
    .concat(ROOT_ONLY_LEGACY_DIRS)
    .some((name) => fileExists(path.join(aiOsDir, name)));

  if (hasDefaultLane && hasRootLaneScopedDuplicates) return LAYOUT_MODE_HYBRID;
  if (hasDefaultLane) return LAYOUT_MODE_DEFAULT;
  if (hasRootSharedMission || hasRootMemory || hasRootLaneScopedDuplicates) return LAYOUT_MODE_ROOT_ONLY;
  return LAYOUT_MODE_UNKNOWN;
}

function readKeyValueToml(absPath) {
  const values = {};
  if (!fileExists(absPath)) return values;
  for (const line of fs.readFileSync(absPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([a-zA-Z_]+)\s*=\s*"([^"]*)"\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function normalizeLaneToml(targetDir, {
  laneId = DEFAULT_LANE_ID,
  title = "默认交付线",
  status = "active",
  baselineId,
  qualityTier = "standard",
  riskTier = "medium",
} = {}) {
  const laneTomlPath = path.join(getLaneDir(targetDir, laneId), "lane.toml");
  const existing = readKeyValueToml(laneTomlPath);
  const existingBaseline = existing.baseline_id && !existing.baseline_id.endsWith("-initial-baseline")
    ? existing.baseline_id
    : "";
  const resolved = {
    id: existing.id || laneId,
    title: existing.title || title,
    status: existing.status || status,
    baseline_id: existingBaseline || baselineId || existing.baseline_id || "",
    quality_tier: existing.quality_tier || qualityTier,
    risk_tier: existing.risk_tier || riskTier,
  };
  const content = [
    `id = "${resolved.id}"`,
    `title = "${resolved.title}"`,
    `status = "${resolved.status}"`,
    `baseline_id = "${resolved.baseline_id}"`,
    `quality_tier = "${resolved.quality_tier}"`,
    `risk_tier = "${resolved.risk_tier}"`,
    "",
  ].join("\n");
  fs.writeFileSync(laneTomlPath, content);
}

function parseMissionBaselineId(content) {
  if (!content) return null;
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/当前基线 ID[^:：]*[:：]\s*(.+)\s*$/);
    if (match) {
      const value = match[1].trim();
      if (value && !value.includes("{{")) return value;
    }
  }
  return null;
}

function inferQualityTier({ hasRiskRegister = false, hasReleasePlan = false, hasVerificationMatrix = false } = {}) {
  if (hasRiskRegister || hasReleasePlan) return "high-risk";
  if (hasVerificationMatrix) return "standard";
  return "standard";
}

function inferRiskTier({ hasRiskRegister = false, hasReleasePlan = false } = {}) {
  if (hasRiskRegister || hasReleasePlan) return "high";
  return "medium";
}

// ---------------------------------------------------------------------------
// Artifact paths (helper for doctor / upgrade)
// ---------------------------------------------------------------------------

function getArtifactPaths(targetDir) {
  const aiOsDir = getAiOsDir(targetDir);
  const defaultLane = getLaneDir(targetDir, DEFAULT_LANE_ID);
  return {
    aiOsDir,
    agentsMd: path.join(targetDir, "AGENTS.md"),
    sharedMission: path.join(aiOsDir, "MISSION.md"),
    sharedMemory: path.join(aiOsDir, "memory.md"),
    defaultLane,
    laneToml: path.join(defaultLane, "lane.toml"),
    laneMission: path.join(defaultLane, "MISSION.md"),
    laneDesign: path.join(defaultLane, "DESIGN.md"),
    laneState: path.join(defaultLane, "STATE.md"),
    laneBaselineLog: path.join(defaultLane, "baseline-log"),
    laneSpecs: path.join(defaultLane, "specs"),
    laneTasks: path.join(defaultLane, "tasks.yaml"),
    laneRiskRegister: path.join(defaultLane, "risk-register.md"),
    laneReleasePlan: path.join(defaultLane, "release-plan.md"),
    laneVerificationMatrix: path.join(defaultLane, "verification-matrix.yaml"),
    laneDesignPack: path.join(defaultLane, "design-pack"),
    laneEvals: path.join(defaultLane, "evals"),
    lanes: path.join(aiOsDir, LANES_ROOT),
    metadata: path.join(aiOsDir, METADATA_FILE),
    managedFiles: path.join(aiOsDir, MANAGED_FILES_MANIFEST),
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // constants
  PACKAGE_ROOT,
  FRAMEWORK_ROOT,
  SHARED_ROOT_TEMPLATE_ROOT,
  LANE_TEMPLATE_ROOT,
  IDE_POINTERS_TEMPLATE_ROOT,
  ROOT_AGENTS_FILE,
  PROJECT_STATE_ROOT,
  LANES_ROOT,
  DEFAULT_LANE_ID,
  METADATA_FILE,
  MANAGED_FILES_MANIFEST,
  LAYOUT_VERSION,
  LAYOUT_MODE_DEFAULT,
  LAYOUT_MODE_ROOT_ONLY,
  LAYOUT_MODE_HYBRID,
  LAYOUT_MODE_UNKNOWN,
  SHARED_ROOT_FILES,
  LANE_CORE_FILES,
  LANE_CORE_DIRS,
  LANE_EXTENSION_FILES,
  LANE_EXTENSION_DIRS,
  ALL_LANE_FILES,
  ALL_LANE_DIRS,
  ROOT_ONLY_LEGACY_FILES,
  ROOT_ONLY_LEGACY_DIRS,
  SESSION_LOCAL_FILES,
  IDE_POINTER_FILES,
  TEMPLATE_TOKEN_INITIAL_BASELINE_ID,
  TEMPLATE_TOKEN_INITIAL_BASELINE_FILE,
  TEMPLATE_TOKEN_INITIAL_BASELINE_DATE,
  // version
  readFrameworkVersion,
  readPackageJson,
  // fs
  fail,
  ensureDir,
  fileExists,
  isDirectory,
  readText,
  // baseline
  formatTimestamp,
  generateInitialBaseline,
  replaceBaselineTokens,
  renderTemplate,
  // install
  installAgentsMd,
  installArtifacts,
  writeMetadata,
  readMetadata,
  writeManagedFilesManifest,
  installIdeFiles,
  appendGitignoreEntries,
  appendGitattributesEntries,
  normalizeLaneToml,
  parseMissionBaselineId,
  inferQualityTier,
  inferRiskTier,
  // layout
  getAiOsDir,
  getLaneDir,
  detectLayout,
  // paths
  getArtifactPaths,
};
