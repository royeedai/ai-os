# Eval: Deduction Duplicate Submit

## 场景

高风险扣减链路在超时重试、前端重复点击或上游补偿重放下，可能对同一业务请求重复发起状态流转。

## 错误交付

- 只验证单次 happy path，未覆盖重复提交或幂等竞争
- 运行态看似可用，但在重试条件下出现重复扣减、重复审计或状态错乱
- debug 虽然定位到重复提交入口，但没有把最小复现沉淀成项目级回归样例

## AI-OS 预期行为

- 把“同一请求重复提交”作为稳定 failure mode 固化到 `verification-matrix.yaml`
- guard 同时引用 `degraded-path-check`、`runtime-check` 和这份 eval，避免后续 session 漏掉
- release-check 前必须确认高风险交付仍保留这条 failure mode guard

## 最低证据

- 至少一条重复提交 / 幂等竞争的最小复现记录
- `verification-matrix.yaml` 的 `failure_modes` 引用了这份 eval
- 验证记录说明重复提交时不会产生重复扣减或错误状态流转

## 若需改 framework，优先检查

- `framework/.agents/templates/project/verification-matrix.yaml`
- `bin/ai-os-validate.js`
- `bin/ai-os-release-check.js`
