#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const doctor = require("../bin/ai-os-doctor");
const doctorShared = require("../bin/doctor-shared");
const { installProject } = require("../bin/installer");
const {
  afterEach,
  assert,
  cleanup,
  runDoctor,
  runInstall,
  runLocalDoctor,
  test,
  tmpDir,
} = require("./helpers");

const FIXED_DATE = "2026-07-11T01:02:03.000Z";
const METADATA_PATH = ".ai-os/framework.toml";
const MANIFEST_PATH = ".ai-os/managed-files.tsv";
const VERSION_PATH = ".ai-os/bin/VERSION";
const REFERENCE_PATH = ".ai-os/reference/artifacts.md";
const MANIFEST_HEADER = "# path\ttype\townership\tsource_sha256";
const ISSUE_KEYS = ["level", "code", "message", "severity", "path", "lane_id"];
const REPORT_KEYS = [
  "ok",
  "version",
  "package",
  "targetDir",
  "installedVersion",
  "layout_version",
  "layout_mode",
  "issues",
  "semantic_warnings",
  "layout_ok",
  "delivery_ready",
  "lanes",
];
const REQUIRED_CONSTITUTION_ANCHORS = [
  "## 五条核心要求",
  "## 绝对禁止",
];

const temporaryRoots = new Set();

afterEach(() => {
  cleanup(...temporaryRoots);
  temporaryRoots.clear();
});

function temporaryRoot() {
  const root = fs.realpathSync.native(tmpDir());
  temporaryRoots.add(root);
  return root;
}

function installedFixture(options = {}) {
  const root = temporaryRoot();
  installProject(root, {
    clock: () => new Date(FIXED_DATE),
    ...options,
  });
  return root;
}

function fixturePath(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function jsonDoctor(root, { local = false, strict = false } = {}) {
  const args = [root, "--json"];
  if (strict) args.push("--strict");
  const result = local
    ? runLocalDoctor(root, args)
    : runDoctor(args);
  assert.equal(result.stderr, "", result.stderr);
  assert.notEqual(result.stdout, "", "JSON doctor writes one complete report");
  let report;
  assert.doesNotThrow(() => {
    report = JSON.parse(result.stdout);
  }, `invalid doctor JSON: ${result.stdout}`);
  return { report, result };
}

function jsonRoutedDoctor(root, { strict = false } = {}) {
  const args = ["doctor", root, "--json"];
  if (strict) args.push("--strict");
  const result = runInstall(args);
  assert.equal(result.stderr, "", result.stderr);
  assert.notEqual(result.stdout, "", "routed doctor writes one complete JSON report");
  let report;
  assert.doesNotThrow(() => {
    report = JSON.parse(result.stdout);
  }, `invalid routed doctor JSON: ${result.stdout}`);
  return { report, result };
}

function assertIssueShape(issue) {
  assert.deepEqual(Object.keys(issue), ISSUE_KEYS);
  assert.equal(issue.level, issue.severity);
  assert.match(issue.code, /^[EWI]\d{3}$/);
  assert.equal(typeof issue.message, "string");
}

function matchingIssue(report, {
  code,
  laneId,
  message,
  issuePath,
}) {
  return report.issues.find((issue) => (
    (code === undefined || issue.code === code)
    && (laneId === undefined || issue.lane_id === laneId)
    && (issuePath === undefined || issue.path === issuePath)
    && (message === undefined || message.test(issue.message))
  ));
}

function assertLayoutFailure(probe, expected) {
  assert.equal(probe.result.status, 1);
  assert.equal(probe.report.layout_ok, false);
  assert.equal(probe.report.ok, false);
  assert.equal(Array.isArray(probe.report.issues), true);
  const issue = matchingIssue(probe.report, expected);
  assert.ok(issue, `missing expected issue ${JSON.stringify(expected)}\n${JSON.stringify(probe.report, null, 2)}`);
  assertIssueShape(issue);
  assert.equal(issue.severity, "error");
  return issue;
}

function assertGlobalLayoutFailure(probe, expected = {}) {
  return assertLayoutFailure(probe, {
    ...expected,
    laneId: null,
    issuePath: null,
  });
}

function assertGlobalWarning(probe, expected = {}) {
  assertHealthyLayout(probe);
  const issue = matchingIssue(probe.report, {
    ...expected,
    laneId: null,
    issuePath: null,
  });
  assert.ok(issue, `missing expected warning ${JSON.stringify(expected)}`);
  assertIssueShape(issue);
  assert.equal(issue.severity, "warning");
  return issue;
}

function assertLaneLayoutFailure(probe, laneId, relativePath, expected = {}) {
  assert.equal(path.isAbsolute(relativePath), false);
  assert.equal(relativePath.includes("\\"), false);
  return assertLayoutFailure(probe, {
    ...expected,
    laneId,
    issuePath: relativePath,
  });
}

function assertHealthyLayout(probe) {
  assert.equal(probe.result.status, 0);
  assert.equal(probe.report.layout_ok, true);
  assert.equal(probe.report.ok, probe.report.layout_ok);
  assert.equal(probe.report.delivery_ready, false);
  for (const issue of probe.report.issues) assertIssueShape(issue);
}

function assertUntrustedMetadata(report) {
  assert.equal(report.installedVersion, null);
  assert.equal(report.layout_version, null);
  assert.equal(report.layout_mode, null);
}

function assertProcessParity(actual, expected) {
  assert.equal(actual.status, expected.status);
  assert.equal(actual.stdout, expected.stdout);
  assert.equal(actual.stderr, expected.stderr);
}

function metadataContent(root) {
  return fs.readFileSync(fixturePath(root, METADATA_PATH), "utf8");
}

function writeMetadata(root, content) {
  fs.writeFileSync(fixturePath(root, METADATA_PATH), content);
}

function metadataWithoutField(content, field) {
  const lines = content.split("\n");
  const filtered = lines.filter((line) => !line.startsWith(`${field} = `));
  assert.equal(filtered.length, lines.length - 1, `fixture contains ${field}`);
  return filtered.join("\n");
}

function metadataWithField(content, field, value) {
  const lines = content.split("\n");
  const index = lines.findIndex((line) => line.startsWith(`${field} = `));
  assert.notEqual(index, -1, `fixture contains ${field}`);
  lines[index] = `${field} = "${value}"`;
  return lines.join("\n");
}

function manifestDocument(root) {
  const content = fs.readFileSync(fixturePath(root, MANIFEST_PATH), "utf8");
  assert.equal(content.endsWith("\n"), true, "installer manifest ends with LF");
  const lines = content.slice(0, -1).split("\n");
  assert.equal(lines[0], MANIFEST_HEADER);
  return { header: lines[0], rows: lines.slice(1) };
}

function writeManifestDocument(root, document) {
  fs.writeFileSync(
    fixturePath(root, MANIFEST_PATH),
    [document.header, ...document.rows, ""].join("\n"),
  );
}

function updateManifestRow(root, relativePath, update) {
  const document = manifestDocument(root);
  const index = document.rows.findIndex((row) => row.startsWith(`${relativePath}\t`));
  assert.notEqual(index, -1, `manifest contains ${relativePath}`);
  const fields = document.rows[index].split("\t");
  assert.equal(fields.length, 4);
  update(fields);
  document.rows[index] = fields.join("\t");
  writeManifestDocument(root, document);
}

function updateManifestHash(root, relativePath) {
  const bytes = fs.readFileSync(fixturePath(root, relativePath));
  updateManifestRow(root, relativePath, (fields) => {
    fields[3] = doctorShared.sha256(bytes);
  });
}

function removeManifestPath(root, relativePath) {
  const document = manifestDocument(root);
  const before = document.rows.length;
  document.rows = document.rows.filter((row) => !row.startsWith(`${relativePath}\t`));
  assert.equal(document.rows.length, before - 1, `manifest contains ${relativePath}`);
  writeManifestDocument(root, document);
}

function replaceFileWithSymlink(root, relativePath) {
  const destination = fixturePath(root, relativePath);
  const target = `${destination}.target`;
  fs.renameSync(destination, target);
  fs.symlinkSync(target, destination, "file");
}

function addLane(root, laneId, { missing = [] } = {}) {
  const source = fixturePath(root, ".ai-os/lanes/default");
  const destination = fixturePath(root, `.ai-os/lanes/${laneId}`);
  fs.cpSync(source, destination, { recursive: true });
  const laneToml = path.join(destination, "lane.toml");
  const content = fs.readFileSync(laneToml, "utf8")
    .replace('id = "default"', `id = "${laneId}"`);
  fs.writeFileSync(laneToml, content);
  for (const relativePath of missing) {
    fs.rmSync(path.join(destination, ...relativePath.split("/")), {
      force: true,
      recursive: true,
    });
  }
  return destination;
}

function constitutionWithLogicalLines(lineCount) {
  const lines = [
    "# Project Constitution",
    ...REQUIRED_CONSTITUTION_ANCHORS,
  ];
  while (lines.length < lineCount) lines.push(`project rule ${lines.length + 1}`);
  assert.equal(lines.length, lineCount);
  return `${lines.join("\n")}\n`;
}

function assertNoConstitutionWarning(probe, anchor) {
  assertHealthyLayout(probe);
  assert.equal(probe.report.issues.some((issue) => (
    issue.code === "W011" && issue.message.includes(anchor)
  )), false);
}

function compareCodePointText(left, right) {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0));
  const rightPoints = Array.from(right, (character) => character.codePointAt(0));
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] < rightPoints[index] ? -1 : 1;
    }
  }
  return leftPoints.length - rightPoints.length;
}

