#!/usr/bin/env node

/**
 * Doctor tests: checks canonical layout health and constitution compliance.
 */

const fs = require("fs");
const path = require("path");
const {
  assert,
  runInstall,
  runDoctor,
  runLocalDoctor,
  tmpDir,
  cleanup,
  section,
} = require("./helpers");

section("doctor: clean install returns 0");

{
  const dir = tmpDir();
  runInstall([dir]);
  const result = runDoctor([dir]);
  assert(result.status === 0, "doctor exits 0 on clean install");
  assert(result.stdout.includes("All checks passed"), "doctor reports all checks passed");
  assert(result.stdout.includes("shared-root-default-lane"), "doctor reports canonical layout mode");
  cleanup(dir);
}

section("doctor: non-AI-OS dir returns 2");

{
  const dir = tmpDir();
  const result = runDoctor([dir]);
  assert(result.status === 2, "doctor exits 2 when no .ai-os/");
  assert(result.stderr.includes("Not an AI-OS project"), "doctor reports not-an-ai-os-project");
  cleanup(dir);
}

section("doctor: missing lane MISSION.md returns 1");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md"));
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when lane core file missing");
  assert(result.stdout.includes("E020") || result.stderr.includes("E020"), "doctor reports E020");
  assert(result.stdout.includes("lanes/default/MISSION.md") || result.stderr.includes("lanes/default/MISSION.md"), "doctor names the missing lane mission");
  cleanup(dir);
}

section("doctor: file artifact replaced by a directory returns E022");

{
  const dir = tmpDir();
  runInstall([dir]);
  const missionPath = path.join(dir, ".ai-os", "lanes", "default", "MISSION.md");
  fs.unlinkSync(missionPath);
  fs.mkdirSync(missionPath);
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when a file artifact is a directory");
  assert(result.stdout.includes("E022"), "doctor reports E022 for wrong artifact type");
  assert(result.stdout.includes("not a file"), "doctor explains the path is not a file");
  cleanup(dir);
}

section("doctor: missing lane STATE.md is info (not error)");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "STATE.md"));
  const result = runDoctor([dir]);
  assert(result.status === 0, "doctor exits 0 when only lane STATE.md missing");
  assert(result.stdout.includes("I020"), "doctor reports session-local info");
  cleanup(dir);
}

section("doctor: on-demand artifacts are not checked");

{
  const dir = tmpDir();
  runInstall([dir]);
  // No risk-register / release-plan / verification-matrix / specs / design-pack
  // / evals exist on a clean install; doctor must not warn about them.
  const result = runDoctor([dir, "--strict"]);
  assert(result.status === 0, "doctor --strict passes without on-demand artifacts");
  assert(!result.stdout.includes("risk-register"), "doctor does not mention risk-register");
  assert(!result.stdout.includes("verification-matrix"), "doctor does not mention verification-matrix");
  cleanup(dir);
}

section("doctor: --json output includes layout metadata");

{
  const dir = tmpDir();
  runInstall([dir]);
  const result = runDoctor([dir, "--json"]);
  assert(result.status === 0, "doctor --json exits 0");
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
  assert(parsed !== null, "--json output is valid JSON");
  assert(parsed && parsed.ok === true, "JSON ok=true on clean install");
  assert(parsed && parsed.version === "11.0.0", "JSON reports version 11.0.0");
  assert(parsed && parsed.layout_version === "10", "JSON reports layout_version=10");
  assert(parsed && parsed.layout_mode === "shared-root-default-lane", "JSON reports canonical layout mode");
  cleanup(dir);
}

section("doctor: --strict treats warnings as errors");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml"));
  const normal = runDoctor([dir]);
  assert(normal.status === 0, "doctor without --strict exits 0 on warning");
  const strict = runDoctor([dir, "--strict"]);
  assert(strict.status === 1, "doctor --strict exits 1 on warning");
  cleanup(dir);
}

section("doctor: schema_version mismatch is an error");

{
  const dir = tmpDir();
  runInstall([dir]);
  const tomlPath = path.join(dir, ".ai-os", "framework.toml");
  const toml = fs.readFileSync(tomlPath, "utf8").replace('schema_version = "10"', 'schema_version = "9"');
  fs.writeFileSync(tomlPath, toml);
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when schema_version != 10");
  assert(result.stdout.includes("E002"), "doctor reports E002 on wrong schema");
  cleanup(dir);
}

