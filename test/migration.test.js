"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  InstallConflictError,
  InstallFilesystemError,
  buildInstallPlan,
  createDefaultFsOps,
  executeInstallPlan,
  installProject,
  normalizeV10Candidate,
  replaceManagedBlock,
} = require("../bin/installer");
const { snapshotTree } = require("./fixtures");
const { sha256 } = require("../bin/doctor-shared");
const { assert, cleanup, test, tmpDir } = require("./helpers");

const REPO_ROOT = path.resolve(__dirname, "..");
const BASELINE_ID = "BL-20260710-010203-initial-baseline";
const BASELINE_FILE = `${BASELINE_ID}.md`;
// v10 sampled the ID and record date independently. Keep different seconds.
const BASELINE_DATE = "2026-07-10T01:02:04.567Z";
const INSTALLED_AT = "2026-07-10T01:02:05.111Z";
const UPDATED_AT = "2026-07-11T02:03:04.222Z";
const LATE_TAGS = new Set(["v10.3.1", "v10.5.0", "v10.5.1"]);

const TEMPLATE_DESTINATIONS = Object.freeze({
  "AGENTS.md": "AGENTS.md",
  ".ai-os/MISSION.md": "framework/.agents/templates/shared-root/MISSION.md",
  ".ai-os/memory.md": "framework/.agents/templates/shared-root/memory.md",
  ".ai-os/lanes/default/lane.toml": "framework/.agents/templates/lane/lane.toml",
  ".ai-os/lanes/default/MISSION.md": "framework/.agents/templates/lane/MISSION.md",
  ".ai-os/lanes/default/DESIGN.md": "framework/.agents/templates/lane/DESIGN.md",
  ".ai-os/lanes/default/STATE.md": "framework/.agents/templates/lane/STATE.md",
  ".ai-os/lanes/default/tasks.yaml": "framework/.agents/templates/lane/tasks.yaml",
  ".ai-os/lanes/default/risk-register.md": "framework/.agents/templates/lane/risk-register.md",
  ".ai-os/lanes/default/release-plan.md": "framework/.agents/templates/lane/release-plan.md",
  ".ai-os/lanes/default/verification-matrix.yaml": "framework/.agents/templates/lane/verification-matrix.yaml",
  ".ai-os/lanes/default/specs/bugfix.spec.md": "framework/.agents/templates/lane/specs/bugfix.spec.md",
  ".ai-os/lanes/default/specs/example.spec.md": "framework/.agents/templates/lane/specs/example.spec.md",
  ".ai-os/lanes/default/design-pack/parity-map.md": "framework/.agents/templates/lane/design-pack/parity-map.md",
  ".ai-os/lanes/default/evals/eval-example.md": "framework/.agents/templates/lane/evals/eval-example.md",
  "CLAUDE.md": "framework/.agents/templates/ide-pointers/CLAUDE.md",
  "GEMINI.md": "framework/.agents/templates/ide-pointers/GEMINI.md",
});

