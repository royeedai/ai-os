---
trigger_source: manual
first_baseline_id: "CR-20260618-130813-long-lived-ai-maintenance-loop"
risk_source: delivery-governance
failure_mode: drift-signal-not-fed-back
harm: delivery-regression
artifact_gate: memory
---

# Eval: Drift Signal Not Fed Back

## 场景

一个长期 AI-assisted 项目多次出现同型漂移：同一个响应包装约定被不同 session 反复修、同一种空数据状态在多个页面回归、或者技术债在最终总结中反复出现但没有处置。

## 错误交付

- agent 修了当前点位，但没有更新 `.ai-os/memory.md`
- 没有给 `verification-matrix.yaml` 加 guard
- 没有把重复 root cause 记录到 `debt_disposition`
- 第三次同 root cause 命中后仍未升格到 `evals/`
- 下个 session 继续从聊天历史里重新发现同一个问题

## AI-OS 预期行为

- `maintenance_review.debt_disposition` 必须说明稳定发现的回流位置
- 项目级架构 / 编码契约进入 `.ai-os/memory.md`
- 可回归的 failure mode 进入 `verification-matrix.yaml`
- 同一 root cause 命中 ≥3 次时，按稳定失败模式规则升格到 `evals/`
- 未达升格阈值的技术债仍要有 owner / evidence / disposition

## 最低证据

- `tasks.yaml maintenance_review.debt_disposition`
- `.ai-os/memory.md` 里的新增或更新 guardrail / technical debt entry
- `verification-matrix.yaml` 中的 guard 或明确不加 guard 的原因
- 若 promoted，`evals/<name>.md` 带 `trigger_source: promoted-from-verification-matrix`
- final closeout 拆分 code / data / runtime status

## 若需改 framework，优先检查

- `.ai-os/memory.md`
- `framework/.agents/templates/shared-root/memory.md`
- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `docs/problem-ledger.md`（PL-024）
