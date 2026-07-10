# AI-OS v11 Governance and Doctor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lane governance machine-consistent and make doctor fail closed on layout while separately reporting delivery readiness for every active lane.

**Architecture:** `lane.toml` is the machine truth for tiers and current baseline. Canonical tasks YAML carries structured approval/evidence. The vendored doctor uses small strict parsers, enumerates every lane, and returns both `layout_ok` and `delivery_ready` without subjective scoring.

**Tech Stack:** Node.js built-ins, CommonJS, canonical TOML/YAML subsets, `node:test`.

## Global Constraints

- Governance uses `G0/G1/G2`; task priority uses `P0/P1/P2/P3`.
- Fresh lane tiers are `unassessed` and bootstrap status is `unconfirmed`.
- Doctor accepts only documented canonical syntax and fails closed otherwise.
- Doctor stays offline and dependency-free.
- STATE is navigation only and never overrides committed truth.

---

## File Map

- `framework/.agents/templates/lane/lane.toml`: tier and baseline machine truth.
- `framework/.agents/templates/lane/tasks.yaml`: schema version 5.
- `framework/.agents/templates/lane/baseline-log/BL-template.md`: unconfirmed bootstrap and CR/BL lifecycle.
- `framework/.agents/templates/shared-root/memory.md`: conflict-safe record metadata.
- `docs/artifacts.md`: canonical installed reference source.
- `bin/doctor-shared.js`: strict TOML/YAML/baseline parsers.
- `bin/ai-os-doctor.js`: all-lane layout/readiness checks and reporting.
- `test/doctor-parser.test.js`, `test/doctor-layout.test.js`, `test/doctor-readiness.test.js`: contract suites.

### Task 1: Lock canonical governance templates

**Files:**
- Modify: `framework/.agents/templates/lane/lane.toml`
- Modify: `framework/.agents/templates/lane/MISSION.md`
- Modify: `framework/.agents/templates/lane/STATE.md`
- Modify: `framework/.agents/templates/lane/tasks.yaml`
- Modify: `framework/.agents/templates/lane/baseline-log/BL-template.md`
- Modify: `framework/.agents/templates/shared-root/memory.md`
- Modify: `docs/artifacts.md`
- Create: `test/governance-schema.test.js`

**Interfaces:**
- Produces lane schema with `quality_tier`, `risk_tier`, `governance_tier`, `baseline_id`.
- Produces tasks schema version 5 with `approval`, `evidence_produced`, and `delivery_state`.

- [ ] **Step 1: Write template-schema tests**

```js
test("fresh lane is explicitly unassessed", () => {
  const lane = readRepo("framework/.agents/templates/lane/lane.toml");
  assert.match(lane, /quality_tier = "unassessed"/);
  assert.match(lane, /risk_tier = "unassessed"/);
  assert.match(lane, /governance_tier = "unassessed"/);
});

test("task schema separates governance, priority, approval, and evidence", () => {
  const tasks = readRepo("framework/.agents/templates/lane/tasks.yaml");
  for (const token of ["version: 5", "approval:", "required:", "status:", "decided_by:",
    "baseline_id:", "approved_scope:", "evidence_ref:", "evidence_produced:",
    "git_sha:", "observed_at:", "confidence:", "delivery_state:", "runtime:"]) {
    assert.ok(tasks.includes(token), `tasks contains ${token}`);
  }
});

test("bootstrap is unconfirmed", () => {
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  assert.match(baseline, /Status\*\*: unconfirmed/);
  assert.doesNotMatch(baseline, /Confirmed At/);
});

test("baseline and change records define the complete lifecycle", () => {
  const docs = readRepo("docs/artifacts.md");
  for (const field of ["previous_baseline_id", "confirmed_by", "confirmed_at",
    "source_refs", "current_behavior", "proposed_delta", "affected_artifacts",
    "acceptance_delta", "approval", "close_condition", "preventability_review"]) {
    assert.ok(docs.includes(field), `lifecycle documents ${field}`);
  }
  assert.match(docs, /bootstrap-unconfirmed.*confirmed BL.*proposed CR.*approved CR.*applied CR.*confirmed BL/s);
});

test("memory records cannot represent two active truths", () => {
  const memory = readRepo("framework/.agents/templates/shared-root/memory.md");
  for (const field of ["id", "status", "source", "owner", "last_verified", "supersedes"]) {
    assert.ok(memory.includes(field), `memory contains ${field}`);
  }
  assert.match(memory, /globally unique|全局唯一/i);
  assert.match(memory, /superseded.*not active|已取代.*非活动/is);
});
```

