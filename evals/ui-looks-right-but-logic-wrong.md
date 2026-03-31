# Eval: UI Looks Right But Logic Wrong

## 场景

页面风格和布局已经很像目标产品，但接口契约、状态流转或异常处理有明显错误。

## 错误交付

- 只拿截图说“完成了”
- 没有逻辑确认门
- `verify` 没有对照状态流转和关键异常路径

## AI-OS 预期行为

- `logic-confirmation` 不得通过
- 必须要求 contract / state-flow 证据
- reverse-spec 项目不能只做 UI 对照

## 最低证据

- spec 中的状态流转
- acceptance 的 logic gate
- API / 行为对照证据

## 若需改 framework，优先检查

- `framework/.agents/workflows/verify.md`
- `framework/.agents/skills/spec-validator/SKILL.md`
- `framework/.agents/skills/acceptance-gate/SKILL.md`
