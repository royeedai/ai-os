#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  assert, run, tmpDir, cleanup, listBaselineRecords,
  extractMissionBaselineId, section,
} = require("./helpers");

section("validate compatibility / high-risk release-check");
const legacyDir = tmpDir();
run("create-ai-os.js", [legacyDir, "--with-project-files", "--legacy-layout"]);
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
run("create-ai-os.js", [highRiskBlockedDir, "--with-project-files", "--legacy-layout"]);
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
run("create-ai-os.js", [highRiskReadyDir, "--with-project-files", "--legacy-layout"]);
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

failure_modes:
  - id: duplicate-deduction-submit
    trigger: "重复提交同一扣减请求"
    guards:
      - "degraded-path-check"
      - "runtime-check"
    notes: "扣减链路的历史高频回归入口"
`,
  "utf8"
);
const releaseReadyResult = run("ai-os-release-check.js", [highRiskReadyDir]);
assert(releaseReadyResult.status === 0, "release-check passes for explicit high-risk project with required artifacts");
cleanup(highRiskReadyDir);

const highRiskMissingMarkersDir = tmpDir();
run("create-ai-os.js", [highRiskMissingMarkersDir, "--with-project-files", "--legacy-layout"]);
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

const verificationMatrixFailureModeWarnDir = tmpDir();
run("create-ai-os.js", [verificationMatrixFailureModeWarnDir, "--with-project-files", "--legacy-layout"]);
fs.writeFileSync(
  path.join(verificationMatrixFailureModeWarnDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: linkage-runtime
    impact_tags:
      - "runtime-config"
    actions:
      - "build"
    evidence:
      - "runtime-check"
    notes: "运行时配置变更后必须补运行态证据"
`,
  "utf8"
);
const verificationMatrixFailureModeWarnResult = run("ai-os-validate.js", [verificationMatrixFailureModeWarnDir]);
assert(verificationMatrixFailureModeWarnResult.status === 0, "validate warns but does not block when verification-matrix misses failure_modes");
assert(verificationMatrixFailureModeWarnResult.stdout.includes("missing marker: failure_modes:"), "validate reports missing verification-matrix failure_modes marker");
cleanup(verificationMatrixFailureModeWarnDir);

