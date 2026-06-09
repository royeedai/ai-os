# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)：

- **patch** (x.y.z)：bugfix、文案修正、文档补全、测试与治理收口
- **minor** (x.y.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

This file tracks recent v9 releases (v9.5+). For v8.0.0 – v9.4.x and v5.x – v7.x history, see [CHANGELOG-archive.md](CHANGELOG-archive.md).

---

## 10.1.1 (2026-06-09) — Consistency optimization

**Patch, backward compatible; docs / wording / dogfood-artifact only**. No new feature, CLI command, flag, doctor warning code, or artifact category. 2 primary product operations, 12 artifact categories, zero runtime dependencies, `AGENTS.md` ≤150 lines, canonical layout schema `9`, and constitution-spec v2.2 are all unchanged.

### Fixed

- **`docs/interop/mcp-resources.md`** listed `install` / `doctor` / `upgrade` as three primary product operations, contradicting line 127 of the same file and reality — `upgrade` was dropped in v10.0.0. Corrected to two primary product operations (`install` / `doctor`).
- **`CHANGELOG.md` v10.1.0 entry** stated `docs/constitution-spec.md` was bumped to **v2.1**; the release actually bumped it to **v2.2** (v2.1 was the v9.9 version). Both anchors corrected to v2.2 to match the spec header, `docs/maintainers.md`, and the tests.
- **Missed v10.0.0 de-versioning**: `bin/ai-os-doctor.js` user-facing output ("AI-OS v9 project looks healthy", W010 "v9 target"), the `bin/ai-os-doctor.js` / `bin/shared.js` file-header comments, and `README.md` ("no slash commands in v9") still read "AI-OS v9". De-versioned (layout schema stays `9`). Schema-generation references (`docs/cli.md` "v9 canonical layout", `docs/artifacts.md` "v9 起", doctor W011 "pre-v9 file") and the `# AI-OS v9 managed` `.gitignore` / `.gitattributes` section headers are intentionally preserved.

### Changed

- **Dogfood lane re-synced**: the self-hosted `.ai-os/lanes/default/` working artifacts (`DESIGN.md`, `tasks.yaml`, `verification-matrix.yaml`) were frozen at the v9.9 design-aware-UI delivery while `MISSION.md` had advanced to v10.1.0. They now describe the current v10.1.1 consistency delivery and point at `CR-20260609-032059-consistency-optimization`. The v9.9 / v10.0.0 / v10.1.0 history stays captured in their own baseline-log CRs.

### Tests

- `test/docs.test.js` adds a regression guard asserting `docs/interop/mcp-resources.md` states two primary product operations and no longer lists `upgrade`; version assertions bumped to 10.1.1 across `test/docs.test.js`, `test/doctor.test.js`, `test/shared.test.js`, `test/install.test.js`. `npm test` + `npm run lint` + `node bin/ai-os-doctor.js .` self-check required before release.

### Migration

No action needed — wording / docs / dogfood-artifact only; CLI behavior, doctor warning codes, and canonical layout schema (`9`) unchanged. Already-installed projects keep passing `doctor`.

---

## 10.1.0 (2026-06-08) — Restate-and-confirm gate + architecture guardrail

**Minor, backward compatible**. After evaluating an external "turn ai-os into an AI coding platform" proposal through `PROJECT_PURPOSE.md` §5 and the no-expansion red lines, AI-OS absorbs only two model-orthogonal, zero-runtime reinforcements and rejects the runtime / codegen / sandbox parts. No new CLI command, no new doctor code, no new artifact category; 2 primary product operations / 12 artifact categories / zero runtime deps / `AGENTS.md` ≤150 lines preserved.

### Added

- **Restate-and-confirm alignment gate** (`AGENTS.md` §1): before locking design or starting broad implementation, the agent must restate its understanding of goal / core main flow / state transitions / key exception paths in structured form and wait for user confirmation or correction. Need-layer restatement lands in lane `MISSION.md` §2 (new "core main flow" + "key exception / boundary branch" fields); design-layer restatement lands in lane `DESIGN.md` §9 (restate-and-confirm gate). Demonstrated in `examples/greenfield-guided-product.md`.
- **`docs/artifacts.md`** gains a "restate-and-confirm / double-loop gate" section explaining why it stays a behavior gate (no doctor warning code), complementary to model self-verification.

### Changed

- **Architecture guardrail home named**: `.ai-os/memory.md` §2 工程约束 is now explicitly the "architecture guardrail / coding-contract registry" (response-wrapper contract, must-reuse abstractions, forbidden anti-patterns, dependency policy) with a `type` field, cross-checked during verification (`AGENTS.md` verification rule + `DESIGN.md` §4 contract-first note). This is the home for what external tools call an "architecture style guide" / `.ai-os-rules` — AI-OS does not create a second truth-source file. Mapped in `docs/interop/standards-map.md`.
- `docs/constitution-spec.md` bumped to **v2.2** (restate-and-confirm gate strengthens the existing goal-confirmation / design-lock gates; contract compatible).
- `docs/problem-ledger.md` anchors the gate under existing PL-001 / PL-016 / PL-017 — no new PL id.

### Tests

- `test/docs.test.js` adds a v10.1 section (restate gate across AGENTS / templates / artifacts / spec / standards-map / ledger / example; asserts no `.ai-os-rules`; examples stay at 8); version assertions bumped to 10.1.0 and spec to v2.2. `npm test` + `npm run lint` + `node bin/ai-os-doctor.js .` self-check required before release.

### Migration

No action needed — behavior-rule and artifact-template enrichment only; canonical layout schema unchanged (`9`). Already-installed projects keep passing `doctor`; reinstall to pick up the enriched templates.

---

## 10.0.0 (2026-06-08) — Drop upgrade + legacy migration

**Major, breaking**. AI-OS converges its operating surface to **2 primary product operations** (install + doctor). The `upgrade` command and all v7/v8 legacy-layout migration are removed — fresh install is now the single supported entry. The canonical layout (`schema_version = "9"`), 12 artifact categories, zero runtime dependencies, and `AGENTS.md` ≤150 lines are unchanged.

### Removed

- **`upgrade` command** (`bin/ai-os-upgrade.js`) and all v7/v8 legacy migration. `bin/shared.js` loses `detectLayout`, `normalizeLaneToml`, `readKeyValueToml`, `inferQualityTier`, `inferRiskTier`, `ROOT_ONLY_LEGACY_*`, and `LAYOUT_MODE_ROOT_ONLY` / `HYBRID` / `UNKNOWN`.
- **doctor** drops `checkLayout` and the `E060` / `E061` / `W060` layout-drift codes; per-artifact checks now run unconditionally on any `.ai-os/` project.
- `docs/migrate-to-v9.md` and `test/upgrade.test.js`.

### Changed

- `doctor` reads `layout_mode` from `framework.toml` (canonical) instead of filesystem detection; `W002` / `E002` now point to `create-ai-os install . --force` instead of `upgrade`.
- README / `docs/cli.md` / `docs/getting-started.md` / `PROJECT_PURPOSE.md` / `docs/maintainers.md` updated to 2 operations; user-facing "AI-OS v9" wording de-versioned to avoid v9/v10 ambiguity (layout schema stays `9`).
- ide-pointers (`CLAUDE.md` / `GEMINI.md`) now route through the Activation Gate instead of reading lane artifacts every session.

### Fixed

- `docs/interop/mcp-resources.md` dead link to removed `eu-ai-act.md` → `standards-map.md`.
- `BL-template.md` no longer claims `doctor --strict` checks CR delta (W073 was removed in v9.8).
- `docs/problem-ledger.md` PL ordering (PL-012 → PL-015), constitution-spec version anchors (→ v2.0), and PL-007 / PL-019 anchors.
- evals re-grounded on the current `tasks.yaml` schema (`change_scope` / `impact_tags` / `evidence_produced` instead of removed `derived_checks` / `parity_checks` / `step_validation`).

### Tests

- `bin/` is now 3 scripts; version assertions bumped to 10.0.0; `test/docs.test.js` asserts `migrate-to-v9.md` removed and the 2-operation wording. `npm test` + `npm run lint` + `node bin/ai-os-doctor.js .` self-check required before release.

### Migration

Projects already on the v9 canonical layout need no action — `doctor` still passes (schema unchanged). Pre-v9 (v7/v8) projects: there is no in-place `upgrade` anymore; run a fresh `create-ai-os install .` (it preserves user-authored lane content) and reconcile any legacy root-level artifacts manually. For v7/v8 history see [CHANGELOG-archive.md](CHANGELOG-archive.md).

---

## 9.9.0 (2026-06-06) — Design-Aware Component-First UI

**Minor, backward compatible; governance / docs / template only**. v9.9 adds a frontend UI source routing contract without expanding the CLI, runtime, doctor warning range, or page template surface.

### Added

- Design-Aware Component-First UI: `design-led`, `component-first`, `existing-style`, and `hybrid` routing for frontend UI work.
- `docs/artifacts.md` now defines UI source fields for `DESIGN.md`: `ui_source`, `surface`, `frontend_stack`, `component_library`, `selection_reason`, `fidelity_level`, and `custom_required`.
- Lane `DESIGN.md` template now includes a UI Source Routing section.
- Lane `verification-matrix.yaml` template includes UI failure modes for design-vs-component mismatch, no-design hand-rolled UI, second-library drift, and skipped business states.
- `docs/problem-ledger.md` registers PL-020 for frontend UI source and component-library implementation confusion.

### Changed

- `AGENTS.md`, `README.md`, `docs/constitution-spec.md` v2.1, and the official `ai-os-delivery` skill wrapper now state: design files define target effect; component libraries remain the preferred implementation path; no-design admin / PC / mobile business UI defaults to existing or stack-appropriate component libraries.
- Default component selection is conservative and China-friendly: existing dependency first; then user selection; then stack / surface defaults such as Element Plus, Ant Design, Vant, Ant Design Mobile, uView / uni-ui, NutUI, TDesign, or Arco Design.
- Version metadata updated to 9.9.0.

### Tests

- `test/docs.test.js` adds consistency checks for UI source routing, component-library default rules, template fields, verification matrix guards, PL-020, and unchanged product surface.
- Existing version assertions updated to 9.9.0.

### Migration

None. Existing projects do not need to change. The new contract only guides future frontend UI tasks and installed lane templates.

---

## 9.8.0 (2026-06-05) — Content slimming (GPT-5.5 / Opus 4.8 era)

**Minor, backward compatible for artifact schema; doctor soft-check removals are behavior changes**. v9.8 keeps the 3 primary product operations, 12 artifact categories, zero runtime dependencies, and `AGENTS.md` ≤150 lines. It removes redundant scaffolding that frontier models and artifact templates already cover, without deleting core governance contracts.

### Added

- `docs/interop/standards-map.md` — consolidated wire-format map for A2A, Memory tool, BMAD, OpenSpec, Kiro, EU AI Act audit framing, developer-global memory, and long-horizon agent surfaces.

### Changed

- `PROJECT_PURPOSE.md` §2 and `README.md` first screen updated for GPT-5.5 / Opus 4.8 era: stronger models shift the bottleneck from code generation to goal/design/evidence/memory; deterministic `doctor` W070-W078 retained.
- `docs/constitution-spec.md` bumped to **v2.0** (dedup only): extended schema sections now reference `docs/artifacts.md` instead of repeating field lists.
- `docs/migrate-to-v9.md` adds pointer to `CHANGELOG-archive.md` for v7/v8 history.
- `docs/problem-ledger.md` absorbs the former `docs/problems.md` summary paragraph.
- `CHANGELOG.md` now retains v9.5+ only; v8.0.0–v9.4.x moved to `CHANGELOG-archive.md`.

### Removed

- **Doctor soft checks** W073 (CR delta headings), W075 (URL evidence confidence), W079a/W079b (Preventability review info prompts) — carried by templates + `AGENTS.md` + maintainer `git grep` instead.
- **Interop docs** merged into `standards-map.md`: `a2a.md`, `bmad.md`, `openspec.md`, `kiro.md`, `eu-ai-act.md`, `memory-tool.md`, `developer-memory.md`, `long-horizon-agents.md`.
- **Legacy stubs**: `docs/migrate-v7-to-v8.md`, `docs/problems.md`.
- ~250 lines from `bin/ai-os-doctor.js` (helper functions for removed checks).

### Tests

- `test/doctor.test.js` replaces W073/W075/W079 sections with a single "soft checks removed" assertion.
- `test/docs.test.js` updated for standards-map, spec v2.0, version 9.8.0, removed file list.
- `npm test` + `npm run lint` + `node bin/ai-os-doctor.js .` self-check required before release.

### Migration

None required for existing projects. `doctor --strict` no longer warns on incomplete CR delta sections, missing URL confidence cells, or missing Preventability review — fill those via artifact templates as before. If you linked to removed interop paths, use `docs/interop/standards-map.md`.

---

## 9.7.3 (2026-05-29) — CLI defect fixes

**Patch, backward compatible** with one deliberate behavior change: `upgrade` no longer deletes user `.cursor/` config (a safety fix). Repairs eight confirmed CLI defects surfaced during the v9.7.2 review. Three primary product operations, 12 artifact categories, zero runtime dependencies, and `AGENTS.md` ≤150 lines are unchanged.

### Fixed

- **H1 upgrade data-loss**: `upgrade` no longer deletes the entire `.cursor/rules` + `.cursor/skills` directories. AI-OS never generates files under `.cursor/`, so the old blanket cleanup only destroyed user-authored Cursor config. `cleanupIdeAutoGenerated` is removed.
- **H2 W010 threshold**: the `AGENTS.md` line-count warning now fires above the documented `<=150` target (previously only `>200`, so 151–200-line files were never flagged).
- **H3 approval_required schema**: the lane `tasks.yaml` template and the self-hosted lane now use boolean `approval_required` (previously a string that `hasHighRiskTask` could never match); high-risk tasks set `true`.
- **H4 hidden alias**: the undocumented `--force-framework` alias is removed; use `--force`.
- **H5 W074 high-risk detection**: `hasHighRiskLane` now also recognizes `quality_tier = "high-risk"`, not only `risk_tier = "high"`.
- **H6 doctor wording**: W070 uses `当前基线 ID`, W077 uses `fact_state_review` (not "hallucination guard"), and the non-AI-OS hint suggests `create-ai-os install`.
- **H7 .gitignore backfill**: `appendUniqueLines` now backfills missing entries when the AI-OS section header already exists (previously skipped entirely), so a half-written section is repaired.
- **H8 cli.md**: documents `upgrade` options and adds a structural / metadata code appendix (E001/E002/E010/W001/W010/W011/W040/W041/E060/E061/I020).

### Tests

- `test/upgrade.test.js` now asserts `upgrade` preserves user `.cursor/` content. Version assertions bumped to 9.7.3. `npm test`: 1027 passed, 0 failed; doctor 0 error / 0 warning; eslint clean.

### Migration

None required. Projects that previously relied on `upgrade` clearing `.cursor/` (it never should have) now keep their Cursor config; remove unwanted files manually.

---

## 9.7.2 (2026-05-29) — Consistency cleanup & numbering repair

**Patch, docs/artifact-only, fully backward compatible**. No CLI behavior, schema, or `AGENTS.md` rule change. v9.7.2 is a repository-wide consistency pass: it repairs the problem-ledger numbering (PL-010 / PL-011 collisions and four orphaned eval references), aligns documentation paths and the doctor-range narration with the actual v9 layout and W078 scope, removes a stale legacy template directory, and re-grounds evals / examples / the SKILL wrapper on the current artifact schema. The three primary product operations, 12 artifact categories, zero runtime dependencies, and `AGENTS.md` ≤150 lines are all unchanged.

### Fixed

- **Problem-ledger numbering**: `PL-010` / `PL-011` were each registered twice (v9.4/v9.5 handoff & hallucination vs. v9.5.1/v9.6 activation gate & long-horizon). The second pair is renumbered to **PL-014** (non-delivery misactivation) and **PL-015** (long-horizon agent recovery). References in `CHANGELOG.md`, `test/docs.test.js`, and the self-hosted `baseline-log/` are synced.
- **Orphaned eval references**: four evals referenced `PL-033`~`PL-036`, which only exist in the v7 archive. They are now formally registered as **PL-016**~**PL-019** (implicit cross-layer contract / weak-type hole / single-point-pass vs. end-to-end journey / cross-module defect escalation), and the evals are re-grounded on current v9 artifacts instead of removed legacy template fields.
- **Wrong ledger anchors**: `PL-008` (had cited AGENTS.md 绝对禁止 §13) and `PL-010` (§12) now point at the correct sections.
- **Doctor range narration**: `README.md`, `docs/interop/claude-code.md`, and `docs/interop/bmad.md` updated from `W070-W077` to `W070-W078` (W078 shipped in v9.6).
- **Canonical paths**: `docs/migrate-to-v9.md` adds `design-pack/parity-map.md`; `docs/interop/openspec.md` / `spec-kit-coexistence.md` / `kiro.md` prefix AI-OS lane paths with `.ai-os/lanes/default/`; the `README.md` operations table separator is fixed to three columns.
- **interop contradictions**: `developer-memory.md` "covers first three layers" vs. "Layer 1 not owned" contradiction resolved (now "Layers 2-3"), and its wrong `PROJECT_PURPOSE.md §5` citation corrected to §2; `cursor.md` hooks path (`.cursor/hooks.json`), skill-install command, broken `.cursor/rules/` link and command paths unified; `memory-tool.md` gains a four-layer mapping section.
- **examples**: corrected `AGENTS.md §3/§4` mis-citations to the real behavior-rules / high-risk sections, fixed DESIGN/MISSION section numbers, replaced legacy task fields (`measurable_outcome` / `out_of_scope_guard` / `failure_modes` plural keys) with the current `tasks.yaml` / `verification-matrix.yaml` schema, and added the root `.ai-os/MISSION.md` step in greenfield.

### Changed

- `framework/skills/ai-os-delivery/SKILL.md` behavior routing now covers the v9.7 CR `## Preventability review` and lane retrospective aggregation.
- `docs/change-evaluation-template.md` drops the v7 `workflow` / `skill` landing options in favor of `工件 schema` and the `agentskills.io` SKILL wrapper.
- `docs/maintainers.md` splits the minor matrix (Activation Gate → v9.5.1, long-horizon → v9.6), adds v9.7.1, and drops a machine-absolute path.
- VERSION / `package.json` / `package-lock.json` / `.ai-os/framework.toml` bumped to 9.7.2.

### Removed

- `framework/.agents/templates/project/` legacy directory (unused by the installer and tests; contained obsolete slash commands and a dead `derived-rules.md` reference).

### Tests

- `test/docs.test.js` PL assertions updated to PL-014 / PL-015; a SKILL Preventability-review assertion added. `npm test`: 1027 passed, 0 failed. doctor 0 error / 0 warning, eslint clean.

### Migration

None. Existing projects need no action; this release only repairs AI-OS's own docs / artifacts and registration numbering.

---

## 9.7.1 (2026-05-29) — Developer-level memory layer docs

**Patch, docs-only, fully backward compatible**. No framework / `AGENTS.md` / CLI / schema change. v9.7.1 clarifies where per-developer / per-machine memory belongs: each agent shell's home-directory global rules (Cursor user rules, `~/.claude/CLAUDE.md`, Codex global instructions), which AI-OS deliberately does **not** own. AI-OS keeps owning only the project-level layers (`.ai-os/`). The three primary product operations, 12 artifact categories, zero runtime dependencies, and `AGENTS.md` ≤150-line constraints are unchanged.

### Added

- `docs/interop/developer-memory.md` (new) documents the **developer-global memory layer** as the fourth memory layer. Includes the four-layer "no overlap" table, what the layer is for (personal coding preferences, AI behavior preferences, cross-project lessons), the "per-developer ≈ per-machine (home dir)" reality, cross-machine sync via dotfiles (not an AI-OS identity layer), per-shell habitats, and anti-patterns.
- `docs/problem-ledger.md` registers `PL-013` (developer-level vs project-level memory mixed together, polluting the shared project layer or losing personal preferences when switching machines / contributors).

### Changed

- `docs/interop/memory-tool.md` expands its memory-layer table from three to four layers and links to the new doc.
- `docs/interop/cursor.md` adds a "Global vs project rules" split and a global `~/.cursor/rules/*.mdc` coexistence row.
- `docs/interop/claude-code.md` adds a "Global `~/.claude/CLAUDE.md` vs project `CLAUDE.md` stub" section.
- `README.md` Memory tool section points to the new developer-memory doc.
- VERSION / `package.json` / `package-lock.json` / `.ai-os/framework.toml` bumped to 9.7.1.

### Migration

None required. This is documentation-only; existing installs are unaffected.

### Anti-patterns rejected

- `~/.ai-os/operator.md`, an `install --with-operator` profile, and doctor checks over home-directory rules — all of which would create a second source of truth or break the three-primary-operation surface.

---

## 9.7.0 (2026-05-25) — Framework feedback loop

**Minor, fully backward compatible**. v9.7 introduces a Framework Feedback Loop so AI-OS itself can iterate from "modifications proposed after the first AI-OS delivery that were preventable in the first session", without telemetry or upload. CR baseline records gain a local `## Preventability review` section; lanes closing out aggregate findings into a retrospective baseline-log; `doctor` adds info-level `W079a` / `W079b` guidance that `--strict` does NOT upgrade. The three primary product operations, 12 artifact categories, zero runtime dependencies, and `AGENTS.md` ≤150-line constraints are preserved. This release is stacked on top of v9.6.0 (Long-Horizon Agent Reliability) and v9.5.1 (Activation Gate); both remain intact.

### Added

- `framework/.agents/templates/lane/baseline-log/BL-template.md` documents a `## Preventability review` section (`Preventable` / `If yes, root cause` / `Maps to` / `Suggested guard`) and the `BL-YYYYMMDD-HHMMSS-retrospective*.md` aggregation convention.
- `bin/ai-os-doctor.js` adds `checkPreventabilityReview` (W079a) and `checkLaneRetrospective` (W079b); both emit at **info** level only, are excluded from `SEMANTIC_WARNING_CODES`, and are not upgraded by `--strict`.
- `docs/maintainers.md` adds a "Framework feedback 复盘" section documenting the dogfooding `git grep` flow, the optional third-party `framework-feedback` issue label, the merge criteria (same root cause ≥2 times → new PL-* / PG-*), and the guard-landing priority (AGENTS.md > artifact template > doctor > docs).
- `docs/problem-ledger.md` registers `PL-012` for "AI-OS first delivery failed to prevent a modification that was preventable".
- `docs/constitution-spec.md` bumps to **v1.9** with a Framework feedback loop section (non-breaking optional section).
- `docs/artifacts.md` adds a Framework Feedback Loop section without introducing a 13th artifact category.
- `.github/ISSUE_TEMPLATE/preventable-modification.md` is a new optional intake for users to paste their CR's `## Preventability review` section under the `framework-feedback` label.
- `.ai-os/lanes/default/baseline-log/BL-20260525-140000-retrospective-v9-recap.md` aggregates the 6 historical CRs (v8-constitution-refactor through hallucination-guard) as the dogfooding starting data set; every historical CR is backfilled with `## Preventability review`.
- `.ai-os/lanes/default/baseline-log/CR-20260525-141500-framework-feedback-loop.md` records this v9.7 change with its own `## Preventability review`.

### Changed

- `AGENTS.md` behavior rules for "需求变化" and "交付收口" each gain one line referencing the Preventability review section and lane-closure retrospective aggregation. AGENTS.md stays within the ≤150-line ceiling.
- `docs/cli.md` declares an "Info-level framework feedback guidance (v9.7+)" subsection for W079a / W079b and keeps `semantic_warnings` scoped to W070-W078 (W079 info codes are excluded).
- VERSION / `package.json` / `package-lock.json` / `.ai-os/framework.toml` bumped to 9.7.0.

### Tests

- `test/docs.test.js` adds two new sections: "framework feedback loop is documented and templated (v9.7)" and "AI-OS self-hosted lane carries Preventability review on every historical CR".
- `test/doctor.test.js` adds three new sections covering W079a fires + clears, W079b fires + clears, and clean install reports no W079a / W079b.
- `test/install.test.js` adds "BL-template ships framework feedback loop schema (v9.7)".
- All previously hardcoded 9.6.0 version strings (in `test/shared.test.js`, `test/install.test.js`, `test/doctor.test.js`, `test/docs.test.js`) bumped to 9.7.0.

### Migration

None required. The new section is opt-in:

- Existing CRs without `## Preventability review` continue to pass `doctor --strict`; W079a is info-level only.
- Closing a lane without a retrospective baseline-log continues to pass `doctor --strict`; W079b is info-level only.
- Existing AI-OS installs (v9.0 – v9.6) keep working; `upgrade` will refresh the lane templates so future CRs come with the new schema.

### Anti-patterns rejected

- No telemetry, no `--report` / `--collect` CLI flag, no MCP server, no IDE-specific behavior.
- W079 stays info-level on purpose; if maintainer practice eventually shows the section is widely skipped, the next minor can revisit upgrading W079a to a warning, but only after `PL-012` accumulates evidence in the problem ledger.

---

## 9.6.0 (2026-05-21) — Long-Horizon Agent Reliability

**Minor, fully backward compatible**. v9.6 keeps the canonical layout, three primary product operations, zero runtime dependencies, and existing handoff fields intact. It adds a governance loop for long-running, background, external PR, and parallel agent work without turning AI-OS into an execution layer.

### Added

- Optional `tasks.yaml` `agent_run_review` vocabulary for `execution_surface`, `run_refs`, `write_scope`, `progress_checkpoints`, `return_packet`, and `human_review_status`.
- Doctor semantic warning W078 for long-horizon agent work missing run refs, write scope, expected return, produced evidence, return packet, human review, or closing with unresolved risks.
- `docs/interop/long-horizon-agents.md` covering Codex, Cursor Background Agents, GitHub Copilot cloud agent, Jules, and Claude Code subagents / hooks as tool-neutral execution surfaces.
- `examples/background-agent-handoff.md` showing delegation, return review, and closure rules.
- Problem-ledger entry PL-015 for background / cloud / PR agent work returning without reviewable evidence.

### Changed

- Constitution spec bumped to v1.8 with the Long-Horizon Agent Reliability Loop.
- Artifact docs, README, official skill wrapper, templates, verification matrix, CLI docs, interop docs, and tests now describe W078 and `agent_run_review`.
- Version metadata and tests updated to `9.6.0`.

### Tests

- Doctor tests cover missing run refs / write scope, closed tasks without return packet or human review, unresolved returned risks, local foreground bypass, and the clean background path.
- Documentation tests assert v1.8, `agent_run_review` coverage, interop/example presence, W078 docs, and unchanged product surface.

### Migration

None. Existing projects can adopt `agent_run_review` only for tasks that explicitly use delegated, background, cloud, external, or parallel execution. W078 is a warning by default and only blocks when `doctor --strict` is used.

---

## 9.5.1 (2026-05-21) — Activation Gate

**Patch, fully backward compatible**. v9.5.1 keeps the canonical layout, three primary product operations, zero runtime dependencies, and existing artifact schema intact. It clarifies that AI-OS artifact governance starts only for delivery-affecting work, not for ordinary conversation.

### Added

- Activation Gate in `AGENTS.md`: delivery-affecting work triggers AI-OS governance; ordinary discussion, brainstorming, explanation, temporary commands, and non-repo tasks do not.
- Official `ai-os-delivery` skill wrapper now runs the Activation Gate before reading L1 lane artifacts.
- `examples/non-delivery-discussion.md` showing discussion-only flow, the one clarification question, and explicit transition into delivery.
- Problem-ledger entry PL-014 for non-delivery conversation misactivating AI-OS governance.

### Changed

- README, artifact docs, and constitution spec v1.7 now state that ordinary conversation must not read or write `.ai-os/lanes/*`.
- Progressive disclosure wording now starts after the Activation Gate passes.
- Version metadata and tests updated to `9.5.1`.

### Tests

- Documentation tests assert Activation Gate coverage across `AGENTS.md`, README, artifacts docs, spec, skill wrapper, problem ledger, example, changelog, and version metadata.

### Migration

None. Existing projects can adopt the clarified behavior by updating `AGENTS.md` and the official skill wrapper; no CLI flags, config fields, install profiles, or schema changes are required.

---

## 9.5.2 (2026-05-09) — Open-standards interop expansion

**Patch, documentation only**. v9.5.2 expands AI-OS's open-standards bindings (Memory Tool, Cursor 2.0+ subagents, BMAD coexistence), repositions `doctor` as the cross-IDE deterministic-guard equivalent of Claude Code hooks, and opens an optional eval frontmatter field for trajectory-aware evaluation harnesses. No behavior, framework template, doctor warning, CLI command, or constitution-spec change.

### Added

- `docs/interop/memory-tool.md` — wire-format mapping between `.ai-os/memory.md` / lane `STATE.md` / lane `MISSION.md` and Anthropic Memory tool `/memories` directory + Memory MCP knowledge-graph projection. Preserves "AI-OS markdown is truth, Memory tool is working notes" boundary.
- `docs/interop/bmad.md` — coexistence guide with BMAD-METHOD persona pipeline. Mode A (BMAD leads 0→1, AI-OS governs delivery) + Mode B (AI-OS self-contained); persona artifacts mapped onto AI-OS lane fields without duplicating requirements.
- README "Why deterministic doctor checks instead of prompts" section + `docs/interop/claude-code.md` "Doctor as cross-IDE deterministic guard" section. Anchors `doctor --strict` (W070-W077) as the cross-IDE equivalent of Claude Code deterministic command hooks, surfaces the 2026 hooks-vs-prompts consensus.
- `docs/interop/cursor.md` "Cursor 2.0+ subagents / cloud agents and AI-OS handoff" section. Maps Cursor 2.0/2.4 subagent / cloud-agent / worktree concepts onto v9.4 `handoff_to / context_refs / expected_return / evidence_produced / deviation_log` fields, with W076 catching PR-without-evidence cases.
- `evals/README.md` optional `trajectory_signature` frontmatter field for trajectory-aware evaluation harnesses (ATBench / Claw-Eval / AgentRx / HINTBench). Field is **optional**, free-form, and does not break the existing 26 evals.

### Changed

- README "MCP integration" / "A2A integration" / "Memory tool integration" now form a three-section open-standards block; interop index lists BMAD and Memory Tool alongside the existing standards.
- `docs/problem-ledger.md` PL-008 (cross-tool truth-source confusion) now anchors `docs/interop/memory-tool.md` and `docs/interop/bmad.md`; PL-009 (repeated full-load context waste) now anchors `docs/interop/memory-tool.md` for just-in-time retrieval guidance.
- VERSION / `package.json` / `package-lock.json` bumped to 9.5.2.

### Tests

- Documentation tests assert the four new / expanded surfaces stay within the 200-line interop budget, declare their key terminology, link back to existing docs (mcp-resources, a2a, eu-ai-act), and preserve the no-runtime / 3-primary-operations boundary.
- All previously hardcoded 9.5.1 version strings (in `test/shared.test.js`, `test/install.test.js`, `test/doctor.test.js`, `test/docs.test.js`) bumped to 9.5.2.

### Migration

None. Documentation-only patch; no behavior change. `trajectory_signature` is opt-in; existing evals remain valid.

---

## 9.5.1 (2026-05-09) — A2A Interop Doc

**Patch, documentation only**. v9.5.1 adds an open-standard interop document mapping AI-OS v9.4 task handoff fields and v9.5 `fact_state_review` onto A2A Protocol v1.0 objects, so any A2A-compatible runtime can dispatch lane tasks without re-inventing field names. No behavior, framework template, doctor, CLI, or constitution-spec change.

### Added

- `docs/interop/a2a.md` — wire-format mapping between AI-OS lane `tasks.yaml` handoff fields (`handoff_to` / `context_refs` / `expected_return` / `evidence_required` / `evidence_produced` / `deviation_log` / `fact_state_review`) and A2A v1.0 objects (`Task`, `Message`, `AgentCard`, `Artifact`, `Part`, `TaskState`); reuses the `aios://` URI scheme defined in `docs/interop/mcp-resources.md`.
- README "A2A integration" section pointing to the new interop doc.
- `docs/problem-ledger.md` PL-008 anchor list now includes `docs/interop/a2a.md`.

### Changed

- VERSION and `package.json` bumped to 9.5.1.
- `docs/interop/` index in README now lists A2A alongside MCP, spec-kit, Claude Code, Cursor, Kiro, OpenSpec, and EU AI Act.

### Tests

- Documentation tests assert the A2A interop doc exists, stays within the 200-line interop budget, declares the handoff field mapping, references A2A core terms, reuses the `aios://` URI scheme, and preserves the no-server boundary.

### Migration

None. Documentation-only addition; no behavior change.

---

## 9.5.0 (2026-05-07) — Hallucination Guard

**Minor, fully backward compatible**. v9.5 keeps the canonical layout, three primary product operations, and zero runtime dependencies intact. It turns AI coding hallucination control into a task-level fact-state review instead of adding a second prompt/rules source.

### Added

- `tasks.yaml` `fact_state_review` vocabulary for `observed`, `confirmed`, `inferred`, and `unknown`.
- `verification-matrix.yaml` hallucination guard failure mode for unresolved assumptions or unknowns entering implementation / closure as facts.
- Doctor semantic warning W077 for tasks in execution / completion that lack observed/confirmed fact state, or closed tasks that still contain unresolved `inferred` / `unknown` entries.
- Constitution spec v1.6 section for Hallucination Guard.

### Changed

- `AGENTS.md` now explicitly forbids presenting unobserved, unconfirmed, or unverified information as fact.
- Artifact docs and the official `ai-os-delivery` skill wrapper now route hallucination control through `fact_state_review`, not through tool-specific prompt copies.
- Doctor semantic warning range is now W070-W077.

### Tests

- Doctor tests cover missing `fact_state_review`, unresolved inferred assumptions, unresolved unknowns, and the repaired clean path.
- Documentation tests assert the fact-state vocabulary, W077 docs, template coverage, and version string.

### Migration

None. Existing projects can adopt `fact_state_review` gradually. W077 is a warning by default and only blocks when `doctor --strict` is used.
