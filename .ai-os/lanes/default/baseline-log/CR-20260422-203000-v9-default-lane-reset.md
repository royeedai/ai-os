# CR-20260422-203000-v9-default-lane-reset

- **Type**: change-request (major layout reset)
- **Status**: confirmed
- **Date**: 2026-04-22
- **Summary**: Reset AI-OS to a single canonical layout: shared root + `.ai-os/lanes/default/`. Eliminate the v8 split between root-only implementation and lane-default schema narrative.
- **Affects**: `.ai-os/`, `framework/.agents/templates/*`, `bin/*.js`, `AGENTS.md`, `README.md`, `docs/*`, `examples/*`, `test/*`, `VERSION`, `package.json`
- **Confirmed by**: project owner, 2026-04-22

## Trigger

User requested a full project reset and confirmed executing the v9 default-lane plan after reviewing the quality tradeoff against v8.

## Impact analysis

- Install output changes from root-only `.ai-os/*` to shared-root + `.ai-os/lanes/default/*`
- `doctor` now treats root-only v8 layout as legacy and hybrid root+lane layouts as drift
- `upgrade` becomes the single migration entrypoint for v7 legacy, v8 root-only, and v8 hybrid layouts
- Problem ledger and maintainers docs are rewritten to current-truth mode

## New vs old baseline

| Item | v8 | v9 |
|---|---|---|
| Default layout | root-only install, lane-default docs | shared-root + default lane everywhere |
| Root mission semantics | current delivery baseline | shared host-project context |
| Current delivery baseline | `.ai-os/MISSION.md` | `.ai-os/lanes/default/MISSION.md` |
| Session recovery | `.ai-os/STATE.md` | `.ai-os/lanes/default/STATE.md` |

## Rollback path

- Revert to the v8.0.0 baseline if upgrade compatibility or docs consistency regresses
- Keep the legacy project template only as migration aid until migration confidence is sufficient