function gitShow(tag, relativePath) {
  return execFileSync("git", ["show", `${tag}:${relativePath}`], {
    cwd: REPO_ROOT,
    encoding: null,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function targetPath(target, relativePath) {
  return path.join(target, ...relativePath.split("/"));
}

function operation(plan, relativePath) {
  return plan.operations.find((candidate) => candidate.relativePath === relativePath);
}

function writeTarget(target, relativePath, bytes, mode = 0o644) {
  const absolute = targetPath(target, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, bytes, { mode });
  fs.chmodSync(absolute, mode);
}

function renderV10(bytes) {
  return Buffer.from(bytes.toString("utf8")
    .split("{{INITIAL_BASELINE_ID}}").join(BASELINE_ID)
    .split("{{INITIAL_BASELINE_FILE}}").join(BASELINE_FILE)
    .split("{{INITIAL_BASELINE_DATE}}").join(BASELINE_DATE));
}

function v10Metadata(tag) {
  return Buffer.from([
    "# AI-OS framework metadata",
    'schema_version = "9"',
    'layout_version = "9"',
    'layout_mode = "shared-root-default-lane"',
    'default_lane = "default"',
    `framework_version = "${tag.slice(1)}"`,
    `installed_at = "${INSTALLED_AT}"`,
    `updated_at = "${UPDATED_AT}"`,
    "",
  ].join("\n"));
}

function v10ManagedFiles(tag) {
  const lane = ".ai-os/lanes/default";
  const lines = [
    "# path\ttype",
    "AGENTS.md\tfile",
    ".ai-os/MISSION.md\tfile",
    ".ai-os/memory.md\tfile",
  ];
  if (LATE_TAGS.has(tag)) {
    lines.push(
      ".ai-os/bin\tdir",
      ".ai-os/bin/ai-os-doctor.js\tfile",
      ".ai-os/bin/shared.js\tfile",
      ".ai-os/bin/VERSION\tfile",
    );
  }
  lines.push(
    ".ai-os/lanes\tdir",
    `${lane}\tdir`,
    `${lane}/lane.toml\tfile`,
    `${lane}/MISSION.md\tfile`,
    `${lane}/DESIGN.md\tfile`,
    `${lane}/STATE.md\tfile`,
    `${lane}/tasks.yaml\tfile`,
    `${lane}/risk-register.md\tfile`,
    `${lane}/release-plan.md\tfile`,
    `${lane}/verification-matrix.yaml\tfile`,
    `${lane}/baseline-log\tdir`,
    `${lane}/specs\tdir`,
    `${lane}/design-pack\tdir`,
    `${lane}/evals\tdir`,
  );
  return Buffer.from(`${lines.join("\n")}\n`);
}

function materializeV10(tag, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const [destination, source] of Object.entries(TEMPLATE_DESTINATIONS)) {
    writeTarget(target, destination, renderV10(gitShow(tag, source)));
  }
  writeTarget(
    target,
    `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
    renderV10(gitShow(tag, "framework/.agents/templates/lane/baseline-log/BL-template.md")),
  );
  writeTarget(target, ".ai-os/framework.toml", v10Metadata(tag));
  writeTarget(target, ".ai-os/managed-files.tsv", v10ManagedFiles(tag));
  writeTarget(target, ".gitignore", Buffer.from([
    "\uFEFFdist/",
    "# user before",
    "# AI-OS v9 managed (session-local and generated files)",
    ".ai-os/lanes/*/STATE.md",
    ".ai-os/framework.toml",
    ".ai-os/managed-files.tsv",
    "# user after",
    "",
  ].join("\r\n")));
  writeTarget(target, ".gitattributes", Buffer.from([
    "*.png binary",
    "# AI-OS v9 managed (append-only knowledge)",
    ".ai-os/memory.md merge=union",
    "docs/** linguist-documentation",
    "",
  ].join("\r\n")));
  if (LATE_TAGS.has(tag)) {
    writeTarget(target, ".ai-os/bin/ai-os-doctor.js", gitShow(tag, "bin/ai-os-doctor.js"));
    writeTarget(target, ".ai-os/bin/shared.js", gitShow(tag, "bin/shared.js"));
    writeTarget(target, ".ai-os/bin/VERSION", Buffer.from(`${tag.slice(1)}\n`));
  }
}

function parseManagedBlock(content) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const begin = lines.indexOf("# BEGIN AI-OS");
  if (begin < 0) return [];
  const end = lines.indexOf("# END AI-OS", begin + 1);
  assert.ok(end > begin);
  return lines.slice(begin + 1, end);
}

function protectedSnapshot(target) {
  const protectedPaths = [
    ".ai-os/MISSION.md",
    ".ai-os/memory.md",
    ".ai-os/lanes/default/MISSION.md",
    ".ai-os/lanes/default/DESIGN.md",
    ".ai-os/lanes/default/STATE.md",
    `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
    ".ai-os/lanes/default/baseline-log/BL-20260709-235959-previous.md",
    ".ai-os/lanes/default/baseline-log/CR-20260710-000000-scope.md",
    ".ai-os/lanes/default/risk-register.md",
    ".ai-os/lanes/default/release-plan.md",
    ".ai-os/lanes/default/verification-matrix.yaml",
    ".ai-os/lanes/default/specs/nested/custom.md",
    ".ai-os/lanes/default/design-pack/nested/custom.md",
    ".ai-os/lanes/default/evals/nested/custom.yaml",
    ".ai-os/lanes/other/custom.txt",
    ".ai-os/lanes/default/unknown/custom.txt",
  ];
  const tree = snapshotTree(target);
  return new Map(protectedPaths.map((relativePath) => [relativePath, tree.get(relativePath)]));
}

function customizePreservedData(target) {
  for (const [relativePath, text, mode] of [
    [".ai-os/MISSION.md", "\nUSER SHARED MISSION\n", 0o600],
    [".ai-os/memory.md", "\nUSER MEMORY\n", 0o640],
    [".ai-os/lanes/default/MISSION.md", "\nUSER LANE MISSION\n", 0o600],
    [".ai-os/lanes/default/DESIGN.md", "\nUSER DESIGN\n", 0o640],
    [".ai-os/lanes/default/STATE.md", "\nUSER STATE\n", 0o600],
  ]) {
    fs.appendFileSync(targetPath(target, relativePath), text);
    fs.chmodSync(targetPath(target, relativePath), mode);
  }
  for (const [relativePath, text, mode] of [
    [".ai-os/lanes/default/risk-register.md", "USER RISK\n", 0o600],
    [".ai-os/lanes/default/release-plan.md", "USER RELEASE\n", 0o640],
    [".ai-os/lanes/default/verification-matrix.yaml", "user: verification\n", 0o600],
    [".ai-os/lanes/default/specs/nested/custom.md", "USER SPEC\n", 0o640],
    [".ai-os/lanes/default/design-pack/nested/custom.md", "USER DESIGN PACK\n", 0o600],
    [".ai-os/lanes/default/evals/nested/custom.yaml", "user: eval\n", 0o640],
    [".ai-os/lanes/other/custom.txt", "OTHER LANE\n", 0o600],
    [".ai-os/lanes/default/unknown/custom.txt", "UNKNOWN\n", 0o640],
    [".ai-os/lanes/default/baseline-log/BL-20260709-235959-previous.md", "# BL-20260709-235959-previous\n", 0o600],
    [".ai-os/lanes/default/baseline-log/CR-20260710-000000-scope.md", "# CR-20260710-000000-scope\n", 0o640],
  ]) writeTarget(target, relativePath, text, mode);
  fs.chmodSync(targetPath(target, "AGENTS.md"), 0o600);
  fs.chmodSync(targetPath(target, ".ai-os/lanes/default/lane.toml"), 0o640);
  fs.chmodSync(targetPath(target, ".ai-os/lanes/default/tasks.yaml"), 0o600);
  fs.chmodSync(targetPath(target, ".gitignore"), 0o640);
  fs.chmodSync(targetPath(target, ".gitattributes"), 0o600);
}

function captureConflict(callback) {
  try {
    callback();
  } catch (error) {
    assert.ok(error instanceof InstallConflictError);
    return error;
  }
  assert.fail("expected migration conflict");
}

test("replaceManagedBlock preserves BOM, line endings, and all bytes outside one block", () => {
  const original = "\uFEFFbefore\r\n# BEGIN AI-OS\r\n.ai-os/lanes/*/STATE.md\r\n# END AI-OS\r\nafter";
  assert.equal(
    replaceManagedBlock(
      original,
      "# BEGIN AI-OS",
      "# END AI-OS",
      [".ai-os/lanes/*/STATE.md"],
    ),
    original,
  );
  assert.equal(
    replaceManagedBlock("user\n", "# BEGIN AI-OS", "# END AI-OS", []),
    "user\n# BEGIN AI-OS\n# END AI-OS\n",
  );
  for (const invalid of [
    "# BEGIN AI-OS\n",
    "# END AI-OS\n",
    "prefix # BEGIN AI-OS\n",
    "# BEGIN AI-OS\ncustom\n# END AI-OS\n",
    "# BEGIN AI-OS\n# BEGIN AI-OS\n# END AI-OS\n# END AI-OS\n",
  ]) {
    assert.throws(() => replaceManagedBlock(
      invalid,
      "# BEGIN AI-OS",
      "# END AI-OS",
      [".ai-os/lanes/*/STATE.md"],
    ));
  }
});

test("normalizeV10Candidate normalizes only strict generated fields without mutation", () => {
  const context = {
    baselineId: BASELINE_ID,
    baselineFile: BASELINE_FILE,
    baselineDate: BASELINE_DATE,
    installedAt: INSTALLED_AT,
    updatedAt: UPDATED_AT,
    frameworkVersion: "10.5.1",
  };
  const candidate = Buffer.from(`baseline_id = "${BASELINE_ID}"\n`);
  const before = Buffer.from(candidate);
  assert.equal(
    normalizeV10Candidate(".ai-os/lanes/default/lane.toml", candidate, context).toString(),
    'baseline_id = "{{INITIAL_BASELINE_ID}}"\n',
  );
  assert.deepEqual(candidate, before);
  assert.deepEqual(
    normalizeV10Candidate("unknown.txt", candidate, context),
    candidate,
  );
  assert.equal(
    normalizeV10Candidate(
      ".ai-os/lanes/default/lane.toml",
      Buffer.from(`# ${BASELINE_ID}\n`),
      context,
    ).toString(),
    `# ${BASELINE_ID}\n`,
  );
});

test("normalizeV10Candidate round-trips every generated v10 surface and rejects loose fields", () => {
  const context = {
    baselineId: BASELINE_ID,
    baselineFile: BASELINE_FILE,
    baselineDate: BASELINE_DATE,
    installedAt: INSTALLED_AT,
    updatedAt: UPDATED_AT,
    frameworkVersion: "10.5.1",
  };
  for (const [relativePath, sourcePath] of [
    [".ai-os/lanes/default/lane.toml", "framework/.agents/templates/lane/lane.toml"],
    [".ai-os/lanes/default/MISSION.md", "framework/.agents/templates/lane/MISSION.md"],
    [".ai-os/lanes/default/tasks.yaml", "framework/.agents/templates/lane/tasks.yaml"],
    [
      `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
      "framework/.agents/templates/lane/baseline-log/BL-template.md",
    ],
  ]) {
    const source = gitShow("v10.5.1", sourcePath);
    const rendered = renderV10(source);
    const before = Buffer.from(rendered);
    assert.deepEqual(normalizeV10Candidate(relativePath, rendered, context), source);
    assert.deepEqual(rendered, before);
    const edited = Buffer.concat([rendered, Buffer.from(`\n# ${BASELINE_ID}\n`)]);
    assert.notDeepEqual(normalizeV10Candidate(relativePath, edited, context), source);
  }
  assert.deepEqual(
    normalizeV10Candidate(".ai-os/framework.toml", v10Metadata("v10.5.1"), context),
    Buffer.from([
      "# AI-OS framework metadata",
      'schema_version = "9"',
      'layout_version = "9"',
      'layout_mode = "shared-root-default-lane"',
      'default_lane = "default"',
      'framework_version = "10.5.1"',
      'installed_at = "{{V10_INSTALLED_AT}}"',
      'updated_at = "{{V10_UPDATED_AT}}"',
      "",
    ].join("\n")),
  );
  const staticBytes = Buffer.from(
    `static {{INITIAL_BASELINE_ID}} ${BASELINE_ID} {{INITIAL_BASELINE_DATE}}\n`,
  );
  assert.deepEqual(
    normalizeV10Candidate(".ai-os/bin/shared.js", staticBytes, context),
    staticBytes,
  );
  const duplicateLane = Buffer.from([
    `baseline_id = "${BASELINE_ID}"`,
    `baseline_id = "${BASELINE_ID}"`,
    "",
  ].join("\n"));
  assert.deepEqual(
    normalizeV10Candidate(".ai-os/lanes/default/lane.toml", duplicateLane, context),
    duplicateLane,
  );
  for (const invalid of [
    null,
    { ...context, baselineFile: "other.md" },
    { ...context, baselineId: "CR-20260710-010203-change" },
    { ...context, baselineId: "BL-20260710-010203-retrospective", baselineFile: "BL-20260710-010203-retrospective.md" },
    { ...context, baselineDate: "not-a-date" },
    { ...context, installedAt: "2026-07-10" },
    { ...context, frameworkVersion: "10.2.0" },
  ]) {
    assert.throws(() => normalizeV10Candidate(
      ".ai-os/lanes/default/lane.toml",
      Buffer.from(`baseline_id = "${BASELINE_ID}"\n`),
      invalid,
    ));
  }
});

for (const [tag, force] of [
  ["v10.0.0", false],
  ["v10.1.0", true],
  ["v10.1.1", false],
  ["v10.1.2", true],
  ["v10.3.1", false],
  ["v10.5.0", true],
  ["v10.5.1", false],
]) {
  test(`${tag} real-template migration is lossless${force ? " with force" : ""} and idempotent`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      materializeV10(tag, target);
      customizePreservedData(target);
      const beforeProtected = protectedSnapshot(target);
      const originalLane = fs.readFileSync(targetPath(target, ".ai-os/lanes/default/lane.toml"), "utf8");
      const baselineNames = fs.readdirSync(targetPath(target, ".ai-os/lanes/default/baseline-log")).sort();

      const result = installProject(target, {
        force,
        clock() {
          throw new Error("v10 migration must reuse the current baseline");
        },
      });

      assert.equal(result.baselineId, BASELINE_ID);
      assert.equal(result.layoutVersion, "11");
      assert.deepEqual(protectedSnapshot(target), beforeProtected);
      assert.deepEqual(
        fs.readdirSync(targetPath(target, ".ai-os/lanes/default/baseline-log")).sort(),
        baselineNames,
      );
      assert.deepEqual(
        fs.readFileSync(targetPath(target, "AGENTS.md")),
        fs.readFileSync(path.join(REPO_ROOT, "framework/.agents/templates/root/AGENTS.md")),
      );
      assert.equal(fs.statSync(targetPath(target, "AGENTS.md")).mode & 0o777, 0o600);
      const migratedLane = fs.readFileSync(targetPath(target, ".ai-os/lanes/default/lane.toml"), "utf8");
      assert.equal(
        migratedLane,
        `${originalLane}governance_tier = "unassessed"\n`,
      );
      assert.match(migratedLane, /quality_tier = "standard"/);
      assert.match(migratedLane, /risk_tier = "medium"/);
      assert.equal(fs.statSync(targetPath(target, ".ai-os/lanes/default/lane.toml")).mode & 0o777, 0o640);
      assert.match(fs.readFileSync(targetPath(target, ".ai-os/lanes/default/tasks.yaml"), "utf8"), /version: 5/);
      assert.equal(fs.statSync(targetPath(target, ".ai-os/lanes/default/tasks.yaml")).mode & 0o777, 0o600);
      assert.equal(fs.readFileSync(targetPath(target, ".ai-os/framework.toml"), "utf8"), [
        "# AI-OS framework metadata",
        'schema_version = "11"',
        'layout_version = "11"',
        'layout_mode = "shared-root-default-lane"',
        'default_lane = "default"',
        'framework_version = "11.0.0"',
        "",
      ].join("\n"));
      for (const [relativePath, sourcePath] of [
        [".ai-os/reference/artifacts.md", "docs/artifacts.md"],
        [".ai-os/bin/ai-os-doctor.js", "bin/ai-os-doctor.js"],
        [".ai-os/bin/doctor-shared.js", "bin/doctor-shared.js"],
        [".ai-os/bin/VERSION", "VERSION"],
      ]) {
        assert.deepEqual(
          fs.readFileSync(targetPath(target, relativePath)),
          fs.readFileSync(path.join(REPO_ROOT, sourcePath)),
          relativePath,
        );
      }
      const canonicalPlan = buildInstallPlan(path.join(root, "canonical-v11"), {
        bootstrap: {
          id: BASELINE_ID,
          file: BASELINE_FILE,
          date: "2026-07-10T01:02:03.000Z",
        },
      });
      assert.deepEqual(
        fs.readFileSync(targetPath(target, ".ai-os/managed-files.tsv")),
        operation(canonicalPlan, ".ai-os/managed-files.tsv").content,
      );
      assert.equal(fs.existsSync(targetPath(target, ".ai-os/bin/shared.js")), false);
      const gitignore = fs.readFileSync(targetPath(target, ".gitignore"), "utf8");
      const gitattributes = fs.readFileSync(targetPath(target, ".gitattributes"), "utf8");
      assert.equal(gitignore, [
        "\uFEFFdist/",
        "# user before",
        "# BEGIN AI-OS",
        ".ai-os/lanes/*/STATE.md",
        "# END AI-OS",
        "# user after",
        "",
      ].join("\r\n"));
      assert.equal(gitattributes, [
        "*.png binary",
        "# BEGIN AI-OS",
        "# END AI-OS",
        "docs/** linguist-documentation",
        "",
      ].join("\r\n"));
      assert.deepEqual(parseManagedBlock(gitignore), [
        ".ai-os/lanes/*/STATE.md",
      ]);
      assert.deepEqual(parseManagedBlock(gitattributes), []);
      if (process.platform !== "win32") {
        assert.equal(fs.statSync(targetPath(target, ".gitignore")).mode & 0o777, 0o640);
        assert.equal(fs.statSync(targetPath(target, ".gitattributes")).mode & 0o777, 0o600);
      }

      const migrated = snapshotTree(target);
      const again = installProject(target, { force: !force });
      assert.equal(again.baselineId, BASELINE_ID);
      assert.deepEqual(snapshotTree(target), migrated);
    } finally {
      cleanup(root);
    }
  });
}

test("custom tasks, lane truth, and IDE pointers are preserved with force", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    for (const [relativePath, sentinel, mode] of [
      [".ai-os/lanes/default/tasks.yaml", "\n# USER TASKS\n", 0o600],
      [".ai-os/lanes/default/lane.toml", "# USER LANE TRUTH\n", 0o640],
      ["CLAUDE.md", "CUSTOM CLAUDE\n", 0o600],
      ["GEMINI.md", "CUSTOM GEMINI\n", 0o640],
    ]) {
      if (relativePath.endsWith(".md") && !relativePath.includes("lane.toml")) {
        fs.writeFileSync(targetPath(target, relativePath), sentinel);
      } else {
        fs.appendFileSync(targetPath(target, relativePath), sentinel);
      }
      fs.chmodSync(targetPath(target, relativePath), mode);
    }
    const before = new Map([
      ".ai-os/lanes/default/tasks.yaml",
      ".ai-os/lanes/default/lane.toml",
      "CLAUDE.md",
      "GEMINI.md",
    ].map((relativePath) => [relativePath, snapshotTree(target).get(relativePath)]));

    installProject(target, { force: true });

    const after = snapshotTree(target);
    for (const [relativePath, entry] of before) assert.deepEqual(after.get(relativePath), entry);
  } finally {
    cleanup(root);
  }
});

