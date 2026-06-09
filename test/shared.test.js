#!/usr/bin/env node

/**
 * shared.js unit tests: baseline generation, metadata, canonical layout installation.
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
  assert(version.startsWith("10."), `version starts with 10 (${version})`);
}

section("shared: readPackageJson");

{
  const pkg = shared.readPackageJson();
  assert(pkg && pkg.name === "create-ai-os", "package name is create-ai-os");
  assert(pkg.version === "10.1.1", `package version is 10.1.1 (got ${pkg.version})`);
}

section("shared: generateInitialBaseline");

{
  const baseline = shared.generateInitialBaseline();
  assert(/^BL-\d{8}-\d{6}-initial-baseline$/.test(baseline.id), `baseline id format OK (${baseline.id})`);
  assert(baseline.file === `${baseline.id}.md`, "baseline file name matches id");
  assert(typeof baseline.date === "string" && baseline.date.includes("T"), "baseline date is ISO");
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

section("shared: canonical artifact lists");

{
  assert(shared.SHARED_ROOT_FILES.includes("MISSION.md"), "shared root includes MISSION.md");
  assert(shared.SHARED_ROOT_FILES.includes("memory.md"), "shared root includes memory.md");
  assert(shared.LANE_CORE_FILES.includes("MISSION.md"), "lane core includes MISSION.md");
  assert(shared.LANE_CORE_FILES.includes("DESIGN.md"), "lane core includes DESIGN.md");
  assert(shared.LANE_CORE_FILES.includes("STATE.md"), "lane core includes STATE.md");
  assert(shared.LANE_CORE_DIRS.includes("baseline-log"), "lane core dirs include baseline-log");
  assert(shared.LANE_EXTENSION_FILES.includes("tasks.yaml"), "lane extension includes tasks.yaml");
  assert(shared.LANE_EXTENSION_DIRS.includes("specs"), "lane extension dirs include specs");
  assert(shared.SESSION_LOCAL_FILES.includes("STATE.md"), "STATE.md remains session-local");
}

section("shared: installArtifacts creates canonical v9 layout");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  const { installed, baseline } = shared.installArtifacts(dir, { overwrite: false });
  assert(installed.length > 0, `installed some artifacts (count=${installed.length})`);
  assert(fs.existsSync(path.join(dir, ".ai-os", "MISSION.md")), "shared root MISSION.md created");
  assert(fs.existsSync(path.join(dir, ".ai-os", "memory.md")), "shared root memory.md created");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "lane.toml")), "default lane metadata created");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md")), "lane MISSION.md created");
  assert(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "baseline-log", `${baseline.id}.md`)), "initial baseline record created in lane");
  fs.rmSync(dir, { recursive: true, force: true });
}

section("shared: writeMetadata and readMetadata roundtrip");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  shared.writeMetadata(dir, { version: "9.0.0" });
  const meta = shared.readMetadata(dir);
  assert(meta && meta.framework_version === "9.0.0", `framework_version round-trips (${meta && meta.framework_version})`);
  assert(meta && meta.schema_version === "9", `schema_version round-trips (${meta && meta.schema_version})`);
  assert(meta && meta.layout_mode === "shared-root-default-lane", `layout mode round-trips (${meta && meta.layout_mode})`);
  fs.rmSync(dir, { recursive: true, force: true });
}

section("shared: writeManagedFilesManifest");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  shared.writeManagedFilesManifest(dir);
  const content = fs.readFileSync(path.join(dir, ".ai-os", "managed-files.tsv"), "utf8");
  assert(content.includes("AGENTS.md\tfile"), "manifest lists AGENTS.md");
  assert(content.includes(".ai-os/MISSION.md\tfile"), "manifest lists shared MISSION.md");
  assert(content.includes(".ai-os/lanes/default/MISSION.md\tfile"), "manifest lists lane MISSION.md");
  assert(content.includes(".ai-os/lanes/default/baseline-log\tdir"), "manifest lists lane baseline-log dir");
  fs.rmSync(dir, { recursive: true, force: true });
}

section("shared: installIdeFiles");

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  const installed = shared.installIdeFiles(dir, { overwrite: false });
  assert(installed.includes("CLAUDE.md"), "CLAUDE.md installed");
  assert(installed.includes("GEMINI.md"), "GEMINI.md installed");
  const claude = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  assert(claude.includes(".ai-os/lanes/default/STATE.md"), "CLAUDE.md points to lane STATE.md");
  assert(claude.includes(".ai-os/MISSION.md"), "CLAUDE.md references shared root mission");
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
  const count = (content.match(/AI-OS v9 managed/g) || []).length;
  assert(count === 1, `gitignore header appears exactly once (count=${count})`);
  assert(content.includes(".ai-os/lanes/*/STATE.md"), "gitignore includes lane STATE ignore");
  fs.rmSync(dir, { recursive: true, force: true });
}
