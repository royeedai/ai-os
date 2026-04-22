#!/usr/bin/env node

/**
 * shared.js unit tests: baseline generation, metadata, artifact installation.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { assert, section } = require("./helpers");
const shared = require("../bin/shared");

section("shared: readFrameworkVersion");

{
  const version = shared.readFrameworkVersion();
  assert(typeof version === "string" && /^\d+\.\d+\.\d+/.test(version), `version is semver (${version})`);
  assert(version.startsWith("8."), `version starts with 8 (${version})`);
}

section("shared: readPackageJson");

{
  const pkg = shared.readPackageJson();
  assert(pkg && pkg.name === "create-ai-os", "package name is create-ai-os");
  assert(pkg.version === "8.0.0", `package version is 8.0.0 (got ${pkg.version})`);
}

section("shared: generateInitialBaseline");

{
  const b = shared.generateInitialBaseline();
  assert(/^BL-\d{8}-\d{6}-initial-baseline$/.test(b.id), `baseline id format OK (${b.id})`);
  assert(b.file === `${b.id}.md`, "baseline file name matches id");
  assert(typeof b.date === "string" && b.date.includes("T"), "baseline date is ISO");
}

section("shared: replaceBaselineTokens");

{
  const baseline = { id: "BL-20260422-120000-initial-baseline", file: "BL-20260422-120000-initial-baseline.md", date: "2026-04-22T12:00:00Z" };
  const content = "ID: {{INITIAL_BASELINE_ID}}\nFILE: {{INITIAL_BASELINE_FILE}}\nDATE: {{INITIAL_BASELINE_DATE}}";
  const replaced = shared.replaceBaselineTokens(content, baseline);
  assert(replaced.includes("ID: BL-20260422-120000-initial-baseline"), "ID token replaced");
  assert(replaced.includes("FILE: BL-20260422-120000-initial-baseline.md"), "FILE token replaced");
  assert(replaced.includes("DATE: 2026-04-22T12:00:00Z"), "DATE token replaced");
}

section("shared: artifact lists");

{
  assert(shared.CORE_FILES.includes("MISSION.md"), "CORE_FILES includes MISSION.md");
  assert(shared.CORE_FILES.includes("DESIGN.md"), "CORE_FILES includes DESIGN.md");
  assert(shared.CORE_FILES.includes("STATE.md"), "CORE_FILES includes STATE.md");
  assert(shared.CORE_FILES.includes("memory.md"), "CORE_FILES includes memory.md");
  assert(shared.CORE_DIRS.includes("baseline-log"), "CORE_DIRS includes baseline-log");
  assert(shared.EXTENSION_FILES.includes("tasks.yaml"), "EXTENSION_FILES includes tasks.yaml");
  assert(shared.EXTENSION_FILES.includes("risk-register.md"), "EXTENSION_FILES includes risk-register.md");
  assert(shared.EXTENSION_DIRS.includes("specs"), "EXTENSION_DIRS includes specs");
  assert(shared.EXTENSION_DIRS.includes("design-pack"), "EXTENSION_DIRS includes design-pack");
  assert(shared.SESSION_LOCAL_FILES.includes("STATE.md"), "STATE.md is session-local");
}

section("shared: installArtifacts creates starter files");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  const { installed, baseline } = shared.installArtifacts(dir, { overwrite: false });
  assert(installed.length > 0, `installed some artifacts (count=${installed.length})`);
  assert(fs.existsSync(path.join(dir, ".ai-os", "MISSION.md")), "MISSION.md created");
  assert(fs.existsSync(path.join(dir, ".ai-os", "baseline-log", `${baseline.id}.md`)), "baseline record file created");
  fs.rmSync(dir, { recursive: true, force: true });
}

section("shared: writeMetadata and readMetadata roundtrip");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  shared.writeMetadata(dir, { version: "8.0.0" });
  const meta = shared.readMetadata(dir);
  assert(meta && meta.framework_version === "8.0.0", `framework_version round-trips (${meta && meta.framework_version})`);
  assert(meta && meta.schema_version === "8", `schema_version round-trips (${meta && meta.schema_version})`);
  fs.rmSync(dir, { recursive: true, force: true });
}

section("shared: writeManagedFilesManifest");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  shared.writeManagedFilesManifest(dir);
  const content = fs.readFileSync(path.join(dir, ".ai-os", "managed-files.tsv"), "utf8");
  assert(content.includes("AGENTS.md\tfile"), "manifest lists AGENTS.md");
  assert(content.includes(".ai-os/MISSION.md\tfile"), "manifest lists MISSION.md");
  assert(content.includes(".ai-os/baseline-log\tdir"), "manifest lists baseline-log as dir");
  fs.rmSync(dir, { recursive: true, force: true });
}

section("shared: installIdeFiles");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  const installed = shared.installIdeFiles(dir, { overwrite: false });
  assert(installed.includes("CLAUDE.md"), "CLAUDE.md installed");
  assert(installed.includes("GEMINI.md"), "GEMINI.md installed");
  const claude = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  assert(claude.split("\n").length <= 30, `CLAUDE.md is at most 30 lines (${claude.split("\n").length})`);
  assert(claude.includes("AGENTS.md"), "CLAUDE.md references AGENTS.md");
  fs.rmSync(dir, { recursive: true, force: true });
}

section("shared: appendGitignoreEntries is idempotent");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  const first = shared.appendGitignoreEntries(dir);
  const second = shared.appendGitignoreEntries(dir);
  assert(first === true, "first call returns true");
  assert(second === false, "second call returns false (idempotent)");
  const content = fs.readFileSync(path.join(dir, ".gitignore"), "utf8");
  const count = (content.match(/AI-OS v8 managed/g) || []).length;
  assert(count === 1, `gitignore header appears exactly once (count=${count})`);
  fs.rmSync(dir, { recursive: true, force: true });
}
