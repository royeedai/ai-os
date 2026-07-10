#!/usr/bin/env node

const { test, assert, readRepo } = require("./helpers");

const INITIAL_BASELINE_ID = "{{INITIAL_BASELINE_ID}}";

const TASKS_YAML = `version: 5
baseline_id: "${INITIAL_BASELINE_ID}"
scope:
  mode: "change"
  focus: "example-lane"
  baseline_source: "lane MISSION.md"

milestones:
  - id: M1
    title: "Design Locked"
    goal: "关键设计与逻辑已确认"
  - id: M2
    title: "Built and Verified"
    goal: "实现、验证和交付证据已就绪"

tasks:
  - id: TASK-AI-001
    title: "收敛当前 lane 的关键设计与契约"
    milestone: M1
    status: todo
    owner: AI
    priority: P1
    approval:
      required: false
      status: not-required
      decided_by: ""
      decided_at: ""
      baseline_id: "${INITIAL_BASELINE_ID}"
      approved_scope: []
      conditions: []
      evidence_ref: ""
    depends_on: []
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "design-note"
    evidence_produced: []
    delivery_state:
      code: unknown
      data: unknown
      runtime: unknown
    change_scope:
      - ".ai-os/lanes/default/DESIGN.md"
  - id: TASK-AI-002
    title: "按已锁定设计完成实现与验证"
    milestone: M2
    status: todo
    owner: AI
    priority: P0
    approval:
      required: false
      status: not-required
      decided_by: ""
      decided_at: ""
      baseline_id: "${INITIAL_BASELINE_ID}"
      approved_scope: []
      conditions: []
      evidence_ref: ""
    depends_on:
      - "TASK-AI-001"
    acceptance_refs:
      - "AC-001"
    evidence_required:
      - "build-log"
      - "test-log"
    evidence_produced: []
    delivery_state:
      code: unknown
      data: unknown
      runtime: unknown
    change_scope:
      - "[src path]"
      - "[test path]"`;

const BOOTSTRAP_SKELETON = `# ${INITIAL_BASELINE_ID}

- **Type**: bootstrap
- **Status**: unconfirmed
- **Created At**: {{INITIAL_BASELINE_DATE}}`;

const CONFIRMED_BL_SKELETON = `# BL-YYYYMMDD-HHMMSS-<slug>

- **Type**: baseline
- **Status**: confirmed
- **previous_baseline_id**: <baseline-id>
- **confirmed_by**: <human-identity>
- **confirmed_at**: <ISO-8601>
- **source_refs**:
  - <source-ref>`;

const CR_SKELETON = `# CR-YYYYMMDD-HHMMSS-<slug>

- **Type**: change
- **Status**: proposed
- **current_behavior**: <non-empty>
- **proposed_delta**: <non-empty>
- **affected_artifacts**:
  - <artifact-path>
- **acceptance_delta**:
  - <acceptance-ref-or-delta>
- **approval**: ""
- **close_condition**: <non-empty>
- **preventability_review**:
  - **status**: pending
  - **preventable**: ""
  - **root_cause**: ""
  - **suggested_guard**: ""
- **result_baseline_id**: ""`;

const RETROSPECTIVE_SKELETON = `# BL-YYYYMMDD-HHMMSS-retrospective

- **Type**: retrospective
- **Status**: closed
- **source_cr_ids**:
  - <CR-id>
- **preventable_findings**: []
- **suggested_framework_changes**: []`;

const CR_TRANSITION_MATRIX = `review.pending=preventable-empty,root_cause-empty,suggested_guard-empty
review.completed=preventable-yes-or-no-or-partial,root_cause-non-empty,suggested_guard-non-empty-or-none
state.proposed.mutable=Status,current_behavior,proposed_delta,affected_artifacts,acceptance_delta,approval,close_condition,preventability_review
state.proposed.result_baseline_id=empty
transition.proposed-to-approved.requires=approval-human-evidence
transition.proposed-to-approved.freezes=current_behavior,proposed_delta,affected_artifacts,acceptance_delta,approval,close_condition
state.approved.mutable=Status,preventability_review,result_baseline_id
state.approved.review=pending-or-completed
state.approved.result_baseline_id=empty
transition.approved-to-applied.requires=result_baseline_id-new-confirmed-bl,preventability_review-completed
state.applied.review=completed
state.applied.terminal=immutable
transition.proposed-to-rejected.requires=approval-human-evidence,result_baseline_id-empty,preventability_review-completed
state.rejected.review=completed
state.rejected.terminal=immutable`;

