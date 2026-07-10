# AI-OS v11 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a native, fail-fast test harness and truthful unreleased/released version contract before changing installer behavior.

**Architecture:** Keep Node built-ins only at runtime. Convert the current print-and-count test scripts to `node:test`, add explicit development and released versions, and test the actual npm tarball instead of only the source tree.

**Tech Stack:** Node.js 22.13+, `node:test`, `node:assert/strict`, npm, CommonJS.

## Global Constraints

- Runtime code has zero third-party dependencies.
- Supported Node floor is `>=22.13.0`; Node 22 and 24 are blocking, Node 26 is canary.
- `VERSION` is the unreleased framework version; `RELEASED_VERSION` is the last real remote tag.
- Official install commands use `github:royeedai/ai-os#v10.5.1` while
  `RELEASED_VERSION` contains `10.5.1`; release tests construct the expected pin
  from that file so a future release changes one source of truth.
- No implementation task may create repository `.ai-os/` state.
- Every production change follows a failing-test, passing-test, commit cycle.

---

## File Map

- `test/helpers.js`: repository reads, temp-project, and subprocess helpers only;
  no global counters.
- `test/*.test.js`: isolated native tests with cleanup hooks.
- `test/package.test.js`: tarball allowlist/install smoke.
- `package.json`: Node floor, private GitHub distribution, native test/coverage scripts, package allowlist.
- `RELEASED_VERSION`: last real public tag, initially `10.5.1`.
- `test/release.test.js`: development/released version truth and documentation pins.
- `README.md`, `docs/getting-started.md`, `docs/cli.md`, `examples/*.md`: released install pin.
- `CHANGELOG.md`: `11.0.0 (Unreleased)` state.

### Task 1: Make test failures native and permit versioned design docs

**Files:**
- Modify: `test/helpers.js`
- Modify: `test/docs.test.js`
- Modify: `test/shared.test.js`
- Modify: `test/install.test.js`
- Modify: `test/doctor.test.js`
- Delete: `test/run.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `runInstall`, `runDoctor`, temp-directory helpers.
- Produces: `test(name, fn)` native cases and helpers that throw `AssertionError` on failure.

- [ ] **Step 1: Preserve the current red test**

Run:

```bash
npm test
```

Expected: exit 1 with `docs/ has exactly 5 files (got 6 ... superpowers)`.

- [ ] **Step 2: Replace the custom assertion counter**

Change `test/helpers.js` to import and export native primitives while preserving subprocess helpers:

```js
const assert = require("node:assert/strict");
const { test, afterEach } = require("node:test");

function readRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

module.exports = {
  assert,
  test,
  afterEach,
  BIN,
  NODE,
  repoRoot,
  BASELINE_RECORD_NAME_PATTERN,
  run,
  runInstall,
  runDoctor,
  runLocalDoctor,
  tmpDir,
  cleanup,
  readFile,
  readRepo,
  exists,
  listBaselineRecords,
};
```

Remove `passed`, `failed`, `section`, `getSummary`, and the color-printing boolean assertion.

- [ ] **Step 3: Convert each named section into an isolated test**

In `docs.test.js`, `shared.test.js`, `install.test.js`, and `doctor.test.js`,
replace every `section("name")` call plus the assertions until the next section
with one `test("name", () => { ... })` case. Preserve each section name exactly so
the native test output can be compared one-for-one with the pre-migration output.
Use this complete conversion pattern for each block:

```js
const { test, assert } = require("./helpers");

