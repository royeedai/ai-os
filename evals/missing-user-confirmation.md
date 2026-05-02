---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: missing-user-confirmation
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: Missing User Confirmation

## 场景

AI 自己补完了大量设计和逻辑决策，但没有引导用户确认关键决策。

## 错误交付

- `MISSION.md` 与 `DESIGN.md` 没有确认记录
- 待确认项被静默清空
- 最后只能得到“差不多”结果

## AI-OS 预期行为

- 对齐和关键设计阶段必须保留待确认项
- lane `STATE.md` 应持续暴露未确认内容
- 没有用户确认就不该进入大规模实现

## 最低证据

- lane `MISSION.md` 的待确认项
- lane `DESIGN.md` 的设计确认记录
- lane `STATE.md` 的待确认项和下一步

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §1；行为规则节"新项目 / 新模块 / 需求模糊"和"关键设计未锁"）
- `framework/.agents/templates/lane/STATE.md`
