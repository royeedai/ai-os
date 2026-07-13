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
  for (const [index, raw] of splitCanonicalLines(content).entries()) {
    rejectControlCharacters(raw, index + 1);
    const line = trimAsciiSpaces(raw);
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)[ ]*=[ ]*"([^"]*)"$/);
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
strings, scan leading/trailing ASCII spaces with linear char-code/index passes,
use bounded recursive descent over indentation tokens, and reject every
unsupported token explicitly. Do not use an end-anchored backtracking regex
for whitespace runs. Accepted scalars are double-quoted strings with `\\`,
`\"`, `\n`, `\r`, `\t` escapes; plain enum/identifier strings; signed
decimal integers; `true`, `false`, `null`; and `[]`. The root is a mapping at
depth zero; child containers may reach depth 64, while an attempted recursion
beyond depth 64 fails on the child source line with
`maximum nesting depth exceeded`. Empty implicit values open a mapping/sequence;
tabs, empty scalars, root sequences, anchors, aliases, tags, flow maps, block
scalars, duplicate mapping keys, malformed escapes, and inconsistent
indentation fail with the source line. Duplicate task IDs are a schema-validator
error, not a YAML-parser error. Do not silently skip a line.

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
- Modify: `test/doctor-layout.test.js`
- Modify: `test/doctor.test.js`
- Create: `test/doctor-readiness.test.js`

**Interfaces:**
- Replaces Task 3's provisional `delivery_ready: false` values with the complete
  per-lane and every-active-lane readiness calculation. `ok` remains
  `layout_ok` in non-strict mode and becomes `layout_ok && delivery_ready &&`
  no warnings in strict mode. Info severity never independently blocks an exit;
  an active R issue blocks strict only through `delivery_ready: false`.
- Produces readiness codes `R001` unconfirmed, `R002` unassessed, `R010`
  baseline mismatch/lifecycle, `R020` task contract, `R021` evidence, `R022`
  unavailable/dirty Git state, `R030` approval, `R031` required artifacts.
- Produces `parseBaselineRecord(content, filename)` and
  `resolveGitState(targetDir, options): GitStateResult`; git resolution is
  local, bounded, performs no network request, and returns a frozen
  discriminated result with repository root, project prefix, object format,
  current HEAD, dirty state, or a stable unavailable reason.
- Produces `resolveEvidenceGitEnvelope(targetDir, laneId, observedShas, options)`. For
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
  `confirmed_at <= decided_at <= observed_at <= fixed now` when approval is
  required (otherwise `confirmed_at <= observed_at <= fixed now`), with no
  TTL. The evidence SHA is
  the full observed commit, must be an ancestor of current HEAD, and is accepted
  only when the impact-scoped tracked diff and strict semantic comparison allow
  evidence-only changes to task `status`, `evidence_produced`, and
  `delivery_state`. Path comparison starts with all tracked repository paths,
  excludes only other-lane subtrees, and permits only current-lane tasks.yaml.

**Locked Task 4 evaluation contract:**

- Every `R001`-`R031` issue has `level === severity === "info"` and blocks only
  the affected readiness calculation. It is not a structural error or strict
  warning. `semantic_warnings` remains the compatibility filter for W070/W071.
  Optional STATE baseline/tier drift is W072, instructs rebuild, and never
  supplies authority or an R010 finding.
- Tier rank is exact: `exploratory/low/G0 = 0`,
  `standard/medium/G1 = 1`, `strict/high/G2 = 2`. Active lanes reject
  unassessed/invalid tiers and governance below `max(quality, risk)` with R002;
  higher governance is allowed. MISSION tier mirrors must equal lane.toml or
  produce R002; MISSION/tasks baseline mirrors must equal the lane pointer or
  produce R010.
- Only exact `closed` is excluded from top aggregation. Closed lanes have
  per-lane `delivery_ready: false`, retain layout, baseline/history/alignment,
  and task-schema checks, but skip tier, terminal completion, current
  approval/evidence/Git, and trigger-presence gates. Existing W warnings can
  still fail strict mode. Invalid statuses block aggregation. Zero active lanes
  yields top-level false plus one global R020.
- Active readiness requires a non-empty task set and every task `done` or
  `shipped`. `todo`, `in-progress`, or `blocked` produces one R020 for that lane
  and makes zero Git calls. Terminal tasks require non-empty, unique
  `acceptance_refs`, `evidence_required`, and `change_scope`; produced evidence
  IDs equal the required set exactly; all delivery-state dimensions are only
  `observed` or `not-applicable`. Dependencies exist, are non-self and acyclic,
  and resolve to terminal tasks. Every task acceptance ref resolves to the
  canonical DESIGN table and every live DESIGN AC is covered.
- DESIGN acceptance extraction reads only the first exact five-column table
  under exactly one live `## 9. 验收标准`, ignores fenced/comment/example
  decoys, requires the canonical header, unique `AC-[0-9]{3,}` IDs and
  non-empty cells, and stops at the next H2. Mapping-field order is irrelevant.
  Set-like lists and
  milestone/task sets are uniqueness-checked and canonicalized by code-point
  order for historical semantic comparison.
