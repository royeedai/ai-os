#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  assert, run, tmpDir, cleanup, listBaselineRecords,
  extractMissionBaselineId, section,
} = require("./helpers");

section("validate compatibility / high-risk release-check");
const legacyDir = tmpDir();
run("create-ai-os.js", [legacyDir, "--with-project-files"]);
const legacySpecPath = path.join(legacyDir, ".ai-os", "specs", "example.spec.md");
const legacyTasksPath = path.join(legacyDir, ".ai-os", "tasks.yaml");
const legacyAcceptancePath = path.join(legacyDir, ".ai-os", "acceptance.yaml");

fs.writeFileSync(
  legacySpecPath,
  fs.readFileSync(legacySpecPath, "utf8")
    .replace(/- \*\*交互模式\*\*：[^\n]*\n/, "")
    .replace(/- \*\*推荐模式理由\*\*：[^\n]*\n/, "")
    .replace(/- \*\*拒绝的交互模式\*\*：[^\n]*\n/, "")
    .replace(/- \*\*契约基准\*\*：[^\n]*\n/, "")
    .replace(/- \*\*字段映射\/适配说明\*\*：[^\n]*\n/, "")
    .replace(/- \*\*集成触点\*\*：[^\n]*\n/, "")
    .replace(/- \*\*异常\/空数据证据\*\*：[^\n]*\n/, ""),
  "utf8"
);
fs.writeFileSync(
  legacyTasksPath,
  fs.readFileSync(legacyTasksPath, "utf8")
    .replace(/\n    impact_tags:\n(?:      - "[^"]+"\n)+/g, "\n")
    .replace(/\n    derived_checks:\n(?:      - "[^"]+"\n)+/g, "\n")
    .replace(/\n    risk_triggers: \[\]\n/g, "\n"),
  "utf8"
);
fs.writeFileSync(
  legacyAcceptancePath,
  fs.readFileSync(legacyAcceptancePath, "utf8")
    .replace(/  quality_tier: "standard"\n/, "")
    .replace(/\nrequired_special_reviews: \[\]\n/, "\n")
    .replace(/\n      - "contract-baseline-check"\n/g, "")
    .replace(/\n      - "degraded-path-check"\n/g, ""),
  "utf8"
);

const legacyValidateResult = run("ai-os-validate.js", [legacyDir]);
assert(legacyValidateResult.status === 0, "validate tolerates legacy transitional artifacts");
assert(legacyValidateResult.stdout.includes("VALID WITH"), "legacy validate reports warnings");
cleanup(legacyDir);

const highRiskBlockedDir = tmpDir();
run("create-ai-os.js", [highRiskBlockedDir, "--with-project-files"]);
const blockedTasksPath = path.join(highRiskBlockedDir, ".ai-os", "tasks.yaml");
const blockedAcceptancePath = path.join(highRiskBlockedDir, ".ai-os", "acceptance.yaml");
fs.writeFileSync(
  blockedTasksPath,
  fs.readFileSync(blockedTasksPath, "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"'),
  "utf8"
);
fs.writeFileSync(
  blockedAcceptancePath,
  fs.readFileSync(blockedAcceptancePath, "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"'),
  "utf8"
);
const highRiskValidateResult = run("ai-os-validate.js", [highRiskBlockedDir]);
assert(highRiskValidateResult.status === 1, "validate blocks explicit high-risk project without required artifacts");
cleanup(highRiskBlockedDir);

const highRiskReadyDir = tmpDir();
run("create-ai-os.js", [highRiskReadyDir, "--with-project-files"]);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "tasks.yaml"),
  fs.readFileSync(path.join(highRiskReadyDir, ".ai-os", "tasks.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace(/status: todo/g, "status: done")
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"\n      - "state-transition"'),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "acceptance.yaml"),
  fs.readFileSync(path.join(highRiskReadyDir, ".ai-os", "acceptance.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('required_special_reviews: []', 'required_special_reviews: ["security-guard", "authorization-boundary-check", "concurrency-safety-check"]')
    .replace(/status: pending/g, "status: passed"),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "release-plan.md"),
  `# Test Release

## 1. 交付前检查

- Mission、Design、Spec、Acceptance 已同步
- 高风险审批点已完成确认
- 高风险专项审查（权限 / 并发 / 不可逆状态流转）已记录
- 静态校验证据已记录（npm run build）
- 关键证据已收集齐全

## 2. 变更范围与依赖

- 覆盖权益扣减接口、状态流转和通知写入
- 依赖正式鉴权、中台账户服务和数据库迁移

## 3. 发布步骤

1. [AI 已完成] 已完成发布前配置检查并整理验证证据
2. [需人工执行] 执行数据库迁移并重启 API
3. [AI 已完成] 按 smoke 流程验证授权、并发和异常路径并通知值守

## 4. 运行态验证

- authorization-boundary-check：权限 / 越权边界验证完成
- concurrency-safety-check：并发 / 幂等 / 状态竞争验证完成
- degraded-path-check：空值 / 缺字段 / 权限拒绝 / 超时 / 部分失败场景验证完成
- 静态校验证据已记录（npm run build）
- 目标运行态证据已记录

## 5. 回滚触发条件

- 出现重复扣减或越权访问
- 关键任务链路失败率持续升高

## 6. 交付说明与移交

- AI 已完成：已同步运维和值守联系人，已记录 smoke 与静态校验证据
- 需人工执行：发布窗口内执行数据库迁移、重启 API 并回填执行记录
- 已记录已知风险与观察指标
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "risk-register.md"),
  `# 风险登记表

| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |
|----|------|------|------|----------|----------|------|
| R-001 | 权益扣减并发覆盖 | 逻辑 / 发布 | 高 | 高并发重复提交 | 幂等键 + 审计日志 + 专项审查 | open |
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"
  restart_api: "npm run restart:api"
  cold-start-smoke_api: "npm run smoke:api"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
      - "restart_api"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: sensitive-flow
    impact_tags:
      - "state-transition"
      - "auth"
    actions:
      - "verify"
      - "build"
    evidence:
      - "contract-baseline-check"
      - "degraded-path-check"
    notes: "高风险状态流转必须补齐契约和异常路径证据"
`,
  "utf8"
);
const releaseReadyResult = run("ai-os-release-check.js", [highRiskReadyDir]);
assert(releaseReadyResult.status === 0, "release-check passes for explicit high-risk project with required artifacts");
cleanup(highRiskReadyDir);

const highRiskMissingMarkersDir = tmpDir();
run("create-ai-os.js", [highRiskMissingMarkersDir, "--with-project-files"]);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "tasks.yaml"),
  fs.readFileSync(path.join(highRiskMissingMarkersDir, ".ai-os", "tasks.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace(/status: todo/g, "status: done")
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"\n      - "state-transition"'),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "acceptance.yaml"),
  fs.readFileSync(path.join(highRiskMissingMarkersDir, ".ai-os", "acceptance.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('required_special_reviews: []', 'required_special_reviews: ["security-guard", "authorization-boundary-check", "concurrency-safety-check"]')
    .replace(/status: pending/g, "status: passed"),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "release-plan.md"),
  `# Test Release

## 1. 交付前检查

- Mission、Design、Spec、Acceptance 已同步
- 高风险审批点已完成确认
- 高风险专项审查（权限 / 并发 / 不可逆状态流转）已记录
- 关键证据已收集齐全

## 2. 变更范围与依赖

- 覆盖权益扣减接口、状态流转和通知写入
- 依赖正式鉴权、中台账户服务和数据库迁移

## 3. 发布步骤

1. 执行数据库迁移并重启 API
2. 按 smoke 流程验证授权、并发和异常路径
3. 记录交付说明并通知值守

## 4. 运行态验证

- authorization-boundary-check：权限 / 越权边界验证完成
- concurrency-safety-check：并发 / 幂等 / 状态竞争验证完成
- degraded-path-check：空值 / 缺字段 / 权限拒绝 / 超时 / 部分失败场景验证完成
- 目标运行态证据已记录

## 5. 回滚触发条件

- 出现重复扣减或越权访问
- 关键任务链路失败率持续升高

## 6. 交付说明与移交

- 已同步运维和值守联系人
- 已记录已知风险与观察指标
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "risk-register.md"),
  `# 风险登记表

| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |
|----|------|------|------|----------|----------|------|
| R-001 | 权益扣减并发覆盖 | 逻辑 / 发布 | 高 | 高并发重复提交 | 幂等键 + 审计日志 + 专项审查 | open |
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"
  restart_api: "npm run restart:api"
  cold-start-smoke_api: "npm run smoke:api"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
      - "restart_api"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: sensitive-flow
    impact_tags:
      - "state-transition"
      - "auth"
    actions:
      - "verify"
      - "build"
    evidence:
      - "contract-baseline-check"
      - "degraded-path-check"
    notes: "高风险状态流转必须补齐契约和异常路径证据"
`,
  "utf8"
);
const releaseMissingMarkersResult = run("ai-os-release-check.js", [highRiskMissingMarkersDir]);
assert(releaseMissingMarkersResult.status === 1, "release-check blocks high-risk release plan missing manual-action/static-validation markers");
cleanup(highRiskMissingMarkersDir);

// ---------------------------------------------------------------------------
// Eval-driven guardrail tests
// ---------------------------------------------------------------------------

section("eval-driven guardrail tests");

const coreArtifactEvalMap = [
  ["DESIGN.md", "design-not-locked"],
  ["MISSION.md", "missing-user-confirmation"],
  ["STATE.md", "session-recovery"],
  ["tasks.yaml", "task-plan-coverage"],
  ["acceptance.yaml", "acceptance-gate-coverage"],
  ["memory.md", "project-memory-coverage"],
];

for (const [artifact, evalName] of coreArtifactEvalMap) {
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.unlinkSync(path.join(dir, ".ai-os", artifact));
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, `eval/${evalName}: validate rejects missing ${artifact}`);
  cleanup(dir);
}

// Missing specs directory → validate rejects
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.rmSync(path.join(dir, ".ai-os", "specs"), { recursive: true, force: true });
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "eval/spec-coverage: validate rejects missing specs directory");
  cleanup(dir);
}

// Default acceptance has gates as pending → validate warns about design and logic gates
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const result = run("ai-os-validate.js", [dir]);
  assert(result.stdout.includes("design confirmation gate"), "eval/product-shape: validate reports design gate status");
  assert(result.stdout.includes("logic confirmation gate"), "eval/ui-vs-logic: validate reports logic gate status");
  cleanup(dir);
}