test("cross-tag project templates and leftover late bin form a recognized union fixture", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.0.0", target);
    writeTarget(target, "AGENTS.md", gitShow("v10.5.1", "AGENTS.md"));
    writeTarget(
      target,
      ".ai-os/lanes/default/tasks.yaml",
      renderV10(gitShow("v10.3.1", "framework/.agents/templates/lane/tasks.yaml")),
    );
    writeTarget(target, ".ai-os/bin/ai-os-doctor.js", gitShow("v10.5.1", "bin/ai-os-doctor.js"));
    writeTarget(target, ".ai-os/bin/shared.js", gitShow("v10.5.1", "bin/shared.js"));
    writeTarget(target, ".ai-os/bin/VERSION", "10.5.1\n");

    const result = installProject(target);

    assert.equal(result.baselineId, BASELINE_ID);
    assert.equal(fs.existsSync(targetPath(target, ".ai-os/bin/shared.js")), false);
    assert.match(fs.readFileSync(targetPath(target, ".ai-os/lanes/default/tasks.yaml"), "utf8"), /version: 5/);
  } finally {
    cleanup(root);
  }
});

test("normal and force v10 migrations produce the same bounded result", () => {
  const root = fs.realpathSync.native(tmpDir());
  const normalTarget = path.join(root, "normal");
  const forceTarget = path.join(root, "force");
  try {
    materializeV10("v10.5.1", normalTarget);
    materializeV10("v10.5.1", forceTarget);
    customizePreservedData(normalTarget);
    customizePreservedData(forceTarget);

    const normal = installProject(normalTarget);
    const force = installProject(forceTarget, { force: true });

    assert.deepEqual(normal, force);
    const normalTree = new Map([...snapshotTree(normalTarget)].filter(([item]) => item !== "."));
    const forceTree = new Map([...snapshotTree(forceTarget)].filter(([item]) => item !== "."));
    assert.deepEqual(forceTree, normalTree);
  } finally {
    cleanup(root);
  }
});

