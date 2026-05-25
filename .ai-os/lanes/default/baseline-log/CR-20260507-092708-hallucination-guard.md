# CR-20260507-092708-hallucination-guard

- **Date**: 2026-05-07
- **Type**: change + brownfield
- **Status**: confirmed
- **Summary**: Add an AI development hallucination guard that makes fact state explicit in task artifacts and checks it with doctor.
- **Confirmed by**: project owner delegated decision and execution to AI-OS maintainer agent on 2026-05-07

## Current behavior

- AI-OS already blocks many hallucination paths through goal confirmation, design lock, reverse-spec confidence, task handoff context, and evidence-based completion.
- URL reverse-spec artifacts distinguish `observed` / `inferred` / `unknown`, but general AI coding tasks do not yet have a first-class task-level place to record whether implementation inputs were observed, confirmed, inferred, or unknown.
- `doctor --strict` can detect missing handoff/evidence loops via W076, but it does not detect tasks that close while still carrying unresolved assumptions or unknowns.

## Proposed delta

- Add `fact_state_review` to lane task templates and self-hosted tasks:
  - `observed`: facts actually inspected in code, tests, logs, runtime, page, interface, or other evidence.
  - `confirmed`: facts confirmed by the user, current lane artifacts, specs, or baseline records.
  - `inferred`: agent assumptions that must remain assumptions until confirmed.
  - `unknown`: missing knowledge that must become a pending confirmation, non-goal, blocker, or CR.
- Add doctor W077:
  - warn when `in_progress` / `done` / `verified` / `shipped` tasks lack observed or confirmed fact state.
  - warn when `done` / `verified` / `shipped` tasks retain unresolved `inferred` or `unknown` entries.
- Document Hallucination Guard in `AGENTS.md`, `docs/artifacts.md`, `docs/constitution-spec.md`, `docs/cli.md`, interop docs, the skill wrapper, and the changelog.
- Bump the reference implementation to 9.5.0.

## Affected artifacts

- `AGENTS.md`
- `.ai-os/memory.md`
- `.ai-os/lanes/default/lane.toml`
- `.ai-os/lanes/default/MISSION.md`
- `.ai-os/lanes/default/DESIGN.md`
- `.ai-os/lanes/default/tasks.yaml`
- `.ai-os/lanes/default/verification-matrix.yaml`
- `.ai-os/lanes/default/specs/hallucination-guard.spec.md`
- `bin/ai-os-doctor.js`
- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/baseline-log/BL-template.md`
- `framework/skills/ai-os-delivery/SKILL.md`
- `docs/artifacts.md`
- `docs/cli.md`
- `docs/constitution-spec.md`
- `docs/interop/cursor.md`
- `docs/interop/eu-ai-act.md`
- `README.md`
- `CHANGELOG.md`
- `VERSION`
- `package.json`
- `package-lock.json`
- `test/doctor.test.js`
- `test/docs.test.js`
- `test/install.test.js`
- `test/shared.test.js`

## Acceptance delta

- AC-001: task template and self-hosted tasks include `fact_state_review` with `observed` / `confirmed` / `inferred` / `unknown`.
- AC-002: doctor emits W077 for missing observed/confirmed fact state and closed tasks with unresolved `inferred` / `unknown`; repaired tasks clear W077.
- AC-003: docs/spec/skill explain Hallucination Guard as artifact governance, not a copied external prompt or a new runtime layer.
- AC-004: self-hosted lane maps to this CR and passes `doctor --json --strict`.
- AC-005: version/changelog/tests align to 9.5.0 and product surface remains install/doctor/upgrade only.

## Close/archive condition

- `npm test` passes.
- `npm run lint` passes.
- `node bin/create-ai-os.js doctor . --json --strict` returns ok.
- Changes are committed and pushed to `main`.

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: v9.2 URL reverse-spec intake 已经定义 `observed` / `inferred` / `unknown` 信心等级，但只用于 URL 证据；通用任务事实没有同款词表。AI-OS 第一次在 v9.2 引入这套词表时，本可同步推广到 `tasks.yaml` 形成 `fact_state_review`，而不是等到 v9.5 才补。
- **Maps to**: PL-011（agent 把推断 / 未观察的信息当事实进入实现或交付）
- **Suggested guard**: 已在 `docs/problem-ledger.md` PL-011 中沉淀；后续引入新词表（如证据等级、风险等级）时必须评估是否应跨工件统一。
