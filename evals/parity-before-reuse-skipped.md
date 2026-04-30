---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Parity Before Reuse Skipped

## 场景

一个任务准备复用共享抽象、共享审计字段、统一包装层或既有路由模式，例如 BaseEntity、统一响应 `R<T>`、前后端 entrypoint、动态路径路由。

## 错误交付

- 先套用抽象或路由模式，再回头检查真实 schema / route / wrapper 契约
- 前端路径与后端 controller 不一致，或静态子路径被动态路径误命中
- 表结构、自动填充字段、wrapper 解包方式和代码假设不一致

## AI-OS 预期行为

- `/design`、`/plan`、`/build`、`/debug` 必须先核对真实 schema / route / wrapper 契约，再允许复用抽象
- 必须先找一个同仓正常实现对照；偏离既有模式时明确说明理由
- `/verify` 必须显式检查 route / wrapper / schema parity 与静态 / 动态路径冲突风险

## 最低证据

- `DESIGN.md` 或 spec 中的 route / wrapper / schema parity 记录
- tasks 中的 `parity_checks`、`similar_impl_refs`
- acceptance / verify 中的 `route-contract-check`、`schema-parity-check` 或等价记录

## 若需改 framework，优先检查

- `framework/AGENTS.md`
- `framework/.agents/workflows/design.md`
- `framework/.agents/workflows/plan.md`
- `framework/.agents/workflows/build.md`
- `framework/.agents/workflows/debug.md`
- `framework/.agents/workflows/verify.md`
