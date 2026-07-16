"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test, assert, repoRoot } = require("./helpers");
const matrix = require("../scripts/verify-completion-matrix");
const remote = require("../scripts/verify-remote-evidence");
const settings = require("../scripts/verify-repository-settings");

const MATRIX_PATH = path.join(
  repoRoot,
  "docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md",
);
const EXPECTED_BLOCKING_CHECKS = [
  "Node 22 quality",
  "Node 24 quality",
  "Ubuntu smoke",
  "Windows smoke",
  "macOS smoke",
  "Coverage",
  "Package smoke",
  "Dependency Review",
  "CodeQL",
];

function liveProtection() {
  return {
    required_status_checks: {
      strict: true,
      contexts: [...EXPECTED_BLOCKING_CHECKS].reverse(),
    },
    enforce_admins: { enabled: true },
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
      require_last_push_approval: true,
      required_approving_review_count: 1,
    },
    required_linear_history: { enabled: true },
    required_conversation_resolution: { enabled: true },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
    block_creations: { enabled: false },
    lock_branch: { enabled: false },
    allow_fork_syncing: { enabled: true },
    restrictions: null,
  };
}

test("completion matrix owns one canonical row for every reviewed design requirement", () => {
  const content = fs.readFileSync(MATRIX_PATH, "utf8");
  const rows = matrix.parseMatrix(content);
  assert.equal(matrix.REQUIREMENT_IDS.length, 195);
  assert.equal(rows.length, matrix.REQUIREMENT_IDS.length);
  assert.deepEqual(rows.map((row) => row.id), [...matrix.REQUIREMENT_IDS]);
  assert.doesNotThrow(() => matrix.verifyEvidenceReferences(rows, repoRoot));
  for (const removed of [
    "test/release-truth.test.js",
    "test/manifest.test.js",
    "test/team-config.test.js",
    "test/compat-manifest.test.js",
    "368 tests",
    "GitHub authentication is invalid",
  ]) {
    assert.ok(!content.includes(removed), removed);
  }
  assert.match(content, /main protection returns 404/);
  assert.match(content, /remaining settings remain unverified/);
  const unresolved = rows.filter((row) => ["pending", "blocked"].includes(row.status)).length;
  assert.deepEqual(matrix.verifyRows(rows, { allowPending: true, runLiveValidators: false }), {
    requirements: 195,
    unresolved,
  });
  if (unresolved > 0) {
    assert.throws(
      () => matrix.verifyRows(rows, { runLiveValidators: false }),
      /unresolved requirements/,
    );
  } else {
    assert.doesNotThrow(() => matrix.verifyRows(rows, { runLiveValidators: false }));
  }
});

test("completion matrix parser supports escaped pipes and rejects malformed code spans", () => {
  assert.deepEqual(matrix.splitMarkdownRow("| A | escaped\\|pipe | `a|b` | C | D | pass |"), [
    "A", "escaped|pipe", "`a|b`", "C", "D", "pass",
  ]);
  assert.throws(() => matrix.splitMarkdownRow("| A | `unterminated |"), /unterminated/);
});

test("completion evidence references must exist inside the repository", () => {
  const row = {
    id: "D01-R01",
    requirement: "fixture",
    evidence: "`node --test test/completion.test.js`; `node scripts/verify-completion-matrix.js --allow-pending`; `npm test`",
    expected: "pass",
    actual: "pass",
    status: "pass",
  };
  assert.deepEqual(matrix.evidenceReferences(row.evidence), [
    "scripts/verify-completion-matrix.js",
    "test/completion.test.js",
  ]);
  assert.deepEqual(matrix.evidenceReferences([
    "`git ls-remote https://github.com/royeedai/ai-os.git refs/tags/v11.0.0`",
    "`node test/completion.test.js,`",
  ].join("; ")), ["test/completion.test.js"]);
  assert.deepEqual(matrix.evidenceReferences([
    "plain source test/completion.test.js",
    "[linked source](scripts/verify-completion-matrix.js)",
  ].join("; ")), [
    "scripts/verify-completion-matrix.js",
    "test/completion.test.js",
  ]);
  assert.doesNotThrow(() => matrix.verifyEvidenceReferences([row], repoRoot));
  for (const evidence of [
    "`node --test test/missing.test.js`",
    "node --test test/missing.test.js",
    "plain source test/missing.test.js",
    "[linked source](test/missing.test.js)",
    "`node /tmp/outside.js`",
    "`node tests/missing.test.js`",
    "`node ./test/missing.test.js`",
    "`node test/missing.test.js,`",
    "`node test/../outside.test.js`",
    "`node test\\missing.test.js`",
  ]) {
    assert.throws(
      () => matrix.verifyEvidenceReferences([{ ...row, evidence }], repoRoot),
      /evidence reference/i,
      evidence,
    );
  }
});

