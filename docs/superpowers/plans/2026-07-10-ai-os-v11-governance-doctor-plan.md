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
- Makes lane `MISSION.md` the product/acceptance content truth while `lane.toml`
  remains the machine truth for the baseline pointer and tiers.
- Produces one exact tasks schema version 5 snapshot with `approval`, stable
  `evidence_required` IDs (`design-note`, `build-log`, `test-log`),
  `evidence_produced`, and `delivery_state`; every `evidence_produced[].id`
  binds an ID required by the same task, is unique within that task, and uses
  `(task.id, evidence.id)` as its compound identity.
- Defines the baseline-log record boundary: the first H1 is the record ID, the
  record region contains exactly one H1, metadata ends at the first `##` or EOF,
  and H1 is not a metadata key. Defines
  nested `preventability_review.status`, the exact normative CR transition
  matrix and doctor current-state invariants, and the immutable `retrospective`
  subtype with `source_cr_ids`.
- Defines the exact nine-key evidence object and freshness gate anchored to the
  active confirmed BL: `git_sha` is the full observed commit and an ancestor of
  current HEAD. Its path rule starts with all tracked repository paths, excludes
  only other-lane subtrees, and permits only current-lane tasks.yaml plus the
  evidence semantic envelope. Freshness is
  `confirmed_at <= observed_at <= fixed now`, with no TTL.

- [ ] **Step 1: Write template-schema tests**

Use exact stripped-file snapshots and exact-once fenced contracts, not token-only
presence checks. Assert tier/baseline mirrors occur once, MISSION/lane.toml
authority is unambiguous, both v4 task identities and stable evidence requirement
IDs are preserved, and the bootstrap/confirmed BL/CR/retrospective skeletons are
byte-deterministic. Assert the CR transition matrix, evidence object, and evidence
gate are each present exactly once in every canonical source that owns them.

