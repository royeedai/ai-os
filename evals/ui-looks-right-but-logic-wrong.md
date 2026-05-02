---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: ui-looks-right-but-logic-wrong
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: UI Looks Right But Logic Wrong

## 场景

页面风格和布局已经很像目标产品，但接口契约、状态流转或异常处理有明显错误。

## 错误交付

- 只拿截图说“完成了”
- 没有逻辑确认门
- `verify` 没有对照状态流转和关键异常路径

## AI-OS 预期行为

- 逻辑确认门未通过不得进入交付
- 必须要求 contract / state-flow 证据
- reverse-spec 项目不能只做 UI 对照，必须走 parity 门

## 最低证据

- lane `specs/*.spec.md` 中的状态流转
- lane `verification-matrix.yaml` 中的逻辑 guard
- API / 行为对照证据

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §4 四道门；reverse-spec parity-gate）
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/specs/example.spec.md`
