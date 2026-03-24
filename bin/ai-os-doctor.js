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
  PROJECT_CORE_ARTIFACT_DIRS,
  PROJECT_CORE_ARTIFACT_FILES,
  PROJECT_OPTIONAL_ARTIFACT_DIRS,
  PROJECT_OPTIONAL_ARTIFACT_FILES,
  readFrameworkVersion,
  listManagedFiles,
  readInstalledMeta,
  getProjectFilePath,
  getProjectRelativePath,
  parseCliArgs,
  resolveTargetDir,
  createReporter,
} = require("./shared");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const parsed = parseCliArgs(process.argv, { booleanFlags: ["--strict"] });
if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-doctor [target-dir] [--strict]

Check the health of an AI-OS enabled project.

Options:
  --strict     Also validate project-local delivery artifacts
  -h, --help   Show this help message
`);
  process.exit(0);
}

const strict = parsed.flags.strict;
const targetDir = resolveTargetDir(parsed.positional);

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const reporter = createReporter();
const { report } = reporter;

const frameworkVersion = readFrameworkVersion();

process.stdout.write(`\nAI-OS Doctor — ${targetDir}\n`);
process.stdout.write(`Source framework version: ${frameworkVersion}\n\n`);

// 1. Metadata
const meta = readInstalledMeta(targetDir);
report(meta.exists, ".ai-os/framework.toml exists");

if (meta.exists) {
  const versionMatch = meta.version === frameworkVersion;
  report(
    versionMatch,
    `Framework version: ${meta.version}${versionMatch ? "" : ` (source is ${frameworkVersion})`}`,
    { warnOnly: !versionMatch }
  );
}

// 2. AGENTS.md
report(
  fs.existsSync(path.join(targetDir, "AGENTS.md")),
  "AGENTS.md exists"
);

// 3. .agents/skills/
const skillsDir = path.join(targetDir, ".agents", "skills");
const skillsOk = fs.existsSync(skillsDir) &&
  fs.readdirSync(skillsDir).filter((e) => e !== ".DS_Store").length > 0;
report(skillsOk, ".agents/skills/ exists and is not empty");

// 4. .agents/workflows/
const workflowsDir = path.join(targetDir, ".agents", "workflows");
const workflowsOk = fs.existsSync(workflowsDir) &&
  fs.readdirSync(workflowsDir).filter((e) => e !== ".DS_Store").length > 0;
report(workflowsOk, ".agents/workflows/ exists and is not empty");

// 5. Managed files integrity
const sourceManaged = listManagedFiles(FRAMEWORK_ROOT);
const missingFiles = [];
for (const rel of sourceManaged) {
  if (!fs.existsSync(path.join(targetDir, rel))) {
    missingFiles.push(rel);
  }
}

if (missingFiles.length === 0) {
  report(true, `All ${sourceManaged.length} framework-managed files present`);
} else {
  report(false, `${missingFiles.length} framework-managed file(s) missing`, { details: missingFiles });
}

// 6. Project state files (warn only)
process.stdout.write(`\n  Core project state files:\n`);
const coreProjectFiles = [
  ...PROJECT_CORE_ARTIFACT_FILES.map((relPath) => ({
    path: getProjectFilePath(targetDir, relPath),
    label: getProjectRelativePath(relPath),
  })),
  ...PROJECT_CORE_ARTIFACT_DIRS.map((relPath) => ({
    path: getProjectFilePath(targetDir, relPath),
    label: `${getProjectRelativePath(relPath)}/`,
    isDir: true,
  })),
];

for (const pf of coreProjectFiles) {
  const fullPath = pf.path;
  let exists = false;
  if (pf.isDir) {
    exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  } else {
    exists = fs.existsSync(fullPath);
  }
  report(exists, pf.label, { warnOnly: true });
}

const optionalProjectFiles = [
  ...PROJECT_OPTIONAL_ARTIFACT_FILES.map((relPath) => ({
    path: getProjectFilePath(targetDir, relPath),
    label: getProjectRelativePath(relPath),
  })),
  ...PROJECT_OPTIONAL_ARTIFACT_DIRS.map((relPath) => ({
    path: getProjectFilePath(targetDir, relPath),
    label: `${getProjectRelativePath(relPath)}/`,
    isDir: true,
  })),
];

const existingOptional = optionalProjectFiles.filter((pf) => {
  if (pf.isDir) {
    return fs.existsSync(pf.path) && fs.statSync(pf.path).isDirectory();
  }
  return fs.existsSync(pf.path);
});

if (existingOptional.length > 0) {
  process.stdout.write(`\n  Optional project state files:\n`);
  for (const pf of existingOptional) {
    report(true, pf.label, { warnOnly: true });
  }
}

if (strict) {
  process.stdout.write(`\n  Strict validation:\n`);
  const validateResult = spawnSync(
    process.execPath,
    [path.join(__dirname, "ai-os-validate.js"), targetDir],
    { stdio: "inherit" }
  );
  if (validateResult.status !== 0) {
    reporter.markFailure();
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

process.stdout.write("\n");
if (reporter.hasFailure) {
  process.stdout.write("Result: UNHEALTHY — some checks failed.\n");
  process.stdout.write("Run `create-ai-os upgrade` to fix framework file issues.\n\n");
  process.exit(1);
} else {
  process.stdout.write("Result: HEALTHY\n\n");
  process.exit(0);
}
