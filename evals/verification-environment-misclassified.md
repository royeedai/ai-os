---
trigger_source: manual
first_baseline_id: "CR-20260619-225610-codex-aios-field-feedback"
risk_source: delivery-governance
failure_mode: verification-environment-misclassified
harm: wrong-root-cause
artifact_gate: verification-matrix
---

# Eval: Verification Environment Misclassified

## 场景

项目原生验证失败，但失败原因可能来自本地 `.env`、DNS / proxy、SDK 网络、模拟器、生产签名、真实设备、远端服务、第三方 API、应用商店或 live deployment 状态。agent 没有分类，直接把失败当成产品代码问题或反过来把代码缺陷归咎于环境。

## 错误交付

- 改业务代码去绕过一个本地 key / proxy / DNS 问题
- 把 provider outage 当成已修复的产品问题关闭
- 把 iOS 真机、WeChat 真实设备、生产签名等外部 blocker 写成验证通过
- 用户拿到结论后无法判断下一步是改代码、修环境、等外部服务，还是人工验证

## AI-OS 预期行为

- 验证失败先分类为 `product-code`、`local-environment`、`external-service` 或 `production-state-unknown`
- 分类写入 task evidence、`deviation_log` 或 release blockers
- 只有 product-code failure 才进入代码修复；其他分类必须给出人工步骤或外部 blocker
- final closeout 拆分 code / data / runtime status

## 最低证据

- `tasks.yaml` 的 `evidence_produced` 或 `deviation_log`
- `verification-matrix.yaml` 的 verification environment classification guard
- `release-plan.md` 中外部 blocker 或人工验证步骤
- 项目原生命令输出或可复查的失败摘要

## 若需改 framework，优先检查

- `docs/codex-aios-field-feedback.md`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/tasks.yaml`
- `docs/problem-ledger.md`（PL-025）
