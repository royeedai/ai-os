# AI-OS v11 Completion and Repository-Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove every design requirement against current local/remote state, apply approved GitHub governance, and leave an honest release-ready v11 candidate without advertising a nonexistent release.

**Architecture:** A requirement matrix maps each design claim to direct evidence. Local adversarial tests precede remote CI. Approved repository settings are applied through GitHub APIs and immediately read back; public v11 tag/release remains a separate final shipping action.

**Tech Stack:** git, npm, Node.js, GitHub CLI/API, GitHub Actions.

## Global Constraints

- Do not run AI-OS doctor against this source repository.
- Do not create repository `.ai-os/` state.
- Do not merge main or create a v11 public tag/release without a separate final shipping confirmation.
- Remote settings changes must be read back and compared with desired state.
- Completion requires local supported checks plus actual GitHub Windows/macOS/Linux evidence.

---

## File Map

- Create `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md`: requirement/evidence ledger for this hardening branch, not downstream AI-OS state.
- Create `.github/branch-protection.json`: reviewed desired main protection payload.
- Create `scripts/verify-v10-migration.js`: repeatable networked smoke from the
  real `v10.5.1` installer into the current local installer.
- Create `scripts/verify-completion-matrix.js`: structural and strict evidence
  validator with a reviewed design-requirement ID catalog.
- Create `scripts/verify-remote-evidence.js` and
  `scripts/verify-repository-settings.js`: current-head PR/check and GitHub
  settings readback validators.
- Modify `docs/maintainers.md`: remote governance/readback instructions.
- No production file is added solely to make completion claims.

### Task 1: Build the completion requirement matrix

**Files:**
- Create: `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md`
- Create: `scripts/verify-completion-matrix.js`
- Modify: `package.json`

**Interfaces:**
- Each row is `ID | Requirement | Evidence command/source | Expected | Actual | Status`.
- Status is only `pending`, `pass`, `fail`, `blocked`, or `live`. `live` is
  reserved for remote rows whose committed evidence source is the marked PR
  comment/API; strict validation treats it as pass only after current-head
  delegated validators succeed.
- The validator owns a frozen, reviewed `REQUIREMENT_IDS` array derived from
  every normative bullet, table row, rule, and completion claim in design
  sections 3-18; a missing/duplicate/unknown ID fails.

- [ ] **Step 1: Inventory every normative design requirement**

Assign stable IDs such as `D03-R01`, `D06-R04`, and `D18-R13` to every
normative rule in sections 3-18, not only the section 18 summary. The matrix and
`REQUIREMENT_IDS` must have an exact one-to-one set. Sections 1/2/19 are checked
as objective, non-goal, and decomposition rows.

- [ ] **Step 2: Bind each row to direct evidence**

Examples:

```text
No target escape | node --test test/path-safety.test.js | all adversarial cases pass and sentinel unchanged | pending | pending
No project overwrite | node --test test/install-idempotency.test.js test/migration.test.js | byte snapshots equal | pending | pending
Remote v11 truth | git ls-remote --exit-code origin refs/tags/v11.0.0; docs pin scan | tag absent and all docs pin RELEASED_VERSION | pending | pending
```

- [ ] **Step 3: Verify no row lacks evidence**

Add `scripts/verify-completion-matrix.js --allow-pending`. It parses escaped
Markdown cells, rejects malformed/duplicate rows and empty Evidence/Expected,
allows `pending` Actual only in this mode, and compares exact requirement IDs.
Add `scripts/` to the package lint script, then run:

```bash
node scripts/verify-completion-matrix.js --allow-pending
npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md scripts/verify-completion-matrix.js package.json
git commit -m "docs: map v11 completion evidence"
```

### Task 2: Run adversarial and migration verification from clean fixtures

**Files:**
- Create: `scripts/verify-v10-migration.js`
- Modify: `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md`
- Modify tests only if a verification exposes an uncovered product defect; use a new failing regression before the fix.

**Interfaces:**
- Consumes all installer/doctor test suites.
- Produces filled local evidence rows in the completion matrix.
- `scripts/verify-v10-migration.js` exits nonzero on any command/hash/report
  mismatch and always deletes its `fs.mkdtempSync` directory in `finally`.

- [ ] **Step 1: Run focused security/transaction suites**

```bash
node --test test/path-safety.test.js test/install-plan.test.js test/install-transaction.test.js test/install-idempotency.test.js test/migration.test.js
```

Expected: zero failures; no test leaves temp locks/backups.

- [ ] **Step 2: Run focused governance/doctor suites**

```bash
node --test test/governance-schema.test.js test/doctor-parser.test.js test/doctor-layout.test.js test/doctor-readiness.test.js
```

Expected: zero failures.

- [ ] **Step 3: Exercise a real pinned v10 install then current migration**

