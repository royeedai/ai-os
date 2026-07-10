# AI-OS v11 CI and Supply-Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce supported-platform tests, immutable workflow dependencies, dependency/security review, and critical-path ownership before v11 release readiness.

**Architecture:** CI uses pinned official Actions and least-privilege jobs. Repository-owned files define dependency updates, CodeQL, security reporting, and code ownership; external rules/settings are applied and read back only in the completion plan.

**Tech Stack:** GitHub Actions, Node 22/24/26, npm, CodeQL, Dependabot.

## Global Constraints

- Node 22 and 24 plus Ubuntu/Windows/macOS smoke are blocking.
- Node 26 is a non-blocking canary.
- Every `uses:` reference is a reviewed full 40-character commit SHA.
- Default workflow permission is read-only; write permission is scoped per job.
- Production audit must be clean; full development audit has no accepted untracked vulnerability.
- No workflow publishes or deploys automatically.
- Every job that runs `npm test` or `npm run test:coverage` checks out the complete tag oracle with `fetch-depth: 0` and `fetch-tags: true`.

---

## File Map

- `.github/workflows/ci.yml`: supported matrix, lint, test, coverage, package smoke.
- `.github/workflows/codeql.yml`: static security analysis.
- `.github/workflows/dependency-review.yml`: pull-request dependency gate.
- `.github/workflows/security-audit.yml`: scheduled/full npm audit.
- `.github/dependabot.yml`: npm and GitHub Actions updates.
- `.github/CODEOWNERS`: critical path review ownership.
- `SECURITY.md`: private disclosure and support policy.
- `package.json`, `package-lock.json`: updated dev toolchain and fixed transitive audit.
- `test/ci-config.test.js`: static workflow/security policy tests.

### Task 1: Remove the known development vulnerability and lock support metadata

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CONTRIBUTING.md`
- Create: `test/dependencies.test.js`

**Interfaces:**
- Package engines remain `>=22.13.0`.
- ESLint resolves to current compatible 10.x and `brace-expansion` resolves outside `>=5.0.0 <5.0.6`.

- [ ] **Step 1: Write lock-policy tests**

```js
test("lockfile has no vulnerable brace-expansion 5.0.0-5.0.5", () => {
  const lock = JSON.parse(readRepo("package-lock.json"));
  const entry = lock.packages["node_modules/brace-expansion"];
  assert.ok(entry);
  assert.doesNotMatch(entry.version, /^5\.0\.[0-5]$/);
});

test("supported Node floor matches package and contributing docs", () => {
  const pkg = JSON.parse(readRepo("package.json"));
  assert.equal(pkg.engines.node, ">=22.13.0");
  assert.match(readRepo("CONTRIBUTING.md"), /Node\.js 22\.13\+/);
});
```

Import `test`, `assert`, and `readRepo` from `./helpers`; no CI test depends on
the later surfaces subplan.

- [ ] **Step 2: Verify current dependency test and audit fail**

```bash
node --test test/dependencies.test.js
npm audit --json
```

Expected: test/audit identify vulnerable `brace-expansion@5.0.5`.

- [ ] **Step 3: Update the compatible development toolchain**

Run:

```bash
npm install --save-dev --ignore-scripts @eslint/js@^10.0.1 eslint@^10.6.0
```

Update the prerequisite line in `CONTRIBUTING.md` from Node 18+ to Node 22.13+.
Review the lock diff; do not add production dependencies or lifecycle scripts.

- [ ] **Step 4: Run audits and core verification**

```bash
npm audit --omit=dev
npm audit
node --test test/dependencies.test.js
npm run lint
```

Expected: both audits report zero vulnerabilities; tests/lint pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json CONTRIBUTING.md test/dependencies.test.js
git commit -m "chore: update supported development toolchain"
```

### Task 2: Replace CI with a pinned supported matrix

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `test/ci-config.test.js`

**Interfaces:**
- Uses checkout SHA `df4cb1c069e1874edd31b4311f1884172cec0e10`.
- Uses setup-node SHA `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e`.
- Produces stable blocking check names `Node 22 quality`, `Node 24 quality`,
  `Ubuntu smoke`, `Windows smoke`, `macOS smoke`, `Coverage`, and
  `Package smoke`; `Node 26 canary` is explicitly non-blocking.

