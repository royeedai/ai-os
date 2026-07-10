"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assert,
  test,
  afterEach,
  cleanup,
  repoRoot,
  tmpDir,
} = require("./helpers");
const {
  materializePlanFixture,
  snapshotTree,
} = require("./fixtures");
const {
  FILE_SPECS,
  OWNERSHIP,
  sha256,
} = require("../bin/doctor-shared");
const {
  InstallPlannerError,
  buildInstallPlan,
} = require("../bin/installer");

const temporaryRoots = new Set();
let materializedProbeTarget = null;

afterEach(() => {
  cleanup(...temporaryRoots);
  temporaryRoots.clear();
});

function temporaryRoot() {
  const root = fs.realpathSync.native(tmpDir());
  temporaryRoots.add(root);
  return root;
}

function operation(plan, relativePath) {
  return plan.operations.find((candidate) => candidate.relativePath === relativePath);
}

function conflict(plan, relativePath) {
  return plan.conflicts.find((candidate) => candidate.relativePath === relativePath);
}

function writeTargetFile(target, relativePath, content) {
  const destination = path.join(target, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  return destination;
}

function capturePlannerError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  assert.fail("expected planner callback to throw");
}

function assertPlannerFailureWithoutWrites(
  clockOrBootstrap,
  { clock = false, message, cause, causeProvided, causeType } = {},
) {
  const root = temporaryRoot();
  const target = path.join(root, "target");
  const before = snapshotTree(root);
  const options = clock
    ? defaultOptions({ bootstrap: undefined, clock: clockOrBootstrap, fileSpecs: [] })
    : defaultOptions({ bootstrap: clockOrBootstrap, fileSpecs: [] });

  const error = capturePlannerError(() => buildInstallPlan(target, options));

  assert.ok(error instanceof InstallPlannerError);
  assert.equal(error.name, "InstallPlannerError");
  assert.equal(error.code, "ERR_INSTALL_PLANNER");
  assert.match(error.message, message);
  const expectsCause = causeProvided === undefined ? cause !== undefined : causeProvided;
  if (expectsCause) {
    assert.equal(Object.hasOwn(error, "cause"), true);
    assert.equal(error.cause, cause);
  }
  if (causeType !== undefined) assert.ok(error.cause instanceof causeType);
  assert.deepEqual(snapshotTree(root), before);
  assert.equal(fs.existsSync(target), false);
}

function copiedSourceRoot() {
  const root = path.join(temporaryRoot(), "package");
  fs.mkdirSync(root);
  for (const relativePath of ["VERSION", "bin", "docs", "framework"]) {
    fs.cpSync(path.join(repoRoot, relativePath), path.join(root, relativePath), {
      recursive: true,
      preserveTimestamps: true,
    });
  }
  return root;
}

function defaultOptions(overrides = {}) {
  return {
    force: false,
    teamConfig: true,
    ideFiles: true,
    bootstrap: {
      id: "BL-20260710-000000-bootstrap-unconfirmed",
      file: "BL-20260710-000000-bootstrap-unconfirmed.md",
      date: "2026-07-10T00:00:00.000Z",
    },
    ...overrides,
  };
}

test("planning a fresh install makes no writes", () => {
  const parent = temporaryRoot();
  const target = path.join(parent, "not-created-yet");

  const plan = buildInstallPlan(target, defaultOptions());

  assert.equal(fs.existsSync(target), false);
  assert.equal(plan.conflicts.length, 0);
  assert.ok(plan.operations.length > 0);
  assert.ok(plan.operations.every((candidate) => candidate.action === "create"));
});

test("fresh plan operations expose the complete immutable contract", () => {
  const target = path.join(temporaryRoot(), "target");
  const plan = buildInstallPlan(target, defaultOptions());
  const agents = operation(plan, "AGENTS.md");

  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.operations), true);
  assert.equal(Object.isFrozen(plan.conflicts), true);
  assert.equal(Object.isFrozen(agents), true);
  assert.deepEqual(Object.keys(agents).sort(), [
    "action",
    "content",
    "mode",
    "ownership",
    "previousHash",
    "relativePath",
    "type",
  ]);
  assert.equal(agents.type, "file");
  assert.equal(agents.ownership, OWNERSHIP.PROJECT);
  assert.equal(agents.action, "create");
  assert.equal(agents.mode, 0o644);
  assert.equal(agents.previousHash, null);
  assert.ok(Buffer.isBuffer(agents.content));
});

