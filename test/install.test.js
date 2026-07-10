#!/usr/bin/env node

/**
 * Install tests: default create-ai-os produces the v11 canonical layout
 * (core artifacts only; extension artifacts are on-demand).
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");
const {
  FILE_SPECS,
  OWNERSHIP,
  sha256,
} = require("../bin/doctor-shared");
const {
  InstallConflictError,
  installProject,
} = require("../bin/installer");
const { snapshotTree } = require("./fixtures");
const {
  test,
  assert,
  runInstall,
  tmpDir: rawTmpDir,
  cleanup,
  readFile,
  readRepo,
  exists,
  repoRoot,
  listBaselineRecords,
  BASELINE_RECORD_NAME_PATTERN,
} = require("./helpers");

const FIXED_BOOTSTRAP_DATE = "2026-07-10T12:34:56.789Z";
const FIXED_BOOTSTRAP_ID = "BL-20260710-123456-bootstrap-unconfirmed";
const FIXED_BOOTSTRAP_FILE = `${FIXED_BOOTSTRAP_ID}.md`;
const CREATE_CLI = path.join(repoRoot, "bin", "create-ai-os.js");
const INSTALLER = path.join(repoRoot, "bin", "installer.js");
const PINNED_PUBLIC_INSTALL = "npx --yes github:royeedai/ai-os#v10.5.1 .";

function tmpDir() {
  return fs.realpathSync.native(rawTmpDir());
}

function assertSingleCliError(result, pattern) {
  assert.equal(result.status, 1, `command exits 1: ${result.stderr}`);
  assert.equal(result.stdout, "", "failure writes nothing to stdout");
  assert.match(result.stderr, /^Error: [^\r\n]+\n$/, "failure is exactly one Error line");
  assert.match(result.stderr, pattern);
  assert.doesNotMatch(result.stderr, /\n\s+at\s|\b(?:InstallConflictError|InstallFilesystemError):/);
}

function assertCliFailurePreserves(root, args, pattern) {
  const before = snapshotTree(root);
  const result = runInstall(args, root);
  assertSingleCliError(result, pattern);
  assert.deepEqual(snapshotTree(root), before, "failure leaves the complete fixture byte-identical");
}

function runMainProbe(argv, scenario, cwd) {
  const source = String.raw`
    const fs = require("node:fs");
    const path = require("node:path");
    const cli = require(process.argv[1]);
    const { InstallFilesystemError } = require(process.argv[2]);
    const argv = JSON.parse(process.argv[3]);
    const scenario = process.argv[4];
    const writes = { stdout: "", stderr: "" };
    const io = {
      stdout: { write(value) { writes.stdout += String(value); } },
      stderr: { write(value) { writes.stderr += String(value); } },
    };
    const calls = [];
    const install = (target, options) => {
      calls.push({ target, options, targetExists: fs.existsSync(target) });
      if (scenario === "filesystem-error") {
        throw new InstallFilesystemError(
          "injected write",
          ".ai-os/framework.toml",
          new Error("injected filesystem failure"),
        );
      }
      return {
        created: 3,
        replaced: 2,
        preserved: 7,
        warnings: [],
        baselineId: "BL-20260710-123456-bootstrap-unconfirmed",
        layoutVersion: "11",
      };
    };
    const status = cli.main(argv, io, install);
    process.stdout.write(JSON.stringify({
      status,
      writes,
      calls,
      cwd: process.cwd(),
      targetExistsAfter: calls[0] ? fs.existsSync(calls[0].target) : null,
      targetBasename: calls[0] ? path.basename(calls[0].target) : null,
    }));
  `;
  return spawnSync(process.execPath, [
    "-e",
    source,
    CREATE_CLI,
    INSTALLER,
    JSON.stringify(argv),
    scenario,
  ], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("install CLI: requiring from a temporary cwd is inert and exports main", () => {
  const root = fs.realpathSync.native(tmpDir());
  try {
    const before = snapshotTree(root);
    const source = String.raw`
      const fs = require("node:fs");
      const cli = require(process.argv[1]);
      process.stdout.write(JSON.stringify({
        main: typeof cli.main,
        entries: fs.readdirSync(".").sort(),
      }));
    `;
    const result = spawnSync(process.execPath, ["-e", source, CREATE_CLI], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout, JSON.stringify({ main: "function", entries: [] }));
    assert.deepEqual(snapshotTree(root), before, "requiring the CLI leaves cwd byte-identical");
  } finally {
    cleanup(root);
  }
});

test("install CLI: main delegates once with exact flags and reports the InstallResult", () => {
  const root = fs.realpathSync.native(tmpDir());
  try {
    const result = runMainProbe([
      "install",
      "relative target",
      "--force",
      "--no-team-config",
      "--no-ide-files",
    ], "success", root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 0);
    assert.equal(payload.writes.stderr, "");
    assert.equal(payload.calls.length, 1, "main delegates exactly once");
    assert.deepEqual(payload.calls[0], {
      target: path.join(root, "relative target"),
      options: { force: true, teamConfig: false, ideFiles: false },
      targetExists: false,
    });
    assert.equal(payload.targetExistsAfter, false, "CLI does not pre-create the target");
    assert.match(payload.writes.stdout, /Installation complete/);
    assert.match(payload.writes.stdout, /Baseline:\s+BL-20260710-123456-bootstrap-unconfirmed/);
    assert.match(payload.writes.stdout, /Layout:\s+11/);
    assert.match(payload.writes.stdout, /Created:\s+3/);
    assert.match(payload.writes.stdout, /Replaced:\s+2/);
    assert.match(payload.writes.stdout, /Preserved:\s+7/);
  } finally {
    cleanup(root);
  }
});

test("install CLI: injected InstallFilesystemError is one line with no target write", () => {
  const root = fs.realpathSync.native(tmpDir());
  try {
    const target = path.join(root, "must-not-exist");
    const result = runMainProbe([target], "filesystem-error", root);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 1);
    assert.equal(payload.writes.stdout, "");
    assert.match(payload.writes.stderr, /^Error: [^\r\n]+\n$/);
    assert.match(payload.writes.stderr, /injected filesystem failure/);
    assert.doesNotMatch(payload.writes.stderr, /\n\s+at\s|InstallFilesystemError:/);
    assert.equal(payload.calls.length, 1);
    assert.equal(payload.calls[0].targetExists, false);
    assert.equal(payload.targetExistsAfter, false);
    assert.deepEqual(fs.readdirSync(root), []);
  } finally {
    cleanup(root);
  }
});

test("install CLI: unknown option fails with one line and no writes", () => {
  const root = fs.realpathSync.native(tmpDir());
  try {
    assertCliFailurePreserves(root, ["--unknown-install-option"], /unknown option/i);
  } finally {
    cleanup(root);
  }
});

test("install CLI: foreign AGENTS conflict is concise and byte-identical", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, "AGENTS.md"), "FOREIGN CONSTITUTION\n", { mode: 0o640 });
    assertCliFailurePreserves(root, [target], /AGENTS[.]md: .*manual merge/i);
  } finally {
    cleanup(root);
  }
});

test("install CLI: managed symlink conflict never follows the external sentinel", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  const outside = path.join(root, "outside.txt");
  const managed = path.join(target, ".ai-os", "bin", "doctor-shared.js");
  try {
    fs.mkdirSync(path.dirname(managed), { recursive: true });
    fs.writeFileSync(outside, "SENTINEL\n", { mode: 0o640 });
    fs.symlinkSync(outside, managed, "file");
    assertCliFailurePreserves(root, [target], /doctor-shared[.]js: .*symbolic link|junction/i);
    assert.equal(fs.readFileSync(outside, "utf8"), "SENTINEL\n");
  } finally {
    cleanup(root);
  }
});

test("install CLI: existing install lock fails with one line and no writes", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, ".ai-os-install.lock"), "FOREIGN LOCK\n", { mode: 0o600 });
    assertCliFailurePreserves(root, [target], /installation already in progress/i);
  } finally {
    cleanup(root);
  }
});

test("install CLI: existing file target fails with one line and no writes", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "not-a-directory");
  try {
    fs.writeFileSync(target, "plain file\n", { mode: 0o640 });
    assertCliFailurePreserves(root, [target], /not a directory/i);
  } finally {
    cleanup(root);
  }
});

function parseTomlStrings(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]+)\s*=\s*"([^"]*)"\s*$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

function installedFiles(root) {
  const result = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) result.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }

  visit(root);
  return result.sort();
}

function enabledFileSpecs(bootstrapFile, { teamConfig = true, ideFiles = true } = {}) {
  return Object.values(FILE_SPECS)
    .filter((descriptor) => (
      (teamConfig || ![".gitignore", ".gitattributes"].includes(descriptor.path))
      && (ideFiles || !["CLAUDE.md", "GEMINI.md"].includes(descriptor.path))
    ))
    .map((descriptor) => ({
      descriptor,
      relativePath: descriptor.path.replace("{{INITIAL_BASELINE_FILE}}", bootstrapFile),
    }))
    .sort((left, right) => (
      left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0
    ));
}

function assertManifestMatchesInstall(target, bootstrapFile, switches = {}) {
  const manifestPath = ".ai-os/managed-files.tsv";
  const manifest = readFile(target, manifestPath);
  const lines = manifest.split("\n");
  assert.equal(lines.at(-1), "", "manifest ends with one complete line");
  assert.equal(lines[0], "# path\ttype\townership\tsource_sha256", "manifest header is exact");

  const rowLines = lines.slice(1, -1);
  assert.deepEqual(rowLines, [...rowLines].sort(), "manifest rows are sorted");

  const rows = rowLines.map((line) => {
    const fields = line.split("\t");
    assert.equal(fields.length, 4, `manifest row has four fields: ${line}`);
    return {
      path: fields[0],
      type: fields[1],
      ownership: fields[2],
      sourceSha256: fields[3],
    };
  });
  const manifestPaths = rows.map((row) => row.path);
  assert.equal(new Set(manifestPaths).size, manifestPaths.length, "each path has exactly one row");
  assert.ok(!manifestPaths.includes(manifestPath), "manifest does not recursively list itself");

  const expectedSpecs = enabledFileSpecs(bootstrapFile, switches);
  const expectedFiles = expectedSpecs.map(({ relativePath }) => relativePath);
  const expectedManifestPaths = expectedFiles.filter((relativePath) => relativePath !== manifestPath);
  const actualFiles = installedFiles(target);
  assert.deepEqual(actualFiles, expectedFiles, "actual files equal the independently enabled inventory");
  assert.deepEqual(
    manifestPaths,
    expectedManifestPaths,
    "manifest lists every enabled path except exactly itself",
  );
  assert.deepEqual(
    expectedFiles.filter((relativePath) => !manifestPaths.includes(relativePath)),
    [manifestPath],
    "managed-files.tsv is the sole non-self-listed inventory path",
  );

  const specsByPath = new Map(expectedSpecs.map(({ descriptor, relativePath }) => [
    relativePath,
    descriptor,
  ]));
  for (const row of rows) {
    const descriptor = specsByPath.get(row.path);
    assert.ok(descriptor, `manifest path belongs to the canonical inventory: ${row.path}`);
    assert.equal(row.type, descriptor.type, `${row.path} type`);
    assert.equal(row.ownership, descriptor.ownership, `${row.path} ownership`);
    if (row.ownership === OWNERSHIP.FRAMEWORK) {
      assert.match(row.sourceSha256, /^[a-f0-9]{64}$/, `${row.path} has a lowercase SHA-256`);
      assert.equal(
        row.sourceSha256,
        sha256(fs.readFileSync(path.join(target, ...row.path.split("/")))),
        `${row.path} hash matches installed bytes`,
      );
    } else {
      assert.equal(row.sourceSha256, "", `${row.path} has no project/session source hash`);
    }
  }
}

test("install: safe installer creates a truthful fresh v11 layout", () => {
  const dir = fs.realpathSync.native(tmpDir());
  let clockCalls = 0;
  try {
    const result = installProject(dir, {
      clock() {
        clockCalls += 1;
        return new Date(FIXED_BOOTSTRAP_DATE);
      },
    });

    assert.equal(clockCalls, 1, "one clock sample defines the whole bootstrap identity");
    assert.equal(result.baselineId, FIXED_BOOTSTRAP_ID);
    assert.equal(result.layoutVersion, "11");

    const metadataContent = readFile(dir, ".ai-os/framework.toml");
    assert.doesNotMatch(metadataContent, /^\s*(?:installed_at|updated_at)\s*=/im);
    const metadata = parseTomlStrings(metadataContent);
    assert.deepEqual(metadata, {
      schema_version: "11",
      layout_version: "11",
      layout_mode: "shared-root-default-lane",
      default_lane: "default",
      framework_version: "11.0.0",
    });
    assert.equal(metadata.installed_at, undefined);
    assert.equal(metadata.updated_at, undefined);
    assert.equal(
      readFile(dir, ".ai-os/reference/artifacts.md"),
      readRepo("docs/artifacts.md"),
      "offline reference is copied byte-for-byte",
    );

    const records = listBaselineRecords(dir);
    assert.deepEqual(records, [FIXED_BOOTSTRAP_FILE], "fresh install creates one bootstrap record");
    const baseline = readFile(dir, `.ai-os/lanes/default/baseline-log/${records[0]}`);
    assert.match(baseline, new RegExp(`^# ${FIXED_BOOTSTRAP_ID}$`, "m"));
    assert.match(baseline, /^- \*\*Type\*\*: bootstrap$/m);
    assert.match(baseline, /^- \*\*Status\*\*: unconfirmed$/m);
    assert.match(baseline, new RegExp(`^- \\*\\*Created At\\*\\*: ${FIXED_BOOTSTRAP_DATE}$`, "m"));
    assert.doesNotMatch(baseline, /Confirmed At/i);

    const laneToml = readFile(dir, ".ai-os/lanes/default/lane.toml");
    const mission = readFile(dir, ".ai-os/lanes/default/MISSION.md");
    const state = readFile(dir, ".ai-os/lanes/default/STATE.md");
    const tasks = readFile(dir, ".ai-os/lanes/default/tasks.yaml");
    assert.match(laneToml, new RegExp(`^baseline_id = "${FIXED_BOOTSTRAP_ID}"$`, "m"));
    assert.match(laneToml, /^quality_tier = "unassessed"$/m);
    assert.match(laneToml, /^risk_tier = "unassessed"$/m);
    assert.match(laneToml, /^governance_tier = "unassessed"$/m);
    for (const content of [mission, state]) {
      assert.match(content, new RegExp(FIXED_BOOTSTRAP_ID));
    }
    assert.match(tasks, new RegExp(`^baseline_id: "${FIXED_BOOTSTRAP_ID}"$`, "m"));
    const approvals = tasks.match(/^    approval:$/gm) || [];
    const approvalBaselines = tasks.match(
      new RegExp(`^      baseline_id: "${FIXED_BOOTSTRAP_ID}"$`, "gm"),
    ) || [];
    assert.equal(approvalBaselines.length, approvals.length, "every task approval binds to the bootstrap");
    for (const content of [laneToml, mission, state, tasks, baseline]) {
      assert.doesNotMatch(content, /\{\{INITIAL_BASELINE_(?:ID|FILE|DATE)\}\}/);
    }

    assertManifestMatchesInstall(dir, FIXED_BOOTSTRAP_FILE);
  } finally {
    cleanup(dir);
  }
});

test("install: foreign fresh bootstrap collision fails before every write", () => {
  const root = fs.realpathSync.native(tmpDir());
  const dir = path.join(root, "target");
  const baseline = path.join(
    dir,
    ".ai-os",
    "lanes",
    "default",
    "baseline-log",
    FIXED_BOOTSTRAP_FILE,
  );
  let clockCalls = 0;
  try {
    fs.mkdirSync(path.dirname(baseline), { recursive: true });
    fs.writeFileSync(baseline, [
      `# ${FIXED_BOOTSTRAP_ID}`,
      "",
      "- **Type**: baseline",
      "- **Status**: confirmed",
      "- **confirmed_at**: 2026-07-10T12:34:56.789Z",
      "",
    ].join("\n"), { mode: 0o640 });
    const before = snapshotTree(dir);

    assert.throws(
      () => installProject(dir, {
        clock() {
          clockCalls += 1;
          return new Date(FIXED_BOOTSTRAP_DATE);
        },
      }),
      (error) => (
        error instanceof InstallConflictError
        && error.code === "ERR_INSTALL_CONFLICT"
        && error.conflicts.some((item) => (
          item.relativePath === `.ai-os/lanes/default/baseline-log/${FIXED_BOOTSTRAP_FILE}`
          && /fresh bootstrap.*collision/i.test(item.reason)
        ))
      ),
    );

    assert.equal(clockCalls, 1, "collision planning does not resample the clock");
    assert.deepEqual(snapshotTree(dir), before, "collision leaves the complete tree byte-identical");
    assert.equal(exists(dir, ".ai-os/lanes/default/lane.toml"), false);
  } finally {
    cleanup(root);
  }
});

for (const teamConfig of [true, false]) {
  for (const ideFiles of [true, false]) {
    test(`install: manifest matches inventory with teamConfig=${teamConfig} ideFiles=${ideFiles}`, () => {
      const dir = fs.realpathSync.native(tmpDir());
      try {
        installProject(dir, {
          clock: () => new Date(FIXED_BOOTSTRAP_DATE),
          teamConfig,
          ideFiles,
        });

        assertManifestMatchesInstall(dir, FIXED_BOOTSTRAP_FILE, { teamConfig, ideFiles });
      } finally {
        cleanup(dir);
      }
    });
  }
}

test("install: default install into fresh dir", () => {
  const dir = tmpDir();
  try {
    const result = runInstall([dir]);
    assert.equal(result.status, 0, "install exits 0");
    assert.ok(result.stdout.includes("Installation complete"), "stdout reports completion");
    for (const label of ["Created", "Replaced", "Preserved", "Baseline", "Layout"]) {
      assert.match(
        result.stdout,
        new RegExp(`${label}:\\s+\\S+`),
        `stdout reports ${label.toLowerCase()}`,
      );
    }

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
    assert.ok(exists(dir, ".ai-os/bin/doctor-shared.js"), "local doctor read-only helper vendored");
    assert.ok(exists(dir, ".ai-os/bin/VERSION"), "local doctor VERSION vendored");
    assert.equal(exists(dir, ".ai-os/bin/shared.js"), false, "legacy installer helper is not vendored");
    assert.deepEqual(
      fs.readdirSync(path.join(dir, ".ai-os", "bin")).sort(),
      ["VERSION", "ai-os-doctor.js", "doctor-shared.js"],
      "local bin contains only the zero-network doctor runtime",
    );
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
    assert.ok(gitignore && !gitignore.includes(".ai-os/framework.toml"), ".gitignore keeps framework.toml committed");
    assert.ok(gitignore && !gitignore.includes(".ai-os/managed-files.tsv"), ".gitignore keeps managed-files.tsv committed");

    const gitattributes = readFile(dir, ".gitattributes");
    assert.ok(gitattributes && !gitattributes.includes("memory.md merge=union"), ".gitattributes does not force union merge for memory.md");

    const toml = readFile(dir, ".ai-os/framework.toml");
    assert.ok(toml && toml.includes('schema_version = "11"'), "framework.toml has schema_version=11");
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

test("install: --force refreshes framework only and preserves project/session bytes", () => {
  const dir = tmpDir();
  try {
    const first = runInstall([dir]);
    assert.equal(first.status, 0, first.stderr);
    const projectPaths = [
      ".ai-os/MISSION.md",
      ".ai-os/lanes/default/MISSION.md",
      ".ai-os/lanes/default/tasks.yaml",
    ];
    const sessionPath = ".ai-os/lanes/default/STATE.md";
    for (const relativePath of [...projectPaths, sessionPath]) {
      fs.appendFileSync(path.join(dir, ...relativePath.split("/")), `\nUSER BYTES: ${relativePath}\n`);
    }
    const preserved = new Map([...projectPaths, sessionPath].map((relativePath) => [
      relativePath,
      fs.readFileSync(path.join(dir, ...relativePath.split("/"))),
    ]));
    const referencePath = path.join(dir, ".ai-os", "reference", "artifacts.md");
    fs.appendFileSync(referencePath, "\nSTALE FRAMEWORK BYTES\n");
    const baselineBefore = listBaselineRecords(dir);

    const result = runInstall([dir, "--force"]);
    assert.equal(result.status, 0, result.stderr);
    for (const [relativePath, bytes] of preserved) {
      assert.deepEqual(
        fs.readFileSync(path.join(dir, ...relativePath.split("/"))),
        bytes,
        `${relativePath} is byte-identical after force`,
      );
    }
    assert.deepEqual(
      fs.readFileSync(referencePath),
      fs.readFileSync(path.join(repoRoot, "docs", "artifacts.md")),
      "force restores framework-owned reference bytes",
    );
    assert.deepEqual(listBaselineRecords(dir), baselineBefore, "force does not create a new baseline");
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
    assertSingleCliError(result, /removed in v10/);
    assert.ok(result.stderr.includes(PINNED_PUBLIC_INSTALL), "stderr names the pinned public install form");
    assert.equal(result.stderr.includes(["npx", "create-ai-os"].join(" ")), false);
    assert.doesNotMatch(result.stderr, /install \. --force/);
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
