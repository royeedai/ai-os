"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  FILE_SPECS,
  OWNERSHIP,
  PROJECT_FILES,
  SESSION_FILES,
  sha256,
} = require("../bin/doctor-shared");
const {
  InstallConflictError,
  InstallFilesystemError,
  InstallPlannerError,
  buildInstallPlan,
  createDefaultFsOps,
  executeInstallPlan,
  installProject,
} = require("../bin/installer");
const { snapshotTree } = require("./fixtures");
const {
  assert,
  cleanup,
  listBaselineRecords,
  test,
  tmpDir,
} = require("./helpers");

const INITIAL_DATE = "2026-07-10T12:34:56.789Z";
const INITIAL_ID = "BL-20260710-123456-bootstrap-unconfirmed";
const INITIAL_FILE = `${INITIAL_ID}.md`;
const CURRENT_DATE = "2026-07-11T01:02:03.000Z";
const CURRENT_ID = "BL-20260711-010203-confirmed-delivery";
const CURRENT_FILE = `${CURRENT_ID}.md`;

function installedPath(target, relativePath) {
  return path.join(target, ...relativePath.split("/"));
}

function renderedManagedPaths(baselineFile) {
  return [...PROJECT_FILES, ...SESSION_FILES].map((relativePath) => (
    relativePath.replace("{{INITIAL_BASELINE_FILE}}", baselineFile)
  ));
}

function writeSentinel(absolutePath, label, mode) {
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `SENTINEL ${label}\n`);
  fs.chmodSync(absolutePath, mode);
}

function operation(plan, relativePath) {
  return plan.operations.find((candidate) => candidate.relativePath === relativePath);
}

function replaceBaselinePointer(target, baselineId) {
  const lanePath = installedPath(target, ".ai-os/lanes/default/lane.toml");
  const content = fs.readFileSync(lanePath, "utf8");
  fs.writeFileSync(
    lanePath,
    content.replace(/^baseline_id = "[^"]+"$/m, `baseline_id = "${baselineId}"`),
  );
}

function captureConflict(callback) {
  try {
    callback();
  } catch (error) {
    assert.ok(error instanceof InstallConflictError);
    assert.equal(error.code, "ERR_INSTALL_CONFLICT");
    return error;
  }
  assert.fail("expected install conflict");
}

function assertConflictAt(error, relativePath, reason) {
  const found = error.conflicts.find((candidate) => candidate.relativePath === relativePath);
  assert.ok(found, `expected conflict at ${relativePath}`);
  assert.match(found.reason, reason);
}

function progressedLaneFixture() {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  installProject(target, { clock: () => new Date(INITIAL_DATE) });

  const initialRecordPath = installedPath(
    target,
    `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`,
  );
  const currentRecordPath = installedPath(
    target,
    `.ai-os/lanes/default/baseline-log/${CURRENT_FILE}`,
  );
  const currentRecord = fs.readFileSync(initialRecordPath, "utf8")
    .split(INITIAL_ID).join(CURRENT_ID)
    .split(INITIAL_DATE).join(CURRENT_DATE)
    .replace("- **Type**: bootstrap", "- **Type**: baseline")
    .replace("- **Status**: unconfirmed", "- **Status**: confirmed");
  fs.writeFileSync(currentRecordPath, currentRecord, { mode: 0o640 });
  fs.writeFileSync(
    installedPath(target, ".ai-os/lanes/default/baseline-log/CR-20260710-235959-scope.md"),
    "# CR-20260710-235959-scope\n\n- **Status**: applied\n",
    { mode: 0o600 },
  );
  replaceBaselinePointer(target, CURRENT_ID);
  fs.chmodSync(initialRecordPath, 0o600);
  fs.chmodSync(currentRecordPath, 0o640);
  return { root, target };
}

