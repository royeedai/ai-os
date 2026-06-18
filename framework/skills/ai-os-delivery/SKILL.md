---
name: ai-os-delivery
description: AI Delivery Constitution governance skill. Use only for delivery-affecting work in a repository that contains both `AGENTS.md` and `.ai-os/`: code or artifact edits, feature work, URL reverse-spec, requirement changes, bug fixes, verification, shipping, session recovery, or high-risk escalation. Do not invoke lane governance for ordinary conversation, brainstorming, explanation, learning questions, temporary commands, or non-repo tasks.
license: MIT
metadata:
  author: AI-OS maintainers
  upstream: https://github.com/royeedai/ai-os
  spec: https://agentskills.io/specification
  applies_to: any-agent
---

# AI-OS delivery skill

This skill packages the current AI-OS delivery constitution into the open `agentskills.io` format so any compatible agent (Claude Code, Cursor, Codex, Gemini CLI, ADK, Hermes, VS Code Copilot, Amp, Roo Code, Goose, Windsurf, Continue, ...) can pick it up without writing custom adapters.

## When to apply

Apply this skill on any repository where **all** the following hold:

- The project root contains `AGENTS.md`
- The project root contains a `.ai-os/` directory
- The user task is delivery-affecting work: code or project artifact edits, feature implementation, URL reverse-spec intake, module design for implementation, requirement change, bug fix, verification, shipping, session recovery, or high-risk work

If the repo only has `AGENTS.md` without `.ai-os/`, fall back to native `AGENTS.md` rules without invoking artifact-specific routing.

Do **not** apply lane governance for ordinary conversation: requirement brainstorming, "let's just discuss", code explanation, option comparison, learning questions, temporary command lookup, non-repo delivery tasks, or any request where the user says not to enter AI-OS / not to change the project. If intent is ambiguous, ask exactly one question before loading lane artifacts: "这是先讨论，还是要进入项目交付流程？"

## Activation Gate

- Delivery-affecting work → activate this skill, then use progressive disclosure.
- Ordinary conversation → answer directly; do not read or write `.ai-os/lanes/*`, and do not enter debug / plan / verification routing.
- Ambiguous intent → ask the one confirmation question above, then follow the user's answer.
- Explicit delivery requests such as "analyze and fix", "implement this", "verify this", or "ship this" are already delivery-affecting; do not ask the one confirmation question before reading L1.
- Ordinary conversation still follows the general constraints to serve the user's real goal, avoid invented facts, and avoid false verification claims.

## Five core requirements (always enforce)

1. **Goal and user confirmation first** — Do not start large changes before the user has confirmed goal, success criteria, scope, and acceptance object. Disambiguate "configurable / option / setting" before implementation. Do not present unobserved, unconfirmed, or unverified information as fact.
2. **Key design and logic locked first** — Do not write business code before the user has confirmed key pages, info architecture, key interactions, key contracts, state transitions, and key error paths. Brownfield / change / reverse-spec must audit shared infrastructure first.
3. **Adaptive governance** — Pick mode (`greenfield` / `reverse-spec` / `brownfield` / `change`), then tier (`P0` / `P1` / `P2`). Artifact depth follows risk + ambiguity + quality bar, not fixed templates.
4. **Evidence-based completion** — Completion must pass design / logic / implementation / delivery gates (and parity gate for reverse-spec). At least one project-native static-check evidence is required; IDE diagnostics alone do not count. Always split conclusions into code / data / runtime status.
5. **Recoverable project memory** — Root `.ai-os/MISSION.md` is shared host context. Lane `MISSION.md` is current delivery baseline. Lane `STATE.md` is session recovery entry. Root `.ai-os/memory.md` records stable decisions and conventions.

## 12 artifacts with progressive disclosure

After the Activation Gate passes, load layers progressively. Do not re-load a higher layer in the same session unless the user changes phase.

### L1 — entry metadata (read first after activation)

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
- `.ai-os/lanes/default/tasks.yaml` — tasks with owner / approval / handoff / evidence
- `.ai-os/lanes/default/verification-matrix.yaml` — regression guards
- `.ai-os/lanes/default/risk-register.md` and `release-plan.md` — high-risk only

### L3 — detailed resources (load only when referenced)