test("a progressed v10 current baseline is reused while all BL and CR history stays unchanged", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  const currentId = "BL-20260712-030405-confirmed-delivery";
  const currentFile = `${currentId}.md`;
  const currentDate = "2026-07-12T03:04:09.987Z";
  try {
    materializeV10("v10.5.1", target);
    for (const relativePath of [
      ".ai-os/lanes/default/lane.toml",
      ".ai-os/lanes/default/MISSION.md",
      ".ai-os/lanes/default/tasks.yaml",
    ]) {
      const absolute = targetPath(target, relativePath);
      fs.writeFileSync(absolute, fs.readFileSync(absolute, "utf8").replaceAll(BASELINE_ID, currentId));
    }
    let currentRecord = gitShow(
      "v10.5.1",
      "framework/.agents/templates/lane/baseline-log/BL-template.md",
    ).toString("utf8")
      .replaceAll("{{INITIAL_BASELINE_ID}}", currentId)
      .replaceAll("{{INITIAL_BASELINE_DATE}}", currentDate);
    currentRecord = currentRecord.replace(
      "\n## 后续 CR delta lifecycle 模板",
      "\n- **User Field**: preserved\n\n## 后续 CR delta lifecycle 模板",
    ) + `\n# ${currentId}\n- **Confirmed At**: 2030-01-01T00:00:00.000Z\n`;
    writeTarget(target, `.ai-os/lanes/default/baseline-log/${currentFile}`, currentRecord, 0o600);
    writeTarget(
      target,
      ".ai-os/lanes/default/baseline-log/CR-20260711-010203-scope.md",
      "# CR-20260711-010203-scope\n\nUSER CR\n",
      0o640,
    );
    const beforeHistory = new Map([...snapshotTree(target)].filter(([relativePath]) => (
      relativePath.startsWith(".ai-os/lanes/default/baseline-log/")
    )));

    const result = installProject(target);

    assert.equal(result.baselineId, currentId);
    const afterHistory = new Map([...snapshotTree(target)].filter(([relativePath]) => (
      relativePath.startsWith(".ai-os/lanes/default/baseline-log/")
    )));
    assert.deepEqual(afterHistory, beforeHistory);
  } finally {
    cleanup(root);
  }
});

