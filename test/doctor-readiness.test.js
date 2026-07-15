#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const doctor = require("../bin/ai-os-doctor");
const shared = require("../bin/doctor-shared");
const { installProject } = require("../bin/installer");
const {
  afterEach,
  assert,
  cleanup,
  test,
  tmpDir,
} = require("./helpers");

const INSTALL_TIME = "2026-07-11T01:00:00.000Z";
const CONFIRMED_TIME = "2026-07-11T02:00:00.000Z";
const OBSERVED_TIME = "2026-07-11T03:00:00.000Z";
const FIXED_NOW = "2026-07-11T04:00:00.000Z";
const CONFIRMED_ID = "BL-20260711-020000-confirmed";
const roots = new Set();

afterEach(() => {
  cleanup(...roots);
  roots.clear();
});

function temporaryRoot() {
  const root = fs.realpathSync.native(tmpDir());
  roots.add(root);
  return root;
}

function fixturePath(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function installedFixture() {
  const root = temporaryRoot();
  installProject(root, { clock: () => new Date(INSTALL_TIME) });
  return root;
}

function replaceToml(root, key, value) {
  const file = fixturePath(root, ".ai-os/lanes/default/lane.toml");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(
      new RegExp(`^${key} = "[^"]*"$`, "m"),
      `${key} = "${value}"`,
    ),
  );
}

function replaceMissionMirror(root, label, value) {
  const file = fixturePath(root, ".ai-os/lanes/default/MISSION.md");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(
      new RegExp(`^(- \\*\\*${label}[^：]*：).*?$`, "m"),
      `$1${value}`,
    ),
  );
}

function replaceStateMirror(root, label, value) {
  const file = fixturePath(root, ".ai-os/lanes/default/STATE.md");
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace(
      new RegExp(`^(- \\*\\*${label}[^：]*：).*?$`, "m"),
      `$1${value}`,
    ),
  );
}

function runGit(root, args) {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function tasksYaml({
  gitSha = "",
  title = "Implement and verify",
  approval = false,
  observedAt = OBSERVED_TIME,
  scopeMode = "change",
} = {}) {
  const terminal = Boolean(gitSha);
  const approvalBlock = approval
    ? `      required: true
      status: approved
      decided_by: "Alice"
      decided_at: "${CONFIRMED_TIME}"
      baseline_id: "${CONFIRMED_ID}"
      approved_scope:
        - "default"
      conditions: []
      evidence_ref: "approval.md"`
    : `      required: false
      status: not-required
      decided_by: ""
      decided_at: ""
      baseline_id: "${CONFIRMED_ID}"
      approved_scope: []
      conditions: []
      evidence_ref: ""`;
  const evidence = terminal
    ? `
      - id: "test-log"
        kind: test
        command: "npm test"
        exit_code: 0
        git_sha: "${gitSha}"
        environment: "node-22 / local"
        observed_at: "${observedAt}"
        artifact: "artifacts/test.log"
        confidence: observed`
    : " []";
  return `version: 5
baseline_id: "${CONFIRMED_ID}"
scope:
  mode: "${scopeMode}"
  focus: "default"
  baseline_source: "lane MISSION.md"
milestones:
  - id: M1
    title: "Verified"
    goal: "Deliver the accepted change"
tasks:
  - id: TASK-001
    title: "${title}"
    milestone: M1
    status: ${terminal ? "done" : "todo"}
    owner: Alice
    priority: P1
    approval:
${approvalBlock}
    depends_on: []
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    evidence_produced:${evidence}
    delivery_state:
      code: ${terminal ? "observed" : "unknown"}
      data: not-applicable
      runtime: not-applicable
    change_scope:
      - "src/example.js"
`;
}

function confirmedReadyFixture({ governance = "G0", approval = false } = {}) {
  const root = installedFixture();
  const laneToml = fixturePath(root, ".ai-os/lanes/default/lane.toml");
  const bootstrapId = fs.readFileSync(laneToml, "utf8")
    .match(/^baseline_id = "([^"]+)"$/m)[1];
  replaceToml(root, "baseline_id", CONFIRMED_ID);
  replaceToml(root, "quality_tier", governance === "G2" ? "strict" : "exploratory");
  replaceToml(root, "risk_tier", governance === "G2" ? "high" : "low");
  replaceToml(root, "governance_tier", governance);
  for (const [label, value] of [
    ["当前基线 ID", CONFIRMED_ID],
    ["当前质量档位", governance === "G2" ? "strict" : "exploratory"],
    ["当前风险档位", governance === "G2" ? "high" : "low"],
    ["当前治理档位", governance],
  ]) {
    replaceMissionMirror(root, label, value);
    replaceStateMirror(root, label, value);
  }
  fs.writeFileSync(
    fixturePath(root, `.ai-os/lanes/default/baseline-log/${CONFIRMED_ID}.md`),
    confirmedRecord({ previousId: bootstrapId }),
  );
  fs.writeFileSync(fixturePath(root, ".ai-os/lanes/default/tasks.yaml"), tasksYaml({ approval }));
  if (governance === "G2") {
    fs.writeFileSync(
      fixturePath(root, ".ai-os/lanes/default/risk-register.md"),
      [
        "# Risk Register",
        "",
        "| ID | Risk | Impact | Mitigation | Status |",
        "|---|---|---|---|---|",
        "| R-001 | Delivery drift | High | Run gates | open |",
        "",
      ].join("\n"),
    );
    fs.writeFileSync(
      fixturePath(root, ".ai-os/lanes/default/verification-matrix.yaml"),
      [
        "impact_rules:",
        "  - when: \"shared contract changes\"",
        "    run: \"npm test\"",
        "failure_modes:",
        "  - id: delivery-drift",
        "    scenario: \"Delivery state diverges\"",
        "    expected: \"Doctor blocks readiness\"",
        "    guard: \"npm test\"",
        "",
      ].join("\n"),
    );
  }
  runGit(root, ["init", "-q"]);
  runGit(root, ["config", "user.name", "AI-OS Test"]);
  runGit(root, ["config", "user.email", "ai-os@example.invalid"]);
  runGit(root, ["add", "--all"]);
  runGit(root, ["commit", "-qm", "confirmed baseline"]);
  const observedSha = runGit(root, ["rev-parse", "HEAD"]);
  fs.writeFileSync(
    fixturePath(root, ".ai-os/lanes/default/tasks.yaml"),
    tasksYaml({ gitSha: observedSha, approval }),
  );
  runGit(root, ["add", ".ai-os/lanes/default/tasks.yaml"]);
  runGit(root, ["commit", "-qm", "record evidence"]);
  return { root, observedSha };
}