Create `scripts/verify-v10-migration.js`. It selects `npx.cmd` on Windows and
`npx` elsewhere, creates its target with
`fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-v10-migration-"))`, and runs this
exact sequence through `spawnSync`:

The script defines `repoRoot = path.resolve(__dirname, "..")`; a `run` helper
that rejects `error`, `signal`, or nonzero `status` and returns stdout/stderr; a
SHA-256 `hashFiles(root, relativePaths)` helper; and this exact preservation set:

```js
const PRESERVED_PATHS = [
  ".ai-os/MISSION.md",
  ".ai-os/memory.md",
  ".ai-os/lanes/default/MISSION.md",
  ".ai-os/lanes/default/DESIGN.md",
  ".ai-os/lanes/default/STATE.md",
  ".ai-os/lanes/default/risk-register.md",
];
```

Before installing, assert remote `refs/tags/v10.5.1^{}` resolves to
`8c6e2b710fcafd709a69a79f99b823b3ed66c23e`, installed local VERSION is
`10.5.1`, and old `shared.js` exists. Append Markdown comments to MISSION,
memory, DESIGN, and STATE; create a valid risk register; and add CRLF-preserving
user lines outside both team-config managed blocks. Leave pristine lane/tasks/
AGENTS templates untouched so their exact compatibility hashes can migrate.

```js
run(npx, ["--yes", "github:royeedai/ai-os#v10.5.1", target]);
for (const relative of [
  ".ai-os/MISSION.md",
  ".ai-os/memory.md",
  ".ai-os/lanes/default/MISSION.md",
  ".ai-os/lanes/default/DESIGN.md",
  ".ai-os/lanes/default/STATE.md",
]) {
  fs.appendFileSync(path.join(target, relative), `\nAI-OS-USER-SENTINEL: ${relative}\n`);
}
const before = hashFiles(target, PRESERVED_PATHS);
run(process.execPath, [path.join(repoRoot, "bin/create-ai-os.js"), "install", target]);
assert.deepEqual(hashFiles(target, PRESERVED_PATHS), before);
const doctor = run(process.execPath, [
  path.join(target, ".ai-os/bin/ai-os-doctor.js"), target, "--json",
]);
const report = JSON.parse(doctor.stdout);
assert.equal(report.layout_ok, true);
assert.equal(report.delivery_ready, false);
```

Also assert metadata contains `layout_version = "11"`, local VERSION is 11,
pristine tasks/AGENTS were upgraded, old `shared.js` is absent, managed blocks
have their v11 contents while every byte outside the blocks is unchanged, and
the installed local reference equals repository `docs/artifacts.md`
byte-for-byte. Then run:

```bash
node scripts/verify-v10-migration.js
npm run lint
```

Expected: install/migration exit 0, user artifact hashes unchanged, layout 11,
`layout_ok` true, and `delivery_ready` false because v11 tiers/bootstrap remain
unassessed/unconfirmed—not because preserved Markdown comments are invalid.

- [ ] **Step 4: Re-run the original external-write probe**

Inside a second `mkdtemp` fixture in the same script, create
`.ai-os/bin/doctor-shared.js` as a symlink to an external sentinel, snapshot the
tree, and run normal install. Expected: nonzero conflict, sentinel remains
exactly `SENTINEL\n`, and the target snapshot is otherwise unchanged. Always
clean both temp roots in `finally`; never create repository `.ai-os` state.

- [ ] **Step 5: Update matrix actual/status cells and commit evidence**

Only write `pass` where command output directly proves the row.

```bash
git add scripts/verify-v10-migration.js docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md
git commit -m "test: record local hardening evidence"
```

### Task 3: Run complete local distribution verification

**Files:**
- Modify implementation/tests only through red-green fixes if a command fails.
- Update completion matrix after all commands pass.

**Interfaces:**
- Produces current local code/package/audit evidence.

- [ ] **Step 1: Run the full supported local gate**

```bash
npm ci --ignore-scripts
npm test
npm run test:coverage
npm run lint
git diff --check
npm audit --omit=dev
npm audit
npm pack --dry-run --json
```

Expected: all exit 0; package allowlist contains docs/reference sources and excludes repo AGENTS/design/plans unless explicitly allowed.

- [ ] **Step 2: Run release/stale-reference scans**

```bash
if rg -n 'github:royeedai/ai-os#v11\.0\.0|npx create-ai-os(?:\s|$)|install \. --force' README.md PROJECT_PURPOSE.md CONTRIBUTING.md CHANGELOG.md docs/*.md framework examples evals bin; then exit 1; fi
if rg -n 'docs/maintainers\.md' framework/.agents/templates framework/skills; then exit 1; fi
if rg -n '^\.ai-os/memory\.md[[:space:]]+merge=union$' framework bin; then exit 1; fi
git ls-remote --exit-code origin refs/tags/v11.0.0
```

