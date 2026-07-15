"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { test, assert, repoRoot, readRepo } = require("./helpers");

const CHECKOUT_SHA = "df4cb1c069e1874edd31b4311f1884172cec0e10";
const SETUP_NODE_SHA = "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e";
const BLOCKING_CHECKS = Object.freeze([
  "Node 22 quality",
  "Node 24 quality",
  "Ubuntu smoke",
  "Windows smoke",
  "macOS smoke",
  "Coverage",
  "Package smoke",
  "Dependency Review",
  "CodeQL",
]);

function jobBlock(yaml, id) {
  const marker = `  ${id}:\n`;
  const start = yaml.indexOf(marker);
  assert.notEqual(start, -1, `job ${id} exists`);
  const tail = yaml.slice(start + marker.length);
  const next = tail.search(/^  [a-z0-9-]+:\n/m);
  return yaml.slice(start, next === -1 ? yaml.length : start + marker.length + next);
}

function actionRefs(yaml) {
  const refs = Object.create(null);
  for (const match of yaml.matchAll(/uses:\s*([^@\s]+)@([a-f0-9]{40}|[^\s#]+)/g)) {
    assert.match(match[2], /^[a-f0-9]{40}$/, `${match[1]} uses immutable full SHA`);
    if (refs[match[1]]) assert.equal(refs[match[1]], match[2], `${match[1]} has one reviewed SHA`);
    refs[match[1]] = match[2];
  }
  return refs;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("CI exposes the exact blocking platform and quality contract", () => {
  const ci = readRepo(".github/workflows/ci.yml");
  assert.match(ci, /^permissions:\n  contents: read$/m);
  assert.match(ci, /node-version: \[22, 24\]/);
  for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) assert.ok(ci.includes(os), os);
  for (const name of ["Ubuntu smoke", "Windows smoke", "macOS smoke", "Coverage", "Package smoke", "Node 26 canary"]) {
    assert.ok(ci.includes(`name: ${name}`), name);
  }
  assert.match(ci, /name: Node \$\{\{ matrix\.node-version \}\} quality/);
  assert.match(ci, /node-version: 26/);
  assert.match(jobBlock(ci, "canary"), /continue-on-error: true/);
  assert.doesNotMatch(ci, /node-version: \[(?:18|20)|@v\d/);
  assert.deepEqual(actionRefs(ci), Object.assign(Object.create(null), {
    "actions/checkout": CHECKOUT_SHA,
    "actions/setup-node": SETUP_NODE_SHA,
  }));
});

test("CI jobs preserve tag history and execute all required gates", () => {
  const ci = readRepo(".github/workflows/ci.yml");
  for (const id of ["quality", "coverage", "canary"]) {
    const block = jobBlock(ci, id);
    assert.match(block, /fetch-depth: 0/);
    assert.match(block, /fetch-tags: true/);
  }
  const quality = jobBlock(ci, "quality");
  for (const command of ["npm ci --ignore-scripts", "npm test", "npm run lint", "git diff --check", "npm audit --omit=dev", "npm pack --dry-run --json"]) {
    assert.ok(quality.includes(`run: ${command}`), `quality runs ${command}`);
  }
  assert.match(jobBlock(ci, "platform"), /node --test test\/path-safety\.test\.js test\/package\.test\.js/);
  assert.match(jobBlock(ci, "coverage"), /npm run test:coverage/);
  assert.match(jobBlock(ci, "package-smoke"), /node --test test\/package\.test\.js/);
  assert.match(jobBlock(ci, "canary"), /npm run test:coverage/);
});

test("dependency review and CodeQL are pinned least-privilege blocking checks", () => {
  const dependency = readRepo(".github/workflows/dependency-review.yml");
  const codeql = readRepo(".github/workflows/codeql.yml");
  assert.match(dependency, /^on: pull_request$/m);
  assert.match(dependency, /^permissions:\n  contents: read$/m);
  assert.match(dependency, /name: Dependency Review/);
  assert.equal(actionRefs(dependency)["actions/dependency-review-action"], "a1d282b36b6f3519aa1f3fc636f609c47dddb294");
  assert.match(codeql, /name: CodeQL/);
  assert.match(codeql, /contents: read/);
  assert.match(codeql, /security-events: write/);
  assert.match(codeql, /languages: javascript-typescript,actions/);
  assert.equal(actionRefs(codeql)["github/codeql-action/init"], "99df26d4f13ea111d4ec1a7dddef6063f76b97e9");
  assert.equal(actionRefs(codeql)["github/codeql-action/analyze"], "99df26d4f13ea111d4ec1a7dddef6063f76b97e9");
});

test("scheduled audit and Dependabot cover npm and GitHub Actions", () => {
  const audit = readRepo(".github/workflows/security-audit.yml");
  const dependabot = readRepo(".github/dependabot.yml");
  assert.match(audit, /^permissions:\n  contents: read$/m);
  assert.match(audit, /schedule:/);
  assert.match(audit, /workflow_dispatch:/);
  assert.match(audit, /npm ci --ignore-scripts/);
  assert.match(audit, /run: npm audit/);
  assert.deepEqual(actionRefs(audit), Object.assign(Object.create(null), {
    "actions/checkout": CHECKOUT_SHA,
    "actions/setup-node": SETUP_NODE_SHA,
  }));
  assert.equal((dependabot.match(/package-ecosystem:/g) || []).length, 2);
  for (const ecosystem of ["npm", "github-actions"]) assert.ok(dependabot.includes(`package-ecosystem: "${ecosystem}"`));
  assert.equal((dependabot.match(/interval: "weekly"/g) || []).length, 2);
  assert.equal((dependabot.match(/open-pull-requests-limit: 5/g) || []).length, 2);
  for (const group of ["development-minor-patch", "actions-minor-patch"]) assert.ok(dependabot.includes(`${group}:`));
});

test("security policy and CODEOWNERS protect critical release paths", () => {
  const codeowners = readRepo(".github/CODEOWNERS");
  const security = readRepo("SECURITY.md");
  assert.match(codeowners, /^\/\.github\/CODEOWNERS\s+@royeedai$/m);
  for (const critical of ["/bin/", "/framework/", "/.github/workflows/", "/VERSION", "/RELEASED_VERSION", "/package.json", "/package-lock.json"]) {
    assert.match(codeowners, new RegExp(`^${escapeRegex(critical)}.*@royeedai$`, "m"));
  }
  assert.match(security, /private vulnerability reporting/i);
  assert.match(security, /v10\.5\.1/);
  assert.match(security, /main[^\n]*unreleased/i);
  assert.doesNotMatch(security, /@(?:gmail|outlook|example)\./i);
});

test("every workflow uses only immutable reviewed action refs", () => {
  const workflows = fs.readdirSync(path.join(repoRoot, ".github/workflows")).filter((name) => /\.ya?ml$/.test(name));
  for (const workflow of workflows) actionRefs(readRepo(`.github/workflows/${workflow}`));
});

test("desired main protection exactly matches stable blocking checks", () => {
  const protection = JSON.parse(readRepo(".github/branch-protection.json"));
  assert.deepEqual(protection.required_status_checks, { strict: true, contexts: BLOCKING_CHECKS });
  assert.equal(protection.enforce_admins, true);
  assert.deepEqual(protection.required_pull_request_reviews, {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: true,
    require_last_push_approval: true,
    required_approving_review_count: 1,
  });
  assert.equal(protection.required_linear_history, true);
  assert.equal(protection.required_conversation_resolution, true);
  assert.equal(protection.allow_force_pushes, false);
  assert.equal(protection.allow_deletions, false);
  assert.ok(!BLOCKING_CHECKS.includes("Node 26 canary"));
});