function issue(report, code, laneId = "default") {
  return report.issues.find((item) => item.code === code && item.lane_id === laneId);
}

function confirmedRecord({ id = CONFIRMED_ID, previousId } = {}) {
  return [
    `# ${id}`,
    "",
    "- **Type**: baseline",
    "- **Status**: confirmed",
    `- **previous_baseline_id**: ${previousId}`,
    "- **confirmed_by**: Alice",
    `- **confirmed_at**: ${CONFIRMED_TIME}`,
    "- **source_refs**:",
    "  - MISSION.md",
    "  - DESIGN.md",
    "",
    "## Notes",
    "",
    "- **Type**: change",
  ].join("\n");
}

function validTasksDocument() {
  return shared.parseCanonicalYaml(`version: 5
baseline_id: "${CONFIRMED_ID}"
scope:
  mode: "change"
  focus: "default"
  baseline_source: "lane MISSION.md"
milestones:
  - id: M1
    title: "Verified"
    goal: "Deliver the accepted change"
tasks:
  - id: TASK-001
    title: "Implement and verify"
    milestone: M1
    status: done
    owner: Alice
    priority: P1
    approval:
      required: false
      status: not-required
      decided_by: ""
      decided_at: ""
      baseline_id: "${CONFIRMED_ID}"
      approved_scope: []
      conditions: []
      evidence_ref: ""
    depends_on: []
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "test-log"
    evidence_produced:
      - id: "test-log"
        kind: test
        command: "npm test"
        exit_code: 0
        git_sha: "${"a".repeat(40)}"
        environment: "node-22 / local"
        observed_at: "${OBSERVED_TIME}"
        artifact: "artifacts/test.log"
        confidence: observed
    delivery_state:
      code: observed
      data: not-applicable
      runtime: not-applicable
    change_scope:
      - "src/example.js"
`);
}