```js
// Each *_SKELETON / *_MATRIX / *_GATE constant is the complete literal
// contract shown by the approved template/reference, not a token fragment.
test("fresh lane mirrors are unique and authority is unambiguous", () => {
  const lane = readRepo("framework/.agents/templates/lane/lane.toml");
  const mission = readRepo("framework/.agents/templates/lane/MISSION.md");
  assert.match(lane, /quality_tier = "unassessed"/);
  assert.match(lane, /risk_tier = "unassessed"/);
  assert.match(lane, /governance_tier = "unassessed"/);
  assertUniqueMirrorsEqualToml(mission, lane);
  assert.match(mission, /产品 \/ 验收基线内容的真理源/);
  assert.match(mission, /lane\.toml.*baseline pointer.*tier.*机器真理源/s);
});

test("task schema is one exact v5 YAML contract", () => {
  const tasks = readRepo("framework/.agents/templates/lane/tasks.yaml");
  assert.equal(stripYamlComments(tasks), TASKS_YAML);
});

test("record contracts and metadata boundary are exact", () => {
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const docs = readRepo("docs/artifacts.md");
  assert.equal(recordRegion(baseline).envelope, BOOTSTRAP_SKELETON);
  assert.equal(recordRegion(CONFIRMED_BL_SKELETON).terminatedBy, "EOF");
  for (const content of [baseline, docs]) {
    assert.equal(extractFence(content, "ai-os-confirmed-bl"), CONFIRMED_BL_SKELETON);
    assert.equal(extractFence(content, "ai-os-change-request"), CR_SKELETON);
    assert.equal(extractFence(content, "ai-os-cr-transition-matrix"), CR_TRANSITION_MATRIX);
    assert.equal(extractFence(content, "ai-os-retrospective"), RETROSPECTIVE_SKELETON);
  }
  assert.equal(extractFence(docs, "ai-os-evidence"), EVIDENCE_SKELETON);
  assert.equal(extractFence(docs, "ai-os-evidence-gate"), EVIDENCE_GATE);
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
The second-review contract also fails until requirement IDs, the metadata
boundary, nested preventability state, retrospective subtype, exact transition
matrix, and evidence freshness gate are deterministic.

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

Keep the requirement IDs from the prior schema (`design-note`, `build-log`,
`test-log`) instead of converting them into evidence kinds. Document exact ID
binding and within-task uniqueness, `(task.id, evidence.id)` identity, the
nine-key produced-evidence object, allowed kind enums, reachable ancestor plus
evidence-only semantic envelope, deterministic freshness, and the prohibition
on AI self-approval in `docs/artifacts.md`.

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
- `DoctorReport` retains the actual observable JSON compatibility surface:
  `ok`, `version`, `package`, `targetDir`, `installedVersion`,
  `layout_version`, `layout_mode`, `issues`, and `semantic_warnings`. It
  additively includes `layout_ok`, `delivery_ready`, and `lanes`. Missing or
  untrusted installed metadata is represented as `null`; source constants are
  never substituted for target truth. The never-shipped `layout`, `warnings`,
  and `errors` keys are not invented as compatibility aliases.
- `lanes` is keyed by lane ID and each value includes `layout_ok`, `delivery_ready`, `issues`.
- Issues are `{ level, code, message, severity, path, lane_id }`, use the
  centralized catalog, and always satisfy `level === severity`; `level` is the
  compatibility alias and `severity` is the internal truth. Global scope uses
  `path: null` and `lane_id: null`; lane paths are POSIX-relative. Issues sort
  by lane ID, path, severity rank (`error`, `warning`, `info`), code, then
  message using code-point comparison rather than locale-dependent collation.
  `semantic_warnings` filters the same issue objects rather than creating a
  divergent copy.
- Task 3 is intentionally fail-closed about readiness: until Task 4 installs
  the complete R001-R031 evaluator, every active lane and the top-level report
  expose `delivery_ready: false`. Non-strict `ok` equals `layout_ok`; Task 3
  strict mode therefore exits 1 without inventing a temporary readiness code.
  Task 4 replaces this provisional false value with the complete every-active-
  lane calculation. No transient `readiness_evaluated` field is introduced.
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
project-specific section. Snapshot the actual observable compatibility fields
to prove the v11 fields are additive, including `level === severity` on every
issue and `null` scope for global issues.

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

`main()` formats `inspectProject`, preserves the existing minimal exit-2 payload
for no `.ai-os`, and derives exit 1 from structural errors. During Task 3 only,
strict mode also exits 1 because readiness is explicitly fail-closed; Task 4
replaces that provisional branch with warning/readiness issue evaluation.

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
- Replaces Task 3's provisional `delivery_ready: false` values with the complete
  per-lane and every-active-lane readiness calculation. `ok` remains
  `layout_ok` in non-strict mode and becomes `layout_ok && delivery_ready &&`
  no warnings in strict mode; info never blocks either mode.
- Produces readiness codes `R001` unconfirmed, `R002` unassessed, `R010`
  baseline mismatch/lifecycle, `R020` task contract, `R021` evidence, `R022`
  uncommitted code state, `R030` approval, `R031` G2 minimum artifacts.
- Produces `parseBaselineRecord(content, filename)` and
  `resolveGitState(targetDir): { sha, dirty } | null`; git resolution is local,
  bounded, and performs no network request.
- Produces `resolveEvidenceGitEnvelope(targetDir, laneId, observedShas)`. For
  each validated full SHA it returns the ancestor result, impact-scoped tracked
  paths, and the strictly parsed historical active-lane `tasks.yaml`; malformed
  or absent historical task content fails closed. All Git calls are local,
  argument-array based, full-SHA validated, and bounded by produced evidence.
- Validates the formal retrospective subtype and `source_cr_ids`, enforces the
  baseline-log record boundary where the first H1 is the record ID, the record
  region contains exactly one H1, and metadata ends at the first `##` or EOF,
  and applies current-state invariants from the
  exact CR transition matrix, including `preventability_review.status`
  terminal-state requirements. A current snapshot does not prove historical
  freeze compliance and Task 4 does not traverse CR history to claim it does.
