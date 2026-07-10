# AI-OS v11 Safe Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the destructive, symlink-following installer with an ownership-aware, idempotent, rollback-capable layout-v11 installer and bounded v10 migration.

**Architecture:** `bin/doctor-shared.js` contains the small zero-dependency layout/hash/path contract vendored with doctor. `bin/installer.js` owns read-only planning and transactional execution. `bin/create-ai-os.js` remains a thin argument/diagnostic entrypoint.

**Tech Stack:** Node.js built-ins (`fs`, `path`, `crypto`, `os`), CommonJS, `node:test`.

## Global Constraints

- Never overwrite `project` or `session` content.
- `--force` replaces only `framework` content.
- Reject symlinks/junctions and any resolved path outside the target.
- Preflight is read-only; staging happens only after an exclusive root lock.
- Runtime code has no third-party dependency and performs no network request.
- Layout schema is `11`; current framework version remains `11.0.0` unreleased.

---

## File Map

- Create `bin/doctor-shared.js`: constants, canonical paths, hashes, metadata parsing, safe path inspection.
- Create `bin/installer.js`: source inventory, ownership plan, lock/stage/commit/rollback, v10 migration.
- Modify `bin/create-ai-os.js`: CLI only.
- Modify `bin/ai-os-doctor.js`: import `doctor-shared`.
- Delete `bin/shared.js` after all consumers move.
- Create `framework/.agents/compat/v10-template-hashes.json`: exact known v10 template hashes.
- Modify templates under `framework/.agents/templates/`: layout-v11 sources.
- Add installer security/migration tests.

### Task 1: Introduce canonical layout and safe path primitives

**Files:**
- Create: `bin/doctor-shared.js`
- Create: `test/fixtures.js`
- Create: `test/path-safety.test.js`
- Modify: `test/shared.test.js`

**Interfaces:**
- Produces `sha256(input: string|Buffer): string`.
- Produces `resolveTargetRoot(target: string): string`.
- Produces `inspectPath(root: string, relative: string): { absolute, exists, kind, link, contained }`.
- Produces constants `LAYOUT_VERSION`, `LAYOUT_MODE`, `OWNERSHIP`, `FRAMEWORK_FILES`, `PROJECT_FILES`, `SESSION_FILES`.
- Produces test-only fixture helpers `symlinkFixture(relativePath)`,
  `symlinkParentFixture(relativePath)`, `snapshotTree(root)`, and
  `readRepo(relativePath)` from `test/fixtures.js`; every fixture owns a temp root
  registered for cleanup by `test/helpers.js`.

The inventory constants contain normalized installed file paths. Framework is
`framework.toml`, local doctor/shared/version, local artifact reference, and the
manifest's fixed implicit path; project is root constitution/IDE/team-config,
shared/lane templates, tasks, and baseline records; session is lane STATE. Tests
assert the sets are disjoint, contain no `..` or absolute path, and every source
mapping has exactly one ownership/type/mode.

- [ ] **Step 1: Write adversarial failing tests**

Tests create a temp target plus an external sentinel and assert:

```js
test("managed file symlink is rejected before write", () => {
  const { target, outside } = symlinkFixture(".ai-os/bin/doctor-shared.js");
  assert.throws(
    () => inspectPath(target, ".ai-os/bin/doctor-shared.js"),
    /symbolic link|junction/i,
  );
  assert.equal(fs.readFileSync(outside, "utf8"), "SENTINEL\n");
});

test("parent-directory symlink is rejected", () => {
  const { target } = symlinkParentFixture(".ai-os/bin");
  assert.throws(() => inspectPath(target, ".ai-os/bin/VERSION"), /symbolic link|junction/i);
});

test("dot-dot destination cannot escape target", () => {
  assert.throws(() => inspectPath(target, "../outside"), /outside target/i);
});
```

Add table cases for a dangling managed-file symlink, the target root itself as a
symlink, a Unicode-and-space target path, and a pre-existing non-directory
parent. On Windows, create a directory junction and require rejection; skip only
that junction case on non-Windows. A read-only-directory case runs where the
platform enforces mode bits and otherwise records a test skip with the reason.

- [ ] **Step 2: Run the tests to prove the API is absent**

