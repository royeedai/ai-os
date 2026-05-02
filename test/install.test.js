#!/usr/bin/env node

/**
 * Install tests: default create-ai-os produces the v9 canonical layout.
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

  assert(exists(dir, "AGENTS.md"), "AGENTS.md installed at root");
  assert(exists(dir, "CLAUDE.md"), "CLAUDE.md pointer installed");
  assert(exists(dir, "GEMINI.md"), "GEMINI.md pointer installed");
  // v9.1: pointers must be thin stubs (no constitution duplication, <=15 lines incl. blank lines)
  const claude = readFile(dir, "CLAUDE.md");
  assert(claude && claude.split("\n").length <= 15, `CLAUDE.md is a thin stub (<=15 lines, got ${claude.split("\n").length})`);
  assert(claude && !claude.includes("Behavior is rule-driven") && !claude.includes("Key rules summarized"), "CLAUDE.md does not duplicate constitution rules");
  const gemini = readFile(dir, "GEMINI.md");
  assert(gemini && gemini.split("\n").length <= 15, `GEMINI.md is a thin stub (<=15 lines, got ${gemini.split("\n").length})`);
  assert(gemini && !gemini.includes("Behavior is rule-driven") && !gemini.includes("Key rules summarized"), "GEMINI.md does not duplicate constitution rules");
  assert(exists(dir, ".gitignore"), ".gitignore created");
  assert(exists(dir, ".gitattributes"), ".gitattributes created");

  assert(exists(dir, ".ai-os/MISSION.md"), "shared root MISSION.md installed");
  assert(exists(dir, ".ai-os/memory.md"), "shared root memory.md installed");
  assert(exists(dir, ".ai-os/framework.toml"), "framework.toml written");
  assert(exists(dir, ".ai-os/managed-files.tsv"), "managed-files.tsv written");

  assert(exists(dir, ".ai-os/lanes/default"), "default lane directory installed");
  assert(exists(dir, ".ai-os/lanes/default/lane.toml"), "lane.toml installed");
  assert(exists(dir, ".ai-os/lanes/default/MISSION.md"), "lane MISSION.md installed");
  assert(exists(dir, ".ai-os/lanes/default/DESIGN.md"), "lane DESIGN.md installed");
  assert(exists(dir, ".ai-os/lanes/default/STATE.md"), "lane STATE.md installed");
  assert(exists(dir, ".ai-os/lanes/default/baseline-log"), "lane baseline-log dir installed");
  assert(exists(dir, ".ai-os/lanes/default/specs"), "lane specs dir installed");
  assert(exists(dir, ".ai-os/lanes/default/tasks.yaml"), "lane tasks.yaml installed");
  assert(exists(dir, ".ai-os/lanes/default/risk-register.md"), "lane risk-register.md installed");
  assert(exists(dir, ".ai-os/lanes/default/release-plan.md"), "lane release-plan.md installed");
  assert(exists(dir, ".ai-os/lanes/default/verification-matrix.yaml"), "lane verification-matrix.yaml installed");
  assert(exists(dir, ".ai-os/lanes/default/design-pack"), "lane design-pack dir installed");
  assert(exists(dir, ".ai-os/lanes/default/evals"), "lane evals dir installed");

  const records = listBaselineRecords(dir);
  assert(records.length === 1, "exactly one lane baseline record created");
  assert(BASELINE_RECORD_NAME_PATTERN.test(records[0]), `baseline record name matches pattern: ${records[0]}`);

  const agents = readFile(dir, "AGENTS.md");
  assert(agents && agents.includes("AI 交付宪法"), "AGENTS.md contains constitution marker");
  assert(agents && agents.split("\n").length <= 150, "AGENTS.md is within 150 lines");

  const gitignore = readFile(dir, ".gitignore");
  assert(gitignore && gitignore.includes(".ai-os/lanes/*/STATE.md"), ".gitignore excludes lane STATE.md");

  const gitattributes = readFile(dir, ".gitattributes");
  assert(gitattributes && gitattributes.includes("memory.md merge=union"), ".gitattributes uses union merge for memory.md");

  const toml = readFile(dir, ".ai-os/framework.toml");
  assert(toml && toml.includes('schema_version = "9"'), "framework.toml has schema_version=9");
  assert(toml && toml.includes('layout_mode = "shared-root-default-lane"'), "framework.toml records canonical layout");
  assert(toml && toml.includes('framework_version = "9.4.0"'), "framework.toml has version 9.4.0");

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

section("install: idempotency preserves user-authored lane content");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.writeFileSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md"), "# My user-authored lane mission\n");
  const result = runInstall([dir]);
  assert(result.status === 0, "second install exits 0");
  const mission = readFile(dir, ".ai-os/lanes/default/MISSION.md");
  assert(mission === "# My user-authored lane mission\n", "user lane mission preserved on re-install");
  cleanup(dir);
}

section("install: --force overwrites managed content");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.writeFileSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md"), "# edited by user\n");
  runInstall([dir, "--force"]);
  const mission = readFile(dir, ".ai-os/lanes/default/MISSION.md");
  assert(mission && mission.includes("当前交付基线摘要"), "force overwrites lane mission back to template");
  cleanup(dir);
}

section("install: help flag");

{
  const result = runInstall(["--help"]);
  assert(result.status === 0, "--help exits 0");
  assert(result.stdout.includes("Usage:"), "--help shows usage");
  assert(result.stdout.includes("Explicit install alias"), "--help identifies install as an alias");
  assert(result.stdout.includes("Primary operations:"), "--help labels primary operations");
  assert(result.stdout.includes("create-ai-os doctor"), "--help lists doctor subcommand");
  assert(result.stdout.includes("create-ai-os upgrade"), "--help lists upgrade subcommand");
}

section("install: version flag");

{
  const result = runInstall(["--version"]);
  assert(result.status === 0, "--version exits 0");
  assert(result.stdout.trim() === "9.4.0", `--version outputs 9.4.0 (got ${result.stdout.trim()})`);
}