function protectedProgressSnapshot(target) {
  const managed = new Set(renderedManagedPaths(CURRENT_FILE).filter((item) => item !== "AGENTS.md"));
  const prefixes = [
    ".ai-os/lanes/default/baseline-log/",
    ".ai-os/lanes/default/risk-register.md",
    ".ai-os/lanes/default/release-plan.md",
    ".ai-os/lanes/default/verification-matrix.yaml",
    ".ai-os/lanes/default/specs/",
    ".ai-os/lanes/default/design-pack/",
    ".ai-os/lanes/default/evals/",
    ".ai-os/lanes/other/",
    ".ai-os/lanes/default/user/",
  ];
  return new Map([...snapshotTree(target)].filter(([relativePath]) => (
    managed.has(relativePath)
    || prefixes.some((prefix) => relativePath === prefix.slice(0, -1)
      || relativePath.startsWith(prefix))
  )));
}

function throwingClock(counter) {
  return () => {
    counter.calls += 1;
    throw new Error("existing lane must not sample the clock");
  };
}

function assertManifestBaselineRow(target, baselineFile) {
  const rows = fs.readFileSync(installedPath(target, ".ai-os/managed-files.tsv"), "utf8")
    .split("\n")
    .filter((line) => line.startsWith(".ai-os/lanes/default/baseline-log/"));
  assert.deepEqual(rows, [
    `.ai-os/lanes/default/baseline-log/${baselineFile}\tfile\tproject\t`,
  ]);
}

function assertOnlyPathChanged(before, after, relativePath) {
  assert.deepEqual([...after.keys()], [...before.keys()], "no lock, temp, or managed path is added");
  for (const [candidate, entry] of before) {
    if (candidate === relativePath) {
      assert.notDeepEqual(after.get(candidate), entry, `${relativePath} carries the external mutation`);
    } else {
      assert.deepEqual(after.get(candidate), entry, `${candidate} remains unchanged`);
    }
  }
}

test("reinstall and force preserve every project, session, and on-demand path", () => {
  const target = fs.realpathSync.native(tmpDir());
  try {
    const initial = installProject(target, { clock: () => new Date(INITIAL_DATE) });
    assert.equal(initial.baselineId, INITIAL_ID);
    const [baselineFile] = listBaselineRecords(target);

    let index = 0;
    for (const relativePath of renderedManagedPaths(baselineFile)) {
      if (relativePath === "AGENTS.md") continue;
      const absolutePath = installedPath(target, relativePath);
      if (relativePath === ".ai-os/lanes/default/lane.toml") {
        fs.appendFileSync(absolutePath, "# SENTINEL lane truth remains parseable\n");
        fs.chmodSync(absolutePath, 0o600);
      } else {
        writeSentinel(absolutePath, relativePath, index % 2 === 0 ? 0o600 : 0o640);
      }
      index += 1;
    }

    for (const [relativePath, content, mode] of [
      [".ai-os/lanes/default/risk-register.md", "risk sentinel\n", 0o600],
      [".ai-os/lanes/default/release-plan.md", "release sentinel\n", 0o640],
      [".ai-os/lanes/default/verification-matrix.yaml", "verification: sentinel\n", 0o600],
      [".ai-os/lanes/default/specs/contracts/nested.md", "spec sentinel\n", 0o640],
      [".ai-os/lanes/default/design-pack/reverse/nested.md", "design sentinel\n", 0o600],
      [".ai-os/lanes/default/evals/cases/nested.yaml", "eval: sentinel\n", 0o640],
      [".ai-os/lanes/default/user/unknown/nested.txt", "unknown sentinel\n", 0o600],
    ]) {
      const absolutePath = installedPath(target, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content);
      fs.chmodSync(absolutePath, mode);
    }

    const before = snapshotTree(target);
    let clockCalls = 0;
    const throwingClock = () => {
      clockCalls += 1;
      throw new Error("existing lane must not sample the clock");
    };

    const normal = installProject(target, { clock: throwingClock });
    assert.equal(normal.baselineId, INITIAL_ID);
    assert.equal(clockCalls, 0);
    assert.deepEqual(snapshotTree(target), before, "normal reinstall is tree-identical");

    const force = installProject(target, {
      force: true,
      clock: throwingClock,
      bootstrap: {
        id: "BL-20300102-030405-other-bootstrap",
        file: "BL-20300102-030405-other-bootstrap.md",
        date: "2030-01-02T03:04:05.000Z",
      },
    });
    assert.equal(force.baselineId, INITIAL_ID);
    assert.equal(clockCalls, 0);
    assert.deepEqual(snapshotTree(target), before, "force reinstall is tree-identical");

    const invalidOverrides = installProject(target, { bootstrap: null, clock: null });
    assert.equal(invalidOverrides.baselineId, INITIAL_ID);
    assert.deepEqual(snapshotTree(target), before, "existing lane ignores invalid bootstrap seams");
    assert.deepEqual(listBaselineRecords(target), [baselineFile]);
  } finally {
    cleanup(target);
  }
});