```bash
node --test test/path-safety.test.js
```

Expected: FAIL with `Cannot find module '../bin/doctor-shared'`.

- [ ] **Step 3: Implement exact constants and hash API**

Start `bin/doctor-shared.js` with:

```js
"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const LAYOUT_VERSION = "11";
const LAYOUT_MODE = "shared-root-default-lane";
const OWNERSHIP = Object.freeze({ FRAMEWORK: "framework", PROJECT: "project", SESSION: "session" });

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
```

- [ ] **Step 4: Implement containment and no-link inspection**

Use `path.relative` containment and `lstatSync` for every segment. Do not use
`existsSync` to decide whether to call `lstatSync`, because it hides dangling
symlinks; catch only `ENOENT` from `lstatSync`:

```js
function assertContained(root, absolute) {
  const relative = path.relative(root, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`destination is outside target: ${absolute}`);
  }
}

function inspectPath(root, relative) {
  const absolute = path.resolve(root, relative);
  assertContained(root, absolute);
  const segments = path.relative(root, absolute).split(path.sep).filter(Boolean);
  let cursor = root;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    let stat;
    try { stat = fs.lstatSync(cursor); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`symbolic link or junction rejected: ${cursor}`);
  }
  let stat;
  try { stat = fs.lstatSync(absolute); }
  catch (error) {
    if (error.code === "ENOENT") return { absolute, exists: false, kind: "missing", link: false, contained: true };
    throw error;
  }
  const kind = stat.isFile() ? "file" : stat.isDirectory() ? "dir" : "other";
  return { absolute, exists: true, kind, link: false, contained: true };
}
```

`resolveTargetRoot` walks existing target ancestors with `lstat`, rejects a
symlink/junction target root, and records the canonical real path once. On
Windows, also compare `realpathSync.native` for each existing directory to that
canonical root to detect junction traversal.

- [ ] **Step 5: Run path tests**

```bash
node --test test/path-safety.test.js
```

Expected: PASS; external sentinel remains unchanged.

- [ ] **Step 6: Commit**

```bash
git add bin/doctor-shared.js test/fixtures.js test/path-safety.test.js test/shared.test.js
git commit -m "feat: add safe layout path primitives"
```

### Task 2: Build a read-only ownership plan

**Files:**
- Create: `bin/installer.js`
- Create: `test/install-plan.test.js`
- Modify: `test/fixtures.js`

**Interfaces:**
- Consumes `inspectPath`, `sha256`, ownership constants.
- Produces `buildInstallPlan(targetDir, options): InstallPlan`.
- `InstallPlan.operations[]` entries are `{ relativePath, type, ownership, action, content, mode, previousHash }`.
- `action` is one of `create`, `replace-framework`,
  `replace-pristine-project`, `remove-framework`, `preserve`, `conflict`.
- `materializePlanFixture(plan)` in `test/fixtures.js` writes only `create`
  operations into a temp target for planning tests. It does not call the
  executor introduced in Task 3.

- [ ] **Step 1: Write plan-only failing tests**

```js
test("planning a fresh install makes no writes", () => {
  const target = path.join(tmpDir(), "not-created-yet");
  const plan = buildInstallPlan(target, { force: false, teamConfig: true, ideFiles: true });
  assert.equal(fs.existsSync(target), false);
  assert.ok(plan.operations.every((op) => op.action === "create"));
});

test("custom project artifact is preserved", () => {
  const target = materializePlanFixture(buildInstallPlan(tmpDir(), {
    force: false, teamConfig: true, ideFiles: true,
  }));
  fs.writeFileSync(path.join(target, ".ai-os", "memory.md"), "USER MEMORY\n");
  const plan = buildInstallPlan(target, { force: true, teamConfig: true, ideFiles: true });
  const memory = plan.operations.find((op) => op.relativePath === ".ai-os/memory.md");
  assert.equal(memory.action, "preserve");
});
```

- [ ] **Step 2: Verify missing implementation**

```bash
node --test test/install-plan.test.js
```

Expected: FAIL with missing `bin/installer.js`.

- [ ] **Step 3: Implement immutable source inventory and operation classification**

`buildInstallPlan` must read all template/tool/reference sources before inspecting target writes. Use exact content hashes; never infer that a project file is pristine from markers alone.