test("Task 4 exports the deterministic readiness interfaces", () => {
  for (const [object, name] of [
    [shared, "GovernanceValidationError"],
    [shared, "parseBaselineRecord"],
    [shared, "extractDesignAcceptanceIds"],
    [shared, "validateTasksV5"],
    [shared, "projectTasksForEvidence"],
    [doctor, "createLocalGitRunner"],
    [doctor, "resolveGitState"],
    [doctor, "resolveEvidenceGitEnvelope"],
  ]) {
    assert.equal(typeof object[name], name.endsWith("Error") ? "function" : "function", name);
  }
});

test("Task 5 exports strict managed-block and gitignore rule interfaces", () => {
  for (const name of ["parseManagedBlock", "parseEffectiveGitignoreRules", "isPathIgnored"]) {
    assert.equal(typeof shared[name], "function", name);
  }
});

test("managed blocks require one ordered marker pair", () => {
  const begin = "# BEGIN AI-OS";
  const end = "# END AI-OS";
  assert.deepEqual(
    shared.parseManagedBlock(`user\n${begin}\n.ai-os/lanes/*/STATE.md\n${end}\n`, begin, end),
    [".ai-os/lanes/*/STATE.md"],
  );
  for (const content of [
    "user only\n",
    `${begin}\nrule\n`,
    `${begin}\n${begin}\nrule\n${end}\n`,
    `${end}\n${begin}\n`,
  ]) {
    assert.throws(
      () => shared.parseManagedBlock(content, begin, end),
      shared.GovernanceValidationError,
    );
  }
});

test("gitignore rules honor comments, escaped markers, wildcards, and ordered negation", () => {
  const rules = shared.parseEffectiveGitignoreRules([
    "# .ai-os/lanes/*/STATE.md",
    "/.ai-os/lanes/**/STATE.md",
    "!.ai-os/lanes/default/STATE.md",
    "\\#literal",
    "\\!literal",
    "build/",
    "",
  ].join("\n"));
  assert.deepEqual(rules, [
    "/.ai-os/lanes/**/STATE.md",
    "!.ai-os/lanes/default/STATE.md",
    "\\#literal",
    "\\!literal",
    "build/",
  ]);
  assert.equal(shared.isPathIgnored(rules, ".ai-os/lanes/release/STATE.md"), true);
  assert.equal(shared.isPathIgnored(rules, ".ai-os/lanes/default/STATE.md"), false);
  assert.equal(shared.isPathIgnored(rules, "nested/build/output.js"), true);
  assert.equal(shared.isPathIgnored(rules, "#literal"), true);
  assert.equal(shared.isPathIgnored(rules, "!literal"), true);
});

test("doctor rejects inactive comments and later STATE negations", () => {
  for (const mutate of [
    (content) => content.replace(
      ".ai-os/lanes/*/STATE.md",
      "# .ai-os/lanes/*/STATE.md",
    ),
    (content) => `${content}!.ai-os/lanes/default/STATE.md\n`,
  ]) {
    const root = installedFixture();
    const ignorePath = path.join(root, ".gitignore");
    fs.writeFileSync(ignorePath, mutate(fs.readFileSync(ignorePath, "utf8")));
    const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
    assert.ok(report.issues.some((item) => item.code === "W041"));
  }
});

test("doctor reports malformed managed blocks as structural errors", () => {
  const root = installedFixture();
  const ignorePath = path.join(root, ".gitignore");
  fs.writeFileSync(
    ignorePath,
    fs.readFileSync(ignorePath, "utf8").replace("# END AI-OS\n", ""),
  );
  const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
  assert.equal(report.layout_ok, false);
  assert.ok(report.issues.some((item) => item.code === "E003" && item.lane_id === null));
});

