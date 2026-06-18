# CR-20260618-132214 Boundary Evolution Policy

Add an explicit Boundary Evolution Policy so AI-OS can evolve without becoming an IDE, runtime, scheduler, model router, or automation platform.

- **Type**: change
- **Status**: verified
- **Mode**: change + brownfield
- **Risk**: medium
- **Confirmed At**: 2026-06-18

## Current behavior

- AI-OS docs repeatedly preserve the boundary with phrases like no new CLI, runtime, doctor warning, adapter, agent runner, or artifact category.
- That boundary has prevented surface creep through v10.4, but it can be misread as a permanent freeze rather than a governed extension policy.
- Maintainer guidance has a guard escalation order, but public docs do not classify kernel, controlled extension, adapter, and forbidden surfaces.
- Users evaluating long-term AI-OS development need a rule for when boundaries can evolve, not only a list of things that were not added in the latest release.

## Proposed delta

- Add a Boundary Evolution Policy: AI-OS has a stable kernel, controlled extension path, optional adapter layer, and forbidden product surfaces.
- Keep the kernel strict: Activation Gate, 12 artifact categories, `AGENTS.md`, lane recovery, `memory.md`, project-native verification, local doctor, no telemetry, and no default external service.
- Allow controlled extension only with evidence: PL / CR, native tests, docs assertions, and eval / verification guard when applicable.
- Define extension gates for doctor warnings, CLI subcommands, interop adapters, and artifact categories.
- Preserve permanent forbiddens: built-in agent runner, refactor scheduler, model router, auto-release platform, long-running background service, telemetry collection, and IDE-exclusive hard dependency.

## Affected artifacts

- `AGENTS.md`
- `README.md`
- `docs/artifacts.md`
- `docs/constitution-spec.md`
- `docs/maintainers.md`
- `docs/interop/standards-map.md`
- `framework/skills/ai-os-delivery/SKILL.md`
- `test/docs.test.js`
- version metadata and self-hosted lane artifacts

## Acceptance delta

- AC-001: Public docs and skill describe the four boundary layers: kernel, controlled extension, adapter, forbidden.
- AC-002: Doctor warning, CLI subcommand, interop adapter, and artifact-category changes each have documented entry criteria.
- AC-003: Docs no longer imply "never add doctor / CLI / artifact category"; instead they say "do not add by default; require boundary review and evidence".
- AC-004: Core product boundary remains unchanged for this release: no new CLI command, runtime, doctor warning, adapter implementation, agent runner, or artifact category.
- AC-005: Version metadata is consistent at 10.5.0 and constitution spec is bumped to v2.6.
- AC-006: Native verification passes: `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict`.

## Close/archive condition

- Boundary Evolution Policy is documented in public docs, maintainer docs, skill wrapper, interop docs, and docs tests.
- Self-hosted lane points to this CR and records verification evidence.
- Native verification evidence is recorded in `tasks.yaml`, `STATE.md`, and final delivery notes.

## Verification evidence

- `npm test` — passed, 1284 passed / 0 failed
- `npm run lint` — passed
- `node bin/create-ai-os.js doctor . --json --strict` — passed, `ok=true`, `issues=[]`, `semantic_warnings=[]`

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: Earlier boundary language protected AI-OS from scope creep but was expressed release-by-release as "no new X", not as a reusable decision framework. That made future evolution depend on maintainer judgment instead of a stable boundary-review contract.
- **Maps to**: n/a
- **Suggested guard**: Add Boundary Evolution Policy docs and tests. Do not add a new problem-ledger item until a real external failure shows boundary strictness caused delivery harm.
- **Maintenance disposition**: Update `memory.md` with a stable boundary decision and keep this as docs/test governance only.
