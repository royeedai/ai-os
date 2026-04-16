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
const multiLaneExampleRoot = path.join(repoRoot, "examples", "multi-lane-team-workspace");
const multiLaneDefaultRoot = path.join(multiLaneExampleRoot, ".ai-os", "lanes", "default");
const multiLaneReportingRoot = path.join(multiLaneExampleRoot, ".ai-os", "lanes", "reporting-export");
const multiLaneArchivedRoot = path.join(multiLaneExampleRoot, ".ai-os", "lanes", "import-cleanup");

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

section("multi-lane team workspace example");
assert(fs.existsSync(path.join(multiLaneExampleRoot, "README.md")), "multi-lane team workspace includes README");
assert(fs.existsSync(path.join(multiLaneExampleRoot, ".ai-os", "project.md")), "multi-lane team workspace includes shared project charter");
assert(fs.existsSync(path.join(multiLaneDefaultRoot, "lane.toml")), "multi-lane team workspace includes default lane metadata");
assert(fs.existsSync(path.join(multiLaneReportingRoot, "lane.toml")), "multi-lane team workspace includes draft reporting lane metadata");
assert(fs.existsSync(path.join(multiLaneArchivedRoot, "lane.toml")), "multi-lane team workspace includes archived import lane metadata");
assert(fs.existsSync(path.join(multiLaneArchivedRoot, "release-plan.md")), "multi-lane team workspace keeps release-plan for archived lane closure");
assert(listLaneBaselineRecords(multiLaneExampleRoot, "reporting-export", "BL-").some((name) => BASELINE_RECORD_NAME_PATTERN.test(name)), "reporting-export lane includes timestamped baseline-log record");
assert(listLaneBaselineRecords(multiLaneExampleRoot, "import-cleanup", "BL-").some((name) => BASELINE_RECORD_NAME_PATTERN.test(name)), "import-cleanup lane includes timestamped baseline-log record");
const multiLaneReadme = fs.readFileSync(path.join(multiLaneExampleRoot, "README.md"), "utf8");
assert(multiLaneReadme.includes("1 active + 1 draft + 1 archived"), "multi-lane README documents lane topology");
assert(multiLaneReadme.includes("memory.md"), "multi-lane README documents shared memory reflux");
const multiLaneMemory = fs.readFileSync(path.join(multiLaneExampleRoot, ".ai-os", "memory.md"), "utf8");
assert(multiLaneMemory.includes("导入清洗"), "multi-lane shared memory includes archived lane conclusions");
const multiLaneList = run("create-ai-os.js", ["lane", "list", multiLaneExampleRoot]);
assert(multiLaneList.status === 0, "lane list works for multi-lane team workspace example");
assert(multiLaneList.stdout.includes("Topology: 1 active, 1 draft, 1 archived"), "lane list reports the multi-lane example topology");
assert(multiLaneList.stdout.includes("outcome=shipped"), "lane list reports archived lane outcome");
const archivedStatus = run("ai-os-status.js", [multiLaneExampleRoot, "--lane", "import-cleanup"]);
assert(archivedStatus.status === 0, "status works for archived lane in multi-lane example");
assert(archivedStatus.stdout.includes("收口结果: shipped"), "status reports archived lane outcome in example");
assert(archivedStatus.stdout.includes("CONVENTIONS 回流: done"), "status reports archived lane conventions sync in example");
const archivedDoctor = run("ai-os-doctor.js", [multiLaneExampleRoot, "--lane", "import-cleanup"]);
assert(archivedDoctor.status === 1, "doctor reports framework skeleton gaps for archived lane example");
assert(archivedDoctor.stdout.includes("archive outcome: shipped"), "doctor reports archived lane outcome in example");
assert(archivedDoctor.stdout.includes("Archived lane memory sync is valid: done"), "doctor validates archived lane memory sync in example");

section("migration example guidance");
const migrationExamplePath = path.join(repoRoot, "examples", "legacy-to-lanes-migration.md");
assert(fs.existsSync(migrationExamplePath), "migration example exists");
const migrationExample = fs.readFileSync(migrationExamplePath, "utf8");
assert(migrationExample.includes("upgrade . --to-lanes --preflight"), "migration example documents preflight review");
assert(migrationExample.includes("status --lane default"), "migration example documents lane-scoped verification");

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
  ["multi-lane team example", multiLaneExampleRoot, false],
]) {
  const result = run("ai-os-validate.js", [root]);
  assert(result.status === 0, `${label}: validate passes`);
  if (!allowWarnings) {
    assert(!result.stdout.includes("WARNING"), `${label}: validate passes without warnings`);
  }
}