function compareIssues(left, right) {
  const severityRank = { error: 0, warning: 1, info: 2 };
  for (const [leftValue, rightValue] of [
    [left.lane_id ?? "", right.lane_id ?? ""],
    [left.path ?? "", right.path ?? ""],
  ]) {
    const comparison = compareCodePointText(leftValue, rightValue);
    if (comparison !== 0) return comparison;
  }
  if (severityRank[left.severity] !== severityRank[right.severity]) {
    return severityRank[left.severity] - severityRank[right.severity];
  }
  for (const [leftValue, rightValue] of [
    [left.code, right.code],
    [left.message, right.message],
  ]) {
    const comparison = compareCodePointText(leftValue, rightValue);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

test("Task 3 exports inspectProject", () => {
  assert.equal(typeof doctor.inspectProject, "function");
});

test("Task 3 exports parseManagedFiles", () => {
  assert.equal(typeof doctorShared.parseManagedFiles, "function");
});

const UNSAFE_MANIFEST_TEXT = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;
const UNSAFE_RAW_OUTPUT = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u;

function parseManifestRows(rows) {
  return doctorShared.parseManagedFiles(`${MANIFEST_HEADER}\n${rows.join("\n")}\n`);
}

test("parseManagedFiles rejects non-portable path spelling and case-fold aliases", () => {
  for (const unsafePath of [
    " AGENTS.md",
    "AGENTS.md ",
    "AGENTS.md.",
    "AGENTS.md::$DATA",
    ".ai-os/bin/CON",
    "unsafe<name.md",
    ".ai-os/MANAGE~1.TSV",
    "cash$.md",
    "caf\u00e9.md",
    "bad\ud800.md",
    "bad\ufffd.md",
  ]) {
    assert.throws(
      () => parseManifestRows([`${unsafePath}\tfile\tproject\t`]),
      (error) => (
        error instanceof doctorShared.CanonicalParseError
        && /path|portable|ASCII/i.test(error.reason)
        && !error.message.includes(unsafePath)
      ),
      unsafePath,
    );
  }

  assert.throws(
    () => parseManifestRows([
      "AGENTS.md\tfile\tproject\t",
      "agents.md\tfile\tproject\t",
    ]),
    (error) => (
      error instanceof doctorShared.CanonicalParseError
      && /case-fold|alias/i.test(error.reason)
    ),
  );
});

test("parseManagedFiles rejects unsafe field controls without reflecting them", () => {
  const cases = [
    ["AG\u0007ENTS.md", "file", "project", ""],
    ["AGENTS.md", "fi\u001ble", "project", ""],
    ["AGENTS.md", "file", "pro\u0085ject", ""],
    [VERSION_PATH, "file", "framework", `${"a".repeat(63)}\u2028`],
    ["AG\u2029ENTS.md", "file", "project", ""],
    ["AG\u202eENTS.md", "file", "project", ""],
    ["AG\u2066ENTS.md", "file", "project", ""],
    ["AG\u061cENTS.md", "file", "project", ""],
  ];
  for (const fields of cases) {
    let failure = null;
    try {
      parseManifestRows([fields.join("\t")]);
    } catch (error) {
      failure = error;
    }
    assert.ok(failure instanceof doctorShared.CanonicalParseError, fields.join(" | "));
    assert.match(failure.reason, /field|character|path|canonical/i);
    assert.doesNotMatch(failure.message, UNSAFE_MANIFEST_TEXT);
  }
});

test("parseManagedFiles never reflects untrusted type or ownership values", () => {
  for (const [fields, value, reason] of [
    [["AGENTS.md", "evil-type", "project", ""], "evil-type", /type/i],
    [["AGENTS.md", "file", "evil-owner", ""], "evil-owner", /ownership/i],
  ]) {
    assert.throws(
      () => parseManifestRows([fields.join("\t")]),
      (error) => (
        error instanceof doctorShared.CanonicalParseError
        && reason.test(error.reason)
        && !error.message.includes(value)
      ),
    );
  }
});

test("parseManagedFiles bounds path length and row count before allocation growth", () => {
  assert.throws(
    () => parseManifestRows([`${"a".repeat(1025)}\tfile\tproject\t`]),
    (error) => error instanceof doctorShared.CanonicalParseError && /limit|long|length/i.test(error.reason),
  );
  const rows = Array.from({ length: 4097 }, (_, index) => (
    `bounded-${String(index).padStart(4, "0")}.md\tfile\tproject\t`
  ));
  assert.throws(
    () => parseManifestRows(rows),
    (error) => error instanceof doctorShared.CanonicalParseError && /row|limit|many/i.test(error.reason),
  );
});

test("inspectProject returns the minimal not-project report directly", () => {
  const root = temporaryRoot();
  assert.equal(typeof doctor.inspectProject, "function");
  assert.deepEqual(doctor.inspectProject(root), {
    ok: false,
    reason: "not-an-ai-os-project",
    targetDir: root,
  });
});

test("clean JSON report is additive and readiness remains provisionally false", () => {
  const root = installedFixture();
  const probe = jsonDoctor(root);
  assertHealthyLayout(probe);
  assert.deepEqual(Object.keys(probe.report), REPORT_KEYS);
  assert.equal(probe.report.version, "11.0.0");
  assert.equal(probe.report.package, "create-ai-os@11.0.0");
  assert.equal(probe.report.targetDir, root);
  assert.equal(probe.report.installedVersion, "11.0.0");
  assert.equal(probe.report.layout_version, "11");
  assert.equal(probe.report.layout_mode, "shared-root-default-lane");
  assert.deepEqual(probe.report.issues, []);
  assert.deepEqual(probe.report.semantic_warnings, []);
  assert.deepEqual(Object.keys(probe.report.lanes), ["default"]);
  assert.equal(probe.report.lanes.default.layout_ok, true);
  assert.equal(probe.report.lanes.default.delivery_ready, false);
  assert.deepEqual(probe.report.lanes.default.issues, []);
  assert.deepEqual(
    Object.keys(probe.report.lanes.default),
    ["layout_ok", "delivery_ready", "issues"],
  );
  for (const forbidden of ["layout", "warnings", "errors", "readiness_evaluated"]) {
    assert.equal(Object.hasOwn(probe.report, forbidden), false);
  }
  const routed = jsonRoutedDoctor(root);
  const vendored = jsonDoctor(root, { local: true });
  assert.equal(routed.result.status, 0);
  assert.equal(vendored.result.status, 0);
  assertProcessParity(routed.result, probe.result);
  assertProcessParity(vendored.result, probe.result);
  assert.deepEqual(routed.report, probe.report);
  assert.deepEqual(vendored.report, probe.report);
});

test("no .ai-os keeps the minimal exit-2 JSON payload", () => {
  const root = temporaryRoot();
  const probe = jsonDoctor(root);
  assert.equal(probe.result.status, 2);
  assert.deepEqual(probe.report, {
    ok: false,
    reason: "not-an-ai-os-project",
    targetDir: root,
  });
});

test("a broken .ai-os symlink is E004 rather than the not-project union", () => {
  const root = temporaryRoot();
  fs.symlinkSync("missing-ai-os-target", fixturePath(root, ".ai-os"), "dir");
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E004",
    message: /[.]ai-os|symbolic link|symlink/i,
  });
});

