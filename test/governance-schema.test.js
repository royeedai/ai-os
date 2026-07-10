#!/usr/bin/env node

const { test, assert, readRepo } = require("./helpers");

const INITIAL_BASELINE_ID = "{{INITIAL_BASELINE_ID}}";

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
- **preventability_review**: <yes-or-no-or-partial-with-reason-and-guard>
- **result_baseline_id**: ""`;

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
  const match = content.match(new RegExp(`^${key} = "([^"]*)"$`, "m"));
  assert.ok(match, `lane.toml contains one canonical ${key} string`);
  return match[1];
}

function mirrorValue(content, label) {
  const line = content.split(/\r?\n/).find((candidate) => candidate.startsWith(`- **${label}`));
  assert.ok(line, `template contains ${label} mirror`);
  const separator = line.indexOf("：");
  assert.notEqual(separator, -1, `${label} mirror uses a full-width separator`);
  return line.slice(separator + 1).trim();
}

function stripYamlComments(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n")
    .trim();
}

function taskBlocks(content) {
  const yaml = stripYamlComments(content);
  const marker = "\ntasks:\n";
  const start = yaml.indexOf(marker);
  assert.notEqual(start, -1, "tasks.yaml contains a top-level tasks sequence");
  const section = yaml.slice(start + marker.length);
  const matches = [...section.matchAll(/^  - id: (TASK-[A-Z0-9-]+)$/gm)];
  const result = new Map();
  for (const [index, match] of matches.entries()) {
    const end = matches[index + 1] ? matches[index + 1].index : section.length;
    result.set(match[1], section.slice(match.index, end).trimEnd());
  }
  return result;
}

function extractFence(content, label) {
  const pattern = "```" + label + "\\n([\\s\\S]*?)\\n```";
  const match = content.match(new RegExp(pattern, "m"));
  assert.ok(match, `document contains ${label} fenced skeleton`);
  return match[1].trim();
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

test("fresh tier mirrors are single unassessed values aligned with lane.toml", () => {
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
    assert.equal(tomlString(lane, key), "unassessed");
    assert.equal(mirrorValue(mission, labels[index]), tomlString(lane, key));
    assert.equal(mirrorValue(state, labels[index]), tomlString(lane, key));
  }

  assert.ok(mission.includes("允许值"), "MISSION moves tier enums to explanatory text");
  assert.ok(state.includes("允许值"), "STATE moves tier enums to explanatory text");
  assert.ok(
    mission.includes(`- **当前基线 ID（lane.toml.baseline_id 镜像）**：${INITIAL_BASELINE_ID}`),
    "MISSION baseline is an explicit lane.toml mirror",
  );
  assert.ok(
    state.includes(`- **当前基线 ID（lane.toml.baseline_id 镜像）**：${INITIAL_BASELINE_ID}`),
    "STATE has the recoverable bootstrap baseline mirror",
  );
  assert.match(state, /session-only.*冲突.*重建/is);
});

test("task v5 preserves both v4 task identities and adds complete nested governance", () => {
  const tasks = readRepo("framework/.agents/templates/lane/tasks.yaml");
  const yaml = stripYamlComments(tasks);
  assert.match(yaml, /^version: 5$/m);
  assert.doesNotMatch(tasks, /approval_required/);

  const milestoneSection = yaml.match(/milestones:\n([\s\S]*?)\ntasks:/);
  assert.ok(milestoneSection, "tasks.yaml contains milestones before tasks");
  assert.equal(milestoneSection[1].trimEnd(), `  - id: M1
    title: "Design Locked"
    goal: "关键设计与逻辑已确认"
  - id: M2
    title: "Built and Verified"
    goal: "实现、验证和交付证据已就绪"`);

  const blocks = taskBlocks(tasks);
  assert.deepEqual([...blocks.keys()], ["TASK-AI-001", "TASK-AI-002"]);
  assert.equal(blocks.get("TASK-AI-001"), `  - id: TASK-AI-001
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
      - static
    evidence_produced: []
    delivery_state:
      code: unknown
      data: unknown
      runtime: unknown
    change_scope:
      - ".ai-os/lanes/default/DESIGN.md"`);
  assert.equal(blocks.get("TASK-AI-002"), `  - id: TASK-AI-002
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
      - static
      - test
    evidence_produced: []
    delivery_state:
      code: unknown
      data: unknown
      runtime: unknown
    change_scope:
      - "[src path]"
      - "[test path]"`);
});

