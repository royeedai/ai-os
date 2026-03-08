---
name: task-orchestrator
description: >
  将项目章程或模块 .spec 拆成可执行任务图，包含依赖、状态、Definition of Ready、Definition of Done 和 Evidence Pack。
  当需要拆任务、排期、减少漏项，或在编码前建立执行顺序时必须使用。
---

# 任务编排器

本 Skill 用于把“需求”转成“可执行任务图”，避免 AI 只会从 spec 直接跳到编码。

## 使用方式

1. 输入来源可以是 `project-charter.md` 或某个模块的 `.spec.md`
2. 使用 `references/tasks-template.yaml` 生成或更新 `tasks.yaml`
3. 对每个任务明确依赖、风险、输入、输出、DoR、DoD、Evidence Pack
4. 将测试、文档、发布、回滚、验收任务显式拆出，不允许只拆开发任务
5. 每次任务状态变化都要回写 `tasks.yaml`

## 拆分原则

- 一个任务只能对应一个清晰结果
- 一个任务必须有可验证的完成证据
- 高风险任务要单独拆出并标记审批点
- 共性基础设施、迁移、回归检查不得藏在“顺手做”

## 禁止事项

- 禁止把“开发整个模块”写成一个任务
- 禁止没有依赖关系就并行推进互相阻塞的任务
- 禁止未满足 DoR 就把任务标记为进行中
