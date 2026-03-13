#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  PROJECT_STATE_ROOT,
  readFrameworkVersion,
  readPackageJson,
  ensureDir,
  fail,
  copyFramework,
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
  - writes framework metadata under ${PROJECT_STATE_ROOT}/ for doctor / validate / status / resume

What it does not do:
  - it does not create project files (project-charter, tasks, specs, etc.)
  - it does not analyze your repository automatically
  - project files are created automatically when you start a workflow (/new-project, /map-codebase, /new-module, /quick)

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

const targetDir = path.resolve(targetArg || ".");
ensureDir(targetDir);

if (forceFramework) {
  removeManagedPaths(targetDir);
}

process.stdout.write(`Bootstrapping existing repository with AI-OS ${FRAMEWORK_VERSION} in ${targetDir}\n`);

copyFramework(targetDir, { overwrite: forceFramework });

writeMetadata(targetDir);
writeManagedFilesManifest(targetDir);

const frameworkPresent = fs.existsSync(path.join(targetDir, "AGENTS.md")) && fs.existsSync(path.join(targetDir, ".agents"));

process.stdout.write(`
Bootstrap complete.

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${targetDir}
Framework files present: ${frameworkPresent ? "yes" : "no"}

AI-OS framework installed. Project files (project-charter, tasks, specs, etc.)
will be created automatically when you start a workflow in your AI tool.

Pick a workflow to start:
  /new-project       Plan a new project from scratch
  /map-codebase      Analyze existing codebase first
  /new-module        Add a feature or module
  /quick             Small fix (1-3 files)

Commit the framework files (AGENTS.md, .agents/, .ai-os/) into your repository.
`);