test("baseline template and installed reference share deterministic record skeletons", () => {
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const docs = readRepo("docs/artifacts.md");
  const bootstrapMetadata = baseline.split(/\n## /, 1)[0].trim();

  assert.equal(bootstrapMetadata, BOOTSTRAP_SKELETON);
  assert.equal((baseline.match(/\*\*Type\*\*: bootstrap/g) || []).length, 1);
  assert.doesNotMatch(bootstrapMetadata, /\*\*Status\*\*: confirmed\b/);
  assert.doesNotMatch(bootstrapMetadata, /Confirmed At/);
  assert.equal(extractFence(docs, "ai-os-bootstrap"), BOOTSTRAP_SKELETON);
  assert.equal(extractFence(baseline, "ai-os-confirmed-bl"), CONFIRMED_BL_SKELETON);
  assert.equal(extractFence(docs, "ai-os-confirmed-bl"), CONFIRMED_BL_SKELETON);
  assert.equal(extractFence(baseline, "ai-os-change-request"), CR_SKELETON);
  assert.equal(extractFence(docs, "ai-os-change-request"), CR_SKELETON);
});

test("baseline lifecycle defines enums, freezing, and atomic pointer alignment", () => {
  const docs = readRepo("docs/artifacts.md");
  const baseline = readRepo("framework/.agents/templates/lane/baseline-log/BL-template.md");
  for (const content of [docs, baseline]) {
    assert.match(content, /bootstrap.*unconfirmed.*baseline.*confirmed.*change.*proposed.*approved.*applied/s);
    assert.match(content, /bootstrap.*confirmed BL.*创建后不可变/s);
    assert.match(content, /proposed.*可编辑.*approved.*冻结.*applied.*完整不可变/s);
    assert.match(content, /只有.*approved.*CR.*applied.*result_baseline_id.*新.*confirmed BL/s);
  }
  assert.match(
    docs,
    /同一个变更集.*lane\.toml\.baseline_id.*MISSION.*tasks\.yaml.*baseline_id.*STATE\.md/s,
  );
  assert.match(docs, /approval\.baseline_id.*审批快照.*不得.*机械重写/s);
});

test("task approval, evidence, and delivery field combinations are fully typed", () => {
  const docs = readRepo("docs/artifacts.md");
  assert.match(docs, /lane\.status.*string.*active.*closed/s);
  assert.match(docs, /tasks\.scope\.mode.*string.*change.*release/s);
  assert.match(docs, /evidence_required.*static.*test.*runtime.*data.*manual.*release/s);
  assert.match(docs, /同一 kind.*fresh.*observed.*evidence_produced/s);
  assert.match(docs, /evidence.*id.*kind.*command.*git_sha.*environment.*observed_at.*artifact.*confidence.*string.*exit_code.*integer/s);
  assert.match(docs, /not-required.*required: false.*pending.*required: true/s);
  assert.match(docs, /not-required.*pending.*decided_by.*decided_at.*evidence_ref.*空/s);
  assert.match(docs, /approved.*rejected.*expired.*required: true.*人类.*decided_by.*ISO-8601.*evidence_ref/s);
  assert.match(docs, /approved_scope.*approved.*非空/s);
  assert.match(docs, /approval\.baseline_id.*非空.*string.*审批.*快照/s);
  assert.match(docs, /AI[^\n]*(?:不得自我审批|cannot self-approve)/i);
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
  assert.doesNotMatch(docs, /高风险状态流创建 `risk-register\.md` \+ `release-plan\.md`/);
});

test("fresh memory has empty active and archived sections plus a non-record schema", () => {
  const memory = readRepo("framework/.agents/templates/shared-root/memory.md");
  const active = markdownSection(memory, "active", "archived");
  const archived = markdownSection(memory, "archived");

  assert.equal(extractFence(memory, "ai-os-memory-record-schema"), MEMORY_RECORD_SCHEMA);
  assert.doesNotMatch(active, /^#### /m);
  assert.doesNotMatch(active, /\b(?:DD|EC|PF|PT|TD|CT)-\d+\b/);
  assert.doesNotMatch(active, /^(?:id|status|source|owner|last_verified|supersedes):/m);
  assert.doesNotMatch(archived, /^#### /m);
  assert.doesNotMatch(archived, /\b(?:DD|EC|PF|PT|TD|CT)-\d+\b/);
  assert.doesNotMatch(archived, /^(?:id|status|source|owner|last_verified|supersedes):/m);
  assert.doesNotMatch(memory, /union merge/i);
  assert.match(memory, /全局唯一/);
  assert.match(memory, /已取代.*非活动/is);
});
