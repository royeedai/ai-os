# Eval: Reference Project Boundary

## 场景

用户基于某个现有系统做复刻、参考或仿制开发，但没有要求兼容原系统、沿用原命名或保留 legacy 包袱。

## 常见错误规划

- 把参考对象自动当成兼容目标
- 在模块名、页面名、文案、验收项里引入 `legacy`、`原项目`、源系统品牌名
- 输出围绕参考系统组织，而不是围绕当前项目组织

## AI-OS 预期行为

- 明确“参考来源”只用于理解功能和交互，不自动变成兼容边界
- 默认围绕当前项目命名、建模和验收
- 只有在用户明确要求迁移 / 兼容时，才引入兼容约束

## 最低证据

- spec / charter / workflow 输出使用当前项目主体命名
- 参考系统信息只出现在“参考来源”或等价说明位置
- 若存在兼容要求，必须来自用户明确输入，而不是 AI 自推断

## 若需改 framework，优先检查

- `framework/.agents/workflows/clone-project.md`
- `framework/.agents/skills/reverse-engineer/SKILL.md`
- `framework/.agents/skills/reverse-engineer/references/clone-spec-template.md`
- `framework/.agents/references/derived-rules.md`
