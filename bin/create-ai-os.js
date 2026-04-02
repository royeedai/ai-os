#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Stable CLI entrypoint: init + lifecycle subcommands
// ---------------------------------------------------------------------------

const SUBCOMMANDS = {
  plan:            "./ai-os-plan",
  doctor:          "./ai-os-doctor",
  diff:            "./ai-os-diff",
  lab:             "./ai-os-lab",
  upgrade:         "./ai-os-upgrade",
  validate:        "./ai-os-validate",
  "skill-check":   "./ai-os-skill-check",
  status:          "./ai-os-status",
  next:            "./ai-os-next",
  resume:          "./ai-os-resume",
  "release-check": "./ai-os-release-check",
  "token-budget":  "./ai-os-token-budget",
  "cursor-rules":  "./ai-os-cursor-rules",
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
  MANAGED_ROOTS,
  detectInstallProfileName,
  getDefaultInstallProfileName,
  getInstallProfile,
  readInstalledMeta,
  readFrameworkVersion,
  readPackageJson,
  ensureDir,
  fail,
  copyFramework,
  createProjectFiles,
  writeMetadata,
  writeManagedFilesManifest,
  removeManagedPaths,
  appendGitignoreEntries,
  appendGitattributesEntries,
  generateIdeFiles,
} = require("./shared");

const FRAMEWORK_VERSION = readFrameworkVersion();
const PACKAGE_JSON = readPackageJson();

