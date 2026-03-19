---
name: task-orchestrator
description: >
  当 spec 已可进入 build、需要在 /plan 阶段拆任务时，使用本 Skill 把 Mission / Design / Spec 收敛为可执行任务波次和角色分工。
---

# 任务编排器（vNext）

## 使用时机

- 设计和逻辑已经足够明确
- 准备进入 build
- 需要按 wave 和 execution_role 组织任务

## 使用方式

## 必做步骤

1. 读取 `MISSION.md`、`DESIGN.md`、specs 和 `STATE.md`
2. 把任务拆成可独立验证的单元
3. 为每个任务指定：
   - `wave`
   - `execution_role`
   - `approval_required`
   - `context_files`
   - `impact_tags`
   - `derived_checks`
   - `risk_triggers`
   - `evidence_required`
   - `parity_evidence_required`（reverse-spec 适用）
4. 根据 spec 中的 `集成触点`、`交互模式` 和共享基础设施约定，派生 `context_files`、`impact_tags`、`derived_checks`
5. 对照 `../references/risk-triggers.md`，命中高风险触发时升级 `quality_tier`，并强制补审批和专项审查
6. 更新 `.ai-os/tasks.yaml`
7. 同步 `.ai-os/STATE.md`

## 拆分原则

- 设计未锁定的工作不要和实现任务混在一起
- 逻辑确认前不要把大规模实现放进早期 wave
- review / verify / runtime evidence 必须显式占位
- 跨层联动任务必须把入口、契约、映射、运行态影响拆成可验证项，而不是合并成一句“完成模块开发”
- 若 brownfield / change 任务受 request wrapper、DTO / adapter、中间件、路由鉴权或样式基准影响，必须把这些共享约定纳入 `context_files` 或 `derived_checks`

## 交付输出

- `.ai-os/tasks.yaml`
- 更新后的 `.ai-os/STATE.md`

### 示例：根据集成触点派生任务上下文

- 输入：Mission、Design、带 `集成触点` 和 `交互模式` 的 spec
- 输出：带 `context_files`、`impact_tags`、`derived_checks`、`risk_triggers` 的 tasks

## 禁止事项

- 禁止把“开发整个模块”写成一个任务
- 禁止不写 execution_role 和 approval_required
- 禁止忽略 spec 中的集成触点，导致 `context_files` 和联动检查缺失

## 维护信息

- 来源：`/plan` workflow
- 更新时间：2026-03-19
- 已知限制：本 Skill 负责任务编排，不替代 spec 校验和验收判断
