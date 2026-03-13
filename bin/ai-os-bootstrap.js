#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  PROJECT_STATE_ROOT,
  readFrameworkVersion,
  readPackageJson,
  ensureDir,
  fail,
  getProjectFilePath,
  getProjectRelativePath,
  getProjectTemplatePath,
  copyFramework,
  copyTemplateIfMissing,
  createProjectFiles,
  writeMetadata,
  writeManagedFilesManifest,
  removeManagedPaths,
} = require("./shared");

const FRAMEWORK_VERSION = readFrameworkVersion();
const PACKAGE_JSON = readPackageJson();

function printHelp() {
  process.stdout.write(`Usage:
  create-ai-os bootstrap [target-dir] [--target <dir>] [--force-framework]

Bootstrap an existing repository into AI-OS without requiring a fresh init.

What it does:
  - installs missing framework-managed files (AGENTS.md and .agents/)
  - creates missing project-local artifacts under ${PROJECT_STATE_ROOT}/
  - seeds ${getProjectRelativePath("codebase-map.md")} for the /map-codebase workflow
  - writes framework metadata for doctor / validate / status / resume

What it does not do:
  - it does not analyze your repository automatically
  - it does not overwrite project-local artifacts that already exist
  - it does not replace /map-codebase, /new-project, /new-module, or /quick

Options:
  --target <dir>        Target project directory. Defaults to the first positional arg or the current directory.
  --force-framework     Overwrite existing framework-managed files: AGENTS.md and .agents/
  -h, --help            Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let forceFramework = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }

  if (arg === "--force-framework") {
    forceFramework = true;
    continue;
  }

  if (arg === "--target") {
    if (i + 1 >= args.length) {
      fail("--target requires a value");
    }
    targetArg = args[i + 1];
    i += 1;
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
ensureDir(TARGET_DIR);

if (forceFramework) {
  removeManagedPaths(TARGET_DIR);
}

process.stdout.write(`Bootstrapping existing repository with AI-OS ${FRAMEWORK_VERSION} in ${TARGET_DIR}\n`);

copyFramework(TARGET_DIR, { overwrite: forceFramework });
createProjectFiles(TARGET_DIR);
copyTemplateIfMissing(
  TARGET_DIR,
  getProjectTemplatePath("codebase-map.md"),
  getProjectFilePath(TARGET_DIR, "codebase-map.md")
);

writeMetadata(TARGET_DIR);
writeManagedFilesManifest(TARGET_DIR);

const frameworkPresent = fs.existsSync(path.join(TARGET_DIR, "AGENTS.md")) && fs.existsSync(path.join(TARGET_DIR, ".agents"));

process.stdout.write(`
Bootstrap complete.

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${TARGET_DIR}
Framework files present: ${frameworkPresent ? "yes" : "no"}

Next steps:
1. Open ${path.join(TARGET_DIR, getProjectRelativePath("STATE.md"))} and ${path.join(TARGET_DIR, getProjectRelativePath("project-charter.md"))}.
2. In your AI tool, run /map-codebase to fill ${getProjectRelativePath("codebase-map.md")} and refine ${getProjectRelativePath("verification-matrix.yaml")} / ${getProjectRelativePath("memory.md")}.
3. If you are adopting the whole repository into AI-OS, continue with /new-project to confirm charter, milestones, risks, and tasks.
4. For actual delivery work after onboarding, continue with /new-module or /quick.
5. Commit the generated framework and project state files into the target repository.
`);
