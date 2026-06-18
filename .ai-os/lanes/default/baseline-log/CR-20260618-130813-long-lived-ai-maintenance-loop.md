# CR-20260618-130813 Long-lived AI Maintenance Loop

Add a Long-lived AI Project Maintenance Loop so AI-OS-managed pure-AI projects avoid drift through evidence-backed maintenance checks, trigger-based refactoring, and failure-mode feedback instead of periodic big-bang rewrites.

- **Type**: change
- **Status**: verified
- **Mode**: change + brownfield
- **Risk**: medium
- **Confirmed At**: 2026-06-18

## Current behavior

- AI-OS already has `memory.md` architecture guardrails, `fact_state_review`, `agent_run_review`, `verification-matrix.yaml`, and `Preventability review`, but no explicit rule for long-lived pure-AI project maintenance drift.
- Users can infer that "AI projects need a refactor every so often", but AI-OS does not currently say that refactoring must be evidence-triggered rather than calendar-triggered.
- `tasks.yaml` has no maintenance-review example for drift signals, refactor trigger, contract impact, native checks, or debt disposition.
- `verification-matrix.yaml` has no dedicated long-lived maintenance review impact rule or failure modes.

## Proposed delta

- Add a Long-lived AI Project Maintenance Loop: each delivery closeout reviews drift signals, opens a maintenance CR only when evidence exists, and routes refactoring through small scoped tasks with contract and native-check evidence.
- Keep `memory.md` as the long-term truth source for architecture guardrails, coding contracts, technical debt, and stable decisions; do not add a 13th artifact category.
- Add optional `maintenance_review` vocabulary to task templates and self-hosted tasks.
- Extend baseline-log `Preventability review` guidance with maintenance/refactor disposition.
- Add docs, examples, evals, tests, version metadata, and self-hosted lane updates for v10.4.0.

## Affected artifacts

- `AGENTS.md`
- `README.md`
- `docs/artifacts.md`
- `docs/constitution-spec.md`
- `docs/problem-ledger.md`
- `docs/maintainers.md`
- `docs/cli.md`
- `docs/getting-started.md`
- `docs/interop/*.md`
- `framework/skills/ai-os-delivery/SKILL.md`
- `framework/.agents/templates/shared-root/memory.md`
- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/baseline-log/BL-template.md`
- `examples/long-lived-maintenance-loop.md`
- `evals/periodic-refactor-without-drift-evidence.md`
- `evals/drift-signal-not-fed-back.md`
- `test/docs.test.js`
- `test/install.test.js`
- `test/doctor.test.js`
- `test/shared.test.js`
- version metadata and self-hosted lane artifacts

## Acceptance delta

- AC-001: Public docs and skill explain that long-lived AI projects use continuous small maintenance and evidence-triggered refactoring, not periodic big-bang refactors.
- AC-002: Existing artifact categories carry the loop: `memory.md`, `tasks.yaml` optional `maintenance_review`, `verification-matrix.yaml`, and baseline-log `Preventability review`.
- AC-003: Problem ledger, examples, evals, and docs tests cover periodic refactor without evidence and drift signals not feeding back into memory / verification guards.
- AC-004: Product boundary remains unchanged: no new CLI command, runtime, doctor warning code, IDE adapter, agent runner, or artifact category.
- AC-005: v10.4.0 version metadata is consistent across `VERSION`, `package.json`, `package-lock.json`, docs pins, and install tests.
- AC-006: Native verification passes: `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict`.

## Close/archive condition

- All affected public docs, templates, examples, evals, and tests are updated.
- Self-hosted lane points to this CR and no longer describes v10.3.1 as the current task.
- Native verification evidence is recorded in `tasks.yaml`, `STATE.md`, and final delivery notes.

## Verification evidence

- `npm test` — passed, 1246 passed / 0 failed
- `npm run lint` — passed
- `node bin/create-ai-os.js doctor . --json --strict` — passed, `ok=true`, `issues=[]`, `semantic_warnings=[]`

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: AI-OS already had feedback, hallucination, handoff, long-horizon, and architecture guardrail primitives, but no explicit synthesis for long-lived pure-AI project maintenance. That allowed the common "AI project needs periodic full refactor" folk rule to remain outside the framework instead of being redirected into evidence-triggered maintenance CRs.
- **Maps to**: PL-024
- **Suggested guard**: Add a behavior rule, task template vocabulary, verification-matrix guards, problem-ledger entry, example, evals, and docs tests. Keep it as artifact governance rather than doctor code unless future Preventability reviews show repeated non-compliance.
