# AI-OS v11 Merge-Readiness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the v11 hardening branch locally merge-ready by restoring reproducible completion evidence, truthful release notes, and passing Node 24 coverage without lowering quality thresholds.

**Architecture:** Keep the runtime architecture unchanged. Add one read-only evidence-reference validation boundary to the completion-matrix script, correct the matrix and changelog data, and add externally observable governance/doctor tests that cover currently unverified behavior.

**Tech Stack:** Node.js 22.13+/24, `node:test`, synchronous Node filesystem APIs, Markdown release/evidence documents, Git.

## Global Constraints

- Do not lower `--test-coverage-lines=94`, `--test-coverage-branches=72`, or `--test-coverage-functions=98`.
- Do not create `.ai-os/`, lanes, baselines, tasks, or release artifacts in this maintainer repository.
- Do not refactor the installer or doctor beyond changes required by a failing regression test.
- Do not mutate GitHub repository settings, create a PR, tag, release, or merge.
- Keep code/source, repository data/settings, and runtime/CI status separate.
- Every implementation task follows red-green-refactor and ends with a commit.

---

### Task 1: Reject missing repository-local completion evidence

**Files:**
- Modify: `scripts/verify-completion-matrix.js`
- Modify: `test/completion.test.js`

**Interfaces:**
- Consumes: parsed matrix rows from `parseMatrix(content)`.
- Produces: `evidenceReferences(evidence): string[]`.
- Produces: `verifyEvidenceReferences(rows, repositoryRoot = repoRoot): void`.
- Updates: `verifyRows(rows, options)` to run reference validation before accepting pass evidence.

- [ ] **Step 1: Write failing evidence-reference tests**

Add tests that create synthetic rows and assert safe references pass while
missing, absolute, and traversal references fail:

```js
test("completion evidence references must exist inside the repository", () => {
  const rows = [{
    id: "D01-R01",
    requirement: "fixture",
    evidence: "`node --test test/completion.test.js`; `node scripts/verify-completion-matrix.js --allow-pending`",
    expected: "pass",
    actual: "pass",
    status: "pass",
  }];
  assert.doesNotThrow(() => matrix.verifyEvidenceReferences(rows, repoRoot));
  for (const evidence of [
    "`node --test test/missing.test.js`",
    "`node /tmp/outside.js`",
    "`node test/../outside.test.js`",
  ]) {
    assert.throws(
      () => matrix.verifyEvidenceReferences([{ ...rows[0], evidence }], repoRoot),
      /evidence reference/i,
    );
  }
});
```

Also assert `evidenceReferences()` deduplicates references and ignores command
tokens such as `npm test`, `branch history`, and URLs.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test test/completion.test.js
```

Expected: FAIL because `verifyEvidenceReferences` and `evidenceReferences` are
not exported.

- [ ] **Step 3: Implement deterministic reference extraction and validation**

Add a repository-path matcher limited to current source namespaces and root
metadata:

```js
const EVIDENCE_PATH_PATTERN =
  /(?:^|[\s`;])((?:\.github|bin|docs|evals|examples|framework|scripts|test)\/[A-Za-z0-9._/-]+|(?:CHANGELOG|CONTRIBUTING|PROJECT_PURPOSE|README|SECURITY)\.md|(?:RELEASED_VERSION|VERSION|package(?:-lock)?\.json))(?=$|[\s`;])/gu;

function evidenceReferences(evidence) {
  return [...new Set(
    [...String(evidence).matchAll(EVIDENCE_PATH_PATTERN)].map((match) => match[1]),
  )].sort();
}

function verifyEvidenceReferences(rows, repositoryRoot = repoRoot) {
  for (const row of rows) {
    for (const relativePath of evidenceReferences(row.evidence)) {
      const normalized = path.posix.normalize(relativePath);
      if (
        normalized !== relativePath
        || path.posix.isAbsolute(relativePath)
        || normalized === ".."
        || normalized.startsWith("../")
      ) {
        throw new Error(`${row.id} has unsafe evidence reference: ${relativePath}`);
      }
      const absolute = path.resolve(repositoryRoot, ...relativePath.split("/"));
      if (!absolute.startsWith(`${path.resolve(repositoryRoot)}${path.sep}`)) {
        throw new Error(`${row.id} evidence reference escapes repository: ${relativePath}`);
      }
      if (!fs.existsSync(absolute)) {
        throw new Error(`${row.id} evidence reference is missing: ${relativePath}`);
      }
    }
  }
}
```

Call `verifyEvidenceReferences(rows)` at the start of `verifyRows`, and export
both functions.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test test/completion.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-completion-matrix.js test/completion.test.js
git commit -m "fix: validate completion evidence paths"
```

