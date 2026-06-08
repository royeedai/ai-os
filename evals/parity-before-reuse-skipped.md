---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: parity-before-reuse-skipped
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: Parity Before Reuse Skipped

## 场景

一个任务准备复用共享抽象、共享审计字段、统一包装层或既有路由模式，例如 BaseEntity、统一响应 `R<T>`、前后端 entrypoint、动态路径路由。

## 错误交付

- 先套用抽象或路由模式，再回头检查真实 schema / route / wrapper 契约
- 前端路径与后端 controller 不一致，或静态子路径被动态路径误命中
- 表结构、自动填充字段、wrapper 解包方式和代码假设不一致

## AI-OS 预期行为

- 关键设计、任务拆解、实现、修复 bug 阶段必须先核对真实 schema / route / wrapper 契约，再允许复用抽象
- 必须先找一个同仓正常实现对照；偏离既有模式时明确说明理由
- 验证阶段必须显式检查 route / wrapper / schema parity 与静态 / 动态路径冲突风险

## 最低证据

- lane `DESIGN.md` 或 `specs/*.spec.md` 中的 route / wrapper / schema parity 记录
- lane `tasks.yaml` 中的 `change_scope` / `context_refs`，以及 `design-pack/parity-map.md` 的 parity 记录
- lane `verification-matrix.yaml` 中的 `route-contract-check`、`schema-parity-check` 或等价记录

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §2"复用共享抽象、统一包装层或新增 entrypoint 前，必须先核对真实 schema / route / wrapper 契约"；绝对禁止 §6）
- `framework/.agents/templates/lane/DESIGN.md`
- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/design-pack/parity-map.md`