test("present on-demand artifacts fail closed on wrong type or malformed schema", () => {
  const cases = [
    {
      path: "risk-register.md",
      content: [
        "# Risk Register",
        "",
        "| ID | Risk | Impact | Mitigation | Status |",
        "|---|---|---|---|---|",
        "| R-001 | one | high | guard | open |",
        "| R-001 | duplicate | high | guard | open |",
        "",
      ].join("\n"),
    },
    { path: "release-plan.md", content: "# Release Plan\n\n## Release intent\n\n- publish\n" },
    { path: "verification-matrix.yaml", content: "impact_rules: []\n" },
    { path: "specs/example.spec.md", content: "# Example Spec\n\nNo contract headings.\n" },
    {
      path: "design-pack/parity-map.md",
      content: [
        "# Parity Map",
        "## Capture manifest",
        "- source",
        "## Visual parity",
        "- match",
        "## Interaction parity",
        "- match",
        "## API parity",
        "- match",
        "## Evidence",
        "| ID | Reference | Confidence |",
        "|---|---|---|",
        "| E-001 | screenshot.png | guessed |",
        "",
      ].join("\n"),
    },
    {
      path: "evals/case.md",
      content: "---\nscenario: \"case\"\ntrigger_source: manual\n---\n# Case\n",
    },
  ];
  for (const fixture of cases) {
    const root = installedFixture();
    const relative = `.ai-os/lanes/default/${fixture.path}`;
    fs.mkdirSync(path.dirname(fixturePath(root, relative)), { recursive: true });
    fs.writeFileSync(fixturePath(root, relative), fixture.content);
    const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
    assert.equal(report.layout_ok, false, fixture.path);
    assert.ok(
      report.issues.some((item) => (
        item.code === "E003"
        && item.lane_id === "default"
        && item.path === relative
      )),
      fixture.path,
    );
  }

  const root = installedFixture();
  fs.writeFileSync(fixturePath(root, ".ai-os/lanes/default/specs"), "wrong type\n");
  const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
  assert.ok(report.issues.some((item) => (
    item.code === "E022"
    && item.path === ".ai-os/lanes/default/specs"
  )));
});

test("present eval oracle accepts the v11 machine-readable schema", () => {
  const root = installedFixture();
  const evalDir = fixturePath(root, ".ai-os/lanes/default/evals");
  fs.mkdirSync(evalDir, { recursive: true });
  fs.writeFileSync(path.join(evalDir, "case.md"), [
    "---",
    "oracle_version: 1",
    'framework_version: "11.0.0"',
    "trigger_source: manual",
    'first_baseline_id: ""',
    "risk_source: delivery-governance",
    "failure_mode: bounded-case",
    "harm: wrong-work",
    "artifact_gate: MISSION",
    "---",
    "# Eval: Bounded Case",
    "## Input",
    "A bounded case.",
    "## Expected decisions",
    "- DECISION: Continue safely.",
    "## Forbidden actions",
    "- FORBID: Invent evidence.",
    "## Required artifact deltas",
    "- DELTA: none — no trigger exists.",
    "## Minimum evidence",
    "- EVIDENCE: Observed result.",
    "## Framework change targets",
    "- TARGET: AGENTS.md — behavior rule.",
    "",
  ].join("\n"));

  const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
  assert.equal(report.layout_ok, true);
  assert.ok(!report.issues.some((item) => item.path.endsWith("evals/case.md")));
});

test("parseBaselineRecord enforces the first-H1 record boundary and ignores H2 examples", () => {
  const previousId = "BL-20260711-010000-bootstrap-unconfirmed";
  const parsed = shared.parseBaselineRecord(
    confirmedRecord({ previousId }),
    `${CONFIRMED_ID}.md`,
  );
  assert.equal(parsed.id, CONFIRMED_ID);
  assert.equal(parsed.type, "baseline");
  assert.equal(parsed.status, "confirmed");
  assert.equal(parsed.previous_baseline_id, previousId);
  assert.equal(parsed.confirmed_at, CONFIRMED_TIME);
  assert.deepEqual(parsed.source_refs, ["MISSION.md", "DESIGN.md"]);

  assert.throws(
    () => shared.parseBaselineRecord(
      confirmedRecord({ id: "BL-20260711-020000-other", previousId }),
      `${CONFIRMED_ID}.md`,
    ),
    (error) => error instanceof shared.GovernanceValidationError && /filename|record id/i.test(error.message),
  );
});

test("DESIGN acceptance extraction ignores decoys and returns the canonical live ID set", () => {
  const design = `# Design

\`\`\`
## 9. 验收标准
| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-999 | REQ-X | decoy | decoy | decoy |
\`\`\`

## 9. 验收标准

<!-- | AC-998 | REQ-X | decoy | decoy | decoy | -->
| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | accepted | npm test | test.log |
| AC-002 | REQ-002 | accepted too | manual | review.md |

## 10. Other
| AC-997 | REQ-X | decoy | decoy | decoy |
`;
  assert.deepEqual(shared.extractDesignAcceptanceIds(design), ["AC-001", "AC-002"]);
});