Expected: each guarded scan exits clean without matching its semantic target;
maintainer specs/plans are intentionally excluded. The tag command exits 2
because v11 remains unreleased; the matrix records absence as expected, not
failure.

- [ ] **Step 3: Verify repository boundaries**

```bash
git ls-files '.ai-os/**'
git status --short
```

Expected: no tracked `.ai-os`; status contains only intentional completion-matrix edits before their commit.

- [ ] **Step 4: Commit the updated matrix**

```bash
git add docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md
git commit -m "test: record complete local verification"
```

### Task 4: Obtain independent code and requirements review

**Files:**
- Fix files identified by review using new regression tests.
- Update completion matrix review row.

**Interfaces:**
- Uses superpowers:requesting-code-review after all planned implementation tasks.

- [ ] **Step 1: Request a spec-compliance review**

Reviewer compares design sections 1-19 and every plan task with the branch diff, listing missing/contradictory requirements before style comments.

- [ ] **Step 2: Request a security/maintainability review**

Reviewer focuses on symlink/junction/TOCTOU, rollback correctness, parser fail-closed behavior, user-content ownership, CI permissions, and release truth.

- [ ] **Step 3: Resolve every high/medium finding with TDD**

For each valid finding: reproduce with a failing test, implement minimal correction, run focused/full gates, and commit. Document rejected findings with direct code/test evidence.

- [ ] **Step 4: Re-run the complete local gate**

Use the exact command set from Task 3. Expected: all pass after review fixes.

- [ ] **Step 5: Record review evidence and leave a clean tree**

Write reviewer base/head SHAs, findings, resolutions/rejections, and final gate
results into the matrix. Run the matrix validator with `--allow-pending`, commit
the matrix and any TDD fixes, then require `git status --short` to be empty
before Task 5.

### Task 5: Push the branch and obtain real supported-platform CI

**Files:**
- Create: `scripts/verify-remote-evidence.js`
- Modify: `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md`
- No other local source change unless CI reveals a platform defect.

**Interfaces:**
- Remote branch `codex/ai-os-v11-quality-hardening`.
- Draft PR targets `main`; it is not merged by this plan.
- A single PR comment containing marker `[ai-os-v11-evidence]` is the
  mutable external evidence record. It can follow the current head without a
  self-invalidating evidence commit.

- [ ] **Step 1: Verify branch is clean and push**

```bash
git status --short
git push -u origin codex/ai-os-v11-quality-hardening
```

Expected: clean before push; push succeeds.

- [ ] **Step 2: Create a draft PR with design/verification summary**

Use `gh pr create --draft --base main --head codex/ai-os-v11-quality-hardening` with sections: goal, security fixes, data-preservation contract, governance/doctor changes, verification, migration, release state.

- [ ] **Step 3: Watch all checks to terminal state**

Create/reuse the evidence comment and record its immutable comment URL in the
matrix. Add `scripts/verify-remote-evidence.js`, which reads PR/head/check JSON,
requires all nine blocking names at the current remote head, records the canary
separately, and rejects a mismatched SHA. Commit/push the script and matrix
before the final watch for this task.

```bash
gh pr checks --watch --fail-fast=false
```

Expected: blocking Node 22/24, Ubuntu/Windows/macOS, coverage, package, dependency review, and CodeQL checks pass. Node 26 canary result is recorded separately.

- [ ] **Step 4: Fix any CI-only defect locally with a reproducer where possible**

Commit/push each fix, then watch again until every blocking check passes at the
new current head.

- [ ] **Step 5: Update external current-head evidence without another commit**

Edit the marked PR comment with PR URL, current head SHA, check
names/conclusions/run URLs, canary conclusion, and timestamps. Run
`node scripts/verify-remote-evidence.js`; do not modify or commit repository
files after this readback.

### Task 6: Apply and read back approved GitHub governance

**Files:**
- Create: `.github/branch-protection.json`
- Modify: `docs/maintainers.md`
- Modify: `test/ci-config.test.js`
- Create: `scripts/verify-repository-settings.js`

**Interfaces:**
- Main protection requires strict successful checks, one review, stale dismissal, code-owner review, last-push approval, conversation resolution, linear history, no force push/delete.
- Actions policy sets `sha_pinning_required=true`.

- [ ] **Step 1: Capture current remote state**

```bash
gh api -i repos/royeedai/ai-os/branches/main/protection
gh api repos/royeedai/ai-os/rulesets
gh api repos/royeedai/ai-os/actions/permissions
gh api repos/royeedai/ai-os/code-scanning/default-setup
gh label list --repo royeedai/ai-os --limit 100
```

Accept any idempotent pre-state. Treat protection HTTP 404 as “unprotected,”
record every response/status before mutation in the external evidence comment,
and compute the desired diff; never assume the earlier audit is still current.