- [ ] **Step 2: Verify current templates fail**

```bash
node --test test/governance-schema.test.js
```

Expected: FAIL on medium/default tiers, tasks version 4, and confirmed bootstrap.

- [ ] **Step 3: Update lane and baseline templates**

Use exact lane defaults:

```toml
id = "default"
title = "默认交付线"
status = "active"
baseline_id = "{{INITIAL_BASELINE_ID}}"
quality_tier = "unassessed"
risk_tier = "unassessed"
governance_tier = "unassessed"
```

The bootstrap record uses `Type: bootstrap`, `Status: unconfirmed`, `Created At`, and no confirmation claim.

- [ ] **Step 4: Update tasks version 5**

Every example task contains:

```yaml
approval:
  required: false
  status: not-required
  decided_by: ""
  decided_at: ""
  baseline_id: "{{INITIAL_BASELINE_ID}}"
  approved_scope: []
  conditions: []
  evidence_ref: ""
evidence_produced: []
delivery_state:
  code: unknown
  data: unknown
  runtime: unknown
```

Document allowed enums and the prohibition on AI self-approval in `docs/artifacts.md`.

- [ ] **Step 5: Make memory conflict-safe**

Remove union-merge instructions. Each template record includes `status`, `source`, `owner`, `last_verified`, and `supersedes`; active and archived records retain unique non-reused IDs.

- [ ] **Step 6: Run the schema test before installer integration resumes**

```bash
node --test test/governance-schema.test.js
```

Expected: PASS. Installer integration is intentionally deferred to Installer
Task 4, which consumes this committed template contract.

- [ ] **Step 7: Commit**

```bash
git add framework/.agents/templates/lane/lane.toml framework/.agents/templates/lane/MISSION.md framework/.agents/templates/lane/STATE.md framework/.agents/templates/lane/tasks.yaml framework/.agents/templates/lane/baseline-log/BL-template.md framework/.agents/templates/shared-root/memory.md docs/artifacts.md test/governance-schema.test.js
git commit -m "feat: define governance and evidence schema"
```

### Task 2: Parse canonical TOML and YAML strictly

**Files:**
- Modify: `bin/doctor-shared.js`
- Create: `test/doctor-parser.test.js`

**Interfaces:**
- Produces `parseCanonicalToml(content, { requiredKeys, allowedKeys })`, a null-prototype object
  whose own keys and string values come only from accepted assignments.
- Produces `parseCanonicalYaml(content): object` supporting mappings, sequences, scalar strings/booleans/integers/null, and `[]`.
- Produces `CanonicalParseError` with line number and reason.

- [ ] **Step 1: Write parser tables**

TOML cases cover missing keys, duplicate keys, single quotes, unquoted values, comments, and unknown keys. YAML cases cover field reordering, nested approval/evidence, empty arrays, comments, duplicate keys/IDs, tabs, anchors, tags, block scalars, inline maps, and malformed indentation.

```js
test("task field order is semantically irrelevant", () => {
  const parsed = parseCanonicalYaml(`
version: 5
tasks:
  - title: "Task"
    owner: AI
    id: TASK-001
`);
  assert.equal(parsed.tasks[0].id, "TASK-001");
  assert.equal(parsed.tasks[0].owner, "AI");
});

for (const unsupported of ["&anchor", "*anchor", "!tag", "|", ">", "{ id: A }"]) {
  test(`unsupported YAML form fails closed: ${unsupported}`, () => {
    assert.throws(() => parseCanonicalYaml(`tasks:\n  - id: A\n    value: ${unsupported}\n`), CanonicalParseError);
  });
}
```

- [ ] **Step 2: Verify current handwritten parser fails cases**

```bash
node --test test/doctor-parser.test.js
```

Expected: FAIL because strict parser APIs are absent.

- [ ] **Step 3: Implement the TOML parser**

Accept blank/comment lines and exact `key = "value"` assignments only. Reject duplicates, unsupported syntax, and missing required keys. Return a null-prototype object.

