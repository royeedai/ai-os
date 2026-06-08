---
trigger_source: manual
first_baseline_id: "CR-20260502-224147-agent-handoff-evidence-loop"
risk_source: delivery-governance
failure_mode: task-handoff-evidence-not-returned
harm: delivery-regression
artifact_gate: verification-matrix
---

# Eval: Task Handoff Evidence Not Returned

## 场景

AI-OS 把一个任务 handoff 给执行端（Cursor agent / Claude Code / 本地 runner / 远端 sandbox），执行端跑完代码后只更新源码或留下聊天记录，没有把测试输出、原生静态校验、影响清单、回归证据等写回 lane 工件。

## 错误交付

- `tasks.yaml` 状态被翻成 `done` / `verified` / `shipped`，但任务体里没有 `acceptance_refs` / `evidence_required` / `evidence_produced`
- handoff 字段缺 `context_refs` 或 `expected_return`，下次 session 无法判断当时究竟把什么交给了哪个 agent
- `verification-matrix.yaml` 里的 guard 没有引用到任何具体证据
- 用户事后回看仓库时只能看到代码而看不到完成依据，必须靠重新跑一次来验证

## AI-OS 预期行为

- 任务 handoff 是仓库内治理契约，不是 IDE 执行层；handoff 后必须有可在仓库里审计的证据回流
- `tasks.yaml` 在 done / verified / shipped 之前必须有 `acceptance_refs`、`evidence_required`、handoff `context_refs` / `expected_return` 与 `evidence_produced`
- 偏离应通过 `deviation_log` 记录，而不是悄悄改 tasks 状态
- doctor `--strict` 在缺字段时通过 W076 拦截

## 最低证据

- lane `tasks.yaml` 中的 `handoff_to` / `context_refs` / `expected_return` / `evidence_required` / `evidence_produced` / `deviation_log`
- lane `verification-matrix.yaml` 中针对 handoff 的 guard
- `docs/cli.md` 中 W076 的描述与 doctor 实际输出一致

## 若需改 framework，优先检查

- `AGENTS.md`（行为规则 §交付收口、§任务拆解）
- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `bin/ai-os-doctor.js`（W076 实现）