test("validateTasksV5 freezes exact schema and evidence projection", () => {
  const normalized = shared.validateTasksV5(validTasksDocument(), {
    acceptanceIds: ["AC-001"],
  });
  assert.equal(normalized.version, 5);
  assert.equal(normalized.tasks[0].id, "TASK-001");
  assert.deepEqual(normalized.tasks[0].evidence_required, ["test-log"]);
  const projection = shared.projectTasksForEvidence(normalized);
  assert.equal(Object.hasOwn(projection.tasks[0], "status"), false);
  assert.equal(Object.hasOwn(projection.tasks[0], "evidence_produced"), false);
  assert.equal(Object.hasOwn(projection.tasks[0], "delivery_state"), false);

  const malformed = validTasksDocument();
  malformed.tasks[0].extra = true;
  assert.throws(
    () => shared.validateTasksV5(malformed, { acceptanceIds: ["AC-001"] }),
    (error) => error instanceof shared.GovernanceValidationError && /task.*keys|extra/i.test(error.message),
  );
});

test("declared human identities reject reserved names and control characters", () => {
  for (const identity of ["Codex", "Alice\nBot"]) {
    const document = validTasksDocument();
    Object.assign(document.tasks[0].approval, {
      required: true,
      status: "approved",
      decided_by: identity,
      decided_at: CONFIRMED_TIME,
      approved_scope: ["default"],
      evidence_ref: "approval.md",
    });
    assert.throws(
      () => shared.validateTasksV5(document, { acceptanceIds: ["AC-001"] }),
      (error) => error instanceof shared.GovernanceValidationError && /human identity|reserved/i.test(error.message),
      identity,
    );
  }
});

test("fresh install is layout-valid, readiness-false, and makes zero Git calls", () => {
  const root = installedFixture();
  const calls = [];
  const report = doctor.inspectProject(root, {
    now: () => new Date(FIXED_NOW),
    runGit(request) {
      calls.push(request);
      throw new Error("fresh install must not invoke Git");
    },
  });
  assert.equal(report.layout_ok, true);
  assert.equal(report.ok, true);
  assert.equal(report.delivery_ready, false);
  assert.equal(report.lanes.default.delivery_ready, false);
  for (const code of ["R001", "R002", "R020"]) {
    const found = issue(report, code);
    assert.ok(found, code);
    assert.equal(found.level, "info");
    assert.equal(found.severity, "info");
  }
  assert.equal(calls.length, 0);

  const strict = doctor.inspectProject(root, {
    strict: true,
    now: () => new Date(FIXED_NOW),
    runGit() { throw new Error("strict fresh install must not invoke Git"); },
  });
  assert.equal(strict.ok, false);
  const { ok: normalOk, ...normalComparable } = report;
  const { ok: strictOk, ...strictComparable } = strict;
  assert.equal(normalOk, true);
  assert.equal(strictOk, false);
  assert.deepEqual(strictComparable, normalComparable);
});

test("tier floor rejects under-governance and allows higher governance", () => {
  for (const fixture of [
    { quality: "strict", risk: "low", governance: "G1", readyTier: false },
    { quality: "standard", risk: "high", governance: "G1", readyTier: false },
    { quality: "exploratory", risk: "low", governance: "G2", readyTier: true },
  ]) {
    const root = installedFixture();
    for (const [key, value] of [
      ["quality_tier", fixture.quality],
      ["risk_tier", fixture.risk],
      ["governance_tier", fixture.governance],
    ]) replaceToml(root, key, value);
    replaceMissionMirror(root, "当前质量档位", fixture.quality);
    replaceMissionMirror(root, "当前风险档位", fixture.risk);
    replaceMissionMirror(root, "当前治理档位", fixture.governance);
    const report = doctor.inspectProject(root, {
      now: () => new Date(FIXED_NOW),
      runGit() { throw new Error("bootstrap lane must not invoke Git"); },
    });
    assert.equal(Boolean(issue(report, "R002")), !fixture.readyTier, JSON.stringify(fixture));
  }
});