```js
function classifyDestination(source, destination, options) {
  if (!destination.exists) return "create";
  if (source.ownership === OWNERSHIP.SESSION) return "preserve";
  if (source.ownership === OWNERSHIP.PROJECT) {
    return source.compatibleHashes.has(destination.hash) ? "replace-pristine-project" : "preserve";
  }
  return options.force || destination.hash !== source.hash ? "replace-framework" : "preserve";
}
```

Before destination classification, validate every packaged source is a regular,
non-link file contained in the package root, has the expected executable/data
mode, and is readable as bytes. Reject duplicate destinations and unknown
ownership values.

`AGENTS.md` is a special project path: on every install, not only the first, an
unknown hash is a conflict requiring manual merge. A current or compatibility
hash may be upgraded. A recognized obsolete v10 framework path such as
`.ai-os/bin/shared.js` becomes `remove-framework`; an unknown hash at that path
is a conflict and is never deleted.

- [ ] **Step 4: Add wrong-type and foreign-AGENTS cases**

Assert that `.ai-os/bin` as a file, customized `AGENTS.md`, missing packaged source, and unsupported metadata all produce `plan.conflicts` and no target mutation.

- [ ] **Step 5: Run plan tests**

```bash
node --test test/install-plan.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add bin/installer.js test/fixtures.js test/install-plan.test.js
git commit -m "feat: plan installs by ownership"
```

### Task 3: Execute plans with lock, staging, and rollback

**Files:**
- Modify: `bin/installer.js`
- Modify: `test/fixtures.js`
- Create: `test/install-transaction.test.js`

**Interfaces:**
- Produces `executeInstallPlan(plan, { fsOps } = {}): InstallResult`.
- Produces `installProject(targetDir, options): InstallResult` as plan+execute composition.
- Produces `createDefaultFsOps(): object`; executor merges a supplied partial
  `fsOps` object over a fresh default object so a test can override only `rename`.
- `installedFixture(options)` is added to `test/fixtures.js` here and creates a
  project through `installProject`.
- `InstallResult` is `{ created, replaced, preserved, warnings, baselineId, layoutVersion }`.

- [ ] **Step 1: Write rollback and concurrency tests**

Inject an `fsOps.rename` that throws on the second commit:

```js
test("commit failure restores all replaced framework files", () => {
  const before = snapshotTree(target);
  let renames = 0;
  const defaultFsOps = createDefaultFsOps();
  assert.throws(() => executeInstallPlan(plan, {
    fsOps: { rename(from, to) {
      renames += 1;
      if (renames === 2) throw new Error("injected rename failure");
      return defaultFsOps.rename(from, to);
    } },
  }), /injected rename failure/);
  assert.deepEqual(snapshotTree(target), before);
  assert.equal(fs.existsSync(path.join(target, ".ai-os-install.lock")), false);
});
```

Add a test holding `.ai-os-install.lock` with exclusive creation and expect a clean `installation already in progress` error.
Add a two-process concurrency test: a child pauses after acquiring the lock, a
second installer exits with that same diagnostic, then the first resumes and
finishes with no leftover lock/stage/backup files.
Inject failures during source staging, backup creation, first create rename,
and target creation. Every case must leave the old tree byte-identical, remove
lock/temp/backup files, and remove a target created by this invocation if empty.

- [ ] **Step 2: Verify tests fail**

```bash
node --test test/install-transaction.test.js
```

Expected: FAIL because executor APIs are absent.

- [ ] **Step 3: Implement bounded transaction phases**

Implement:

```js
function executeInstallPlan(plan, { fsOps: overrides = {} } = {}) {
  if (plan.conflicts.length) throw new InstallConflictError(plan.conflicts);
  const fsOps = { ...createDefaultFsOps(), ...overrides };
  const tx = { targetCreated: false, lock: null, staged: [], committed: false };
  try {
    ensureTargetForTransaction(plan.targetDir, fsOps, tx);
    tx.lock = acquireLock(plan.targetDir, fsOps);
    stageOperations(plan.operations, fsOps, tx.staged); // record each temp/backup before the next I/O
    revalidateDestinationsBeforeCommit(plan, fsOps);
    const result = commitStaged(tx.staged, fsOps);
    tx.committed = true;
    return result;
  } catch (error) {
    rollbackStaged(tx.staged, fsOps);
    throw error;
  } finally {
    cleanupStaged(tx.staged, fsOps);
    if (tx.lock) releaseLock(tx.lock, fsOps);
    if (!tx.committed && tx.targetCreated) removeTargetIfEmpty(plan.targetDir, fsOps);
  }
}
```

