---
name: ai-os-delivery
description: AI Delivery Constitution governance skill. Use only for delivery-affecting work in a repository that contains both `AGENTS.md` and `.ai-os/`: code or artifact edits, feature work, requirement changes, bug fixes, verification, shipping, session recovery, or high-risk escalation. Do not invoke lane governance for ordinary conversation, brainstorming, explanation, learning questions, temporary commands, or non-repo tasks.
license: MIT
metadata:
  author: AI-OS maintainers
  upstream: https://github.com/royeedai/ai-os
  spec: https://agentskills.io/specification
  applies_to: any-agent
---

# AI-OS delivery skill

This skill packages the AI-OS delivery constitution into the open `agentskills.io` format so any compatible agent (Claude Code, Cursor, Codex, Gemini CLI, ...) can pick it up without writing custom adapters.

## When to apply

Apply this skill on any repository where **all** the following hold:

- The project root contains `AGENTS.md`
- The project root contains a `.ai-os/` directory
- The user task is delivery-affecting work: code or project artifact edits, feature implementation, requirement change, bug fix, verification, shipping, session recovery, or high-risk work

If the repo only has `AGENTS.md` without `.ai-os/`, fall back to native `AGENTS.md` rules without invoking artifact-specific routing.

Do **not** apply lane governance for ordinary conversation. If intent is ambiguous, ask exactly one question before loading lane artifacts: "这是先讨论，还是要进入项目交付流程？" Explicit delivery requests such as "analyze and fix", "implement this", "verify this", or "ship this" are already delivery-affecting; do not ask before reading L1.

## Five core requirements (always enforce)

1. **Goal and user confirmation first** — Do not start large changes before the user has confirmed goal, success criteria, scope, and acceptance object. Do not present unobserved, unconfirmed, or unverified information as fact. Restate goal / main flow / state transitions / exception paths before locking.
2. **Key design and logic locked first** — Do not write business code before the user has confirmed key pages, contracts, state transitions, and key error paths. Brownfield / change / reverse-spec must audit shared infrastructure first.
3. **Adaptive governance** — Pick mode (`greenfield` / `reverse-spec` / `brownfield` / `change`), then tier (`P0` / `P1` / `P2`). Artifact depth follows risk + ambiguity + quality bar, not fixed templates.
4. **Evidence-based completion** — Completion must pass design / logic / implementation / delivery gates. At least one project-native static-check evidence is required; IDE diagnostics alone do not count. Always split conclusions into code / data / runtime status.
5. **Recoverable project memory** — Root `.ai-os/MISSION.md` is shared host context. Lane `MISSION.md` is current delivery baseline. Lane `STATE.md` is session recovery entry. Root `.ai-os/memory.md` records stable decisions and conventions.

## Implicit mechanism change gate

An implicit mechanism is business behavior triggered outside the direct call chain by framework, runtime, config, plugin, decorator, annotation, middleware, build tool, platform, global state, codegen, profile, feature flag, or stub/real switch.

Before changing one, state the trigger entry, effective scope, execution order, failure mode, whether it touches permissions / identity / money / orders / user assets / external systems / production config, and the required tests / build / static checks / runtime evidence. Do not edit related code before this is explicit.

Do not add implicit mechanisms by default to save code: no casual AOP / decorator side effects, global middleware / interceptors / router guards, request / response interceptors, global store mutation side effects, listeners / consumers / scheduled jobs, auto scan / auto import / reflection dispatch, conditional profiles, or ORM cascade / lazy / global scopes.

## High-risk state flow

Login, authz, permissions, tenants, data scope, payment, refund, balance, inventory, order / approval / device / task state, privacy files, exports, audit logs, callbacks, queues, scheduled jobs, retries, idempotency, production config, gateway routes, CORS, domains, and certificates are high-risk by default.

For high-risk state flow, list normal path, duplicate-request path, permission-denied path, partial-failure path, rollback / compensation path, concurrency or repeated-execution consequence, and minimum verification evidence.

## Artifacts with progressive disclosure

After the Activation Gate passes, load layers progressively. Do not re-load a higher layer in the same session unless the user changes phase.

### L1 — entry metadata (read first after activation)

- `.ai-os/lanes/default/STATE.md` — current position, pending confirmations, next step
- `.ai-os/lanes/default/lane.toml` — lane metadata + current `baseline_id`

### L2 — core docs (load when entering align / design / verify / debug)

- `AGENTS.md` — full constitution
- `.ai-os/MISSION.md` + `.ai-os/memory.md` — shared host context, stable decisions
- `.ai-os/lanes/default/MISSION.md` + `DESIGN.md` + `tasks.yaml` — current baseline, key design, tasks

### L3 — detailed resources (load only when referenced)