test("progressed lane reuses its confirmed baseline and preserves all history", () => {
  const { root, target } = progressedLaneFixture();
  try {
    for (const [relativePath, content, mode] of [
      [".ai-os/lanes/default/risk-register.md", "risk progressed\n", 0o600],
      [".ai-os/lanes/default/release-plan.md", "release progressed\n", 0o640],
      [".ai-os/lanes/default/verification-matrix.yaml", "verification: progressed\n", 0o600],
      [".ai-os/lanes/default/specs/nested/contract.md", "spec progressed\n", 0o640],
      [".ai-os/lanes/default/design-pack/nested/reverse.md", "design progressed\n", 0o600],
      [".ai-os/lanes/default/evals/nested/case.yaml", "eval: progressed\n", 0o640],
      [".ai-os/lanes/other/unknown.txt", "other lane\n", 0o600],
      [".ai-os/lanes/default/user/unknown.txt", "unknown user file\n", 0o640],
    ]) {
      const absolutePath = installedPath(target, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content);
      fs.chmodSync(absolutePath, mode);
    }
    const original = protectedProgressSnapshot(target);
    const counter = { calls: 0 };

    const normal = installProject(target, { clock: throwingClock(counter) });
    assert.equal(normal.baselineId, CURRENT_ID);
    assert.equal(counter.calls, 0);
    assert.deepEqual(protectedProgressSnapshot(target), original);
    assertManifestBaselineRow(target, CURRENT_FILE);
    assert.deepEqual(listBaselineRecords(target), [
      INITIAL_FILE,
      CURRENT_FILE,
      "CR-20260710-235959-scope.md",
    ]);

    const force = installProject(target, { force: true, clock: throwingClock(counter) });
    assert.equal(force.baselineId, CURRENT_ID);
    assert.equal(counter.calls, 0);
    assert.deepEqual(protectedProgressSnapshot(target), original);
    assertManifestBaselineRow(target, CURRENT_FILE);
    assert.deepEqual(listBaselineRecords(target), [
      INITIAL_FILE,
      CURRENT_FILE,
      "CR-20260710-235959-scope.md",
    ]);
  } finally {
    cleanup(root);
  }
});

test("normal and force plans preserve the same existing project and session paths", () => {
  const { root, target } = progressedLaneFixture();
  try {
    const counter = { calls: 0 };
    const normal = buildInstallPlan(target, { clock: throwingClock(counter) });
    const force = buildInstallPlan(target, { force: true, clock: throwingClock(counter) });
    const normalActions = new Map(normal.operations
      .filter((candidate) => [OWNERSHIP.PROJECT, OWNERSHIP.SESSION].includes(candidate.ownership))
      .map((candidate) => [candidate.relativePath, candidate.action]));
    const forceActions = new Map(force.operations
      .filter((candidate) => [OWNERSHIP.PROJECT, OWNERSHIP.SESSION].includes(candidate.ownership))
      .map((candidate) => [candidate.relativePath, candidate.action]));

    assert.equal(counter.calls, 0);
    assert.deepEqual(forceActions, normalActions);
    for (const [relativePath, action] of normalActions) {
      if (relativePath === "AGENTS.md") continue;
      assert.equal(action, "preserve", relativePath);
    }
    assert.equal(operation(normal, `.ai-os/lanes/default/baseline-log/${CURRENT_FILE}`).action, "preserve");
  } finally {
    cleanup(root);
  }
});

test("current baseline record is preserve even when its bytes equal the rendered template", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date("2026-07-10T12:34:56.000Z") });
    const counter = { calls: 0 };
    const plan = buildInstallPlan(target, { force: true, clock: throwingClock(counter) });

    assert.equal(counter.calls, 0);
    assert.equal(
      operation(plan, `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`).action,
      "preserve",
    );
  } finally {
    cleanup(root);
  }
});

