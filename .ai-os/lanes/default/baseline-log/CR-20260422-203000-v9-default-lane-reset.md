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

## Current behavior

- v8 implementation and docs split between root-only `.ai-os/*` and lane-default schema language.

## Proposed delta

- Make shared root + `.ai-os/lanes/default/` the only canonical layout.

## Affected artifacts

- `.ai-os/`, framework templates, CLI install/doctor/upgrade logic, docs, examples, tests, version metadata.

## Acceptance delta

- Install, doctor, upgrade, schema docs, README, AGENTS, tests, and examples all point to the same default-lane layout.

## Close/archive condition

- Close when `doctor` passes after install and after supported legacy layout upgrades.

## Rollback path

- Revert to the v8.0.0 baseline if upgrade compatibility or docs consistency regresses
- Keep the legacy project template only as migration aid until migration confidence is sufficient

## Preventability review

- **Preventable**: yes
- **If yes, root cause**: v8 第一次发布时 README / schema / install / doctor / tests 对默认布局表达不一致（root-only install vs lane-default schema 叙事并存），AI-OS 当时没有"任何 canonical layout 变更必须同步多个文件"的硬约束；本可在 v8 第一次 session 就让 AI 同时改 AGENTS.md / schema / CLI / upgrade / tests 一并 commit。
- **Maps to**: PT-001（坑点：文档真相与安装真相分叉）
- **Suggested guard**: 已在 `.ai-os/memory.md` 登记为 PT-001，并在 `docs/maintainers.md` §维护规则 §1 中写明"改动 canonical layout 时必须同步修改 AGENTS / README / schema / CLI / test"。