---

### Task 2: Repair the completion matrix evidence and live-state wording

**Files:**
- Modify: `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md`
- Modify: `test/completion.test.js`

**Interfaces:**
- Consumes: Task 1 evidence validation.
- Produces: 195 matrix rows whose repository-local evidence references all
  resolve to current files.

- [ ] **Step 1: Add a failing matrix regression**

Extend the canonical-matrix test:

```js
assert.doesNotThrow(() => matrix.verifyEvidenceReferences(rows, repoRoot));
for (const removed of [
  "test/release-truth.test.js",
  "test/manifest.test.js",
  "test/team-config.test.js",
  "test/compat-manifest.test.js",
]) {
  assert.ok(!fs.readFileSync(MATRIX_PATH, "utf8").includes(removed), removed);
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test test/completion.test.js
```

Expected: FAIL on the first stale test path.

- [ ] **Step 3: Replace stale evidence with current suites**

Use these canonical replacements, removing duplicate paths within a command:

```text
test/release-truth.test.js  -> test/release.test.js
test/compat-manifest.test.js -> test/compat-hashes.test.js
test/manifest.test.js       -> test/install.test.js and/or test/doctor-layout.test.js
test/team-config.test.js    -> test/migration.test.js and/or test/install-idempotency.test.js
```

Update D18-R11 Actual to state that ordinary local gates pass but coverage is
being repaired until Task 4 completes. Update D18-R12 and the closeout summary
to describe authenticated readback with unapplied settings rather than invalid
GitHub authentication.

- [ ] **Step 4: Run matrix tests and validator**

Run:

```bash
node --test test/completion.test.js
node scripts/verify-completion-matrix.js --allow-pending
```