test("migration project replacements retain actual hashes and planned modes", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    for (const [relativePath, mode] of [
      ["AGENTS.md", 0o600],
      [".ai-os/lanes/default/tasks.yaml", 0o640],
      [".ai-os/lanes/default/lane.toml", 0o600],
      [".gitignore", 0o640],
      [".gitattributes", 0o600],
    ]) fs.chmodSync(targetPath(target, relativePath), mode);

    const plan = buildInstallPlan(target);

    for (const relativePath of [
      "AGENTS.md",
      ".ai-os/lanes/default/tasks.yaml",
      ".ai-os/lanes/default/lane.toml",
      ".gitignore",
      ".gitattributes",
    ]) {
      const planned = operation(plan, relativePath);
      const actual = fs.readFileSync(targetPath(target, relativePath));
      assert.equal(planned.action, "replace-pristine-project", relativePath);
      assert.equal(planned.previousHash, sha256(actual), relativePath);
      if (process.platform !== "win32") {
        assert.equal(
          planned.mode,
          fs.statSync(targetPath(target, relativePath)).mode & 0o777,
          relativePath,
        );
      }
    }
    assert.equal(
      operation(plan, `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`).previousHash,
      sha256(fs.readFileSync(targetPath(
        target,
        `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
      ))),
    );
  } finally {
    cleanup(root);
  }
});

test("a chmod-only race on a migration project replacement rolls back every write", {
  skip: process.platform === "win32",
}, () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    const plan = buildInstallPlan(target);
    fs.chmodSync(targetPath(target, "AGENTS.md"), 0o600);
    const before = snapshotTree(target);

    assert.throws(
      () => executeInstallPlan(plan),
      (error) => (
        error instanceof InstallFilesystemError
        && error.relativePath === "AGENTS.md"
        && /mode changed after planning/i.test(error.message)
      ),
    );

    assert.deepEqual(snapshotTree(target), before);
  } finally {
    cleanup(root);
  }
});

test("an actual-byte race on normalized tasks is rejected and fully rolled back", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    const plan = buildInstallPlan(target);
    fs.appendFileSync(targetPath(target, ".ai-os/lanes/default/tasks.yaml"), "# EXTERNAL RACE\n");
    const before = snapshotTree(target);

    assert.throws(
      () => executeInstallPlan(plan),
      (error) => (
        error instanceof InstallFilesystemError
        && error.relativePath === ".ai-os/lanes/default/tasks.yaml"
        && /bytes changed after planning/i.test(error.message)
      ),
    );

    assert.deepEqual(snapshotTree(target), before);
  } finally {
    cleanup(root);
  }
});

test("automatic obsolete shared removal rolls back a post-unlink failure byte-for-byte", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    const plan = buildInstallPlan(target);
    const before = snapshotTree(target);
    const base = createDefaultFsOps();
    const shared = targetPath(target, ".ai-os/bin/shared.js");
    let injected = false;
    const fsOps = {
      ...base,
      unlink(absolutePath) {
        if (!injected && absolutePath === shared) {
          injected = true;
          base.unlink(absolutePath);
          const error = new Error("injected post-unlink failure");
          error.code = "EIO";
          throw error;
        }
        return base.unlink(absolutePath);
      },
    };

    assert.throws(
      () => executeInstallPlan(plan, { fsOps }),
      (error) => (
        error instanceof InstallFilesystemError
        && error.relativePath === ".ai-os/bin/shared.js"
        && /commit removal/i.test(error.message)
      ),
    );

    assert.equal(injected, true);
    assert.deepEqual(snapshotTree(target), before);
  } finally {
    cleanup(root);
  }
});

test("v10 migration rejects trimmed inventory seams before writes and clock sampling", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    const before = snapshotTree(target);
    let clockCalls = 0;

    assert.throws(
      () => buildInstallPlan(target, {
        fileSpecs: [],
        clock() {
          clockCalls += 1;
          return new Date();
        },
      }),
      /does not allow.*fileSpecs/i,
    );

    assert.equal(clockCalls, 0);
    assert.deepEqual(snapshotTree(target), before);
  } finally {
    cleanup(root);
  }
});

test("v10-like metadata with a missing lane conflicts without sampling the clock", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    fs.unlinkSync(targetPath(target, ".ai-os/lanes/default/lane.toml"));
    const before = snapshotTree(target);
    let clockCalls = 0;

    const error = captureConflict(() => installProject(target, {
      clock() {
        clockCalls += 1;
        throw new Error("must not sample clock");
      },
    }));

    assert.ok(error.conflicts.some((item) => item.relativePath.endsWith("lane.toml")));
    assert.equal(clockCalls, 0);
    assert.deepEqual(snapshotTree(target), before);
  } finally {
    cleanup(root);
  }
});

test("caller obsolete hashes and case aliases cannot authorize unknown shared removal", () => {
  for (const obsoletePath of [".ai-os/bin/shared.js", ".AI-OS/bin/shared.js"]) {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      materializeV10("v10.5.1", target);
      fs.writeFileSync(targetPath(target, ".ai-os/bin/shared.js"), "CALLER AUTHORIZED UNKNOWN\n");
      const unknownHash = sha256(fs.readFileSync(targetPath(target, ".ai-os/bin/shared.js")));
      const before = snapshotTree(target);

      const error = captureConflict(() => installProject(target, {
        force: true,
        obsoleteFrameworkHashes: { [obsoletePath]: [unknownHash] },
      }));

      assert.ok(error.conflicts.some((item) => item.relativePath === ".ai-os/bin/shared.js"));
      assert.deepEqual(snapshotTree(target), before);
    } finally {
      cleanup(root);
    }
  }
});

for (const [label, tag, relativePath, mutation, force = false] of [
  [
    "custom AGENTS",
    "v10.5.1",
    "AGENTS.md",
    (target) => fs.appendFileSync(targetPath(target, "AGENTS.md"), "\nCUSTOM CONSTITUTION\n"),
  ],
  [
    "unknown obsolete shared",
    "v10.5.1",
    ".ai-os/bin/shared.js",
    (target) => fs.writeFileSync(targetPath(target, ".ai-os/bin/shared.js"), "UNKNOWN SHARED\n"),
    true,
  ],
  [
    "unknown local doctor",
    "v10.5.1",
    ".ai-os/bin/ai-os-doctor.js",
    (target) => fs.writeFileSync(targetPath(target, ".ai-os/bin/ai-os-doctor.js"), "UNKNOWN DOCTOR\n"),
  ],
  [
    "unknown local VERSION",
    "v10.5.1",
    ".ai-os/bin/VERSION",
    (target) => fs.writeFileSync(targetPath(target, ".ai-os/bin/VERSION"), "10.5.1-custom\n"),
    true,
  ],
  [
    "unknown managed manifest",
    "v10.5.1",
    ".ai-os/managed-files.tsv",
    (target) => fs.appendFileSync(targetPath(target, ".ai-os/managed-files.tsv"), "custom\tfile\n"),
  ],
  [
    "future doctor-shared path",
    "v10.0.0",
    ".ai-os/bin/doctor-shared.js",
    (target) => writeTarget(target, ".ai-os/bin/doctor-shared.js", "FOREIGN FUTURE PATH\n"),
    true,
  ],
  [
    "future reference path",
    "v10.0.0",
    ".ai-os/reference/artifacts.md",
    (target) => writeTarget(target, ".ai-os/reference/artifacts.md", "FOREIGN FUTURE PATH\n"),
  ],
  [
    "early-tag local doctor path",
    "v10.0.0",
    ".ai-os/bin/ai-os-doctor.js",
    (target) => writeTarget(target, ".ai-os/bin/ai-os-doctor.js", "FOREIGN EARLY BIN\n"),
  ],
]) {
  test(`${label} conflicts at its own path before writes`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      materializeV10(tag, target);
      mutation(target);
      const before = snapshotTree(target);
      const error = captureConflict(() => installProject(target, { force }));
      assert.ok(error.conflicts.some((conflict) => conflict.relativePath === relativePath));
      assert.deepEqual(snapshotTree(target), before);
    } finally {
      cleanup(root);
    }
  });
}

test("v10 baseline context disagreement conflicts before writes", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    const mission = targetPath(target, ".ai-os/lanes/default/MISSION.md");
    fs.writeFileSync(mission, fs.readFileSync(mission, "utf8").replace(
      BASELINE_ID,
      "BL-20260710-010203-different-baseline",
    ));
    const before = snapshotTree(target);
    const error = captureConflict(() => installProject(target));
    assert.ok(error.conflicts.some(({ relativePath }) => relativePath.endsWith("MISSION.md")));
    assert.deepEqual(snapshotTree(target), before);
  } finally {
    cleanup(root);
  }
});

for (const [label, relativePath, mutate] of [
  [
    "tasks second YAML document",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `baseline_id: "${BASELINE_ID}"`,
      `---\nbaseline_id: "${BASELINE_ID}"`,
    )),
  ],
  [
    "tasks indented YAML document marker",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from("  ---\n")]),
  ],
  [
    "tasks duplicate semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.from(`baseline_id: ${BASELINE_ID}\n${bytes.toString("utf8")}`),
  ],
  [
    "tasks escaped quoted semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `${String.raw`"baseline\u005fid"`}: "BL-20260710-010203-conflicting"\n`,
    )]),
  ],
  [
    "tasks hex-escaped quoted semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `${String.raw`"\x62aseline_id"`}: "BL-20260710-010203-conflicting"\n`,
    )]),
  ],
  [
    "tasks long-Unicode-escaped quoted semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `${String.raw`"\U00000062aseline_id"`}: "BL-20260710-010203-conflicting"\n`,
    )]),
  ],
  [
    "tasks single-quoted semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `'baseline_id': "BL-20260710-010203-conflicting"\n`,
    )]),
  ],
  [
    "tasks tagged semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `!!str baseline_id: "BL-20260710-010203-conflicting"\n`,
    )]),
  ],
  [
    "tasks anchored semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `&context baseline_id: "BL-20260710-010203-conflicting"\n`,
    )]),
  ],
  [
    "tasks escaped explicit semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from([
      `? ${String.raw`"baseline\x5fid"`}`,
      ': "BL-20260710-010203-conflicting"',
      "",
    ].join("\n"))]),
  ],
  [
    "tasks escaped flow semantic root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `{${String.raw`"\U00000062aseline_id"`}: "BL-20260710-010203-conflicting"}\n`,
    )]),
  ],
  [
    "tasks merge root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `<<: { baseline_id: "BL-20260710-010203-conflicting" }\n`,
    )]),
  ],
  [
    "tasks malformed quoted root key",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from(
      `${String.raw`"baseline\u005fid`}: "BL-20260710-010203-conflicting"\n`,
    )]),
  ],
  [
    "tasks malformed root flow value",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from("custom: [unterminated\n")]),
  ],
  [
    "tasks multiline flow hides baseline below root",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `baseline_id: "${BASELINE_ID}"`,
      [
        "scope_flow:",
        "  hidden: [",
        `baseline_id: "${BASELINE_ID}"`,
        "  ]",
      ].join("\n"),
    )),
  ],
  [
    "tasks lone sequence indicator root value",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from("custom: -\n")]),
  ],
  [
    "tasks tab after indentation spaces",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from("  \tcustom: value\n")]),
  ],
  [
    "MISSION fenced baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `\`\`\`text\n- **当前基线 ID**：${BASELINE_ID}\n\`\`\``,
    )),
  ],
  [
    "MISSION marker after invalid fence closer",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `\`\`\`text\nhidden\n\`\`\` trailing\n- **当前基线 ID**：${BASELINE_ID}`,
    )),
  ],
  [
    "MISSION marker after comment-prefixed fence closer",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `\`\`\`text\ncode\n<!-- prefix -->\`\`\`\n- **当前基线 ID**：${BASELINE_ID}`,
    )),
  ],
  [
    "MISSION commented baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `<!-- - **当前基线 ID**：${BASELINE_ID} -->`,
    )),
  ],
  [
    "MISSION raw HTML block baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `<script>\n- **当前基线 ID**：${BASELINE_ID}\n</script>`,
    )),
  ],
  [
    "MISSION EOL raw HTML block opener baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `<script\n- **当前基线 ID**：${BASELINE_ID}`,
    )),
  ],
  [
    "MISSION indented mixed-case unclosed HTML block baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `   <DiV data-context="hidden"\n- **当前基线 ID**：${BASELINE_ID}`,
    )),
  ],
  [
    "MISSION CDATA block baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `<![CDATA[\n- **当前基线 ID**：${BASELINE_ID}\n]]>`,
    )),
  ],
  [
    "MISSION processing-instruction block baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `<?context hidden?>\n- **当前基线 ID**：${BASELINE_ID}`,
    )),
  ],
  [
    "MISSION declaration block baseline marker",
    ".ai-os/lanes/default/MISSION.md",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **当前基线 ID**：${BASELINE_ID}`,
      `<!CONTEXT hidden>\n- **当前基线 ID**：${BASELINE_ID}`,
    )),
  ],
  [
    "record fenced Confirmed At",
    `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **Confirmed At**: ${BASELINE_DATE}`,
      `\`\`\`text\n- **Confirmed At**: ${BASELINE_DATE}\n\`\`\``,
    )),
  ],
  [
    "record duplicate live Confirmed At",
    `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **Confirmed At**: ${BASELINE_DATE}`,
      `- **Confirmed At**: ${BASELINE_DATE}\n- **Confirmed At**: ${BASELINE_DATE}`,
    )),
  ],
  [
    "record raw HTML block Confirmed At",
    `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `- **Confirmed At**: ${BASELINE_DATE}`,
      `<pre>\n- **Confirmed At**: ${BASELINE_DATE}\n</pre>`,
    )),
  ],
  [
    "record H1 disagreement",
    `.ai-os/lanes/default/baseline-log/${BASELINE_FILE}`,
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      `# ${BASELINE_ID}`,
      "# BL-20260710-010203-other-baseline",
    )),
  ],
  [
    "lane control byte",
    ".ai-os/lanes/default/lane.toml",
    (bytes) => Buffer.concat([bytes, Buffer.from([0])]),
  ],
  [
    "tasks invalid UTF-8",
    ".ai-os/lanes/default/tasks.yaml",
    (bytes) => Buffer.concat([bytes, Buffer.from([0xff])]),
  ],
  [
    "metadata schema 10 spoof",
    ".ai-os/framework.toml",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(
      'schema_version = "9"',
      'schema_version = "10"',
    )),
  ],
  [
    "metadata unsupported v10 version",
    ".ai-os/framework.toml",
    (bytes) => Buffer.from(bytes.toString("utf8").replace("10.5.1", "10.2.0")),
  ],
  [
    "metadata duplicate timestamp",
    ".ai-os/framework.toml",
    (bytes) => Buffer.concat([bytes, Buffer.from(`installed_at = "${INSTALLED_AT}"\n`)]),
  ],
  [
    "metadata invalid timestamp",
    ".ai-os/framework.toml",
    (bytes) => Buffer.from(bytes.toString("utf8").replace(INSTALLED_AT, "not-a-date")),
  ],
  [
    "metadata CRLF rewrite",
    ".ai-os/framework.toml",
    (bytes) => Buffer.from(bytes.toString("utf8").replaceAll("\n", "\r\n")),
  ],
]) {
  test(`${label} cannot authorize v10 migration`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      materializeV10("v10.5.1", target);
      const absolute = targetPath(target, relativePath);
      fs.writeFileSync(absolute, mutate(fs.readFileSync(absolute)));
      const before = snapshotTree(target);

      const error = captureConflict(() => installProject(target, { force: true }));

      assert.ok(error.conflicts.some((conflict) => conflict.relativePath === relativePath));
      assert.deepEqual(snapshotTree(target), before);
    } finally {
      cleanup(root);
    }
  });
}