- Task v5 exact keys are frozen: top
  `version,baseline_id,scope,milestones,tasks`; scope
  `mode,focus,baseline_source`; milestone `id,title,goal`; task
  `id,title,milestone,status,owner,priority,approval,depends_on,acceptance_refs,evidence_required,evidence_produced,delivery_state,change_scope`;
  approval
  `required,status,decided_by,decided_at,baseline_id,approved_scope,conditions,evidence_ref`;
  evidence has the approved nine keys; delivery state has `code,data,runtime`.
  `version` is integer 5; scope mode is only `change` or `release`; task status
  is `todo/in-progress/blocked/done/shipped`; priority is P0-P3; evidence kind
  is `static/test/runtime/data/manual/release`; confidence is
  `observed/inferred/unknown`; delivery dimensions are
  `observed/inferred/unknown/not-applicable`. IDs and list elements have the
  documented scalar types, and milestone/task IDs are unique with valid refs.
  Malformed task schema emits only R020 and skips downstream approval,
  evidence, artifact-trigger, and Git gates.
- Every approval status has a non-empty baseline snapshot. `not-required`
  (`required=false`) and `pending` (`required=true`) keep decision fields and
  lists empty. `approved/rejected/expired` use `required=true`, a non-empty
  declared human identity, canonical UTC millisecond timestamp, and non-empty
  evidence ref; only approved has non-empty approved scope. A required terminal
  task and every terminal G2 task must be approved on the active baseline.
  Reserved case-insensitive exact identities
  `ai/agent/assistant/bot/model/chatgpt/codex/claude/gemini` are rejected, but
  doctor does not claim to authenticate a person or prove conditions fulfilled.
  Approval must already
  exist in the observed historical tasks and its decision time cannot be after
  the evidence time.
- `evidence_required` cannot be empty for a terminal task. Evidence command,
  artifact, URL, environment, condition, and approval-reference fields are
  declarations only and are never executed or dereferenced. Canonical times
  use `YYYY-MM-DDTHH:mm:ss.sssZ`, round-trip through `Date`, and are compared
  inclusively against one fixed clock sample:
  `confirmed_at <= decided_at <= observed_at <= fixed_now` when approval is
  required, otherwise `confirmed_at <= observed_at <= fixed_now`.
- Baseline records use exact per-subtype keys inside the first-H1/first-H2
  boundary: bootstrap `Type,Status,Created At`; confirmed baseline
  `Type,Status,previous_baseline_id,confirmed_by,confirmed_at,source_refs`;
  change request
  `Type,Status,current_behavior,proposed_delta,affected_artifacts,acceptance_delta,approval,close_condition,preventability_review,result_baseline_id`
  with nested `status,preventable,root_cause,suggested_guard`; retrospective
  `Type,Status,source_cr_ids,preventable_findings,suggested_framework_changes`.
  The current active pointer is ready only when it names a valid
  confirmed BL. Confirmed records form an existing, acyclic
  `previous_baseline_id` chain ending at a valid bootstrap record; source refs
  are non-empty strings but need not be unique. `confirmed_by` follows the same
  declared-human/reserved-identity syntax guard as task approval, without an
  authentication claim. Bootstrap `Created At` is a
  canonical UTC millisecond time whose UTC second matches its BL identifier.
  CR current-shape validation follows the approved Cartesian
  state/review/result matrix without claiming
  historical freeze or result-BL newness. An applied CR result resolves to a
  confirmed BL on the current confirmed lineage. Retrospectives never enter
  the pointer chain; their unique source CR IDs must resolve to parsed terminal
  (`applied` or `rejected`) CR records.
- R-code cascade is stable: R001 only valid current bootstrap/unconfirmed;
  R002 lane status/tier assessment; R010 baseline/alignment/lifecycle/history;
  R020 tasks/dependencies/AC/completion; R021 evidence/time/ancestor/diff/
  historical semantic binding; R022 Git unavailable/dirty/budget failure;
  R030 approval; R031 required artifact presence/type/non-empty. Prefer one
  issue per code/lane and skip downstream checks after an upstream parse fails.
- Trigger presence in Task 4 is mechanical: G2 (including high/strict lanes
  raised to the G2 floor) requires regular non-empty `risk-register.md` and
  `verification-matrix.yaml`; `tasks.scope.mode == "release"` requires regular
  non-empty `release-plan.md`. Non-release G2 does not require a release plan.
  Task 5 owns schemas for present on-demand artifacts and subjective triggers.
- `inspectProject` samples the injected clock exactly once and shares it across
  lanes. Near-ready lanes share one repository root/object-format/HEAD/status
  probe; todo/upstream-invalid/no-evidence lanes make zero Git calls.
