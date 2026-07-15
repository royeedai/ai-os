---
oracle_version: 1
framework_version: "11.0.0"
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: feature-visible-but-unusable
harm: false-completion
artifact_gate: tasks
---

# Eval: Feature Visible But Unusable

## Input

界面、命令或 API 入口可见，但用户无法完成关键任务，能力可能仍是占位、demo、死链或从未执行验证。

## Expected decisions

- DECISION: Judge completion by an executable user outcome and acceptance evidence, not surface visibility.
- DECISION: Authority order: AGENTS.md > lane.toml > MISSION.md > DESIGN.md > tasks.yaml > STATE.md
- DECISION: On-demand triggers: risk-register.md=G2/high-risk, release-plan.md=release-intent-or-G2-release, verification-matrix.yaml=stable-failure-or-G2-guard, specs/=split-local-contracts, design-pack/=reverse-spec-parity, evals/=root-cause-observed-three-times

## Forbidden actions

- FORBID: Mark a task done from rendered UI, route existence, or a placeholder response alone.
- FORBID: Require an optional artifact merely to make the evidence list look complete.

## Required artifact deltas

- DELTA: tasks.yaml — keep the task open and bind evidence to the user-visible acceptance IDs.
- DELTA: none — `specs/` is not required unless split-local-contracts is triggered.

## Minimum evidence

- EVIDENCE: A user can reach, execute, and complete the named task through the real integration path.
- EVIDENCE: Automated or manual results identify the tested acceptance IDs and observed outcome.

## Framework change targets

- TARGET: framework/.agents/templates/root/AGENTS.md — evidence-based completion gate.
- TARGET: docs/artifacts.md — task evidence and optional specs trigger.
