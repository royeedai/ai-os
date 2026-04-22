/**
 * AI-OS v8 CLI shared utilities
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
const PROJECT_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "project");
const LANE_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "lane");
const ROOT_AGENTS_FILE = path.join(PACKAGE_ROOT, "AGENTS.md");

const PROJECT_STATE_ROOT = ".ai-os";
const METADATA_FILE = "framework.toml";
const MANAGED_FILES_MANIFEST = "managed-files.tsv";

// Initial baseline placeholders
const TEMPLATE_TOKEN_INITIAL_BASELINE_ID = "{{INITIAL_BASELINE_ID}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_FILE = "{{INITIAL_BASELINE_FILE}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_DATE = "{{INITIAL_BASELINE_DATE}}";
const INITIAL_BASELINE_SLUG = "initial-baseline";

// 12-artifact manifest (v8)
const CORE_FILES = [
  "MISSION.md",
  "DESIGN.md",
  "STATE.md",
  "memory.md",
];
const CORE_DIRS = [
  "baseline-log",
];
const EXTENSION_FILES = [
  "tasks.yaml",
  "risk-register.md",
  "release-plan.md",
  "verification-matrix.yaml",
];
const EXTENSION_DIRS = [
  "specs",
  "design-pack",
  "evals",
];

const ALL_ARTIFACT_FILES = [...CORE_FILES, ...EXTENSION_FILES];
const ALL_ARTIFACT_DIRS = [...CORE_DIRS, ...EXTENSION_DIRS];

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

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(srcDir, destDir) {
  if (!fileExists(srcDir)) return;
  ensureDir(destDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
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
// 12-artifact installation
// ---------------------------------------------------------------------------

function installArtifacts(targetDir, { overwrite = false } = {}) {
  const baseline = generateInitialBaseline();
  const aiOsDir = path.join(targetDir, PROJECT_STATE_ROOT);
  ensureDir(aiOsDir);

  const installed = [];

  for (const file of ALL_ARTIFACT_FILES) {
    const src = path.join(PROJECT_TEMPLATE_ROOT, file);
    const dest = path.join(aiOsDir, file);
    if (!fileExists(src)) continue;
    if (fileExists(dest) && !overwrite) continue;
    let content = fs.readFileSync(src, "utf8");
    content = replaceBaselineTokens(content, baseline);
    fs.writeFileSync(dest, content);
    installed.push(file);
  }

  for (const dirName of ALL_ARTIFACT_DIRS) {
    const srcDir = path.join(PROJECT_TEMPLATE_ROOT, dirName);
    const destDir = path.join(aiOsDir, dirName);
    if (!fileExists(srcDir)) continue;
    ensureDir(destDir);
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const srcFile = path.join(srcDir, entry.name);
      let destName = entry.name;
      if (dirName === "baseline-log" && destName === "BL-template.md") {
        destName = `${baseline.id}.md`;
      }
      const destFile = path.join(destDir, destName);
      if (fileExists(destFile) && !overwrite) continue;
      let content = fs.readFileSync(srcFile, "utf8");
      content = replaceBaselineTokens(content, baseline);
      fs.writeFileSync(destFile, content);
      installed.push(`${dirName}/${destName}`);
    }
  }

  return { installed, baseline };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

function writeMetadata(targetDir, { version }) {
  const dir = path.join(targetDir, PROJECT_STATE_ROOT);
  ensureDir(dir);
  const tomlPath = path.join(dir, METADATA_FILE);
  const now = new Date().toISOString();
  const contents = [
    `# AI-OS framework metadata`,
    `schema_version = "8"`,
    `framework_version = "${version}"`,
    `installed_at = "${now}"`,
    `updated_at = "${now}"`,
    ``,
  ].join("\n");
  fs.writeFileSync(tomlPath, contents);
}

function readMetadata(targetDir) {
  const tomlPath = path.join(targetDir, PROJECT_STATE_ROOT, METADATA_FILE);
  if (!fileExists(tomlPath)) return null;
  const content = fs.readFileSync(tomlPath, "utf8");
  const meta = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([a-zA-Z_]+)\s*=\s*"([^"]*)"\s*$/);
    if (match) meta[match[1]] = match[2];
  }
  return meta;
}

function writeManagedFilesManifest(targetDir) {
  const dir = path.join(targetDir, PROJECT_STATE_ROOT);
  ensureDir(dir);
  const manifestPath = path.join(dir, MANAGED_FILES_MANIFEST);
  const lines = ["# path\ttype"];
  lines.push(`AGENTS.md\tfile`);
  for (const file of ALL_ARTIFACT_FILES) {
    lines.push(`${PROJECT_STATE_ROOT}/${file}\tfile`);
  }
  for (const dirName of ALL_ARTIFACT_DIRS) {
    lines.push(`${PROJECT_STATE_ROOT}/${dirName}\tdir`);
  }
  fs.writeFileSync(manifestPath, `${lines.join("\n")}\n`);
}

// ---------------------------------------------------------------------------
// IDE adapter files (lightweight pointers to AGENTS.md)
// ---------------------------------------------------------------------------

const CLAUDE_POINTER = `# Claude Code session guide

This project uses AI-OS v8 for delivery governance. The full constitution is in \`AGENTS.md\`.

Before starting any work:

1. Read \`AGENTS.md\` — the delivery constitution
2. Read \`.ai-os/STATE.md\` — current session position (may be empty on first run)
3. Read \`.ai-os/MISSION.md\` — delivery baseline and goals

Key rules summarized:

- Do not write business code before user-confirmed mission and design
- Follow the behavior rules in \`AGENTS.md\` for task routing (new project / change / debug / verify / ship)
- Provide project-native static-check evidence for verification (not just ReadLints)
- Stop at confirmation points and wait for explicit user approval
`;

const GEMINI_POINTER = `# Gemini / Antigravity session guide

This project uses AI-OS v8 for delivery governance. The full constitution is in \`AGENTS.md\`.

Before starting any work:

1. Read \`AGENTS.md\` — the delivery constitution
2. Read \`.ai-os/STATE.md\` — current session position
3. Read \`.ai-os/MISSION.md\` — delivery baseline and goals

Key rules summarized:

- Behavior is rule-driven. There are no slash commands; task routing comes from \`AGENTS.md\`
- Stop at confirmation points and wait for explicit user approval
- Provide project-native static-check evidence for verification
`;

function installIdeFiles(targetDir, { overwrite = false } = {}) {
  const files = [
    { name: "CLAUDE.md", content: CLAUDE_POINTER },
    { name: "GEMINI.md", content: GEMINI_POINTER },
  ];
  const installed = [];
  for (const { name, content } of files) {
    const dest = path.join(targetDir, name);
    if (fileExists(dest) && !overwrite) continue;
    fs.writeFileSync(dest, content);
    installed.push(name);
  }
  return installed;
}

// ---------------------------------------------------------------------------
// .gitignore and .gitattributes (team collaboration)
// ---------------------------------------------------------------------------

const GITIGNORE_SECTION_HEADER = "# AI-OS v8 managed (session-local files)";
const GITIGNORE_ENTRIES = [
  GITIGNORE_SECTION_HEADER,
  `${PROJECT_STATE_ROOT}/STATE.md`,
  `${PROJECT_STATE_ROOT}/${METADATA_FILE}`,
  `${PROJECT_STATE_ROOT}/${MANAGED_FILES_MANIFEST}`,
  `${PROJECT_STATE_ROOT}/lanes/*/STATE.md`,
];

const GITATTRIBUTES_SECTION_HEADER = "# AI-OS v8 managed (append-only knowledge)";
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
// Artifact paths (helper for doctor / upgrade)
// ---------------------------------------------------------------------------

function getArtifactPaths(targetDir) {
  const aiOsDir = path.join(targetDir, PROJECT_STATE_ROOT);
  return {
    aiOsDir,
    agentsMd: path.join(targetDir, "AGENTS.md"),
    mission: path.join(aiOsDir, "MISSION.md"),
    design: path.join(aiOsDir, "DESIGN.md"),
    state: path.join(aiOsDir, "STATE.md"),
    memory: path.join(aiOsDir, "memory.md"),
    baselineLog: path.join(aiOsDir, "baseline-log"),
    specs: path.join(aiOsDir, "specs"),
    tasks: path.join(aiOsDir, "tasks.yaml"),
    riskRegister: path.join(aiOsDir, "risk-register.md"),
    releasePlan: path.join(aiOsDir, "release-plan.md"),
    verificationMatrix: path.join(aiOsDir, "verification-matrix.yaml"),
    designPack: path.join(aiOsDir, "design-pack"),
    evals: path.join(aiOsDir, "evals"),
    lanes: path.join(aiOsDir, "lanes"),
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
  PROJECT_TEMPLATE_ROOT,
  LANE_TEMPLATE_ROOT,
  ROOT_AGENTS_FILE,
  PROJECT_STATE_ROOT,
  METADATA_FILE,
  MANAGED_FILES_MANIFEST,
  CORE_FILES,
  CORE_DIRS,
  EXTENSION_FILES,
  EXTENSION_DIRS,
  ALL_ARTIFACT_FILES,
  ALL_ARTIFACT_DIRS,
  SESSION_LOCAL_FILES,
  IDE_POINTER_FILES,
  // version
  readFrameworkVersion,
  readPackageJson,
  // fs
  fail,
  ensureDir,
  fileExists,
  copyFile,
  copyDirRecursive,
  // baseline
  formatTimestamp,
  generateInitialBaseline,
  replaceBaselineTokens,
  // install
  installAgentsMd,
  installArtifacts,
  writeMetadata,
  readMetadata,
  writeManagedFilesManifest,
  installIdeFiles,
  appendGitignoreEntries,
  appendGitattributesEntries,
  // paths
  getArtifactPaths,
};
