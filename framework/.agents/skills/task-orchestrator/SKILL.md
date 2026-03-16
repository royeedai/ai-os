---
name: task-orchestrator
description: >
  在 plan 阶段把 Mission / Design / Spec 收敛为可执行任务波次和角色分工。
---

# 任务编排器（vNext）

## 使用时机

- 设计和逻辑已经足够明确
- 准备进入 build
- 需要按 wave 和 execution_role 组织任务

## 必做步骤

1. 读取 `MISSION.md`、`DESIGN.md`、specs 和 `STATE.md`
2. 把任务拆成可独立验证的单元
3. 为每个任务指定：
   - `wave`
   - `execution_role`
   - `approval_required`
   - `context_files`
   - `evidence_required`
   - `parity_evidence_required`（reverse-spec 适用）
4. 更新 `.ai-os/tasks.yaml`
5. 同步 `.ai-os/STATE.md`

## 拆分原则

- 设计未锁定的工作不要和实现任务混在一起
- 逻辑确认前不要把大规模实现放进早期 wave
- review / verify / runtime evidence 必须显式占位

## 交付输出

- `.ai-os/tasks.yaml`
- 更新后的 `.ai-os/STATE.md`

## 禁止事项

- 禁止把“开发整个模块”写成一个任务
- 禁止不写 execution_role 和 approval_required

## 维护信息

- 来源：`/plan` workflow
- 更新时间：2026-03-16
- 已知限制：本 Skill 负责任务编排，不替代 spec 校验和验收判断