```js
function parseCanonicalToml(content, { requiredKeys = [], allowedKeys = requiredKeys } = {}) {
  const result = Object.create(null);
  for (const [index, raw] of content.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"$/);
    if (!match) throw new CanonicalParseError(index + 1, "unsupported TOML assignment");
    if (Object.hasOwn(result, match[1])) throw new CanonicalParseError(index + 1, `duplicate key ${match[1]}`);
    if (!allowedKeys.includes(match[1])) throw new CanonicalParseError(index + 1, `unknown key ${match[1]}`);
    result[match[1]] = match[2];
  }
  for (const key of requiredKeys) if (!Object.hasOwn(result, key)) throw new CanonicalParseError(0, `missing key ${key}`);
  return result;
}
```

- [ ] **Step 4: Implement the indentation YAML parser**

Tokenize only spaces in multiples of two, remove comments only outside quoted
strings, build mapping/sequence nodes with an indentation stack, and reject
every unsupported token explicitly. Accepted scalars are double-quoted strings
with `\\`, `\"`, `\n`, `\r`, `\t` escapes; plain enum/identifier strings;
signed decimal integers; `true`, `false`, `null`; and `[]`. The root is a
mapping. Empty implicit values open a mapping/sequence; tabs, empty scalars,
root sequences, anchors, aliases, tags, flow maps, block scalars, duplicate
mapping keys, malformed escapes, and inconsistent indentation fail with the
source line. Duplicate task IDs are a schema-validator error, not a YAML-parser
error. Do not silently skip a line.

- [ ] **Step 5: Run parser tests and lint**

```bash
node --test test/doctor-parser.test.js
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add bin/doctor-shared.js test/doctor-parser.test.js
git commit -m "feat: parse canonical governance formats"
```

### Task 3: Validate layout metadata and every lane

**Files:**
- Modify: `bin/doctor-shared.js`
- Modify: `bin/ai-os-doctor.js`
- Create: `test/doctor-layout.test.js`
- Modify: `test/doctor.test.js`

**Interfaces:**
- Produces `inspectProject(targetDir, { strict = false } = {}): DoctorReport`.
- `DoctorReport` retains legacy `ok`, `version`, `installedVersion`, `layout`,
  `warnings`, and `errors`, and additively includes `layout_ok`,
  `delivery_ready`, `layout_version`, `layout_mode`, `lanes`, and `issues`.
- `lanes` is keyed by lane ID and each value includes `layout_ok`, `delivery_ready`, `issues`.
- Issues are `{ severity, code, message, path, lane_id }`, use the centralized
  catalog, and sort by lane ID, path, severity, then code. `ok` is false for an
  error and, only when `strict` is true, for a warning/readiness issue.
- Produces `parseManagedFiles(content)` and validates every manifest row against
  current ownership, regular-file type, containment, and exact framework bytes.

- [ ] **Step 1: Write metadata field matrix tests**

For each required field (`schema_version`, `layout_version`, `layout_mode`,
`default_lane`, `framework_version`), delete it and expect E002. Replace each
with an invalid value and expect E002. `framework_version` must be semantic and
equal the vendored `.ai-os/bin/VERSION`; doctor never substitutes its source
version. Malformed TOML expects E003. Managed symlink expects E004.

```js
assert.equal(result.status, 1);
assert.equal(report.layout_ok, false);
assert.ok(report.issues.some((item) => item.code === "E002"));
```

- [ ] **Step 2: Write an extra-lane completeness test**

Copy default to `lanes/release`, remove its DESIGN, and assert doctor reports `E020` scoped to `release`; replace lane.toml with a directory and assert `E022`.

Add manifest tables for malformed header/row, duplicate/missing/extra path,
unknown ownership/type, unsorted rows, project hash present, framework hash
empty/stale, wrong installed bytes, and a symlinked manifest path. Add installed
constitution cases for missing/duplicate required anchors and an allowed
project-specific section. Snapshot all legacy JSON fields to prove the v11
fields are additive.

- [ ] **Step 3: Verify current doctor false-greens**

```bash
node --test test/doctor-layout.test.js
```

Expected: FAIL for wrong layout mode, missing schema, and incomplete non-default lane.

- [ ] **Step 4: Refactor doctor around `inspectProject`**

Parse committed metadata and managed manifest strictly; remove the embedded
synthesized-metadata fallback. Enumerate real non-link directories under
`.ai-os/lanes`, require default, and run one reusable
`inspectLane(laneId, paths)` check set for each lane. Check installed AGENTS
identity through required anchors and line limit without pretending a custom
section can be semantically proven.

