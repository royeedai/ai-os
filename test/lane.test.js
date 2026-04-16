#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, cleanup, run, tmpDir, section } = require("./helpers");

section("lane lifecycle command");

{
  const helpResult = run("create-ai-os.js", ["--help"]);
  assert(helpResult.status === 0, "create-ai-os --help exits with code 0");
  assert(helpResult.stdout.includes("create-ai-os lane list [target-dir]"), "create-ai-os --help documents the lane list command");
  assert(helpResult.stdout.includes("create-ai-os lane add <lane-id> [dir]"), "create-ai-os --help documents the lane add command");
  const laneHelpResult = run("create-ai-os.js", ["lane", "--help"]);
  assert(laneHelpResult.status === 0, "create-ai-os lane --help exits with code 0");
  assert(laneHelpResult.stdout.includes("--risk-tier <tier>"), "create-ai-os lane --help documents lane risk tier");
  assert(laneHelpResult.stdout.includes("--outcome <outcome>"), "create-ai-os lane --help documents lane archive outcome");
  assert(laneHelpResult.stdout.includes("--memory-sync <status>"), "create-ai-os lane --help documents lane archive sync status");
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);

  const listResult = run("create-ai-os.js", ["lane", "list", dir]);
  assert(listResult.status === 0, "lane list exits with code 0");
  assert(listResult.stdout.includes("Auto-selection: default"), "lane list reports single active lane auto-selection");
  assert(listResult.stdout.includes("Topology: 1 active, 0 draft, 0 archived"), "lane list reports lane topology counts");
  assert(listResult.stdout.includes("default"), "lane list prints the default lane");

  const addResult = run("create-ai-os.js", ["lane", "add", "beta", dir, "--title", "Beta lane", "--owner", "team-pay", "--risk-tier", "high"]);
  assert(addResult.status === 0, "lane add succeeds on lane-based project");
  assert(addResult.stdout.includes("Created lane: beta"), "lane add prints the created lane id");
  assert(addResult.stdout.includes("Status: draft"), "lane add defaults new secondary lane to draft");
  assert(addResult.stdout.includes("Risk tier: high"), "lane add prints the requested risk tier");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "beta", "MISSION.md")), "lane add creates lane-scoped MISSION");

  const betaMetadata = fs.readFileSync(path.join(dir, ".ai-os", "lanes", "beta", "lane.toml"), "utf8");
  assert(betaMetadata.includes('id = "beta"'), "lane add writes the requested lane id");
  assert(betaMetadata.includes('title = "Beta lane"'), "lane add writes the requested lane title");
  assert(betaMetadata.includes('status = "draft"'), "lane add writes draft status for inactive lane");
  assert(betaMetadata.includes('owner = "team-pay"'), "lane add writes the requested lane owner");
  assert(betaMetadata.includes('risk_tier = "high"'), "lane add writes the requested lane risk tier");
  assert(betaMetadata.includes('baseline_id = "BL-'), "lane add writes a generated baseline id");

  const activateResult = run("create-ai-os.js", ["lane", "activate", "beta", dir]);
  assert(activateResult.status === 0, "lane activate succeeds");
  assert(activateResult.stdout.includes("Active lanes now: beta, default"), "lane activate keeps existing active lanes by default");

  const activateOnlyResult = run("create-ai-os.js", ["lane", "activate", "beta", dir, "--only"]);
  assert(activateOnlyResult.status === 0, "lane activate --only succeeds");
  assert(activateOnlyResult.stdout.includes("Auto-selection now resolves to: beta"), "lane activate --only restores single active lane auto-selection");

  const defaultMetadata = fs.readFileSync(path.join(dir, ".ai-os", "lanes", "default", "lane.toml"), "utf8");
  assert(defaultMetadata.includes('status = "draft"'), "lane activate --only moves previously active lanes back to draft");

  const statusResult = run("create-ai-os.js", ["status", dir]);
  assert(statusResult.status === 0, "status works after activating a new single active lane");
  assert(statusResult.stdout.includes("lane: beta"), "status auto-selects the activated lane");
  assert(statusResult.stdout.includes("风险档位: high"), "status reports current lane risk tier");

  const blockedArchiveResult = run("create-ai-os.js", ["lane", "archive", "beta", dir, "--outcome", "shipped", "--reason", "Ready to merge"]);
  assert(blockedArchiveResult.status === 1, "lane archive blocks when closure sync decisions are missing");
  assert(blockedArchiveResult.stderr.includes("memory sync still pending"), "lane archive reports pending memory sync");

  const archiveResult = run("create-ai-os.js", [
    "lane",
    "archive",
    "beta",
    dir,
    "--outcome",
    "superseded",
    "--reason",
    "Merged into default lane",
    "--memory-sync",
    "done",
    "--conventions-sync",
    "not-needed",
    "--problem-ledger-sync",
    "not-needed",
  ]);
  assert(archiveResult.status === 0, "lane archive succeeds");
  assert(archiveResult.stdout.includes("Outcome: superseded"), "lane archive prints archive outcome");
  assert(archiveResult.stdout.includes("No active lane remains"), "lane archive reports when no active lane remains");

  const archivedBetaMetadata = fs.readFileSync(path.join(dir, ".ai-os", "lanes", "beta", "lane.toml"), "utf8");
  assert(archivedBetaMetadata.includes('archive_outcome = "superseded"'), "lane archive writes archive outcome");
  assert(archivedBetaMetadata.includes('memory_sync = "done"'), "lane archive writes memory sync status");

  const archivedStatusResult = run("ai-os-status.js", [dir, "--lane", "beta"]);
  assert(archivedStatusResult.status === 0, "status can read archived lane explicitly");
  assert(archivedStatusResult.stdout.includes("收口结果: superseded"), "status reports archived lane outcome");
  assert(archivedStatusResult.stdout.includes("memory 回流: done"), "status reports archived lane memory sync");

  const archivedDoctorResult = run("ai-os-doctor.js", [dir, "--lane", "beta"]);
  assert(archivedDoctorResult.status === 0, "doctor can inspect archived lane explicitly");
  assert(archivedDoctorResult.stdout.includes("archive outcome: superseded"), "doctor reports archived lane outcome");
  assert(archivedDoctorResult.stdout.includes("Archived lane memory sync is valid: done"), "doctor validates archived lane memory sync");

  const reopenResult = run("create-ai-os.js", ["lane", "activate", "beta", dir, "--only"]);
  assert(reopenResult.status === 0, "lane activate can reopen an archived lane");
  assert(reopenResult.stdout.includes("Archived closure metadata was cleared"), "lane activate explains archive metadata reset when reopening");

  const reopenedBetaMetadata = fs.readFileSync(path.join(dir, ".ai-os", "lanes", "beta", "lane.toml"), "utf8");
  assert(reopenedBetaMetadata.includes('status = "active"'), "reopened lane becomes active again");
  assert(!reopenedBetaMetadata.includes("archive_outcome"), "reopened lane clears archived outcome metadata");
  assert(!reopenedBetaMetadata.includes("memory_sync"), "reopened lane clears archived sync metadata");

  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir]);

  const laneAddResult = run("create-ai-os.js", ["lane", "add", "payments", dir, "--quality-tier", "high-risk"]);
  assert(laneAddResult.status === 0, "lane add succeeds on a core-profile install with no lanes yet");
  assert(laneAddResult.stdout.includes("Auto-selection now resolves to: payments"), "first lane add becomes active by default");
  assert(laneAddResult.stdout.includes("Risk tier: high"), "lane add derives risk tier from quality tier by default");
  assert(fs.existsSync(path.join(dir, ".ai-os", "project.md")), "lane add materializes shared project artifacts on core installs");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "payments", "acceptance.yaml")), "lane add materializes lane starter artifacts on core installs");

  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);

  const legacyAddResult = run("create-ai-os.js", ["lane", "add", "beta", dir]);
  assert(legacyAddResult.status === 1, "lane add blocks on legacy single-delivery layout");
  assert(legacyAddResult.stderr.includes("--to-lanes"), "lane add explains how to migrate a legacy project first");

  cleanup(dir);
}