const EVIDENCE_SKELETON = `id: "<requirement-id>"
kind: test
command: "<non-empty-command>"
exit_code: 0
git_sha: "<full-observed-commit-SHA>"
environment: "<non-empty-environment>"
observed_at: "<ISO-8601>"
artifact: "<non-empty-path-or-URL>"
confidence: observed`;

const EVIDENCE_GATE = `required_id=non-empty-and-unique-within-task
evidence_id=non-empty-and-unique-within-task
identity=task.id-plus-evidence.id
binding=evidence_produced.id-exactly-matches-evidence_required-id-in-same-task
keys=id,kind,command,exit_code,git_sha,environment,observed_at,artifact,confidence
extra_keys=forbidden
kind=static-or-test-or-runtime-or-data-or-manual-or-release
command=non-empty
exit_code=0
git_sha=full-observed-commit
git_relation=git_sha-is-ancestor-of-current-HEAD
environment=non-empty
artifact=non-empty
confidence=observed
baseline=tasks.yaml.baseline_id-equals-active-lane.toml.baseline_id
worktree=clean
impact_scope=all-tracked-repository-paths
impact_exclusion=.ai-os/lanes/<lane-id-other-than-current-lane>/**
tracked_diff=only-.ai-os/lanes/<current-lane-id>/tasks.yaml-after-impact-exclusion
semantic_change=any-task.status,evidence_produced,delivery_state
semantic_unchanged=version,baseline_id,scope,milestones,task-set,task.id,title,milestone,owner,priority,approval,depends_on,acceptance_refs,evidence_required,change_scope
freshness=active-confirmed-BL.confirmed_at<=observed_at<=fixed-now
ttl=none
reject=missing-key,duplicate-id,future-time,pre-baseline-time,old-baseline,non-ancestor-SHA,non-evidence-tracked-diff,semantic-drift,dirty-worktree`;

const MEMORY_RECORD_SCHEMA = `id: <globally-unique-id>
status: <active-or-superseded-or-archived>
source: <path-or-confirmation-ref>
owner: <human-or-team>
last_verified: <ISO-8601>
supersedes: []
kind: <decision-or-engineering-constraint-or-preference-or-pitfall-or-technical-debt-or-cross-layer-contract>
title: <non-empty>
details: <non-empty>`;

function tomlString(content, key) {
  const matches = [...content.matchAll(new RegExp(`^${key} = "([^"]*)"$`, "gm"))];
  assert.equal(matches.length, 1, `lane.toml contains exactly one canonical ${key} string`);
  return matches[0][1];
}

function mirrorValue(content, label) {
  const lines = content.split(/\r?\n/).filter((candidate) => candidate.startsWith(`- **${label}`));
  assert.equal(lines.length, 1, `template contains exactly one ${label} mirror`);
  const separator = lines[0].indexOf("：");
  assert.notEqual(separator, -1, `${label} mirror uses a full-width separator`);
  return lines[0].slice(separator + 1).trim();
}

function stripYamlComments(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n")
    .trim();
}

function extractFence(content, label) {
  const pattern = "```" + label + "\\n([\\s\\S]*?)\\n```";
  const matches = [...content.matchAll(new RegExp(pattern, "gm"))];
  assert.equal(matches.length, 1, `document contains exactly one ${label} fenced contract`);
  return matches[0][1].trim();
}

