#!/usr/bin/env node

/**
 * Doctor tests: checks artifact completeness and health.
 */

const fs = require("fs");
const path = require("path");
const {
  assert,
  runInstall,
  runDoctor,
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

section("doctor: missing core MISSION.md returns 1");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "MISSION.md"));
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when core file missing");
  assert(result.stdout.includes("E020") || result.stderr.includes("E020"), "doctor reports E020");
  assert(result.stdout.includes("MISSION.md") || result.stderr.includes("MISSION.md"), "doctor names the missing file");
  cleanup(dir);
}

section("doctor: missing STATE.md is info (not error)");

{
  const dir = tmpDir();
  runInstall([dir]);
  fs.unlinkSync(path.join(dir, ".ai-os", "STATE.md"));
  const result = runDoctor([dir]);
  assert(result.status === 0, "doctor exits 0 when only STATE.md missing (session-local)");
  assert(result.stdout.includes("I020") || result.stdout.includes("Session-local"), "doctor reports session-local info");
  cleanup(dir);
}

section("doctor: --json output");

{
  const dir = tmpDir();
  runInstall([dir]);
  const result = runDoctor([dir, "--json"]);
  assert(result.status === 0, "doctor --json exits 0");
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { parsed = null; }
  assert(parsed !== null, "--json output is valid JSON");
  assert(parsed && parsed.ok === true, "JSON ok=true on clean install");
  assert(parsed && parsed.version === "8.0.0", "JSON reports version 8.0.0");
  cleanup(dir);
}

section("doctor: --strict treats warnings as errors");

{
  const dir = tmpDir();
  runInstall([dir]);
  // Remove an extension file -> warning
  fs.unlinkSync(path.join(dir, ".ai-os", "tasks.yaml"));
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
  const toml = fs.readFileSync(tomlPath, "utf8").replace('schema_version = "8"', 'schema_version = "7"');
  fs.writeFileSync(tomlPath, toml);
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when schema_version != 8");
  assert(result.stdout.includes("E002"), "doctor reports E002 on wrong schema");
  cleanup(dir);
}

section("doctor: empty baseline-log is a warning");

{
  const dir = tmpDir();
  runInstall([dir]);
  const baselineDir = path.join(dir, ".ai-os", "baseline-log");
  for (const f of fs.readdirSync(baselineDir)) {
    fs.unlinkSync(path.join(baselineDir, f));
  }
  const result = runDoctor([dir]);
  assert(result.status === 0, "empty baseline-log is warning not error");
  assert(result.stdout.includes("W030"), "doctor reports W030 on empty baseline-log");
  cleanup(dir);
}

section("doctor: AGENTS.md too long warns");

{
  const dir = tmpDir();
  runInstall([dir]);
  // Inflate AGENTS.md beyond 200 lines
  const agentsPath = path.join(dir, "AGENTS.md");
  const original = fs.readFileSync(agentsPath, "utf8");
  const inflated = original + "\n" + "dummy line\n".repeat(250);
  fs.writeFileSync(agentsPath, inflated);
  const result = runDoctor([dir]);
  assert(result.stdout.includes("W010"), "doctor warns on oversized AGENTS.md");
  cleanup(dir);
}
