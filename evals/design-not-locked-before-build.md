---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: design-not-locked-before-build
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: Design Not Locked Before Build

## 场景

用户只有模糊需求，关键页面和关键信息架构尚未确认，但 AI 已经开始批量写代码。

## 错误交付

- 没有 `DESIGN.md`
- 关键页面和流程都没有确认记录
- `build` 已经大规模推进

## AI-OS 预期行为

- 必须先停在对齐或关键设计阶段
- lane `DESIGN.md` 的设计确认门未通过前不得进入实现
- 用户未明确确认时不得自行推进阶段或跨过审批停点

## 最低证据

- `.ai-os/lanes/default/MISSION.md`
- `.ai-os/lanes/default/DESIGN.md`
- `.ai-os/lanes/default/verification-matrix.yaml`
- `.ai-os/lanes/default/STATE.md`

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §2；绝对禁止 §1、§11；行为规则节"关键设计未锁"和"实现阶段"）
- `framework/.agents/templates/lane/DESIGN.md`
- `framework/.agents/templates/lane/verification-matrix.yaml`
