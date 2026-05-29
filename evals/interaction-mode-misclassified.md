---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: interaction-mode-misclassified
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: Interaction Mode Misclassified

## 场景

需求本身存在增量输出、长耗时反馈或异步完成特征，但 spec 没有先做交互模式判型，直接按普通 request / response 实现。

## 错误交付

- 聊天、流式生成、长耗时处理被默认做成同步接口
- 用户反馈后才二次重构协议
- spec 中没有写明为什么选当前模式，以及为什么不用其他模式

## AI-OS 预期行为

- 关键设计阶段必须先判断 lane `specs/*.spec.md` §2 的交互模式（`sync` / `async` / `streaming` / `batch`）
- 任务拆解前必须把交互模式和选择理由写进 lane `DESIGN.md` 或 `specs/*.spec.md`
- 实现阶段不得跳过已确定的交互模式

## 最低证据

- lane `specs/*.spec.md` §2 的 `交互模式` 已明确填写（不留默认枚举）
- lane `specs/*.spec.md` 或 `DESIGN.md` 中说明选择该模式的理由
- 说明为何不选其他候选模式（被拒模式 + 原因）

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §2 关键设计与逻辑先锁定）
- `framework/.agents/templates/lane/specs/example.spec.md`
- `framework/.agents/templates/lane/DESIGN.md`
