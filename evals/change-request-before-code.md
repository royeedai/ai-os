---
oracle_version: 1
framework_version: "11.0.0"
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: change-request-before-code
harm: delivery-regression
artifact_gate: MISSION
---

# Eval: Change Request Before Code

## Input

用户在交付中补充新需求或改变范围，agent 正准备直接修改代码，当前 confirmed baseline 仍描述旧需求。

## Expected decisions

- DECISION: Create and approve a CR before code changes, then align MISSION, DESIGN, and tasks to the new baseline.
- DECISION: Authority order: AGENTS.md > lane.toml > MISSION.md > DESIGN.md > tasks.yaml > STATE.md
- DECISION: On-demand triggers: risk-register.md=G2/high-risk, release-plan.md=release-intent-or-G2-release, verification-matrix.yaml=stable-failure-or-G2-guard, specs/=split-local-contracts, design-pack/=reverse-spec-parity, evals/=root-cause-observed-three-times

## Forbidden actions

- FORBID: Modify implementation while the CR is proposed or the old baseline remains active.
- FORBID: Treat STATE.md as authority over the confirmed baseline.

## Required artifact deltas

- DELTA: baseline-log/CR-*.md — record impact, approval, application, and the successor baseline.
- DELTA: MISSION.md, DESIGN.md, and tasks.yaml — align affected contracts and acceptance references.

## Minimum evidence

- EVIDENCE: The approved CR and confirmed successor BL are immutable and lane.toml selects the successor.
- EVIDENCE: Changed tasks bind acceptance and produced evidence to the successor baseline.

## Framework change targets

- TARGET: framework/.agents/templates/root/AGENTS.md — requirement-change gate.
- TARGET: framework/.agents/templates/lane/baseline-log/BL-template.md — CR lifecycle schema.
