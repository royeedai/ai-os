#!/usr/bin/env node

/**
 * Doctor tests: checks canonical layout health and constitution compliance.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");
const {
  test,
  assert,
  runInstall,
  runDoctor,
  runLocalDoctor,
  tmpDir: rawTmpDir,
  cleanup,
} = require("./helpers");

const DOCTOR_CLI = path.resolve(__dirname, "..", "bin", "ai-os-doctor.js");

function tmpDir() {
  return fs.realpathSync.native(rawTmpDir());
}

test("doctor: requiring from a temporary cwd is inert and main returns a status", () => {
  const dir = fs.realpathSync.native(tmpDir());
  try {
    const source = String.raw`
      const fs = require("node:fs");
      const doctor = require(process.argv[1]);
      const writes = { stdout: "", stderr: "" };
      const io = {
        stdout: { write(value) { writes.stdout += String(value); } },
        stderr: { write(value) { writes.stderr += String(value); } },
      };
      const status = doctor.main(["--help"], io);
      process.stdout.write(JSON.stringify({
        main: typeof doctor.main,
        status,
        writes,
        entries: fs.readdirSync(".").sort(),
      }));
    `;
    const result = spawnSync(process.execPath, ["-e", source, DOCTOR_CLI], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.main, "function");
    assert.equal(payload.status, 0);
    assert.equal(payload.writes.stderr, "");
    assert.match(payload.writes.stdout, /Usage:/);
    assert.deepEqual(payload.entries, []);
  } finally {
    cleanup(dir);
  }
});

test("doctor: clean install returns 0", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const result = runDoctor([dir]);
    assert.equal(result.status, 0, "doctor exits 0 on clean install");
    assert.ok(result.stdout.includes("All checks passed"), "doctor reports all checks passed");
    assert.ok(result.stdout.includes("shared-root-default-lane"), "doctor reports canonical layout mode");
  } finally {
    cleanup(dir);
  }
});

test("doctor: non-AI-OS dir returns 2", () => {
  const dir = tmpDir();
  try {
    const result = runDoctor([dir]);
    assert.equal(result.status, 2, "doctor exits 2 when no .ai-os/");
    assert.ok(result.stderr.includes("Not an AI-OS project"), "doctor reports not-an-ai-os-project");
  } finally {
    cleanup(dir);
  }
});

test("doctor: missing lane MISSION.md returns 1", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md"));
    const result = runDoctor([dir]);
    assert.equal(result.status, 1, "doctor exits 1 when lane core file missing");
    assert.ok(result.stdout.includes("E020") || result.stderr.includes("E020"), "doctor reports E020");
    assert.ok(result.stdout.includes("lanes/default/MISSION.md") || result.stderr.includes("lanes/default/MISSION.md"), "doctor names the missing lane mission");
  } finally {
    cleanup(dir);
  }
});

test("doctor: file artifact replaced by a directory returns E022", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const missionPath = path.join(dir, ".ai-os", "lanes", "default", "MISSION.md");
    fs.unlinkSync(missionPath);
    fs.mkdirSync(missionPath);
    const result = runDoctor([dir]);
    assert.equal(result.status, 1, "doctor exits 1 when a file artifact is a directory");
    assert.ok(result.stdout.includes("E022"), "doctor reports E022 for wrong artifact type");
    assert.ok(result.stdout.includes("not a file"), "doctor explains the path is not a file");
  } finally {
    cleanup(dir);
  }
});

test("doctor: missing lane STATE.md is info (not error)", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "STATE.md"));
    const result = runDoctor([dir]);
    assert.equal(result.status, 0, "doctor exits 0 when only lane STATE.md missing");
    assert.ok(result.stdout.includes("I020"), "doctor reports session-local info");
  } finally {
    cleanup(dir);
  }
});

test("doctor: on-demand artifacts are not checked", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    // No risk-register / release-plan / verification-matrix / specs / design-pack
    // / evals exist on a clean install; doctor must not warn about them.
    const result = runDoctor([dir, "--strict"]);
    assert.equal(result.status, 0, "doctor --strict passes without on-demand artifacts");
    assert.ok(!result.stdout.includes("risk-register"), "doctor does not mention risk-register");
    assert.ok(!result.stdout.includes("verification-matrix"), "doctor does not mention verification-matrix");
  } finally {
    cleanup(dir);
  }
});

test("doctor: --json output includes layout metadata", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const result = runDoctor([dir, "--json"]);
    assert.equal(result.status, 0, "doctor --json exits 0");
    let parsed;
    try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
    assert.notEqual(parsed, null, "--json output is valid JSON");
    assert.equal(parsed && parsed.ok, true, "JSON ok=true on clean install");
    assert.equal(parsed && parsed.version, "11.0.0", "JSON reports version 11.0.0");
    assert.equal(parsed && parsed.layout_version, "11", "JSON reports layout_version=11");
    assert.equal(parsed && parsed.layout_mode, "shared-root-default-lane", "JSON reports canonical layout mode");
  } finally {
    cleanup(dir);
  }
});

test("doctor: --strict treats warnings as errors", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml"));
    const normal = runDoctor([dir]);
    assert.equal(normal.status, 0, "doctor without --strict exits 0 on warning");
    const strict = runDoctor([dir, "--strict"]);
    assert.equal(strict.status, 1, "doctor --strict exits 1 on warning");
  } finally {
    cleanup(dir);
  }
});

test("doctor: schema_version mismatch is an error", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const tomlPath = path.join(dir, ".ai-os", "framework.toml");
    const toml = fs.readFileSync(tomlPath, "utf8").replace('schema_version = "11"', 'schema_version = "9"');
    fs.writeFileSync(tomlPath, toml);
    const result = runDoctor([dir]);
    assert.equal(result.status, 1, "doctor exits 1 when schema_version != 11");
    assert.ok(result.stdout.includes("E002"), "doctor reports E002 on wrong schema");
  } finally {
    cleanup(dir);
  }
});

test("doctor: W070 fires when MISSION baseline_id has no record", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const missionPath = path.join(dir, ".ai-os", "lanes", "default", "MISSION.md");
    let mission = fs.readFileSync(missionPath, "utf8");
    mission = mission.replace(
      /BL-\d{8}-\d{6}-(?:initial-baseline|bootstrap-unconfirmed)/,
      "CR-20260430-000000-orphan",
    );
    fs.writeFileSync(missionPath, mission);
    const result = runDoctor([dir, "--json"]);
    const parsed = JSON.parse(result.stdout);
    const w070 = parsed.semantic_warnings.find((it) => it.code === "W070");
    assert.ok(!!w070, "doctor surfaces W070 for orphan baseline reference");
    assert.ok(parsed.semantic_warnings.length >= 1, "semantic_warnings field populated");
    const strict = runDoctor([dir, "--strict"]);
    assert.equal(strict.status, 1, "doctor --strict treats W070 as failure");
  } finally {
    cleanup(dir);
  }
});

test("doctor: W071 fires when a task has no owner", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const tasksPath = path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml");
    const corrupt = `tasks:\n  - id: TASK-AI-099\n    title: "missing owner"\n    status: todo\n`;
    fs.writeFileSync(tasksPath, corrupt);
    const result = runDoctor([dir, "--json"]);
    const parsed = JSON.parse(result.stdout);
    const w071 = parsed.semantic_warnings.find((it) => it.code === "W071");
    assert.ok(!!w071, "doctor surfaces W071 for owner-less task");
    assert.ok(w071 && w071.message.includes("TASK-AI-099"), "W071 names the offending task id");
  } finally {
    cleanup(dir);
  }
});

test("doctor: removed semantic warnings W072-W078 no longer fire", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    // tasks.yaml with fields that used to trigger W076/W077/W078, plus a
    // high-risk lane that used to trigger W074.
    const laneTomlPath = path.join(dir, ".ai-os", "lanes", "default", "lane.toml");
    fs.writeFileSync(laneTomlPath, fs.readFileSync(laneTomlPath, "utf8").replace('risk_tier = "medium"', 'risk_tier = "high"'));
    const tasksPath = path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml");
    const legacy = `tasks:
    - id: TASK-AI-200
      title: "legacy long-horizon task shape"
      status: done
      owner: AI
      handoff_to: "external_pr_agent"
      agent_run_review:
        execution_surface: "cloud_background"
  `;
    fs.writeFileSync(tasksPath, legacy);
    const result = runDoctor([dir, "--json"]);
    const parsed = JSON.parse(result.stdout);
    const removed = (parsed.semantic_warnings || []).concat(parsed.issues || [])
      .filter((it) => ["W072", "W074", "W076", "W077", "W078"].includes(it.code));
    assert.equal(removed.length, 0, "doctor no longer emits W072/W074/W076/W077/W078");
  } finally {
    cleanup(dir);
  }
});

test("doctor: vendored local entry runs offline with no external request", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    const local = runLocalDoctor(dir, [dir]);
    assert.equal(local.status, 0, "local doctor exits 0 on clean install");
    assert.ok(local.stdout.includes("All checks passed"), "local doctor reports all checks passed");

    // parity with the source doctor on the same project
    const localJson = JSON.parse(runLocalDoctor(dir, [dir, "--json"]).stdout);
    const sourceJson = JSON.parse(runDoctor([dir, "--json"]).stdout);
    assert.equal(localJson.version, sourceJson.version, "local doctor reports same version as source doctor");
    assert.equal(localJson.layout_mode, sourceJson.layout_mode, "local doctor reports same layout mode");
    assert.equal(localJson.version, "11.0.0", "local doctor reports framework version 11.0.0");
  } finally {
    cleanup(dir);
  }
});

test("doctor: embedded entry uses adjacent VERSION when metadata is missing", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    // Missing framework metadata is damage, but the committed local doctor still
    // has an adjacent VERSION and can complete its read-only structural checks.
    fs.unlinkSync(path.join(dir, ".ai-os", "framework.toml"));
    const result = runLocalDoctor(dir, [dir, "--json"]);
    assert.equal(result.status, 0, "local doctor exits 0 without framework.toml");
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true, "local doctor ok=true without framework.toml");
    const e001 = parsed.issues.find((it) => it.code === "E001");
    assert.ok(!e001, "local doctor does not report E001 in embedded mode without framework.toml");
    assert.equal(parsed.installedVersion, "11.0.0", "local doctor falls back to committed VERSION as installed version");
  } finally {
    cleanup(dir);
  }
});

test("doctor: W041 checks only session-local STATE ignore", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.writeFileSync(path.join(dir, ".gitignore"), [
      "# intentionally wrong AI-OS ignore contract",
      ".ai-os/framework.toml",
      ".ai-os/managed-files.tsv",
      "",
    ].join("\n"));
    const result = runDoctor([dir, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    const warnings = JSON.parse(result.stdout).issues.filter((item) => item.code === "W041");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /[.]ai-os\/lanes\/[*]\/STATE[.]md/);
    assert.match(warnings[0].message, /session-local/i);
    assert.doesNotMatch(warnings[0].message, /managed files/i);
  } finally {
    cleanup(dir);
  }
});

test("doctor: source doctor still reports E001 (strict) when framework.toml is absent", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.unlinkSync(path.join(dir, ".ai-os", "framework.toml"));
    // The dev / npx package doctor is NOT embedded, so it keeps the strict
    // "is this an AI-OS project?" check and reports E001.
    const result = runDoctor([dir, "--json"]);
    const parsed = JSON.parse(result.stdout);
    const e001 = parsed.issues.find((it) => it.code === "E001");
    assert.ok(!!e001, "source doctor still reports E001 when framework.toml is missing");
  } finally {
    cleanup(dir);
  }
});

test("doctor: vendored local entry honors --strict", () => {
  const dir = tmpDir();
  try {
    runInstall([dir]);
    fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml"));
    const normal = runLocalDoctor(dir, [dir]);
    assert.equal(normal.status, 0, "local doctor without --strict exits 0 on warning");
    const strict = runLocalDoctor(dir, [dir, "--strict"]);
    assert.equal(strict.status, 1, "local doctor --strict exits 1 on warning");
  } finally {
    cleanup(dir);
  }
});