test("operation content cannot be mutated through an override or returned buffer", () => {
  const override = Buffer.from("CUSTOM AGENTS TEMPLATE\n");
  const plan = buildInstallPlan(path.join(temporaryRoot(), "target"), defaultOptions({
    sourceOverrides: new Map([["framework/.agents/templates/root/AGENTS.md", override]]),
  }));
  const agents = operation(plan, "AGENTS.md");

  override.fill(0x58);
  const exposed = agents.content;
  exposed.fill(0x59);

  assert.equal(agents.content.toString("utf8"), "CUSTOM AGENTS TEMPLATE\n");
  assert.throws(() => {
    agents.action = "preserve";
  }, TypeError);
});

test("generated framework metadata is stable v11 content without timestamps", () => {
  const target = path.join(temporaryRoot(), "target");
  const first = operation(buildInstallPlan(target, defaultOptions()), ".ai-os/framework.toml");
  const second = operation(buildInstallPlan(target, defaultOptions()), ".ai-os/framework.toml");
  const content = first.content.toString("utf8");

  assert.deepEqual(first.content, second.content);
  assert.match(content, /schema_version = "11"/);
  assert.match(content, /layout_version = "11"/);
  assert.match(content, /framework_version = "11[.]0[.]0"/);
  assert.doesNotMatch(content, /installed_at|updated_at/i);
});

test("source-backed framework tools and references remain byte-for-byte", () => {
  const plan = buildInstallPlan(path.join(temporaryRoot(), "target"), defaultOptions());

  for (const [relativePath, sourcePath] of [
    [".ai-os/bin/ai-os-doctor.js", "bin/ai-os-doctor.js"],
    [".ai-os/bin/doctor-shared.js", "bin/doctor-shared.js"],
    [".ai-os/reference/artifacts.md", "docs/artifacts.md"],
  ]) {
    assert.deepEqual(
      operation(plan, relativePath).content,
      fs.readFileSync(path.join(repoRoot, sourcePath)),
      relativePath,
    );
  }
});

test("team config and IDE switches remove only their planned destinations", () => {
  const target = path.join(temporaryRoot(), "target");
  const plan = buildInstallPlan(target, defaultOptions({
    teamConfig: false,
    ideFiles: false,
  }));
  const paths = new Set(plan.operations.map((candidate) => candidate.relativePath));

  for (const relativePath of [".gitignore", ".gitattributes", "CLAUDE.md", "GEMINI.md"]) {
    assert.equal(paths.has(relativePath), false, relativePath);
  }
  assert.equal(paths.has("AGENTS.md"), true);
  assert.equal(paths.has(".ai-os/memory.md"), true);
});

test("custom project artifact is preserved even with force", () => {
  const target = materializePlanFixture(buildInstallPlan(
    path.join(temporaryRoot(), "unused-target"),
    defaultOptions(),
  ));
  writeTargetFile(target, ".ai-os/memory.md", "USER MEMORY\n");
  const before = snapshotTree(target);

  const plan = buildInstallPlan(target, defaultOptions({ force: true }));
  const memory = operation(plan, ".ai-os/memory.md");

  assert.equal(memory.action, "preserve");
  assert.equal(memory.previousHash, sha256("USER MEMORY\n"));
  assert.deepEqual(snapshotTree(target), before);
});

test("current project template is recognized by its fully rendered hash", () => {
  const bootstrap = {
    id: "BL-20260710-010203-rendered",
    file: "BL-20260710-010203-rendered.md",
    date: "2026-07-10T01:02:03.000Z",
  };
  const options = defaultOptions({
    bootstrap,
    sourceOverrides: {
      "framework/.agents/templates/lane/lane.toml": "baseline_id = \"{{INITIAL_BASELINE_ID}}\"\n",
    },
  });
  const target = materializePlanFixture(buildInstallPlan(
    path.join(temporaryRoot(), "unused-target"),
    options,
  ));

  const plan = buildInstallPlan(target, options);

  assert.equal(
    operation(plan, ".ai-os/lanes/default/lane.toml").action,
    "replace-pristine-project",
  );
});

