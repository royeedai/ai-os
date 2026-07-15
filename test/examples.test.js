"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { TRIGGERS, readRepo } = require("./contract-fixtures");

test("greenfield example bootstraps a baseline and only creates a release plan for release intent", () => {
  const example = readRepo("examples/greenfield-guided-product.md");

  assert.doesNotMatch(example, /Stripe|webhook/i);
  assert.doesNotMatch(example, /CR-[^\n]*initial-alignment/i);
  assert.match(example, /unconfirmed bootstrap/i);
  assert.match(example, /confirmed `BL-/i);
  assert.match(example, /release-plan\.md[^\n]*release intent/i);
  assert.equal(TRIGGERS["release-plan.md"], "release-intent-or-G2-release");
});

test("brownfield example uses the canonical on-demand triggers", () => {
  const example = readRepo("examples/brownfield-change-journey.md");

  assert.match(example, /verification-matrix\.yaml[^\n]*stable failure/i);
  assert.match(example, /release-plan\.md[^\n]*release intent/i);
  assert.equal(TRIGGERS["verification-matrix.yaml"], "stable-failure-or-G2-guard");
});

test("bug fix authorization continues until a real stop condition appears", () => {
  const example = readRepo("examples/debug-bounded-fix.md");

  assert.match(example, /explicit fix request[^\n]*continue/i);
  assert.match(example, /stop[^\n]*(high-risk|design trade-off|scope expansion)/i);
  assert.doesNotMatch(example, /P1|P2/);
  assert.doesNotMatch(example, /memory\.md/);
});
