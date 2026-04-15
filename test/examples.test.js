#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  assert,
  run,
  listBaselineRecords,
  listLaneBaselineRecords,
  section,
  repoRoot,
  BASELINE_RECORD_NAME_PATTERN,
} = require("./helpers");

// ---------------------------------------------------------------------------
// New example skeletons
// ---------------------------------------------------------------------------

section("new example skeletons");

const reverseSpecExampleRoot = path.join(repoRoot, "examples", "reverse-spec-admin-console");
const highRiskExampleRoot = path.join(repoRoot, "examples", "high-risk-state-change");
const debugExampleRoot = path.join(repoRoot, "examples", "debug-bounded-fix");
const changeRequestExampleRoot = path.join(repoRoot, "examples", "change-request-baseline-sync");
const degradedPathExampleRoot = path.join(repoRoot, "examples", "degraded-path-verification");
const quickstartExampleRoot = path.join(repoRoot, "examples", "quickstart-todo-cli");
const quickstartLaneRoot = path.join(quickstartExampleRoot, ".ai-os", "lanes", "default");

assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "STATE.md")), "reverse-spec example skeleton includes STATE");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "tasks.yaml")), "reverse-spec example skeleton includes tasks");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "CONVENTIONS.md")), "reverse-spec example skeleton includes CONVENTIONS");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "memory.md")), "reverse-spec example skeleton includes memory");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "specs", "admin-list.spec.md")), "reverse-spec example skeleton includes spec");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "MISSION.md")), "high-risk example skeleton includes MISSION");
assert(listBaselineRecords(highRiskExampleRoot, "BL-").some((name) => BASELINE_RECORD_NAME_PATTERN.test(name)), "high-risk example skeleton includes timestamped baseline-log record");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "STATE.md")), "high-risk example skeleton includes STATE");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "DESIGN.md")), "high-risk example skeleton includes DESIGN");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "CONVENTIONS.md")), "high-risk example skeleton includes CONVENTIONS");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "tasks.yaml")), "high-risk example skeleton includes tasks");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "acceptance.yaml")), "high-risk example skeleton includes acceptance");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "risk-register.md")), "high-risk example skeleton includes risk-register");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "release-plan.md")), "high-risk example skeleton includes release-plan");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "verification-matrix.yaml")), "high-risk example skeleton includes verification-matrix");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "evals", "deduction-duplicate-submit.md")), "high-risk example skeleton includes referenced failure-mode eval");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "memory.md")), "high-risk example skeleton includes memory");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change", ".ai-os", "specs", "state-transition.spec.md")), "high-risk example skeleton includes spec");
assert(fs.existsSync(path.join(repoRoot, "examples", "debug-bounded-fix", ".ai-os", "MISSION.md")), "debug example skeleton includes MISSION");
assert(listBaselineRecords(debugExampleRoot, "BL-").some((name) => BASELINE_RECORD_NAME_PATTERN.test(name)), "debug example skeleton includes timestamped baseline-log record");
assert(fs.existsSync(path.join(repoRoot, "examples", "debug-bounded-fix", ".ai-os", "STATE.md")), "debug example skeleton includes STATE");
assert(fs.existsSync(path.join(repoRoot, "examples", "change-request-baseline-sync", ".ai-os", "MISSION.md")), "change-request example skeleton includes MISSION");
assert(listBaselineRecords(changeRequestExampleRoot, "BL-").length >= 2, "change-request example skeleton includes multiple baseline records");
assert(listBaselineRecords(changeRequestExampleRoot, "CR-").some((name) => BASELINE_RECORD_NAME_PATTERN.test(name)), "change-request example skeleton includes timestamped change-request record");
assert(fs.existsSync(path.join(repoRoot, "examples", "change-request-baseline-sync", ".ai-os", "STATE.md")), "change-request example skeleton includes STATE");
assert(fs.existsSync(path.join(repoRoot, "examples", "degraded-path-verification", ".ai-os", "MISSION.md")), "degraded-path example skeleton includes MISSION");
assert(listBaselineRecords(degradedPathExampleRoot, "BL-").some((name) => BASELINE_RECORD_NAME_PATTERN.test(name)), "degraded-path example skeleton includes timestamped baseline-log record");
assert(fs.existsSync(path.join(repoRoot, "examples", "degraded-path-verification", ".ai-os", "STATE.md")), "degraded-path example skeleton includes STATE");

section("quickstart example");
assert(fs.existsSync(path.join(repoRoot, "examples", "quickstart-todo-cli", "README.md")), "quickstart includes README");
assert(fs.existsSync(path.join(repoRoot, "examples", "quickstart-todo-cli", ".ai-os", "project.md")), "quickstart includes shared project charter");
assert(fs.existsSync(path.join(quickstartLaneRoot, "lane.toml")), "quickstart includes lane metadata");
assert(fs.existsSync(path.join(quickstartLaneRoot, "MISSION.md")), "quickstart includes lane MISSION");
assert(listLaneBaselineRecords(quickstartExampleRoot, "default", "BL-").some((name) => BASELINE_RECORD_NAME_PATTERN.test(name)), "quickstart includes timestamped lane baseline-log record");
assert(fs.existsSync(path.join(quickstartLaneRoot, "DESIGN.md")), "quickstart includes lane DESIGN");
assert(fs.existsSync(path.join(quickstartLaneRoot, "tasks.yaml")), "quickstart includes lane tasks");
assert(fs.existsSync(path.join(quickstartLaneRoot, "acceptance.yaml")), "quickstart includes lane acceptance");
assert(fs.existsSync(path.join(quickstartLaneRoot, "STATE.md")), "quickstart includes lane STATE");
assert(fs.existsSync(path.join(repoRoot, "examples", "quickstart-todo-cli", ".ai-os", "memory.md")), "quickstart includes memory");
assert(fs.existsSync(path.join(quickstartLaneRoot, "specs", "todo-cli.spec.md")), "quickstart includes lane spec");
const quickstartMission = fs.readFileSync(path.join(quickstartLaneRoot, "MISSION.md"), "utf8");
assert(quickstartMission.includes("todo-cli"), "quickstart MISSION references todo-cli");
const quickstartTasks = fs.readFileSync(path.join(quickstartLaneRoot, "tasks.yaml"), "utf8");
assert(quickstartTasks.includes("status: done"), "quickstart tasks show completed status");
assert(/baseline_id: "BL-\d{8}-\d{6}-[a-z0-9-]+"/.test(quickstartTasks), "quickstart tasks include timestamped baseline_id");
assert(quickstartTasks.includes("measurable_outcome"), "quickstart tasks include measurable outcomes");
assert(quickstartTasks.includes("edge_cases"), "quickstart tasks include edge cases");

section("example artifact validation");
for (const [label, root, allowWarnings] of [
  ["greenfield example", path.join(repoRoot, "examples", "greenfield-guided-product"), true],
  ["reverse-spec example", reverseSpecExampleRoot, true],
  ["brownfield example", path.join(repoRoot, "examples", "brownfield-change-journey"), true],
  ["high-risk example", highRiskExampleRoot, true],
  ["debug example", debugExampleRoot, true],
  ["change-request example", changeRequestExampleRoot, true],
  ["degraded-path example", degradedPathExampleRoot, true],
  ["quickstart example", quickstartExampleRoot, false],
]) {
  const result = run("ai-os-validate.js", [root]);
  assert(result.status === 0, `${label}: validate passes`);
  if (!allowWarnings) {
    assert(!result.stdout.includes("WARNING"), `${label}: validate passes without warnings`);
  }
}