test("an exact fresh bootstrap record collision remains recognized pristine content", () => {
  const target = path.join(temporaryRoot(), "target");
  const options = defaultOptions();
  const initialPlan = buildInstallPlan(target, options);
  const baseline = initialPlan.operations.find((candidate) => (
    candidate.relativePath === `.ai-os/lanes/default/baseline-log/${options.bootstrap.file}`
  ));
  writeTargetFile(target, baseline.relativePath, baseline.content);
  const before = snapshotTree(target);

  const plan = buildInstallPlan(target, options);

  assert.equal(operation(plan, baseline.relativePath).action, "replace-pristine-project");
  assert.equal(conflict(plan, baseline.relativePath), undefined);
  assert.deepEqual(snapshotTree(target), before);
  assert.equal(fs.existsSync(path.join(target, ".ai-os", "lanes", "default", "lane.toml")), false);
});

test("fresh-lane classification reuses the inventory destination snapshot", () => {
  const target = path.join(temporaryRoot(), "target");
  const options = defaultOptions();
  const laneRelativePath = ".ai-os/lanes/default/lane.toml";
  const baselineRelativePath = (
    `.ai-os/lanes/default/baseline-log/${options.bootstrap.file}`
  );
  const lanePath = writeTargetFile(target, laneRelativePath, "USER LANE\n");
  writeTargetFile(target, baselineRelativePath, "FOREIGN BASELINE\n");
  const originalLstatSync = fs.lstatSync;
  const originalReadFileSync = fs.readFileSync;
  let laneSnapshotCaptured = false;
  let postSnapshotInspections = 0;
  let plan;

  fs.lstatSync = function lstatSync(file, ...args) {
    if (laneSnapshotCaptured && path.resolve(file) === lanePath) {
      postSnapshotInspections += 1;
    }
    return originalLstatSync.call(this, file, ...args);
  };
  fs.readFileSync = function readFileSync(file, ...args) {
    const bytes = originalReadFileSync.call(this, file, ...args);
    if (!laneSnapshotCaptured && path.resolve(file) === lanePath) {
      laneSnapshotCaptured = true;
      fs.unlinkSync(lanePath);
    }
    return bytes;
  };
  try {
    plan = buildInstallPlan(target, options);
  } finally {
    fs.lstatSync = originalLstatSync;
    fs.readFileSync = originalReadFileSync;
  }

  assert.equal(laneSnapshotCaptured, true);
  assert.equal(postSnapshotInspections, 0);
  assert.equal(operation(plan, laneRelativePath).action, "preserve");
  assert.equal(operation(plan, baselineRelativePath).action, "preserve");
  assert.deepEqual(plan.conflicts, []);
});

test("project template marker match does not replace edited rendered bytes", () => {
  const target = materializePlanFixture(buildInstallPlan(
    path.join(temporaryRoot(), "unused-target"),
    defaultOptions(),
  ));
  const laneToml = path.join(target, ".ai-os", "lanes", "default", "lane.toml");
  fs.appendFileSync(laneToml, "# USER EDIT retaining all template markers\n");

  const plan = buildInstallPlan(target, defaultOptions({ force: true }));

  assert.equal(operation(plan, ".ai-os/lanes/default/lane.toml").action, "preserve");
});

test("custom AGENTS is a manual-merge conflict on normal and force plans", () => {
  const target = path.join(temporaryRoot(), "target");
  writeTargetFile(target, "AGENTS.md", "FOREIGN CONSTITUTION\n");
  const before = snapshotTree(target);

  for (const force of [false, true]) {
    const plan = buildInstallPlan(target, defaultOptions({ force }));
    assert.equal(operation(plan, "AGENTS.md").action, "conflict");
    assert.match(conflict(plan, "AGENTS.md").reason, /manual merge/i);
    assert.deepEqual(snapshotTree(target), before);
  }
});

test("an explicitly compatible AGENTS hash may be upgraded", () => {
  const target = path.join(temporaryRoot(), "target");
  const legacy = "KNOWN LEGACY CONSTITUTION\n";
  writeTargetFile(target, "AGENTS.md", legacy);

  const plan = buildInstallPlan(target, defaultOptions({
    compatibleHashes: new Map([["AGENTS.md", new Set([sha256(legacy)])]]),
  }));

  assert.equal(operation(plan, "AGENTS.md").action, "replace-pristine-project");
  assert.equal(conflict(plan, "AGENTS.md"), undefined);
});