- `createLocalGitRunner({ spawnSyncImpl, monotonicNow, limits })` (or an
  equivalent injected interface) is the only process boundary. Fake runners
  can assert executable, argv, environment, `shell:false`, timeout, maxBuffer,
  and call count. The default runner receives fixed operation enums only; no
  evidence field can enter argv. The trust boundary is the local `git`
  executable found through PATH.
- The runner constructs an allowlist environment instead of copying process
  `GIT_*` values. It sets `GIT_NO_LAZY_FETCH=1`, `GIT_OPTIONAL_LOCKS=0`,
  `GIT_TERMINAL_PROMPT=0`, `GIT_NO_REPLACE_OBJECTS=1`,
  `GIT_GRAFT_FILE=os.devNull`, `GIT_CONFIG_NOSYSTEM=1`,
  `GIT_CONFIG_GLOBAL=os.devNull`, `GIT_PAGER=cat`, `LC_ALL=C`, `LANG=C`, and
  `TZ=UTC`; only PATH and required Windows process variables are inherited.
  Every invocation uses `--no-pager`, `-c core.fsmonitor=false`,
  `-c core.untrackedCache=false`, `-c protocol.allow=never`, and
  `shell:false`. Fetch, remote, LFS, hooks, submodule update, external diff, and
  text conversion are never invoked.
- The exact command allowlist is: `rev-parse --is-inside-work-tree`;
  `rev-parse --path-format=absolute --show-toplevel`; `rev-parse --show-prefix`;
  `rev-parse --show-object-format`;
  `rev-parse --verify --end-of-options HEAD^{commit}`;
  `status --porcelain=v2 -z --untracked-files=all --ignore-submodules=none --no-renames`;
  `merge-base --is-ancestor <sha> <head>`;
  `diff --no-ext-diff --no-textconv --no-renames --name-only -z <sha> <head> --`;
  global `--literal-pathspecs` plus
  `ls-tree -z --full-tree <sha> -- <repo-relative-tasks-path>`; and
  `cat-file blob <validated-blob-oid>`.
- Default limits are 64 unique observed SHAs after code-point sort/deduplication,
  3 seconds per command, 15 seconds total envelope time, 4 MiB status/diff
  output, 64 KiB discovery/tree output, 1 MiB historical tasks, and 65,536 NUL
  path records. Output stays Buffer-first until bounded parsing. Text metadata
  and paths use fatal UTF-8; NUL protocols require exactly one terminal NUL and
  no empty interior record, then paths are deduplicated and code-point sorted.
- Repository discovery begins at targetDir; all later calls run at the real
  repo root using its target-relative POSIX prefix. Linked worktrees use that
  worktree's own HEAD/index/status. A target inside a submodule uses the
  submodule as its repository root; a submodule inside the target is observed
  by the parent status. Staged, unstaged, untracked, and dirty gitlink/submodule
  state are dirty; ignored files are not. Only the target project's exact
  other-lane subtree is excluded from impact scope.
- Object format selects lowercase full 40-hex SHA-1 or 64-hex SHA-256. History
  reads use the literal `ls-tree -z` plus `cat-file blob` pair; exactly one
  `100644`/`100755` regular blob at the exact repo-relative tasks path is
  accepted. Merge-base exit 0/1 means ancestor/non-ancestor; any other status is
  a failure. Discovery, status, dirty state, runner timeout/signal, or runner
  output-budget failure maps to R022. Non-ancestor, diff impact, missing/wrong
  historical tasks, parse failure, or semantic drift maps to R021. Raw stderr,
  argv, absolute repo paths, and attacker-controlled evidence text never enter
  an issue message. Missing shallow/promisor objects fail locally without a
  network fallback.

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
`source_cr_ids`, list types, current canonical shape, and exclusion from the
baseline pointer chain without claiming snapshot-proven immutability. For an
applied CR snapshot, validate non-empty approval,
completed review, and a result that resolves to a confirmed BL on the current
lineage; do not claim to prove a historical approved transition or result-BL
newness. A new baseline forces approval/evidence reevaluation instead of
rewriting an old human decision. STATE mismatch is W072 with a rebuild
instruction; it is not baseline authority and does not change readiness.

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
canonical millisecond UTC times and
`confirmed_at <= decided_at <= observed_at <= fixed now` for required approval
(otherwise `confirmed_at <= observed_at <= fixed now`), and apply no TTL.

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
checkRequiredArtifacts(lanePath, governanceTier, riskTier, tasksScope)
```

Build `evidenceGitEnvelope` with the bounded
`resolveEvidenceGitEnvelope(targetDir, laneId, observedShas, options)` adapter, then pass
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
an active lane's `delivery_ready` is false when that lane has any R issue.
Closed-lane R issues do not participate in top-level active-lane aggregation.

- [ ] **Step 6: Run readiness and parser tests**

```bash
node --test test/doctor-readiness.test.js test/doctor-parser.test.js test/doctor-layout.test.js test/doctor.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add bin/doctor-shared.js bin/ai-os-doctor.js test/doctor-layout.test.js test/doctor.test.js test/doctor-readiness.test.js
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
