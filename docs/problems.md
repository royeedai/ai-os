# Problems AI-OS Addresses

Real-world failure modes that AI-OS v8 is designed to intercept. Each one maps to specific constitution rules in `AGENTS.md` and to an artifact in `.ai-os/`.

## 2026 AI coding reality

AI coding is universal (>90% daily-active developers in the US), but quality risks are rising:

- AI-generated code has **1.7×** the bug rate of human-written code
- **45%** of AI-generated code contains security vulnerabilities
- Developer trust in AI code fell from 77% to **60%**
- Technical debt accumulates **~3×** faster under AI-assisted workflows
- Frontier models now pass SWE-bench at 85–90% and run autonomously for 25–52 hours — raising the cost of wrong goals and loose designs

The bottleneck is **not** "can the model write code" anymore. It is "is it solving the right problem, with the right design, and is it actually done?"

## AI-OS differentiation

| Layer | Runtime guardrails (AgentSteer, Caliper) | Spec-Kit | Kiro | **AI-OS v8** |
|---|---|---|---|---|
| Intercept layer | Code gen output | 0→1 specification | 0→1 spec-driven IDE | Full lifecycle delivery constitution |
| Scope | Single agent turn | Project kickoff | Feature-at-a-time | Entire project lifecycle (change, debug, retrospective) |
| Memory | None | None | Partial | `STATE.md` + `memory.md` + `baseline-log/` |
| Governance | Rule match | Principle-driven | Process-driven | Adaptive P0/P1/P2 with evidence gates |
| Cross-agent | No (single harness) | Yes (IDE-agnostic) | No (IDE-bound) | Yes (agents.md open standard) |

AI-OS does not replace any of these. It sits above — ensuring the goal is right, the design is locked, and "done" is proven before handoff.

## Failure modes AI-OS intercepts

| Common symptom | AI-OS response |
|---|---|
| Vague requirements, AI starts coding anyway | `AGENTS.md` rule: produce MISSION + wait for user confirmation |
| Requirement changes, AI updates code but not docs | `AGENTS.md` rule: `baseline-log/CR-*.md` before any code change |
| Tech-stack or architecture not locked, AI picks one silently | `AGENTS.md` rule: key design must be user-confirmed before implementation |
| UI looks right but logic wrong | Design + logic gates before implementation; spec-driven acceptance |
| Bug fix touches unrelated code (fix A, break B) | `AGENTS.md` rule: debug scope must be bounded; over-scope escalates to change-request |
| UI entry exists but isn't actually usable | Acceptance + verification-matrix exercise real user paths |
| "Works on my machine" treated as done | Four delivery gates + project-native static check required |
| Long-running / streaming UX designed as sync API | Key interaction-mode must be locked at design phase |
| Cross-layer changes miss propagation | `memory.md` cross-layer contract registry + spec impact tags |
| Brownfield change overrides shared infrastructure without audit | Constitution rule: shared layer audit required in brownfield/change/reverse-spec |
| Replaced shared wrapper before checking schema/route parity | Constitution rule: parity check before abstraction reuse |
| "Code fixed" but data and runtime state not recovered | Constitution rule: split "code state / data state / runtime state" explicitly |
| Brownfield project's MISSION rewritten from scratch | Constitution rule: MISSION records current delivery baseline, not entire legacy project |
| Team collision on MISSION baseline | MISSION is low-frequency; `baseline-log/` is append-only per-record files |
| "Configurable" requirement with no operational closure defined | Constitution rule: ambiguous config/options must clarify ownership before design |
| High-risk actions (assets, permissions, state) not escalated | Constitution rule: hard triggers for high-risk governance tier |
| Happy path passes, exceptions crash | Acceptance must include degraded paths |
| "Complete" but still needs manual SQL / restart / migration | Constitution rule: delivery must explicitly separate "AI done" vs "human still needed" |
| Session changes, AI forgets where it was | `STATE.md` first-read on resume |
| Cross-layer implicit contracts drift across sessions | `memory.md` cross-layer contract registry |
| Weak-type holes (Map, untyped catch, bare strings) erode contracts | Constitution forbids; code review rule flags them |
| Single-endpoint "works" but end-to-end journey broken | Spec must declare user journeys; tasks must include `[E2E-SMOKE]` task |
| Same bug shape repeats across modules, fixed only once | Constitution rule: stable failure mode → `verification-matrix.yaml` guard |

Full traceability: [problem-ledger.md](problem-ledger.md).

## Why these problems need a constitution, not more tools

Every one of the above failure modes is a **moment the AI should have stopped** but didn't — because its system prompt didn't tell it to. Harnesses, memory tools, and IDEs treat these as runtime problems. AI-OS treats them as **behavior rules** loaded from `AGENTS.md` at session start.

The constitution is text. Any agent can read it. The cost is one file. That is the point.
