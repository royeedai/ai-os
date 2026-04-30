---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Happy Path Passed But Null Path Broken

## 场景

正常流程演示通过，但一旦返回空值、缺字段、权限拒绝或超时，页面 / 接口立即崩溃。

## 错误交付

- 只有 happy path 证据
- 空值 / 脏数据 / 异常分支没有验证
- `delivery-readiness` 仍被错误放行

## AI-OS 预期行为

- 交付质量门必须要求 degraded-path 证据
- 验证阶段必须覆盖正常路径、异常路径、权限拒绝、空数据、超时和回归
- 实现质量门必须检查空值 / 缺字段 / 权限拒绝 / 超时的可恢复性

## 最低证据

- lane `verification-matrix.yaml` 中的 `degraded-path-check`
- lane `specs/*.spec.md` 中的 `异常/空数据证据`
- 验证输出的异常路径结论

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §4；行为规则节"验证阶段"覆盖六类路径）
- `framework/.agents/templates/lane/verification-matrix.yaml`