test("current AGENTS bytes and user-selected mode are preserved on reinstall and force", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const agentsPath = installedPath(target, "AGENTS.md");
    fs.chmodSync(agentsPath, 0o600);
    const before = snapshotTree(target).get("AGENTS.md");
    const counter = { calls: 0 };

    for (const force of [false, true]) {
      const plan = buildInstallPlan(target, { force, clock: throwingClock(counter) });
      assert.equal(operation(plan, "AGENTS.md").action, "preserve");
      const result = executeInstallPlan(plan);
      assert.equal(result.baselineId, INITIAL_ID);
      assert.deepEqual(snapshotTree(target).get("AGENTS.md"), before);
    }
    assert.equal(counter.calls, 0);
  } finally {
    cleanup(root);
  }
});

test("existing lane invariants cannot be removed by a trimmed source inventory", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const counter = { calls: 0 };
    const valid = buildInstallPlan(target, {
      clock: throwingClock(counter),
      fileSpecs: [],
    });
    assert.equal(valid.baselineId, INITIAL_ID);
    assert.equal(operation(valid, ".ai-os/lanes/default/lane.toml").action, "preserve");
    assert.equal(
      operation(valid, `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`).action,
      "preserve",
    );
    for (const relativePath of [
      ".ai-os/lanes/default/lane.toml",
      `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`,
      "AGENTS.md",
      ".ai-os/lanes/default/STATE.md",
    ]) {
      const bytes = fs.readFileSync(installedPath(target, relativePath));
      assert.throws(
        () => buildInstallPlan(target, {
          fileSpecs: [],
          obsoleteFrameworkHashes: { [relativePath]: [sha256(bytes)] },
        }),
        (error) => (
          error instanceof InstallPlannerError
          && error.code === "ERR_INSTALL_PLANNER"
          && /obsolete path is still current/i.test(error.message)
        ),
      );
    }

    const lanePath = installedPath(target, ".ai-os/lanes/default/lane.toml");
    const originalLane = fs.readFileSync(lanePath, "utf8");
    fs.writeFileSync(lanePath, originalLane.replace(INITIAL_ID, "not-a-baseline"));
    const malformed = buildInstallPlan(target, {
      clock: throwingClock(counter),
      fileSpecs: [],
    });
    assert.equal(malformed.baselineId, null);
    assert.deepEqual(
      malformed.operations.map((candidate) => candidate.relativePath),
      [".ai-os/lanes/default/lane.toml"],
    );
    assert.doesNotMatch(JSON.stringify(malformed), /BL-19700101|invalid-existing-lane/);
    assertConflictAt(
      new InstallConflictError(malformed.conflicts),
      ".ai-os/lanes/default/lane.toml",
      /canonical/i,
    );

    fs.writeFileSync(lanePath, originalLane);
    fs.unlinkSync(installedPath(
      target,
      `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`,
    ));
    const missing = buildInstallPlan(target, {
      clock: throwingClock(counter),
      fileSpecs: [],
    });
    assertConflictAt(
      new InstallConflictError(missing.conflicts),
      `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`,
      /missing/i,
    );
    assert.equal(counter.calls, 0);
  } finally {
    cleanup(root);
  }
});

test("obsolete hashes cannot delete on-demand data before planner rejection", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  const relativePath = ".ai-os/lanes/default/risk-register.md";
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    writeSentinel(installedPath(target, relativePath), "risk must remain project data", 0o600);
    const before = snapshotTree(root);
    const counter = { calls: 0 };

    assert.throws(
      () => installProject(target, {
        clock: throwingClock(counter),
        fileSpecs: [],
        obsoleteFrameworkHashes: {
          [relativePath]: [sha256("SENTINEL risk must remain project data\n")],
        },
      }),
      (error) => (
        error instanceof InstallPlannerError
        && error.code === "ERR_INSTALL_PLANNER"
        && /obsolete framework path.*allowed namespace/i.test(error.message)
      ),
    );

    assert.equal(counter.calls, 0);
    assert.deepEqual(snapshotTree(root), before);
  } finally {
    cleanup(root);
  }
});

