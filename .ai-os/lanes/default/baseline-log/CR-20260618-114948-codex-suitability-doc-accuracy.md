# CR-20260618-114948 Codex Suitability And Documentation Accuracy

## Summary

Audit AI-OS for Codex-hostile or inaccurate project descriptions, then land a patch release that keeps the framework portable while making foreground execution, confirmation stops, doctor enforcement, and release metadata truthful.

## Current behavior

- `AGENTS.md` and the official `ai-os-delivery` skill can be read as requiring a second "go" even when the user already asked Codex to analyze and fix a scoped problem.
- README and Claude Code interop describe `doctor --strict` too much like a cross-IDE hook with identical blocking semantics; Codex can run the same local command, but hard blocking depends on pre-commit / CI or a host that supports hooks.
- The public skill wrapper still says "AI-OS v9 delivery constitution" even though the framework line is v10.x.
- `package-lock.json` root package metadata is still `10.2.0` while `VERSION` and `package.json` are `10.3.0`.
- The self-hosted lane still describes the closed v10.2 Product Design bridge, and `specs/example.spec.md` still uses the removed `upgrade` path as the example flow.

## Proposed delta

- Clarify Activation Gate and confirmation-stop semantics: explicit analyze / fix / implement / verify / ship requests enter delivery governance directly; only unclear, high-risk, unauthorized, or out-of-scope work blocks.
- Reword deterministic doctor guidance as a portable guard command: hooks / pre-commit / CI can block; Codex foreground work uses the same local command as closure evidence or through pre-commit / CI.
- De-version the skill wrapper's current-framework wording.
- Bump patch metadata to v10.3.1, including package-lock parity and tests.
- Sync the dogfood lane to this CR and replace the stale upgrade example with the current install / local doctor model.

## Affected artifacts

- Constitution and docs: `AGENTS.md`, `README.md`, `docs/artifacts.md`, `docs/constitution-spec.md`, `docs/interop/claude-code.md`, `docs/problem-ledger.md`, `docs/maintainers.md`
- Skill wrapper: `framework/skills/ai-os-delivery/SKILL.md`
- Tests and metadata: `test/docs.test.js`, `VERSION`, `package.json`, `package-lock.json`, `CHANGELOG.md`
- Self-hosted lane: `.ai-os/lanes/default/MISSION.md`, `.ai-os/lanes/default/DESIGN.md`, `.ai-os/lanes/default/tasks.yaml`, `.ai-os/lanes/default/verification-matrix.yaml`, `.ai-os/lanes/default/specs/example.spec.md`, `.ai-os/memory.md`

## Acceptance delta

- AC-001: Explicit Codex-style delivery requests no longer trigger ritual re-confirmation in AGENTS, skill, artifacts docs, and spec.
- AC-002: Doctor enforcement wording distinguishes host hooks from Codex local / pre-commit / CI guards.
- AC-003: Version metadata and package-lock root metadata all say 10.3.1, and tests enforce parity.
- AC-004: Skill wrapper no longer calls the current framework "AI-OS v9".
- AC-005: Self-hosted lane and stale example spec describe the current v10.3.1 patch, not v10.2 or the removed upgrade path.
- AC-006: `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict` pass.

## Close/archive condition

Close when the changed docs / skill / lane artifacts match the acceptance delta and native verification passes.

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: Earlier Activation Gate and restate-confirm work correctly prevented vague requests from proceeding, but it did not explicitly distinguish Codex-style foreground execution where the user has already asked the agent to fix the project. The v10.3 deterministic doctor narrative also over-generalized Claude / Cursor hook blocking semantics to shell agents. Package-lock parity was missing from the release checklist and docs tests.
- **Maps to**: PL-014, PL-022, PL-023, PG-001
- **Suggested guard**: Add explicit delivery-request and confirmation-stop wording to AGENTS / skill / spec; add package-lock parity tests; keep doctor enforcement wording tied to the actual integration surface.
