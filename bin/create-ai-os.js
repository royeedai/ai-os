#!/usr/bin/env node

/**
 * AI-OS v8 installer
 *
 * One default install form. No profiles, no flags for "what to include".
 * All 12 artifacts are always installed.
 *
 * Subcommands:
 *   create-ai-os [target-dir]       Default install (the only supported form)
 *   create-ai-os install [target]   Explicit install (same behavior)
 *   create-ai-os doctor  [target]   Check artifact completeness
 *   create-ai-os upgrade [target]   Migrate v7 project to v8
 */

"use strict";

const path = require("path");

const SUBCOMMANDS = {
  install: null, // handled below (same as default)
  doctor: "./ai-os-doctor",
  upgrade: "./ai-os-upgrade",
};

function printHelp(version) {
  process.stdout.write(`create-ai-os v${version} — AI Delivery Constitution installer

Usage:
  create-ai-os [target-dir]               Install AI-OS v8 into the target (default: current dir)
  create-ai-os install [target-dir]       Same as above (explicit)
  create-ai-os doctor  [target-dir]       Check artifact completeness
  create-ai-os upgrade [target-dir]       Migrate a v7 project to v8

Options:
  --force          Overwrite existing artifacts (AGENTS.md and .ai-os/*)
  --no-team-config Skip .gitignore / .gitattributes setup
  --no-ide-files   Skip CLAUDE.md / GEMINI.md generation
  -h, --help       Show this help
  -v, --version    Show version

Installed artifacts (always, no profiles):
  AGENTS.md                     Delivery constitution
  .ai-os/MISSION.md             Goal + success criteria
  .ai-os/DESIGN.md              Key design + acceptance
  .ai-os/STATE.md               Session recovery entry (gitignored)
  .ai-os/memory.md              Stable decisions + conventions
  .ai-os/baseline-log/          Change and baseline records
  .ai-os/specs/                 Local contracts
  .ai-os/tasks.yaml             Tasks with owners
  .ai-os/risk-register.md       High-risk register
  .ai-os/release-plan.md        Release plan
  .ai-os/verification-matrix.yaml Regression assertions
  .ai-os/design-pack/           Reverse-spec parity artifacts
  .ai-os/evals/                 Project-level failure-mode samples

Docs: https://github.com/royeedai/ai-os
`);
}

function runInstall(argv) {
  const fs = require("fs");
  const {
    PROJECT_STATE_ROOT,
    readFrameworkVersion,
    readPackageJson,
    ensureDir,
    fail,
    installAgentsMd,
    installArtifacts,
    writeMetadata,
    writeManagedFilesManifest,
    installIdeFiles,
    appendGitignoreEntries,
    appendGitattributesEntries,
  } = require("./shared");

  let targetArg = "";
  let force = false;
  let noTeamConfig = false;
  let noIdeFiles = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force" || arg === "--force-framework") { force = true; continue; }
    if (arg === "--no-team-config") { noTeamConfig = true; continue; }
    if (arg === "--no-ide-files") { noIdeFiles = true; continue; }
    if (arg.startsWith("-")) fail(`unknown option: ${arg}`);
    if (targetArg) fail(`unexpected argument: ${arg}`);
    targetArg = arg;
  }

  const version = readFrameworkVersion();
  const pkg = readPackageJson();
  const targetDir = path.resolve(targetArg || ".");
  ensureDir(targetDir);

  const aiOsDir = path.join(targetDir, PROJECT_STATE_ROOT);
  const isExistingAiOs = fs.existsSync(aiOsDir);

  process.stdout.write(`Installing AI-OS v${version} into ${targetDir}${isExistingAiOs ? " (existing project)" : ""}\n`);

  const agentsInstalled = installAgentsMd(targetDir, { overwrite: force });
  const { installed, baseline } = installArtifacts(targetDir, { overwrite: force });
  writeMetadata(targetDir, { version });
  writeManagedFilesManifest(targetDir);

  let ideInstalled = [];
  if (!noIdeFiles) {
    ideInstalled = installIdeFiles(targetDir, { overwrite: force });
  }

  let gitignoreUpdated = false;
  let gitattributesUpdated = false;
  if (!noTeamConfig) {
    gitignoreUpdated = appendGitignoreEntries(targetDir);
    gitattributesUpdated = appendGitattributesEntries(targetDir);
  }

  process.stdout.write(`
Installation complete.

  Framework: ${pkg.name}@${version}
  Target:    ${targetDir}
  Baseline:  ${baseline.id}

  AGENTS.md:       ${agentsInstalled ? "installed" : "already present (use --force to overwrite)"}
  Artifacts:       ${installed.length} file(s) written under .ai-os/
  IDE pointers:    ${ideInstalled.length > 0 ? ideInstalled.join(", ") : "skipped or already present"}
  .gitignore:      ${gitignoreUpdated ? "updated" : "already configured or skipped"}
  .gitattributes:  ${gitattributesUpdated ? "updated" : "already configured or skipped"}

Next steps:
  1. Read AGENTS.md (≤150 lines) — the delivery constitution
  2. Fill in .ai-os/MISSION.md — your delivery goal and success criteria
  3. Behavior is rule-driven; AI agents will follow AGENTS.md to route work

Commands:
  create-ai-os doctor    Check artifact completeness
  create-ai-os upgrade   Migrate a v7 project to v8
`);
}

function main() {
  const argv = process.argv.slice(2);
  const { readFrameworkVersion } = require("./shared");

  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    if (argv.length === 0) {
      // default: install into current dir
      runInstall([]);
      return;
    }
    printHelp(readFrameworkVersion());
    return;
  }

  if (argv[0] === "-v" || argv[0] === "--version") {
    process.stdout.write(`${readFrameworkVersion()}\n`);
    return;
  }

  const sub = argv[0];
  if (Object.prototype.hasOwnProperty.call(SUBCOMMANDS, sub)) {
    const handler = SUBCOMMANDS[sub];
    if (handler) {
      process.argv.splice(2, 1); // drop subcommand, keep remaining args
      require(handler);
      return;
    }
    // install (explicit)
    runInstall(argv.slice(1));
    return;
  }

  // Default: treat first positional as target dir
  runInstall(argv);
}

main();