const verificationMatrixEmptyFailureModeWarnDir = tmpDir();
run("create-ai-os.js", [verificationMatrixEmptyFailureModeWarnDir, "--with-project-files", "--legacy-layout"]);
fs.writeFileSync(
  path.join(verificationMatrixEmptyFailureModeWarnDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: linkage-runtime
    impact_tags:
      - "runtime-config"
    actions:
      - "build"
    evidence:
      - "runtime-check"
    notes: "运行时配置变更后必须补运行态证据"

failure_modes: []
`,
  "utf8"
);
const verificationMatrixEmptyFailureModeWarnResult = run("ai-os-validate.js", [verificationMatrixEmptyFailureModeWarnDir]);
assert(verificationMatrixEmptyFailureModeWarnResult.status === 0, "validate warns but does not block when failure_modes is empty");
assert(verificationMatrixEmptyFailureModeWarnResult.stdout.includes("failure_modes exists but has no concrete entries"), "validate reports empty failure_modes guard list");
cleanup(verificationMatrixEmptyFailureModeWarnDir);

const verificationMatrixInvalidFailureModeGuardWarnDir = tmpDir();
run("create-ai-os.js", [verificationMatrixInvalidFailureModeGuardWarnDir, "--with-project-files", "--legacy-layout"]);
fs.writeFileSync(
  path.join(verificationMatrixInvalidFailureModeGuardWarnDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: linkage-runtime
    impact_tags:
      - "runtime-config"
    actions:
      - "build"
    evidence:
      - "runtime-check"
    notes: "运行时配置变更后必须补运行态证据"

failure_modes:
  - id: runtime-config-regression
    trigger: "配置切换后启动失败"
    guards:
      - "runtime-check"
      - "unknown-check"
      - "evals/missing-runtime-regression.md"
`,
  "utf8"
);
const verificationMatrixInvalidFailureModeGuardWarnResult = run("ai-os-validate.js", [verificationMatrixInvalidFailureModeGuardWarnDir]);
assert(verificationMatrixInvalidFailureModeGuardWarnResult.status === 0, "validate warns but does not block when failure_modes guards reference unknown evidence");
assert(verificationMatrixInvalidFailureModeGuardWarnResult.stdout.includes("failure_modes guards reference acceptance evidence or existing evals"), "validate checks failure_modes guard references");
assert(verificationMatrixInvalidFailureModeGuardWarnResult.stdout.includes("unknown guard reference: unknown-check"), "validate reports unknown failure_modes evidence guard");
assert(verificationMatrixInvalidFailureModeGuardWarnResult.stdout.includes("missing eval file: evals/missing-runtime-regression.md"), "validate reports missing failure_modes eval guard");
cleanup(verificationMatrixInvalidFailureModeGuardWarnDir);

const highRiskMissingFailureModesDir = tmpDir();
run("create-ai-os.js", [highRiskMissingFailureModesDir, "--with-project-files", "--legacy-layout"]);
fs.writeFileSync(
  path.join(highRiskMissingFailureModesDir, ".ai-os", "tasks.yaml"),
  fs.readFileSync(path.join(highRiskMissingFailureModesDir, ".ai-os", "tasks.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace(/status: todo/g, "status: done")
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"\n      - "state-transition"'),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingFailureModesDir, ".ai-os", "acceptance.yaml"),
  fs.readFileSync(path.join(highRiskMissingFailureModesDir, ".ai-os", "acceptance.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('required_special_reviews: []', 'required_special_reviews: ["security-guard", "authorization-boundary-check", "concurrency-safety-check"]')
    .replace(/status: pending/g, "status: passed"),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingFailureModesDir, ".ai-os", "release-plan.md"),
  `# Test Release

## 1. 交付前检查

- Mission、Design、Spec、Acceptance 已同步
- 高风险审批点已完成确认
- 高风险专项审查（权限 / 并发 / 不可逆状态流转）已记录
- 静态校验证据已记录（npm run build）

## 2. 变更范围与依赖

- 覆盖高风险扣减接口

## 3. 发布步骤

1. [AI 已完成] 完成代码和验证证据整理
2. [需人工执行] 发布并重启 API

## 4. 运行态验证

- authorization-boundary-check：权限 / 越权边界验证完成
- concurrency-safety-check：并发 / 幂等 / 状态竞争验证完成
- degraded-path-check：空值 / 超时 / 部分失败场景验证完成
- 静态校验证据已记录（npm run build）

## 5. 回滚触发条件

- 出现重复扣减或越权访问

## 6. 交付说明与移交

- AI 已完成：代码实现、测试与证据整理
- 需人工执行：发布并重启 API
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingFailureModesDir, ".ai-os", "risk-register.md"),
  `# 风险登记表

| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |
|----|------|------|------|----------|----------|------|
| R-001 | 权益扣减并发覆盖 | 逻辑 / 发布 | 高 | 高并发重复提交 | 幂等键 + 审计日志 + 专项审查 | open |
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingFailureModesDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"
  restart_api: "npm run restart:api"

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
const highRiskMissingFailureModesResult = run("ai-os-release-check.js", [highRiskMissingFailureModesDir]);
assert(highRiskMissingFailureModesResult.status === 1, "release-check blocks high-risk delivery when verification-matrix lacks failure_modes");
assert(highRiskMissingFailureModesResult.stdout.includes("records concrete failure_modes guards"), "release-check reports missing high-risk failure_modes guard");
cleanup(highRiskMissingFailureModesDir);

const highRiskEmptyFailureModesDir = tmpDir();
run("create-ai-os.js", [highRiskEmptyFailureModesDir, "--with-project-files", "--legacy-layout"]);
fs.writeFileSync(
  path.join(highRiskEmptyFailureModesDir, ".ai-os", "tasks.yaml"),
  fs.readFileSync(path.join(highRiskEmptyFailureModesDir, ".ai-os", "tasks.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace(/status: todo/g, "status: done")
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"\n      - "state-transition"'),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskEmptyFailureModesDir, ".ai-os", "acceptance.yaml"),
  fs.readFileSync(path.join(highRiskEmptyFailureModesDir, ".ai-os", "acceptance.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('required_special_reviews: []', 'required_special_reviews: ["security-guard", "authorization-boundary-check", "concurrency-safety-check"]')
    .replace(/status: pending/g, "status: passed"),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskEmptyFailureModesDir, ".ai-os", "release-plan.md"),
  `# Test Release

## 1. 交付前检查

- Mission、Design、Spec、Acceptance 已同步
- 高风险审批点已完成确认
- 高风险专项审查（权限 / 并发 / 不可逆状态流转）已记录
- 静态校验证据已记录（npm run build）

## 2. 变更范围与依赖

- 覆盖高风险扣减接口

## 3. 发布步骤

1. [AI 已完成] 完成代码和验证证据整理
2. [需人工执行] 发布并重启 API

## 4. 运行态验证

- authorization-boundary-check：权限 / 越权边界验证完成
- concurrency-safety-check：并发 / 幂等 / 状态竞争验证完成
- degraded-path-check：空值 / 超时 / 部分失败场景验证完成
- 静态校验证据已记录（npm run build）

## 5. 回滚触发条件

- 出现重复扣减或越权访问

## 6. 交付说明与移交

- AI 已完成：代码实现、测试与证据整理
- 需人工执行：发布并重启 API
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskEmptyFailureModesDir, ".ai-os", "risk-register.md"),
  `# 风险登记表

| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |
|----|------|------|------|----------|----------|------|
| R-001 | 权益扣减并发覆盖 | 逻辑 / 发布 | 高 | 高并发重复提交 | 幂等键 + 审计日志 + 专项审查 | open |
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskEmptyFailureModesDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"
  restart_api: "npm run restart:api"

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

failure_modes: []
`,
  "utf8"
);
const highRiskEmptyFailureModesResult = run("ai-os-release-check.js", [highRiskEmptyFailureModesDir]);
assert(highRiskEmptyFailureModesResult.status === 1, "release-check blocks high-risk delivery when failure_modes is empty");
assert(highRiskEmptyFailureModesResult.stdout.includes("failure_modes exists but has no concrete entries"), "release-check reports empty high-risk failure_modes guard list");
cleanup(highRiskEmptyFailureModesDir);

const highRiskInvalidFailureModeGuardsDir = tmpDir();
run("create-ai-os.js", [highRiskInvalidFailureModeGuardsDir, "--with-project-files", "--legacy-layout"]);
fs.writeFileSync(
  path.join(highRiskInvalidFailureModeGuardsDir, ".ai-os", "tasks.yaml"),
  fs.readFileSync(path.join(highRiskInvalidFailureModeGuardsDir, ".ai-os", "tasks.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace(/status: todo/g, "status: done")
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"\n      - "state-transition"'),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskInvalidFailureModeGuardsDir, ".ai-os", "acceptance.yaml"),
  fs.readFileSync(path.join(highRiskInvalidFailureModeGuardsDir, ".ai-os", "acceptance.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('required_special_reviews: []', 'required_special_reviews: ["security-guard", "authorization-boundary-check", "concurrency-safety-check"]')
    .replace(/status: pending/g, "status: passed"),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskInvalidFailureModeGuardsDir, ".ai-os", "release-plan.md"),
  `# Test Release

## 1. 交付前检查

- Mission、Design、Spec、Acceptance 已同步
- 高风险审批点已完成确认
- 高风险专项审查（权限 / 并发 / 不可逆状态流转）已记录
- 静态校验证据已记录（npm run build）

## 2. 变更范围与依赖

- 覆盖高风险扣减接口

## 3. 发布步骤

1. [AI 已完成] 完成代码和验证证据整理
2. [需人工执行] 发布并重启 API

## 4. 运行态验证

- authorization-boundary-check：权限 / 越权边界验证完成
- concurrency-safety-check：并发 / 幂等 / 状态竞争验证完成
- degraded-path-check：空值 / 超时 / 部分失败场景验证完成
- 静态校验证据已记录（npm run build）

## 5. 回滚触发条件

- 出现重复扣减或越权访问

## 6. 交付说明与移交

- AI 已完成：代码实现、测试与证据整理
- 需人工执行：发布并重启 API
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskInvalidFailureModeGuardsDir, ".ai-os", "risk-register.md"),
  `# 风险登记表

| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |
|----|------|------|------|----------|----------|------|
| R-001 | 权益扣减并发覆盖 | 逻辑 / 发布 | 高 | 高并发重复提交 | 幂等键 + 审计日志 + 专项审查 | open |
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskInvalidFailureModeGuardsDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"
  restart_api: "npm run restart:api"

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

failure_modes:
  - id: duplicate-deduction-submit
    trigger: "重复提交同一扣减请求"
    guards:
      - "degraded-path-check"
      - "unknown-check"
      - "evals/missing-deduction.md"
`,
  "utf8"
);
const highRiskInvalidFailureModeGuardsResult = run("ai-os-release-check.js", [highRiskInvalidFailureModeGuardsDir]);
assert(highRiskInvalidFailureModeGuardsResult.status === 1, "release-check blocks high-risk delivery when failure_modes guards reference unknown evidence");
assert(highRiskInvalidFailureModeGuardsResult.stdout.includes("failure_modes guards reference acceptance evidence or existing evals for high-risk delivery"), "release-check checks failure_modes guard references");
assert(highRiskInvalidFailureModeGuardsResult.stdout.includes("unknown guard reference: unknown-check"), "release-check reports unknown failure_modes evidence guard");
assert(highRiskInvalidFailureModeGuardsResult.stdout.includes("missing eval file: evals/missing-deduction.md"), "release-check reports missing failure_modes eval guard");
cleanup(highRiskInvalidFailureModeGuardsDir);

const projectEvalStructureWarnDir = tmpDir();
run("create-ai-os.js", [projectEvalStructureWarnDir, "--with-project-files", "--legacy-layout"]);
fs.mkdirSync(path.join(projectEvalStructureWarnDir, ".ai-os", "evals"), { recursive: true });
fs.writeFileSync(
  path.join(projectEvalStructureWarnDir, ".ai-os", "evals", "runtime-regression.md"),
  `# Eval: Runtime Regression

## 场景

一个运行态回归被重新引入。

## 错误交付

- 只在当前 session 里修复，没有沉淀回归证据
`,
  "utf8"
);
const projectEvalStructureWarnResult = run("ai-os-validate.js", [projectEvalStructureWarnDir]);
assert(projectEvalStructureWarnResult.status === 0, "validate warns but does not block when project eval sections are incomplete");
assert(projectEvalStructureWarnResult.stdout.includes(".ai-os/evals/runtime-regression.md sections complete"), "validate checks project eval section completeness");
assert(projectEvalStructureWarnResult.stdout.includes("missing section: 最低证据"), "validate reports missing project eval sections");
cleanup(projectEvalStructureWarnDir);

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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.unlinkSync(path.join(dir, ".ai-os", artifact));
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, `eval/${evalName}: validate rejects missing ${artifact}`);
  cleanup(dir);
}

// Missing specs directory → validate rejects
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.rmSync(path.join(dir, ".ai-os", "specs"), { recursive: true, force: true });
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "eval/spec-coverage: validate rejects missing specs directory");
  cleanup(dir);
}

// Default acceptance has gates as pending → validate warns about design and logic gates
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const result = run("ai-os-validate.js", [dir]);
  assert(result.stdout.includes("design confirmation gate"), "eval/product-shape: validate reports design gate status");
  assert(result.stdout.includes("logic confirmation gate"), "eval/ui-vs-logic: validate reports logic gate status");
  cleanup(dir);
}

// Spec stripped of interaction mode markers → validate warns (interaction-mode-misclassified)
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.writeFileSync(path.join(dir, ".ai-os", "DESIGN.md"), "# Design\n\nMinimal.\n", "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "eval/brownfield-audit: validate rejects DESIGN.md with missing sections");
  cleanup(dir);
}

// MISSION.md with missing sections → validate rejects
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.writeFileSync(path.join(dir, ".ai-os", "MISSION.md"), "# Mission\n\nMinimal.\n", "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "eval/mission-integrity: validate rejects MISSION.md with missing sections");
  cleanup(dir);
}

// Legacy MISSION.md + missing baseline-log directory → validate warns but stays valid
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
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

section("validate: cross-layer contract registry (PL-033)");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const baselineResult = run("ai-os-validate.js", [dir]);
  assert(
    baselineResult.status === 0,
    "validate accepts default CONVENTIONS (includes cross-layer registry five subsections)"
  );
  assert(
    !baselineResult.stdout.includes("missing section heading:"),
    "validate does not warn about missing cross-layer registry sections in default template"
  );
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const conventionsPath = path.join(dir, ".ai-os", "CONVENTIONS.md");
  const original = fs.readFileSync(conventionsPath, "utf8");
  const stripped = original.split("## 跨层契约登记表")[0];
  fs.writeFileSync(conventionsPath, stripped, "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(
    result.status === 0,
    "validate warns but does not fail when cross-layer registry is missing"
  );
  assert(
    result.stdout.includes("cross-layer contract registry has five subsections"),
    "validate warns on missing cross-layer contract registry"
  );
  assert(
    result.stdout.includes("## 跨层契约登记表"),
    "validate reports which cross-layer registry heading is missing"
  );
  cleanup(dir);
}

section("validate: spec input_mode column (PL-035)");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const baselineResult = run("ai-os-validate.js", [dir]);
  assert(
    baselineResult.status === 0,
    "validate accepts default spec (includes input_mode column)"
  );
  assert(
    !baselineResult.stdout.includes("add `input_mode` column"),
    "validate does not warn about input_mode when spec template is intact"
  );
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const specPath = path.join(dir, ".ai-os", "specs", "example.spec.md");
  fs.writeFileSync(
    specPath,
    fs.readFileSync(specPath, "utf8").replace(/ input_mode \|/g, " col3 |"),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(
    result.status === 0,
    "validate warns but does not fail when spec drops input_mode column"
  );
  assert(
    result.stdout.includes("declares input_mode column in section 3"),
    "validate warns on missing input_mode column"
  );
  cleanup(dir);
}

section("validate: spec User Journey section 5.5 (PL-035)");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const specPath = path.join(dir, ".ai-os", "specs", "example.spec.md");
  const original = fs.readFileSync(specPath, "utf8");
  const withoutJourney = original.replace(
    /## 5\.5 User Journey 闭环契约[\s\S]+?(?=## 6\.)/,
    ""
  );
  assert(
    !withoutJourney.includes("## 5.5 User Journey 闭环契约"),
    "fixture prepares spec without journey section"
  );
  fs.writeFileSync(specPath, withoutJourney, "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(
    result.status === 0,
    "validate warns but does not fail when spec drops User Journey section"
  );
  assert(
    result.stdout.includes("declares User Journey closure contract (section 5.5)"),
    "validate warns on missing User Journey section 5.5"
  );
  cleanup(dir);
}