test("local Git runner fixes argv/environment and never enables shell", () => {
  const invocations = [];
  const runner = doctor.createLocalGitRunner({
    monotonicNow: () => 100,
    spawnSyncImpl(executable, args, options) {
      invocations.push({ executable, args, options });
      return {
        status: 0,
        signal: null,
        stdout: Buffer.from("true\n"),
        stderr: Buffer.alloc(0),
      };
    },
  });
  const result = runner({
    operation: "inside-work-tree",
    cwd: process.cwd(),
    args: ["rev-parse", "--is-inside-work-tree"],
    maxOutputBytes: 64 * 1024,
  });
  assert.equal(result.state, "completed");
  assert.equal(invocations.length, 1);
  const invocation = invocations[0];
  assert.equal(invocation.executable, "git");
  assert.equal(invocation.options.shell, false);
  assert.equal(invocation.options.encoding, null);
  assert.equal(invocation.options.env.GIT_NO_LAZY_FETCH, "1");
  assert.equal(invocation.options.env.GIT_OPTIONAL_LOCKS, "0");
  assert.equal(invocation.options.env.GIT_TERMINAL_PROMPT, "0");
  assert.equal(invocation.options.env.GIT_NO_REPLACE_OBJECTS, "1");
  assert.equal(invocation.options.env.GIT_CONFIG_NOSYSTEM, "1");
  assert.equal(invocation.options.env.GIT_CONFIG_GLOBAL, os.devNull);
  assert.equal(invocation.options.env.GIT_GRAFT_FILE, os.devNull);
  assert.equal(invocation.options.env.LC_ALL, "C");
  assert.equal(invocation.options.env.TZ, "UTC");
  assert.equal(Object.isExtensible(invocation.options.env), true);
  assert.equal(Object.hasOwn(invocation.options.env, "GIT_DIR"), false);
  assert.deepEqual(invocation.args.slice(0, 8), [
    "--no-pager",
    "-c", "core.fsmonitor=false",
    "-c", "core.untrackedCache=false",
    "-c", "protocol.allow=never",
    "-C",
  ]);
});

test("resolveGitState supports a real SHA-1 worktree and reports dirty state", () => {
  const root = temporaryRoot();
  assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
  assert.equal(spawnSync("git", ["-C", root, "config", "user.name", "AI-OS Test"]).status, 0);
  assert.equal(spawnSync("git", ["-C", root, "config", "user.email", "ai-os@example.invalid"]).status, 0);
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  assert.equal(spawnSync("git", ["-C", root, "add", "README.md"]).status, 0);
  assert.equal(spawnSync("git", ["-C", root, "commit", "-qm", "fixture"]).status, 0);
  const clean = doctor.resolveGitState(root);
  assert.equal(clean.state, "available", JSON.stringify(clean));
  assert.equal(clean.repository.object_format, "sha1");
  assert.match(clean.repository.head_sha, /^[a-f0-9]{40}$/);
  assert.equal(clean.repository.dirty, false);
  fs.writeFileSync(path.join(root, "untracked.txt"), "dirty\n");
  assert.equal(doctor.resolveGitState(root).repository.dirty, true);
});

test("resolveGitState preserves a nested project's repository-relative prefix", () => {
  const root = temporaryRoot();
  const project = path.join(root, "packages", "app");
  fs.mkdirSync(project, { recursive: true });
  assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
  assert.equal(spawnSync("git", ["-C", root, "config", "user.name", "AI-OS Test"]).status, 0);
  assert.equal(spawnSync("git", ["-C", root, "config", "user.email", "ai-os@example.invalid"]).status, 0);
  fs.writeFileSync(path.join(project, "README.md"), "fixture\n");
  assert.equal(spawnSync("git", ["-C", root, "add", "packages/app/README.md"]).status, 0);
  assert.equal(spawnSync("git", ["-C", root, "commit", "-qm", "fixture"]).status, 0);
  const state = doctor.resolveGitState(project);
  assert.equal(state.state, "available", JSON.stringify(state));
  assert.equal(state.repository.root, root);
  assert.equal(state.repository.project_prefix, "packages/app/");
});

test("resolveGitState selects full SHA-256 object IDs when supported", (context) => {
  const root = temporaryRoot();
  const initialized = spawnSync("git", ["init", "-q", "--object-format=sha256", root]);
  if (initialized.status !== 0) {
    context.skip("local Git does not support SHA-256 repositories");
    return;
  }
  runGit(root, ["config", "user.name", "AI-OS Test"]);
  runGit(root, ["config", "user.email", "ai-os@example.invalid"]);
  fs.writeFileSync(path.join(root, "README.md"), "fixture\n");
  runGit(root, ["add", "README.md"]);
  runGit(root, ["commit", "-qm", "fixture"]);
  const state = doctor.resolveGitState(root);
  assert.equal(state.state, "available", JSON.stringify(state));
  assert.equal(state.repository.object_format, "sha256");
  assert.match(state.repository.head_sha, /^[a-f0-9]{64}$/);
});

