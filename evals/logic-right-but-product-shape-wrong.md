# Eval: Logic Right But Product Shape Wrong

## 场景

核心逻辑和接口是正确的，但页面结构、信息架构或关键交互不符合已确认设计。

## 错误交付

- AI 只看测试和接口
- 页面组织方式明显背离 Design
- 仍被判定为“可以交付”

## AI-OS 预期行为

- `design-confirmation` 不得放行
- `verify` 必须检查 Design 对照
- `fullstack-dev-checklist` 必须覆盖页面结构和交互

## 最低证据

- `.ai-os/DESIGN.md`
- 设计确认记录
- 页面对照证据

## 若需改 framework，优先检查

- `framework/.agents/workflows/design.md`
- `framework/.agents/workflows/verify.md`
- `framework/.agents/skills/fullstack-dev-checklist/SKILL.md`