test("completion evidence references must be regular files without symlink escape", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-matrix-root-"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-matrix-outside-"));
  try {
    fs.mkdirSync(path.join(root, "test"));
    fs.writeFileSync(path.join(root, "test", "valid.test.js"), "valid\n");
    fs.mkdirSync(path.join(root, "test", "directory.test.js"));
    fs.writeFileSync(path.join(outside, "external.test.js"), "external\n");
    fs.symlinkSync(
      path.join(outside, "external.test.js"),
      path.join(root, "test", "linked.test.js"),
    );
    const row = (reference) => [{
      id: "D01-R01",
      requirement: "fixture",
      evidence: `\`node --test ${reference}\``,
      expected: "pass",
      actual: "pass",
      status: "pass",
    }];
    assert.doesNotThrow(() => matrix.verifyEvidenceReferences(
      row("test/valid.test.js"),
      root,
    ));
    for (const reference of ["test/directory.test.js", "test/linked.test.js"]) {
      assert.throws(
        () => matrix.verifyEvidenceReferences(row(reference), root),
        /regular file|symbolic link/i,
        reference,
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test("remote evidence validator locks the same nine blocking checks as branch protection", () => {
  assert.deepEqual([...remote.BLOCKING_CHECKS], EXPECTED_BLOCKING_CHECKS);
  assert.deepEqual(settings.desiredProtection.required_status_checks.contexts, EXPECTED_BLOCKING_CHECKS);
  assert.ok(!remote.BLOCKING_CHECKS.includes(remote.CANARY_CHECK));
  const head = "a".repeat(40);
  const checks = [...EXPECTED_BLOCKING_CHECKS, remote.CANARY_CHECK].map((name, index) => ({
    id: index + 1,
    name,
    head_sha: head,
    status: "completed",
    conclusion: "success",
    html_url: `https://example.invalid/${encodeURIComponent(name)}`,
  }));
  assert.deepEqual(remote.verifyChecks(checks, head), { blocking: 9, canary: "success" });
  assert.throws(() => remote.verifyChecks(checks.slice(1), head), /missing blocking check/);
  const failedNewest = { ...checks[0], id: 1000, conclusion: "failure" };
  assert.throws(() => remote.verifyChecks([...checks, failedNewest], head), /passed/);
});

test("remote evidence comment is unique and bound to the current head/check names", () => {
  const head = "b".repeat(40);
  const body = [remote.MARKER, head, ...EXPECTED_BLOCKING_CHECKS, remote.CANARY_CHECK].join("\n");
  assert.equal(remote.verifyEvidenceComment([{ body, html_url: "https://example.invalid/comment" }], head), "https://example.invalid/comment");
  assert.throws(
    () => remote.verifyEvidenceComment([
      { body, html_url: "https://example.invalid/1" },
      { body, html_url: "https://example.invalid/2" },
    ], head),
    /exactly one/,
  );
});

test("repository settings readback compares live response shapes to desired state", () => {
  assert.doesNotThrow(() => settings.verifyProtection(liveProtection()));
  const drifted = liveProtection();
  drifted.allow_force_pushes.enabled = true;
  assert.throws(() => settings.verifyProtection(drifted), /force pushes are disabled/);
  assert.deepEqual(
    settings.optionalSecurityFeature(
      "feature",
      { status: 403, json: { message: "Resource not accessible by personal access token" } },
      () => assert.fail("not called"),
    ),
    {
      name: "feature",
      state: "proven-unavailable",
      status: 403,
      reason: "Resource not accessible by personal access token",
    },
  );
  assert.throws(
    () => settings.optionalSecurityFeature(
      "feature",
      { status: 403, json: { message: "API rate limit exceeded" } },
      () => assert.fail("not called"),
    ),
    /not called/,
  );
});

test("repository readback parser accepts canonical include output and rejects ambiguous responses", () => {
  assert.deepEqual(settings.parseIncludedResponse([
    "HTTP/2.0 200 OK",
    "content-type: application/json",
    "",
    '{"enabled":true}',
    "",
  ].join("\r\n")), { status: 200, json: { enabled: true } });
  assert.deepEqual(settings.parseIncludedResponse("HTTP/2 204 No Content\nheader: value\n\n"), {
    status: 204,
    json: null,
  });
  assert.throws(() => settings.parseIncludedResponse("not HTTP"), /no HTTP status/);
});
