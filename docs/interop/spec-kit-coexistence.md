# AI-OS × Spec-Kit coexistence

> GitHub's [Spec-Kit](https://github.com/github/spec-kit) is the de-facto standard for spec-driven 0→1 kickoff. AI-OS complements it by covering **everything after implementation lands**: change management, evidence-based verification, delivery handoff, debug scoping, and cross-session recovery.

## TL;DR

| Project shape | Recommended setup |
|---|---|
| Fresh greenfield, one-shot build | Mode A — Spec-Kit leads 0→1, AI-OS takes over for delivery |
| Short-lived prototype / demo | Spec-Kit only |
| Brownfield, long-lived, multi-person | Mode B — AI-OS self-contained |
| Real projects with evolving requirements, debugging, post-mortems | Mode B — AI-OS self-contained |

## Mode A: Spec-Kit leads 0→1, then AI-OS

**When to use**: fresh project, team already runs `/speckit.*`, wants AI-OS governance only after implementation starts.

```
Phase 1 (Spec-Kit):
  /speckit.constitution    → .specify/memory/constitution.md
  /speckit.specify         → .specify/specs/<id>/spec.md
  /speckit.plan            → .specify/specs/<id>/plan.md
  /speckit.tasks           → .specify/specs/<id>/tasks.md
  /speckit.implement       → code

Phase 2 (AI-OS takes over):
  npx --yes github:royeedai/ai-os .
  → AI-OS constitution governs verification, shipping, change, debug, recovery
```

### Artifact coexistence

Keep Spec-Kit as requirement source-of-truth. AI-OS artifacts are minimal:

| Spec-Kit artifact | AI-OS mapping |
|---|---|
| `.specify/memory/constitution.md` | Referenced from AI-OS `memory.md` (no duplicate) |
| `.specify/specs/<id>/spec.md` | Referenced from AI-OS lane `MISSION.md` and `.ai-os/lanes/default/specs/` |
| `.specify/specs/<id>/plan.md` | Not duplicated in AI-OS |
| `.specify/specs/<id>/tasks.md` | Not duplicated; new tasks post-Spec-Kit land in `.ai-os/lanes/default/tasks.yaml` |
| — | AI-OS lane `STATE.md`, `baseline-log/`, `verification-matrix.yaml`, `release-plan.md` + root `memory.md` (unique to AI-OS) |

### Sample `MISSION.md` header for Mode A

```markdown
# Mission

## 1. Delivery baseline summary

- Requirement source-of-truth: `.specify/specs/001-photo-album/spec.md` (Spec-Kit, 2026-04-15)
- This cycle's goal: implement FR-001 through FR-007
- Not in this cycle: FR-008 ~ FR-012

## 5. Stable risks

- Spec-Kit constitution file: `.specify/memory/constitution.md`
- Further requirement changes go through either `/speckit.specify` OR AI-OS `baseline-log/CR-*.md` (pick one, do not run both in parallel)
```

## Mode B: AI-OS self-contained

**When to use**: brownfield, multi-person team, long lifecycle, evolving requirements, real debugging and post-mortems.

Work is governed entirely by AI-OS `AGENTS.md` behavior rules, producing 12 artifacts naturally as scope demands.

See [../getting-started.md](../getting-started.md).

## Anti-patterns (avoid)

1. **Two parallel requirement sources-of-truth**
   - Same requirement tracked in both `.specify/specs/<id>/spec.md` and `.ai-os/lanes/default/specs/*.spec.md`, each evolving independently
   - Drift is inevitable
   - Fix: pick one, reference from the other

2. **AI-OS `MISSION.md` plus Spec-Kit constitution, both claiming authority**
   - Fix: if Spec-Kit constitution exists, MISSION references it; do not restate principles

3. **Running `/speckit.specify` for every requirement change when AI-OS is active**
   - Fix: once AI-OS is active post-implementation, route changes through `baseline-log/CR-*.md`; reserve `/speckit.specify` for the next full 0→1 module

## What AI-OS uniquely provides

| Capability | Spec-Kit | AI-OS |
|---|---|---|
| Cross-session recovery (`STATE.md`) | — | yes |
| Change management (`baseline-log/`) | — | yes |
| Debug scoping (behavior rule: root cause + scope before write) | — | yes |
| Evidence-based verification (4 gates + parity) | — | yes |
| Cross-layer contract registry (`memory.md`) | — | yes |
| Default lane model | — | yes |
| CLI integrity check (`doctor`) | — | yes |
| Reverse-spec parity artifact | — | yes |

Spec-Kit moved LLM-driven work from "vibe coding" to "spec-driven". AI-OS takes "spec-driven" further into "evidence-backed delivery + recoverable memory + full lifecycle".

## Reference implementation

AI-OS's own repo demonstrates Mode B end-to-end. See [AGENTS.md](../../AGENTS.md) + [.ai-os/](../../.ai-os/).