- `.ai-os/lanes/default/baseline-log/CR-*.md` and `BL-*.md` — change requests and baselines
- On-demand artifacts if present: `specs/`, `design-pack/`, `evals/`, `risk-register.md`, `release-plan.md`, `verification-matrix.yaml`

### On-demand artifacts (create when triggered, schemas in `docs/artifacts.md`)

- `risk-register.md` + `release-plan.md` — create when work enters the high-risk tier
- `verification-matrix.yaml` — create when registering a stable failure mode / regression guard
- `specs/` — create when a large project needs DESIGN split into local contracts
- `design-pack/` — create when reverse-spec work needs parity evidence
- `evals/` — create when the same failure root cause is hit ≥3 times

## Behavior routing by task type

Confirmation stops are real approval boundaries, not ritual pauses. Stop only when the user has not authorized the current phase, scope / acceptance remains unclear, the task is high-risk, or continuing would expand beyond the requested boundary. If the user already asked the agent to fix / implement / verify / ship and the scope is clear, record the basis and continue within that scope.

| User intent | Skill response |
|---|---|
| Just discuss / brainstorm / explain | Do **not** read or write lane artifacts; answer directly |
| New project / vague requirement | Produce / update root `.ai-os/MISSION.md` + lane `MISSION.md` summary; restate and **stop for confirmation** |
| Lock key design | Produce lane `DESIGN.md` with key trade-offs and shared-layer side-effect list; **stop and wait** |
| Decompose tasks | Update lane `tasks.yaml` with owner / `approval_required` / `acceptance_refs` / evidence requirements |
| Implement | Only act inside confirmed scope; cross-file or unclear boundary → read-only analysis first |
| Requirement change | Write lane `baseline-log/CR-*.md` with impact analysis **before** code edits; before closing the CR, add a `## Preventability review` section |
| Fix a bug | State root cause + reproduction path + impact scope + planned files; if the user already asked to fix and scope is clear, continue |
| Verify | Cover normal / abnormal / permission denial / empty / timeout / regression; produce project-native static-check evidence |
| Ship | Output dual checklist: implemented / out-of-scope / verification result / rollback condition / AI-done vs human-execute |
| Session resume | Read lane `STATE.md` first → lane `MISSION.md` → latest baseline-log → root `.ai-os/MISSION.md` |
| Stable failure mode | First occurrence registers in lane `verification-matrix.yaml` (create if absent); same root cause hit ≥3 times promotes to `evals/` |

## Absolute prohibitions

The skill must refuse to proceed when any of these would be violated:

1. Writing business code before goal / design is user-confirmed
2. Filling in details the user did not authorize, changing confirmed plans, or auto-advancing past approval stop points
3. Exploring while editing when boundaries or shared conventions are unclear; reusing shared abstractions before checking real schema / route / wrapper parity
4. Editing code before updating the requirement / change record
5. Bug-fix scope creep into unrelated code
6. Shared-layer changes without an explicit side-effect list
7. Hiding ambiguity, risk, verification failures, or impact surface; treating IDE diagnostics as project-native static-check evidence
8. Stable failure mode patched once without a regression guard; hard-coding personal business rules into universal framework rules

## High-risk escalation

Any user-asset write, permission / identity change, irreversible state transition, cross-user data, concurrency-sensitive update, external side effect, or high-risk state flow must escalate:

- Set `approval_required: true` in lane `tasks.yaml`
- Create and populate lane `risk-register.md` and `release-plan.md`
- Add at least one real failure-mode guard in `verification-matrix.yaml`
- Do not auto-advance without an approval conclusion

## Multi-lane and team collaboration

- Default current delivery line: `.ai-os/lanes/default/`
- Create a parallel lane only for a genuinely independent delivery line
- Root `MISSION.md` / `memory.md` are maintained on the shared trunk; `memory.md` uses git union merge
- Before closing a lane, decide which stable conclusions should reflux to root `memory.md`

## References

- Full constitution: `AGENTS.md` (≤150 lines, single source of truth)
- Artifact schema with layer assignments: `docs/artifacts.md`
- Coexistence with other tools: `docs/interop.md`
- AI-OS itself: <https://github.com/royeedai/ai-os>

## Skill invocation contract

When activated by an agent, this skill should:

1. Confirm presence of `AGENTS.md` + `.ai-os/` (if missing, decline gracefully)
2. Run the Activation Gate before reading L1; ordinary conversation stops here with no lane artifact access
3. If activated, read L1 (`STATE.md` / `lane.toml`)
4. Decide whether the delivery task is align / design / decompose / implement / change / debug / verify / ship / resume / high-risk
5. Apply the matching behavior rule from the routing table above and stop at confirmation points

The skill does **not** introduce new commands, slash invocations, IDE plugins, agent runners, MCP servers, or runtime dependencies. It is purely an open-format wrapper around the AI-OS constitution.