for (const [label, descriptor] of [
  [
    "lane truth",
    {
      ...FILE_SPECS[".ai-os/lanes/default/lane.toml"],
      ownership: OWNERSHIP.FRAMEWORK,
    },
  ],
  [
    "current baseline",
    {
      path: `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`,
      type: "file",
      ownership: OWNERSHIP.FRAMEWORK,
      mode: 0o644,
      source: "framework/.agents/templates/lane/baseline-log/BL-template.md",
      generated: false,
    },
  ],
]) {
  test(`framework descriptor cannot claim existing ${label}`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      installProject(target, { clock: () => new Date(INITIAL_DATE) });
      const before = snapshotTree(root);
      const counter = { calls: 0 };

      assert.throws(
        () => installProject(target, {
          force: true,
          clock: throwingClock(counter),
          fileSpecs: [descriptor],
        }),
        (error) => (
          error instanceof InstallPlannerError
          && error.code === "ERR_INSTALL_PLANNER"
          && /canonical ownership.*project/i.test(error.message)
        ),
      );

      assert.equal(counter.calls, 0);
      assert.deepEqual(snapshotTree(root), before);
    } finally {
      cleanup(root);
    }
  });
}

test("custom project descriptor preserves the current record and cannot recreate it", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  const relativePath = `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`;
  const descriptor = {
    path: relativePath,
    type: "file",
    ownership: OWNERSHIP.PROJECT,
    mode: 0o644,
    source: "framework/.agents/templates/lane/baseline-log/BL-template.md",
    generated: false,
  };
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const counter = { calls: 0 };
    const plan = buildInstallPlan(target, {
      clock: throwingClock(counter),
      fileSpecs: [descriptor],
    });
    assert.equal(operation(plan, relativePath).ownership, OWNERSHIP.PROJECT);
    assert.equal(operation(plan, relativePath).action, "preserve");

    fs.unlinkSync(installedPath(target, relativePath));
    const before = snapshotTree(root);
    const error = captureConflict(() => installProject(target, {
      clock: throwingClock(counter),
      fileSpecs: [descriptor],
    }));
    assertConflictAt(error, relativePath, /current baseline record is missing/i);
    assert.equal(counter.calls, 0);
    assert.deepEqual(snapshotTree(root), before);
  } finally {
    cleanup(root);
  }
});

