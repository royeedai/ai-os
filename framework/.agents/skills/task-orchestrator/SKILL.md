---
name: task-orchestrator
description: >
  将项目章程或模块 .spec 拆成可执行任务图，包含依赖、状态、wave 并行分组、上下文注入、Definition of Ready、Definition of Done 和 Evidence Pack。
  当需要拆任务、排期、减少漏项，或在编码前建立执行顺序时必须使用。
---

# 任务编排器

本 Skill 用于把"需求"转成"可执行任务图"，避免 AI 只会从 spec 直接跳到编码。

## 使用方式

1. 输入来源可以是 `.ai-os/project-charter.md` 或某个模块的 `.spec.md`
2. 使用下方模板生成或更新 `.ai-os/tasks.yaml`
3. 对每个任务明确依赖、风险、输入、输出、DoR、DoD、Evidence Pack
4. 结合 `.ai-os/verification-matrix.yaml`，为每个任务补齐 `affected_components`、`verification_required`、`restart_required`、`cold_start_required`
5. 将测试、文档、发布、回滚、验收任务显式拆出，不允许只拆开发任务
6. 为任务分配 wave 编号（基于依赖图拓扑排序），同一 wave 内的任务可并行执行
7. 为每个任务指定 `context_files`，列出执行该任务前必须加载的文件
8. 每次任务状态变化都要回写 `.ai-os/tasks.yaml` 和 `.ai-os/STATE.md`

## 拆分原则

- 一个任务只能对应一个清晰结果
- 一个任务必须有可验证的完成证据
- 高风险任务要单独拆出并标记审批点
- 共性基础设施、迁移、回归检查不得藏在"顺手做"
- 命中 `verification-matrix.yaml` 的运行时变更，必须显式拆出重启 / 冷启动验证任务或在当前任务中写明验证动作
- **上下文窗口约束**：一个任务的全部输入（spec 引用、依赖代码、实现代码、测试代码）加起来不应超出 AI 单次有效处理能力。经验法则：一个任务涉及的新增/修改代码不应超过 500 行。超过时必须拆成更小的子任务。
- **拆分信号**：如果 AI 在执行任务时出现"我先做 A 部分，稍后再做 B 部分"的自述，说明任务粒度过大，应回退拆分。

## Wave 并行分组规则

- 无依赖的任务归入 wave 1
- 依赖项全部在 wave N 或更早完成的任务，归入 wave N+1
- 同一 wave 内的任务可以使用 IDE 的 subagent/Task 工具并行执行
- Wave 按顺序推进，当前 wave 全部完成才进入下一个 wave
- 文件冲突（多个任务修改同一文件）的任务必须放入不同 wave 或同一任务

## 上下文注入协议

每个任务的 `context_files` 字段列出执行前必须加载的文件。`context_files`、`inputs`、`outputs` 中的路径均相对于 `.ai-os/` 目录。执行任务时：

1. 读取 `.ai-os/STATE.md` 恢复全局方位
2. 读取该任务 `context_files` 中的所有文件
3. 读取 `.ai-os/memory.md` 获取长期约束和决策
4. 若使用 subagent/Task 工具执行，必须在 prompt 中包含以上关键内容摘要

## 禁止事项

- 禁止把"开发整个模块"写成一个任务
- 禁止没有依赖关系就并行推进互相阻塞的任务
- 禁止未满足 DoR 就把任务标记为进行中
- 禁止一个任务涉及超过 500 行新增/修改代码而不拆分

---

## 模板引用

- 任务图：读取 `.agents/templates/project/tasks.yaml` 作为模板生成 `.ai-os/tasks.yaml`
