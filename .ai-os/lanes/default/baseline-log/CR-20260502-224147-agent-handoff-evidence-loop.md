# CR-20260502-224147-agent-handoff-evidence-loop

- **Type**: change-request (minor governance enhancement)
- **Status**: confirmed
- **Date**: 2026-05-02
- **Summary**: Add a tool-neutral Agent Handoff + Evidence Loop so IDE-based agents can receive scoped tasks and return auditable evidence without AI-OS becoming an IDE or runner.
- **Affects**: `bin/ai-os-doctor.js`, `framework/.agents/templates/lane/*`, `docs/*`, `.ai-os/lanes/default/*`, `test/*`, `VERSION`, `package.json`, `CHANGELOG.md`
- **Confirmed by**: project owner, 2026-05-02

## Trigger

User confirmed that AI-OS should learn from Traycer, Task Master, Agent OS, BMAD, Spec Kit, OpenSpec, and PRP-style context packets, with the strongest next theme being Agent Handoff + Evidence Loop.

## Current behavior

- AI-OS v9.3 records goals, design, tasks, evidence requirements, CR delta fields, URL evidence confidence, MCP annotations, and eval taxonomy.
- `tasks.yaml` already has `owner`, `approval_required`, `depends_on`, `acceptance_refs`, `evidence_required`, and `change_scope`.
- There is no explicit handoff packet tying a task to the receiving agent / IDE surface, context refs, expected return, produced evidence, and implementation deviation log.
- `doctor --strict` can catch missing owners, AC coverage drift, incomplete CRs, high-risk artifact gaps, and URL evidence confidence, but not a task that is marked done without produced evidence.
- AI-OS interop docs explain how Cursor / Claude Code / Kiro / Spec Kit coexist, but the core task artifact does not yet encode how those execution surfaces return proof.

## Proposed delta

- Keep AI-OS as a repo-first delivery constitution and artifact protocol; do not add an IDE plugin, runner, slash command, MCP server, browser capture adapter, or project-management runtime.
- Add task handoff fields to lane `tasks.yaml`: `handoff_to`, `context_refs`, `expected_return`, `evidence_produced`, and `deviation_log`.
- Add `agent-handoff-evidence-loop` impact guards to `verification-matrix.yaml`.
- Add doctor warning **W076**: tasks should carry `acceptance_refs` and `evidence_required`; tasks with `handoff_to` should also carry `context_refs` and `expected_return`; done / verified / shipped tasks should carry non-placeholder `evidence_produced`.
- Document the loop in artifacts, constitution spec, CLI docs, and the official skill wrapper.
- Update tests so template drift and W076 behavior are mechanically guarded.

## Affected artifacts

- Runtime code: `bin/ai-os-doctor.js`
- Framework templates: `tasks.yaml`, `verification-matrix.yaml`, `baseline-log/BL-template.md`
- Docs: `docs/artifacts.md`, `docs/cli.md`, `docs/constitution-spec.md`, `docs/interop/cursor.md`, `docs/interop/eu-ai-act.md`, `CHANGELOG.md`
- Skill wrapper: `framework/skills/ai-os-delivery/SKILL.md`
- Self-hosted lane: `MISSION.md`, `DESIGN.md`, `tasks.yaml`, `verification-matrix.yaml`, `specs/agent-handoff-evidence-loop.spec.md`, `STATE.md`, `lane.toml`, `memory.md`
- Tests: `test/docs.test.js`, `test/doctor.test.js`, version assertions
- Metadata: `VERSION`, `package.json`

## Acceptance delta

- Clean install remains warning-free under `doctor --strict`.
- `doctor --json` reports W076 when a task is missing acceptance / evidence fields, has handoff without context / expected return, or is marked done without produced evidence.
- Lane templates include agent handoff and evidence loop fields without adding any runtime surface.
- Documentation describes Agent Handoff + Evidence Loop as a task/evidence contract used inside IDEs and agents, not as an AI-OS orchestrator.
- Version and changelog align to v9.4.0.

## Close/archive condition

- Close when `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict` pass.
- Archive or revise if W076 creates false positives on clean installs, or if any documentation implies AI-OS owns task execution rather than handoff governance.

## Rollback path

- Revert W076 and the task handoff template fields while preserving v9.3 CR / evidence / MCP / eval contracts.
- Keep the concept documented as a future optional extension if task-level checks prove too noisy.