- `.ai-os/lanes/default/baseline-log/CR-*.md` and `BL-*.md` — change requests
- `.ai-os/lanes/default/specs/*.spec.md` — local contracts
- `.ai-os/lanes/default/design-pack/parity-map.md` — reverse-spec parity
- `.ai-os/lanes/default/evals/*.md` — promoted failure-mode samples
- `.ai-os/managed-files.tsv` — managed paths registry

## Behavior routing by task type

Confirmation stops are real approval boundaries, not ritual pauses. Stop only when the user has not authorized the current phase, scope / acceptance remains unclear, the task is high-risk, or continuing would expand beyond the requested boundary. If the user already asked the agent to fix / implement / verify / ship and the scope is clear, record the basis and continue within that scope.

| User intent | Skill response |
|---|---|
| Just discuss / brainstorm / explain | Do **not** read or write lane artifacts; answer directly and ask whether to enter delivery only if intent is ambiguous |
| New project / new module / vague requirement | Produce / update root `.ai-os/MISSION.md` + lane `MISSION.md` summary; list pending confirmations; **stop and wait for user confirmation** |
| Lock key design | Produce lane `DESIGN.md` with key trade-offs and shared-layer side-effect list; **stop and wait** |
| Decompose tasks | Update lane `tasks.yaml` with owner / `approval_required` / `handoff_to` / `context_refs` / `expected_return` / evidence requirements |
| Frontend UI work | Determine `ui_source` first (`design-led` / `component-first` / `existing-style` / `hybrid`); if Product Design is available, use it as an optional design-evidence provider; otherwise use Figma / screenshot / URL / existing-style / component-first fallback; record component library, fidelity level, custom-only gaps, and `design_input` in `DESIGN.md` |
| URL reverse-spec intake | Capture URL, screenshots, DOM/CSS, interactions, Network/API observations, backend behavior confidence, and unknowns into `design-pack/parity-map.md` + `specs/*.spec.md`; **do not invent backend internals** |
| Implement | Only act inside confirmed scope; cross-file or unclear boundary → read-only analysis first |
| Requirement change | Write lane `baseline-log/CR-*.md` with impact analysis **before** code edits; then update `MISSION.md` / `DESIGN.md` / `specs/`; before closing the CR, add a `## Preventability review` section (`Preventable: yes / no / partial` + root cause + maps-to + suggested guard) |
| Fix a bug | State root cause + reproduction path + impact scope + planned files; if the user already asked to fix and scope is clear, continue within that scope; otherwise **stop and wait for "go"** |
| Verify | Cover normal / abnormal / permission denial / empty / timeout / regression; produce project-native static-check evidence |
| Long-lived maintenance | At each delivery closeout, review drift evidence; open a maintenance CR or scoped refactor task only when evidence exists, and record `maintenance_review` rather than scheduling periodic big-bang refactors |
| Boundary evolution | Keep the AI-OS kernel stable; allow doctor / CLI / adapter / artifact-category changes only after CR evidence, tests, and boundary review; reject runtime expansion by default |
| Ship | Output dual checklist: implemented / out-of-scope / verification result / rollback condition / AI-done vs human-execute; before closing a lane, aggregate every CR's `## Preventability review` into a `BL-*-retrospective*.md` |
| Session resume | Read lane `STATE.md` first → expand to lane `MISSION.md` → latest baseline-log → root `.ai-os/MISSION.md` |
| Agent handoff return | Before marking a task done / verified / shipped, record `evidence_produced`; put implementation drift in `deviation_log` or a new CR |
| Long-horizon / background agent work | For delegated, cloud, external PR agent, or parallel execution, record `agent_run_review` with `execution_surface`, `run_refs`, `write_scope`, `progress_checkpoints`, `return_packet`, and `human_review_status`; do not close until evidence and human review are present |
| Hallucination guard | Use `fact_state_review` to separate `observed`, `confirmed`, `inferred`, and `unknown`; unresolved `inferred` / `unknown` cannot close as done / verified / shipped |
| Stable failure mode | First occurrence registers in lane `verification-matrix.yaml`; same root cause hit ≥3 times must promote to `evals/<name>.md` with frontmatter `trigger_source: promoted-from-verification-matrix` and `first_baseline_id` |

## Frontend UI source routing

For frontend screens, separate the UI target from the implementation path:

- With design input, treat the design as the target and use existing project components first. Configure, theme, or wrap components before custom UI; customize only for component gaps, brand visuals, special layouts, or fidelity-critical areas.
- Without design input, use component-first delivery. Existing project component library wins. If no library exists, infer stack and surface before choosing; ask only when stack / surface cannot be observed.
- If Product Design is available in the current IDE, it can provide brief, ideation, prototype, image-to-code, design QA, and share evidence. Record those outputs under `design_input.evidence_refs` or task `evidence_produced`; do not make Product Design a hard dependency.
- If Product Design is not available, record the fallback source under `design_input`: Figma, screenshot, URL reverse-spec, existing code / style, manual brief, or component-first.
- Default China-friendly choices: Vue PC → Element Plus; React PC → Ant Design; Vue H5 → Vant; React H5 → Ant Design Mobile; uni-app → uView / uni-ui; Taro or WeChat-heavy → NutUI / TDesign; cross-stack enterprise consistency → TDesign; modern enterprise admin → Arco Design.
- Fidelity levels: `strict` when the user demands design restoration, `practical` for business / admin UI with design input, `component-native` when no design exists.
- Component-first does not skip logic: fields, API contracts, permissions, validation, loading / empty / error states, timeout paths, responsive behavior, and project-native verification still need acceptance coverage.
- Product Design QA, prototype links, or share URLs are design evidence, not native verification. Project build / lint / typecheck / tests or equivalent checks still close delivery.

## Long-lived AI project maintenance

Long-lived AI projects should not default to calendar-based "refactor everything" cycles. Use continuous small maintenance: record `drift_signals`, evidence-backed `refactor_trigger`, `contract_impact`, `native_checks`, and `debt_disposition` in `tasks.yaml` `maintenance_review`. Stable findings flow back to `.ai-os/memory.md`, `verification-matrix.yaml`, or `evals/`; if there is no observed drift evidence, do not open a maintenance CR just to refresh code.

## Boundary evolution

Treat AI-OS boundaries as a reviewable policy, not a permanent freeze. Classify every proposed capability as `Kernel`, `Controlled Extension`, `Adapter`, or `Forbidden` before implementation.

- Kernel stays stable: Activation Gate, 12 artifact categories, `AGENTS.md`, lane recovery, `memory.md`, project-native verification, local doctor, no telemetry, and no default external service.
- Controlled Extension requires CR evidence, acceptance criteria, native checks, docs tests, and a verification guard or eval when the failure mode is repeatable.
- Adapter work must stay optional, thin, removable, and non-blocking for agents that do not have that external tool.
- Forbidden surfaces stay out of core: built-in agent runner, refactor scheduler, model router, auto-release platform, long-running service, telemetry collection, and IDE-only hard dependency.

Entry criteria: a new doctor warning must be deterministic and structural; a new CLI subcommand must cover a high-frequency core operation that install / doctor cannot cover; a new adapter must not be a hard dependency; a new artifact category requires proof that the existing 12 categories cannot represent multiple real cases.

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
11. Auto-advancing without user authorization, outside requested scope, or past a high-risk approval stop point
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
- Framework feedback loop (CR Preventability review + lane retrospective): `docs/maintainers.md` (git grep 复盘)
- URL reverse-spec intake protocol: `docs/reverse-spec-url-intake.md`
- Constitution spec for cross-tool integration: `docs/constitution-spec.md`
- MCP resources URI scheme: `docs/interop/mcp-resources.md`
- Coexistence with other tools: `docs/interop/standards-map.md`
- AI-OS itself: <https://github.com/royeedai/ai-os>

## Skill invocation contract

When activated by an agent, this skill should:

1. Confirm presence of `AGENTS.md` + `.ai-os/` (if missing, decline gracefully)
2. Run the Activation Gate before reading L1; ordinary conversation stops here with no lane artifact access, while explicit delivery requests proceed to L1
3. If activated, read L1 (`STATE.md` / `lane.toml` / `framework.toml`)
4. Decide whether the delivery task is align / design / decompose / implement / change / debug / verify / ship / resume / high-risk
5. Apply the matching behavior rule from the routing table above and stop at confirmation points

The skill does **not** introduce new commands, slash invocations, IDE plugins, agent runners, MCP servers, agent routers, worktree managers, or runtime dependencies. It is purely an open-format wrapper around the AI-OS constitution. Future surface expansion is not impossible, but it must pass Boundary Evolution Policy review first.
