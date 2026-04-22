#!/usr/bin/env node

/**
 * Upgrade tests: v7 -> v8 mechanical migration.
 */

const fs = require("fs");
const path = require("path");
const {
  assert,
  runDoctor,
  runUpgrade,
  tmpDir,
  cleanup,
  exists,
  readFile,
  section,
} = require("./helpers");

function mkdir(dir, rel) {
  fs.mkdirSync(path.join(dir, rel), { recursive: true });
}

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

section("upgrade: mock v7 project gets flattened and merged");

{
  const dir = tmpDir();

  // Build a minimal v7 mock
  write(dir, "AGENTS.md", "# Old v7 constitution\n");
  mkdir(dir, ".agents/workflows");
  write(dir, ".agents/workflows/align.md", "# v7 align workflow\n");
  mkdir(dir, ".agents/skills/project-planner");
  write(dir, ".agents/skills/project-planner/SKILL.md", "# v7 skill\n");
  mkdir(dir, ".agents/policies");
  write(dir, ".agents/policies/approval-policy.md", "# v7 policy\n");
  mkdir(dir, ".ai-os/lanes/default/baseline-log");
  write(dir, ".ai-os/lanes/default/MISSION.md", "# User-authored mission (must preserve)\n");
  write(dir, ".ai-os/lanes/default/DESIGN.md", "# User-authored design\n");
  write(dir, ".ai-os/lanes/default/lane.toml", "id = \"default\"\n");
  write(dir, ".ai-os/lanes/default/acceptance.yaml", "quality_tier: standard\n");
  write(dir, ".ai-os/CONVENTIONS.md", "# User conventions\n");
  write(dir, ".ai-os/project.md", "# Project context\n");
  write(dir, ".ai-os/framework.toml", 'framework_version = "7.4.0"\n');
  mkdir(dir, ".cursor/rules");
  mkdir(dir, ".cursor/skills");
  write(dir, ".cursor/rules/auto.mdc", "---\n---\n# auto generated\n");

  const result = runUpgrade([dir]);
  assert(result.status === 0, "upgrade exits 0");
  assert(result.stdout.includes("Upgrade complete"), "stdout reports completion");

  // Old v7 structure removed
  assert(!exists(dir, ".agents"), ".agents/ removed");
  assert(!exists(dir, ".ai-os/lanes"), "lanes/ flattened away");
  assert(!exists(dir, ".ai-os/CONVENTIONS.md"), "CONVENTIONS.md merged and removed");
  assert(!exists(dir, ".ai-os/project.md"), "project.md merged and removed");
  assert(!exists(dir, ".ai-os/acceptance.yaml"), "acceptance.yaml merged and removed");
  assert(!exists(dir, ".cursor/rules"), ".cursor/rules removed");
  assert(!exists(dir, ".cursor/skills"), ".cursor/skills removed");

  // v8 structure present
  assert(exists(dir, ".ai-os/MISSION.md"), "MISSION.md at root");
  assert(exists(dir, ".ai-os/DESIGN.md"), "DESIGN.md at root");
  assert(exists(dir, ".ai-os/baseline-log"), "baseline-log at root");
  assert(exists(dir, ".ai-os/memory.md"), "memory.md exists (base from CONVENTIONS)");
  assert(exists(dir, ".ai-os/framework.toml"), "framework.toml regenerated");

  // User content preserved
  const mission = readFile(dir, ".ai-os/MISSION.md");
  assert(mission && mission.includes("User-authored mission (must preserve)"), "user mission content preserved");
  assert(mission && mission.includes("宿主项目上下文"), "project.md merged as a section");

  const memory = readFile(dir, ".ai-os/memory.md");
  assert(memory && memory.includes("User conventions"), "CONVENTIONS.md content preserved in memory.md");

  const design = readFile(dir, ".ai-os/DESIGN.md");
  assert(design && design.includes("User-authored design"), "user design content preserved");
  assert(design && design.includes("验收标准"), "acceptance.yaml merged as a section");

  // AGENTS.md replaced with v8
  const agents = readFile(dir, "AGENTS.md");
  assert(agents && agents.includes("AI 交付宪法"), "AGENTS.md replaced with v8");

  // Doctor should pass (with possibly some infos)
  const doc = runDoctor([dir]);
  assert(doc.status === 0, "doctor passes after upgrade");

  cleanup(dir);
}

section("upgrade: dry-run does not modify anything");

{
  const dir = tmpDir();
  write(dir, "AGENTS.md", "# v7 original\n");
  write(dir, ".ai-os/CONVENTIONS.md", "# preserved\n");
  mkdir(dir, ".agents/workflows");
  write(dir, ".agents/workflows/align.md", "# v7 workflow\n");

  const result = runUpgrade([dir, "--dry-run"]);
  assert(result.status === 0, "dry-run exits 0");
  assert(result.stdout.includes("[dry-run]"), "dry-run prefix shown");
  assert(result.stdout.includes("Dry-run complete"), "dry-run finish message shown");

  // Nothing changed
  const agents = readFile(dir, "AGENTS.md");
  assert(agents === "# v7 original\n", "AGENTS.md untouched in dry-run");
  assert(exists(dir, ".ai-os/CONVENTIONS.md"), "CONVENTIONS.md untouched in dry-run");
  assert(exists(dir, ".agents/workflows"), ".agents/ untouched in dry-run");

  cleanup(dir);
}

section("upgrade: fills in missing v8 starter artifacts");

{
  const dir = tmpDir();
  // Minimal v7 project without DESIGN/tasks/etc
  write(dir, "AGENTS.md", "# old\n");
  write(dir, ".ai-os/framework.toml", 'framework_version = "7.4.0"\n');
  mkdir(dir, ".ai-os/lanes/default");
  write(dir, ".ai-os/lanes/default/MISSION.md", "# user mission\n");

  runUpgrade([dir]);

  // Missing v8 starter filled in
  assert(exists(dir, ".ai-os/DESIGN.md"), "DESIGN.md starter filled");
  assert(exists(dir, ".ai-os/tasks.yaml"), "tasks.yaml starter filled");
  assert(exists(dir, ".ai-os/risk-register.md"), "risk-register.md starter filled");
  assert(exists(dir, ".ai-os/specs"), "specs/ starter filled");

  // User content preserved
  const mission = readFile(dir, ".ai-os/MISSION.md");
  assert(mission && mission.includes("user mission"), "user mission preserved through fill-in");

  cleanup(dir);
}

section("upgrade: fails clearly on non-AI-OS dir");

{
  const dir = tmpDir();
  const result = runUpgrade([dir]);
  assert(result.status !== 0, "upgrade fails on non-AI-OS dir");
  assert(result.stderr.includes("Not an AI-OS project"), "fails with clear message");
  cleanup(dir);
}
