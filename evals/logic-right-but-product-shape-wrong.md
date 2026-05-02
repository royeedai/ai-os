---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: logic-right-but-product-shape-wrong
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: Logic Right But Product Shape Wrong

## 场景

核心逻辑和接口是正确的，但页面结构、信息架构或关键交互不符合已确认设计。

## 错误交付

- AI 只看测试和接口
- 页面组织方式明显背离 Design
- 仍被判定为“可以交付”

## AI-OS 预期行为

- 设计确认门不得放行
- 验证阶段必须检查 Design 对照
- 验证必须覆盖页面结构、信息架构和关键交互，而不只是接口测试

## 最低证据

- `.ai-os/lanes/default/DESIGN.md`
- 设计确认记录
- 页面对照证据

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §2、§4；行为规则节"关键设计未锁"和"验证阶段"）
- `framework/.agents/templates/lane/DESIGN.md`