test("custom existing team config is preserved without a recognized managed state", () => {
  const target = path.join(temporaryRoot(), "target");
  writeTargetFile(target, ".gitignore", "dist/\n.env\n");
  writeTargetFile(target, ".gitattributes", "*.png binary\n");

  const plan = buildInstallPlan(target, defaultOptions({ force: true }));

  assert.equal(operation(plan, ".gitignore").action, "preserve");
  assert.equal(operation(plan, ".gitattributes").action, "preserve");
});

test("a non-directory destination parent produces conflicts without mutation", () => {
  const target = path.join(temporaryRoot(), "target");
  writeTargetFile(target, ".ai-os/bin", "NOT A DIRECTORY\n");
  const before = snapshotTree(target);

  const plan = buildInstallPlan(target, defaultOptions());

  assert.ok(plan.conflicts.some((candidate) => candidate.relativePath.startsWith(".ai-os/bin/")));
  assert.ok(plan.operations.some((candidate) => (
    candidate.relativePath.startsWith(".ai-os/bin/") && candidate.action === "conflict"
  )));
  assert.deepEqual(snapshotTree(target), before);
});

test("unsupported existing framework metadata is a conflict without mutation", () => {
  const target = path.join(temporaryRoot(), "target");
  writeTargetFile(target, ".ai-os/framework.toml", [
    'schema_version = "999"',
    'layout_version = "999"',
    'layout_mode = "unknown"',
    "",
  ].join("\n"));
  const before = snapshotTree(target);

  const plan = buildInstallPlan(target, defaultOptions());

  assert.equal(operation(plan, ".ai-os/framework.toml").action, "conflict");
  assert.match(conflict(plan, ".ai-os/framework.toml").reason, /unsupported metadata/i);
  assert.deepEqual(snapshotTree(target), before);
});

test("a missing packaged source is a conflict and planning stays read-only", () => {
  const sourceRoot = copiedSourceRoot();
  fs.unlinkSync(path.join(sourceRoot, "VERSION"));
  const target = path.join(temporaryRoot(), "not-created-yet");

  const plan = buildInstallPlan(target, defaultOptions({ sourceRoot }));

  assert.equal(operation(plan, ".ai-os/bin/VERSION").action, "conflict");
  assert.match(conflict(plan, ".ai-os/bin/VERSION").reason, /packaged source.*missing/i);
  assert.equal(fs.existsSync(target), false);
});

test("a linked packaged source is a conflict and is never followed", () => {
  const sourceRoot = copiedSourceRoot();
  const source = path.join(sourceRoot, "docs", "artifacts.md");
  const outside = path.join(temporaryRoot(), "outside.md");
  fs.writeFileSync(outside, "OUTSIDE SENTINEL\n");
  fs.unlinkSync(source);
  fs.symlinkSync(outside, source, "file");
  const target = path.join(temporaryRoot(), "not-created-yet");

  const plan = buildInstallPlan(target, defaultOptions({ sourceRoot }));

  assert.equal(operation(plan, ".ai-os/reference/artifacts.md").action, "conflict");
  assert.match(conflict(plan, ".ai-os/reference/artifacts.md").reason, /symbolic link|junction/i);
  assert.equal(fs.readFileSync(outside, "utf8"), "OUTSIDE SENTINEL\n");
  assert.equal(fs.existsSync(target), false);
});

test("a source override cannot bypass a linked packaged source", () => {
  const sourceRoot = copiedSourceRoot();
  const sourcePath = "docs/artifacts.md";
  const source = path.join(sourceRoot, ...sourcePath.split("/"));
  const outside = path.join(temporaryRoot(), "outside.md");
  fs.writeFileSync(outside, "OUTSIDE SENTINEL\n");
  fs.unlinkSync(source);
  fs.symlinkSync(outside, source, "file");

  const plan = buildInstallPlan(
    path.join(temporaryRoot(), "not-created-yet"),
    defaultOptions({
      sourceRoot,
      sourceOverrides: { [sourcePath]: "OVERRIDE BYTES\n" },
    }),
  );

  assert.equal(operation(plan, ".ai-os/reference/artifacts.md").action, "conflict");
  assert.match(conflict(plan, ".ai-os/reference/artifacts.md").reason, /symbolic link|junction/i);
  assert.equal(fs.readFileSync(outside, "utf8"), "OUTSIDE SENTINEL\n");
});