test("docs: repo AGENTS.md is a pure maintainer guard", () => {
  assert.ok(fs.existsSync(path.join(repoRoot, "AGENTS.md")));
});
```

For a former `assert(condition, label)`, use `assert.ok(condition, label)`; for
exact comparisons use `assert.equal(actual, expected, label)`; for arrays/maps
use `assert.deepEqual`; and for regular expressions use `assert.match`. Every
temp directory is created inside its owning test and cleaned in `try/finally`.
Delete every import or call of `section`, `getSummary`, `passed`, and `failed`.
After conversion, this command must exit zero; it checks only obsolete calls and
declarations rather than ordinary prose containing words such as “passed”:

```bash
if rg -n 'function (section|getSummary)\b|\b(section|getSummary)\(' test; then exit 1; fi
if rg -n '^let (passed|failed)\b|\b(passed|failed)\s*[+]=' test/helpers.js; then exit 1; fi
```

- [ ] **Step 4: Make the docs inventory count Markdown files, not directories**

Use:

```js
const topLevelDocs = fs.readdirSync(path.join(repoRoot, "docs"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(topLevelDocs, [
  "artifacts.md",
  "cli.md",
  "getting-started.md",
  "interop.md",
  "maintainers.md",
]);
```

- [ ] **Step 5: Switch npm to the native runner**

Set:

```json
{
  "scripts": {
    "test": "node --test --test-concurrency=1 test/*.test.js",
    "test:coverage": "node --test --test-concurrency=1 --experimental-test-coverage --test-coverage-include=bin/**/*.js --test-coverage-lines=94 --test-coverage-branches=72 --test-coverage-functions=98 test/*.test.js",
    "lint": "eslint bin/ test/"
  }
}
```

- [ ] **Step 6: Run native tests**

Run:

```bash
npm test
```

Expected: each former section is a named subtest; exit 0 with zero failures.

- [ ] **Step 7: Commit**

```bash
git add package.json test/helpers.js test/docs.test.js test/shared.test.js test/install.test.js test/doctor.test.js test/run.js
git commit -m "test: migrate suite to node test"
```

### Task 2: Separate development and released version truth

**Files:**
- Create: `RELEASED_VERSION`
- Create: `test/release.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`
- Modify: `docs/getting-started.md`
- Modify: `docs/cli.md`
- Modify: `CHANGELOG.md`
- Modify: `examples/greenfield-guided-product.md`
- Modify: `examples/brownfield-change-journey.md`
- Modify: `test/docs.test.js`

**Interfaces:**
- Produces one public install pin constructed from `RELEASED_VERSION`, initially
  `v10.5.1`, until v11 is actually released.

- [ ] **Step 1: Write failing release-truth tests**

Create `test/release.test.js` with:

```js
const fs = require("node:fs");
const path = require("node:path");
const { test, assert, repoRoot } = require("./helpers");

const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("development and released versions are distinct truthful values", () => {
  assert.equal(read("VERSION").trim(), "11.0.0");
  assert.equal(read("RELEASED_VERSION").trim(), "10.5.1");
  assert.match(read("CHANGELOG.md"), /^## 11\.0\.0 \(Unreleased\)/m);
});

test("public install commands use the last real release", () => {
  const released = read("RELEASED_VERSION").trim();
  const pin = `github:royeedai/ai-os#v${released}`;
  for (const file of ["README.md", "docs/getting-started.md", "docs/cli.md",
    "examples/greenfield-guided-product.md", "examples/brownfield-change-journey.md",
    "CHANGELOG.md"]) {
    assert.doesNotMatch(read(file), /#v11\.0\.0/);
    assert.ok(read(file).includes(pin), `${file} pins ${pin}`);
  }
  for (const file of ["README.md", "docs/getting-started.md", "docs/cli.md",
    "examples/greenfield-guided-product.md", "examples/brownfield-change-journey.md",
    "examples/debug-bounded-fix.md", "CHANGELOG.md"]) {
    assert.doesNotMatch(read(file), /npx create-ai-os(?:\s|$)/);
    assert.doesNotMatch(read(file), /install \. --force/);
  }
});

test("registry publication is explicitly disabled", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.private, true);
  assert.equal(pkg.engines.node, ">=22.13.0");
});
```

- [ ] **Step 2: Verify the tests fail**

Run:

```bash
node --test test/release.test.js
```

Expected: FAIL because `RELEASED_VERSION`, `private`, and `engines` are absent and docs pin v11.

- [ ] **Step 3: Add exact release metadata and package policy**

Create `RELEASED_VERSION` containing:

```text
10.5.1
```

Add to `package.json`:

```json
{
  "private": true,
  "engines": { "node": ">=22.13.0" }
}
```

Change the v11 changelog heading to `## 11.0.0 (Unreleased)`, replace every
official v11 install pin with v10.5.1, and replace the destructive changelog
upgrade example with the pinned non-force install command.
Update the old release-pin assertion in `test/docs.test.js` to read
`RELEASED_VERSION` and compare every discovered GitHub ref with that value.

- [ ] **Step 4: Refresh the lockfile without changing installed code**

Run:

```bash
npm install --package-lock-only --ignore-scripts
```

Expected: exit 0; root lock metadata contains `private`-compatible package metadata and the Node engine contract.

- [ ] **Step 5: Run release and docs tests**

```bash
node --test test/release.test.js test/docs.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add RELEASED_VERSION package.json package-lock.json README.md CHANGELOG.md docs/getting-started.md docs/cli.md examples/greenfield-guided-product.md examples/brownfield-change-journey.md test/docs.test.js test/release.test.js
git commit -m "fix: separate released and development versions"
```

### Task 3: Test the actual package tarball

**Files:**
- Create: `test/package.test.js`
- Modify: `test/helpers.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- The package test owns local variables `pack`, `packDir`, `packResult`,
  `tarball`, `packedFiles`, `files`, `consumerDir`, and `projectDir`; no undeclared package
  helper is required.

- [ ] **Step 1: Write the failing package test**

Create a test whose `packDir = tmpDir()` and which runs
`spawnSync("npm", ["pack", "--json", "--pack-destination", packDir], ...)`,
parses the single result, and asserts:

```js
assert.equal(pack.status, 0, pack.stderr);
const packResult = JSON.parse(pack.stdout);
assert.equal(packResult.length, 1);
const tarball = path.join(packDir, packResult[0].filename);
const packedFiles = packResult[0].files;
const files = packedFiles.map((entry) => entry.path);
const required = [
  "README.md",
  "VERSION",
  "docs/artifacts.md",
  "framework/.agents/templates/root/AGENTS.md",
  "bin/create-ai-os.js",
  "bin/ai-os-doctor.js",
];
for (const name of required) assert.ok(files.includes(name), `package contains ${name}`);
assert.ok(!files.includes("AGENTS.md"), "repo maintainer guard is not distributed");
assert.ok(!files.includes("RELEASED_VERSION"), "repository release metadata is not distributed");
assert.ok(!files.some((name) => name.startsWith("docs/superpowers/")), "maintainer plans are not distributed");
const cliEntry = packedFiles.find((entry) => entry.path === "bin/create-ai-os.js");
assert.equal(cliEntry.mode & 0o111, 0o111, "packaged CLI is executable");
```

Then install the tarball into a second temp directory:

```js
const install = spawnSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball], {
  cwd: consumerDir,
  encoding: "utf8",
});
assert.equal(install.status, 0, install.stderr);
const cli = path.join(consumerDir, "node_modules", "create-ai-os", "bin", "create-ai-os.js");
const version = spawnSync(process.execPath, [cli, "--version"], { encoding: "utf8" });
assert.equal(version.stdout.trim(), "11.0.0");