// Spec stripped of interaction mode markers → validate warns (interaction-mode-misclassified)
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const specPath = path.join(dir, ".ai-os", "specs", "example.spec.md");
  fs.writeFileSync(
    specPath,
    fs.readFileSync(specPath, "utf8")
      .replace(/- \*\*交互模式\*\*[^\n]*\n/, "")
      .replace(/- \*\*推荐模式理由\*\*[^\n]*\n/, "")
      .replace(/- \*\*拒绝的交互模式\*\*[^\n]*\n/, ""),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.stdout.includes("interaction mode"), "eval/interaction-mode: validate warns about missing interaction mode markers");
  cleanup(dir);
}

// Acceptance stripped of transitional markers → validate warns (happy-path / cross-layer)
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const acceptancePath = path.join(dir, ".ai-os", "acceptance.yaml");
  fs.writeFileSync(
    acceptancePath,
    fs.readFileSync(acceptancePath, "utf8")
      .replace(/  quality_tier: "standard"\n/, "")
      .replace(/\nrequired_special_reviews: \[\]\n/, "\n")
      .replace(/      - "contract-baseline-check"\n/g, "")
      .replace(/      - "degraded-path-check"\n/g, ""),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(
    result.stdout.includes("contract") || result.stdout.includes("degraded-path"),
    "eval/null-path: validate warns about missing contract/degraded-path markers"
  );
  cleanup(dir);
}