test("local Git runner maps failures to stable reasons without exposing stderr", () => {
  const runner = doctor.createLocalGitRunner({
    monotonicNow: () => 100,
    spawnSyncImpl() {
      return {
        error: Object.assign(new Error("secret stderr"), { code: "ETIMEDOUT" }),
        status: null,
        signal: "SIGTERM",
        stdout: Buffer.alloc(0),
        stderr: Buffer.from("attacker controlled"),
      };
    },
  });
  const result = runner({
    operation: "inside-work-tree",
    cwd: process.cwd(),
    args: ["rev-parse", "--is-inside-work-tree"],
    maxOutputBytes: 1024,
  });
  assert.deepEqual(result, { state: "unavailable", reason: "command-timeout" });
  assert.equal(JSON.stringify(result).includes("attacker"), false);
});

test("evidence Git envelope rejects non-list observed commits without throwing", () => {
  assert.deepEqual(
    doctor.resolveEvidenceGitEnvelope(process.cwd(), "default", null),
    { state: "unavailable", reason: "invalid-observed-commits" },
  );
});

test("a confirmed assessed lane with evidence-only history is delivery-ready", () => {
  const { root } = confirmedReadyFixture();
  let clockCalls = 0;
  const report = doctor.inspectProject(root, {
    now() {
      clockCalls += 1;
      return new Date(FIXED_NOW);
    },
  });
  assert.equal(clockCalls, 1);
  assert.equal(report.layout_ok, true);
  assert.equal(report.delivery_ready, true);
  assert.equal(report.lanes.default.delivery_ready, true);
  assert.equal(report.issues.some((item) => item.code.startsWith("R")), false);
  const strictReport = doctor.inspectProject(root, {
    strict: true,
    now: () => new Date(FIXED_NOW),
  });
  assert.equal(strictReport.ok, true, JSON.stringify(strictReport.issues));
});

test("evidence rejects semantic drift, root drift, and a dirty worktree", () => {
  for (const scenario of ["semantic", "root", "dirty"]) {
    const { root, observedSha } = confirmedReadyFixture();
    if (scenario === "semantic") {
      fs.writeFileSync(
        fixturePath(root, ".ai-os/lanes/default/tasks.yaml"),
        tasksYaml({ gitSha: observedSha, title: "Changed contract" }),
      );
      runGit(root, ["add", ".ai-os/lanes/default/tasks.yaml"]);
      runGit(root, ["commit", "-qm", "semantic drift"]);
    } else if (scenario === "root") {
      fs.writeFileSync(path.join(root, "package-lock.json"), "{}\n");
      runGit(root, ["add", "package-lock.json"]);
      runGit(root, ["commit", "-qm", "root drift"]);
    } else {
      fs.writeFileSync(path.join(root, "untracked.txt"), "dirty\n");
    }
    const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
    assert.equal(report.delivery_ready, false, scenario);
    assert.ok(issue(report, scenario === "dirty" ? "R022" : "R021"), scenario);
  }
});

test("evidence impact scope excludes only a different lane subtree", () => {
  const { root } = confirmedReadyFixture();
  const source = fixturePath(root, ".ai-os/lanes/default");
  const destination = fixturePath(root, ".ai-os/lanes/archive");
  fs.cpSync(source, destination, { recursive: true });
  const archiveToml = path.join(destination, "lane.toml");
  fs.writeFileSync(
    archiveToml,
    fs.readFileSync(archiveToml, "utf8")
      .replace('id = "default"', 'id = "archive"')
      .replace('status = "active"', 'status = "closed"'),
  );
  runGit(root, ["add", ".ai-os/lanes/archive"]);
  runGit(root, ["commit", "-qm", "archive other lane"]);
  const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
  assert.equal(report.layout_ok, true);
  assert.equal(report.delivery_ready, true, JSON.stringify(report.issues));
  assert.equal(report.lanes.archive.delivery_ready, false);
  assert.equal(issue(report, "R021"), undefined);
});