function recordRegion(content) {
  const h1 = content.match(/^# ([^\n]+)\n/);
  assert.ok(h1, "record starts with one H1 record ID");
  const firstSection = content.search(/^## /m);
  const end = firstSection === -1 ? content.length : firstSection;
  const envelope = content.slice(0, end).trim();
  assert.equal((envelope.match(/^# /gm) || []).length, 1, "record region contains exactly one H1");
  const metadata = envelope.slice(h1[0].length).trim();
  return { id: h1[1], metadata, envelope, terminatedBy: firstSection === -1 ? "EOF" : "H2" };
}

function markdownSection(content, startHeading, endHeading = null) {
  const startMarker = `## ${startHeading}`;
  const start = content.indexOf(startMarker);
  assert.notEqual(start, -1, `document contains ${startMarker}`);
  const bodyStart = start + startMarker.length;
  if (!endHeading) return content.slice(bodyStart).trim();
  const end = content.indexOf(`## ${endHeading}`, bodyStart);
  assert.notEqual(end, -1, `document contains ## ${endHeading}`);
  return content.slice(bodyStart, end).trim();
}

function contentBetween(content, startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  assert.notEqual(start, -1, `document contains ${startMarker}`);
  const end = content.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `document contains ${endMarker} after ${startMarker}`);
  return content.slice(start, end);
}

test("fresh tier and baseline mirrors are unique single values with correct authority", () => {
  const lane = readRepo("framework/.agents/templates/lane/lane.toml");
  const mission = readRepo("framework/.agents/templates/lane/MISSION.md");
  const state = readRepo("framework/.agents/templates/lane/STATE.md");
  const keys = ["quality_tier", "risk_tier", "governance_tier"];
  const labels = ["当前质量档位", "当前风险档位", "当前治理档位"];

  assert.equal(lane.trim(), `id = "default"
title = "默认交付线"
status = "active"
baseline_id = "${INITIAL_BASELINE_ID}"
quality_tier = "unassessed"
risk_tier = "unassessed"
governance_tier = "unassessed"`);

  for (const [index, key] of keys.entries()) {
    assert.equal(mirrorValue(mission, labels[index]), tomlString(lane, key));
    assert.equal(mirrorValue(state, labels[index]), tomlString(lane, key));
  }
  assert.equal(mirrorValue(mission, "当前基线 ID"), tomlString(lane, "baseline_id"));
  assert.equal(mirrorValue(state, "当前基线 ID"), tomlString(lane, "baseline_id"));
  assert.match(mission, /产品 \/ 验收基线内容的真理源/);
  assert.match(mission, /lane\.toml.*baseline pointer.*tier.*机器真理源/s);
  assert.doesNotMatch(mission, /唯一交付基线真理源/);
  assert.match(state, /session-only.*冲突.*重建/is);
});

test("task v5 is one exact top-level YAML contract with stable evidence requirement IDs", () => {
  const tasks = readRepo("framework/.agents/templates/lane/tasks.yaml");
  assert.equal(stripYamlComments(tasks), TASKS_YAML);
  assert.doesNotMatch(tasks, /approval_required|satisfies:|kind 映射|同一 kind/);
});

test("baseline metadata boundary and all record skeletons are deterministic", () => {
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const docs = readRepo("docs/artifacts.md");

  assert.deepEqual(recordRegion(baseline), {
    id: INITIAL_BASELINE_ID,
    metadata: `- **Type**: bootstrap\n- **Status**: unconfirmed\n- **Created At**: {{INITIAL_BASELINE_DATE}}`,
    envelope: BOOTSTRAP_SKELETON,
    terminatedBy: "H2",
  });
  assert.deepEqual(recordRegion(CONFIRMED_BL_SKELETON), {
    id: "BL-YYYYMMDD-HHMMSS-<slug>",
    metadata: CONFIRMED_BL_SKELETON.slice(CONFIRMED_BL_SKELETON.indexOf("\n") + 1).trim(),
    envelope: CONFIRMED_BL_SKELETON,
    terminatedBy: "EOF",
  });
  assert.throws(
    () => recordRegion("# BL-one\n\n- **Type**: baseline\n# BL-two\n\n- **Status**: confirmed"),
    /exactly one H1/,
  );
  assert.doesNotMatch(recordRegion(baseline).metadata, /Type\*\*: (?:baseline|change|retrospective)/);
  assert.equal(extractFence(docs, "ai-os-bootstrap"), BOOTSTRAP_SKELETON);
  assert.equal(extractFence(baseline, "ai-os-confirmed-bl"), CONFIRMED_BL_SKELETON);
  assert.equal(extractFence(docs, "ai-os-confirmed-bl"), CONFIRMED_BL_SKELETON);
  assert.equal(extractFence(baseline, "ai-os-change-request"), CR_SKELETON);
  assert.equal(extractFence(docs, "ai-os-change-request"), CR_SKELETON);
  for (const content of [baseline, docs]) {
    assert.match(content, /first H1.*record ID.*exactly one H1.*metadata block.*first `##`.*EOF.*H1.*不属于.*parser.*忽略/s);
  }
});

test("CR transition matrix is exact and doctor snapshot limits are explicit", () => {
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const docs = readRepo("docs/artifacts.md");
  assert.equal(extractFence(baseline, "ai-os-cr-transition-matrix"), CR_TRANSITION_MATRIX);
  assert.equal(extractFence(docs, "ai-os-cr-transition-matrix"), CR_TRANSITION_MATRIX);
  for (const content of [baseline, docs]) {
    assert.match(content, /规范写入 \/ 评审规则.*doctor.*单个当前快照.*只验证.*当前状态组合.*不能证明.*历史冻结/s);
  }
});

test("retrospective is an immutable validated baseline-log subtype outside the pointer chain", () => {
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const docs = readRepo("docs/artifacts.md");
  assert.equal(extractFence(baseline, "ai-os-retrospective"), RETROSPECTIVE_SKELETON);
  assert.equal(extractFence(docs, "ai-os-retrospective"), RETROSPECTIVE_SKELETON);
  for (const content of [baseline, docs]) {
    assert.ok(content.includes("^BL-\\d{8}-\\d{6}-retrospective\\.md$"));
    assert.match(content, /source_cr_ids.*非空.*唯一.*CR ID.*list/s);
    assert.match(content, /preventable_findings.*suggested_framework_changes.*string list.*无条目.*\[\]/s);
    assert.match(content, /retrospective.*创建后不可变.*parser.*校验/s);
    assert.match(content, /不.*current confirmed baseline.*不.*baseline pointer chain/s);
  }
});

test("evidence object and completion gate bind stable IDs to current observed facts", () => {
  const docs = readRepo("docs/artifacts.md");
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  assert.equal(extractFence(docs, "ai-os-evidence"), EVIDENCE_SKELETON);
  assert.equal(extractFence(docs, "ai-os-evidence-gate"), EVIDENCE_GATE);
  assert.doesNotMatch(docs, /同一 kind|任意 TTL|satisfies|globally unique|full-current-HEAD/);
  assert.match(docs, /跨 task.*重复.*\(task\.id, evidence\.id\).*复合身份/s);
  assert.match(docs, /observed commit.*当前 HEAD.*祖先.*worktree.*clean/s);
  assert.match(docs, /git diff --name-only.*全部 tracked path.*\.ai-os\/lanes\/<other-lane-id>\/\*\*.*排除.*其余.*只能.*\.ai-os\/lanes\/<current-lane-id>\/tasks\.yaml/s);
  assert.match(docs, /root config.*lockfile.*CI.*migration.*schema.*asset.*失效/s);
  assert.match(docs, /strict parsed semantic comparison.*status.*evidence_produced.*delivery_state.*其余.*不变/s);

  for (const content of [docs, baseline]) {
    for (const phrase of [
      "每个 task approval 必须重新评估",
      "旧 approval.baseline_id",
      "旧 evidence",
      "不得满足新 baseline",
      "不得机械改写旧人类决定",
      "required task",
      "新的明确人类审批",
    ]) {
      assert.ok(content.includes(phrase), `baseline transition documents ${phrase}`);
    }
  }
});

test("approved design and Task 4 plan carry the reachable evidence and snapshot-check contract", () => {
  const design = readRepo("docs/superpowers/specs/2026-07-10-ai-os-v11-quality-hardening-design.md");
  const plan = readRepo("docs/superpowers/plans/2026-07-10-ai-os-v11-governance-doctor-plan.md");
  const designContract = contentBetween(design, "### 8.3 Baseline lifecycle", "## 10. On-demand trigger matrix");
  const task1 = contentBetween(plan, "### Task 1: Lock canonical governance templates", "### Task 2:");
  const task4 = contentBetween(plan, "### Task 4: Enforce baseline, task, approval, and evidence readiness", "### Task 5:");
  for (const content of [designContract, task1, task4]) {
    for (const token of [
      "first H1",
      "exactly one H1",
      "first `##`",
      "preventability_review.status",
      "retrospective",
      "source_cr_ids",
      "evidence_produced[].id",
      "active confirmed BL",
      "fixed now",
      "no TTL",
      "EOF",
      "full observed commit",
      "ancestor",
      "(task.id, evidence.id)",
      "current-state invariants",
    ]) {
      assert.ok(content.includes(token), `approved source documents ${token}`);
    }
    assert.match(content, /confirmed_at.*<=.*observed_at.*<=.*fixed now/s);
  }
  assert.match(task4, /retrospective[\s\S]*record boundary[\s\S]*transition matrix/i);
  assert.match(task4, /duplicate evidence IDs.*future timestamps.*pre-baseline timestamps.*dirty worktree/s);
  assert.match(task4, /ancestor.*tracked diff.*semantic comparison/s);
  assert.match(task4, /all tracked repository paths.*other-lane subtrees.*current-lane tasks\.yaml/s);
  assert.match(task4, /root config.*lockfile.*CI.*migration.*schema.*asset/s);
  assert.doesNotMatch(task4, /Table-test\s+every transition\/mutable\/frozen-field row/);
  for (const content of [designContract, task1, task4]) {
    assert.doesNotMatch(content, /git_sha.*(?:equals|match|=).*current HEAD/is);
  }
});

test("v11 installed artifact reference matches layout, ownership, and trigger truth", () => {
  const docs = readRepo("docs/artifacts.md");
  assert.match(docs, /^# AI-OS v11 /);
  assert.ok(docs.includes(".ai-os/reference/artifacts.md"));
  assert.ok(docs.includes("doctor-shared.js"));
  assert.doesNotMatch(docs, /`shared\.js`/);
  assert.match(docs, /framework\.toml.*managed-files\.tsv.*reference\/artifacts\.md.*bin\/.*入版本控制/s);
  assert.match(docs, /只有.*STATE\.md.*不入版本控制/s);
  assert.match(docs, /doctor.*校验.*已存在.*按需工件/s);
  assert.match(docs, /risk-register\.md.*G2.*high-risk/s);
  assert.match(docs, /verification-matrix\.yaml.*stable failure.*G2 minimum/s);
  assert.match(docs, /release-plan\.md.*显式.*release intent.*G2 release preparation/s);
  assert.match(docs, /非 release.*G2.*不.*强制.*release-plan\.md/s);
});

test("fresh memory has empty active and archived sections plus a non-record schema", () => {
  const memory = readRepo("framework/.agents/templates/shared-root/memory.md");
  const active = markdownSection(memory, "active", "archived");
  const archived = markdownSection(memory, "archived");

  assert.equal(extractFence(memory, "ai-os-memory-record-schema"), MEMORY_RECORD_SCHEMA);
  for (const section of [active, archived]) {
    assert.doesNotMatch(section, /^#### /m);
    assert.doesNotMatch(section, /\b(?:DD|EC|PF|PT|TD|CT)-\d+\b/);
    assert.doesNotMatch(section, /^(?:id|status|source|owner|last_verified|supersedes):/m);
  }
  assert.doesNotMatch(memory, /union merge/i);
  assert.match(memory, /全局唯一/);
  assert.match(memory, /已取代.*非活动/is);
});
