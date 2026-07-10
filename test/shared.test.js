#!/usr/bin/env node

/**
 * shared.js unit tests: baseline generation, metadata, canonical layout installation.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { test, assert } = require("./helpers");
const shared = require("../bin/shared");

test("shared: readFrameworkVersion", () => {
  const version = shared.readFrameworkVersion();
  assert.match(version, /^\d+\.\d+\.\d+/, `version is semver (${version})`);
  assert.ok(version.startsWith("11."), `version starts with 11 (${version})`);
});

test("shared: readPackageJson", () => {
  const pkg = shared.readPackageJson();
  assert.equal(pkg && pkg.name, "create-ai-os", "package name is create-ai-os");
  assert.equal(pkg.version, "11.0.0", `package version is 11.0.0 (got ${pkg.version})`);
});

test("shared: generateInitialBaseline", () => {
  const baseline = shared.generateInitialBaseline();
  assert.match(baseline.id, /^BL-\d{8}-\d{6}-initial-baseline$/, `baseline id format OK (${baseline.id})`);
  assert.equal(baseline.file, `${baseline.id}.md`, "baseline file name matches id");
  assert.ok(typeof baseline.date === "string" && baseline.date.includes("T"), "baseline date is ISO");
});

test("shared: replaceBaselineTokens", () => {
  const baseline = { id: "BL-20260422-120000-initial-baseline", file: "BL-20260422-120000-initial-baseline.md", date: "2026-04-22T12:00:00Z" };
  const content = "ID: {{INITIAL_BASELINE_ID}}\nFILE: {{INITIAL_BASELINE_FILE}}\nDATE: {{INITIAL_BASELINE_DATE}}";
  const replaced = shared.replaceBaselineTokens(content, baseline);
  assert.ok(replaced.includes("ID: BL-20260422-120000-initial-baseline"), "ID token replaced");
  assert.ok(replaced.includes("FILE: BL-20260422-120000-initial-baseline.md"), "FILE token replaced");
  assert.ok(replaced.includes("DATE: 2026-04-22T12:00:00Z"), "DATE token replaced");
});

test("shared: canonical artifact lists", () => {
  assert.ok(shared.ROOT_TEMPLATE_ROOT.endsWith(path.join("framework", ".agents", "templates", "root")), "root template directory is under framework templates");
  assert.ok(shared.DISTRIBUTED_AGENTS_FILE.endsWith(path.join("framework", ".agents", "templates", "root", "AGENTS.md")), "distributed AGENTS template path is exported");
  assert.ok(fs.existsSync(shared.DISTRIBUTED_AGENTS_FILE), "distributed AGENTS template exists");
  assert.ok(shared.SHARED_ROOT_FILES.includes("MISSION.md"), "shared root includes MISSION.md");
  assert.ok(shared.SHARED_ROOT_FILES.includes("memory.md"), "shared root includes memory.md");
  assert.ok(shared.LANE_CORE_FILES.includes("MISSION.md"), "lane core includes MISSION.md");
  assert.ok(shared.LANE_CORE_FILES.includes("DESIGN.md"), "lane core includes DESIGN.md");
  assert.ok(shared.LANE_CORE_FILES.includes("STATE.md"), "lane core includes STATE.md");
  assert.ok(shared.LANE_CORE_DIRS.includes("baseline-log"), "lane core dirs include baseline-log");
  assert.deepEqual(shared.LANE_EXTENSION_FILES, ["tasks.yaml"], "lane extension files contain only tasks.yaml");
  assert.deepEqual(shared.LANE_EXTENSION_DIRS, [], "lane extension dirs are empty (on-demand artifacts are not installed)");
  assert.ok(shared.SESSION_LOCAL_FILES.includes("STATE.md"), "STATE.md remains session-local");
});

test("shared: installArtifacts creates canonical v10 layout", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  try {
    const { installed, baseline } = shared.installArtifacts(dir, { overwrite: false });
    assert.ok(installed.length > 0, `installed some artifacts (count=${installed.length})`);
    assert.ok(fs.existsSync(path.join(dir, ".ai-os", "MISSION.md")), "shared root MISSION.md created");
    assert.ok(fs.existsSync(path.join(dir, ".ai-os", "memory.md")), "shared root memory.md created");
    assert.ok(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "lane.toml")), "default lane metadata created");
    assert.ok(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "MISSION.md")), "lane MISSION.md created");
    assert.ok(fs.existsSync(path.join(dir, ".ai-os", "lanes", "default", "baseline-log", `${baseline.id}.md`)), "initial baseline record created in lane");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("shared: writeMetadata and readMetadata roundtrip", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  try {
    shared.writeMetadata(dir, { version: "11.0.0" });
    const meta = shared.readMetadata(dir);
    assert.equal(meta && meta.framework_version, "11.0.0", `framework_version round-trips (${meta && meta.framework_version})`);
    assert.equal(meta && meta.schema_version, "10", `schema_version round-trips (${meta && meta.schema_version})`);
    assert.equal(meta && meta.layout_mode, "shared-root-default-lane", `layout mode round-trips (${meta && meta.layout_mode})`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("shared: writeManagedFilesManifest", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  try {
    shared.writeManagedFilesManifest(dir);
    const content = fs.readFileSync(path.join(dir, ".ai-os", "managed-files.tsv"), "utf8");
    assert.ok(content.includes("AGENTS.md\tfile"), "manifest lists AGENTS.md");
    assert.ok(content.includes(".ai-os/MISSION.md\tfile"), "manifest lists shared MISSION.md");
    assert.ok(content.includes(".ai-os/lanes/default/MISSION.md\tfile"), "manifest lists lane MISSION.md");
    assert.ok(content.includes(".ai-os/lanes/default/baseline-log\tdir"), "manifest lists lane baseline-log dir");
    assert.ok(content.includes(".ai-os/bin\tdir"), "manifest lists local doctor bin dir");
    assert.ok(content.includes(".ai-os/bin/ai-os-doctor.js\tfile"), "manifest lists local doctor entry");
    assert.ok(content.includes(".ai-os/bin/shared.js\tfile"), "manifest lists local doctor shared module");
    assert.ok(content.includes(".ai-os/bin/VERSION\tfile"), "manifest lists local doctor VERSION");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("shared: installLocalDoctor vendors a zero-network doctor", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  try {
    const installed = shared.installLocalDoctor(dir);
    assert.ok(installed.includes(".ai-os/bin/ai-os-doctor.js"), "returns local doctor entry");
    assert.ok(installed.includes(".ai-os/bin/shared.js"), "returns local shared module");
    assert.ok(installed.includes(".ai-os/bin/VERSION"), "returns local VERSION");
    assert.ok(fs.existsSync(path.join(dir, ".ai-os", "bin", "ai-os-doctor.js")), "doctor entry written");
    assert.ok(fs.existsSync(path.join(dir, ".ai-os", "bin", "shared.js")), "shared module written");
    const localVersion = fs.readFileSync(path.join(dir, ".ai-os", "bin", "VERSION"), "utf8").trim();
    assert.equal(localVersion, shared.readFrameworkVersion(), `local VERSION matches framework (${localVersion})`);
    // vendored files are verbatim copies of the source bin scripts (zero drift)
    const srcDoctor = fs.readFileSync(path.join(__dirname, "..", "bin", "ai-os-doctor.js"), "utf8");
    const vendoredDoctor = fs.readFileSync(path.join(dir, ".ai-os", "bin", "ai-os-doctor.js"), "utf8");
    assert.equal(srcDoctor, vendoredDoctor, "vendored doctor is a verbatim copy of bin/ai-os-doctor.js");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("shared: installIdeFiles", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  try {
    const installed = shared.installIdeFiles(dir, { overwrite: false });
    assert.ok(installed.includes("CLAUDE.md"), "CLAUDE.md installed");
    assert.ok(installed.includes("GEMINI.md"), "GEMINI.md installed");
    const claude = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.ok(claude.includes(".ai-os/lanes/default/STATE.md"), "CLAUDE.md points to lane STATE.md");
    assert.ok(claude.includes(".ai-os/MISSION.md"), "CLAUDE.md references shared root mission");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("shared: appendGitignoreEntries is idempotent", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-unit-"));
  try {
    const first = shared.appendGitignoreEntries(dir);
    const second = shared.appendGitignoreEntries(dir);
    assert.equal(first, true, "first call returns true");
    assert.equal(second, false, "second call returns false (idempotent)");
    const content = fs.readFileSync(path.join(dir, ".gitignore"), "utf8");
    const count = (content.match(/AI-OS managed/g) || []).length;
    assert.equal(count, 1, `gitignore header appears exactly once (count=${count})`);
    assert.ok(content.includes(".ai-os/lanes/*/STATE.md"), "gitignore includes lane STATE ignore");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
