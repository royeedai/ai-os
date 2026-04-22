#!/usr/bin/env node

/**
 * Install tests: default create-ai-os produces all 12 artifacts + AGENTS.md + IDE pointers.
 */

const fs = require("fs");
const path = require("path");
const {
  assert,
  runInstall,
  tmpDir,
  cleanup,
  readFile,
  exists,
  listBaselineRecords,
  BASELINE_RECORD_NAME_PATTERN,
  section,
} = require("./helpers");

section("install: default install into fresh dir");

{
  const dir = tmpDir();
  const result = runInstall([dir]);
  assert(result.status === 0, "install exits 0");
  assert(result.stdout.includes("Installation complete"), "stdout reports completion");

  // Root-level
  assert(exists(dir, "AGENTS.md"), "AGENTS.md installed at root");
  assert(exists(dir, "CLAUDE.md"), "CLAUDE.md pointer installed");
  assert(exists(dir, "GEMINI.md"), "GEMINI.md pointer installed");
  assert(exists(dir, ".gitignore"), ".gitignore created");
  assert(exists(dir, ".gitattributes"), ".gitattributes created");

  // Core 6 files (excluding STATE.md which is gitignored but still installed)
  assert(exists(dir, ".ai-os/MISSION.md"), "MISSION.md installed");
  assert(exists(dir, ".ai-os/DESIGN.md"), "DESIGN.md installed");
  assert(exists(dir, ".ai-os/STATE.md"), "STATE.md installed");
  assert(exists(dir, ".ai-os/memory.md"), "memory.md installed");
  assert(exists(dir, ".ai-os/baseline-log"), "baseline-log/ dir installed");

  // Extension 6
  assert(exists(dir, ".ai-os/specs"), "specs/ dir installed");
  assert(exists(dir, ".ai-os/tasks.yaml"), "tasks.yaml installed");
  assert(exists(dir, ".ai-os/risk-register.md"), "risk-register.md installed");
  assert(exists(dir, ".ai-os/release-plan.md"), "release-plan.md installed");
  assert(exists(dir, ".ai-os/verification-matrix.yaml"), "verification-matrix.yaml installed");
  assert(exists(dir, ".ai-os/design-pack"), "design-pack/ dir installed");
  assert(exists(dir, ".ai-os/evals"), "evals/ dir installed");

  // Metadata
  assert(exists(dir, ".ai-os/framework.toml"), "framework.toml written");
  assert(exists(dir, ".ai-os/managed-files.tsv"), "managed-files.tsv written");

  // Initial baseline record
  const records = listBaselineRecords(dir);
  assert(records.length === 1, "exactly one baseline record created");
  assert(BASELINE_RECORD_NAME_PATTERN.test(records[0]), `baseline record name matches pattern: ${records[0]}`);

  // Content checks
  const agents = readFile(dir, "AGENTS.md");
  assert(agents && agents.includes("AI 交付宪法"), "AGENTS.md contains v8 constitution marker");
  assert(agents && agents.split("\n").length <= 150, "AGENTS.md is within 150 lines");

  const gitignore = readFile(dir, ".gitignore");
  assert(gitignore && gitignore.includes(".ai-os/STATE.md"), ".gitignore excludes STATE.md");

  const gitattributes = readFile(dir, ".gitattributes");
  assert(gitattributes && gitattributes.includes("memory.md merge=union"), ".gitattributes uses union merge for memory.md");

  const toml = readFile(dir, ".ai-os/framework.toml");
  assert(toml && toml.includes("schema_version = \"8\""), "framework.toml has schema_version=8");
  assert(toml && toml.includes("framework_version = \"8.0.0\""), "framework.toml has version 8.0.0");

  cleanup(dir);
}

section("install: --no-ide-files");

{
  const dir = tmpDir();
  const result = runInstall([dir, "--no-ide-files"]);
  assert(result.status === 0, "install --no-ide-files exits 0");
  assert(!exists(dir, "CLAUDE.md"), "CLAUDE.md skipped");
  assert(!exists(dir, "GEMINI.md"), "GEMINI.md skipped");
  assert(exists(dir, "AGENTS.md"), "AGENTS.md still installed");
  cleanup(dir);
}

section("install: --no-team-config");

{
  const dir = tmpDir();
  const result = runInstall([dir, "--no-team-config"]);
  assert(result.status === 0, "install --no-team-config exits 0");
  assert(!exists(dir, ".gitignore"), ".gitignore skipped");
  assert(!exists(dir, ".gitattributes"), ".gitattributes skipped");
  cleanup(dir);
}

section("install: idempotency (second run should not overwrite user content)");

{
  const dir = tmpDir();
  runInstall([dir]);
  // User edits MISSION.md
  fs.writeFileSync(path.join(dir, ".ai-os", "MISSION.md"), "# My user-authored content\n");
  // Re-run install
  const result = runInstall([dir]);
  assert(result.status === 0, "second install exits 0");
  const mission = readFile(dir, ".ai-os/MISSION.md");
  assert(mission === "# My user-authored content\n", "user content preserved on re-install");
  cleanup(dir);
}

section("install: --force overwrites user content");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.writeFileSync(path.join(dir, ".ai-os", "MISSION.md"), "# edited by user\n");
  runInstall([dir, "--force"]);
  const mission = readFile(dir, ".ai-os/MISSION.md");
  assert(mission && mission.includes("Mission"), "force overwrites user content back to template");
  cleanup(dir);
}

section("install: help flag");

{
  const result = runInstall(["--help"]);
  assert(result.status === 0, "--help exits 0");
  assert(result.stdout.includes("Usage:"), "--help shows usage");
  assert(result.stdout.includes("create-ai-os doctor"), "--help lists doctor subcommand");
  assert(result.stdout.includes("create-ai-os upgrade"), "--help lists upgrade subcommand");
}

section("install: version flag");

{
  const result = runInstall(["--version"]);
  assert(result.status === 0, "--version exits 0");
  assert(result.stdout.trim() === "8.0.0", `--version outputs 8.0.0 (got ${result.stdout.trim()})`);
}
