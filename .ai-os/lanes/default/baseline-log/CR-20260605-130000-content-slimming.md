# CR-20260605-130000-content-slimming

- **Type**: change-request (minor cleanup / dedup, GPT-5.5 / Opus 4.8 era)
- **Status**: confirmed
- **Date**: 2026-06-05
- **Summary**: Slim AI-OS content for the GPT-5.5 / Opus 4.8 era. Stronger frontier models shift the bottleneck from code generation to goal / design / evidence / recoverable memory, so model-facing scaffolding that taught the model to fill fields is now redundant. Consolidate 8 edge interop docs into one `standards-map.md`, dedup `constitution-spec.md` (v2.0) to reference `artifacts.md` instead of repeating schemas, remove low-value doctor soft checks (W073 / W075 / W079a / W079b), and delete legacy stubs. Released as v9.8.0. No new CLI command, no telemetry, 3 primary operations / 12 artifact categories / zero runtime deps / AGENTS.md ≤150 lines preserved.
- **Affects**: `PROJECT_PURPOSE.md`, `README.md`, `bin/ai-os-doctor.js`, `docs/constitution-spec.md`, `docs/cli.md`, `docs/artifacts.md`, `docs/maintainers.md`, `docs/problem-ledger.md`, `docs/migrate-to-v9.md`, `docs/interop/*`, `CHANGELOG.md`, `CHANGELOG-archive.md`, `test/*`, `VERSION`, `package.json`, `package-lock.json`, `.ai-os/framework.toml`, `.ai-os/lanes/default/*`
- **Confirmed by**: project owner, 2026-06-05

## Trigger

Project owner asked whether, as GPT-5.5 and Opus 4.8 keep improving, some AI-OS content can be reduced / optimized / deleted. The judgment standard was set explicitly to "current and future reasonableness only, do not protect history." Audit found the real slimming space is not the governance contracts (orthogonal to model strength) but the v9.x accumulation of redundant restatement: the same capability restated across AGENTS.md / artifacts.md / constitution-spec.md / cli.md / templates / CHANGELOG / problem-ledger / interop, locked into mutual duplication by `test/docs.test.js`.

## Current behavior

- `docs/interop/` carried 13 files; 8 of them (a2a, bmad, openspec, kiro, eu-ai-act, memory-tool, developer-memory, long-horizon-agents) were field-mapping docs for external tools that change every two months — high maintenance, repeated boundary disclaimers.
- `docs/constitution-spec.md` had grown to 239 lines / 19 sections, re-stating field-level schema already authoritative in `docs/artifacts.md` (violates PL-008 single-source-of-truth).
- `bin/ai-os-doctor.js` regrew to 928 lines; W073 (CR delta headings), W075 (URL evidence confidence), W079a/W079b (Preventability review info prompts) were NLP-style "does the markdown contain this heading" heuristics that strong models + artifact templates already cover.
- Legacy stubs `docs/migrate-v7-to-v8.md` (5-line redirect) and `docs/problems.md` (prose duplicate of problem-ledger) lingered two majors later.
- `CHANGELOG.md` carried full v8.0–v9.4 entries inline.

## Proposed delta

- Update `PROJECT_PURPOSE.md` §2 and `README.md` first screen to the GPT-5.5 / Opus 4.8 era: "stronger model → core requirements more valid, per-step scaffolding more redundant"; keep deterministic doctor W070-W078 narrative.
- Consolidate the 8 edge interop docs into `docs/interop/standards-map.md` (wire-format map + single-truth-source rules + no-runtime boundary). Keep core interop: spec-kit-coexistence / claude-code / cursor / mcp-resources.
- Dedup `docs/constitution-spec.md` to **v2.0**: extended schema sections reference `docs/artifacts.md` instead of repeating field lists.
- Remove doctor soft checks W073 / W075 / W079a / W079b and their helpers; keep W070-W072 / W074 / W076 / W077 / W078.
- Delete legacy stubs `docs/migrate-v7-to-v8.md` and `docs/problems.md`; fold entry points into `migrate-to-v9.md` and `problem-ledger.md`.
- Archive v8.0–v9.4 CHANGELOG into `CHANGELOG-archive.md`; keep v9.5+ in active CHANGELOG.
- Bump version to 9.8.0 across VERSION / package.json / package-lock.json / framework.toml.
- Rewrite the affected `test/docs.test.js` / `test/doctor.test.js` sections (remove ~87 duplicate cross-file assertions; add standards-map + v9.8-slimming coverage).