- [ ] **Step 1: Write CI policy tests**

Define test-local helpers: `jobBlock(yaml, id)` returns text from an exact
two-space job key through the next two-space job key; `actionRefs(yaml)` returns
a null-prototype action-name-to-SHA object and rejects one action name resolving
to multiple SHAs; `declaredCheckNames(yaml)` expands the exact `quality` Node
`[22, 24]` display template and collects the three platform-include names plus
static job names. Fix job IDs as `quality`, `platform`, `coverage`,
`package-smoke`, and `canary` in the workflow. Then parse workflow text and
assert the exact job names, matrix entries, commands,
and reviewed action mapping. Do not require an `os: [...]` form when the desired
workflow uses an `include` matrix:

```js
assert.match(ci, /^permissions:\n  contents: read/m);
assert.match(ci, /node-version: \[22, 24\]/);
for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) assert.ok(ci.includes(os));
for (const name of ["Node 22 quality", "Node 24 quality", "Ubuntu smoke",
  "Windows smoke", "macOS smoke", "Coverage", "Package smoke", "Node 26 canary"]) {
  assert.ok(declaredCheckNames(ci).includes(name), `stable job ${name}`);
}
assert.match(ci, /node-version: 26/);
assert.ok(jobBlock(ci, "canary").includes("continue-on-error: true"));
assert.doesNotMatch(ci, /node-version: \[18|node-version: \[20|@v\d/);
assert.deepEqual(actionRefs(ci), {
  "actions/checkout": "df4cb1c069e1874edd31b4311f1884172cec0e10",
  "actions/setup-node": "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e",
});
```

- [ ] **Step 2: Verify current workflow fails the policy**

```bash
node --test test/ci-config.test.js
```

Expected: FAIL on Node 18/20, mutable `@v4`, missing permissions/OS/canary.

- [ ] **Step 3: Implement blocking quality and platform jobs**

Use:

```yaml
permissions:
  contents: read

jobs:
  quality:
    name: Node ${{ matrix.node-version }} quality
    strategy:
      matrix:
        node-version: [22, 24]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6
        with:
          persist-credentials: false
          fetch-depth: 0
          fetch-tags: true
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6
        with:
          node-version: ${{ matrix.node-version }}
          package-manager-cache: false
      - run: npm ci --ignore-scripts
      - run: npm test
      - run: npm run lint
      - run: git diff --check
      - run: npm audit --omit=dev
      - run: npm pack --dry-run --json
```

Add a Node 24 OS matrix whose `include` entries carry the exact display names
`Ubuntu smoke`, `Windows smoke`, and `macOS smoke`; set `name: ${{ matrix.name }}`.
Add separate `Coverage` and `Package smoke` jobs on Ubuntu Node 24. Add a
`Node 26 canary` Ubuntu job with `continue-on-error: true` at job level and run
`npm run test:coverage` in it. Platform smoke runs the path-safety and package
suites so Unicode/space paths, CRLF fixtures, executable mode, symlink behavior,
and the Windows junction case are exercised on their real platforms.
The quality, Coverage, and Node 26 canary checkouts all fetch full history and
tags so the migration suite can read its packaged v10 compatibility oracle.
The Node 22 and 24 quality jobs each run the full test/lint/diff/audit/pack gate;
the separate package job performs the tarball-install smoke once without
weakening supported-version pack coverage.

- [ ] **Step 4: Validate YAML text policy and local equivalents**

```bash
node --test test/ci-config.test.js
npm ci --ignore-scripts
npm test
npm run test:coverage
npm run lint
git diff --check
```

Expected: all commands pass.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml test/ci-config.test.js
git commit -m "ci: test supported platforms with pinned actions"
```

### Task 3: Add dependency review and CodeQL

**Files:**
- Create: `.github/workflows/dependency-review.yml`
- Create: `.github/workflows/codeql.yml`
- Modify: `test/ci-config.test.js`

**Interfaces:**
- Dependency review action SHA is `a1d282b36b6f3519aa1f3fc636f609c47dddb294` (v5.0.0).
- CodeQL action commit is `99df26d4f13ea111d4ec1a7dddef6063f76b97e9` (dereferenced v4).
- Produces stable blocking check names `Dependency Review` and `CodeQL` through
  explicit job-level `name` fields.

- [ ] **Step 1: Extend policy tests**

Assert dependency review runs only on pull requests with `contents: read`, and CodeQL has only `security-events: write` plus `contents: read`, initializes `javascript-typescript` and `actions`, and has no mutable action refs.

- [ ] **Step 2: Verify files are absent**

```bash
node --test test/ci-config.test.js
```

Expected: FAIL because both workflows are absent.

- [ ] **Step 3: Add dependency review workflow**

```yaml
name: Dependency Review
on: pull_request
permissions:
  contents: read