for (const [label, mutate, reason] of [
  [
    "missing baseline declaration",
    (content) => content.replace(/^baseline_id = .*\n/m, ""),
    /exactly one baseline_id/i,
  ],
  [
    "malformed baseline ID",
    (content) => content.replace(/^baseline_id = .*$/m, 'baseline_id = "not-a-baseline"'),
    /canonical (?:baseline_id|BL identifier)/i,
  ],
  [
    "duplicate baseline ID",
    (content) => `${content}baseline_id = "${INITIAL_ID}"\n`,
    /exactly one baseline_id/i,
  ],
  [
    "two different canonical baseline IDs",
    (content) => `${content}baseline_id = "BL-20260711-010203-other"\n`,
    /exactly one baseline_id/i,
  ],
  [
    "malformed duplicate baseline declaration",
    (content) => `${content}baseline_id = '${INITIAL_ID}'\n`,
    /exactly one baseline_id/i,
  ],
  [
    "section-only baseline key",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      `[other]\nbaseline_id = "${INITIAL_ID}"`,
    ),
    /exactly one baseline_id.*root/i,
  ],
  [
    "multiline-string baseline text",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      `note = """\nbaseline_id = "${INITIAL_ID}"\n"""`,
    ),
    /exactly one baseline_id.*root/i,
  ],
  [
    "unterminated basic string before baseline text",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      `note = "unterminated\nbaseline_id = "${INITIAL_ID}"`,
    ),
    /unterminated basic string/i,
  ],
  [
    "unterminated literal string before baseline text",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      `note = 'unterminated\nbaseline_id = "${INITIAL_ID}"`,
    ),
    /unterminated literal string/i,
  ],
  [
    "literal multiline-string baseline text",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      `note = '''\nbaseline_id = "${INITIAL_ID}"\n'''`,
    ),
    /exactly one baseline_id.*root/i,
  ],
  [
    "quoted root baseline duplicate",
    (content) => `${content}"baseline_id" = "BL-20260711-010203-other"\n`,
    /exactly one baseline_id.*root/i,
  ],
  [
    "literal-quoted root baseline duplicate",
    (content) => `${content}'baseline_id' = "BL-20260711-010203-other"\n`,
    /exactly one baseline_id.*root/i,
  ],
  [
    "escaped quoted root baseline duplicate",
    (content) => `${content}"\\u0062aseline_id" = "BL-20260711-010203-other"\n`,
    /exactly one baseline_id.*root/i,
  ],
  [
    "invalid quoted root key escape",
    (content) => `${content}"baseline\\q_id" = "other"\n`,
    /invalid escape.*quoted root key/i,
  ],
  [
    "invalid quoted root key Unicode escape",
    (content) => `${content}"baseline\\uZZZZ_id" = "other"\n`,
    /invalid Unicode escape.*quoted root key/i,
  ],
  [
    "invalid quoted root key Unicode scalar",
    (content) => `${content}"\\uD800aseline_id" = "other"\n`,
    /invalid Unicode scalar.*quoted root key/i,
  ],
  [
    "malformed quoted root key",
    (content) => `${content}"baseline_id" nope = "other"\n`,
    /malformed quoted root key/i,
  ],
  [
    "CR pointer",
    (content) => content.replace(/^baseline_id = .*$/m, 'baseline_id = "CR-20260710-123456-change"'),
    /canonical (?:baseline_id|BL identifier)/i,
  ],
  [
    "uppercase baseline slug",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      'baseline_id = "BL-20260710-123456-Confirmed"',
    ),
    /canonical (?:baseline_id|BL identifier)/i,
  ],
  [
    "unsafe baseline slug",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      'baseline_id = "BL-20260710-123456-../../outside"',
    ),
    /canonical (?:baseline_id|BL identifier)/i,
  ],
  [
    "retrospective pointer",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      'baseline_id = "BL-20260710-123456-retrospective"',
    ),
    /retrospective/i,
  ],
  [
    "impossible calendar timestamp",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      'baseline_id = "BL-20260230-123456-confirmed"',
    ),
    /canonical UTC second/i,
  ],
  [
    "impossible clock timestamp",
    (content) => content.replace(
      /^baseline_id = .*$/m,
      'baseline_id = "BL-20260710-246099-confirmed"',
    ),
    /canonical UTC second/i,
  ],
]) {
  test(`existing lane rejects ${label} before writes`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      installProject(target, { clock: () => new Date(INITIAL_DATE) });
      const lanePath = installedPath(target, ".ai-os/lanes/default/lane.toml");
      fs.writeFileSync(lanePath, mutate(fs.readFileSync(lanePath, "utf8")));
      const before = snapshotTree(root);
      const counter = { calls: 0 };

      const error = captureConflict(() => installProject(target, {
        force: true,
        clock: throwingClock(counter),
      }));

      assertConflictAt(error, ".ai-os/lanes/default/lane.toml", reason);
      assert.deepEqual(
        error.conflicts.map((candidate) => candidate.relativePath),
        [".ai-os/lanes/default/lane.toml"],
      );
      assert.equal(counter.calls, 0);
      assert.doesNotMatch(
        `${error.message}\n${JSON.stringify(error.conflicts)}`,
        /BL-19700101|invalid-existing-lane/,
      );
      assert.deepEqual(snapshotTree(root), before);
    } finally {
      cleanup(root);
    }
  });
}

test("baseline_id comments are ignored and a CRLF canonical declaration is accepted", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const lanePath = installedPath(target, ".ai-os/lanes/default/lane.toml");
    const content = fs.readFileSync(lanePath, "utf8").replaceAll("\n", "\r\n");
    fs.writeFileSync(lanePath, [
      '# baseline_id = "ignored"',
      content.trimEnd(),
      'note = "baseline_id = \\"BL-20300101-000000-ignored\\""',
      "",
    ].join("\r\n"));
    const before = fs.readFileSync(lanePath);
    const counter = { calls: 0 };

    const result = installProject(target, { clock: throwingClock(counter) });

    assert.equal(result.baselineId, INITIAL_ID);
    assert.equal(counter.calls, 0);
    assert.deepEqual(fs.readFileSync(lanePath), before);
  } finally {
    cleanup(root);
  }
});

