---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Missing User Confirmation

## 场景

AI 自己补完了大量设计和逻辑决策，但没有引导用户确认关键决策。

## 错误交付

- `MISSION.md` 与 `DESIGN.md` 没有确认记录
- 待确认项被静默清空
- 最后只能得到“差不多”结果

## AI-OS 预期行为

- `/align` 和 `/design` 应保留待确认项
- `STATE.md` 应持续暴露未确认内容
- 没有确认就不该进入完整 build

## 最低证据

- `MISSION.md` 的待确认项
- `DESIGN.md` 的设计确认记录
- `STATE.md` 的待确认项和下一步

## 若需改 framework，优先检查

- `framework/.agents/workflows/align.md`
- `framework/.agents/workflows/design.md`
- `framework/.agents/templates/project/STATE.md`
