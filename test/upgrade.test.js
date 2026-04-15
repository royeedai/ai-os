#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, run, tmpDir, cleanup, section } = require("./helpers");

// ---------------------------------------------------------------------------
// diff / upgrade
// ---------------------------------------------------------------------------

section("diff / upgrade");

const diffUpgradeDir = tmpDir();
run("create-ai-os.js", [diffUpgradeDir, "--with-project-files"]);

const diffCleanResult = run("ai-os-diff.js", [diffUpgradeDir]);
assert(diffCleanResult.status === 0, "diff exits with code 0 on clean project");
assert(diffCleanResult.stdout.includes("0 modified") && diffCleanResult.stdout.includes("0 missing"), "diff reports no changes on fresh project");

const upgradeCleanResult = run("ai-os-upgrade.js", [diffUpgradeDir]);
assert(upgradeCleanResult.status === 0, "upgrade exits with code 0 on up-to-date project");
assert(upgradeCleanResult.stdout.includes("Already up to date"), "upgrade reports already up to date");

const upgradeDryRunResult = run("ai-os-upgrade.js", [diffUpgradeDir, "--dry-run"]);
assert(upgradeDryRunResult.status === 0, "upgrade --dry-run exits with code 0");

const upgradePreflightResult = run("ai-os-upgrade.js", [diffUpgradeDir, "--preflight"]);
assert(upgradePreflightResult.status === 0, "upgrade --preflight exits with code 0 on clean project");

fs.appendFileSync(path.join(diffUpgradeDir, ".gitattributes"), "\n.ai-os/tasks.yaml merge=union\n", "utf8");
const upgradeObsoleteMergeResult = run("ai-os-upgrade.js", [diffUpgradeDir]);
assert(upgradeObsoleteMergeResult.status === 0, "upgrade removes obsolete tasks.yaml merge strategy");
assert(
  !fs.readFileSync(path.join(diffUpgradeDir, ".gitattributes"), "utf8").includes("tasks.yaml merge=union"),
  "upgrade strips obsolete tasks.yaml merge=union entry"
);

cleanup(diffUpgradeDir);

section("upgrade --to-lanes migration");

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);

  assert(fs.existsSync(path.join(dir, ".ai-os", "MISSION.md")), "legacy project starts with root MISSION.md");
  assert(!fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md")), "legacy project has no lane-scoped mission before migration");

  const preflightResult = run("ai-os-upgrade.js", [dir, "--to-lanes", "--preflight"]);
  assert(preflightResult.status === 0, "upgrade --to-lanes --preflight passes on legacy project");
  assert(preflightResult.stdout.includes("SAFE_TO_UPGRADE_AND_MIGRATE"), "preflight reports lane migration is safe");

  const migrateResult = run("ai-os-upgrade.js", [dir, "--to-lanes"]);
  assert(migrateResult.status === 0, "upgrade --to-lanes succeeds on legacy project");
  assert(migrateResult.stdout.includes("Lane migration"), "upgrade reports lane migration summary");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md")), "MISSION.md moved into default lane");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "baseline-log")), "baseline-log moved into default lane");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "lane.toml")), "lane metadata created during migration");
  assert(fs.existsSync(path.join(dir, ".ai-os", "project.md")), "shared project.md created during migration");
  assert(!fs.existsSync(path.join(dir, ".ai-os", "MISSION.md")), "root MISSION.md removed after migration");

  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "validate passes after legacy-to-lanes migration");

  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);

  const result = run("ai-os-upgrade.js", [dir, "--to-lanes"]);
  assert(result.status === 0, "upgrade --to-lanes is a no-op on lane-based project");
  assert(result.stdout.includes("already uses lane-based"), "upgrade explains lane migration is already satisfied");

  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.mkdirSync(path.join(dir, ".ai-os", "lanes", "default"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".ai-os", "lanes", "default", "lane.toml"), 'id = "default"\nstatus = "active"\n', "utf8");

  const result = run("ai-os-upgrade.js", [dir, "--to-lanes", "--preflight"]);
  assert(result.status === 1, "upgrade --to-lanes --preflight blocks mixed layout");
  assert(result.stdout.includes("BLOCKED"), "preflight reports mixed layout as blocked");

  cleanup(dir);
}