section("doctor: W070 fires when MISSION baseline_id has no record");

{
  const dir = tmpDir();
  runInstall([dir]);
  const missionPath = path.join(dir, ".ai-os", "lanes", "default", "MISSION.md");
  let mission = fs.readFileSync(missionPath, "utf8");
  mission = mission.replace(/BL-\d{8}-\d{6}-initial-baseline/, "CR-20260430-000000-orphan");
  fs.writeFileSync(missionPath, mission);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w070 = parsed.semantic_warnings.find((it) => it.code === "W070");
  assert(!!w070, "doctor surfaces W070 for orphan baseline reference");
  assert(parsed.semantic_warnings.length >= 1, "semantic_warnings field populated");
  const strict = runDoctor([dir, "--strict"]);
  assert(strict.status === 1, "doctor --strict treats W070 as failure");
  cleanup(dir);
}

section("doctor: W071 fires when a task has no owner");

{
  const dir = tmpDir();
  runInstall([dir]);
  const tasksPath = path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml");
  const corrupt = `tasks:\n  - id: TASK-AI-099\n    title: "missing owner"\n    status: todo\n`;
  fs.writeFileSync(tasksPath, corrupt);
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const w071 = parsed.semantic_warnings.find((it) => it.code === "W071");
  assert(!!w071, "doctor surfaces W071 for owner-less task");
  assert(w071 && w071.message.includes("TASK-AI-099"), "W071 names the offending task id");
  cleanup(dir);
}

section("doctor: removed semantic warnings W072-W078 no longer fire");

{
  const dir = tmpDir();
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
  assert(removed.length === 0, "doctor no longer emits W072/W074/W076/W077/W078");
  cleanup(dir);
}

section("doctor: vendored local entry runs offline with no external request");

{
  const dir = tmpDir();
  runInstall([dir]);
  const local = runLocalDoctor(dir, [dir]);
  assert(local.status === 0, "local doctor exits 0 on clean install");
  assert(local.stdout.includes("All checks passed"), "local doctor reports all checks passed");

  // parity with the source doctor on the same project
  const localJson = JSON.parse(runLocalDoctor(dir, [dir, "--json"]).stdout);
  const sourceJson = JSON.parse(runDoctor([dir, "--json"]).stdout);
  assert(localJson.version === sourceJson.version, "local doctor reports same version as source doctor");
  assert(localJson.layout_mode === sourceJson.layout_mode, "local doctor reports same layout mode");
  assert(localJson.version === "11.0.0", "local doctor reports framework version 11.0.0");
  cleanup(dir);
}

section("doctor: local entry survives a team clone with gitignored framework.toml removed");

{
  const dir = tmpDir();
  runInstall([dir]);
  // framework.toml is gitignored; a teammate / CI clone never ran install and
  // has no framework.toml. The committed .ai-os/bin/ must still run doctor.
  fs.unlinkSync(path.join(dir, ".ai-os", "framework.toml"));
  const result = runLocalDoctor(dir, [dir, "--json"]);
  assert(result.status === 0, "local doctor exits 0 without framework.toml");
  const parsed = JSON.parse(result.stdout);
  assert(parsed.ok === true, "local doctor ok=true without framework.toml");
  const e001 = parsed.issues.find((it) => it.code === "E001");
  assert(!e001, "local doctor does not report E001 in embedded mode without framework.toml");
  assert(parsed.installedVersion === "11.0.0", "local doctor falls back to committed VERSION as installed version");
  cleanup(dir);
}

section("doctor: source doctor still reports E001 (strict) when framework.toml is absent");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "framework.toml"));
  // The dev / npx package doctor is NOT embedded, so it keeps the strict
  // "is this an AI-OS project?" check and reports E001.
  const result = runDoctor([dir, "--json"]);
  const parsed = JSON.parse(result.stdout);
  const e001 = parsed.issues.find((it) => it.code === "E001");
  assert(!!e001, "source doctor still reports E001 when framework.toml is missing");
  cleanup(dir);
}

section("doctor: vendored local entry honors --strict");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "lanes", "default", "tasks.yaml"));
  const normal = runLocalDoctor(dir, [dir]);
  assert(normal.status === 0, "local doctor without --strict exits 0 on warning");
  const strict = runLocalDoctor(dir, [dir, "--strict"]);
  assert(strict.status === 1, "local doctor --strict exits 1 on warning");
  cleanup(dir);
}