- [ ] **Step 5: Keep CLI exit compatibility**

`main()` formats `inspectProject`, preserves exit 2 for no `.ai-os`, and derives exit 1 from structural errors or strict warnings.

- [ ] **Step 6: Run layout/source/local parity tests**

```bash
node --test test/doctor-layout.test.js test/doctor.test.js
```

Expected: PASS; source and vendored reports match.

- [ ] **Step 7: Commit**

```bash
git add bin/doctor-shared.js bin/ai-os-doctor.js test/doctor-layout.test.js test/doctor.test.js
git commit -m "feat: validate layout v11 across lanes"
```

### Task 4: Enforce baseline, task, approval, and evidence readiness

**Files:**
- Modify: `bin/doctor-shared.js`
- Modify: `bin/ai-os-doctor.js`
- Create: `test/doctor-readiness.test.js`

**Interfaces:**
- Produces readiness codes `R001` unconfirmed, `R002` unassessed, `R010`
  baseline mismatch/lifecycle, `R020` task contract, `R021` evidence, `R022`
  uncommitted code state, `R030` approval, `R031` G2 minimum artifacts.
- Produces `parseBaselineRecord(content, filename)` and
  `resolveGitState(targetDir): { sha, dirty } | null`; git resolution is local,
  bounded, and performs no network request.

- [ ] **Step 1: Write fresh-install readiness test**

```js
test("fresh install is layout-valid but not delivery-ready", () => {
  const normal = doctorJson(freshProject(), []);
  assert.equal(normal.status, 0);
  assert.equal(normal.report.layout_ok, true);
  assert.equal(normal.report.delivery_ready, false);
  assert.ok(normal.report.issues.some((issue) => issue.code === "R001"));
  assert.equal(doctorJson(normal.target, ["--strict"]).status, 1);
});
```

- [ ] **Step 2: Write baseline alignment and lifecycle table tests**

Mismatch lane.toml, MISSION, tasks, STATE, missing record, directory record,
invalid filename, and unconfirmed current record. Validate the exact lifecycle:
bootstrap has no confirmation claim; confirmed BL requires
`previous_baseline_id`, `confirmed_by`, `confirmed_at`, and `source_refs`; CR
requires status, current/proposed behavior, affected artifacts, acceptance
delta, approval, close condition, and preventability review; only approved CR
may become applied and point to a new confirmed BL. STATE mismatch is a
readiness warning/rebuild instruction, not baseline authority.

- [ ] **Step 3: Write task readiness table tests**

Cover field reordering, duplicate IDs, missing owner, invalid status, missing
dependency/AC, done without evidence, inferred evidence, stale git SHA/baseline,
nonzero/missing exit code, missing environment/artifact, invalid/non-ISO
`observed_at`, dirty worktree, no Git repository, approval self-filled by AI,
empty approved scope, invalid conditions/evidence ref, pending/rejected/expired
G2 approval, invalid code/data/runtime delivery enums, and missing G2 minimum
artifacts. Inject `currentGitSha` and a fixed clock so freshness is deterministic.

- [ ] **Step 4: Verify tests fail**

```bash
node --test test/doctor-readiness.test.js
```

Expected: FAIL because `delivery_ready` and readiness codes are absent.

- [ ] **Step 5: Implement deterministic readiness functions**

Add pure functions:

```js
checkTierReadiness(laneMeta)
checkBaselineReadiness(laneMeta, mission, tasks, state, baselineFiles)
checkTaskReadiness(tasks, designAcceptanceIds, currentBaselineId, gitState, now)
checkApprovalReadiness(task, governanceTier)
checkEvidenceReadiness(task, currentBaselineId, gitState, now)
checkG2Artifacts(lanePath, governanceTier, tasksScope)
```

Observed completion evidence must match the active baseline and full current
HEAD SHA; a dirty tree cannot be claimed by the recorded SHA. If Git is absent,
completed work requiring git evidence is not ready, while todo-only lanes do not
gain a false git claim. G2 always requires risk register plus verification
matrix. Release plan is additionally required when `tasks.scope.mode` is
`release`; a non-release G2 lane must not be forced to invent release intent.
`delivery_ready` is false when any `R` issue exists. Closed lanes retain layout
checks but are excluded from top-level readiness aggregation.

