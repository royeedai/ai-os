#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const REPOSITORY = "royeedai/ai-os";
const BRANCH = "codex/ai-os-v11-quality-hardening";
const MARKER = "[ai-os-v11-evidence]";
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
const CANARY_CHECK = "Node 26 canary";
const API_HEADERS = Object.freeze([
  "-H", "Accept: application/vnd.github+json",
  "-H", "X-GitHub-Api-Version: 2026-03-10",
]);

function run(command, args, { acceptedStatuses = [0] } = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.signal || !acceptedStatuses.includes(result.status)) {
    const detail = String(result.stderr || result.error?.message || "").trim();
    throw new Error(`${path.basename(command)} failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout.trim();
}

function ghJson(endpoint) {
  const output = run("gh", ["api", ...API_HEADERS, endpoint]);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`GitHub returned invalid JSON for ${endpoint}`);
  }
}

function verifyChecks(checkRuns, headSha) {
  assert.match(headSha, /^[a-f0-9]{40}$/u, "current head is a full SHA-1 object ID");
  assert.ok(Array.isArray(checkRuns), "check runs are a list");
  const byName = new Map();
  for (const check of checkRuns) {
    if (!check || typeof check.name !== "string") continue;
    const existing = byName.get(check.name);
    const checkId = Number.isSafeInteger(check.id) ? check.id : -1;
    const existingId = Number.isSafeInteger(existing?.id) ? existing.id : -1;
    if (!existing || checkId > existingId) byName.set(check.name, check);
  }
  for (const name of BLOCKING_CHECKS) {
    const check = byName.get(name);
    assert.ok(check, `missing blocking check: ${name}`);
    assert.equal(check.head_sha, headSha, `${name} belongs to current head`);
    assert.equal(check.status, "completed", `${name} is terminal`);
    assert.equal(check.conclusion, "success", `${name} passed`);
    assert.match(String(check.html_url || ""), /^https:\/\//u, `${name} has a run URL`);
  }
  const canary = byName.get(CANARY_CHECK);
  assert.ok(canary, "Node 26 canary is recorded separately");
  assert.equal(canary.head_sha, headSha, "canary belongs to current head");
  assert.equal(canary.status, "completed", "canary is terminal");
  assert.ok(typeof canary.conclusion === "string" && canary.conclusion.length > 0, "canary conclusion is recorded");
  return Object.freeze({ blocking: BLOCKING_CHECKS.length, canary: canary.conclusion });
}

function verifyEvidenceComment(comments, headSha) {
  assert.ok(Array.isArray(comments), "PR comments are a list");
  const matches = comments.filter((comment) => String(comment?.body || "").includes(MARKER));
  assert.equal(matches.length, 1, "exactly one mutable evidence comment exists");
  const comment = matches[0];
  const body = String(comment.body);
  assert.ok(body.includes(headSha), "evidence comment records the current head");
  for (const name of [...BLOCKING_CHECKS, CANARY_CHECK]) {
    assert.ok(body.includes(name), `evidence comment records ${name}`);
  }
  assert.match(String(comment.html_url || ""), /^https:\/\//u, "evidence comment has an immutable URL");
  return comment.html_url;
}

function main() {
  const localHead = run("git", ["rev-parse", "HEAD"]);
  assert.match(localHead, /^[a-f0-9]{40}$/u, "local head is a full SHA-1 object ID");
  const pulls = ghJson(`/repos/${REPOSITORY}/pulls?state=open&head=royeedai:${encodeURIComponent(BRANCH)}`);
  assert.ok(Array.isArray(pulls), "pull response is a list");
  assert.equal(pulls.length, 1, "exactly one open hardening PR exists");
  const pull = pulls[0];
  assert.equal(pull.draft, true, "hardening PR remains draft until final shipping authorization");
  assert.equal(pull.base?.ref, "main", "PR targets main");
  assert.equal(pull.head?.ref, BRANCH, "PR uses the hardening branch");
  assert.equal(pull.head?.sha, localHead, "local, remote branch, and PR heads agree");
  const checks = ghJson(`/repos/${REPOSITORY}/commits/${localHead}/check-runs?per_page=100`);
  const checkSummary = verifyChecks(checks.check_runs, localHead);
  const comments = ghJson(`/repos/${REPOSITORY}/issues/${pull.number}/comments?per_page=100`);
  const commentUrl = verifyEvidenceComment(comments, localHead);
  process.stdout.write(`${JSON.stringify({
    repository: REPOSITORY,
    pull: pull.html_url,
    head: localHead,
    comment: commentUrl,
    ...checkSummary,
  })}\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`remote evidence verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  BLOCKING_CHECKS,
  BRANCH,
  CANARY_CHECK,
  MARKER,
  REPOSITORY,
  main,
  verifyChecks,
  verifyEvidenceComment,
});