`acquireLock` performs only one exclusive open before returning its handle, so
it either returns an owned lock or leaves no lock. Target creation is recorded
in `tx` before lock acquisition, making permission/lock failures enter the same
cleanup path.

Temporary files use same-directory unique names, `O_CREAT | O_EXCL | O_NOFOLLOW`
where supported, mode `0o600`, `fsync`, and atomic rename. Immediately before
commit, re-`lstat` parents/destinations and compare the planned type/hash to
close the practical TOCTOU window. Backups cover every replacement/removal,
including recognized pristine project upgrades, and are removed only after a
successful commit.

- [ ] **Step 4: Run transaction and path tests**

```bash
node --test test/install-transaction.test.js test/path-safety.test.js
```

Expected: PASS, with no leftover lock/stage/backup files.

- [ ] **Step 5: Commit**

```bash
git add bin/installer.js test/fixtures.js test/install-transaction.test.js
git commit -m "feat: make install transactions rollback safe"
```

### Task 4: Install canonical layout v11 without false confirmation

**Files:**
- Modify: `bin/installer.js`
- Modify: `test/install.test.js`
- Modify: `test/package.test.js`

**Interfaces:**
- Fresh install creates one `bootstrap-unconfirmed` record.
- Framework metadata has no timestamps.
- Packaged `docs/artifacts.md` is copied byte-for-byte to `.ai-os/reference/artifacts.md`.

- [ ] **Step 1: Write fresh-layout failing assertions**

Assert:

```js
assert.equal(metadata.schema_version, "11");
assert.equal(metadata.layout_version, "11");
assert.equal(metadata.framework_version, "11.0.0");
assert.equal(metadata.installed_at, undefined);
assert.equal(readFile(target, ".ai-os/reference/artifacts.md"), readRepo("docs/artifacts.md"));
assert.match(baseline, /Status\*\*: unconfirmed/);
assert.doesNotMatch(baseline, /Confirmed At/);
assert.match(laneToml, /risk_tier = "unassessed"/);
assert.match(laneToml, /governance_tier = "unassessed"/);
```

- [ ] **Step 2: Run and observe current false-confirmation failures**

```bash
node --test test/install.test.js
```

Expected: FAIL on schema 10, missing local reference/manifest contract, or
installer rendering that does not yet consume the already-tested governance
templates from Governance Task 1.

- [ ] **Step 3: Implement deterministic layout rendering**

Use one generated bootstrap ID per first install, substitute it in lane.toml/MISSION/tasks/bootstrap record, and write stable metadata:

```toml
schema_version = "11"
layout_version = "11"
layout_mode = "shared-root-default-lane"
default_lane = "default"
framework_version = "11.0.0"
```

- [ ] **Step 4: Write the ownership manifest**

Produce sorted TSV rows with header:

```text
# path\ttype\townership\tsource_sha256
```

Framework files have 64-character lowercase SHA-256 values. Project/session hashes are empty.
`managed-files.tsv` is framework-owned by its fixed layout path but does not list
itself, avoiding an impossible recursive content hash. Every other installed
file has exactly one sorted row; doctor tests enforce row coverage, disjoint
ownership, and exact current bytes for framework hashes.

- [ ] **Step 5: Run fresh-install and package tests**

```bash
node --test test/install.test.js test/package.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add bin/installer.js test/install.test.js test/package.test.js
git commit -m "feat: install truthful layout v11"
```

### Task 5: Make reinstall and force non-destructive and idempotent

**Files:**
- Modify: `bin/installer.js`
- Modify: `test/install.test.js`
- Create: `test/install-idempotency.test.js`

