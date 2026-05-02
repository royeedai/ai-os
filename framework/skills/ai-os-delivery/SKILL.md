---
name: ai-os-delivery
description: AI Delivery Constitution governance skill. Use when working in a repository that contains both `AGENTS.md` at the project root and a `.ai-os/` directory. The skill enforces five core requirements (confirm goal first, lock key design before implementation, adapt governance by risk and ambiguity, gate completion on project-native evidence, recover memory across sessions). Triggers on tasks such as starting a new feature, URL reverse-spec intake, requirement changes, bug fixes, verification before shipping, session recovery, or high-risk escalation. References the 12-artifact set under `.ai-os/lanes/default/` with progressive disclosure (L1/L2/L3).
license: MIT
metadata:
  author: AI-OS maintainers
  upstream: https://github.com/royeedai/ai-os
  spec: https://agentskills.io/specification
  applies_to: any-agent
---

# AI-OS delivery skill

This skill packages the AI-OS v9 delivery constitution into the open `agentskills.io` format so any compatible agent (Claude Code, Cursor, Codex, Gemini CLI, ADK, Hermes, VS Code Copilot, Amp, Roo Code, Goose, Windsurf, Continue, ...) can pick it up without writing custom adapters.

## When to apply

Apply this skill on any repository where **all** the following hold:

- The project root contains `AGENTS.md`
- The project root contains a `.ai-os/` directory
- The user task is one of: aligning a new feature, URL reverse-spec intake, designing a module, reacting to a requirement change, fixing a bug, verifying delivery, recovering from a different session, or escalating high-risk work

If the repo only has `AGENTS.md` without `.ai-os/`, fall back to native `AGENTS.md` rules without invoking artifact-specific routing.

## Five core requirements (always enforce)

1. **Goal and user confirmation first** — Do not start large changes before the user has confirmed goal, success criteria, scope, and acceptance object. Disambiguate "configurable / option / setting" before implementation.
2. **Key design and logic locked first** — Do not write business code before the user has confirmed key pages, info architecture, key interactions, key contracts, state transitions, and key error paths. Brownfield / change / reverse-spec must audit shared infrastructure first.
3. **Adaptive governance** — Pick mode (`greenfield` / `reverse-spec` / `brownfield` / `change`), then tier (`P0` / `P1` / `P2`). Artifact depth follows risk + ambiguity + quality bar, not fixed templates.
4. **Evidence-based completion** — Completion must pass design / logic / implementation / delivery gates (and parity gate for reverse-spec). At least one project-native static-check evidence is required; IDE diagnostics alone do not count. Always split conclusions into code / data / runtime status.
5. **Recoverable project memory** — Root `.ai-os/MISSION.md` is shared host context. Lane `MISSION.md` is current delivery baseline. Lane `STATE.md` is session recovery entry. Root `.ai-os/memory.md` records stable decisions and conventions.

## 12 artifacts with progressive disclosure

Load layers progressively. Do not re-load a higher layer in the same session unless the user changes phase.

### L1 — entry metadata (read first on session start)

- `.ai-os/lanes/default/STATE.md` — current position, pending confirmations, next step
- `.ai-os/lanes/default/lane.toml` — lane metadata + current `baseline_id`
- `.ai-os/framework.toml` — schema / layout version
- `.ai-os/lanes/` — list available lanes

### L2 — core docs (load when entering align / design / verify / debug)

- `AGENTS.md` — full constitution
- `.ai-os/MISSION.md` — shared host-project context
- `.ai-os/memory.md` — stable decisions, cross-layer contracts
- `.ai-os/lanes/default/MISSION.md` — current delivery baseline
- `.ai-os/lanes/default/DESIGN.md` — key design + acceptance criteria
- `.ai-os/lanes/default/tasks.yaml` — tasks with owner / approval / evidence
- `.ai-os/lanes/default/verification-matrix.yaml` — regression guards
- `.ai-os/lanes/default/risk-register.md` and `release-plan.md` — high-risk only

### L3 — detailed resources (load only when referenced)

- `.ai-os/lanes/default/baseline-log/CR-*.md` and `BL-*.md` — change requests
- `.ai-os/lanes/default/specs/*.spec.md` — local contracts
- `.ai-os/lanes/default/design-pack/parity-map.md` — reverse-spec parity
- `.ai-os/lanes/default/evals/*.md` — promoted failure-mode samples
- `.ai-os/managed-files.tsv` — managed paths registry

## Behavior routing by task type

