---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Design Not Locked Before Build

## 场景

用户只有模糊需求，关键页面和关键信息架构尚未确认，但 AI 已经开始批量写代码。

## 错误交付

- 没有 `DESIGN.md`
- 关键页面和流程都没有确认记录
- `build` 已经大规模推进

## AI-OS 预期行为

- 必须先停在 `/align` 或 `/design`
- `acceptance.yaml` 的 `design-confirmation` 不能通过
- `/auto-advance` 不应进入大规模实现

## 最低证据

- `.ai-os/MISSION.md`
- `.ai-os/DESIGN.md`
- `.ai-os/acceptance.yaml`
- `.ai-os/STATE.md`

## 若需改 framework，优先检查

- `framework/AGENTS.md`
- `framework/.agents/workflows/design.md`
- `framework/.agents/workflows/build.md`
- `framework/.agents/skills/acceptance-gate/SKILL.md`