const projectDir = path.join(tmpDir(), "project with 空格");
const installed = spawnSync(process.execPath, [cli, "install", projectDir], { encoding: "utf8" });
assert.equal(installed.status, 0, installed.stderr);
assert.ok(fs.existsSync(path.join(projectDir, "AGENTS.md")));
assert.ok(fs.existsSync(path.join(projectDir, ".ai-os/lanes/default/lane.toml")));
const doctor = spawnSync(process.execPath, [
  path.join(projectDir, ".ai-os/bin/ai-os-doctor.js"), projectDir, "--json",
], { encoding: "utf8" });
assert.equal(doctor.status, 0, doctor.stderr);
assert.equal(JSON.parse(doctor.stdout).ok, true);
```

- [ ] **Step 2: Verify the test fails for missing packaged docs**

```bash
node --test test/package.test.js
```

Expected: FAIL because the current package allowlist omits `docs/artifacts.md`.

- [ ] **Step 3: Add helper cleanup and make the smoke pass**

Set the exact `package.json.files` allowlist to:

```json
["bin", "framework", "docs/*.md", "LICENSE", "README.md", "VERSION"]
```

Refresh the lockfile with `npm install --package-lock-only --ignore-scripts`.
Build the exact expected file list from
`git ls-files --cached --others --exclude-standard` filtered through the six
allowlist entries above, add npm's mandatory `package.json`, and deep-compare it
with `files.sort()` so newly created-but-not-yet-committed distribution files are
covered and unexpected files fail as well as missing files.
Ensure every pack/install directory is removed in `finally`; do not write
tarballs into the repository.

- [ ] **Step 4: Run the full suite and coverage**

```bash
npm test
npm run test:coverage
npm run lint
git diff --check
```

Expected: all commands exit 0 and coverage meets 94/72/98.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json test/package.test.js test/helpers.js
git commit -m "test: verify packaged installer"
```
