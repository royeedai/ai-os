#!/usr/bin/env node

/**
 * ai-os-doctor — Check the health of an AI-OS enabled project.
 *
 * Usage:
 *   ai-os-doctor [target-dir]
 *   ai-os-doctor --help
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  FRAMEWORK_ROOT,
  PROJECT_ARTIFACT_DIRS,
  PROJECT_ARTIFACT_FILES,
  readFrameworkVersion,
  listManagedFiles,
  readInstalledMeta,
  getProjectFilePath,
  getProjectRelativePath,
  fail,
} = require("./shared");

// ---------------------------------------------------------------------------
// Symbols
// ---------------------------------------------------------------------------

const SYM_OK = "\x1b[32m✓\x1b[0m";
const SYM_FAIL = "\x1b[31m✗\x1b[0m";
const SYM_WARN = "\x1b[33m⚠\x1b[0m";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-doctor [target-dir] [--strict]

Check the health of an AI-OS enabled project.

Options:
  --strict     Also validate project-local delivery artifacts
  -h, --help   Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let strict = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--strict") {
    strict = true;
    continue;
  }
  if (arg.startsWith("-")) {
    fail(`unknown option: ${arg}`);
  }
  if (targetArg) {
    fail(`unexpected argument: ${arg}`);
  }
  targetArg = arg;
}

const TARGET_DIR = path.resolve(targetArg || ".");

if (!fs.existsSync(TARGET_DIR)) {
  fail(`target directory does not exist: ${TARGET_DIR}`);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

let hasFailure = false;

function check(ok, label, warnOnly) {
  if (ok) {
    process.stdout.write(`  ${SYM_OK}  ${label}\n`);
  } else if (warnOnly) {
    process.stdout.write(`  ${SYM_WARN}  ${label}\n`);
  } else {
    process.stdout.write(`  ${SYM_FAIL}  ${label}\n`);
    hasFailure = true;
  }
}

const frameworkVersion = readFrameworkVersion();

process.stdout.write(`\nAI-OS Doctor — ${TARGET_DIR}\n`);
process.stdout.write(`Source framework version: ${frameworkVersion}\n\n`);

// 1. Metadata
const meta = readInstalledMeta(TARGET_DIR);
check(meta.exists, ".ai-os/framework.toml exists", false);

if (meta.exists) {
  const versionMatch = meta.version === frameworkVersion;
  check(
    versionMatch,
    `Framework version: ${meta.version}${versionMatch ? "" : ` (source is ${frameworkVersion})`}`,
    !versionMatch
  );
}

// 2. AGENTS.md
check(
  fs.existsSync(path.join(TARGET_DIR, "AGENTS.md")),
  "AGENTS.md exists",
  false
);

// 3. .agents/skills/
const skillsDir = path.join(TARGET_DIR, ".agents", "skills");
const skillsOk = fs.existsSync(skillsDir) &&
  fs.readdirSync(skillsDir).filter((e) => e !== ".DS_Store").length > 0;
check(skillsOk, ".agents/skills/ exists and is not empty", false);

// 4. .agents/workflows/
const workflowsDir = path.join(TARGET_DIR, ".agents", "workflows");
const workflowsOk = fs.existsSync(workflowsDir) &&
  fs.readdirSync(workflowsDir).filter((e) => e !== ".DS_Store").length > 0;
check(workflowsOk, ".agents/workflows/ exists and is not empty", false);

// 5. Managed files integrity
const sourceManaged = listManagedFiles(FRAMEWORK_ROOT);
const missingFiles = [];
for (const rel of sourceManaged) {
  if (!fs.existsSync(path.join(TARGET_DIR, rel))) {
    missingFiles.push(rel);
  }
}

if (missingFiles.length === 0) {
  check(true, `All ${sourceManaged.length} framework-managed files present`, false);
} else {
  check(false, `${missingFiles.length} framework-managed file(s) missing`, false);
  for (const f of missingFiles) {
    process.stdout.write(`       - ${f}\n`);
  }
}

// 6. Project state files (warn only)
process.stdout.write(`\n  Project state files:\n`);
const projectFiles = [
  ...PROJECT_ARTIFACT_FILES.map((relPath) => ({
    path: getProjectFilePath(TARGET_DIR, relPath),
    label: getProjectRelativePath(relPath),
  })),
  ...PROJECT_ARTIFACT_DIRS.map((relPath) => ({
    path: getProjectFilePath(TARGET_DIR, relPath),
    label: `${getProjectRelativePath(relPath)}/`,
    isDir: true,
  })),
];

for (const pf of projectFiles) {
  const fullPath = pf.path;
  let exists = false;
  if (pf.isDir) {
    exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  } else {
    exists = fs.existsSync(fullPath);
  }
  check(exists, pf.label, true);
}

if (strict) {
  process.stdout.write(`\n  Strict validation:\n`);
  const validateResult = spawnSync(
    process.execPath,
    [path.join(__dirname, "ai-os-validate.js"), TARGET_DIR],
    { stdio: "inherit" }
  );
  if (validateResult.status !== 0) {
    hasFailure = true;
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

process.stdout.write("\n");
if (hasFailure) {
  process.stdout.write("Result: UNHEALTHY — some checks failed.\n");
  process.stdout.write("Run `ai-os-upgrade` to fix framework file issues.\n\n");
  process.exit(1);
} else {
  process.stdout.write("Result: HEALTHY\n\n");
  process.exit(0);
}
