#!/usr/bin/env node

/**
 * Install tests: default create-ai-os produces the v10 canonical layout
 * (core artifacts only; extension artifacts are on-demand).
 */

const fs = require("fs");
const path = require("path");
const {
  test,
  assert,
  runInstall,
  tmpDir,
  cleanup,
  readFile,
  exists,
  repoRoot,
  listBaselineRecords,
  BASELINE_RECORD_NAME_PATTERN,
} = require("./helpers");

test("install: default install into fresh dir", () => {
  const dir = tmpDir();
  try {
    const result = runInstall([dir]);
    assert.equal(result.status, 0, "install exits 0");
    assert.ok(result.stdout.includes("Installation complete"), "stdout reports completion");

    assert.ok(exists(dir, "AGENTS.md"), "AGENTS.md installed at root");
    assert.ok(exists(dir, "CLAUDE.md"), "CLAUDE.md pointer installed");
    assert.ok(exists(dir, "GEMINI.md"), "GEMINI.md pointer installed");
    // pointers must be thin stubs (no constitution duplication, <=10 lines incl. blank lines)
    const claude = readFile(dir, "CLAUDE.md");
    assert.ok(claude && claude.split("\n").length <= 10, `CLAUDE.md is a thin stub (<=10 lines, got ${claude.split("\n").length})`);
    assert.ok(claude && !claude.includes("Behavior is rule-driven") && !claude.includes("Key rules summarized"), "CLAUDE.md does not duplicate constitution rules");
    const gemini = readFile(dir, "GEMINI.md");
    assert.ok(gemini && gemini.split("\n").length <= 10, `GEMINI.md is a thin stub (<=10 lines, got ${gemini.split("\n").length})`);
    assert.ok(gemini && !gemini.includes("Behavior is rule-driven") && !gemini.includes("Key rules summarized"), "GEMINI.md does not duplicate constitution rules");
    assert.ok(exists(dir, ".gitignore"), ".gitignore created");
    assert.ok(exists(dir, ".gitattributes"), ".gitattributes created");

    assert.ok(exists(dir, ".ai-os/MISSION.md"), "shared root MISSION.md installed");
    assert.ok(exists(dir, ".ai-os/memory.md"), "shared root memory.md installed");
    assert.ok(exists(dir, ".ai-os/framework.toml"), "framework.toml written");
    assert.ok(exists(dir, ".ai-os/managed-files.tsv"), "managed-files.tsv written");

    assert.ok(exists(dir, ".ai-os/bin/ai-os-doctor.js"), "local doctor entry vendored");
    assert.ok(exists(dir, ".ai-os/bin/shared.js"), "local doctor shared module vendored");
    assert.ok(exists(dir, ".ai-os/bin/VERSION"), "local doctor VERSION vendored");
    const localDoctorVersion = readFile(dir, ".ai-os/bin/VERSION");
    assert.equal(localDoctorVersion && localDoctorVersion.trim(), "11.0.0", "local doctor VERSION matches framework version");

    assert.ok(exists(dir, ".ai-os/lanes/default"), "default lane directory installed");
    assert.ok(exists(dir, ".ai-os/lanes/default/lane.toml"), "lane.toml installed");
    assert.ok(exists(dir, ".ai-os/lanes/default/MISSION.md"), "lane MISSION.md installed");
    assert.ok(exists(dir, ".ai-os/lanes/default/DESIGN.md"), "lane DESIGN.md installed");
    assert.ok(exists(dir, ".ai-os/lanes/default/STATE.md"), "lane STATE.md installed");
    assert.ok(exists(dir, ".ai-os/lanes/default/baseline-log"), "lane baseline-log dir installed");
    assert.ok(exists(dir, ".ai-os/lanes/default/tasks.yaml"), "lane tasks.yaml installed");

    // on-demand artifacts must NOT be installed by default
    assert.ok(!exists(dir, ".ai-os/lanes/default/specs"), "lane specs dir not installed (on-demand)");
    assert.ok(!exists(dir, ".ai-os/lanes/default/risk-register.md"), "lane risk-register.md not installed (on-demand)");
    assert.ok(!exists(dir, ".ai-os/lanes/default/release-plan.md"), "lane release-plan.md not installed (on-demand)");
    assert.ok(!exists(dir, ".ai-os/lanes/default/verification-matrix.yaml"), "lane verification-matrix.yaml not installed (on-demand)");
    assert.ok(!exists(dir, ".ai-os/lanes/default/design-pack"), "lane design-pack dir not installed (on-demand)");
    assert.ok(!exists(dir, ".ai-os/lanes/default/evals"), "lane evals dir not installed (on-demand)");

    const records = listBaselineRecords(dir);
    assert.equal(records.length, 1, "exactly one lane baseline record created");
    assert.match(records[0], BASELINE_RECORD_NAME_PATTERN, `baseline record name matches pattern: ${records[0]}`);

    const agents = readFile(dir, "AGENTS.md");
    assert.ok(agents && agents.includes("AI 交付宪法"), "AGENTS.md contains constitution marker");
    assert.ok(agents && agents.includes("按需工件"), "AGENTS.md documents on-demand artifacts");
    assert.ok(agents && agents.split("\n").length <= 150, "AGENTS.md is within 150 lines");
    const distributedAgents = fs.readFileSync(path.join(repoRoot, "framework/.agents/templates/root/AGENTS.md"), "utf8");
    const repoAgents = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
    assert.equal(agents, distributedAgents, "installed AGENTS.md is copied from distributed template");
    assert.notEqual(agents, repoAgents, "installed AGENTS.md is not copied from repo maintainer guard");

    const gitignore = readFile(dir, ".gitignore");
    assert.ok(gitignore && gitignore.includes(".ai-os/lanes/*/STATE.md"), ".gitignore excludes lane STATE.md");
    assert.ok(gitignore && !gitignore.includes(".ai-os/bin"), ".gitignore keeps .ai-os/bin committed (teammates + CI run doctor offline)");

    const gitattributes = readFile(dir, ".gitattributes");
    assert.ok(gitattributes && gitattributes.includes("memory.md merge=union"), ".gitattributes uses union merge for memory.md");

    const toml = readFile(dir, ".ai-os/framework.toml");
    assert.ok(toml && toml.includes('schema_version = "10"'), "framework.toml has schema_version=10");
    assert.ok(toml && toml.includes('layout_mode = "shared-root-default-lane"'), "framework.toml records canonical layout");
    assert.ok(toml && toml.includes('framework_version = "11.0.0"'), "framework.toml has version 11.0.0");

  } finally {
    cleanup(dir);
  }
});

