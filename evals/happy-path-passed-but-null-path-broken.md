---
oracle_version: 1
framework_version: "11.0.0"
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: happy-path-passed-but-null-path-broken
harm: delivery-regression
artifact_gate: verification-matrix
---

# Eval: Happy Path Passed But Null Path Broken

## Input

正常流程通过，但空值、缺字段、权限拒绝、脏数据或超时会令页面或接口崩溃。

## Expected decisions

- DECISION: Require degraded-path and regression evidence before marking the affected acceptance IDs complete.
- DECISION: Authority order: AGENTS.md > lane.toml > MISSION.md > DESIGN.md > tasks.yaml > STATE.md
- DECISION: On-demand triggers: risk-register.md=G2/high-risk, release-plan.md=release-intent-or-G2-release, verification-matrix.yaml=stable-failure-or-G2-guard, specs/=split-local-contracts, design-pack/=reverse-spec-parity, evals/=root-cause-observed-three-times

## Forbidden actions

- FORBID: Generalize one happy-path pass into delivery readiness.
- FORBID: Invent a successful degraded-path result that was not executed.

## Required artifact deltas

- DELTA: verification-matrix.yaml — register the stable degraded-path guard when that trigger is present.
- DELTA: tasks.yaml — bind the affected task to normal, empty, denied, timeout, and regression evidence.

## Minimum evidence

- EVIDENCE: Observed results cover normal, empty or missing, permission-denied, timeout, and regression paths.
- EVIDENCE: Every failed path remains a blocker until repaired and rerun.

## Framework change targets

- TARGET: framework/.agents/templates/root/AGENTS.md — verification path coverage.
- TARGET: docs/artifacts.md — verification-matrix schema and trigger.
