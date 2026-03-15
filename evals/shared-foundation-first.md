# Eval: Shared Foundation First

## 场景

项目是平台型 / 后台型 / 流程型系统。用户希望先做某个业务模块，但该模块实际依赖：

- 登录和权限
- 多语言
- 组织 / 租户 / 仓库上下文
- 基础设置或数据字典

## 常见错误规划

- 直接从第一个业务模块页面开始做
- 阶段目标写成“完成模块 A”，而不是“打通基础能力 + 首条闭环”
- 完成了局部页面，却无法形成真实可运行链路

## AI-OS 预期行为

- 先识别是否存在共享基础能力依赖
- 若存在，优先规划基础能力层和首条可运行闭环
- 只有依赖已具备，才推进依赖它的业务模块

## 最低证据

- `project-charter` 或等价规划里明确了共享基础能力依赖
- 当前里程碑目标不是孤立模块完成，而是可运行闭环
- 任务编排能体现基础能力优先级

## 若需改 framework，优先检查

- `framework/.agents/skills/project-planner/SKILL.md`
- `framework/.agents/skills/task-orchestrator/SKILL.md`
- `framework/.agents/workflows/new-project.md`
- `framework/.agents/workflows/new-module.md`
- `framework/.agents/skills/acceptance-gate/SKILL.md`
