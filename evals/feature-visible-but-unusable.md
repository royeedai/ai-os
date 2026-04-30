---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Feature Visible But Unusable

## 场景

界面、命令或接口入口看起来已经存在，但用户无法真正完成关键任务，或该能力仍处于占位 / demo / 未验证状态。

## 错误交付

- 把静态入口、假流程或死链当成“功能已完成”
- 未实现或未验证的能力被写进完成说明
- 没有以“用户是否真的能完成任务”为标准做验证

## AI-OS 预期行为

- lane `specs/*.spec.md` 必须明确关键用户任务 / 操作员任务
- 验证阶段必须检查能力是否真实可达、可执行、可完成
- 实现质量门和交付质量门不得放行未实现、未验证或仅占位的能力

## 最低证据

- lane `specs/*.spec.md` 中的关键任务 / 闭环描述
- 关键任务验证证据（自动化、人工验证、UAT、日志、录屏或命令输出中的适用组合）
- lane `verification-matrix.yaml` 的 blocker / gate 状态

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §4 四道门）
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/specs/example.spec.md`