// ---------------------------------------------------------------------------
// upgrade / diff error paths
// ---------------------------------------------------------------------------

section("upgrade / diff error paths");

// No framework.toml → upgrade fails with helpful message
{
  const dir = tmpDir();
  const result = run("ai-os-upgrade.js", [dir]);
  assert(result.status === 1, "upgrade fails without framework.toml");
  assert(result.stderr.includes("framework.toml"), "upgrade error mentions framework.toml");
  cleanup(dir);
}

// Missing local metadata on an installed project → doctor warns, upgrade recreates metadata
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.unlinkSync(path.join(dir, ".ai-os", "framework.toml"));
  fs.unlinkSync(path.join(dir, ".ai-os", "managed-files.tsv"));

  const doctorResult = run("ai-os-doctor.js", [dir]);
  assert(doctorResult.status === 0, "doctor tolerates missing local metadata on installed project");
  assert(doctorResult.stdout.includes("metadata will be inferred"), "doctor explains metadata inference");
  assert(doctorResult.stdout.includes("Install profile: project (inferred)"), "doctor infers install profile when metadata is missing");

  const upgradeResult = run("ai-os-upgrade.js", [dir]);
  assert(upgradeResult.status === 0, "upgrade recreates missing local metadata when framework is current");
  assert(upgradeResult.stdout.includes("Refreshed local install metadata"), "upgrade reports metadata refresh");
  assert(fs.existsSync(path.join(dir, ".ai-os", "framework.toml")), "upgrade restores framework.toml");
  assert(fs.existsSync(path.join(dir, ".ai-os", "managed-files.tsv")), "upgrade restores managed-files.tsv");
  cleanup(dir);
}

// Modified framework file → upgrade blocks without --force
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.appendFileSync(path.join(dir, "AGENTS.md"), "\n<!-- local edit -->\n", "utf8");
  const result = run("ai-os-upgrade.js", [dir]);
  assert(result.status === 1, "upgrade blocks on locally modified framework files");
  assert(
    result.stdout.includes("Conflict") || result.stderr.includes("blocked"),
    "upgrade reports conflict or blocked status"
  );
  cleanup(dir);
}

// Modified framework file + --force → upgrade succeeds
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.appendFileSync(path.join(dir, "AGENTS.md"), "\n<!-- local edit -->\n", "utf8");
  const result = run("ai-os-upgrade.js", [dir, "--force"]);
  assert(result.status === 0, "upgrade --force succeeds with modified files");
  assert(result.stdout.includes("Upgrade complete"), "upgrade --force reports completion");
  cleanup(dir);
}

// Preflight with modified file → BLOCKED
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.appendFileSync(path.join(dir, "AGENTS.md"), "\n<!-- local edit -->\n", "utf8");
  const result = run("ai-os-upgrade.js", [dir, "--preflight"]);
  assert(result.status === 1, "upgrade --preflight detects conflicts");
  assert(result.stdout.includes("BLOCKED"), "upgrade --preflight reports BLOCKED");
  cleanup(dir);
}

// Deleted managed file → diff detects missing, upgrade restores it
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.unlinkSync(path.join(dir, "AGENTS.md"));
  const diffResult = run("ai-os-diff.js", [dir]);
  assert(diffResult.stdout.includes("missing") && diffResult.stdout.includes("AGENTS.md"), "diff detects deleted managed file");
  const upgradeResult = run("ai-os-upgrade.js", [dir]);
  assert(upgradeResult.status === 0, "upgrade restores missing managed file");
  assert(fs.existsSync(path.join(dir, "AGENTS.md")), "AGENTS.md restored after upgrade");
  cleanup(dir);
}