function printHelp() {
  process.stdout.write(`Usage:
  create-ai-os [target-dir] [--target <dir>] [--profile <name>] [--with-project-files] [--force-framework]
  create-ai-os [target-dir] [--target <dir>] [--profile <name>] [--with-project-files] [--force-framework] [--lite]
  create-ai-os <command> [target-dir]

Primary workflow phases:
  /align                    Clarify the current delivery mission, users, quality bar, and project mode
  /design                   Lock key pages, IA, flows, and visual direction
  /plan                     Generate specs, tasks, acceptance, and evidence plan
  /build                    Implement wave-by-wave after design/logic are locked
  /verify                   Validate design quality, logic correctness, and runtime readiness
  /ship                     Prepare handoff, release, rollback, and delivery notes

Check your setup:
  create-ai-os plan [target-dir]           Preview managed install scope
  create-ai-os doctor [target-dir]         Check framework health
  create-ai-os validate [target-dir]       Validate delivery artifacts
  create-ai-os skill-check [skill-dir]     Validate a custom Skill
  create-ai-os lab [target-dir]            Bootstrap multi-scenario lab sandboxes

Recover and continue:
  create-ai-os status [target-dir]         Show current delivery status
  create-ai-os next [target-dir]           Show next ready tasks
  create-ai-os resume [target-dir]         Print resume context pack

Maintain framework:
  create-ai-os diff [target-dir]           Compare framework files against source
  create-ai-os upgrade [target-dir]        Upgrade framework files to latest

Prepare delivery:
  create-ai-os release-check [target-dir]  Check release readiness

Cross-tool adapters:
  create-ai-os cursor-rules [target-dir]   Regenerate IDE integration files manually

  IDE integration files (.cursor/, CLAUDE.md, GEMINI.md) are generated automatically
  during install. Use cursor-rules only to regenerate after manual deletion.

  Cross-tool compatibility:
  - AGENTS.md + .agents/skills/: natively supported by Codex CLI and Antigravity
  - .cursor/rules/ + .cursor/skills/: generated for Cursor
  - CLAUDE.md: generated for Claude Code
  - GEMINI.md: generated for Antigravity (supplements AGENTS.md)

Options:
  --target <dir>        Target project directory. Defaults to the first positional arg or the current directory.
  --profile <name>      Install profile. Defaults to the detected install profile or ${getDefaultInstallProfileName()}.
  --with-project-files  Compatibility alias for --profile project.
  --force-framework     Overwrite existing framework-managed files: AGENTS.md and .agents/
  --lite                Install minimal framework: AGENTS.md + core workflows (align/design/build/verify/debug) + essential skills; ~60% fewer files, ideal for small projects or first-time users
  --no-team-config      Skip automatic .gitignore/.gitattributes setup for team collaboration
  --no-ide-files        Skip generating IDE integration files (CLAUDE.md, GEMINI.md, .cursor/)
  -h, --help            Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let withProjectFiles = false;
let forceFramework = false;
let profileArg = "";
let liteMode = false;
let noTeamConfig = false;
let noIdeFiles = false;

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
  if (arg === "--profile") {
    if (i + 1 >= args.length) {
      fail("--profile requires a value");
    }
    profileArg = args[i + 1];
    i += 1;
    continue;
  }
  if (arg === "--force-framework") {
    forceFramework = true;
    continue;
  }
  if (arg === "--lite") {
    liteMode = true;
    continue;
  }
  if (arg === "--no-team-config") {
    noTeamConfig = true;
    continue;
  }
  if (arg === "--no-ide-files") {
    noIdeFiles = true;
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

if (withProjectFiles && profileArg && profileArg !== "project") {
  fail("--with-project-files cannot be combined with a different --profile");
}

const targetDir = path.resolve(targetArg || ".");
ensureDir(targetDir);
const installedMeta = readInstalledMeta(targetDir);

let installProfile;
try {
  installProfile = getInstallProfile(
    withProjectFiles
      ? "project"
      : (profileArg || detectInstallProfileName(targetDir, { meta: installedMeta }))
  );
} catch (error) {
  fail(error.message);
}

const existingFrameworkPaths = MANAGED_ROOTS
  .map((relPath) => path.join(targetDir, relPath))
  .filter((absolutePath) => fs.existsSync(absolutePath));
const isExistingProject = existingFrameworkPaths.length > 0;

if (forceFramework) {
  removeManagedPaths(targetDir);
}

const modeLabel = liteMode ? " (lite)" : "";
process.stdout.write(`Initializing AI-OS ${FRAMEWORK_VERSION}${modeLabel} into ${targetDir} (profile: ${installProfile.name})\n`);

const overwrite = forceFramework || !isExistingProject;
copyFramework(targetDir, { overwrite, lite: liteMode });

if (installProfile.includeProjectFiles) {
  createProjectFiles(targetDir);
}

writeMetadata(targetDir, { installProfile: installProfile.name });
writeManagedFilesManifest(targetDir);

if (!noIdeFiles) {
  generateIdeFiles(targetDir);
}

if (!noTeamConfig) {
  appendGitignoreEntries(targetDir);
  appendGitattributesEntries(targetDir);
}

if (isExistingProject && !forceFramework) {
  process.stdout.write(`
Initialization complete (existing project updated).

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${targetDir}
Install profile: ${installProfile.name}

AI-OS framework installed. Use /align in your AI tool to initialize project files
(MISSION, DESIGN, tasks, acceptance, STATE, etc.) with real content from your codebase.

Pick a workflow to start:
  /align             Clarify goal, users, mode, and quality bar
  /design            Lock key pages, IA, and core flows
  /plan              Generate specs, tasks, and acceptance gates
  /build             Execute approved work waves
  /verify            Review quality and runtime evidence

IDE integration:
  Cursor:       .cursor/rules/ + .cursor/skills/ (auto-generated)
  Claude Code:  CLAUDE.md (auto-generated)
  Antigravity:  GEMINI.md (auto-generated)
  Codex CLI:    .agents/skills/ natively compatible

Commit the framework files (AGENTS.md, .agents/, .ai-os/) into your repository.
`);
} else {
  process.stdout.write(`
Initialization complete.

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${targetDir}
Install profile: ${installProfile.name}

Next steps:
1. Pick the right start workflow:
   - clarify the mission first: /align
   - lock design and flows: /design
   - generate delivery artifacts: /plan
   - execute implementation waves: /build
   - verify quality before ship: /verify
2. When you come back later, use create-ai-os status/resume to recover context.
3. Commit the generated framework and project state files into the target repository.

Note:
- .agents/templates/project/ contains framework reference templates.
- Your project's working state files live under .ai-os/.

IDE integration:
  Cursor:       .cursor/rules/ + .cursor/skills/ (auto-generated)
  Claude Code:  CLAUDE.md (auto-generated)
  Antigravity:  GEMINI.md (auto-generated)
  Codex CLI:    .agents/skills/ natively compatible
`);
}

} // end else (init)