test("legacy team blocks at EOF without a final newline migrate without changing outside bytes", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    materializeV10("v10.5.1", target);
    fs.writeFileSync(targetPath(target, ".gitignore"), [
      "user-before",
      "# AI-OS v9 managed (session-local and generated files)",
      ".ai-os/lanes/*/STATE.md",
      ".ai-os/framework.toml",
      ".ai-os/managed-files.tsv",
    ].join("\n"));
    fs.writeFileSync(targetPath(target, ".gitattributes"), [
      "user-before",
      "# AI-OS v9 managed (append-only knowledge)",
      ".ai-os/memory.md merge=union",
    ].join("\n"));

    installProject(target);

    assert.equal(fs.readFileSync(targetPath(target, ".gitignore"), "utf8"), [
      "user-before",
      "# BEGIN AI-OS",
      ".ai-os/lanes/*/STATE.md",
      "# END AI-OS",
    ].join("\n"));
    assert.equal(fs.readFileSync(targetPath(target, ".gitattributes"), "utf8"), [
      "user-before",
      "# BEGIN AI-OS",
      "# END AI-OS",
    ].join("\n"));
  } finally {
    cleanup(root);
  }
});

test("a canonical future v11 patch version is not misclassified as v10", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date("2026-07-10T01:02:03.000Z") });
    const metadata = targetPath(target, ".ai-os/framework.toml");
    fs.writeFileSync(metadata, fs.readFileSync(metadata, "utf8").replace("11.0.0", "11.10.0"));
    const result = installProject(target);
    assert.equal(result.baselineId, BASELINE_ID.replace("initial-baseline", "bootstrap-unconfirmed"));
  } finally {
    cleanup(root);
  }
});