test("JSON output escapes an unsafe target path while preserving its API value", () => {
  const root = path.join(temporaryRoot(), "target-\u202e-\u0085");
  fs.mkdirSync(root);
  const result = runDoctor([root, "--json"]);
  assert.equal(result.status, 2);
  assert.doesNotMatch(result.stdout, UNSAFE_RAW_OUTPUT);
  assert.equal(JSON.parse(result.stdout).targetDir, path.resolve(root));
});

test("clean text output separates layout from provisional delivery readiness", () => {
  const root = installedFixture();
  const normal = runDoctor([root]);
  const strict = runDoctor([root, "--strict"]);
  assert.equal(normal.status, 0);
  assert.equal(strict.status, 1);
  assert.equal(normal.stderr, "");
  assert.equal(strict.stderr, "");
  assert.equal(strict.stdout, normal.stdout);
  assert.match(normal.stdout, new RegExp(`^AI-OS doctor for ${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m"));
  assert.match(normal.stdout, /Layout checks: PASS/);
  assert.match(normal.stdout, /Delivery ready: NO/);
  assert.doesNotMatch(normal.stdout, /All checks passed|looks healthy/i);
});

test("untrusted metadata renders Installed and Layout as unknown", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, METADATA_PATH));
  const result = runDoctor([root]);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Installed: unknown/);
  assert.match(result.stdout, /Layout: unknown/);
  assert.doesNotMatch(result.stdout, /Installed: v11[.]0[.]0|Layout: shared-root-default-lane/);
});

for (const [field, invalidValue, observableField] of [
  ["schema_version", "10", null],
  ["layout_version", "10", "layout_version"],
  ["layout_mode", "other-layout", "layout_mode"],
  ["default_lane", "release", null],
  ["framework_version", "not-semver", "installedVersion"],
]) {
  for (const mode of ["missing", "invalid"]) {
    test(`metadata ${mode} ${field} is E002 and never synthesized`, () => {
      const root = installedFixture();
      const content = metadataContent(root);
      writeMetadata(
        root,
        mode === "missing"
          ? metadataWithoutField(content, field)
          : metadataWithField(content, field, invalidValue),
      );
      const probe = jsonDoctor(root);
      assertGlobalLayoutFailure(probe, {
        code: "E002",
        message: new RegExp(field, "i"),
      });
      assertUntrustedMetadata(probe.report);
      if (observableField) assert.equal(probe.report[observableField], null);
    });
  }
}

for (const [name, mutate] of [
  ["unsupported assignment", (content) => content.replace('schema_version = "11"', "schema_version = 11")],
  ["UTF-8 BOM", (content) => `\ufeff${content}`],
  ["bare carriage return", (content) => content.replace("\n", "\r")],
  ["malformed UTF-8", (content) => Buffer.concat([Buffer.from(content), Buffer.from([0xff])])],
]) {
  test(`malformed metadata (${name}) fails closed as E003`, () => {
    const root = installedFixture();
    writeMetadata(root, mutate(metadataContent(root)));
    const probe = jsonDoctor(root);
    assertGlobalLayoutFailure(probe, {
      code: "E003",
      message: /framework[.]toml|metadata|canonical/i,
    });
    assertUntrustedMetadata(probe.report);
  });
}

test("metadata symlink is a structured E004 layout error", () => {
  const root = installedFixture();
  replaceFileWithSymlink(root, METADATA_PATH);
  const probe = jsonDoctor(root);
  assertGlobalLayoutFailure(probe, {
    code: "E004",
    message: /framework[.]toml|symbolic link|symlink/i,
  });
  assertUntrustedMetadata(probe.report);
});

for (const relativePath of [METADATA_PATH, VERSION_PATH]) {
  test(`${relativePath} wrong type is emitted exactly once`, () => {
    const root = installedFixture();
    const absolute = fixturePath(root, relativePath);
    fs.rmSync(absolute);
    fs.mkdirSync(absolute);
    const report = doctor.inspectProject(root);
    const errors = report.issues.filter((issue) => issue.code === "E022");
    assert.equal(errors.length, 1, JSON.stringify(errors, null, 2));
    assert.equal(errors[0].lane_id, null);
    assert.equal(errors[0].path, null);
    assert.match(errors[0].message, new RegExp(
      relativePath === METADATA_PATH ? "framework[.]toml|metadata" : "VERSION",
      "i",
    ));
  });
}

test("oversized metadata is rejected before readFileSync and keeps entrypoint parity", () => {
  const root = installedFixture();
  const metadata = fixturePath(root, METADATA_PATH);
  const descriptor = fs.openSync(metadata, "w");
  try {
    fs.ftruncateSync(descriptor, (64 * 1024) + 1);
  } finally {
    fs.closeSync(descriptor);
  }

  const originalRead = fs.readFileSync;
  let attemptedMetadataRead = false;
  let report;
  try {
    fs.readFileSync = function boundedRead(file, ...args) {
      if (path.resolve(String(file)) === path.resolve(metadata)) {
        attemptedMetadataRead = true;
        throw new Error("oversized metadata must not be read");
      }
      return originalRead.call(this, file, ...args);
    };
    report = doctor.inspectProject(root);
  } finally {
    fs.readFileSync = originalRead;
  }
  assert.equal(attemptedMetadataRead, false);
  assert.ok(matchingIssue(report, { code: "E003", message: /size|large|limit/i }));

  const source = jsonDoctor(root);
  const routed = jsonRoutedDoctor(root);
  const vendored = jsonDoctor(root, { local: true });
  assertProcessParity(routed.result, source.result);
  assertProcessParity(vendored.result, source.result);
});

test("metadata size limit is descriptor-bound when path stat is stale", () => {
  const root = installedFixture();
  const metadata = fixturePath(root, METADATA_PATH);
  const descriptor = fs.openSync(metadata, "w");
  try {
    fs.ftruncateSync(descriptor, (64 * 1024) + 1);
  } finally {
    fs.closeSync(descriptor);
  }
  const originalStat = fs.statSync;
  try {
    fs.statSync = function stalePathStat(file, ...args) {
      const stat = originalStat.call(this, file, ...args);
      if (path.resolve(String(file)) !== path.resolve(metadata)) return stat;
      return new Proxy(stat, {
        get(target, property, receiver) {
          if (property === "size") return 1;
          const value = Reflect.get(target, property, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    };
    const report = doctor.inspectProject(root);
    assert.ok(matchingIssue(report, {
      code: "E003",
      message: /size|large|limit/i,
    }), JSON.stringify(report, null, 2));
  } finally {
    fs.statSync = originalStat;
  }
});

test("framework_version must equal the target vendored VERSION", () => {
  const root = installedFixture();
  fs.writeFileSync(fixturePath(root, VERSION_PATH), "11.0.1\n");
  updateManifestHash(root, VERSION_PATH);
  const probe = jsonDoctor(root);
  assertGlobalLayoutFailure(probe, {
    code: "E002",
    message: /framework_version|VERSION|version/i,
  });
  assertUntrustedMetadata(probe.report);
});

test("missing default lane remains an E051 global layout error", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, ".ai-os/lanes/default"), { recursive: true });
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E051",
    message: /default lane/i,
  });
});

test("a non-directory lanes root is E050", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, ".ai-os/lanes"), { recursive: true });
  fs.writeFileSync(fixturePath(root, ".ai-os/lanes"), "not a directory\n");
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E050",
    message: /lanes.*not a directory|wrong type/i,
  });
});

test("a linked lanes root fails closed", () => {
  const root = installedFixture();
  const lanes = fixturePath(root, ".ai-os/lanes");
  const target = fixturePath(root, ".ai-os/lanes.target");
  fs.renameSync(lanes, target);
  fs.symlinkSync(target, lanes, "dir");
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E004",
    message: /lanes|symbolic link|symlink/i,
  });
});

test("an extra lane missing DESIGN is inspected and scoped", () => {
  const root = installedFixture();
  addLane(root, "release", { missing: ["DESIGN.md"] });
  assertLaneLayoutFailure(
    jsonDoctor(root),
    "release",
    ".ai-os/lanes/release/DESIGN.md",
    { code: "E020", message: /DESIGN[.]md/ },
  );
});

test("tasks.yaml is required core for every lane", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, ".ai-os/lanes/default/tasks.yaml"));
  assertLaneLayoutFailure(
    jsonDoctor(root),
    "default",
    ".ai-os/lanes/default/tasks.yaml",
    { code: "E020", message: /tasks[.]yaml/ },
  );
});

test("missing session STATE remains I020 and layout healthy", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, ".ai-os/lanes/default/STATE.md"));
  const probe = jsonDoctor(root);
  assertHealthyLayout(probe);
  const stateIssue = matchingIssue(probe.report, {
    code: "I020",
    laneId: "default",
    issuePath: ".ai-os/lanes/default/STATE.md",
  });
  assert.ok(stateIssue);
  assertIssueShape(stateIssue);
  assert.equal(stateIssue.severity, "info");
});

test("a non-directory lane entry is not silently skipped", () => {
  const root = installedFixture();
  fs.writeFileSync(fixturePath(root, ".ai-os/lanes/release"), "not a lane\n");
  assertLaneLayoutFailure(
    jsonDoctor(root),
    "release",
    ".ai-os/lanes/release",
    { code: "E022", message: /not a directory|wrong type/i },
  );
});

test("a linked lane entry is not silently skipped", () => {
  const root = installedFixture();
  fs.symlinkSync(
    fixturePath(root, ".ai-os/lanes/default"),
    fixturePath(root, ".ai-os/lanes/release"),
    "dir",
  );
  assertLaneLayoutFailure(
    jsonDoctor(root),
    "release",
    ".ai-os/lanes/release",
    { code: "E004", message: /symbolic link|symlink/i },
  );
});

test("a lane.toml directory is E022 for that lane", () => {
  const root = installedFixture();
  const release = addLane(root, "release");
  fs.rmSync(path.join(release, "lane.toml"));
  fs.mkdirSync(path.join(release, "lane.toml"));
  assertLaneLayoutFailure(
    jsonDoctor(root),
    "release",
    ".ai-os/lanes/release/lane.toml",
    { code: "E022", message: /lane[.]toml.*not a file|wrong type/i },
  );
});

test("a malformed lane.toml keeps the canonical detail and exact lane path", () => {
  const root = installedFixture();
  const release = addLane(root, "release");
  const laneToml = path.join(release, "lane.toml");
  fs.writeFileSync(
    laneToml,
    fs.readFileSync(laneToml, "utf8").replace('id = "release"', "id = 7"),
  );
  const issue = assertLaneLayoutFailure(
    jsonDoctor(root),
    "release",
    ".ai-os/lanes/release/lane.toml",
    { code: "E003", message: /lane[.]toml.*canonical parse/i },
  );
  assert.notEqual(issue.message, "E003");
});

test("distinct empty lane.toml fields retain distinct diagnostics", () => {
  const root = installedFixture();
  const laneToml = fixturePath(root, ".ai-os/lanes/default/lane.toml");
  fs.writeFileSync(
    laneToml,
    fs.readFileSync(laneToml, "utf8")
      .replace(/title = "[^"]*"/u, 'title = ""')
      .replace(/status = "[^"]*"/u, 'status = ""'),
  );
  const report = doctor.inspectProject(root);
  const fieldIssues = report.lanes.default.issues.filter((issue) => (
    issue.code === "E003" && issue.path === ".ai-os/lanes/default/lane.toml"
  ));
  assert.equal(fieldIssues.length, 2);
  assert.deepEqual(
    fieldIssues.map((issue) => issue.message.match(/field (\w+)/u)[1]).sort(),
    ["status", "title"],
  );
});

for (const [name, relativePath, expectedCode] of [
  ["constitution", "AGENTS.md", "E010"],
  ["shared mission", ".ai-os/MISSION.md", "E020"],
  ["metadata", METADATA_PATH, "E001"],
]) {
  test(`${name} missing fact is emitted exactly once by its dedicated checker`, () => {
    const root = installedFixture();
    fs.rmSync(fixturePath(root, relativePath));
    const report = doctor.inspectProject(root);
    const errors = report.issues.filter((issue) => issue.severity === "error");
    assert.equal(errors.length, 1, JSON.stringify(errors, null, 2));
    assert.equal(errors[0].code, expectedCode);
    assert.equal(errors[0].lane_id, null);
    assert.equal(errors[0].path, null);
  });
}

test("lane missing fact is emitted once and shared by top and lane reports", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, ".ai-os/lanes/default/tasks.yaml"));
  const report = doctor.inspectProject(root);
  const top = report.issues.filter((issue) => (
    issue.code === "E020"
    && issue.path === ".ai-os/lanes/default/tasks.yaml"
    && issue.lane_id === "default"
  ));
  const scoped = report.lanes.default.issues.filter((issue) => issue.code === "E020");
  assert.equal(top.length, 1);
  assert.equal(scoped.length, 1);
  assert.strictEqual(top[0], scoped[0]);
});

test("lane IDs named __proto__ remain safe own report keys", () => {
  const root = installedFixture();
  addLane(root, "__proto__");
  const probe = jsonDoctor(root);
  assertHealthyLayout(probe);
  assert.equal(Object.hasOwn(probe.report.lanes, "__proto__"), true);
  assert.equal(probe.report.lanes.__proto__.layout_ok, true);
  assert.equal(probe.report.lanes.__proto__.delivery_ready, false);
  assert.equal({}.polluted, undefined);
});

for (const teamConfig of [true, false]) {
  for (const ideFiles of [true, false]) {
    test(`manifest accepts installer inventory teamConfig=${teamConfig} ideFiles=${ideFiles}`, () => {
      const root = installedFixture({ teamConfig, ideFiles });
      assertHealthyLayout(jsonDoctor(root));
    });
  }
}

for (const [name, retainedPath, removedPath] of [
  ["team config", ".gitignore", ".gitattributes"],
  ["IDE pointers", "CLAUDE.md", "GEMINI.md"],
]) {
  test(`manifest rejects a half-enabled optional ${name} inventory`, () => {
    const root = installedFixture();
    assert.equal(fs.existsSync(fixturePath(root, retainedPath)), true);
    fs.rmSync(fixturePath(root, removedPath));
    removeManifestPath(root, removedPath);
    const issue = assertGlobalLayoutFailure(jsonDoctor(root), {
      message: /managed-files[.]tsv|manifest/i,
    });
    assert.match(issue.message, /optional|inventory|pair|combination/i);
  });
}

test("disabled optional inventories may leave preserved files outside the manifest", () => {
  const root = installedFixture();
  installProject(root, {
    clock: () => new Date(FIXED_DATE),
    teamConfig: false,
    ideFiles: false,
  });
  for (const relativePath of [".gitignore", ".gitattributes", "CLAUDE.md", "GEMINI.md"]) {
    assert.equal(fs.existsSync(fixturePath(root, relativePath)), true);
  }
  assert.equal(manifestDocument(root).rows.length, 14);
  assertHealthyLayout(jsonDoctor(root));
});

for (const relativePath of [".gitignore", ".gitattributes", "CLAUDE.md", "GEMINI.md"]) {
  test(`listed project row ${relativePath} is required exactly once`, () => {
    const root = installedFixture();
    fs.rmSync(fixturePath(root, relativePath));
    const probe = jsonDoctor(root);
    const issue = assertGlobalLayoutFailure(probe, {
      code: "E020",
      message: new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    });
    assert.equal(probe.report.issues.filter((item) => (
      item.severity === "error" && item.message.includes(relativePath)
    )).length, 1);
    if (relativePath === ".gitignore") {
      assert.equal(probe.report.issues.some((item) => item.code === "W040"), false);
    }
    assert.equal(issue.path, null);
  });
}

for (const [name, relativePath, mutate, code] of [
  ["wrong type", ".gitattributes", (absolute) => fs.mkdirSync(absolute), "E022"],
  ["final link", "CLAUDE.md", (absolute) => fs.symlinkSync(`${absolute}.target`, absolute), "E004"],
]) {
  test(`listed project row rejects ${name}`, () => {
    const root = installedFixture();
    const absolute = fixturePath(root, relativePath);
    fs.rmSync(absolute);
    if (name === "final link") fs.writeFileSync(`${absolute}.target`, "target\n");
    mutate(absolute);
    assertGlobalLayoutFailure(jsonDoctor(root), {
      code,
      message: new RegExp(relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|symbolic link|not a file", "i"),
    });
  });
}

for (const [name, mutate, code] of [
  ["missing", (absolute) => fs.rmSync(absolute), "E020"],
  ["wrong type", (absolute) => {
    fs.rmSync(absolute);
    fs.mkdirSync(absolute);
  }, "E022"],
  ["final link", (absolute) => {
    fs.renameSync(absolute, `${absolute}.target`);
    fs.symlinkSync(`${absolute}.target`, absolute, "file");
  }, "E004"],
]) {
  test(`listed installer baseline rejects ${name} with lane scope and identity`, () => {
    const root = installedFixture();
    const baselineRow = manifestDocument(root).rows.find((row) => (
      row.startsWith(".ai-os/lanes/default/baseline-log/BL-")
    ));
    assert.ok(baselineRow);
    const relativePath = baselineRow.split("\t", 1)[0];
    const absolute = fixturePath(root, relativePath);
    mutate(absolute);
    const report = doctor.inspectProject(root);
    const probe = { report, result: { status: report.ok ? 0 : 1 } };
    const issue = assertLaneLayoutFailure(probe, "default", relativePath, {
      code,
      message: /baseline-log|baseline|symbolic link|not a file/i,
    });
    const scoped = probe.report.lanes.default.issues.filter((item) => (
      item.code === code && item.path === relativePath
    ));
    assert.equal(scoped.length, 1);
    assert.strictEqual(issue, scoped[0]);
  });
}

test("missing managed-files.tsv is a global layout error", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, MANIFEST_PATH));
  assertGlobalLayoutFailure(jsonDoctor(root), {
    message: /managed-files[.]tsv|manifest/i,
  });
});

test("managed-files.tsv directory is E022", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, MANIFEST_PATH));
  fs.mkdirSync(fixturePath(root, MANIFEST_PATH));
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E022",
    message: /managed-files[.]tsv|manifest|not a file|wrong type/i,
  });
});

const untrustedManifestCases = [
  ["missing", (root) => fs.rmSync(fixturePath(root, MANIFEST_PATH))],
  ["symlink", (root) => replaceFileWithSymlink(root, MANIFEST_PATH)],
  ["wrong type", (root) => {
    fs.rmSync(fixturePath(root, MANIFEST_PATH));
    fs.mkdirSync(fixturePath(root, MANIFEST_PATH));
  }],
  ["malformed header", (root) => {
    const document = manifestDocument(root);
    document.header = "# bad";
    writeManifestDocument(root, document);
  }],
  ["UTF-8 BOM", (root) => {
    const manifest = fixturePath(root, MANIFEST_PATH);
    fs.writeFileSync(manifest, Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      fs.readFileSync(manifest),
    ]));
  }],
  ["invalid inventory", (root) => removeManifestPath(root, VERSION_PATH)],
  ["missing metadata row", (root) => removeManifestPath(root, METADATA_PATH)],
  ["wrong metadata ownership", (root) => updateManifestRow(root, METADATA_PATH, (fields) => {
    fields[2] = "project";
    fields[3] = "";
  })],
  ["wrong metadata type", (root) => updateManifestRow(root, METADATA_PATH, (fields) => {
    fields[1] = "directory";
  })],
  ["invalid metadata hash", (root) => updateManifestRow(root, METADATA_PATH, (fields) => {
    fields[3] = "0".repeat(64);
  })],
];

for (const [name, mutate] of untrustedManifestCases) {
  test(`manifest trust failure (${name}) atomically nulls metadata truth`, () => {
    const root = installedFixture();
    mutate(root);
    const probe = jsonDoctor(root);
    assert.equal(probe.result.status, 1);
    assertUntrustedMetadata(probe.report);
  });
}

test("unrelated listed project-file drift preserves locally verified metadata values", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, "CLAUDE.md"));
  const probe = jsonDoctor(root);
  assertGlobalLayoutFailure(probe, { code: "E020", message: /CLAUDE[.]md/ });
  assert.equal(probe.report.installedVersion, "11.0.0");
  assert.equal(probe.report.layout_version, "11");
  assert.equal(probe.report.layout_mode, "shared-root-default-lane");
});

const manifestFailureCases = [
  {
    name: "malformed header",
    reason: /header/i,
    mutate(root) {
      const document = manifestDocument(root);
      document.header = "# wrong header";
      writeManifestDocument(root, document);
    },
  },
  {
    name: "malformed row",
    reason: /row|column|four/i,
    mutate(root) {
      const document = manifestDocument(root);
      document.rows[0] = document.rows[0].split("\t").slice(0, 3).join("\t");
      writeManifestDocument(root, document);
    },
  },
  {
    name: "duplicate path",
    reason: /duplicate/i,
    mutate(root) {
      const document = manifestDocument(root);
      document.rows.splice(1, 0, document.rows[0]);
      writeManifestDocument(root, document);
    },
  },
  {
    name: "missing required path",
    reason: /missing|incomplete/i,
    mutate(root) {
      const document = manifestDocument(root);
      document.rows = document.rows.filter((row) => !row.startsWith(`${VERSION_PATH}\t`));
      writeManifestDocument(root, document);
    },
  },
  {
    name: "extra path",
    reason: /extra|unknown path|inventory/i,
    mutate(root) {
      fs.writeFileSync(fixturePath(root, "zzz-extra.txt"), "extra\n");
      const document = manifestDocument(root);
      document.rows.push("zzz-extra.txt\tfile\tproject\t");
      document.rows.sort();
      writeManifestDocument(root, document);
    },
  },
  {
    name: "self-listed manifest",
    reason: /self|itself|recursive/i,
    mutate(root) {
      const document = manifestDocument(root);
      document.rows.push(`${MANIFEST_PATH}\tfile\tframework\t${"0".repeat(64)}`);
      document.rows.sort();
      writeManifestDocument(root, document);
    },
  },
  {
    name: "unsafe traversal path",
    reason: /unsafe|contain|path/i,
    mutate(root) {
      const document = manifestDocument(root);
      document.rows.push("../outside\tfile\tproject\t");
      document.rows.sort();
      writeManifestDocument(root, document);
    },
  },
  {
    name: "unsorted rows",
    reason: /sort/i,
    mutate(root) {
      const document = manifestDocument(root);
      [document.rows[0], document.rows[1]] = [document.rows[1], document.rows[0]];
      writeManifestDocument(root, document);
    },
  },
  {
    name: "unknown ownership",
    reason: /ownership/i,
    mutate(root) {
      updateManifestRow(root, VERSION_PATH, (fields) => { fields[2] = "unknown"; });
    },
  },
  {
    name: "known path with wrong ownership",
    reason: /ownership/i,
    mutate(root) {
      updateManifestRow(root, VERSION_PATH, (fields) => {
        fields[2] = "session";
        fields[3] = "";
      });
    },
  },
  {
    name: "unknown type",
    reason: /type/i,
    mutate(root) {
      updateManifestRow(root, VERSION_PATH, (fields) => { fields[1] = "directory"; });
    },
  },
  {
    name: "project hash present",
    reason: /project.*hash|hash.*project/i,
    mutate(root) {
      updateManifestRow(root, "AGENTS.md", (fields) => {
        fields[3] = doctorShared.sha256(fs.readFileSync(fixturePath(root, "AGENTS.md")));
      });
    },
  },
  {
    name: "session hash present",
    reason: /session.*hash|hash.*session/i,
    mutate(root) {
      updateManifestRow(root, ".ai-os/lanes/default/STATE.md", (fields) => {
        fields[3] = doctorShared.sha256(
          fs.readFileSync(fixturePath(root, ".ai-os/lanes/default/STATE.md")),
        );
      });
    },
  },
  {
    name: "framework hash empty",
    reason: /framework.*hash|hash.*framework/i,
    mutate(root) {
      updateManifestRow(root, VERSION_PATH, (fields) => { fields[3] = ""; });
    },
  },
  {
    name: "framework hash malformed",
    reason: /hash/i,
    mutate(root) {
      updateManifestRow(root, VERSION_PATH, (fields) => { fields[3] = "abc"; });
    },
  },
  {
    name: "framework hash stale",
    reason: /hash|mismatch/i,
    mutate(root) {
      updateManifestRow(root, VERSION_PATH, (fields) => { fields[3] = "0".repeat(64); });
    },
  },
  {
    name: "raw v10 two-column form",
    reason: /two-column|header|four|column/i,
    mutate(root) {
      fs.writeFileSync(
        fixturePath(root, MANIFEST_PATH),
        "path\tsha256\nAGENTS.md\tdeadbeef\n",
      );
    },
  },
];

for (const fixture of manifestFailureCases) {
  test(`manifest rejects ${fixture.name}`, () => {
    const root = installedFixture();
    fixture.mutate(root);
    const issue = assertGlobalLayoutFailure(jsonDoctor(root), {
      message: /managed-files[.]tsv|manifest/i,
    });
    assert.match(issue.message, fixture.reason);
  });
}

for (const [name, mutate, reason] of [
  ["UTF-8 BOM", (content) => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), content]), /BOM/i],
  ["CRLF", (content) => Buffer.from(content.toString("utf8").replaceAll("\n", "\r\n")), /LF|line ending|carriage/i],
  ["bare carriage return", (content) => Buffer.from(content.toString("utf8").replace("\n", "\r")), /LF|line ending|carriage/i],
  ["malformed UTF-8", (content) => Buffer.concat([content, Buffer.from([0xff])]), /UTF-8/i],
  ["missing terminal LF", (content) => content.subarray(0, content.length - 1), /terminal LF|final newline|canonical/i],
  ["extra terminal LF", (content) => Buffer.concat([content, Buffer.from("\n")]), /terminal LF|blank row|canonical/i],
]) {
  test(`manifest rejects non-canonical bytes (${name})`, () => {
    const root = installedFixture();
    const manifest = fixturePath(root, MANIFEST_PATH);
    fs.writeFileSync(manifest, mutate(fs.readFileSync(manifest)));
    const issue = assertGlobalLayoutFailure(jsonDoctor(root), {
      message: /managed-files[.]tsv|manifest/i,
    });
    assert.match(issue.message, reason);
  });
}

test("manifest symlink is a structured E004 layout error", () => {
  const root = installedFixture();
  replaceFileWithSymlink(root, MANIFEST_PATH);
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E004",
    message: /managed-files[.]tsv|manifest|symbolic link|symlink/i,
  });
});

test("manifest diagnostics never carry attacker-controlled control characters", () => {
  const root = installedFixture();
  updateManifestRow(root, VERSION_PATH, (fields) => {
    fields[2] = "frame\u001b[31mwork";
  });
  const probe = jsonDoctor(root);
  const issue = assertGlobalLayoutFailure(probe, {
    code: "E004",
    message: /managed-files[.]tsv|manifest/i,
  });
  assert.doesNotMatch(issue.message, UNSAFE_MANIFEST_TEXT);
  assert.equal(probe.report.issues.some((item) => item.code === "E005"), false);
});

test("framework byte drift fails against the committed manifest hash", () => {
  const root = installedFixture();
  fs.appendFileSync(fixturePath(root, REFERENCE_PATH), "\nDRIFT\n");
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E004",
    message: /reference\/artifacts[.]md|hash|drift|mismatch/i,
  });
});

test("framework managed path must remain a regular file", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, REFERENCE_PATH));
  fs.mkdirSync(fixturePath(root, REFERENCE_PATH));
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E022",
    message: /reference\/artifacts[.]md|regular file|wrong type/i,
  });
});

test("framework managed path symlink fails closed", () => {
  const root = installedFixture();
  replaceFileWithSymlink(root, REFERENCE_PATH);
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E004",
    message: /reference\/artifacts[.]md|symbolic link|symlink/i,
  });
});

test("oversized managed framework files are bounded before hashing", () => {
  const root = installedFixture();
  const reference = fixturePath(root, REFERENCE_PATH);
  const descriptor = fs.openSync(reference, "w");
  try {
    fs.ftruncateSync(descriptor, (16 * 1024 * 1024) + 1);
  } finally {
    fs.closeSync(descriptor);
  }
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E003",
    message: /framework|hash|size|large|limit/i,
  });
});

for (const managedParent of [".ai-os/reference", ".ai-os/bin"]) {
  test(`managed parent symlink ${managedParent} cannot escape with matching bytes`, () => {
    const root = installedFixture();
    const outside = temporaryRoot();
    const source = fixturePath(root, managedParent);
    const external = fixturePath(outside, path.posix.basename(managedParent));
    fs.cpSync(source, external, { recursive: true });
    fs.rmSync(source, { recursive: true });
    fs.symlinkSync(external, source, "dir");
    assertGlobalLayoutFailure(jsonDoctor(root), {
      code: "E004",
      message: new RegExp(managedParent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "|symbolic link|symlink", "i"),
    });
  });
}

test("managed parent junction cannot escape with matching bytes", {
  skip: process.platform !== "win32" ? "Windows junction coverage" : false,
}, () => {
  const root = installedFixture();
  const outside = temporaryRoot();
  const source = fixturePath(root, ".ai-os/reference");
  const external = fixturePath(outside, "reference");
  fs.cpSync(source, external, { recursive: true });
  fs.rmSync(source, { recursive: true });
  fs.symlinkSync(external, source, "junction");
  assertGlobalLayoutFailure(jsonDoctor(root), {
    code: "E004",
    message: /[.]ai-os\/reference|junction|symbolic link|symlink/i,
  });
});

test("framework hashes validate installed bytes rather than current source bytes", () => {
  const root = installedFixture();
  fs.writeFileSync(fixturePath(root, REFERENCE_PATH), "older committed framework bytes\n");
  updateManifestHash(root, REFERENCE_PATH);
  assertHealthyLayout(jsonDoctor(root));
});

test("baseline pointer transitions do not invalidate the installer manifest", () => {
  const root = installedFixture();
  const baselineId = "BL-20260711-020304-confirmed";
  const baseline = fixturePath(root, `.ai-os/lanes/default/baseline-log/${baselineId}.md`);
  fs.writeFileSync(baseline, `# ${baselineId}\n\nType: confirmed\nStatus: confirmed\n`);
  const laneToml = fixturePath(root, ".ai-os/lanes/default/lane.toml");
  fs.writeFileSync(
    laneToml,
    fs.readFileSync(laneToml, "utf8")
      .replace(/baseline_id = "[^"]+"/, `baseline_id = "${baselineId}"`),
  );
  assertHealthyLayout(jsonDoctor(root));
  fs.writeFileSync(
    fixturePath(root, ".ai-os/lanes/default/baseline-log/CR-20260711-020305-follow-up.md"),
    "# CR-20260711-020305-follow-up\n\nType: change-request\nStatus: proposed\n",
  );
  const document = manifestDocument(root);
  const baselineRow = document.rows.findIndex((row) => (
    row.startsWith(".ai-os/lanes/default/baseline-log/BL-")
  ));
  assert.notEqual(baselineRow, -1);
  document.rows[baselineRow] = `.ai-os/lanes/default/baseline-log/${baselineId}.md\tfile\tproject\t`;
  document.rows.sort();
  writeManifestDocument(root, document);
  assertHealthyLayout(jsonDoctor(root));
});

for (const [anchorIndex, anchor] of REQUIRED_CONSTITUTION_ANCHORS.entries()) {
  test(`constitution requires the live anchor ${anchor}`, () => {
    const root = installedFixture();
    const agents = fixturePath(root, "AGENTS.md");
    const content = fs.readFileSync(agents, "utf8");
    assert.equal(content.split("\n").filter((line) => line === anchor).length, 1);
    const fence = anchorIndex === 0
      ? ["   ````markdown", "   ````"]
      : ["  ~~~~markdown", "  ~~~~"];
    fs.writeFileSync(
      agents,
      [
        content.replace(anchor, "## 项目自定义规则"),
        fence[0],
        anchor,
        fence[1],
        `正文提及 ${anchor}，不构成 live heading。`,
        `> ${anchor}`,
        `- ${anchor}`,
        "<!--",
        anchor,
        "-->",
        "",
      ].join("\n"),
    );
    const issue = assertGlobalWarning(jsonDoctor(root), {
      code: "W011",
      message: new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    });
    assert.match(issue.message, /missing|required|exactly once/i);
  });

  test(`constitution warns on duplicate live anchor ${anchor}`, () => {
    const root = installedFixture();
    const agents = fixturePath(root, "AGENTS.md");
    fs.appendFileSync(agents, `\n${anchor}\n`);
    const issue = assertGlobalWarning(jsonDoctor(root), {
      code: "W011",
      message: new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    });
    assert.match(issue.message, /duplicate|exactly once/i);
  });
}

test("constitution permits project-specific extra sections", () => {
  const root = installedFixture();
  fs.appendFileSync(fixturePath(root, "AGENTS.md"), "\n## 项目特定规则\n\n- 保留业务约束。\n");
  const probe = jsonDoctor(root);
  assertHealthyLayout(probe);
  assert.equal(probe.report.issues.some((issue) => issue.code === "W011"), false);
});

for (const [name, lines] of [
  ["four-backtick opener with short closer", ["````", "```", REQUIRED_CONSTITUTION_ANCHORS[0], "````"]],
  ["crossed backtick and tilde fence", ["```", "~~~", REQUIRED_CONSTITUTION_ANCHORS[0], "````"]],
  ["unclosed fence", ["~~~", REQUIRED_CONSTITUTION_ANCHORS[0]]],
  ["closer with a non-empty suffix", ["```", "``` suffix", REQUIRED_CONSTITUTION_ANCHORS[0], "````"]],
]) {
  test(`constitution ignores anchor after ${name}`, () => {
    const root = installedFixture();
    const agents = fixturePath(root, "AGENTS.md");
    const content = fs.readFileSync(agents, "utf8")
      .replace(REQUIRED_CONSTITUTION_ANCHORS[0], "## 项目自定义规则");
    fs.writeFileSync(agents, `${content}\n${lines.join("\n")}\n`);
    assertGlobalWarning(jsonDoctor(root), {
      code: "W011",
      message: /五条核心要求/,
    });
  });
}

for (const indent of [0, 1, 2, 3, 4]) {
  test(`constitution ATX anchor with ${indent} leading spaces follows Markdown bounds`, () => {
    const root = installedFixture();
    const agents = fixturePath(root, "AGENTS.md");
    const anchor = REQUIRED_CONSTITUTION_ANCHORS[0];
    const content = fs.readFileSync(agents, "utf8").replace(anchor, "## 项目自定义规则");
    fs.writeFileSync(agents, `${content}\n${" ".repeat(indent)}${anchor}\n`);
    const probe = jsonDoctor(root);
    if (indent <= 3) {
      assertNoConstitutionWarning(probe, anchor);
    } else {
      assertGlobalWarning(probe, { code: "W011", message: /五条核心要求/ });
    }
  });
}

test("four-space indented fence markers do not hide a following live anchor", () => {
  const root = installedFixture();
  const agents = fixturePath(root, "AGENTS.md");
  const anchor = REQUIRED_CONSTITUTION_ANCHORS[0];
  const content = fs.readFileSync(agents, "utf8").replace(anchor, "## 项目自定义规则");
  fs.writeFileSync(agents, `${content}\n    \`\`\`\n${anchor}\n    \`\`\`\n`);
  assertNoConstitutionWarning(jsonDoctor(root), anchor);
});

test("HTML comment syntax inside a fence cannot hide a later live anchor", () => {
  const root = installedFixture();
  const agents = fixturePath(root, "AGENTS.md");
  const anchor = REQUIRED_CONSTITUTION_ANCHORS[0];
  const content = fs.readFileSync(agents, "utf8").replace(anchor, "## 项目自定义规则");
  fs.writeFileSync(agents, `${content}\n\`\`\`\n<!--\n\`\`\`\n${anchor}\n`);
  assertNoConstitutionWarning(jsonDoctor(root), anchor);
});

test("an HTML-comment suffix cannot turn an invalid fence closer into a closer", () => {
  const root = installedFixture();
  const agents = fixturePath(root, "AGENTS.md");
  const anchor = REQUIRED_CONSTITUTION_ANCHORS[0];
  const content = fs.readFileSync(agents, "utf8").replace(anchor, "## 项目自定义规则");
  fs.writeFileSync(
    agents,
    `${content}\n\`\`\`\n\`\`\` <!-- decoy -->\n${anchor}\n\`\`\`\n`,
  );
  assertGlobalWarning(jsonDoctor(root), { code: "W011", message: /五条核心要求/ });
});

test("constitution line counting treats trailing LF as a terminator", () => {
  const root = installedFixture();
  fs.writeFileSync(fixturePath(root, "AGENTS.md"), constitutionWithLogicalLines(150));
  const probe = jsonDoctor(root);
  assertHealthyLayout(probe);
  assert.equal(probe.report.issues.some((issue) => issue.code === "W010"), false);
});

test("constitution warns at 151 logical lines", () => {
  const root = installedFixture();
  fs.writeFileSync(fixturePath(root, "AGENTS.md"), constitutionWithLogicalLines(151));
  const issue = assertGlobalWarning(jsonDoctor(root), {
    code: "W010",
    message: /151|line/i,
  });
  assert.match(issue.message, /151/);
});

for (const [name, content, warning] of [
  ["CRLF with terminal newline", constitutionWithLogicalLines(150).replaceAll("\n", "\r\n"), false],
  ["LF without terminal newline", constitutionWithLogicalLines(150).slice(0, -1), false],
  ["151 CRLF lines", constitutionWithLogicalLines(151).replaceAll("\n", "\r\n"), true],
]) {
  test(`constitution logical line count handles ${name}`, () => {
    const root = installedFixture();
    fs.writeFileSync(fixturePath(root, "AGENTS.md"), content);
    const probe = jsonDoctor(root);
    if (warning) {
      assertGlobalWarning(probe, { code: "W010", message: /151|line/i });
    } else {
      assertHealthyLayout(probe);
      assert.equal(probe.report.issues.some((issue) => issue.code === "W010"), false);
    }
  });
}

test("issues use deterministic code-point order", () => {
  const root = installedFixture();
  const laneIds = ["\u{10000}", "\ue000"];
  for (const laneId of laneIds) addLane(root, laneId, { missing: ["DESIGN.md"] });
  const probe = jsonDoctor(root);
  assert.equal(probe.result.status, 1);
  for (const issue of probe.report.issues) assertIssueShape(issue);
  assert.deepEqual(probe.report.issues, [...probe.report.issues].sort(compareIssues));
  assert.deepEqual(
    probe.report.issues
      .filter((issue) => issue.code === "E020" && laneIds.includes(issue.lane_id))
      .map((issue) => issue.lane_id),
    ["\ue000", "\u{10000}"],
  );
});

test("source and vendored doctors match when metadata is absent", () => {
  const root = installedFixture();
  fs.rmSync(fixturePath(root, METADATA_PATH));
  const source = jsonDoctor(root);
  const routed = jsonRoutedDoctor(root);
  const vendored = jsonDoctor(root, { local: true });
  assert.equal(source.result.status, 1);
  assert.equal(routed.result.status, 1);
  assert.equal(vendored.result.status, 1);
  assertProcessParity(routed.result, source.result);
  assertProcessParity(vendored.result, source.result);
  assert.deepEqual(routed.report, source.report);
  assert.deepEqual(vendored.report, source.report);
  assertGlobalLayoutFailure(source, { code: "E001", message: /framework[.]toml|metadata/i });
  assertUntrustedMetadata(source.report);
});

test("strict mode fails closed while provisional readiness is false", () => {
  const root = installedFixture();
  const normal = jsonDoctor(root);
  const strict = jsonDoctor(root, { strict: true });
  assertHealthyLayout(normal);
  assert.equal(strict.result.status, 1);
  assert.equal(strict.report.layout_ok, true);
  assert.equal(strict.report.delivery_ready, false);
  assert.equal(strict.report.lanes.default.delivery_ready, false);
  assert.equal(Object.hasOwn(strict.report, "readiness_evaluated"), false);
  const { ok: normalOk, ...normalComparable } = normal.report;
  const { ok: strictOk, ...strictComparable } = strict.report;
  assert.equal(normalOk, true);
  assert.equal(strictOk, false);
  assert.deepEqual(strictComparable, normalComparable);
});

test("every active lane is present and provisionally not delivery-ready", () => {
  const root = installedFixture();
  addLane(root, "release");
  const probe = jsonDoctor(root);
  assertHealthyLayout(probe);
  assert.deepEqual(Object.keys(probe.report.lanes).sort(), ["default", "release"]);
  for (const laneId of ["default", "release"]) {
    assert.equal(probe.report.lanes[laneId].layout_ok, true);
    assert.equal(probe.report.lanes[laneId].delivery_ready, false);
  }
});

test("lane and baseline directory enumeration is explicitly bounded", () => {
  const laneRoot = installedFixture();
  const lanes = fixturePath(laneRoot, ".ai-os/lanes");
  for (let index = 0; index < 256; index += 1) {
    fs.mkdirSync(path.join(lanes, `bulk-${String(index).padStart(3, "0")}`));
  }
  const laneReport = doctor.inspectProject(laneRoot);
  assert.ok(matchingIssue(laneReport, {
    code: "E003",
    message: /lane.*limit|too many lanes|lane.*bound/i,
  }));

  const baselineRoot = installedFixture();
  const baselineLog = fixturePath(baselineRoot, ".ai-os/lanes/default/baseline-log");
  for (let index = 0; index < 4096; index += 1) {
    fs.writeFileSync(
      path.join(baselineLog, `BL-20260711-020304-bulk-${String(index).padStart(4, "0")}.md`),
      "",
    );
  }
  const baselineReport = doctor.inspectProject(baselineRoot);
  assert.ok(matchingIssue(baselineReport, {
    code: "E003",
    laneId: "default",
    issuePath: ".ai-os/lanes/default/baseline-log",
    message: /baseline.*limit|too many.*baseline|baseline.*bound/i,
  }));
});

test("semantic_warnings reference the canonical issue objects", () => {
  const root = installedFixture();
  const tasks = fixturePath(root, ".ai-os/lanes/default/tasks.yaml");
  fs.writeFileSync(tasks, fs.readFileSync(tasks, "utf8").replace("owner: AI", 'owner: ""'));
  assert.equal(typeof doctor.inspectProject, "function");
  const report = doctor.inspectProject(root);
  const semantic = report.semantic_warnings.find((issue) => issue.code === "W071");
  assert.ok(semantic, "W071 is preserved in semantic_warnings");
  assert.ok(report.issues.includes(semantic), "semantic warning is the canonical issue object");
  assertIssueShape(semantic);
});

test("reserved task field names cannot crash or pollute owner scanning", () => {
  const root = installedFixture();
  fs.writeFileSync(
    fixturePath(root, ".ai-os/lanes/default/tasks.yaml"),
    [
      "tasks:",
      "  - id: TASK-RESERVED-001",
      '    title: "reserved fields"',
      '    __proto__: "polluted"',
      '    constructor: "polluted"',
      '    prototype: "polluted"',
      "",
    ].join("\n"),
  );
  const probe = jsonDoctor(root);
  assertHealthyLayout(probe);
  assert.ok(matchingIssue(probe.report, {
    code: "W071",
    laneId: "default",
    issuePath: ".ai-os/lanes/default/tasks.yaml",
    message: /TASK-RESERVED-001/,
  }));
  assert.equal({}.polluted, undefined);
});

for (const [name, invalidBaselineId] of [
  ["NUL", "BAD\u0000ID"],
  ["escape", "BAD\u001bID"],
  ["dot traversal", ".."],
  ["ADS", "C:ads"],
  ["slash", "bad/slash"],
  ["backslash", "bad\\slash"],
  ["overlong", `BL-20260711-010203-${"a".repeat(300)}`],
]) {
  test(`non-canonical MISSION baseline ID (${name}) is a safe W070`, () => {
    const root = installedFixture();
    const mission = fixturePath(root, ".ai-os/lanes/default/MISSION.md");
    fs.writeFileSync(
      mission,
      fs.readFileSync(mission, "utf8").replace(
        /BL-\d{8}-\d{6}-(?:initial-baseline|bootstrap-unconfirmed)/,
        invalidBaselineId,
      ),
    );
    const result = runDoctor([root, "--json"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, UNSAFE_RAW_OUTPUT);
    const report = JSON.parse(result.stdout);
    const warning = matchingIssue(report, {
      code: "W070",
      laneId: "default",
      issuePath: ".ai-os/lanes/default/MISSION.md",
      message: /non-canonical|canonical/i,
    });
    assert.ok(warning, JSON.stringify(report, null, 2));
    assert.equal(warning.message.includes(invalidBaselineId), false);
  });
}

test("raw JSON safely escapes metadata, lane, baseline, and task controls", () => {
  const root = installedFixture();
  writeMetadata(
    root,
    metadataWithField(metadataContent(root), "layout_mode", "other-\u202e-layout"),
  );
  const unsafeLane = "release-\u200f";
  addLane(root, unsafeLane, { missing: ["DESIGN.md"] });
  fs.writeFileSync(
    fixturePath(root, ".ai-os/lanes/default/baseline-log/bad-\u001b.md"),
    "# unsafe filename\n",
  );
  const mission = fixturePath(root, ".ai-os/lanes/default/MISSION.md");
  fs.writeFileSync(
    mission,
    fs.readFileSync(mission, "utf8").replace(
      /BL-\d{8}-\d{6}-(?:initial-baseline|bootstrap-unconfirmed)/,
      "BL-20260711-010203-missing-\u202e",
    ),
  );
  const tasks = fixturePath(root, ".ai-os/lanes/default/tasks.yaml");
  fs.writeFileSync(tasks, `tasks:\n  - id: TASK-\u0085-1\n    title: "unsafe"\n`);

  const result = runDoctor([root, "--json"]);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout, UNSAFE_RAW_OUTPUT);
  assert.doesNotMatch(result.stderr, UNSAFE_RAW_OUTPUT);
  const report = JSON.parse(result.stdout);
  assert.equal(Object.hasOwn(report.lanes, unsafeLane), true);
  assert.equal(report.issues.some((issue) => issue.lane_id === unsafeLane), true);
});

test("vendored VERSION identity and main errors cannot inject terminal controls", () => {
  const root = installedFixture();
  fs.writeFileSync(fixturePath(root, VERSION_PATH), "11.0.0-\u202e\n");
  updateManifestHash(root, VERSION_PATH);
  const vendored = runLocalDoctor(root, [root, "--json"]);
  assert.equal(vendored.status, 1);
  assert.doesNotMatch(vendored.stdout, UNSAFE_RAW_OUTPUT);
  assert.equal(JSON.parse(vendored.stdout).version, "unknown");

  const originalAccess = fs.accessSync;
  const writes = { stdout: "", stderr: "" };
  try {
    fs.accessSync = () => {
      throw new Error("injected-\u001b-\u202e-error");
    };
    const status = doctor.main([temporaryRoot()], {
      stdout: { write(value) { writes.stdout += String(value); } },
      stderr: { write(value) { writes.stderr += String(value); } },
    });
    assert.equal(status, 1);
  } finally {
    fs.accessSync = originalAccess;
  }
  assert.equal(writes.stdout, "");
  assert.doesNotMatch(writes.stderr, UNSAFE_RAW_OUTPUT);
  assert.match(writes.stderr, /\\u001b.*\\u202e/);
});
