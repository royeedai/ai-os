# CR-20260502-204346-url-reverse-spec-intake

- **Type**: change-request (minor reverse-spec enhancement)
- **Status**: confirmed
- **Date**: 2026-05-02
- **Summary**: Add an AI-OS artifact-first intake protocol for reverse-spec work from an accessible website URL. The protocol captures screenshots, DOM/CSS evidence, interactions, Network/API observations, and evidence-graded backend behavior requirements before implementation starts.
- **Affects**: `framework/.agents/templates/lane/*`, `framework/skills/ai-os-delivery/SKILL.md`, `docs/*`, `evals/*`, `test/docs.test.js`, `VERSION`, `package.json`, `CHANGELOG.md`
- **Confirmed by**: project owner, 2026-05-02

## Trigger

User requested implementation of the URL Reverse-Spec Intake plan. The selected entry shape is AI-OS artifact flow, not a new CLI command or slash command. The selected interface depth is backend behavior specification based on observable browser evidence.

## Impact analysis

- AI-OS remains a delivery constitution and artifact system; it does not become a website cloning runtime, IDE, crawler, sandbox, or code generator.
- The existing reverse-spec parity surface is expanded so agents can intake a target URL before generating requirements and implementation tasks.
- Templates must make screenshot, DOM/CSS, interaction, Network/API, and backend behavior evidence auditable.
- Backend behavior inferred from a website must be confidence-graded as `observed`, `inferred`, or `unknown`; inferred behavior cannot be treated as confirmed acceptance criteria.
- Tests must preserve the current three-command CLI surface and assert the new artifact protocol is documented.

## New vs old baseline

| Item | Previous baseline | New baseline |
|---|---|---|
| URL reverse-spec intake | Reverse-spec parity was available but generic | URL-specific intake protocol with visual, interaction, API, and backend behavior evidence |
| Backend behavior | No explicit confidence model | `observed` / `inferred` / `unknown` confidence required |
| CLI surface | 3 commands | unchanged |
| Runtime dependencies | zero runtime dependencies | unchanged |

## Rollback path

- Revert the v9.2.0 docs/template/test/version changes if the protocol bloats the default operating surface or weakens the three-command CLI invariant.
- Keep the existing v9.1.1 reverse-spec parity map as the fallback generic artifact.
