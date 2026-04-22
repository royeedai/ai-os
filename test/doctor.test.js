#!/usr/bin/env node

/**
 * Doctor tests: checks canonical layout health and legacy drift detection.
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

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

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
  assert(parsed && parsed.version === "9.0.0", "JSON reports version 9.0.0");
  assert(parsed && parsed.layout_version === "9", "JSON reports layout_version=9");
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
  const toml = fs.readFileSync(tomlPath, "utf8").replace('schema_version = "9"', 'schema_version = "8"');
  fs.writeFileSync(tomlPath, toml);
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 when schema_version != 9");
  assert(result.stdout.includes("E002"), "doctor reports E002 on wrong schema");
  cleanup(dir);
}

section("doctor: root-only legacy layout is unhealthy");

{
  const dir = tmpDir();
  write(dir, ".ai-os/MISSION.md", "# legacy mission\n");
  write(dir, ".ai-os/DESIGN.md", "# legacy design\n");
  write(dir, ".ai-os/memory.md", "# memory\n");
  write(dir, ".ai-os/framework.toml", 'schema_version = "9"\nlayout_version = "9"\nlayout_mode = "root-only-legacy"\nframework_version = "8.0.0"\n');
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 for root-only legacy layout");
  assert(result.stdout.includes("E060"), "doctor reports root-only legacy error");
  cleanup(dir);
}

section("doctor: hybrid drift is unhealthy");

{
  const dir = tmpDir();
  runInstall([dir]);
  write(dir, ".ai-os/DESIGN.md", "# rogue root design\n");
  const result = runDoctor([dir]);
  assert(result.status === 1, "doctor exits 1 for hybrid drift");
  assert(result.stdout.includes("E061"), "doctor reports hybrid drift error");
  cleanup(dir);
}
