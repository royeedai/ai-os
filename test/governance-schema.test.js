#!/usr/bin/env node

const { test, assert, readRepo } = require("./helpers");

test("fresh lane is explicitly unassessed", () => {
  const lane = readRepo("framework/.agents/templates/lane/lane.toml");
  assert.equal(lane.trim(), [
    'id = "default"',
    'title = "默认交付线"',
    'status = "active"',
    'baseline_id = "{{INITIAL_BASELINE_ID}}"',
    'quality_tier = "unassessed"',
    'risk_tier = "unassessed"',
    'governance_tier = "unassessed"',
  ].join("\n"));
});

test("human-readable tier mirrors use governance rather than priority names", () => {
  for (const relative of [
    "framework/.agents/templates/lane/MISSION.md",
    "framework/.agents/templates/lane/STATE.md",
  ]) {
    const content = readRepo(relative);
    assert.match(content, /unassessed/);
    assert.match(content, /G0.*G1.*G2/s);
    assert.doesNotMatch(content, /当前治理档位[^\n]*P0/);
    assert.match(content, /lane\.toml/);
  }
});

test("task schema separates governance, priority, approval, and evidence", () => {
  const tasks = readRepo("framework/.agents/templates/lane/tasks.yaml");
  for (const token of [
    "version: 5",
    "approval:",
    "required:",
    "status:",
    "decided_by:",
    "baseline_id:",
    "approved_scope:",
    "evidence_ref:",
    "evidence_produced:",
    "git_sha:",
    "observed_at:",
    "confidence:",
    "delivery_state:",
    "runtime:",
  ]) {
    assert.ok(tasks.includes(token), `tasks contains ${token}`);
  }
  assert.match(tasks, /depends_on: \[\]/);
  assert.doesNotMatch(tasks, /depends_on:\s*\n\s*- ""/);
});

test("bootstrap is unconfirmed", () => {
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  assert.match(baseline, /Type\*\*: bootstrap/);
  assert.match(baseline, /Status\*\*: unconfirmed/);
  assert.match(baseline, /Created At/);
  assert.doesNotMatch(baseline, /Confirmed At/);
});

test("baseline and change records define the complete lifecycle", () => {
  const docs = readRepo("docs/artifacts.md");
  for (const field of [
    "previous_baseline_id",
    "confirmed_by",
    "confirmed_at",
    "source_refs",
    "current_behavior",
    "proposed_delta",
    "affected_artifacts",
    "acceptance_delta",
    "approval",
    "close_condition",
    "preventability_review",
  ]) {
    assert.ok(docs.includes(field), `lifecycle documents ${field}`);
  }
  assert.match(
    docs,
    /bootstrap-unconfirmed.*confirmed BL.*proposed CR.*approved CR.*applied CR.*confirmed BL/s,
  );
});

test("governance docs define enums and prohibit AI self-approval", () => {
  const docs = readRepo("docs/artifacts.md");
  assert.match(docs, /G0.*G1.*G2/s);
  assert.match(docs, /P0.*P1.*P2.*P3/s);
  assert.match(docs, /not-required.*pending.*approved.*rejected.*expired/s);
  assert.match(docs, /static.*test.*runtime.*data.*manual.*release/s);
  assert.match(docs, /observed.*inferred.*unknown.*not-applicable/s);
  assert.match(docs, /AI[^\n]*(?:不得自我审批|cannot self-approve)/i);
});

test("memory records cannot represent two active truths", () => {
  const memory = readRepo("framework/.agents/templates/shared-root/memory.md");
  for (const field of ["id", "status", "source", "owner", "last_verified", "supersedes"]) {
    assert.ok(memory.includes(field), `memory contains ${field}`);
  }
  assert.match(memory, /globally unique|全局唯一/i);
  assert.match(memory, /superseded.*not active|已取代.*非活动/is);
  assert.doesNotMatch(memory, /union merge/i);
});
