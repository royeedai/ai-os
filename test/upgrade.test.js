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