// Tasks stripped of impact_tags → validate warns (cross-layer-change-missed-linkage)
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8")
      .replace(/\n    impact_tags:\n(?:      - "[^"]+"\n)+/g, "\n"),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.stdout.includes("impact_tags"), "eval/cross-layer: validate warns about missing impact_tags");
  cleanup(dir);
}

// DESIGN.md with missing sections → validate rejects (brownfield-infrastructure-audit)
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(path.join(dir, ".ai-os", "DESIGN.md"), "# Design\n\nMinimal.\n", "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "eval/brownfield-audit: validate rejects DESIGN.md with missing sections");
  cleanup(dir);
}

// MISSION.md with missing sections → validate rejects
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(path.join(dir, ".ai-os", "MISSION.md"), "# Mission\n\nMinimal.\n", "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "eval/mission-integrity: validate rejects MISSION.md with missing sections");
  cleanup(dir);
}

// Legacy MISSION.md + missing baseline-log directory → validate warns but stays valid
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "MISSION.md"),
    `# Mission

## 1. 宿主项目与当前交付定义

- **宿主项目 / 系统**：legacy
- **当前交付主题**：legacy mission

## 2. 用户与场景

- legacy user

## 3. 项目模式、质量目标与关键选型

- **项目模式**：greenfield

## 4. 范围边界

- legacy scope

## 5. 阶段计划

- legacy phase

## 6. 已知输入与待确认项

- legacy pending

## 7. 风险与外部依赖

- legacy risk
`,
    "utf8"
  );
  fs.rmSync(path.join(dir, ".ai-os", "baseline-log"), { recursive: true, force: true });
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 0, "legacy mission structure stays valid with warnings");
  assert(result.stdout.includes("legacy hotspot-heavy structure"), "validate warns on legacy mission structure");
  cleanup(dir);
}

