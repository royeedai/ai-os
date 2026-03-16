# Eval: Fallback Evidence Used As Delivery

## 场景

项目用 mock / sqlite / bypass 跑通了开发态链路，但正式运行态还没验证。

## 错误交付

- 把 fallback 自测当成正式交付结论
- 没有把 dev fallback 和 target runtime 分开

## AI-OS 预期行为

- `delivery-readiness` 不得通过
- release-check 必须提示目标运行态证据缺失

## 最低证据

- `acceptance.yaml` 中的 target runtime / fallback 区分
- `release-plan.md`
- runtime 证据

## 若需改 framework，优先检查

- `framework/.agents/templates/project/acceptance.yaml`
- `framework/.agents/templates/project/release-plan.md`
- `bin/ai-os-release-check.js`
