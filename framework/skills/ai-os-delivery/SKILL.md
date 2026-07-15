---
name: ai-os-delivery
description: Thin agentskills.io adapter for delivery-affecting work in repositories containing both AGENTS.md and .ai-os; selects a lane, loads only the current phase, and delegates behavior to the installed constitution.
license: MIT
metadata:
  author: AI-OS maintainers
  upstream: https://github.com/royeedai/ai-os
  spec: https://agentskills.io/specification
  applies_to: any-agent
---

# AI-OS delivery adapter

Use this skill only when the repository contains both `AGENTS.md` and `.ai-os/` and the request changes code/project artifacts, requirements, verification, release state, delivery recovery, or a high-risk external state. If only AGENTS exists, follow it without AI-OS artifact routing.

## Activation

Run the local AGENTS Activation Gate before lane reads. Ordinary discussion, explanation, learning, temporary commands, and non-repository work do not load or write lane artifacts. If intent is genuinely ambiguous, ask once: “这是先讨论，还是要进入项目交付流程？” Explicit analyze-and-fix, implement, verify, or ship requests are already delivery-affecting.

Always read the local `AGENTS.md`; it is the behavior authority. This adapter does not restate its confirmation, risk, approval, evidence, or completion rules. Canonical schemas are available at `.ai-os/reference/artifacts.md`.

## Select `{laneId}`

1. Use a lane explicitly named by the user.
2. Otherwise use the lane referenced by the active task or baseline.
3. Otherwise use the sole active lane from `.ai-os/lanes/`.
4. If several lanes remain plausible, ask one lane-selection question before writing.

`default` is only the initial installed lane, never a hardcoded current-lane assumption.

## Progressive loading

- L1 after activation: `.ai-os/lanes/{laneId}/lane.toml` and optional `.ai-os/lanes/{laneId}/STATE.md`.
- L2 for align/design/build/verify: local `AGENTS.md`, `.ai-os/MISSION.md`, `.ai-os/memory.md`, and current-lane `MISSION.md`, `DESIGN.md`, `tasks.yaml` as required by the phase.
- L3 only when referenced: current-lane `baseline-log/` and present on-demand `risk-register.md`, `release-plan.md`, `verification-matrix.yaml`, `specs/`, `design-pack/`, `evals/`.

STATE is rebuildable navigation, not truth. Follow the authority order and trigger matrix in local AGENTS. Do not create an on-demand artifact merely because this skill lists it.

## Refresh and handoff

Re-read L1 and the affected higher layer after a baseline change, phase change, context compaction, or worker handoff. Only the coordinating writer reconciles the handoff contract into project truth.

The adapter adds no command, runtime, router, background agent, telemetry, MCP server, or external write path.