// Legacy baseline-log.md → validate warns but stays valid
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const originalBaselineId = extractMissionBaselineId(
    fs.readFileSync(path.join(dir, ".ai-os", "MISSION.md"), "utf8")
  );
  const legacyBaselineId = "BL-001";
  fs.rmSync(path.join(dir, ".ai-os", "baseline-log"), { recursive: true, force: true });
  fs.writeFileSync(
    path.join(dir, ".ai-os", "baseline-log.md"),
    `# Baseline Log

| ID | Type | Status | Summary | Affects | Confirmed At |
|----|------|--------|---------|---------|--------------|
| ${legacyBaselineId} | align | confirmed | legacy baseline log | MISSION.md | 2026-04-02 |
`,
    "utf8"
  );
  const missionPath = path.join(dir, ".ai-os", "MISSION.md");
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  const acceptancePath = path.join(dir, ".ai-os", "acceptance.yaml");
  fs.writeFileSync(
    missionPath,
    fs.readFileSync(missionPath, "utf8").replace(originalBaselineId, legacyBaselineId),
    "utf8"
  );
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace(originalBaselineId, legacyBaselineId),
    "utf8"
  );
  fs.writeFileSync(
    acceptancePath,
    fs.readFileSync(acceptancePath, "utf8").replace(originalBaselineId, legacyBaselineId),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 0, "legacy baseline-log.md stays valid with warnings");
  assert(result.stdout.includes("legacy single-file log"), "validate warns on legacy baseline-log.md");
  cleanup(dir);
}

// Legacy directory naming (BL-001) → validate warns but stays valid
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const originalBaselineFile = listBaselineRecords(dir, "BL-")[0];
  const originalBaselineId = originalBaselineFile.replace(/\.md$/, "");
  const legacyBaselineId = "BL-001";
  const baselineDir = path.join(dir, ".ai-os", "baseline-log");
  fs.renameSync(
    path.join(baselineDir, originalBaselineFile),
    path.join(baselineDir, `${legacyBaselineId}.md`)
  );
  const missionPath = path.join(dir, ".ai-os", "MISSION.md");
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  const acceptancePath = path.join(dir, ".ai-os", "acceptance.yaml");
  fs.writeFileSync(
    missionPath,
    fs.readFileSync(missionPath, "utf8").replace(originalBaselineId, legacyBaselineId),
    "utf8"
  );
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace(originalBaselineId, legacyBaselineId),
    "utf8"
  );
  fs.writeFileSync(
    acceptancePath,
    fs.readFileSync(acceptancePath, "utf8").replace(originalBaselineId, legacyBaselineId),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 0, "legacy BL-001 directory naming stays valid with warnings");
  assert(result.stdout.includes("timestamp + slug record filenames"), "validate warns on legacy BL-001 directory naming");
  cleanup(dir);
}