- Binds every `evidence_produced[].id` to an ID required by the same task and
  treats `(task.id, evidence.id)` as identity. It checks evidence against the
  active confirmed BL and injected fixed now using
  `confirmed_at <= observed_at <= fixed now`, with no TTL. The evidence SHA is
  the full observed commit, must be an ancestor of current HEAD, and is accepted
  only when the impact-scoped tracked diff and strict semantic comparison allow
  evidence-only changes to task `status`, `evidence_produced`, and
  `delivery_state`. Path comparison starts with all tracked repository paths,
  excludes only other-lane subtrees, and permits only current-lane tasks.yaml.

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
delta, approval, close condition, and nested preventability review. Table-test
the current-state invariants for each proposed/approved/applied/rejected status,
pending/completed review combination, required/empty fields, and applied/rejected
terminal-state shape. Treat the matrix's transition/freeze rows as normative
authoring/review rules; do not claim one snapshot proves historical immutability.
Parse metadata only after the first H1 and before the first `##` or EOF; H1 is
the record ID rather than a metadata key, and examples/fences after H2 are ignored.
Validate the strict retrospective filename, metadata, unique non-empty
`source_cr_ids`, list types, immutability, and exclusion from the baseline
pointer chain. Only approved CR may become applied and point to a new confirmed
BL. A new baseline forces approval/evidence reevaluation instead of rewriting an
old human decision. STATE mismatch is a readiness warning/rebuild instruction,
not baseline authority.

- [ ] **Step 3: Write task readiness table tests**

Cover field reordering, duplicate IDs, missing owner, invalid status, missing
dependency/AC, done without evidence, missing/extra evidence keys, requirement
ID mismatches, duplicate evidence IDs within one task (while equal IDs across
tasks are allowed), future timestamps, pre-baseline timestamps, dirty worktree,
inferred evidence, stale baseline, non-ancestor observed SHA, root config,
lockfile, CI, migration, schema, asset, shared-root/project/current-
lane drift, accepted other-lane-only subtree changes,
evidence-only commits for one or several tasks, forbidden semantic changes,
nonzero/missing exit code, missing command/environment/artifact, invalid/non-ISO
`observed_at`, no Git repository, approval self-filled by AI,
empty approved scope, invalid conditions/evidence ref, pending/rejected/expired
G2 approval, invalid code/data/runtime delivery enums, and missing G2 minimum
artifacts. Table-test ancestor relation, tracked diff impact scope, and strict
semantic comparison of observed/current parsed tasks. Inject the Git envelope
and a fixed clock so freshness is deterministic; accept only
`confirmed_at <= observed_at <= fixed now` and apply no TTL.

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
checkTaskReadiness(tasks, designAcceptanceIds, currentBaselineId, evidenceGitEnvelope, now)
checkApprovalReadiness(task, governanceTier)
checkEvidenceReadiness(tasks, currentBaselineId, evidenceGitEnvelope, now)
checkG2Artifacts(lanePath, governanceTier, tasksScope)
```

Build `evidenceGitEnvelope` with the bounded
`resolveEvidenceGitEnvelope(targetDir, laneId, observedShas)` adapter, then pass
the immutable result into the pure readiness functions. This history read exists
only for evidence reachability; CR freeze checks remain current-snapshot checks.

Observed completion evidence must match the active baseline; each full observed
commit must be an ancestor of current HEAD, and the current worktree must be
clean. Enumerate all tracked repository paths changed since each observed SHA,
exclude only `.ai-os/lanes/<other-lane-id>/**`, and require every remaining path
to equal `.ai-os/lanes/<current-lane-id>/tasks.yaml`. Then compare strictly parsed
tasks semantics so only current-lane evidence recording can follow verification.
If Git is absent,
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
