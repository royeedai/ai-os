#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const REPOSITORY = "royeedai/ai-os";
const API_HEADERS = Object.freeze([
  "-H", "Accept: application/vnd.github+json",
  "-H", "X-GitHub-Api-Version: 2026-03-10",
]);
const desiredProtection = Object.freeze(JSON.parse(fs.readFileSync(
  path.join(repoRoot, ".github/branch-protection.json"),
  "utf8",
)));

function parseIncludedResponse(stdout, stderr = "") {
  const normalized = String(stdout || "").replace(/\r\n/gu, "\n");
  const combined = `${normalized}\n${String(stderr || "").replace(/\r\n/gu, "\n")}`;
  const statuses = [...combined.matchAll(/^HTTP\/\S+\s+(\d{3})\b/gmu)].map((match) => Number(match[1]));
  const status = statuses.at(-1);
  if (!status) throw new Error("GitHub returned no HTTP status");
  const headerBlocks = [...normalized.matchAll(/^HTTP\/[^\n]+\n(?:[^\n]*\n)*?\n/gmu)];
  if (headerBlocks.length === 0) throw new Error("GitHub returned malformed HTTP headers");
  const lastHeaders = headerBlocks.at(-1);
  const body = normalized.slice(lastHeaders.index + lastHeaders[0].length).trim();
  let json = null;
  if (body) {
    try {
      json = JSON.parse(body);
    } catch {
      throw new Error("GitHub returned invalid JSON");
    }
  }
  return Object.freeze({ status, json });
}

function ghResponse(endpoint) {
  const result = spawnSync("gh", ["api", "--include", ...API_HEADERS, endpoint], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.signal) throw new Error("GitHub CLI is unavailable");
  try {
    return parseIncludedResponse(result.stdout, result.stderr);
  } catch (error) {
    throw new Error(`${error.message} for ${endpoint}`, { cause: error });
  }
}

function enabled(value, label) {
  assert.equal(value?.enabled, true, `${label} is enabled`);
}

function verifyProtection(actual, desired = desiredProtection) {
  assert.equal(actual.required_status_checks?.strict, desired.required_status_checks.strict);
  assert.deepEqual(
    [...(actual.required_status_checks?.contexts || [])].sort(),
    [...desired.required_status_checks.contexts].sort(),
    "branch protection contexts match desired state",
  );
  enabled(actual.enforce_admins, "admin enforcement");
  const reviews = actual.required_pull_request_reviews;
  for (const key of ["dismiss_stale_reviews", "require_code_owner_reviews", "require_last_push_approval", "required_approving_review_count"]) {
    assert.equal(reviews?.[key], desired.required_pull_request_reviews[key], `review setting ${key}`);
  }
  for (const [key, label] of [
    ["required_linear_history", "linear history"],
    ["required_conversation_resolution", "conversation resolution"],
  ]) enabled(actual[key], label);
  assert.equal(actual.allow_force_pushes?.enabled, false, "force pushes are disabled");
  assert.equal(actual.allow_deletions?.enabled, false, "branch deletion is disabled");
  assert.equal(actual.block_creations?.enabled, false, "branch creation is not separately blocked");
  assert.equal(actual.lock_branch?.enabled, false, "main remains writable through reviewed changes");
  assert.equal(actual.allow_fork_syncing?.enabled, true, "fork syncing matches desired state");
  assert.equal(actual.restrictions, null, "no push actor bypass is configured");
}

function isProvenUnavailable(response) {
  if (![403, 404].includes(response.status)) return false;
  const message = String(response.json?.message || "");
  if (response.status === 404) return message === "Not Found";
  return /(?:resource not accessible|must have admin|upgrade|not available|advanced security.*enabled)/iu.test(message)
    && !/(?:rate limit|bad credentials)/iu.test(message);
}

function optionalSecurityFeature(name, response, verify) {
  if (isProvenUnavailable(response)) {
    return Object.freeze({
      name,
      state: "proven-unavailable",
      status: response.status,
      reason: String(response.json.message),
    });
  }
  verify(response);
  return Object.freeze({ name, state: "enabled", status: response.status });
}

function main() {
  const protection = ghResponse(`/repos/${REPOSITORY}/branches/main/protection`);
  assert.equal(protection.status, 200, "main protection can be read back");
  verifyProtection(protection.json);

  const actions = ghResponse(`/repos/${REPOSITORY}/actions/permissions`);
  assert.equal(actions.status, 200, "Actions policy can be read back");
  assert.equal(actions.json?.enabled, true, "Actions are enabled");
  assert.equal(actions.json?.allowed_actions, "all", "reviewed Actions allowlist policy matches");
  assert.equal(actions.json?.sha_pinning_required, true, "Actions require immutable SHA pins");

  const outcomes = [];
  outcomes.push(optionalSecurityFeature("codeql-default-setup", ghResponse(`/repos/${REPOSITORY}/code-scanning/default-setup`), (response) => {
    assert.equal(response.status, 200, "CodeQL default setup state is readable");
    assert.ok(["not-configured", "disabled"].includes(response.json?.state), "advanced CodeQL is not duplicated by default setup");
  }));
  outcomes.push(optionalSecurityFeature("vulnerability-alerts", ghResponse(`/repos/${REPOSITORY}/vulnerability-alerts`), (response) => {
    assert.equal(response.status, 204, "vulnerability alerts are enabled");
  }));
  outcomes.push(optionalSecurityFeature("automated-security-fixes", ghResponse(`/repos/${REPOSITORY}/automated-security-fixes`), (response) => {
    assert.equal(response.status, 200, "automated security fixes are readable");
    assert.equal(response.json?.enabled, true, "automated security fixes are enabled");
    assert.equal(response.json?.paused, false, "automated security fixes are not paused");
  }));
  outcomes.push(optionalSecurityFeature("private-vulnerability-reporting", ghResponse(`/repos/${REPOSITORY}/private-vulnerability-reporting`), (response) => {
    assert.equal(response.status, 200, "private reporting is readable");
    assert.equal(response.json?.enabled, true, "private vulnerability reporting is enabled");
  }));

  const label = ghResponse(`/repos/${REPOSITORY}/labels/framework-feedback`);
  assert.equal(label.status, 200, "framework-feedback label exists");
  assert.equal(label.json?.name, "framework-feedback");
  assert.equal(String(label.json?.color || "").toLowerCase(), "0e8a16");
  assert.equal(label.json?.description, "Preventable AI-OS delivery feedback");

  process.stdout.write(`${JSON.stringify({
    repository: REPOSITORY,
    protection: "match",
    actions_sha_pinning: true,
    security: outcomes,
    label: label.json.name,
  })}\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`repository settings verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  REPOSITORY,
  desiredProtection,
  isProvenUnavailable,
  main,
  optionalSecurityFeature,
  parseIncludedResponse,
  verifyProtection,
});