test("install: --no-ide-files", () => {
  const dir = tmpDir();
  try {
    const result = runInstall([dir, "--no-ide-files"]);
    assert.equal(result.status, 0, "install --no-ide-files exits 0");
    assert.ok(!exists(dir, "CLAUDE.md"), "CLAUDE.md skipped");
    assert.ok(!exists(dir, "GEMINI.md"), "GEMINI.md skipped");
    assert.ok(exists(dir, "AGENTS.md"), "AGENTS.md still installed");
  } finally {
    cleanup(dir);
  }
});

test("install: --no-team-config", () => {
  const dir = tmpDir();
  try {
    const result = runInstall([dir, "--no-team-config"]);
    assert.equal(result.status, 0, "install --no-team-config exits 0");
    assert.ok(!exists(dir, ".gitignore"), ".gitignore skipped");
    assert.ok(!exists(dir, ".gitattributes"), ".gitattributes skipped");
  } finally {
    cleanup(dir);
  }
});

test("install: idempotency preserves user-authored lane content", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.writeFileSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md"), "# My user-authored lane mission\n");
    const result = runInstall([dir]);
    assert.equal(result.status, 0, "second install exits 0");
    const mission = readFile(dir, ".ai-os/lanes/default/MISSION.md");
    assert.equal(mission, "# My user-authored lane mission\n", "user lane mission preserved on re-install");
  } finally {
    cleanup(dir);
  }
});

test("install: --force overwrites managed content", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.writeFileSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md"), "# edited by user\n");
    runInstall([dir, "--force"]);
    const mission = readFile(dir, ".ai-os/lanes/default/MISSION.md");
    assert.ok(mission && mission.includes("当前交付基线摘要"), "force overwrites lane mission back to template");
  } finally {
    cleanup(dir);
  }
});

test("install: help flag", () => {
  const result = runInstall(["--help"]);
  assert.equal(result.status, 0, "--help exits 0");
  assert.ok(result.stdout.includes("Usage:"), "--help shows usage");
  assert.ok(result.stdout.includes("Explicit install alias"), "--help identifies install as an alias");
  assert.ok(result.stdout.includes("Primary operations:"), "--help labels primary operations");
  assert.ok(result.stdout.includes("create-ai-os doctor"), "--help lists doctor subcommand");
});

test("install: version flag", () => {
  const result = runInstall(["--version"]);
  assert.equal(result.status, 0, "--version exits 0");
  assert.equal(result.stdout.trim(), "11.0.0", `--version outputs 11.0.0 (got ${result.stdout.trim()})`);
});

test("install: removed subcommands fail instead of installing into a directory", () => {
  const dir = tmpDir();
  try {
    const result = runInstall(["upgrade"], dir);
    assert.equal(result.status, 1, "`create-ai-os upgrade` exits 1");
    assert.ok(result.stderr.includes("removed in v10"), "stderr explains upgrade was removed in v10");
    assert.ok(result.stderr.includes("install"), "stderr points to install as the replacement");
    assert.ok(!fs.existsSync(path.join(dir, "upgrade")), "no ./upgrade directory is created");
  } finally {
    cleanup(dir);
  }
});

test("install: explicit install subcommand supports --help", () => {
  const result = runInstall(["install", "--help"]);
  assert.equal(result.status, 0, "`install --help` exits 0");
  assert.ok(result.stdout.includes("Usage:"), "`install --help` shows usage");

  const short = runInstall(["install", "-h"]);
  assert.equal(short.status, 0, "`install -h` exits 0");
  assert.ok(short.stdout.includes("Usage:"), "`install -h` shows usage");
});

test("install: target path that is an existing file fails cleanly", () => {
  const dir = tmpDir();
  try {
    const filePath = path.join(dir, "not-a-dir");
    fs.writeFileSync(filePath, "plain file\n");
    const result = runInstall([filePath]);
    assert.equal(result.status, 1, "install into a file path exits 1");
    assert.ok(result.stderr.includes("not a directory"), "stderr explains target is not a directory");
    assert.equal(fs.readFileSync(filePath, "utf8"), "plain file\n", "existing file is left untouched");
  } finally {
    cleanup(dir);
  }
});

test("install: BL-template ships framework feedback loop schema", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const records = listBaselineRecords(dir);
    assert.ok(records.length >= 1, "at least one baseline record installed");
    const initialBaseline = readFile(dir, `.ai-os/lanes/default/baseline-log/${records[0]}`);
    for (const term of [
      "Preventability review",
      "Preventable",
      "If yes, root cause",
      "Suggested guard",
      "BL-YYYYMMDD-HHMMSS-retrospective",
    ]) {
      assert.ok(initialBaseline && initialBaseline.includes(term), `installed baseline template includes ${term}`);
    }
  } finally {
    cleanup(dir);
  }
});