jobs:
  dependency-review:
    name: Dependency Review
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6
        with:
          persist-credentials: false
      - uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0
```

- [ ] **Step 4: Add CodeQL workflow**

Use one job with `name: CodeQL`, `github/codeql-action/init` and `/analyze` at
the exact SHA, a weekly schedule, push/PR main triggers, and
`security-events: write` only in its job. Configure languages
`javascript-typescript,actions`.

- [ ] **Step 5: Run config tests and diff check**

```bash
node --test test/ci-config.test.js
git diff --check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/dependency-review.yml .github/workflows/codeql.yml test/ci-config.test.js
git commit -m "ci: add dependency and code security review"
```

### Task 4: Add scheduled full audit and dependency updates

**Files:**
- Create: `.github/workflows/security-audit.yml`
- Create: `.github/dependabot.yml`
- Modify: `test/ci-config.test.js`

**Interfaces:**
- Weekly npm and GitHub Actions Dependabot groups.
- Weekly/manual full `npm audit` with no write token.

- [ ] **Step 1: Add failing presence/policy tests**

Assert Dependabot has two `package-ecosystem` entries (`npm`, `github-actions`), weekly interval, open-PR limit, and grouped non-major updates. Assert security audit runs `npm ci --ignore-scripts` then full `npm audit` using pinned checkout/setup-node.

- [ ] **Step 2: Verify files are absent**

```bash
node --test test/ci-config.test.js
```

Expected: FAIL.

- [ ] **Step 3: Create exact configs**

Use UTC Monday schedules, directory `/`, `open-pull-requests-limit: 5`, and groups `development-minor-patch` / `actions-minor-patch`. Do not grant write permissions in the audit workflow.

- [ ] **Step 4: Run config tests**

```bash
node --test test/ci-config.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .github/dependabot.yml .github/workflows/security-audit.yml test/ci-config.test.js
git commit -m "chore: automate dependency security checks"
```

### Task 5: Add security policy and code ownership

**Files:**
- Create: `SECURITY.md`
- Create: `.github/CODEOWNERS`
- Modify: `test/ci-config.test.js`
- Modify: `test/package.test.js`
- Modify: `package.json`

**Interfaces:**
- CODEOWNERS owner is `@royeedai`.
- Security policy distinguishes supported `v10.5.1` from unreleased main.
- `test/ci-config.test.js` imports `readRepo` from `./helpers` and defines
  `escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }`.

- [ ] **Step 1: Write policy file tests**

```js
assert.match(codeowners, /^\/\.github\/CODEOWNERS\s+@royeedai$/m);
for (const critical of ["/bin/", "/framework/", "/.github/workflows/", "/VERSION", "/RELEASED_VERSION", "/package.json"]) {
  assert.match(codeowners, new RegExp(`^${escapeRegex(critical)}.*@royeedai$`, "m"));
}
assert.match(security, /private vulnerability reporting/i);
assert.match(security, /v10\.5\.1/);
assert.match(security, /main.*unreleased/i);
```

- [ ] **Step 2: Verify files are absent**

```bash
node --test test/ci-config.test.js
```

Expected: FAIL.

- [ ] **Step 3: Create CODEOWNERS and SECURITY**

CODEOWNERS explicitly owns itself and all critical paths. SECURITY directs
reporters to GitHub private vulnerability reporting and provides no invented
email address. Add `SECURITY.md` to the package allowlist and to the package
test's exact required list so tarball presence is proven.

- [ ] **Step 4: Run policy/package tests**

```bash
node --test test/ci-config.test.js test/package.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add SECURITY.md .github/CODEOWNERS package.json test/ci-config.test.js test/package.test.js
git commit -m "docs: protect critical release paths"
```
