#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, run, tmpDir, cleanup, section } = require("./helpers");
const { getLaneFilePath } = require("../bin/shared");

// ---------------------------------------------------------------------------
// Token budget command
// ---------------------------------------------------------------------------

section("token-budget command");

{
  const result = run("ai-os-token-budget.js", ["--source"]);
  assert(result.status === 0, "token-budget --source exits with code 0");
  assert(result.stdout.includes("Total"), "token-budget --source prints total");
  assert(result.stdout.includes("tokens"), "token-budget --source prints token counts");
  assert(result.stdout.includes("skills"), "token-budget --source includes skills category");
  assert(result.stdout.includes("workflows"), "token-budget --source includes workflows category");
  assert(result.stdout.includes("Top 10"), "token-budget --source lists top files");
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir]);
  const result = run("ai-os-token-budget.js", [dir]);
  assert(result.status === 0, "token-budget on installed project exits with code 0");
  assert(result.stdout.includes("Total"), "token-budget on installed project prints total");
  cleanup(dir);
}

// ---------------------------------------------------------------------------
// Lite mode
// ---------------------------------------------------------------------------

section("--lite install mode");

{
  const dir = tmpDir();
  const liteResult = run("create-ai-os.js", [dir, "--lite", "--with-project-files"]);
  assert(liteResult.status === 0, "lite init exits with code 0");
  assert(liteResult.stdout.includes("(lite)"), "lite init prints lite label");
  assert(fs.existsSync(path.join(dir, "AGENTS.md")), "lite: AGENTS.md installed");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "align.md")), "lite: align workflow installed");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "design.md")), "lite: design workflow installed");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "build.md")), "lite: build workflow installed");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "verify.md")), "lite: verify workflow installed");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "debug.md")), "lite: debug workflow installed");
  assert(fs.existsSync(path.join(dir, ".agents", "skills", "acceptance-gate", "SKILL.md")), "lite: acceptance-gate skill installed");
  assert(fs.existsSync(path.join(dir, ".agents", "skills", "memory-manager", "SKILL.md")), "lite: memory-manager skill installed");
  assert(fs.existsSync(getLaneFilePath(dir, "default", "MISSION.md")), "lite: project files created");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "ship.md")), "lite: ship workflow now included");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "plan.md")), "lite: plan workflow now included");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "change-request.md")), "lite: change-request workflow included");
  assert(fs.existsSync(path.join(dir, ".agents", "skills", "code-review-guard", "SKILL.md")), "lite: code-review-guard skill now included");
  assert(fs.existsSync(path.join(dir, ".agents", "skills", "project-planner", "SKILL.md")), "lite: project-planner skill included");
  assert(fs.existsSync(path.join(dir, ".agents", "skills", "spec-validator", "SKILL.md")), "lite: spec-validator skill included");
  assert(!fs.existsSync(path.join(dir, ".agents", "skills", "api-design", "SKILL.md")), "lite: supplementary api-design skill excluded");
  assert(!fs.existsSync(path.join(dir, ".agents", "skills", "database-schema-design", "SKILL.md")), "lite: supplementary database-schema-design skill excluded");
  assert(!fs.existsSync(path.join(dir, ".agents", "skills", "performance-optimization", "SKILL.md")), "lite: supplementary performance-optimization skill excluded");
  assert(!fs.existsSync(path.join(dir, ".agents", "skills", "architecture-reviewer", "SKILL.md")), "lite: supplementary architecture-reviewer skill excluded");
  assert(!fs.existsSync(path.join(dir, ".agents", "skills", "systematic-debugging", "SKILL.md")), "lite: supplementary systematic-debugging skill excluded");
  assert(!fs.existsSync(path.join(dir, ".agents", "workflows", "review.md")), "lite: review workflow excluded");
  assert(!fs.existsSync(path.join(dir, ".agents", "workflows", "postmortem.md")), "lite: postmortem workflow excluded");
  assert(
    fs.readFileSync(path.join(dir, ".ai-os", "framework.toml"), "utf8").includes('framework_footprint = "lite"'),
    "lite metadata records lite footprint"
  );

  const liteDoctorResult = run("ai-os-doctor.js", [dir]);
  assert(liteDoctorResult.status === 0, "doctor passes on lite install");
  assert(liteDoctorResult.stdout.includes("Framework footprint: lite"), "doctor reports lite footprint");

  const liteDiffResult = run("ai-os-diff.js", [dir, "--stat"]);
  assert(liteDiffResult.status === 0, "diff --stat works on lite install");
  assert(liteDiffResult.stdout.includes("0 missing"), "diff does not report missing full-framework files on lite install");

  const liteUpgradePreflightResult = run("ai-os-upgrade.js", [dir, "--preflight"]);
  assert(liteUpgradePreflightResult.status === 0, "upgrade --preflight passes on lite install");
  assert(!liteUpgradePreflightResult.stdout.includes("Files to create"), "upgrade --preflight does not try to expand lite install to full");

  const liteTokenResult = run("ai-os-token-budget.js", [dir, "--lite"]);
  assert(liteTokenResult.status === 0, "token-budget --lite exits with code 0");
  assert(liteTokenResult.stdout.includes("lite mode"), "token-budget --lite shows mode label");

  cleanup(dir);
}