**Interfaces:**
- Reuses `InstallPlan` ownership actions.
- Guarantees identical non-constitution project/session bytes, on-demand bytes,
  and one bootstrap record across reinstall/force. A customized constitution
  fails preflight byte-identically and requires manual merge.

- [ ] **Step 1: Write a byte-for-byte preservation test**

Create a fresh project, replace every project/session file except `AGENTS.md`
with distinct sentinel content, add representative valid files/directories for
all six on-demand artifact classes, snapshot the tree, run normal reinstall and
force reinstall, then assert:

```js
for (const relative of [...PROJECT_FILES, ...SESSION_FILES].filter((item) => item !== "AGENTS.md")) {
  assert.deepEqual(after.get(relative), before.get(relative), `${relative} preserved`);
}
assert.equal(listBaselineRecords(target).length, 1);
assert.equal(result.baselineId, originalBaselineId);
```

Run a separate customized-`AGENTS.md` case for normal and force reinstall. Both
must return the manual-merge conflict and leave the complete tree byte-identical.

- [ ] **Step 2: Run to prove reinstall rendering is not yet idempotent**

```bash
node --test test/install-idempotency.test.js
```

Expected: FAIL because the initial planner still renders a new bootstrap path or
does not yet preserve the original baseline/result identity on reinstall.

- [ ] **Step 3: Restrict force and reuse existing baseline**

When lane.toml exists, parse and reuse its current baseline ID. Never call bootstrap generation for an existing lane. Ignore `force` in project/session classification.

- [ ] **Step 4: Test recognized and foreign AGENTS behavior**

Assert exact known AI-OS hashes may refresh. Customized or foreign AGENTS causes
preflight conflict on first install, reinstall, force, and migration; every
conflict leaves the tree byte-identical.

- [ ] **Step 5: Run installer suites**

```bash
node --test test/install.test.js test/install-idempotency.test.js test/install-plan.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add bin/installer.js test/install.test.js test/install-idempotency.test.js
git commit -m "fix: preserve project state on reinstall"
```

### Task 6: Add bounded v10 compatibility and managed-block migration

**Files:**
- Create: `framework/.agents/compat/v10-template-hashes.json`
- Modify: `bin/installer.js`
- Create: `test/compat-hashes.test.js`
- Create: `test/migration.test.js`

**Interfaces:**
- Produces `loadCompatHashes()`, a Map keyed by installed relative path whose
  values are Sets of accepted lowercase SHA-256 strings.
- Produces `normalizeV10Candidate(relativePath, bytes, context)`. Static files
  remain byte-exact; only syntactically validated generated baseline IDs,
  baseline filenames, and timestamp fields are replaced with their exact v10
  template tokens before full-content hashing.
- Produces `replaceManagedBlock(content, begin, end, lines): string`.

- [ ] **Step 1: Generate and review v10 template hashes**

First create `test/compat-hashes.test.js` so missing/incorrect manifest data fails.
It enumerates the exact tags `v10.0.0`, `v10.1.0`, `v10.1.1`, `v10.1.2`,
`v10.3.1`, `v10.5.0`, `v10.5.1` and every v10 distributed destination,
reads template bytes with `git show`, normalizes only documented generated
tokens, computes SHA-256, and deep-compares the freshly
sorted object with the committed manifest. It rejects a missing tag/path/hash,
duplicate hash, or non-64-hex value. Then generate and review the deterministic
JSON; it contains hashes only.

Migration first strictly extracts one baseline context from v10 metadata,
lane.toml, tasks, MISSION, baseline filename, and record. Any disagreement is a
conflict. It then substitutes only those exact validated values back to
`{{INITIAL_BASELINE_ID}}` and `{{INITIAL_BASELINE_DATE}}` before
hashing the entire file. This recognizes genuinely rendered pristine templates
without treating loose markers or arbitrary edited content as pristine.

For an exact pristine v10 `lane.toml`, migration preserves the existing lane
identity, baseline pointer, `quality_tier = "standard"`, and
`risk_tier = "medium"`, then inserts only
`governance_tier = "unassessed"` after the risk tier while preserving the file
mode and surrounding bytes. It does not replace the file with the fresh v11
template, whose unassessed quality/risk defaults would erase established v10
truth. Customized lane content remains byte-exact after strict context
validation. Exact pristine `AGENTS.md` and `tasks.yaml` may upgrade as specified
by the completion oracle.

