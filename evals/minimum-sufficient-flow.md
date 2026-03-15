# Eval: Minimum Sufficient Flow

## 场景

用户要做一个小范围改动，例如：

- 修一个接口参数校验 bug
- 给现有命令补一个输出选项
- 改一个纯 API 的字段映射

## 常见错误规划

- 不区分模块类型，默认要求页面、API、数据库三件套
- 不区分交付等级，把小改动强行升级成完整 spec / 发布 / 审批流程
- 用“更严格”代替“更合适”，导致流程成本高于改动本身

## AI-OS 预期行为

- 先识别模块类型和交付等级
- 只选择与当前交付目标相关的最小工件、Skill 和验证动作
- 保留任务记录、状态同步和最小完成证据，但不机械追加重流程

## 最低证据

- 能说明这是哪类模块、属于什么交付等级
- 能说明为什么不需要更重的流程
- 有最小运行 / 构建 / 调用成功证据

## 若需改 framework，优先检查

- `framework/.agents/workflows/quick.md`
- `framework/.agents/workflows/new-module.md`
- `framework/.agents/skills/AGENTS.md`
- `framework/.agents/skills/code-review-guard/SKILL.md`
- `framework/.agents/skills/fullstack-dev-checklist/SKILL.md`
