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
2. 使用下方模板生成或更新 `tasks.yaml`
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

---

## 模板

```yaml
version: 1
milestones:
  - id: M1
    title: "Milestone 1"
    goal: "可验证的阶段目标"

tasks:
  - id: TASK-001
    title: "示例任务"
    milestone: M1
    parent: null
    status: todo
    owner: ai
    risk: medium
    depends_on: []
    inputs:
      - "project-charter.md"
      - "specs/example.spec.md"
    outputs:
      - "src/example.ts"
      - "tests/example.test.ts"
    definition_of_ready:
      - "关联 spec 已确认"
      - "依赖任务已完成"
    definition_of_done:
      - "代码实现完成"
      - "测试通过"
      - "已更新相关文档"
    evidence_required:
      - "build-log"
      - "test-log"
      - "api-sample-or-screenshot"
    blockers: []
    notes: ""
```
