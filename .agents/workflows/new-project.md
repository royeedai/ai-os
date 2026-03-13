---
description: 新项目启动流程（从口头需求到项目章程、模块规划和任务图）
---

# 新项目启动流程

当用户说"做一个新项目"、"从 0 开始搭一个系统"、"规划一个完整产品"时触发此流程。

## 阶段一：项目定义

1. 调用 `project-planner`，选择项目 archetype
2. 根据 archetype 推荐交付等级（L1 探索 / L2 标准 / L3 高风险），用户可调整
3. 创建 `.ai-os-project/project-charter.md`，明确目标、范围边界、目标用户、成功指标、非功能需求、依赖、审批点、交付等级
4. 识别项目不包含的内容，避免 AI 自动脑补范围
5. 产出初版里程碑和模块清单

## 阶段二：任务编排

6. 调用 `task-orchestrator`，为里程碑和模块生成 `.ai-os-project/tasks.yaml`（含 wave 并行分组和 context_files）
7. 为关键模块预留 `.ai-os-project/specs/*.spec.md`、测试、发布、回滚、文档任务，不允许只拆开发任务
8. 调用 `acceptance-gate` 生成项目级 `.ai-os-project/acceptance.yaml`
9. 建立 `.ai-os-project/risk-register.md`，标出外部依赖、风险等级和人工审批点
10. 初始化 `.ai-os-project/STATE.md`，记录项目当前位置和进度

## 阶段三：确认与启动

11. 向用户展示项目章程、模块清单、关键任务图、交付等级、主要风险
12. 用户确认后，再进入具体模块的 `/new-module`
13. 若在已有代码库上开发，建议先执行 `/map-codebase`
14. 若后续范围变化，转入 `/change-request`