test("G2 readiness requires human approval and its minimum artifacts", () => {
  const { root } = confirmedReadyFixture({ governance: "G2", approval: true });
  assert.equal(doctor.inspectProject(root, {
    now: () => new Date(FIXED_NOW),
  }).delivery_ready, true);
  fs.unlinkSync(fixturePath(root, ".ai-os/lanes/default/risk-register.md"));
  const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
  assert.equal(report.delivery_ready, false);
  assert.ok(issue(report, "R031"));
});

test("G2 missing approval blocks before Git while malformed tasks stop downstream gates", () => {
  const { root } = confirmedReadyFixture({ governance: "G2", approval: false });
  let calls = 0;
  const approvalReport = doctor.inspectProject(root, {
    now: () => new Date(FIXED_NOW),
    runGit() {
      calls += 1;
      throw new Error("approval blocker must skip Git");
    },
  });
  assert.ok(issue(approvalReport, "R030"));
  assert.equal(calls, 0);

  fs.writeFileSync(fixturePath(root, ".ai-os/lanes/default/tasks.yaml"), "version: 5\n");
  const malformed = doctor.inspectProject(root, {
    now: () => new Date(FIXED_NOW),
    runGit() {
      calls += 1;
      throw new Error("malformed tasks must skip Git");
    },
  });
  assert.ok(issue(malformed, "R020"));
  for (const code of ["R021", "R022", "R030", "R031"]) {
    assert.equal(issue(malformed, code), undefined, code);
  }
  assert.equal(calls, 0);
});

test("future evidence and release intent fail their deterministic gates before Git", () => {
  const { root, observedSha } = confirmedReadyFixture();
  fs.writeFileSync(
    fixturePath(root, ".ai-os/lanes/default/tasks.yaml"),
    tasksYaml({ gitSha: observedSha, observedAt: "2026-07-11T05:00:00.000Z" }),
  );
  let calls = 0;
  const future = doctor.inspectProject(root, {
    now: () => new Date(FIXED_NOW),
    runGit() {
      calls += 1;
      throw new Error("future evidence must skip Git");
    },
  });
  assert.ok(issue(future, "R021"));
  assert.equal(calls, 0);

  fs.writeFileSync(
    fixturePath(root, ".ai-os/lanes/default/tasks.yaml"),
    tasksYaml({ gitSha: observedSha, scopeMode: "release" }),
  );
  const release = doctor.inspectProject(root, {
    now: () => new Date(FIXED_NOW),
    runGit() {
      calls += 1;
      throw new Error("missing release plan must skip Git");
    },
  });
  assert.ok(issue(release, "R031"));
  assert.equal(calls, 0);
});

test("closed and zero-active aggregation cannot become vacuously ready", () => {
  const root = installedFixture();
  replaceToml(root, "status", "closed");
  let gitCalls = 0;
  const report = doctor.inspectProject(root, {
    now: () => new Date(FIXED_NOW),
    runGit() {
      gitCalls += 1;
      throw new Error("closed lane must not use Git");
    },
  });
  assert.equal(report.delivery_ready, false);
  assert.equal(report.lanes.default.delivery_ready, false);
  assert.ok(report.issues.some((item) => item.code === "R020" && item.lane_id === null));
  assert.equal(gitCalls, 0);
});

test("STATE drift warns without becoming authority or changing delivery readiness", () => {
  const { root } = confirmedReadyFixture();
  replaceStateMirror(root, "当前基线 ID", "BL-20260711-030000-stale");
  const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
  assert.equal(report.delivery_ready, true);
  assert.ok(issue(report, "W072"));
  assert.equal(report.semantic_warnings.some((item) => item.code === "W072"), true);
  assert.equal(doctor.inspectProject(root, {
    strict: true,
    now: () => new Date(FIXED_NOW),
  }).ok, false);
});

test("MISSION mirror labels are exact and cannot be satisfied by prefix decoys", () => {
  const { root } = confirmedReadyFixture();
  const missionPath = fixturePath(root, ".ai-os/lanes/default/MISSION.md");
  fs.writeFileSync(
    missionPath,
    fs.readFileSync(missionPath, "utf8").replace(
      "当前质量档位（quality_tier，lane.toml 镜像）",
      "当前质量档位-decoy",
    ),
  );
  runGit(root, ["add", ".ai-os/lanes/default/MISSION.md"]);
  runGit(root, ["commit", "-qm", "mirror decoy"]);
  const report = doctor.inspectProject(root, { now: () => new Date(FIXED_NOW) });
  assert.ok(issue(report, "R002"));
});
