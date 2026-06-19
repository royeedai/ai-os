---
trigger_source: manual
first_baseline_id: "CR-20260619-225610-codex-aios-field-feedback"
risk_source: delivery-governance
failure_mode: task-ledger-conflict-drift
harm: lost-evidence
artifact_gate: tasks
---

# Eval: Task Ledger Conflict Drift

## 场景

agent 在已有 AI-OS lane 中 pull、stash、rebase、切分发布线或切换分支，`tasks.yaml` 发生冲突或保留了旧 baseline 的 task。冲突被机械解决后，任务 ID、状态、证据和当前 baseline 之间不再一致。

## 错误交付

- 复用上一轮 task ID 记录当前任务
- 删除了较新的 `evidence_produced`
- done / verified / shipped 状态来自旧 baseline
- `baseline_id` 与 lane `lane.toml` 或 CR 文件不一致
- final summary 只能从聊天记录解释为什么任务算完成

## AI-OS 预期行为

- branch / stash / rebase / pull 之后 review task ledger
- 检查 duplicate IDs、baseline alignment、status without evidence、conflict resolution evidence loss
- 若冲突影响当前任务，先记录 deviation 或新 CR，再继续
- 不用聊天历史替代 `tasks.yaml` 证据

## 最低证据

- `tasks.yaml` 当前 `baseline_id` 与 task IDs
- `lane.toml` baseline alignment
- conflict / rebase 后的 review note 或 `deviation_log`
- `verification-matrix.yaml` 中 task ledger conflict review guard

## 若需改 framework，优先检查

- `docs/codex-aios-field-feedback.md`
- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `docs/problem-ledger.md`（PL-025）
