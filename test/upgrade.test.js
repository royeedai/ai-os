#!/usr/bin/env node

/**
 * Upgrade tests: legacy layouts -> v9 canonical layout.
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

section("upgrade: v7-style lane project is normalized to v9");

{
  const dir = tmpDir();

  write(dir, "AGENTS.md", "# Old v7 constitution\n");
  mkdir(dir, ".agents/workflows");
  write(dir, ".agents/workflows/align.md", "# v7 align workflow\n");
  mkdir(dir, ".agents/skills/project-planner");
  write(dir, ".agents/skills/project-planner/SKILL.md", "# v7 skill\n");
  mkdir(dir, ".agents/policies");
  write(dir, ".agents/policies/approval-policy.md", "# v7 policy\n");
  mkdir(dir, ".ai-os/lanes/default/baseline-log");
  write(dir, ".ai-os/lanes/default/MISSION.md", "# User-authored lane mission\n");
  write(dir, ".ai-os/lanes/default/DESIGN.md", "# User-authored lane design\n");
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

  assert(!exists(dir, ".agents"), ".agents/ removed");
  assert(!exists(dir, ".ai-os/CONVENTIONS.md"), "CONVENTIONS.md merged and removed");
  assert(!exists(dir, ".ai-os/project.md"), "project.md merged and removed");
  assert(!exists(dir, ".ai-os/lanes/default/acceptance.yaml"), "lane acceptance.yaml merged and removed");
  assert(!exists(dir, ".cursor/rules"), ".cursor/rules removed");
  assert(!exists(dir, ".cursor/skills"), ".cursor/skills removed");

  assert(exists(dir, ".ai-os/MISSION.md"), "shared root MISSION.md exists");
  assert(exists(dir, ".ai-os/memory.md"), "shared root memory.md exists");
  assert(exists(dir, ".ai-os/lanes/default/MISSION.md"), "lane MISSION.md exists");
  assert(exists(dir, ".ai-os/lanes/default/DESIGN.md"), "lane DESIGN.md exists");
  assert(exists(dir, ".ai-os/framework.toml"), "framework.toml regenerated");

  const sharedMission = readFile(dir, ".ai-os/MISSION.md");
  assert(sharedMission && sharedMission.includes("Project context"), "project.md merged into shared mission");

  const memory = readFile(dir, ".ai-os/memory.md");
  assert(memory && memory.includes("User conventions"), "CONVENTIONS.md merged into memory.md");

  const design = readFile(dir, ".ai-os/lanes/default/DESIGN.md");
  assert(design && design.includes("User-authored lane design"), "user lane design preserved");
  assert(design && design.includes("验收标准"), "acceptance.yaml merged into lane design");

  const agents = readFile(dir, "AGENTS.md");
  assert(agents && agents.includes("AI 交付宪法"), "AGENTS.md replaced with v9");

  const doctor = runDoctor([dir]);
  assert(doctor.status === 0, "doctor passes after upgrade");

  cleanup(dir);
}

section("upgrade: v8 root-only project migrates into default lane");

{
  const dir = tmpDir();

  write(dir, "AGENTS.md", "# old root-only v8\n");
  write(dir, ".ai-os/MISSION.md", "# Root-only mission\n\n- **当前基线 ID**：BL-20260422-120000-root-only\n");
  write(dir, ".ai-os/DESIGN.md", "# Root-only design\n");
  write(dir, ".ai-os/STATE.md", "# Root-only state\n");
  mkdir(dir, ".ai-os/baseline-log");
  write(dir, ".ai-os/baseline-log/CR-20260422-120000-root-only.md", "# legacy baseline\n");
  mkdir(dir, ".ai-os/specs");
  write(dir, ".ai-os/specs/example.spec.md", "# legacy spec\n");
  write(dir, ".ai-os/tasks.yaml", "version: 3\n");
  write(dir, ".ai-os/risk-register.md", "# root risk\n");
  write(dir, ".ai-os/release-plan.md", "# root release\n");
  write(dir, ".ai-os/verification-matrix.yaml", "failure_modes: []\n");
  write(dir, ".ai-os/memory.md", "# root memory\n");
  write(dir, ".ai-os/framework.toml", 'schema_version = "8"\nlayout_mode = "root-only-legacy"\nframework_version = "8.0.0"\n');

  const result = runUpgrade([dir]);
  assert(result.status === 0, "upgrade exits 0 for v8 root-only");

  assert(exists(dir, ".ai-os/MISSION.md"), "shared root mission recreated");
  assert(exists(dir, ".ai-os/memory.md"), "shared root memory kept");
  assert(exists(dir, ".ai-os/lanes/default/MISSION.md"), "root mission migrated to lane mission");
  assert(exists(dir, ".ai-os/lanes/default/DESIGN.md"), "root design migrated to lane design");
  assert(exists(dir, ".ai-os/lanes/default/STATE.md"), "root state migrated to lane state");
  assert(exists(dir, ".ai-os/lanes/default/baseline-log/CR-20260422-120000-root-only.md"), "root baseline-log migrated to lane");
  assert(exists(dir, ".ai-os/lanes/default/tasks.yaml"), "root tasks migrated to lane");
  assert(exists(dir, ".ai-os/lanes/default/lane.toml"), "lane.toml created");

  const sharedMission = readFile(dir, ".ai-os/MISSION.md");
  assert(sharedMission && sharedMission.includes("Root-only mission"), "legacy root mission content preserved in shared mission appendix");

  const laneMission = readFile(dir, ".ai-os/lanes/default/MISSION.md");
  assert(laneMission && laneMission.includes("Root-only mission"), "legacy root mission preserved as lane mission");

  const laneToml = readFile(dir, ".ai-os/lanes/default/lane.toml");
  assert(laneToml && laneToml.includes('baseline_id = "BL-20260422-120000-root-only"'), "lane.toml baseline_id normalized from legacy mission");

  const doctor = runDoctor([dir]);
  assert(doctor.status === 0, "doctor passes after root-only migration");

  cleanup(dir);
}

section("upgrade: v8 hybrid keeps lane truth and appends root legacy");

{
  const dir = tmpDir();

  write(dir, "AGENTS.md", "# hybrid\n");
  write(dir, ".ai-os/MISSION.md", "# Root legacy mission\n");
  write(dir, ".ai-os/DESIGN.md", "# Root legacy design\n");
  write(dir, ".ai-os/memory.md", "# shared memory\n");
  write(dir, ".ai-os/framework.toml", 'schema_version = "8"\nlayout_mode = "hybrid-drift"\nframework_version = "8.0.0"\n');
  mkdir(dir, ".ai-os/lanes/default/baseline-log");
  write(dir, ".ai-os/lanes/default/MISSION.md", "# Lane mission truth\n");
  write(dir, ".ai-os/lanes/default/DESIGN.md", "# Lane design truth\n");
  write(dir, ".ai-os/lanes/default/lane.toml", 'id = "default"\n');

  const result = runUpgrade([dir]);
  assert(result.status === 0, "upgrade exits 0 for hybrid layout");

  assert(!exists(dir, ".ai-os/DESIGN.md"), "root legacy design removed after merge");

  const laneMission = readFile(dir, ".ai-os/lanes/default/MISSION.md");
  assert(laneMission && laneMission.includes("Lane mission truth"), "lane mission remains primary");
  assert(laneMission && laneMission.includes("legacy root MISSION"), "root mission appended as migration appendix");

  const laneDesign = readFile(dir, ".ai-os/lanes/default/DESIGN.md");
  assert(laneDesign && laneDesign.includes("Lane design truth"), "lane design remains primary");
  assert(laneDesign && laneDesign.includes("legacy root DESIGN"), "root design appended as migration appendix");

  const doctor = runDoctor([dir]);
  assert(doctor.status === 0, "doctor passes after hybrid normalization");

  cleanup(dir);
}

section("upgrade: dry-run does not modify anything");

{
  const dir = tmpDir();
  write(dir, "AGENTS.md", "# original\n");
  write(dir, ".ai-os/MISSION.md", "# legacy mission\n");
  write(dir, ".ai-os/memory.md", "# memory\n");

  const result = runUpgrade([dir, "--dry-run"]);
  assert(result.status === 0, "dry-run exits 0");
  assert(result.stdout.includes("[dry-run]"), "dry-run prefix shown");
  assert(result.stdout.includes("Dry-run complete"), "dry-run finish message shown");

  const agents = readFile(dir, "AGENTS.md");
  assert(agents === "# original\n", "AGENTS.md untouched in dry-run");
  assert(exists(dir, ".ai-os/MISSION.md"), "legacy mission untouched in dry-run");

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