| User intent | Skill response |
|---|---|
| New project / new module / vague requirement | Produce / update root `.ai-os/MISSION.md` + lane `MISSION.md` summary; list pending confirmations; **stop and wait for user confirmation** |
| Lock key design | Produce lane `DESIGN.md` with key trade-offs and shared-layer side-effect list; **stop and wait** |
| Decompose tasks | Update lane `tasks.yaml` with owner / `approval_required` / evidence requirements |
| URL reverse-spec intake | Capture URL, screenshots, DOM/CSS, interactions, Network/API observations, backend behavior confidence, and unknowns into `design-pack/parity-map.md` + `specs/*.spec.md`; **do not invent backend internals** |
| Implement | Only act inside confirmed scope; cross-file or unclear boundary → read-only analysis first |
| Requirement change | Write lane `baseline-log/CR-*.md` with impact analysis **before** code edits; then update `MISSION.md` / `DESIGN.md` / `specs/` |
| Fix a bug | State root cause + reproduction path + impact scope + planned files; **stop and wait for "go"** |
| Verify | Cover normal / abnormal / permission denial / empty / timeout / regression; produce project-native static-check evidence |
| Ship | Output dual checklist: implemented / out-of-scope / verification result / rollback condition / AI-done vs human-execute |
| Session resume | Read lane `STATE.md` first → expand to lane `MISSION.md` → latest baseline-log → root `.ai-os/MISSION.md` |
| Stable failure mode | First occurrence registers in lane `verification-matrix.yaml`; same root cause hit ≥3 times must promote to `evals/<name>.md` with frontmatter `trigger_source: promoted-from-verification-matrix` and `first_baseline_id` |

## Absolute prohibitions

The skill must refuse to proceed when any of these would be violated:

1. Writing business code before goal / design is user-confirmed
2. Filling in details the user did not authorize, or changing already-confirmed plans
3. Exploring while editing when boundaries or shared conventions are unclear
4. Editing code before updating the requirement / change record
5. Bug-fix scope creep into unrelated code
6. Reusing shared abstractions before checking real schema / route / wrapper parity
7. Shared-layer changes without an explicit side-effect list
8. Hiding ambiguity, risk, verification failures, or impact surface
9. Stable failure mode patched once without a regression guard
10. Hard-coding personal business rules into universal framework rules
11. Auto-advancing past an approval stop point without explicit user confirmation
12. Treating IDE diagnostics as project-native static-check evidence
13. Mixing root shared artifacts and current-lane artifacts into the same semantic file

## High-risk escalation

Any user-asset write, permission / identity change, irreversible state transition, cross-user data, concurrency-sensitive update, or external side effect must escalate:

- Set `approval_required: true` in lane `tasks.yaml`
- Populate lane `risk-register.md` and `release-plan.md`
- Add at least one real failure-mode guard in `verification-matrix.yaml`
- Do not auto-advance without an approval conclusion

## Multi-lane and team collaboration

- Default current delivery line: `.ai-os/lanes/default/`
- Create a parallel lane only for a genuinely independent delivery line, not for a phase change in the same lane
- Root `MISSION.md` / `memory.md` are maintained on the shared trunk; current-delivery details belong to a specific lane
- `baseline-log/` uses timestamped filenames; `memory.md` uses git union merge
- Before closing a lane, decide which stable conclusions should reflux to root `memory.md`

## References

- Full constitution: `AGENTS.md` (≤150 lines, single source of truth)
- Artifact schema with layer assignments: `docs/artifacts.md`
- URL reverse-spec intake protocol: `docs/reverse-spec-url-intake.md`
- Constitution spec for cross-tool integration: `docs/constitution-spec.md`
- MCP resources URI scheme: `docs/interop/mcp-resources.md`
- Coexistence with other tools: `docs/interop/`
- AI-OS itself: <https://github.com/royeedai/ai-os>

## Skill invocation contract

When activated by an agent, this skill should:

1. Confirm presence of `AGENTS.md` + `.ai-os/` (if missing, decline gracefully)
2. Read L1 first (`STATE.md` / `lane.toml` / `framework.toml`)
3. Decide whether the user task is align / design / decompose / implement / change / debug / verify / ship / resume / high-risk
4. Apply the matching behavior rule from the routing table above
5. Stop at confirmation points; do not auto-advance

The skill does **not** introduce new commands, slash invocations, or runtime dependencies. It is purely an open-format wrapper around the AI-OS constitution.