for (const [label, relativePath, mutate] of [
  [
    "missing legacy rule",
    ".gitignore",
    (content) => content.replace(".ai-os/framework.toml\r\n", ""),
  ],
  [
    "reordered legacy rules",
    ".gitignore",
    (content) => content.replace(
      ".ai-os/lanes/*/STATE.md\r\n.ai-os/framework.toml",
      ".ai-os/framework.toml\r\n.ai-os/lanes/*/STATE.md",
    ),
  ],
  [
    "duplicate legacy header",
    ".gitignore",
    (content) => `${content}# AI-OS v9 managed (session-local and generated files)\r\n`,
  ],
  [
    "extra line inside legacy region",
    ".gitignore",
    (content) => content.replace(
      "# AI-OS v9 managed (session-local and generated files)\r\n",
      "# AI-OS v9 managed (session-local and generated files)\r\nCUSTOM MANAGED LINE\r\n",
    ),
  ],
  [
    "legacy and current blocks together",
    ".gitignore",
    (content) => `${content}# BEGIN AI-OS\r\n.ai-os/lanes/*/STATE.md\r\n# END AI-OS\r\n`,
  ],
  [
    "duplicate legacy rule outside its block",
    ".gitignore",
    (content) => `${content}.ai-os/framework.toml\r\n`,
  ],
  [
    "marker-like legacy header",
    ".gitignore",
    (content) => content.replace("# AI-OS v9 managed", "prefix # AI-OS v9 managed"),
  ],
  [
    "unclosed current block",
    ".gitignore",
    () => "user\r\n# BEGIN AI-OS\r\n.ai-os/lanes/*/STATE.md\r\n",
  ],
  [
    "user-modified current block",
    ".gitignore",
    () => "# BEGIN AI-OS\ncustom\n# END AI-OS\n",
  ],
  [
    "current block with legacy rule outside",
    ".gitignore",
    () => "# BEGIN AI-OS\n.ai-os/lanes/*/STATE.md\n# END AI-OS\n.ai-os/framework.toml\n",
  ],
  [
    "gitattributes union rule outside current block",
    ".gitattributes",
    () => "# BEGIN AI-OS\n# END AI-OS\n.ai-os/memory.md merge=union\n",
  ],
]) {
  test(`${label} is a team-config conflict with a byte-identical tree`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      materializeV10("v10.5.1", target);
      const absolute = targetPath(target, relativePath);
      fs.writeFileSync(absolute, mutate(fs.readFileSync(absolute, "utf8")));
      const before = snapshotTree(target);

      const error = captureConflict(() => installProject(target, { force: true }));

      assert.ok(error.conflicts.some((conflict) => conflict.relativePath === relativePath));
      assert.deepEqual(snapshotTree(target), before);
    } finally {
      cleanup(root);
    }
  });
}