test("a packaged source with the wrong executable class is a conflict", {
  skip: process.platform === "win32" ? "POSIX executable bits are not portable on Windows" : false,
}, () => {
  const sourceRoot = copiedSourceRoot();
  fs.chmodSync(path.join(sourceRoot, "VERSION"), 0o755);

  const plan = buildInstallPlan(
    path.join(temporaryRoot(), "not-created-yet"),
    defaultOptions({ sourceRoot }),
  );

  assert.equal(operation(plan, ".ai-os/bin/VERSION").action, "conflict");
  assert.match(conflict(plan, ".ai-os/bin/VERSION").reason, /source mode/i);
});

test("a source override cannot bypass a packaged source with the wrong mode", {
  skip: process.platform === "win32" ? "POSIX executable bits are not portable on Windows" : false,
}, () => {
  const sourceRoot = copiedSourceRoot();
  fs.chmodSync(path.join(sourceRoot, "VERSION"), 0o755);

  const plan = buildInstallPlan(
    path.join(temporaryRoot(), "not-created-yet"),
    defaultOptions({
      sourceRoot,
      sourceOverrides: { VERSION: "OVERRIDE VERSION\n" },
    }),
  );

  assert.equal(operation(plan, ".ai-os/bin/VERSION").action, "conflict");
  assert.match(conflict(plan, ".ai-os/bin/VERSION").reason, /source mode/i);
});

test("a source override cannot bypass a non-regular packaged source", () => {
  const sourceRoot = copiedSourceRoot();
  const version = path.join(sourceRoot, "VERSION");
  fs.unlinkSync(version);
  fs.mkdirSync(version);

  const plan = buildInstallPlan(
    path.join(temporaryRoot(), "not-created-yet"),
    defaultOptions({
      sourceRoot,
      sourceOverrides: { VERSION: "OVERRIDE VERSION\n" },
    }),
  );

  assert.equal(operation(plan, ".ai-os/bin/VERSION").action, "conflict");
  assert.match(conflict(plan, ".ai-os/bin/VERSION").reason, /not a regular file/i);
});

test("recognized obsolete framework bytes are planned for removal", () => {
  const target = path.join(temporaryRoot(), "target");
  const legacy = "PRISTINE V10 SHARED\n";
  writeTargetFile(target, ".ai-os/bin/shared.js", legacy);

  const plan = buildInstallPlan(target, defaultOptions({
    obsoleteFrameworkHashes: {
      ".ai-os/bin/shared.js": [sha256(legacy)],
    },
  }));

  const obsolete = operation(plan, ".ai-os/bin/shared.js");
  assert.equal(obsolete.action, "remove-framework");
  assert.equal(obsolete.ownership, OWNERSHIP.FRAMEWORK);
  assert.equal(obsolete.previousHash, sha256(legacy));
});

test("unknown obsolete framework bytes are a conflict and are never deleted", () => {
  const target = path.join(temporaryRoot(), "target");
  writeTargetFile(target, ".ai-os/bin/shared.js", "CUSTOM SHARED\n");
  const before = snapshotTree(target);

  const plan = buildInstallPlan(target, defaultOptions({
    obsoleteFrameworkHashes: {
      ".ai-os/bin/shared.js": [sha256("PRISTINE V10 SHARED\n")],
    },
  }));

  assert.equal(operation(plan, ".ai-os/bin/shared.js").action, "conflict");
  assert.match(conflict(plan, ".ai-os/bin/shared.js").reason, /unrecognized obsolete framework/i);
  assert.deepEqual(snapshotTree(target), before);
});

test("duplicate rendered destinations raise a stable planner error", () => {
  const duplicate = {
    ...FILE_SPECS["AGENTS.md"],
    source: "framework/.agents/templates/root/AGENTS.md",
  };

  assert.throws(
    () => buildInstallPlan(path.join(temporaryRoot(), "target"), defaultOptions({
      fileSpecs: [FILE_SPECS["AGENTS.md"], duplicate],
    })),
    (error) => (
      error instanceof InstallPlannerError
      && error.code === "ERR_INSTALL_PLANNER"
      && /duplicate destination: AGENTS[.]md/.test(error.message)
    ),
  );
});