- [ ] **Step 6: Run readiness and parser tests**

```bash
node --test test/doctor-readiness.test.js test/doctor-parser.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add bin/doctor-shared.js bin/ai-os-doctor.js test/doctor-readiness.test.js
git commit -m "feat: report deterministic delivery readiness"
```

### Task 5: Validate git rules and on-demand schemas without substring false-greens

**Files:**
- Modify: `bin/doctor-shared.js`
- Modify: `bin/ai-os-doctor.js`
- Modify: `test/doctor-layout.test.js`
- Modify: `test/doctor-readiness.test.js`

**Interfaces:**
- Produces `parseManagedBlock(content, begin, end): string[]`.
- Produces `parseEffectiveGitignoreRules(content): string[]` preserving rule order and negation.
- Produces `isPathIgnored(rules, relativePath): boolean` for the documented
  canonical subset: anchored/unanchored literal segments, `*`, `**`, trailing
  directory slash, escaped leading `#`/`!`, and ordered negation.

- [ ] **Step 1: Write commented/negated rule tests**

Assert comments do not satisfy a required ignore, and a later `!.ai-os/lanes/default/STATE.md` cancels the earlier wildcard for that file. Missing/duplicate/unclosed managed block produces structural diagnostics.

- [ ] **Step 2: Write present on-demand schema tests**

For risk register, release plan, verification matrix, every `specs/*.spec.md`,
`design-pack/parity-map.md`, and every lane eval, test regular-file/directory
types, duplicate IDs, missing required headings/keys, empty evidence, invalid
confidence, and malformed canonical YAML/frontmatter. G0/G1 absent artifacts
remain allowed. G2 requires risk plus verification; `scope.mode: release`
requires release plan. Other subjective triggers are behavior-contract tests,
while doctor validates their schema whenever present and never invents intent.

- [ ] **Step 3: Run tests to prove substring behavior is wrong**

```bash
node --test test/doctor-layout.test.js test/doctor-readiness.test.js
```

Expected: FAIL on comments/negation and malformed present artifacts.

- [ ] **Step 4: Implement exact active-rule evaluation**

Ignore blank/comment lines, preserve escaped leading marker characters,
normalize leading `/`, and apply the documented wildcard rules in order. Only
the exact effective STATE coverage without a later matching negation satisfies
the contract; this is a bounded matcher, not a complete gitignore engine.

- [ ] **Step 5: Run full doctor suite**

```bash
node --test test/doctor.test.js test/doctor-layout.test.js test/doctor-readiness.test.js test/doctor-parser.test.js
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add bin/doctor-shared.js bin/ai-os-doctor.js test/doctor-layout.test.js test/doctor-readiness.test.js
git commit -m "fix: close doctor structural bypasses"
```

### Task 6: Document the exact doctor contract

**Files:**
- Modify: `docs/cli.md`
- Modify: `docs/artifacts.md`
- Modify: `README.md`
- Modify: `test/docs.test.js`
- Create: `test/fixtures/doctor-report.json`

**Interfaces:**
- Documents `layout_ok`, `delivery_ready`, per-lane JSON, exit codes, E/R codes, and strict behavior.

- [ ] **Step 1: Write docs contract tests**

Assert docs list all current issue codes extracted from `bin/ai-os-doctor.js`, do not mention removed synthesized metadata behavior, and state that fresh install is not delivery-ready.

- [ ] **Step 2: Verify docs tests fail**

```bash
node --test test/docs.test.js
```

Expected: FAIL on outdated v10/W070-W071-only descriptions.

- [ ] **Step 3: Update docs from authoritative output fields**

Generate `test/fixtures/doctor-report.json` from a fresh-project fixture after
normalizing only absolute paths and the generated bootstrap ID. Copy that exact
JSON into the documented fenced example. `test/docs.test.js` parses the fence
and deep-compares it with the fixture so future report fields cannot drift.
Keep claims bounded to deterministic checks.

- [ ] **Step 4: Run docs and doctor suites**

```bash
node --test test/docs.test.js test/doctor-layout.test.js test/doctor-readiness.test.js
git diff --check
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/cli.md docs/artifacts.md README.md test/docs.test.js test/fixtures/doctor-report.json
git commit -m "docs: define layout and readiness checks"
```
