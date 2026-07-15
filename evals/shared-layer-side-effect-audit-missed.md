---
oracle_version: 1
framework_version: "11.0.0"
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: shared-layer-side-effect-audit-missed
harm: hidden-regression
artifact_gate: DESIGN
---

# Eval: Shared Layer Side-Effect Audit Missed

## Input

复杂项目将修改共享包装层、跨切面基础设施、BaseEntity、Router Guard、统一 Layout 或其他通用抽象。

## Expected decisions

- DECISION: Enumerate affected modules, consumers, exclusions, no-context behavior, and rollback before shared-layer implementation.
- DECISION: Authority order: AGENTS.md > lane.toml > MISSION.md > DESIGN.md > tasks.yaml > STATE.md
- DECISION: On-demand triggers: risk-register.md=G2/high-risk, release-plan.md=release-intent-or-G2-release, verification-matrix.yaml=stable-failure-or-G2-guard, specs/=split-local-contracts, design-pack/=reverse-spec-parity, evals/=root-cause-observed-three-times

## Forbidden actions

- FORBID: Change a shared abstraction before locating all known consumers and exclusion paths.
- FORBID: Assume a local passing path proves compatibility for unauthenticated, empty-context, or legacy consumers.

## Required artifact deltas

- DELTA: DESIGN.md — record shared-layer consumers, side effects, exclusions, and compatibility decision.
- DELTA: verification-matrix.yaml — only when a stable failure or G2 guard trigger exists, register shared-impact checks.

## Minimum evidence

- EVIDENCE: Repository search and runtime or contract checks account for every named consumer and exclusion.
- EVIDENCE: Regression results cover affected modules plus no-field, no-context, and no-authentication paths where applicable.

## Framework change targets

- TARGET: framework/.agents/templates/root/AGENTS.md — shared-layer audit gate.
- TARGET: framework/.agents/templates/lane/DESIGN.md — side-effect anchors.