test("unknown ownership raises a stable planner error", () => {
  const descriptor = {
    ...FILE_SPECS["AGENTS.md"],
    ownership: "foreign",
  };

  assert.throws(
    () => buildInstallPlan(path.join(temporaryRoot(), "target"), defaultOptions({
      fileSpecs: [descriptor],
    })),
    (error) => (
      error instanceof InstallPlannerError
      && error.code === "ERR_INSTALL_PLANNER"
      && /unknown ownership.*foreign/.test(error.message)
    ),
  );
});

for (const [label, clock] of [
  ["null", null],
  ["string", "2026-07-10T12:34:56.789Z"],
]) {
  test(`a ${label} clock fails closed before filesystem writes`, () => {
    assertPlannerFailureWithoutWrites(clock, {
      clock: true,
      message: /clock must be a function/i,
    });
  });
}

for (const [label, value] of [
  ["string result", "2026-07-10T12:34:56.789Z"],
  ["plain fake Date", { toISOString: () => "2026-07-10T12:34:56.789Z" }],
]) {
  test(`a clock ${label} is rejected without trusting toISOString`, () => {
    assertPlannerFailureWithoutWrites(() => value, {
      clock: true,
      message: /clock must return a valid Date/i,
      causeType: TypeError,
    });
  });
}

test("an Invalid Date clock result fails closed", () => {
  assertPlannerFailureWithoutWrites(() => new Date(Number.NaN), {
    clock: true,
    message: /clock must return a valid Date/i,
  });
});

test("an extended-year Date clock result is not a canonical bootstrap timestamp", () => {
  assertPlannerFailureWithoutWrites(() => new Date(Date.UTC(10_000, 0, 1)), {
    clock: true,
    message: /four-digit UTC year/i,
  });
});

test("a throwing clock is wrapped once with the original cause", () => {
  const cause = new Error("injected clock failure");
  let calls = 0;
  assertPlannerFailureWithoutWrites(() => {
    calls += 1;
    throw cause;
  }, {
    clock: true,
    message: /clock failed/i,
    cause,
    causeProvided: true,
  });
  assert.equal(calls, 1);
});

for (const [label, cause] of [
  ["null", null],
  ["false", false],
  ["zero", 0],
  ["empty string", ""],
  ["undefined", undefined],
]) {
  test(`a clock throwing ${label} preserves the explicit cause`, () => {
    assertPlannerFailureWithoutWrites(() => {
      throw cause;
    }, {
      clock: true,
      message: /clock failed/i,
      cause,
      causeProvided: true,
    });
  });
}

for (const [label, bootstrap, message] of [
  [
    "non-canonical ID",
    {
      id: "BL-20260710-123456-Bootstrap-Unconfirmed",
      file: "BL-20260710-123456-Bootstrap-Unconfirmed.md",
      date: "2026-07-10T12:34:56.789Z",
    },
    /bootstrap[.]id must match/i,
  ],
  [
    "mismatched filename",
    {
      id: "BL-20260710-123456-bootstrap-unconfirmed",
      file: "BL-20260710-123456-other.md",
      date: "2026-07-10T12:34:56.789Z",
    },
    /bootstrap[.]file must equal/i,
  ],
  [
    "non-canonical date",
    {
      id: "BL-20260710-123456-bootstrap-unconfirmed",
      file: "BL-20260710-123456-bootstrap-unconfirmed.md",
      date: "2026-07-10T12:34:56Z",
    },
    /bootstrap[.]date must be canonical/i,
  ],
  [
    "impossible calendar date",
    {
      id: "BL-20260228-123456-bootstrap-unconfirmed",
      file: "BL-20260228-123456-bootstrap-unconfirmed.md",
      date: "2026-02-30T12:34:56.789Z",
    },
    /bootstrap[.]date must be canonical/i,
  ],
  [
    "extended-year date",
    {
      id: "BL-99991231-235959-bootstrap-unconfirmed",
      file: "BL-99991231-235959-bootstrap-unconfirmed.md",
      date: "+010000-01-01T00:00:00.000Z",
    },
    /bootstrap[.]date must be canonical/i,
  ],
  [
    "ID/date second mismatch",
    {
      id: "BL-20260710-123456-bootstrap-unconfirmed",
      file: "BL-20260710-123456-bootstrap-unconfirmed.md",
      date: "2026-07-10T12:34:57.789Z",
    },
    /bootstrap[.]date must match bootstrap[.]id/i,
  ],
]) {
  test(`an explicit bootstrap rejects a ${label}`, () => {
    assertPlannerFailureWithoutWrites(bootstrap, { message });
  });
}

