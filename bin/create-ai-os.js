#!/usr/bin/env node

/**
 * AI-OS v9 installer
 *
 * One default install form. No profiles, no flags for "what to include".
 * All artifacts are installed into the v9 canonical layout:
 * shared root + .ai-os/lanes/default/.
 *
 * Primary operations:
 *   create-ai-os [target-dir]       Default install (the only supported form)
 *   create-ai-os install [target]   Explicit install alias (same behavior)
 *   create-ai-os doctor  [target]   Check artifact completeness
 *   create-ai-os upgrade [target]   Migrate older AI-OS layouts to v9
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
  create-ai-os [target-dir]               Install AI-OS v9 into the target (default: current dir)
  create-ai-os install [target-dir]       Explicit install alias (same behavior)
  create-ai-os doctor  [target-dir]       Check layout health and constitution compliance
  create-ai-os upgrade [target-dir]       Migrate older AI-OS layouts to v9

Primary operations:
  install   Default entrypoint plus explicit alias
  doctor    Layout health and constitution compliance checks
  upgrade   Legacy layout migration to v9

Options:
  --force          Overwrite existing managed artifacts
  --no-team-config Skip .gitignore / .gitattributes setup
  --no-ide-files   Skip CLAUDE.md / GEMINI.md generation
  -h, --help       Show this help
  -v, --version    Show version

Installed artifacts (always, no profiles):
  AGENTS.md                                   Delivery constitution
  .ai-os/MISSION.md                           Shared host-project context
  .ai-os/memory.md                            Shared stable decisions + conventions
  .ai-os/lanes/default/lane.toml              Default delivery-lane metadata
  .ai-os/lanes/default/MISSION.md             Current delivery baseline
  .ai-os/lanes/default/DESIGN.md              Key design + acceptance
  .ai-os/lanes/default/STATE.md               Session recovery entry (gitignored)
  .ai-os/lanes/default/baseline-log/          Change and baseline records
  .ai-os/lanes/default/specs/                 Local contracts
  .ai-os/lanes/default/tasks.yaml             Tasks with owners + handoff evidence
  .ai-os/lanes/default/risk-register.md       High-risk register
  .ai-os/lanes/default/release-plan.md        Release plan
  .ai-os/lanes/default/verification-matrix.yaml Regression assertions
  .ai-os/lanes/default/design-pack/           Reverse-spec parity artifacts
  .ai-os/lanes/default/evals/                 Project-level failure-mode samples

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
    LAYOUT_MODE_DEFAULT,
  } = require("./shared");

  let targetArg = "";
  let force = false;
  let noTeamConfig = false;
  let noIdeFiles = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--force") { force = true; continue; }
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
  writeMetadata(targetDir, { version, layoutMode: LAYOUT_MODE_DEFAULT });
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
  Layout:    shared-root + .ai-os/lanes/default/

  AGENTS.md:       ${agentsInstalled ? "installed" : "already present (use --force to overwrite)"}
  Artifacts:       ${installed.length} file(s) written under .ai-os/
  IDE pointers:    ${ideInstalled.length > 0 ? ideInstalled.join(", ") : "skipped or already present"}
  .gitignore:      ${gitignoreUpdated ? "updated" : "already configured or skipped"}
  .gitattributes:  ${gitattributesUpdated ? "updated" : "already configured or skipped"}

Next steps:
  1. Read AGENTS.md (≤150 lines) — the delivery constitution
  2. Fill in .ai-os/MISSION.md — your shared host-project context
  3. Fill in .ai-os/lanes/default/MISSION.md — your current delivery baseline
  4. Behavior is rule-driven; AI agents will follow AGENTS.md to route work

Primary operations:
  create-ai-os            Install AI-OS v9 (default entrypoint)
  create-ai-os install    Install AI-OS v9 (explicit alias)
  create-ai-os doctor    Check artifact completeness
  create-ai-os upgrade   Migrate older AI-OS layouts to v9
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
