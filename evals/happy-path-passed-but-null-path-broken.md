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

- `acceptance-gate` 必须要求 degraded-path 证据
- `/verify` 必须分别回答正常路径和异常路径是否成立
- `code-review-guard` 必须检查空值 / 缺字段 / 权限拒绝 / 超时的可恢复性

## 最低证据

- acceptance 中的 `degraded-path-check`
- spec 中的 `异常/空数据证据`
- verify 输出的异常路径结论

## 若需改 framework，优先检查

- `framework/.agents/skills/acceptance-gate/SKILL.md`
- `framework/.agents/skills/code-review-guard/SKILL.md`
- `framework/.agents/templates/project/acceptance.yaml`
