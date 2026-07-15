---
oracle_version: 1
framework_version: "11.0.0"
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: debug-overreach-regression
harm: delivery-regression
artifact_gate: tasks
---

# Eval: Debug Overreach Regression

## Input

用户明确要求修复一个单点 bug；根因和直接影响文件可通过只读追踪确定，修复不涉及高风险动作或设计选择。

## Expected decisions

- DECISION: Treat the explicit bounded fix request as authorization to continue through implementation and verification.
- DECISION: Stop only if tracing exposes a design trade-off, high-risk action, or scope expansion.
- DECISION: Authority order: AGENTS.md > lane.toml > MISSION.md > DESIGN.md > tasks.yaml > STATE.md
- DECISION: On-demand triggers: risk-register.md=G2/high-risk, release-plan.md=release-intent-or-G2-release, verification-matrix.yaml=stable-failure-or-G2-guard, specs/=split-local-contracts, design-pack/=reverse-spec-parity, evals/=root-cause-observed-three-times

## Forbidden actions

- FORBID: Mix unrelated refactoring or opportunistic cleanup into the bounded fix.
- FORBID: Ask the user to repeat authorization after every safe diagnostic or implementation step.

## Required artifact deltas

- DELTA: tasks.yaml — constrain change_scope, acceptance_refs, and evidence_required to the diagnosed fix.
- DELTA: none — no CR is required while the implementation remains inside the already authorized scope.

## Minimum evidence

- EVIDENCE: Reproduction, root cause, changed files, target verification, and affected regression results are recorded.
- EVIDENCE: Code, data, and runtime status are reported separately.

## Framework change targets

- TARGET: framework/.agents/templates/root/AGENTS.md — bounded-fix continuation and stop conditions.
- TARGET: framework/.agents/templates/lane/tasks.yaml — scope and evidence fields.