test("a root baseline pointer remains authoritative over same-named section keys", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const lanePath = installedPath(target, ".ai-os/lanes/default/lane.toml");
    fs.appendFileSync(lanePath, [
      "[other]",
      'baseline_id = "BL-20260711-010203-section-value"',
      "",
    ].join("\n"));
    const before = fs.readFileSync(lanePath);
    const counter = { calls: 0 };

    const result = installProject(target, { clock: throwingClock(counter) });

    assert.equal(result.baselineId, INITIAL_ID);
    assert.equal(counter.calls, 0);
    assert.deepEqual(fs.readFileSync(lanePath), before);
  } finally {
    cleanup(root);
  }
});

for (const [label, mutate, reason] of [
  [
    "missing",
    (recordPath) => fs.unlinkSync(recordPath),
    /current baseline record is missing/i,
  ],
  [
    "a directory",
    (recordPath) => {
      fs.unlinkSync(recordPath);
      fs.mkdirSync(recordPath);
    },
    /not a regular file/i,
  ],
  [
    "a symlink",
    (recordPath, root) => {
      const outside = path.join(root, "outside-baseline.md");
      fs.writeFileSync(outside, "OUTSIDE BASELINE\n");
      fs.unlinkSync(recordPath);
      fs.symlinkSync(outside, recordPath, "file");
    },
    /symbolic link|junction/i,
  ],
]) {
  test(`existing lane rejects a current baseline record that is ${label}`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    const relativePath = `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`;
    try {
      installProject(target, { clock: () => new Date(INITIAL_DATE) });
      mutate(installedPath(target, relativePath), root);
      const before = snapshotTree(root);
      const counter = { calls: 0 };

      const error = captureConflict(() => installProject(target, {
        force: true,
        clock: throwingClock(counter),
      }));

      assertConflictAt(error, relativePath, reason);
      assert.equal(counter.calls, 0);
      assert.deepEqual(snapshotTree(root), before);
    } finally {
      cleanup(root);
    }
  });
}

test("existing lane rejects a baseline-log parent symlink without touching outside bytes", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const baselineLog = installedPath(target, ".ai-os/lanes/default/baseline-log");
    const outside = path.join(root, "outside-baseline-log");
    fs.renameSync(baselineLog, outside);
    fs.symlinkSync(outside, baselineLog, "dir");
    const before = snapshotTree(root);
    const counter = { calls: 0 };

    const error = captureConflict(() => installProject(target, {
      force: true,
      clock: throwingClock(counter),
    }));

    assertConflictAt(
      error,
      `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`,
      /symbolic link|junction/i,
    );
    assert.equal(counter.calls, 0);
    assert.deepEqual(snapshotTree(root), before);
  } finally {
    cleanup(root);
  }
});

test("existing lane rejects an unsafe lane.toml symlink before writes", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const lanePath = installedPath(target, ".ai-os/lanes/default/lane.toml");
    const outside = path.join(root, "outside-lane.toml");
    fs.writeFileSync(outside, `baseline_id = "${INITIAL_ID}"\n`);
    fs.unlinkSync(lanePath);
    fs.symlinkSync(outside, lanePath, "file");
    const before = snapshotTree(root);
    const counter = { calls: 0 };

    const error = captureConflict(() => installProject(target, {
      clock: throwingClock(counter),
    }));

    assertConflictAt(error, ".ai-os/lanes/default/lane.toml", /symbolic link|junction/i);
    assert.equal(counter.calls, 0);
    assert.deepEqual(snapshotTree(root), before);
  } finally {
    cleanup(root);
  }
});

for (const force of [false, true]) {
  test(`foreign AGENTS blocks a fresh ${force ? "force " : ""}install byte-identically`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      fs.mkdirSync(target);
      fs.writeFileSync(installedPath(target, "AGENTS.md"), "FOREIGN CONSTITUTION\n", {
        mode: 0o600,
      });
      writeSentinel(installedPath(target, "user/nested.txt"), "unknown fresh path", 0o640);
      const before = snapshotTree(root);

      const error = captureConflict(() => installProject(target, {
        force,
        clock: () => new Date(INITIAL_DATE),
      }));

      assertConflictAt(error, "AGENTS.md", /manual merge/i);
      assert.deepEqual(snapshotTree(root), before);
    } finally {
      cleanup(root);
    }
  });
}

