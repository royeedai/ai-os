#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Stable CLI entrypoint: init + lifecycle subcommands
// ---------------------------------------------------------------------------

const SUBCOMMANDS = {
  doctor:          "./ai-os-doctor",
  diff:            "./ai-os-diff",
  upgrade:         "./ai-os-upgrade",
  validate:        "./ai-os-validate",
  status:          "./ai-os-status",
  next:            "./ai-os-next",
  resume:          "./ai-os-resume",
  "release-check": "./ai-os-release-check",
  affected:        "./ai-os-affected",
};

const _sub = process.argv[2];
if (SUBCOMMANDS[_sub]) {
  process.argv.splice(2, 1);
  require(SUBCOMMANDS[_sub]);
} else {
// ---------------------------------------------------------------------------
// create-ai-os (init)
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const {
  PROJECT_STATE_ROOT,
  readFrameworkVersion,
  readPackageJson,
  ensureDir,
  fail,
  getProjectRelativePath,
  copyFramework,
  createProjectFiles,
  writeMetadata,
  writeManagedFilesManifest,
  removeManagedPaths,
} = require("./shared");

const FRAMEWORK_VERSION = readFrameworkVersion();
const PACKAGE_JSON = readPackageJson();

function printHelp() {
  process.stdout.write(`Usage:
  create-ai-os [target-dir] [--target <dir>] [--with-project-files] [--force-framework]
  create-ai-os <command> [target-dir]

First workflow to use:
  /init                     Initialize project base files for an existing codebase
  /new-project              Start a new project from scratch
  /map-codebase -> /new-module
                            Add a feature in an existing repository
  /quick                    Handle a small 1-3 file change
  /clone-project            Rebuild an existing product from references

Check your setup:
  create-ai-os doctor [target-dir]         Check framework health
  create-ai-os validate [target-dir]       Validate delivery artifacts

Recover and continue:
  create-ai-os status [target-dir]         Show current delivery status
  create-ai-os next [target-dir]           Show next ready tasks
  create-ai-os resume [target-dir]         Print resume context pack

Change-aware verification:
  create-ai-os affected [target-dir]       Plan or execute verification actions from code changes

Maintain framework:
  create-ai-os diff [target-dir]           Compare framework files against source
  create-ai-os upgrade [target-dir]        Upgrade framework files to latest

Prepare delivery:
  create-ai-os release-check [target-dir]  Check release readiness

  Cross-tool compatibility: The generated AGENTS.md and .agents/skills/*/SKILL.md
  are open standards supported by Antigravity, Cursor, and Codex.

  Compatibility aliases such as ai-os-validate and ai-os-status are still shipped,
  but create-ai-os <command> is the primary documented entrypoint.

Options:
  --target <dir>        Target project directory. Defaults to the first positional arg or the current directory.
  --with-project-files  Create missing project files under ${PROJECT_STATE_ROOT}/ such as project-charter.md, risk-register.md, tasks.yaml, acceptance.yaml, release-plan.md, memory.md, STATE.md, verification-matrix.yaml, specs/, evals/
  --force-framework     Overwrite existing framework-managed files: AGENTS.md and .agents/
  -h, --help            Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let withProjectFiles = false;
let forceFramework = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--with-project-files") {
    withProjectFiles = true;
    continue;
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

const existingFrameworkPaths = ["AGENTS.md", ".agents"]
  .map((relPath) => path.join(targetDir, relPath))
  .filter((absolutePath) => fs.existsSync(absolutePath));
const isExistingProject = existingFrameworkPaths.length > 0;

if (forceFramework) {
  removeManagedPaths(targetDir);
}

process.stdout.write(`Initializing AI-OS ${FRAMEWORK_VERSION} into ${targetDir}\n`);

const overwrite = forceFramework || !isExistingProject;
copyFramework(targetDir, { overwrite });

if (withProjectFiles) {
  createProjectFiles(targetDir);
}

writeMetadata(targetDir);
writeManagedFilesManifest(targetDir);

if (isExistingProject && !forceFramework) {
  process.stdout.write(`
Initialization complete (existing project updated).

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${targetDir}

AI-OS framework installed. Use /init in your AI tool to initialize project files
(project-charter, tasks, STATE, etc.) with real content from your codebase.

Pick a workflow to start:
  /init              Initialize project base files for an existing codebase
  /map-codebase      Analyze existing codebase first
  /new-module        Add a feature or module
  /quick             Small fix (1-3 files)

Commit the framework files (AGENTS.md, .agents/, .ai-os/) into your repository.
`);
} else {
  process.stdout.write(`
Initialization complete.

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${targetDir}

Next steps:
1. Pick the right start workflow:
   - brand-new project: /new-project
   - existing codebase: /init or /map-codebase -> /new-module
   - small change: /quick
   - product rebuild: /clone-project
2. When you come back later, use create-ai-os status/resume to recover context.
3. Commit the generated framework and project state files into the target repository.

Note:
- .agents/templates/project/ contains framework reference templates.
- Your project's working state files live under .ai-os/.

Cross-tool compatibility:
- AGENTS.md: supported by Antigravity, Cursor, and Codex
- .agents/skills/*/SKILL.md: supported by Antigravity, Cursor, and Codex
`);
}

} // end else (init)
