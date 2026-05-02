# Agent Handoff + Evidence Loop Spec

## 1. 概述与闭环场景

- **目标闭环**：AI-OS 记录任务交给哪个执行面、依据哪些上下文、期望返回什么、实际产出什么证据，并用 doctor 捕捉闭环缺口。
- **主要输入**：用户确认的 CR、lane MISSION/DESIGN、task breakdown、agent/IDE 执行结果。
- **主要输出**：带 handoff packet 的 `tasks.yaml`、verification guard、W076 warning、docs/tests 证据。
- **Spec route**：feature / change
- **授权边界**：repo-local artifact governance only

## 2. 业务规则与交互模式

- **交互模式**：async handoff / evidence return
- **核心规则**：
  - task 必须保留 `acceptance_refs` 和 `evidence_required`。
  - 声明 `handoff_to` 的 task 必须记录 `context_refs` 和 `expected_return`。
  - task 标记 `done`、`verified` 或 `shipped` 前必须记录 `evidence_produced`。
  - 实现偏离写入 `deviation_log`；影响需求或验收时升级为 `baseline-log/CR-*`。
- **证据等级**：observed / inferred / unknown

## 3. Handoff packet

| Field | Purpose | Required when | Notes |
|---|---|---|---|
| `handoff_to` | 接收任务的 agent / IDE / human surface | task 需要被执行或审查 | 只记录目标，不触发执行 |
| `context_refs` | 执行所需工件路径 | `handoff_to` 已声明 | 指向 lane MISSION/DESIGN/spec/CR 等 |
| `expected_return` | 期望返回物 | `handoff_to` 已声明 | 如 code diff、test evidence、review note |
| `evidence_required` | 交付前必须证明的内容 | 所有非占位任务 | 与 AC / verification matrix 对齐 |
| `evidence_produced` | 实际已产出证据 | done / verified / shipped | 可为测试、doctor、截图、PR、review log |
| `deviation_log` | 执行偏差 | 偏离设计或验收时 | 可为 `none` 或 CR reference |

## 4. 契约基准

- **接口 / 数据模型**：`tasks.yaml` top-level `tasks[]`
- **状态流转**：todo → in_progress / handed_off → returned → done / verified / shipped

## 5. 边界条件与错误路径

- **空数据**：无 task 时不触发 W076；占位模板行不触发。
- **权限拒绝**：高风险任务仍由 `approval_required: true`、`risk-register.md` 和 `release-plan.md` 管。
- **超时 / 部分失败**：记录到 `deviation_log` 或当前 lane `STATE.md`，不伪装成 done。
- **跨工具执行**：handoff 只记录交接契约，不要求 AI-OS 调用 IDE 或 agent API。

## 6. 验收映射

| REQ | AC | TASK |
|---|---|---|
| REQ-001 | AC-001 | TASK-AI-301, TASK-AI-302 |
| REQ-002 | AC-002 | TASK-AI-303 |
| REQ-003 | AC-003 | TASK-AI-301, TASK-AI-304 |
| REQ-004 | AC-004 | TASK-AI-302, TASK-AI-303 |
| REQ-005 | AC-005 | TASK-AI-304 |