section("validate: tasks.yaml E2E-SMOKE linkage (PL-035)");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const specPath = path.join(dir, ".ai-os", "specs", "example.spec.md");
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  const originalSpec = fs.readFileSync(specPath, "utf8");
  const journeyRow = "| J-100 | 保存任务 → 查看任务列表 | [POST /tasks, GET /tasks] | taskId 路由参数 | POST data.id → 前端 list | [TASK-AI-003] |";
  const withRealJourney = originalSpec.replace(
    /\| J-001 \| \[示例：保存数据集.*\[TASK-AI-XXX\] \|/,
    journeyRow
  );
  fs.writeFileSync(specPath, withRealJourney, "utf8");

  const withoutE2e = fs.readFileSync(tasksPath, "utf8").replace(
    /- id: TASK-AI-003[\s\S]+?notes: "本任务归整条 journey 的 owner.+?"/m,
    ""
  );
  fs.writeFileSync(tasksPath, withoutE2e, "utf8");

  const result = run("ai-os-validate.js", [dir]);
  assert(
    result.status === 0,
    "validate warns but does not fail when tasks.yaml misses E2E-SMOKE for declared journey"
  );
  assert(
    result.stdout.includes("declares at least one [E2E-SMOKE] task"),
    "validate warns on missing [E2E-SMOKE] task when spec declares real journey"
  );
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  const result = run("ai-os-validate.js", [dir]);
  assert(
    result.status === 0,
    "validate accepts default example where spec has placeholder J-001 only"
  );
  assert(
    !result.stdout.includes("declares at least one [E2E-SMOKE] task when specs list journeys"),
    "validate does not warn about E2E-SMOKE when spec journey row is still the template placeholder"
  );
  cleanup(dir);
}