test("invalid internal planner seams raise stable planner errors", () => {
  const target = path.join(temporaryRoot(), "target");
  const agents = FILE_SPECS["AGENTS.md"];
  const cases = [
    ["", defaultOptions(), /targetDir must be a non-empty string/],
    [target, defaultOptions({ bootstrap: null }), /bootstrap must be an object/],
    [target, defaultOptions({ bootstrap: { id: "", file: "BL.md", date: "date" } }), /bootstrap[.]id/],
    [target, defaultOptions({
      bootstrap: {
        id: "BL-20260710-000000-valid",
        file: "nested/BL-20260710-000000-valid.md",
        date: "2026-07-10T00:00:00.000Z",
      },
    }), /bootstrap[.]file/],
    [target, defaultOptions({ compatibleHashes: [] }), /compatibleHashes must be a Map or plain object/],
    [target, defaultOptions({ compatibleHashes: { "AGENTS.md": {} } }), /must contain hashes/],
    [target, defaultOptions({ compatibleHashes: { "AGENTS.md": ["not-a-hash"] } }), /invalid SHA-256 hash/],
    [target, defaultOptions({ sourceOverrides: { [agents.source]: 42 } }), /must be bytes, a string, or null/],
    [target, defaultOptions({ fileSpecs: [null] }), /descriptor must be an object/],
    [target, defaultOptions({ fileSpecs: [{ ...agents, type: "dir" }] }), /unsupported source type/],
    [target, defaultOptions({ fileSpecs: [{ ...agents, mode: 0o600 }] }), /unsupported mode/],
    [target, defaultOptions({ fileSpecs: [{ ...agents, generated: "yes" }] }), /generated metadata must be boolean/],
    [target, defaultOptions({ fileSpecs: [{ ...agents, generated: true }] }), /generated source must be null/],
    [target, defaultOptions({ fileSpecs: [{ ...agents, source: "../outside" }] }), /not a normalized relative path/],
    [target, defaultOptions({ fileSpecs: {} }), /fileSpecs must be an array/],
    [target, defaultOptions({ obsoleteFrameworkHashes: { "AGENTS.md": [] } }), /obsolete path is still current/],
  ];

  for (const [candidateTarget, options, message] of cases) {
    assert.throws(
      () => buildInstallPlan(candidateTarget, options),
      (error) => (
        error instanceof InstallPlannerError
        && error.code === "ERR_INSTALL_PLANNER"
        && message.test(error.message)
      ),
    );
  }
});

test("an invalid target root becomes a read-only conflict plan", () => {
  const target = path.join(temporaryRoot(), "target-file");
  fs.writeFileSync(target, "TARGET SENTINEL\n");
  const before = fs.readFileSync(target);

  const plan = buildInstallPlan(target, defaultOptions());

  assert.ok(plan.conflicts.length > 0);
  assert.ok(plan.operations.every((candidate) => candidate.action === "conflict"));
  assert.deepEqual(fs.readFileSync(target), before);
});

test("materializePlanFixture writes only create operations", () => {
  const plan = {
    operations: [
      {
        relativePath: "created.txt",
        action: "create",
        content: Buffer.from("CREATED\n"),
        mode: 0o644,
      },
      {
        relativePath: "replaced.txt",
        action: "replace-framework",
        content: Buffer.from("REPLACED\n"),
        mode: 0o644,
      },
    ],
  };

  const target = materializePlanFixture(plan);

  assert.equal(fs.readFileSync(path.join(target, "created.txt"), "utf8"), "CREATED\n");
  assert.equal(fs.existsSync(path.join(target, "replaced.txt")), false);
});

test("materialized fixture owner is registered for automatic cleanup", { concurrency: false }, () => {
  materializedProbeTarget = materializePlanFixture({ operations: [] });
  assert.equal(fs.existsSync(materializedProbeTarget), false);
  fs.mkdirSync(materializedProbeTarget, { recursive: true });
});

test("materialized fixture cleanup runs after its owning test", { concurrency: false }, () => {
  try {
    assert.equal(fs.existsSync(materializedProbeTarget), false);
  } finally {
    cleanup(path.dirname(materializedProbeTarget));
    materializedProbeTarget = null;
  }
});