- [ ] **Step 2: Write and test the desired branch-protection payload**

Create JSON using the stable blocking job names defined by the CI plan and
confirmed in Task 5:

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Node 22 quality",
      "Node 24 quality",
      "Ubuntu smoke",
      "Windows smoke",
      "macOS smoke",
      "Coverage",
      "Package smoke",
      "Dependency Review",
      "CodeQL"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
```

Make `test/ci-config.test.js` compare this array exactly with its expected
blocking-name constant, and compare the same constant with the successful check
names read from Task 5. The Node 26 canary must not appear in protection.

Create `scripts/verify-repository-settings.js`. It invokes `gh api` itself,
checks protection booleans/contexts/review count, Actions permissions, CodeQL
default setup state, labels, vulnerability-alert HTTP status, automated-fix
HTTP status, and private-reporting JSON. Static tests compare only committed
desired state; dynamic current checks stay in this readback script.

- [ ] **Step 3: Commit desired state before mutating the repository**

Update maintainer documentation with the exact apply/readback/limited-feature
procedure, run local config/matrix tests, commit these four files, push, wait for
all blocking checks on the new head, and refresh the external CI evidence
comment. The desired state being applied is now reviewed and reproducible.

- [ ] **Step 4: Apply protection and action pinning**

```bash
gh api --method PUT repos/royeedai/ai-os/branches/main/protection --input .github/branch-protection.json
gh api --method PUT repos/royeedai/ai-os/actions/permissions -F enabled=true -f allowed_actions=all -F sha_pinning_required=true
```

- [ ] **Step 5: Enable repository security settings and feedback label**

```bash
gh api --method PUT repos/royeedai/ai-os/vulnerability-alerts
gh api --method PUT repos/royeedai/ai-os/automated-security-fixes
gh api --method PUT repos/royeedai/ai-os/private-vulnerability-reporting
gh label create framework-feedback --repo royeedai/ai-os --color 0E8A16 --description "Preventable AI-OS delivery feedback" --force
```

CodeQL is provided by the committed advanced workflow; do not simultaneously enable default setup.

- [ ] **Step 6: Read back and assert desired or proven-unavailable state**

Run `node scripts/verify-repository-settings.js`. Vulnerability-alert GET must
return HTTP 204; automated-security-fixes GET must return HTTP 200 JSON with
`enabled: true` and `paused: false`; private reporting must return JSON
`enabled: true`; protection/actions/label values must equal the committed
payload. If a feature is unavailable because the API returns a stable
403/404 plan/permission limitation, capture status plus sanitized body, document
the exact unavailable state, and mark the requirement pass only under the
design's explicit “proven unavailable, non-misleading” alternative. Network
errors, ambiguous responses, and ordinary mismatches remain fail.

- [ ] **Step 7: Update external settings evidence**

Edit the marked PR comment with sanitized pre-state, API mutation results, and
post-state readback. Re-run both remote validators. Do not create another source
commit merely to record live settings.

### Task 7: Perform the final requirement-by-requirement audit

**Files:**
- Finalize: `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md`

**Interfaces:**
- Completion matrix has no pending/fail/blocked rows; remote rows may remain
  `live` because their current truth is verified rather than self-recorded.
- Strict matrix validation delegates remote rows to the marked PR comment and
  live API validators, so current-head evidence remains valid without a new
  evidence-only commit.

- [ ] **Step 1: Re-read the objective, design, six plans, and matrix**

For every explicit requirement, point to a current file, command result, PR check, or API readback. Indirect/string-only evidence is insufficient for behavioral claims.

- [ ] **Step 2: Re-run final local verification at the immutable final source head**

Require a clean tree, run the complete Task 3 gate plus focused
security/migration probes, and record head SHA/output in the marked PR evidence
comment. No repository file changes follow this point.

- [ ] **Step 3: Re-read final remote state**

Confirm pushed head, wait for all checks on that exact head, and re-read main
protection, Actions pinning, vulnerability/security settings, label, remote
tags, and latest release. Edit the same evidence comment with final code, data,
and runtime status. v11 remains untagged and docs remain pinned to
`RELEASED_VERSION=10.5.1` unless the user separately commands release.

- [ ] **Step 4: Check the matrix is fully proven**

Run `node scripts/verify-completion-matrix.js` without `--allow-pending`; it
fails on `pending`, `fail`, `blocked`, empty Actual, duplicate/missing IDs, or
unresolved evidence and invokes both live remote validators for external rows.

- [ ] **Step 5: Mark the goal complete without invalidating the proven head**

Only after strict local/external validation passes and `git status --short` is
empty, call the goal-status tool with `complete`. The final proof lives in the
already-committed matrix plus the marked current-head PR evidence comment; no
post-proof commit is created. Do not create/push/merge a v11 tag or release.