test("foreign AGENTS blocks normal and force reinstall without sampling the clock", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    fs.writeFileSync(installedPath(target, "AGENTS.md"), "CUSTOM CONSTITUTION\n", {
      mode: 0o600,
    });
    const before = snapshotTree(root);
    const counter = { calls: 0 };

    for (const force of [false, true]) {
      const error = captureConflict(() => installProject(target, {
        force,
        clock: throwingClock(counter),
      }));
      assertConflictAt(error, "AGENTS.md", /manual merge/i);
      assert.deepEqual(snapshotTree(root), before);
    }
    assert.equal(counter.calls, 0);
  } finally {
    cleanup(root);
  }
});

test("an explicitly recognized AGENTS may refresh without changing other project state", () => {
  const root = fs.realpathSync.native(tmpDir());
  const target = path.join(root, "target");
  try {
    installProject(target, { clock: () => new Date(INITIAL_DATE) });
    const agentsPath = installedPath(target, "AGENTS.md");
    const originalAgents = fs.readFileSync(agentsPath);
    const baselineBefore = fs.readFileSync(
      installedPath(target, `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`),
    );
    const laneBefore = fs.readFileSync(installedPath(target, ".ai-os/lanes/default/lane.toml"));
    const counter = { calls: 0 };

    const result = installProject(target, {
      clock: throwingClock(counter),
      compatibleHashes: { "AGENTS.md": [sha256(originalAgents)] },
      sourceOverrides: {
        "framework/.agents/templates/root/AGENTS.md": "RECOGNIZED CONSTITUTION REFRESH\n",
      },
    });

    assert.equal(result.baselineId, INITIAL_ID);
    assert.equal(counter.calls, 0);
    assert.equal(fs.readFileSync(agentsPath, "utf8"), "RECOGNIZED CONSTITUTION REFRESH\n");
    assert.deepEqual(
      fs.readFileSync(installedPath(target, `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`)),
      baselineBefore,
    );
    assert.deepEqual(fs.readFileSync(installedPath(target, ".ai-os/lanes/default/lane.toml")), laneBefore);
  } finally {
    cleanup(root);
  }
});

for (const [label, relativePath] of [
  ["lane truth", ".ai-os/lanes/default/lane.toml"],
  ["current baseline record", `.ai-os/lanes/default/baseline-log/${INITIAL_FILE}`],
]) {
  test(`${label} mutation after planning is rejected before staging`, () => {
    const root = fs.realpathSync.native(tmpDir());
    const target = path.join(root, "target");
    try {
      installProject(target, { clock: () => new Date(INITIAL_DATE) });
      const plan = buildInstallPlan(target, {
        bootstrap: {
          id: INITIAL_ID,
          file: INITIAL_FILE,
          date: INITIAL_DATE,
        },
      });
      assert.equal(operation(plan, relativePath).action, "preserve");
      const before = snapshotTree(root);
      const base = createDefaultFsOps();
      let mutated = false;
      let stageOpens = 0;
      const fsOps = {
        ...base,
        open(absolutePath, ...args) {
          if (absolutePath.includes(".ai-os-install-stage-")) stageOpens += 1;
          const fd = base.open(absolutePath, ...args);
          if (!mutated && absolutePath === path.join(target, ".ai-os-install.lock")) {
            mutated = true;
            fs.appendFileSync(installedPath(target, relativePath), "EXTERNAL MUTATION\n");
          }
          return fd;
        },
      };

      assert.throws(
        () => executeInstallPlan(plan, { fsOps }),
        (error) => (
          error instanceof InstallFilesystemError
          && error.phase === "revalidate preserve"
          && error.relativePath === relativePath
          && /changed after planning/i.test(error.message)
        ),
      );

      assert.equal(mutated, true);
      assert.equal(stageOpens, 0);
      assertOnlyPathChanged(before, snapshotTree(root), path.posix.join("target", relativePath));
    } finally {
      cleanup(root);
    }
  });
}