## Affected artifacts

- Narrative: `PROJECT_PURPOSE.md`, `README.md`
- Runtime code: `bin/ai-os-doctor.js` (removed `checkChangeRequestDelta` / `checkUrlEvidenceConfidence` / `checkPreventabilityReview` / `checkLaneRetrospective` + helpers; `SEMANTIC_WARNING_CODES` trimmed to W070-W072/W074/W076/W077/W078)
- Spec / docs: `docs/constitution-spec.md` (v2.0), `docs/cli.md`, `docs/artifacts.md`, `docs/maintainers.md`, `docs/problem-ledger.md`, `docs/migrate-to-v9.md`
- Interop: new `docs/interop/standards-map.md`; deleted a2a / bmad / openspec / kiro / eu-ai-act / memory-tool / developer-memory / long-horizon-agents; updated cross-links in cursor.md / claude-code.md
- Deleted legacy: `docs/migrate-v7-to-v8.md`, `docs/problems.md`
- Tests: `test/docs.test.js`, `test/doctor.test.js`, `test/install.test.js`, `test/shared.test.js`
- Metadata: `VERSION`, `package.json`, `package-lock.json`, `.ai-os/framework.toml`, `CHANGELOG.md`, `CHANGELOG-archive.md`, `.cursor/rules/project-lead.mdc`
- Self-hosted lane dogfood: this CR; `DESIGN.md` / `tasks.yaml` long-horizon-agents.md refs repointed to standards-map.md

## Acceptance delta

- AC-001: `docs/interop/` reduced to spec-kit-coexistence / claude-code / cursor / mcp-resources / standards-map; standards-map carries A2A / Memory tool / BMAD / OpenSpec / Kiro / EU AI Act / developer-memory / long-horizon mappings with no-runtime boundary intact.
- AC-002: `docs/constitution-spec.md` is v2.0 and references `docs/artifacts.md` as the single schema truth source; ≤160 lines.
- AC-003: doctor no longer emits W073 / W075 / W079a / W079b; W070-W072 / W074 / W076 / W077 / W078 retained; `--strict` semantics unchanged for the survivors.
- AC-004: legacy `docs/migrate-v7-to-v8.md` and `docs/problems.md` removed; entry points fold into migrate-to-v9 / problem-ledger.
- AC-005: product surface unchanged — 3 primary operations, 4 bin scripts, 12 artifact categories, zero runtime deps, AGENTS.md ≤150 lines.
- AC-006: version 9.8.0 synced; CHANGELOG 9.8.0 entry complete; v8.0–v9.4 archived.
- AC-007: `npm test`, `npm run lint`, and `node bin/ai-os-doctor.js .` all pass (0 error / 0 warning).

## Close/archive condition

- `npm test` passes.
- `npm run lint` passes (zero warnings).
- `node bin/ai-os-doctor.js .` returns 0 error / 0 warning.
- VERSION / package.json / `.ai-os/framework.toml` bumped to 9.8.0.
- Changes committed to `main` and tagged `v9.8.0`.

## Rollback path

- Re-add the deleted interop docs from git history and restore the removed doctor checks if any downstream consumer depended on W073 / W075 / W079 exit behavior or on the per-tool interop file paths.
- `standards-map.md` keeps every mapping, so consumers should repoint links rather than revert; constitution-spec v2.0 is dedup-only (no contract change), so reverting it is cosmetic.

## Preventability review

- **Preventable**: no
- **If yes, root cause**: n/a — this is intentional framework iteration driven by an improving model landscape, not rework caused by a missed question / unlocked design / unconfirmed scope in a prior AI-OS delivery. The redundancy being removed was a reasonable cost of additive v9.1–v9.7 minors; consolidating it now is a deliberate convergence decision, not a defect.
- **Maps to**: PL-008 (cross-tool truth-source confusion / single source of truth) — the interop consolidation and spec→artifacts dedup directly tighten the single-truth-source principle. Also relieves PL-009 (progressive disclosure) by shrinking the surface agents must load.
- **Suggested guard**: keep `artifacts.md` as the only field-level schema source and have `constitution-spec.md` reference it; keep new open-standard mappings in the single `standards-map.md` rather than spawning per-tool files; prefer artifact templates + AGENTS.md behavior rules over new doctor soft checks for "did the author write section X" style nudges. Note: v9.8 retired W073 / W075 / W079a / W079b — earlier CRs that cite W079 as a guard (CR-20260525-141500) remain accurate as of their date; this CR records the supersession.