// baseline_id mismatch → validate rejects
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  const currentBaselineId = extractMissionBaselineId(
    fs.readFileSync(path.join(dir, ".ai-os", "MISSION.md"), "utf8")
  );
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace(
      `baseline_id: "${currentBaselineId}"`,
      'baseline_id: "BL-20990101-000000-mismatch"'
    ),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "validate rejects baseline_id mismatch");
  assert(result.stdout.includes("baseline_id matches Mission"), "validate reports baseline mismatch");
  cleanup(dir);
}

// High-risk with partial artifacts (risk-register only) → validate still rejects
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8")
      .replace('quality_tier: "standard"', 'quality_tier: "high-risk"'),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "acceptance.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "acceptance.yaml"), "utf8")
      .replace('quality_tier: "standard"', 'quality_tier: "high-risk"'),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "risk-register.md"),
    "# 风险登记表\n\n| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |\n|----|------|------|------|----------|----------|------|\n| R-001 | test | logic | high | trigger | mitigate | open |\n",
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "eval/sensitive-flow: validate rejects high-risk with only partial artifacts");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace('baseline_id:', 'mission: "MISSION.md"\nbaseline_id:'),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 0, "validate tolerates deprecated task mission field with warning");
  assert(result.stdout.includes("deprecated top-level mission field"), "validate warns on deprecated task mission field");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const missionPath = path.join(dir, ".ai-os", "MISSION.md");
  fs.writeFileSync(
    missionPath,
    fs.readFileSync(missionPath, "utf8").replace(
      /(- \*\*当前交付目标\*\*[:：]\s*).+/,
      "$1先锁设计再开发"
    ),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 0, "validate warns on process-style mission goal without failing");
  assert(result.stdout.includes("focuses on delivery outcome"), "validate reports process-style mission goal");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const statePath = path.join(dir, ".ai-os", "STATE.md");
  fs.writeFileSync(
    statePath,
    fs.readFileSync(statePath, "utf8").replace("**当前阶段**", "**阶段**"),
    "utf8"
  );
  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "validate tolerates legacy STATE key with warning");
  assert(validateResult.stdout.includes("deprecated current-position keys"), "validate warns on legacy STATE key");
  const statusResult = run("ai-os-status.js", [dir]);
  assert(statusResult.status === 0, "status still reads legacy STATE key");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace("TASK-AI-002", "TASK-AI-001"),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "validate rejects duplicate task ids");
  assert(result.stdout.includes("duplicate task id"), "validate reports duplicate task ids");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace("- id: M2", "- id: M1"),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "validate rejects duplicate milestone ids");
  assert(result.stdout.includes("duplicate milestone id"), "validate reports duplicate milestone ids");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace(
      /depends_on:\n\s+- "TASK-AI-001"/,
      'depends_on:\n      - "TASK-AI-999"'
    ),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "validate rejects missing dependency refs");
  assert(result.stdout.includes("depends_on missing task"), "validate reports missing dependency refs");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace('    owner: AI\n', '    owner: AI\n    owner: OPS\n'),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "validate rejects duplicate task fields");
  assert(result.stdout.includes("repeats field: owner"), "validate reports duplicate task fields");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace(
      '      - "entrypoint"\n      - "schema"',
      '      - "entrypoint"\n      - "entrypoint"'
    ),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 0, "validate warns on duplicate task list items without failing");
  assert(result.stdout.includes("repeats impact_tags"), "validate reports duplicate task list items");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const memoryPath = path.join(dir, ".ai-os", "memory.md");
  fs.writeFileSync(
    memoryPath,
    fs.readFileSync(memoryPath, "utf8").replace(
      "## 2. 逻辑与契约决策",
      "### DD-001: 重复条目\n- **决策**：重复\n- **原因**：测试\n- **影响范围**：memory\n- **确认来源**：test\n- **活跃度**：active\n- **日期**：2026-04-02\n\n## 2. 逻辑与契约决策"
    ),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "validate rejects duplicate memory ids");
  assert(result.stdout.includes("duplicate memory entry id"), "validate reports duplicate memory ids");
  cleanup(dir);
}