Expected: PASS; validator reports 195 requirements and the current unresolved
count.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md test/completion.test.js
git commit -m "docs: repair completion evidence"
```

---

### Task 3: Make the unreleased v11 changelog truthful

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `test/release.test.js`

**Interfaces:**
- Produces: release-truth assertions for layout 11, tasks v5, readiness doctor,
  transactional migration, and current test organization.

- [ ] **Step 1: Write the failing changelog contract test**

Add:

```js
test("unreleased v11 changelog describes the implemented contract", () => {
  const changelog = read("CHANGELOG.md");
  for (const required of [
    'layout schema 升为 **v11**',
    '`tasks.yaml` schema 升为 **version 5**',
    '`delivery_ready`',
    'v10 → v11',
    '691',
  ]) assert.ok(changelog.includes(required), required);
  for (const stale of [
    'layout schema 升为 **v10**',
    '`tasks.yaml` 模板精简（version 4）',
    'doctor 收敛为结构检查 + 两个语义警告',
  ]) assert.ok(!changelog.includes(stale), stale);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test test/release.test.js
```

Expected: FAIL on the first missing v11 contract phrase.

- [ ] **Step 3: Rewrite the v11 entry**

Replace stale Changed, Removed, Tests, and Migration bullets with the
implemented contract:

- tasks v5 approval/evidence/delivery-state schema;
- layout 11 and committed framework identity;
- transactional, ownership-aware installer with bounded v10 migration;
- doctor `layout_ok` plus `delivery_ready`, all-lane readiness, Git ancestry,
  approval, evidence, and present on-demand schema checks;
- current consolidated Node test suite and coverage gate;
- v10.5.1 remains the public install pin until a separately authorized v11
  release.

- [ ] **Step 4: Run release and documentation tests**

Run:

```bash
node --test test/release.test.js test/docs.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md test/release.test.js
git commit -m "docs: align v11 release notes"
```

---

### Task 4: Restore the committed coverage contract with governance tests

**Files:**
- Modify: `test/doctor-readiness.test.js`
- Modify if evidence requires: `test/doctor.test.js`

**Interfaces:**
- Consumes: exported `parseBaselineRecord`, `GovernanceValidationError`,
  `createLocalGitRunner`, and `resolveGitState`.
- Produces: externally observable tests for all record lifecycle variants and
  bounded Git-runner failure states.

- [ ] **Step 1: Add lifecycle record builders and failing behavior tests**

Add builders for change and retrospective records:

```js
function changeRecord({
  id = "CR-20260711-021000-change",
  status = "proposed",
  approval = "",
  reviewStatus = "pending",
  preventable = "",
  rootCause = "",
  suggestedGuard = "",
  resultId = "",
} = {}) {
  return `# ${id}

- **Type**: change
- **Status**: ${status}
- **current_behavior**: current
- **proposed_delta**: proposed
- **affected_artifacts**:
  - src/example.js
- **acceptance_delta**:
  - AC-001
- **approval**: ${approval || '""'}
- **close_condition**: tests pass
- **preventability_review**:
  - **status**: ${reviewStatus}
  - **preventable**: ${preventable || '""'}
  - **root_cause**: ${rootCause || '""'}
  - **suggested_guard**: ${suggestedGuard || '""'}
- **result_baseline_id**: ${resultId || '""'}
`;
}
```

Add table-driven success tests for `proposed`, `approved`, `applied`, and
`rejected`, plus a closed retrospective. Add table-driven failures for:

- duplicate metadata keys and list items outside list fields;
- invalid Type/status/ID;
- pending review with non-empty fields;
- completed review with invalid preventable value or empty root cause/guard;
- invalid approval/result combinations for every change status;
- retrospective invalid ID/status/source CR IDs;
- bootstrap timestamp mismatch and baseline invalid human/source refs.

- [ ] **Step 2: Run readiness tests and confirm the new assertions exercise failures**

Run:

```bash
node --test test/doctor-readiness.test.js
```

Expected: PASS after test data is correct. If any assertion unexpectedly does
not throw, fix the fixture so it targets the intended public contract; do not
change runtime behavior merely for coverage.

- [ ] **Step 3: Add Git-runner boundary tests if coverage remains below threshold**

Cover externally returned reasons for:

```text
command-not-allowed
invalid-working-directory
invalid-output-budget
total-timeout
git-unavailable
output-limit
command-failed
invalid-git-output
```

Use injected `spawnSyncImpl` and `monotonicNow`; assert only stable
`{ state: "unavailable", reason }` objects and never attacker stderr.

- [ ] **Step 4: Run exact Node 24 coverage**

Run:

```bash
npx --yes -p node@24 node --test --test-concurrency=1 --experimental-test-coverage '--test-coverage-include=bin/**/*.js' --test-coverage-lines=94 --test-coverage-branches=72 --test-coverage-functions=98 test/*.test.js
```

Expected: exit 0 with line coverage at least 94%, branch coverage at least 72%,
and function coverage at least 98%.

- [ ] **Step 5: Commit**

```bash
git add test/doctor-readiness.test.js test/doctor.test.js
git commit -m "test: restore v11 coverage contract"
```

---

### Task 5: Final merge-readiness verification and evidence update

**Files:**
- Modify if needed: `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md`
- Modify if needed: `test/completion.test.js`

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: one clean committed branch with truthful local evidence and
  explicit remote blockers.

- [ ] **Step 1: Run all repository gates**

Run:

```bash
npm test
npm run test:coverage
npm run lint
git diff --check
npm pack --dry-run --json
npm audit
npm audit --omit=dev
node scripts/verify-completion-matrix.js --allow-pending
```

Expected: every command exits 0.

- [ ] **Step 2: Run Node 24 coverage again**

Run the exact command from Task 4 Step 4.

Expected: exit 0.

- [ ] **Step 3: Perform read-only remote checks**

Run:

```bash
node scripts/verify-remote-evidence.js
node scripts/verify-repository-settings.js
gh pr list --state all --head codex/ai-os-v11-quality-hardening
gh run list --branch codex/ai-os-v11-quality-hardening --limit 20
```

Expected: failures or empty results are reported as remote state, not converted
to local pass claims.

- [ ] **Step 4: Update final matrix wording if local evidence changed**

Set D18-R11 Actual to the exact local gate result while keeping it `blocked`
until current-head remote checks exist. Keep D18-R12 blocked until repository
settings pass readback. Do not mark D18-R13 or D19-R06/R07 complete without
remote evidence.

- [ ] **Step 5: Re-run affected validators**

Run:

```bash
node --test test/completion.test.js test/release.test.js
node scripts/verify-completion-matrix.js --allow-pending
git diff --check
```

Expected: PASS.

- [ ] **Step 6: Commit final evidence state**

```bash
git add docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md test/completion.test.js
git commit -m "docs: record local merge readiness"
```

- [ ] **Step 7: Confirm clean branch state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
git rev-list --left-right --count origin/main...HEAD
```

Expected: clean worktree; local branch contains the design and implementation
commits; remote divergence is reported without pushing.
