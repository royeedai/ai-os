# AI-OS v2 定制化改造使用说明

## 1. 本次改造做了什么

- 在 `framework/AGENTS.md` 顶部增加了“项目交付最高优先级核心规则”，统一约束需求基准、用户确认、变更同步、bug 修复边界和分级流程
- 补强了 `workflow` 约束，并新增兼容性的 `/change-request` 与 `/debug` 入口
- 更新了 `MISSION`、`DESIGN`、`STATE`、`spec`、`tasks`、`acceptance`、`release-plan` 等模板，让工件天然带有确认停点和闭环提示

## 2. 规则如何生效

- AI 每次执行前先遵守 `framework/AGENTS.md` 顶部最高优先级规则
- 随后按 `.agents/workflows/` 中对应 workflow 的约束推进
- 最后通过 `.agents/templates/project/` 中的工件模板把确认记录、边界和验证证据沉淀到 `.ai-os/`

## 3. 现在怎么使用

- 新项目、新模块、模糊需求：从 `/align` 开始
- 需求补充、范围调整、验收变化：先走 `/change-request`
- 单点 bug、微调样式 / 文案 / 配置：先走 `/debug`
- 只有在用户确认了需求基准、设计方案和任务验收后，才进入 `/build`

## 4. 注意事项

- `MISSION.md` + `specs/` 是唯一需求真理源，聊天消息不能直接替代
- 任何需求变更必须先更新基准再改代码
- `debug` 不是绕过流程的快捷方式，超出单点边界就必须升级
- 这次改造没有修改 CLI 核心逻辑，只是增强规则、workflow 和模板，因此保留了对原生架构和后续升级的兼容性

## 5. 兼容性与本次 major 说明

- 阶段式 workflow 仍是主路径：`/align -> /design -> /plan -> /build -> /verify -> /ship`
- 原文档里“只支持阶段入口、旧场景命令已移除”的叙事已清理，替换为“阶段主路径 + 兼容专项入口”的说明
- `/change-request` 与 `/debug` 不替代主流程，只负责把变更管理和修复管理安全地路由回主流程
