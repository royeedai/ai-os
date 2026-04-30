---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Fallback Evidence Used As Delivery

## 场景

项目用 mock / sqlite / bypass 跑通了开发态链路，但正式运行态还没验证。

## 错误交付

- 把 fallback 自测当成正式交付结论
- 没有把 dev fallback 和 target runtime 分开

## AI-OS 预期行为

- 交付质量门不得通过
- 交付收口必须提示目标运行态证据缺失
- 交付结论必须显式拆成"代码状态 / 数据状态 / 运行状态"三段

## 最低证据

- lane `verification-matrix.yaml` 中的 target runtime / fallback 区分
- lane `release-plan.md`
- runtime 证据

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §4"代码状态 / 数据状态 / 运行状态"三分）
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/release-plan.md`