- [ ] **Step 2: Write migration failure tests**

Build v10 fixtures with legacy metadata/git blocks and assert migration:

```js
assert.equal(readFile(target, ".ai-os/memory.md"), originalMemory);
assert.equal(readFile(target, ".ai-os/lanes/default/MISSION.md"), originalMission);
assert.deepEqual(parseManagedBlock(readFile(target, ".gitattributes")), []);
assert.deepEqual(parseManagedBlock(readFile(target, ".gitignore")), [".ai-os/lanes/*/STATE.md"]);
assert.ok(exists(target, ".ai-os/reference/artifacts.md"));
```

Customized AGENTS fixture must fail before writes; old on-demand files must
remain byte-identical. Use CRLF `.gitignore`/`.gitattributes` fixtures and compare
all bytes outside the managed block exactly. Assert recognized obsolete
`.ai-os/bin/shared.js` is removed transactionally while an unknown-hash file at
that path conflicts and is never deleted.

- [ ] **Step 3: Run and verify failures**

```bash
node --test test/migration.test.js
```

Expected: FAIL because v10 migration and bounded blocks are absent.

- [ ] **Step 4: Implement exact managed blocks**

New blocks are:

```text
# BEGIN AI-OS
.ai-os/lanes/*/STATE.md
# END AI-OS
```

and an empty/removable AI-OS block in `.gitattributes`; preserve every byte outside the managed range. Recognize and replace the old header/known lines once.

- [ ] **Step 5: Run migration, transaction, and idempotency tests**

```bash
node --test test/migration.test.js test/install-transaction.test.js test/install-idempotency.test.js
node --test test/compat-hashes.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add framework/.agents/compat/v10-template-hashes.json bin/installer.js test/compat-hashes.test.js test/migration.test.js
git commit -m "feat: migrate v10 without data loss"
```

### Task 7: Rewire the CLI and vendored doctor boundary

**Files:**
- Modify: `bin/create-ai-os.js`
- Modify: `bin/ai-os-doctor.js`
- Delete: `bin/shared.js`
- Modify: `test/shared.test.js`
- Modify: `test/install.test.js`
- Modify: `docs/cli.md`

**Interfaces:**
- CLI calls `installProject` and catches `InstallConflictError`/`InstallFilesystemError`.
- Local doctor requires `./doctor-shared` and vendors only `ai-os-doctor.js`, `doctor-shared.js`, `VERSION`.
- `main(argv, io, install = installProject)` is exported for diagnostic tests;
  the executable wrapper calls it only under `require.main === module`.

- [ ] **Step 1: Write CLI diagnostic tests**

Assert unknown option, foreign AGENTS, symlink, locked install, wrong target
type, and an in-process injected `InstallFilesystemError` emit one concise
`Error: ...` diagnostic with no ` at ` stack frames and nonzero exit.

- [ ] **Step 2: Run and observe current failures**

```bash
node --test test/install.test.js
```

Expected: FAIL on safe force/vendored filenames/diagnostics.

- [ ] **Step 3: Make `create-ai-os.js` a thin entrypoint**

Import `installProject`, parse existing flags, and print result counts by ownership. Removed-upgrade guidance must use the pinned GitHub form from docs, never bare `npx create-ai-os` and never destructive force.

- [ ] **Step 4: Rewire doctor and remove installer-heavy shared module**

Change `require("./shared")` to `require("./doctor-shared")`; remove `bin/shared.js` after `rg` shows no consumers.

- [ ] **Step 5: Run installer/package/lint verification**

```bash
if rg -n 'require\("\./shared"\)|npx create-ai-os' bin test README.md CHANGELOG.md docs/*.md; then exit 1; fi
if rg -n 'install \. --force' bin README.md CHANGELOG.md docs/*.md examples; then exit 1; fi
node --test test/install.test.js test/package.test.js test/path-safety.test.js test/migration.test.js
npm run lint
git diff --check
```

Expected: first command has no stale runtime/registry references; remaining commands pass.

- [ ] **Step 6: Commit**

```bash
git add bin test docs/cli.md
git commit -m "refactor: isolate safe installer runtime"
```
