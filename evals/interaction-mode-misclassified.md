---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Interaction Mode Misclassified

## 场景

需求本身存在增量输出、长耗时反馈或异步完成特征，但 spec 没有先做交互模式判型，直接按普通 request / response 实现。

## 错误交付

- 聊天、流式生成、长耗时处理被默认做成同步接口
- 用户反馈后才二次重构协议
- spec 中没有写明为什么选当前模式，以及为什么不用其他模式

## AI-OS 预期行为

- `spec-validator` 必须先判断 `sync` / `streaming` / `async-job` / `event-driven`
- `/plan` 前必须把交互模式和选择理由写进 spec
- `/build` 不得跳过已确定的交互模式

## 最低证据

- spec 中的 `交互模式`
- `推荐模式理由`
- `拒绝的交互模式`

## 若需改 framework，优先检查

- `framework/.agents/skills/spec-validator/SKILL.md`
- `framework/.agents/workflows/plan.md`
- `framework/.agents/templates/project/specs/example.spec.md`
