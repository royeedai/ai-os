# Changelog Archive (v5.x – v10.x)

This file preserves AI-OS history for v5.x – v10.x releases. The active [CHANGELOG.md](CHANGELOG.md) retains v11.0.0+ only.

---

## 10.5.1 (2026-06-19) — Codex Field Feedback Closeout

**Patch, backward compatible**. Turns local Codex AI-OS field feedback into auditable governance coverage for release truthfulness, verification environment classification, task ledger conflict review, and install / baseline artifact interpretation. This release changed docs, templates, evals, tests, version metadata, and then-current source-repo maintenance records only. It added no CLI command, runtime, doctor warning code, MCP server, IDE adapter implementation, agent runner, auto-release behavior, artifact category, or schema layout change.

### Added

- `docs/codex-aios-field-feedback.md` records the field evidence summary, accepted optimizations, rejected / deferred surfaces, and future deterministic doctor candidates.
- `docs/problem-ledger.md` adds PL-025 for Codex field feedback drift: release truth drift, verification environment misclassification, task ledger conflict drift, and baseline artifact misread.
- New eval samples: `release-truth-drift.md`, `verification-environment-misclassified.md`, `task-ledger-conflict-drift.md`, and `install-baseline-artifact-misread.md`.
- Lane verification template adds `field-feedback-closeout` and FM-FIELD-001 through FM-FIELD-004.

### Changed

- README, `docs/artifacts.md`, `docs/maintainers.md`, the official skill wrapper, and lane task template now explain how to carry field feedback inside existing evidence fields and verification guards.
- Install pins, interop pins, package metadata, local framework metadata, and tests now point at v10.5.1.

### Tests

- `npm test`
- `npm run lint`
- At the time, then-current source-repo doctor validation was still used as a repository-local validation check; Unreleased removes that source-repo practice.

### Migration

No action needed. Existing installs keep the same artifact layout and doctor behavior. Reinstall or update your pinned GitHub tag to pick up the v10.5.1 field-feedback closeout guidance.

## 10.5.0 (2026-06-18) — Boundary Evolution Policy

**Minor, backward compatible**. Adds an explicit Boundary Evolution Policy so AI-OS can evolve without becoming an IDE, runtime, scheduler, model router, or automation platform. This release changed docs, skill guidance, tests, version metadata, and then-current source-repo maintenance records only. It adds no CLI command, runtime, doctor warning code, MCP server, IDE adapter implementation, agent runner, artifact category, or schema layout change.

### Added

- **Boundary Evolution Policy**: AI-OS boundaries are classified as Kernel, Controlled Extension, Adapter, or Forbidden.
- **Controlled extension gates**: future doctor warnings, CLI subcommands, adapter surfaces, and artifact-category changes require CR evidence, native checks, docs tests, and verification / eval guards when applicable.
- **Maintainer checklist**: `docs/maintainers.md` now records concrete entry criteria for doctor, CLI, adapter, and artifact-category changes.

### Changed

- `docs/constitution-spec.md` bumped to **v2.6** for the boundary policy.
- README, `docs/artifacts.md`, `docs/interop/standards-map.md`, the official skill wrapper, install pins, and then-current source-repo maintenance records described v10.5.0.
- Boundary wording now says default no surface expansion is a review policy, not a permanent freeze.

### Tests

- `test/docs.test.js` checks boundary layer vocabulary, controlled extension entry criteria, forbidden surfaces, unchanged product surface, and v2.6 spec wording.
- Version assertions move 10.4.0 → 10.5.0 across docs/install/doctor/shared tests.
- At the time, release validation still included then-current source-repo doctor validation; Unreleased removes that source-repo practice.

### Migration

No action needed. Existing installs keep the same artifact layout and doctor behavior. Reinstall to pick up the v10.5.0 boundary guidance and docs pins.

---

## 10.4.0 (2026-06-18) — Long-lived AI Project Maintenance Loop

**Minor, backward compatible**. Adds a long-lived maintenance loop for pure-AI / AI-assisted projects: continuous small maintenance, evidence-triggered scoped refactors, native evidence gates, and feedback into project memory / verification / evals. No new CLI command, runtime, doctor warning code, MCP server, IDE adapter, agent runner, artifact category, or schema layout change.

### Added

- **Long-lived AI Project Maintenance Loop**: AI-OS now explicitly rejects calendar-based "refactor everything every so often" as the default AI-project maintenance strategy. Maintenance starts from observed drift evidence.
- **Optional `maintenance_review` task vocabulary**: `tasks.yaml` templates can record `drift_signals`, `refactor_trigger`, `contract_impact`, `native_checks`, and `debt_disposition`.
- **Maintenance verification guards**: `verification-matrix.yaml` template adds `long-lived-maintenance-review` and failure modes for periodic refactor without evidence and drift signals that do not feed back.
- **Framework feedback disposition**: baseline-log `Preventability review` guidance now includes `Maintenance disposition` for deciding whether a finding should become a maintenance CR, scoped refactor, memory entry, verification guard, or eval.
- **Example and evals**: `examples/long-lived-maintenance-loop.md`, `evals/periodic-refactor-without-drift-evidence.md`, and `evals/drift-signal-not-fed-back.md` cover the new loop.

### Changed

- `docs/constitution-spec.md` bumped to **v2.5** for the long-lived maintenance loop.
- `docs/problem-ledger.md` adds PL-024 for periodic big-bang refactors without drift evidence and drift signals not feeding back to project memory / guards / evals.
- README, `docs/artifacts.md`, `docs/maintainers.md`, the official skill wrapper, templates, install pins, and then-current source-repo maintenance records described v10.4.0.

### Tests

- `test/docs.test.js` checks the long-lived maintenance docs, `maintenance_review` template vocabulary, verification guards, PL-024, new example/evals, unchanged W070-W078 doctor range, and unchanged product surface.
- Version assertions move 10.3.1 → 10.4.0 across docs/install/doctor/shared tests.
- At the time, release validation still included then-current source-repo doctor validation; Unreleased removes that source-repo practice.

### Migration

No action needed. Existing installs keep the same artifact layout and doctor behavior. Reinstall to pick up the enriched templates and v10.4.0 docs; adopted projects can add `maintenance_review` only to maintenance / drift-control tasks.

---

## 10.3.1 (2026-06-18) — Codex suitability + release metadata consistency

**Patch, backward compatible**. Clarifies AI-OS behavior for Codex-style foreground execution and fixes release metadata drift. No new CLI command, runtime, doctor warning code, MCP server, IDE adapter, artifact category, or schema layout change.

### Fixed

- **Codex confirmation-stop fit**: Activation Gate now explicitly treats "analyze and fix", "implement", "verify", and "ship" as delivery-affecting work. Confirmation stops block only when authorization, scope, acceptance, risk, or boundary ownership is unclear; a clear user request to fix can proceed after the agent records root cause, reproduction, impact scope, and planned files.
- **Doctor enforcement wording**: README and Claude Code interop no longer imply Codex has the same host-level pre-tool hook semantics as Claude Code. `doctor --strict` is the portable local guard command; hard blocking comes from the surfaces it is wired into, such as Claude hooks, Cursor hooks, pre-commit, or CI.
- **Version metadata drift**: `package-lock.json` root package version now matches `VERSION` and `package.json`; docs tests check the lockfile too.
- **Residual version wording**: the public `ai-os-delivery` skill no longer says it packages "AI-OS v9" as the current framework version.
- **Historical source-repo maintenance drift**: then-current maintenance records were aligned to the Codex suitability / doc accuracy audit instead of the closed v10.2 Product Design bridge, and the stale `specs/example.spec.md` no longer described the removed `upgrade` path.

### Changed

- `docs/constitution-spec.md` bumped to **v2.4** for the foreground executor confirmation semantics clarification.
- `docs/problem-ledger.md` adds PL-023 for confirmation-stop overblocking and host-hook enforcement overgeneralization.
- `docs/maintainers.md` release checklist now requires `package-lock.json` root version parity with `VERSION` and `package.json`.

### Tests

- `test/docs.test.js` checks v2.4 spec wording, PL-023, package-lock version parity, Codex local / CI guard wording, and explicit delivery-request Activation Gate semantics.
- At the time, release validation still included then-current source-repo doctor validation; Unreleased removes that source-repo practice.

### Migration

No action needed. Existing installs keep the same artifact layout and doctor behavior. Reinstall to pick up the clarified `AGENTS.md`, skill wrapper, and docs.

---

## 10.3.0 (2026-06-16) — Zero-network local doctor

**Minor, backward compatible**. `doctor` now runs locally with no external request after the one-time install. Previously, projects using AI-OS had no local doctor entry, so every verification / IDE hook / CI run shelled out to `npx --yes github:royeedai/ai-os doctor` — re-resolving the GitHub HEAD, downloading the whole repo, and running a throwaway `npm install` on each invocation. The doctor logic itself is unchanged; only its distribution moves into the target project. No new CLI subcommand, package bin, runtime, doctor warning code, or artifact category.

### Added

- **Vendored local doctor entry**: `install` now writes `.ai-os/bin/ai-os-doctor.js` + `.ai-os/bin/shared.js` + `.ai-os/bin/VERSION` into the target project (committed, registered in `managed-files.tsv`). Daily / hook / CI runs use `node .ai-os/bin/ai-os-doctor.js .` and make **no external request**.
- **Team / CI offline fallback**: the embedded doctor reads its version from the committed `.ai-os/bin/VERSION`, so a teammate or CI that clones the repo (without the gitignored `.ai-os/framework.toml`) runs doctor with zero install — `bin/ai-os-doctor.js` downgrades the embedded-mode `E001` instead of failing.

### Changed

- `bin/shared.js` `readFrameworkVersion()` / `readPackageJson()` are dual-mode (package vs embedded `.ai-os/bin/`); new `installLocalDoctor()` always (re)vendors the entry to stay in sync with the installed framework version.
- All distributed/user-facing docs (`README.md`, `docs/getting-started.md`, `docs/cli.md`, `docs/interop/cursor.md`, `docs/interop/claude-code.md`, `docs/interop/standards-map.md`, `examples/multi-tool-coexistence.md`) point daily/hook/CI doctor at the local entry; the remote `npx ... doctor` form is kept only as a one-time pre-install audit.
- `install` and `skills add` commands across README / getting-started / examples / interop are pinned to `github:royeedai/ai-os#v10.3.0` (cache-friendly, reproducible, fewer `git ls-remote` round-trips).

### Tests

- `test/shared.test.js` covers `installLocalDoctor` (verbatim vendoring + VERSION) and the new `managed-files.tsv` `.ai-os/bin/` entries; `test/install.test.js` asserts the vendored files land and stay out of `.gitignore`; `test/doctor.test.js` adds local-entry parity, the team-clone-without-`framework.toml` case, and `--strict` parity; `test/docs.test.js` enforces the local-entry docs + release tracking. Version assertions move 10.2.0 → 10.3.0.
- Release validation requires `npm test`, `npm run lint`, and then-current source-repo doctor validation.

### Migration

No action needed. Re-install (`npx --yes github:royeedai/ai-os#v10.3.0 install . --force`) to vendor the local doctor entry, then switch hooks / CI to `node .ai-os/bin/ai-os-doctor.js . --strict` and commit `.ai-os/bin/`. The remote `npx ... doctor` invocation still works for one-off audits. PL-022 tracks the failure mode.

---

## 10.2.0 (2026-06-13) — Product Design optional bridge

**Minor, backward compatible**. AI-OS can now preserve Product Design brief / ideation / prototype / image-to-code / design QA / share outputs as optional design evidence while keeping Cursor, Claude Code, plain IDEs, and no-plugin environments on the same portable artifact contract. No new CLI command, runtime, doctor code, MCP server, IDE adapter, or Product Design hard dependency.

### Added

- **Product Design optional design-evidence bridge**: `docs/interop/product-design.md` maps Product Design workflows to AI-OS artifacts and defines no-plugin fallback through Figma, screenshots, URL reverse-spec, existing code / style, component-first, or manual brief.
- **`design_input` schema** for UI work in `docs/artifacts.md` and lane `DESIGN.md` templates: `provider`, `capability_used`, `evidence_refs`, and `fallback_path`.
- Verification guards for Product Design hard dependency drift, missing fallback evidence, and Product Design QA / prototype / share evidence being mistaken for project-native verification.

### Changed

- The official `ai-os-delivery` skill now tells agents to use Product Design when available, but to record the same `design_input` fallback contract when unavailable.
- `tasks.yaml` templates explicitly accept Product Design or fallback outputs through existing `expected_return`, `evidence_required`, `evidence_produced`, and `deviation_log`; no new task fields were added.
- `docs/constitution-spec.md` bumped to **v2.3** and `docs/interop/standards-map.md` maps Product Design evidence to `DESIGN.md` `design_input`.

### Tests

- `test/docs.test.js` adds Product Design optional bridge checks across README, artifacts, interop docs, skill wrapper, lane templates, verification matrix, problem ledger, maintainers guide, changelog, and product-surface boundaries.
- Release validation requires `npm test`, `npm run lint`, and then-current source-repo doctor validation.

### Migration

No action needed. Installed projects keep passing `doctor`; reinstall to pick up enriched templates. Product Design is optional, and no-plugin AI-OS workflows continue through the same UI source routing and evidence fields.

---

## 10.1.2 (2026-06-10) — CLI defect fixes + restate-gate anchor unification

**Patch, backward compatible; defect fixes / docs / maintenance-record only**. No new feature, CLI command, flag, doctor warning code, or artifact category. 2 primary product operations, 12 artifact categories, zero runtime dependencies, `AGENTS.md` ≤150 lines, canonical layout schema `9`, and constitution-spec v2.2 are all unchanged.

### Fixed

- **Removed subcommands no longer install silently**: `create-ai-os upgrade` (dropped in v10.0.0) used to fall through the default route and be treated as a target directory — silently creating `./upgrade/` with a full artifact set. It now fails fast with an error pointing to `create-ai-os install . --force`. Legitimate directory targets (`create-ai-os my-project`) are unaffected.
- **`install --help`**: the explicit `install` alias rejected `-h` / `--help` with `unknown option`; it now prints the same help as the top-level entrypoint.
- **File-as-target crash**: installing into a path that exists as a regular file crashed with a raw `ENOTDIR`; it now fails cleanly without touching the file.
- **doctor wrong-type artifacts**: a core file artifact replaced by a directory was neither reported (size-only check missed it) nor survivable — semantic checks crashed with a raw `EISDIR` (`checkBaselineConsistency` et al. read any existing path). `checkArtifact` now reports `E022` for files-that-are-directories, and all semantic checks (`AGENTS.md`, `.gitignore`, baseline consistency, W071/W072/W074/W076/W077/W078) read regular files only; `shared.readMetadata` returns `null` for a directory `framework.toml`.
- **Restate-gate anchor unified to `DESIGN.md` §10**: the v10.1.0 CR acceptance text said "§9 becomes the restate gate", but the shipped template put acceptance criteria at §9 and the restate-and-confirm gate at §10 — without a deviation record. All docs followed the CR text. Decision: docs follow the shipped template (re-numbering a template already installed twice would create a third state, and the gate reads naturally as the last pre-lock step). Corrected `docs/artifacts.md` (×2), `docs/constitution-spec.md` (×2, section-number typo only — spec stays v2.2), `docs/problem-ledger.md`, `docs/maintainers.md`, and the v10.1.0 entry below (same back-fix precedent as v10.1.1's spec-version correction).
- **Residual wording**: `docs/maintainers.md` guard-placement still said "install / upgrade" (last live `upgrade` residue), plus de-versioning leftovers — `maintainers.md` "v9 当前真相" heading / "3 个 CLI 子命令" phrasing / npm-check wording, `examples/README.md` "Canonical AI-OS v9", three "AI-OS v9" in `docs/interop/spec-kit-coexistence.md`, and this file's header ("tracks recent v9 releases"). Capability-introduction labels (v9.4 handoff, v9.5 fact_state_review) and schema-generation references stay by design.
- **Dead export**: `bin/shared.js` `readText` had no callers; removed.

### Changed

- **`examples/greenfield-guided-product.md`** now demonstrates the design-layer restate-and-confirm gate (DESIGN §10) in Step 2 — previously only the MISSION-layer restatement was shown despite the v10.1.0 entry claiming it; the acceptance-criteria pointer also corrected from "Section 8" to Section 9. `evals/missing-user-confirmation.md` and `evals/logic-right-but-product-shape-wrong.md` update the pre-v10.1 term "设计确认记录" to "反述确认门（§10）确认记录".
- **`docs/cli.md`** documents the removed-subcommand error, `install --help`, the file-as-target failure, and the two-directional `E022` semantics.
- **Source-repo maintenance records advanced** to this delivery (`CR-20260610-024200-cli-defects-restate-anchor-fixes`), including renaming the then-current `DESIGN.md` §10 to the template's "反述确认门" section name; the CR's Preventability review records the root causes (AC-vs-implementation divergence without a `deviation_log` entry; removing a CLI entrypoint without guarding the old route).

### Tests

- `test/install.test.js` adds three sections: removed subcommands fail instead of installing into a directory, explicit `install` supports `--help` / `-h`, and a file target fails cleanly. `test/doctor.test.js` adds a wrong-type `E022` section (which exposed the EISDIR crash on first run). `test/docs.test.js` upgrades the restate-gate assertions from string-presence to section-number level: template §9 = acceptance criteria, §10 = restate gate, and docs must anchor §10 (never §9). Version assertions bumped to 10.1.2.

### Migration

No action needed — defect fixes / wording / maintenance-record only; CLI surface, doctor warning-code range, and canonical layout schema (`9`) unchanged. Previously-misused `create-ai-os upgrade` invocations now fail with guidance instead of creating an `./upgrade/` directory. Already-installed projects keep passing `doctor`.

---

## 10.1.1 (2026-06-09) — Consistency optimization

**Patch, backward compatible; docs / wording / maintenance-record only**. No new feature, CLI command, flag, doctor warning code, or artifact category. 2 primary product operations, 12 artifact categories, zero runtime dependencies, `AGENTS.md` ≤150 lines, canonical layout schema `9`, and constitution-spec v2.2 are all unchanged.

### Fixed

- **`docs/interop/mcp-resources.md`** listed `install` / `doctor` / `upgrade` as three primary product operations, contradicting line 127 of the same file and reality — `upgrade` was dropped in v10.0.0. Corrected to two primary product operations (`install` / `doctor`).
- **`CHANGELOG.md` v10.1.0 entry** stated `docs/constitution-spec.md` was bumped to **v2.1**; the release actually bumped it to **v2.2** (v2.1 was the v9.9 version). Both anchors corrected to v2.2 to match the spec header, `docs/maintainers.md`, and the tests.
- **Missed v10.0.0 de-versioning**: `bin/ai-os-doctor.js` user-facing output ("AI-OS v9 project looks healthy", W010 "v9 target"), the `bin/ai-os-doctor.js` / `bin/shared.js` file-header comments, and `README.md` ("no slash commands in v9") still read "AI-OS v9". De-versioned (layout schema stays `9`). Schema-generation references (`docs/cli.md` "v9 canonical layout", `docs/artifacts.md` "v9 起", doctor W011 "pre-v9 file") and the `# AI-OS v9 managed` `.gitignore` / `.gitattributes` section headers are intentionally preserved.

### Changed

- **Source-repo maintenance records re-synced**: the then-current `.ai-os/lanes/default/` working artifacts (`DESIGN.md`, `tasks.yaml`, `verification-matrix.yaml`) were frozen at the v9.9 design-aware-UI delivery while `MISSION.md` had advanced to v10.1.0. They now describe the current v10.1.1 consistency delivery and point at `CR-20260609-032059-consistency-optimization`. The v9.9 / v10.0.0 / v10.1.0 history stays captured in their own baseline-log CRs.

### Tests

- `test/docs.test.js` adds a regression guard asserting `docs/interop/mcp-resources.md` states two primary product operations and no longer lists `upgrade`; version assertions bumped to 10.1.1 across `test/docs.test.js`, `test/doctor.test.js`, `test/shared.test.js`, `test/install.test.js`. `npm test` + `npm run lint` + then-current source-repo doctor validation source-repo validation required before release.

### Migration

No action needed — wording / docs / maintenance-record only; CLI behavior, doctor warning codes, and canonical layout schema (`9`) unchanged. Already-installed projects keep passing `doctor`.

---

## 10.1.0 (2026-06-08) — Restate-and-confirm gate + architecture guardrail

**Minor, backward compatible**. After evaluating an external "turn ai-os into an AI coding platform" proposal through `PROJECT_PURPOSE.md` §5 and the no-expansion red lines, AI-OS absorbs only two model-orthogonal, zero-runtime reinforcements and rejects the runtime / codegen / sandbox parts. No new CLI command, no new doctor code, no new artifact category; 2 primary product operations / 12 artifact categories / zero runtime deps / `AGENTS.md` ≤150 lines preserved.

### Added

- **Restate-and-confirm alignment gate** (`AGENTS.md` §1): before locking design or starting broad implementation, the agent must restate its understanding of goal / core main flow / state transitions / key exception paths in structured form and wait for user confirmation or correction. Need-layer restatement lands in lane `MISSION.md` §2 (new "core main flow" + "key exception / boundary branch" fields); design-layer restatement lands in lane `DESIGN.md` §10 (restate-and-confirm gate). Demonstrated in `examples/greenfield-guided-product.md`.
- **`docs/artifacts.md`** gains a "restate-and-confirm / double-loop gate" section explaining why it stays a behavior gate (no doctor warning code), complementary to model self-verification.

### Changed

- **Architecture guardrail home named**: `.ai-os/memory.md` §2 工程约束 is now explicitly the "architecture guardrail / coding-contract registry" (response-wrapper contract, must-reuse abstractions, forbidden anti-patterns, dependency policy) with a `type` field, cross-checked during verification (`AGENTS.md` verification rule + `DESIGN.md` §4 contract-first note). This is the home for what external tools call an "architecture style guide" / `.ai-os-rules` — AI-OS does not create a second truth-source file. Mapped in `docs/interop/standards-map.md`.
- `docs/constitution-spec.md` bumped to **v2.2** (restate-and-confirm gate strengthens the existing goal-confirmation / design-lock gates; contract compatible).
- `docs/problem-ledger.md` anchors the gate under existing PL-001 / PL-016 / PL-017 — no new PL id.

### Tests

- `test/docs.test.js` adds a v10.1 section (restate gate across AGENTS / templates / artifacts / spec / standards-map / ledger / example; asserts no `.ai-os-rules`; examples stay at 8); version assertions bumped to 10.1.0 and spec to v2.2. `npm test` + `npm run lint` + then-current source-repo doctor validation source-repo validation required before release.

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

- `bin/` is now 3 scripts; version assertions bumped to 10.0.0; `test/docs.test.js` asserts `migrate-to-v9.md` removed and the 2-operation wording. `npm test` + `npm run lint` + then-current source-repo doctor validation source-repo validation required before release.

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
- `npm test` + `npm run lint` + then-current source-repo doctor validation source-repo validation required before release.

### Migration

None required for existing projects. `doctor --strict` no longer warns on incomplete CR delta sections, missing URL confidence cells, or missing Preventability review — fill those via artifact templates as before. If you linked to removed interop paths, use `docs/interop/standards-map.md`.

---

## 9.7.3 (2026-05-29) — CLI defect fixes

**Patch, backward compatible** with one deliberate behavior change: `upgrade` no longer deletes user `.cursor/` config (a safety fix). Repairs eight confirmed CLI defects surfaced during the v9.7.2 review. Three primary product operations, 12 artifact categories, zero runtime dependencies, and `AGENTS.md` ≤150 lines are unchanged.

### Fixed

- **H1 upgrade data-loss**: `upgrade` no longer deletes the entire `.cursor/rules` + `.cursor/skills` directories. AI-OS never generates files under `.cursor/`, so the old blanket cleanup only destroyed user-authored Cursor config. `cleanupIdeAutoGenerated` is removed.
- **H2 W010 threshold**: the `AGENTS.md` line-count warning now fires above the documented `<=150` target (previously only `>200`, so 151–200-line files were never flagged).
- **H3 approval_required schema**: the lane `tasks.yaml` template and the source-repo maintenance records now use boolean `approval_required` (previously a string that `hasHighRiskTask` could never match); high-risk tasks set `true`.
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

- **Problem-ledger numbering**: `PL-010` / `PL-011` were each registered twice (v9.4/v9.5 handoff & hallucination vs. v9.5.1/v9.6 activation gate & long-horizon). The second pair is renumbered to **PL-014** (non-delivery misactivation) and **PL-015** (long-horizon agent recovery). References in `CHANGELOG.md`, `test/docs.test.js`, and then-current `baseline-log/` records are synced.
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
- `docs/maintainers.md` adds a "Framework feedback 复盘" section documenting the installed-project feedback `git grep` flow, the optional third-party `framework-feedback` issue label, the merge criteria (same root cause ≥2 times → new PL-* / PG-*), and the guard-landing priority (AGENTS.md > artifact template > doctor > docs).
- `docs/problem-ledger.md` registers `PL-012` for "AI-OS first delivery failed to prevent a modification that was preventable".
- `docs/constitution-spec.md` bumps to **v1.9** with a Framework feedback loop section (non-breaking optional section).
- `docs/artifacts.md` adds a Framework Feedback Loop section without introducing a 13th artifact category.
- `.github/ISSUE_TEMPLATE/preventable-modification.md` is a new optional intake for users to paste their CR's `## Preventability review` section under the `framework-feedback` label.
- `.ai-os/lanes/default/baseline-log/BL-20260525-140000-retrospective-v9-recap.md` aggregates the 6 historical CRs (v8-constitution-refactor through hallucination-guard) as the installed-project feedback starting data set; every historical CR is backfilled with `## Preventability review`.
- `.ai-os/lanes/default/baseline-log/CR-20260525-141500-framework-feedback-loop.md` records this v9.7 change with its own `## Preventability review`.

### Changed

- `AGENTS.md` behavior rules for "需求变化" and "交付收口" each gain one line referencing the Preventability review section and lane-closure retrospective aggregation. AGENTS.md stays within the ≤150-line ceiling.
- `docs/cli.md` declares an "Info-level framework feedback guidance (v9.7+)" subsection for W079a / W079b and keeps `semantic_warnings` scoped to W070-W078 (W079 info codes are excluded).
- VERSION / `package.json` / `package-lock.json` / `.ai-os/framework.toml` bumped to 9.7.0.

### Tests

- `test/docs.test.js` adds two new sections: "framework feedback loop is documented and templated (v9.7)" and "AI-OS source-repo maintenance records carries Preventability review on every historical CR".
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

## 9.4.0 (2026-05-02) — Agent Handoff + Evidence Loop

**Minor, fully backward compatible**. v9.4 keeps the canonical layout, three primary product operations, and zero runtime dependencies intact. It adds a task-level handoff and evidence loop so IDE / agent execution can return auditable proof without AI-OS becoming an IDE, runner, kanban server, or orchestrator.

### Added

- `tasks.yaml` handoff fields: `handoff_to`, `context_refs`, `expected_return`, `evidence_produced`, and `deviation_log`.
- `verification-matrix.yaml` guard for task handoff context, expected return, and produced evidence before task closure.
- Doctor semantic warning W076 for incomplete task handoff / evidence loops.
- Constitution spec v1.5 section for Agent Handoff + Evidence Loop.

### Changed

- Artifact docs now define task handoff as a repo-local governance contract, not an execution layer.
- The official `ai-os-delivery` skill wrapper now tells compatible agents to record produced evidence before marking tasks done / verified / shipped.
- Public docs continue to describe install, doctor, and upgrade as the only three primary product operations.

### Tests

- Documentation tests now assert handoff template fields, product-boundary wording, W076 documentation, and version string.
- Doctor tests cover missing acceptance/evidence fields, handoff without context/expected return, and done-without-produced-evidence.

### Migration

None. Existing projects can adopt the new task fields gradually. W076 is a warning by default and only blocks when `doctor --strict` is used.

---

## 9.3.0 (2026-05-02) — External learning fusion

**Minor, fully backward compatible**. v9.3 keeps the canonical layout, three primary product operations, and zero runtime dependencies intact. It fuses external spec-driven, MCP resource, browser-evidence, and eval-taxonomy practices into AI-OS artifacts and `doctor --strict` checks.

### Added

- `framework/.agents/templates/lane/specs/bugfix.spec.md` — bugfix route covering root cause, reproduction, blast radius, planned files, regression guard, and code / data / runtime completion status.
- URL evidence package adaptation matrix for `trace.zip`, network log / HAR, screenshots, DOM snapshots, rawHtml, markdown, and structured JSON, including redaction and confidence mapping.
- MCP resource annotation guidance for `audience`, `priority`, `lastModified`, `subscribe`, and `listChanged`.
- Eval taxonomy frontmatter fields: `risk_source`, `failure_mode`, `harm`, and `artifact_gate`.
- Doctor semantic warnings W073-W075 for CR delta fields, high-risk artifact completeness, and URL evidence confidence.

### Changed

- W072 now checks each non-placeholder AC from `DESIGN.md`, not just whether at least one AC is referenced by `verification-matrix.yaml`.
- Baseline-log guidance now requires CR records to include Current behavior, Proposed delta, Affected artifacts, Acceptance delta, and Close/archive condition.
- `docs/constitution-spec.md` bumped to v1.4 with the external learning fusion contracts.
- Public docs now describe install as one operation with a default entrypoint and an explicit alias, clarify that the `agentskills.io` wrapper is an open-standard adapter rather than a proprietary AI-OS skill system, and describe the MCP sample as an illustrative reference snippet rather than a shipped server.

### Tests

- Documentation tests now assert the bugfix spec route, evidence package matrix, MCP annotation guidance, eval taxonomy frontmatter, unchanged CLI script surface, product-surface wording, and version string.
- Doctor tests now cover W072 per-AC mapping plus W073/W074/W075 strict-mode behavior.

### Migration

None. Existing projects can adopt the stricter checks gradually; warnings remain non-blocking unless `--strict` is used.

---

## 9.2.0 (2026-05-02) — URL reverse-spec intake

**Minor, fully backward compatible**. v9.2 keeps the canonical layout and three primary product operations intact. It adds an artifact-first intake protocol for accessible website URLs so agents can capture screenshots, DOM/CSS, interactions, Network/API observations, and evidence-graded backend behavior before implementation.

### Added

- `docs/reverse-spec-url-intake.md` — official URL intake protocol covering authorization boundaries, screenshot matrix, DOM topology, computed CSS, assets, interaction sweep, Network/API observations, backend behavior records, and confidence levels.
- `evals/url-reverse-spec-backend-hallucination.md` — regression case for agents that invent backend behavior without browser-observable evidence.
- URL intake guards in `framework/.agents/templates/lane/verification-matrix.yaml`.

### Changed

- `framework/.agents/templates/lane/design-pack/parity-map.md` now includes capture manifest, visual parity, interaction parity, API / interface parity, and backend behavior parity tables.
- `framework/.agents/templates/lane/specs/example.spec.md` now includes reverse-spec evidence sources, API observation records, backend behavior records, unknowns, and the `observed` / `inferred` / `unknown` confidence model.
- `framework/skills/ai-os-delivery/SKILL.md` recognizes URL reverse-spec intake while still routing work through AI-OS artifacts instead of adding a command surface.
- `docs/artifacts.md`, `docs/constitution-spec.md`, and `README.md` document the URL intake flow.

### Tests

- Documentation tests now assert the URL intake protocol, template fields, eval frontmatter, unchanged CLI script surface, and version string.

### Migration

None. Existing projects can adopt the new protocol by updating their lane templates or copying the documented fields into current reverse-spec artifacts.

---

## 9.1.1 (2026-04-30) — Internal cleanup

**Patch, fully backward compatible**. Zero behavior change. No new constitution rules, artifacts, or CLI commands.

### Fixed

- All 22 `evals/*.md` files now reference v9 surfaces.
- `evals/README.md` updated from stale-reference disclaimer to v9 alignment confirmation.

### Removed (dead code)

- `bin/shared.js`: deleted unused v7→v8 migration helpers.
- `bin/ai-os-doctor.js`: removed dead `LAYOUT_MODE_ROOT_ONLY` baseline-log check.

### Refactored (zero behavior change)

- `bin/ai-os-doctor.js`: split semantic consistency into focused functions.
- `bin/shared.js`: moved IDE pointer content into `framework/.agents/templates/ide-pointers/`.

### Documentation

- `CHANGELOG.md` archived v5.x – v7.x entries into this file.
- `README.md` removed the "Why v9 changed the layout" historical section.

### Migration

None. Drop-in replacement for v9.1.0.

---

## 9.1.0 (2026-04-30) — Open standards alignment

**Minor, fully backward compatible**. v9.1 adds open-standard interop (agentskills.io, MCP resources) and doctor W070-W072.

### Migration

```bash
npx --yes github:royeedai/ai-os doctor . --strict
```

---

## 9.0.0 (2026-04-22) — Default lane reset

**Breaking**. v9 makes **shared root + `.ai-os/lanes/default/`** the only canonical layout.

### Migration

```bash
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os doctor .
```

---

## 8.0.0 (2026-04-22) — Delivery Constitution refactor

**Breaking**. v8 repositioned AI-OS as Delivery Constitution + 12-artifact set + minimal CLI. v7 users: run `npx create-ai-os upgrade .`; legacy v7 state tagged as `v7-legacy`. Full v7→v8→v9 migration narrative: [v9.1.0 migration guide](https://github.com/royeedai/ai-os/blob/v9.1.0/docs/migrate-to-v9.md).

### Migration

```bash
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os doctor .
```

---

## 7.4.0 (2026-04-22)

### Added

- `ai-os-validate` 对 7.3.0 新增的 4 条规则补 CLI 确定性兜底（全部 WARNING，不 block，保持渐进兼容）：`.ai-os/CONVENTIONS.md` 跨层契约登记表五节存在性（PL-033）、spec 第 3 节 `input_mode` 列存在性（PL-035）、spec 5.5 节 User Journey 闭环契约存在性（PL-035）、spec 声明真实 journey 时 `tasks.yaml` 必须含 `[E2E-SMOKE]` 任务（PL-035）
- `test/validate.test.js` 新增 16 项断言覆盖以上四类 CLI 校验的正反场景；`npm test` 从 1086 → 1102 项断言全绿
- `docs/interop/spec-kit-coexistence.md` + `examples/coexist-with-spec-kit.md`：说明 AI-OS 与 GitHub Spec-Kit 两种共存模式（Spec-Kit 主导 + AI-OS 治理 / AI-OS 自包含），以及工件映射和禁忌反模式
- `docs/problems.md`：把 README 里冗长的"常见问题 → AI-OS 做法"长表下沉到单独文档；README 首屏改为"一句话定位 + 安装命令 + 差异化简表"，安装命令从第 100+ 行前移到第 5-13 行

### Changed

- `framework/.agents/skills/code-review-guard/SKILL.md` 重写：从 300 行压缩到 254 行（-15.3%），token 从 7464 → 6075（-18.6%），全部反模式语义 1:1 保留。Step 1.5b 弱类型洞扫描改为 8 行表格化；Step 0 B/C 合并，Step 2/3 按模块类型整合为单一表格；lite 模式总 token 从 78345 → 77466 净减少
- `framework/.agents/references/derived-rules.md` 追加 PL-034 弱类型洞 8 类反模式表格（在 4.4 节）、PL-035 E2E-SMOKE 失败即视为 journey 未通过的显式禁令与 CLI 兜底说明（在 2.4 节）
- `examples/quickstart-todo-cli/`、`examples/multi-lane-team-workspace/`（3 lane）同步到 7.3.0 模板标准：CONVENTIONS 补跨层契约登记表五节、spec 第 3 节补 `input_mode` 列、spec 补 5.5 节（CLI 单栈显式声明"暂无跨栈 journey"）
- `bin/shared.js` 新增 `VALIDATION_SCHEMAS.conventionsCrossLayerRegistry` / `specUserJourneySection` / `specInputModeColumn` / `tasksE2eSmokeMarker` 四个常量，供 validate 和未来 gate 校验复用
- `docs/maintainers.md` 主示例清单追加 `examples/coexist-with-spec-kit.md`
- `docs/problem-ledger.md` PL-033 ~ PL-036 的"当前覆盖锚点"字段追加 `bin/ai-os-validate.js` 对应校验项

## 7.3.0 (2026-04-22)

### Added

- 4 个新 root eval：`evals/implicit-cross-layer-contract-undocumented.md`、`evals/weak-type-hole-erodes-contract.md`、`evals/e2e-journey-broken-by-single-point-pass.md`、`evals/cross-module-same-defect-not-escalated.md`，把三轮全栈复盘里 15+ 条建议按 4 个稳定根因压缩成回归基线
- `docs/problem-ledger.md` 新增 PL-033 ~ PL-036 四条条目，分别覆盖：隐式跨层契约缺乏显式登记表 / 弱类型洞导致契约擦除 / 单点接口合格 ≠ 端到端 user journey 闭环 / 跨模块同型缺陷只修单点没升级为全仓扫描

### Changed

- `framework/.agents/templates/project/CONVENTIONS.md`：新增"跨层契约登记表"专章（5 个强制子节）：HTTP 状态码 ↔ 业务码 ↔ 客户端行为映射、Wire 类型契约、名单型常量反向真理源、敏感数据 service 方法语义档位、中间件/查询引擎方言契约
- `framework/.agents/skills/code-review-guard/SKILL.md`：Step 1.5 新增"弱类型洞扫描"子检查项（Map 契约 / 笼统 catch / DTO 字段使用者 / UI 自产字段 / 控件默认行为 / 输入归一化 owner 六类反模式）；Step 0 新增 C 节"横切基础设施 bean 全仓审计"
- `framework/.agents/templates/project/specs/example.spec.md`：第 3 节"界面/接口/命令清单"表格新增 `input_mode` 列；新增第 5.5 节 User Journey 闭环契约
- `framework/.agents/templates/project/tasks.yaml`：新增 E2E-SMOKE wave 任务示例（验收标准为本地启动栈走完用户实际路径）
- `framework/.agents/skills/systematic-debugging/SKILL.md`：第二阶段（模式分析）新增 Step 5"跨模块同型缺陷扫描"，命中即升级为 P1/P0 全仓扫描
- `framework/.agents/skills/database-schema-design/SKILL.md`：第四步增补"列容量必须对照业务负载估算"，禁止 `VARCHAR(200/500)` 作为默认
- `framework/.agents/workflows/plan.md`、`design.md`、`verify.md`、`debug.md` 同步补齐：跨层契约登记表前置核对、input_mode 声明、E2E-SMOKE 任务拆分、跨模块同型缺陷升级触发条件
- `framework/.agents/references/derived-rules.md` 新增 2.4（端到端 journey 必须独立任务承担）、4.8（跨层契约必须在 CONVENTIONS.md 显式登记）、4.9（同型缺陷必须升级）三节；4.4 节追加禁止弱类型洞作为契约载体
- 整合策略采用根因压缩，不在 framework 里硬编码项目特定决策（不写"必须 Long→String"、"必须用 el-select"），项目特定锁定留给项目自己在 CONVENTIONS.md 登记

## 7.2.2 (2026-04-17)

### Changed

- `lane activate` 现在会把已归档 lane 视为重新打开的交付线，并清掉旧的 archive outcome / sync 元数据，避免 lane 被重新激活后仍携带过期的归档状态
- framework 宪法、CLAUDE.md / GEMINI.md 生成逻辑与 `project-state` 的恢复提示已清理旧的根层单交付路径，统一改成 lane-aware 叙事，并保留 legacy 项目的退化说明
- README、CLI 文档和安装回归测试同步补齐了"重新打开 archived lane"与"session init 先判定当前 lane"的说明

## 7.2.1 (2026-04-16)

### Added

- `evals/lane-archive-without-shared-reflux.md`：为 lane 归档只改状态、未回流共享记忆的失误补了 root eval
- `examples/lane-archive-shared-memory-reflux.md`：补了一份 lane 收口与 shared memory reflux 的最小示例说明
- `examples/multi-lane-team-workspace/`：新增 canonical 团队协作示例，展示 `1 active + 1 draft + 1 archived` 拓扑，以及 archived lane 的 memory / CONVENTIONS reflux

### Changed

- `create-ai-os lane archive` 现在会稳定保留已归档 lane 的既有 `archived_at` / sync metadata，避免重复收口时把归档元数据误写回 `pending`
- `status` / `doctor` / `lane list` 对 archived lane 的收口结果与 reflux 状态有了更清晰的可见性；lane 关闭不再只是一个 `status = "archived"` 字段
- framework 的 `/ship`、`/postmortem` 与团队协作文档同步补齐了 lane 收口规则：归档前先把稳定结论回流到共享 `memory.md` / `CONVENTIONS.md`
- README、CLI、Artifacts、maintainers、problem-ledger、7.2 backlog 与回归测试同步收口，`7.2` 团队协同增强阶段的出口条件现已完整闭合

## 7.2.0 (2026-04-16)

### Added

- `docs/evolution/multi-delivery-lanes-7.2-backlog.md`：正式把 `7.2` 团队协同增强拆成 lane 元数据与可见性、lane 收口与记忆回流、多 lane canonical example 三个 workstream，避免后续推进继续依赖会话记忆

### Changed

- lane 元数据从最小身份信息提升到团队协同可见信息：`lane.toml` 与 `buildLaneMetadata` 现在稳定承载 `quality_tier`、`risk_tier`、`owner`，其中 `risk_tier` 在未显式声明时会由 `quality_tier` 推导
- `create-ai-os lane add` 新增 `--risk-tier`，`lane list` 会显示 topology、quality / risk / owner，并标出缺失 owner、使用推导 risk tier 或 metadata 非法的 lane
- `status` / `doctor` 现在会输出当前 lane 的 metadata 摘要与并行拓扑，帮助团队确认自己正在操作哪条 lane，而不是只看到"当前项目"
- README、CLI、Artifacts、canonical quickstart example、问题台账和回归测试同步改成 `7.2` 的 lane metadata / topology 叙事

## 7.1.5 (2026-04-16)

### Changed

- AI-OS 新增了三类从真实复杂项目复盘抽象出的交付护栏：shared layer / 通用抽象副作用审计、schema / route / wrapper parity 先于复用、以及代码状态 / 数据状态 / 运行状态三分诊断
- `design` / `plan` / `build` / `debug` / `verify` workflow、根层宪法与工件模板同步补齐了这些要求，并把同仓正常实现对照与 step validation 前移到了执行阶段
- `ai-os-validate` 现在会对 spec / tasks / acceptance 中缺失的 shared-layer / parity / step-validation 锚点给出 warning；canonical quickstart 示例也已升级到零 warning 新基线
- 新增 `shared-layer-side-effect-audit-missed`、`parity-before-reuse-skipped`、`fix-complete-but-data-runtime-not-recovered` 三个 root eval，避免这轮规则在后续重写中回退

## 7.1.4 (2026-04-16)

### Changed

- framework 分发工作流把 `/build`、`/ship` 也补齐到 lane 进入规则：实现和交付前都必须先确认当前 lane，不再默认沿用根层单当前交付语义
- `/build` 与 `/ship` 现在明确要求：命中共享代码 / 契约 / 基础设施时，要记录其他受影响 lane，并在验证或收口时说明哪些 lane 已覆盖、哪些仍待补回归
- README、CLI、`docs/workflows.md`、问题台账和安装回归测试同步补齐这组 lane-sensitive workflow 说明

## 7.1.3 (2026-04-16)

### Changed

- `ai-os-validate`、`create-ai-os gate`、`ai-os-release-check` 在存在 Git 基线时，会结合当前 worktree 改动路径给出更高置信度的 lane 候选：命中共享根层工件、其他 lane 工件，或 `.ai-os/` 之外的仓库文件时，会优先提示最可能需要补跑的 lane
- `bin/shared.js` 新增 lane worktree impact 启发式，lane 选择错误和 lane scope 提示现在都会复用这组信号，而不是只做静态"其他 active lane"提醒
- README、CLI 文档、问题台账和回归测试同步补齐了这组 git-backed lane candidate 提示

## 7.1.2 (2026-04-16)

### Changed

- `ai-os-validate`、`create-ai-os gate`、`ai-os-release-check` 的 lane 解析失败文案改成命令感知：会直接列出可复制的 `--lane` 重跑命令，以及 `lane list` / `lane activate --only` / `lane add` 的修复路径
- 多 lane 项目里显式指定 lane 运行 `validate` / `gate` / `release-check` 时，会额外提示"本次只覆盖当前 lane"，并在选到 draft lane 时提醒先核对 active lane
- README、CLI 文档、问题台账和回归测试同步补齐 lane-aware 修复建议叙事

## 7.1.1 (2026-04-16)

### Changed

- framework 分发工作流补齐了 lane 进入规则：`/align`、`/change-request`、`/verify` 和 workflow index 现在会先判断"继续当前 lane 还是先新建并行 lane"
- README、CLI 文档和治理台账同步明确：lane 敏感 workflow 进入前先确认 lane，不要把并行交付揉进同一条 lane
- 安装回归测试新增对 lane 进入规则和 lane-scoped verify 指引的断言

## 7.1.0 (2026-04-16)

### Added

- 新增 `create-ai-os lane` 生命周期子命令，支持 `list` / `add` / `activate` / `archive`
- `lane add` 现在可以在 lane 项目里创建新交付线，也可以在 `core` 安装但尚未创建 starter 工件的项目里直接落第一条 lane
- `lane activate --only` 会把其他 active lane 回退为 `draft`，用于恢复单 lane 自动选择

### Changed

- README、CLI 文档、问题台账和维护文档同步补齐了 lane lifecycle 的用户叙事与治理锚点
- 回归测试新增 lane lifecycle 命令覆盖，并将 create-ai-os 主帮助文案纳入断言

## 7.0.2 (2026-04-15)

### Changed

- 多 active lane 或 lane 选择错误时，lane-aware CLI 现在会统一列出候选 lane、推荐 `--lane` 示例，并提示如何恢复自动选择
- `docs/cli.md` 与 README 同步补充了多 lane 歧义时的修复指引
- 回归测试补齐了 multiple-active / unknown-lane / no-active-lane 三类 lane 选择引导场景

## 7.0.1 (2026-04-15)

### Changed

- framework 分发工作流与宪法文案补齐 lane 语义：`/align`、`/change-request`、`/resume`、`/verify`、`/ship` 与 workflow index 现在明确说明 lane 项目默认操作当前 lane，而不是根层单当前交付
- 新安装项目的回归测试新增对 lane 语义文案的断言，防止用户侧工作流重新退回根层单例叙事
- 维护与变更日志文档中的版本纪律改为通用 semver 表述，不再停留在 `6.x` 文案

---

## 7.0.0 (2026-04-15)

### Breaking Changes

- `project` profile 新安装默认采用"共享根层 + .ai-os/lanes/default/"布局，不再把 Mission / Design / Tasks / Acceptance / State 直接创建在 `.ai-os/` 根层
- `.ai-os/project.md` 与 `.ai-os/lanes/<lane-id>/lane.toml` 成为 lane 模型下的新基础工件；共享项目上下文与当前交付线工件正式分离
- `quick` 模式升级到完整 starter 工件的推荐方式改为重新运行 `create-ai-os <target> --profile project`，不再写成 `upgrade --profile project`

### Added

- `ai-os-upgrade --to-lanes`：支持把 legacy 单交付项目的根层 Mission / Design / Tasks / Acceptance / State / baseline-log / specs 机械迁移到 `.ai-os/lanes/default/`
- `project` starter 模板新增共享项目章程 `[project.md]` 与 lane 元数据模板 `lane.toml`
- `validate`、`gate`、`release-check`、`doctor` 全部支持 `--lane`，lane 项目和 legacy 项目都能按同一语义工作
- `lab` 的 high-risk 场景现在会在 lane 路径下补齐 `risk-register.md`、`release-plan.md`、`verification-matrix.yaml`

### Changed

- 默认安装、plan 输出、团队协作忽略规则和 STATE 恢复逻辑全面对齐 lane 布局
- README、CLI、Artifacts、Getting Started 和 framework 说明改为以 lane 默认布局为主叙事，同时保留 legacy 兼容说明
- 回归包补齐 legacy->lane 迁移、mixed layout preflight、lite / lab / real-project lane 路径等场景

## 6.2.6 (2026-04-14)

### Added

- `ai-os-gate` 的 verify 阶段现在会对 `failure_modes[].guards` 的坏引用给出 warning

### Changed

- `/verify` 的 YAML gate 从"只看 `failure_modes` 是否存在"扩展到"同时检查 guard 引用是否对齐 acceptance evidence / 现有 eval"

## 6.2.5 (2026-04-14)

### Added

- `ai-os-validate` 现在会检查 `failure_modes[].guards` 是否引用 `acceptance.yaml` 已声明 evidence 或现有 `.ai-os/evals/*.md`
- 高风险示例补充了被 `verification-matrix.yaml` 引用的 failure-mode eval 样例

### Changed

- `ai-os-release-check` 在 high-risk 交付里会拦截 `failure_modes[].guards` 的坏引用和空 guard
- `verification-matrix.yaml` 模板与文档同步明确：`guards` 应指向 acceptance evidence 或现有 eval

## 6.2.4 (2026-04-14)

### Added

- `ai-os-validate` 现在会区分 `failure_modes:` 缺失和空列表，并对空列表给出确定性 warning
- `ai-os-gate` 新增顶级 YAML 列表条目检查，用于 verify 阶段识别空 `failure_modes`

### Changed

- `ai-os-release-check` 对 high-risk 交付不再接受空 `failure_modes:`，必须保留至少一条真实 guard
- `verification-matrix.yaml` 模板和文档同步明确：high-risk 交付不能只保留空 `failure_modes`

## 6.2.3 (2026-04-14)

### Added

- `ai-os-gate` 现在会对已有 `verification-matrix.yaml` 缺少 `failure_modes:` 给出 verify 阶段 warning

### Fixed

- 修复 `ai-os-gate` 读取 `tasks.yaml` / `acceptance.yaml` 的路径错误，避免 build / verify 门禁误判
- `ai-os-release-check` 在 high-risk 交付里正式要求 `verification-matrix.yaml` 记录 `failure_modes:` guard

## 6.2.2 (2026-04-14)

### Added

- `ai-os-validate` 现在会检查项目级 `.ai-os/evals/*.md` 是否具备标准 eval 结构
- `verification-matrix.yaml` 模板新增 `failure_modes:` 槽位，用于沉淀稳定 failure mode 的最小复现和 guard

### Changed

- `ai-os-validate` 对缺少 `failure_modes:` 的 `verification-matrix.yaml` 给出确定性 warning，而不是只检查 `impact_rules`
- 高风险示例的 `verification-matrix.yaml` 同步补上 failure mode guard 样例

## 6.2.1 (2026-04-14)

### Added

- PL-028（复杂任务先只读分析再编辑）和 PL-029（稳定 failure mode 要沉淀成回归证据）登记到问题台账
- 新增 `evals/read-only-analysis-before-edit.md`
- 新增 `examples/failure-mode-eval-closure.md`

### Changed

- `framework/AGENTS.md`、`/build`、`/debug`、`/verify` 明确要求复杂任务先做只读分析，并要求把稳定 failure mode 同步到 `evals/` / `verification-matrix.yaml`
- 维护与工件文档补充"trace -> eval"闭环要求，避免只修当前一次、不沉淀回归证据

## 6.1.0 (2026-04-09)

### Added

- `create-ai-os gate` 命令：读取 YAML 工作流定义中的门禁规则，对项目工件做确定性检查（file_exists / field_not_placeholder / section_not_empty / file_min_lines / dir_not_empty / tasks_all_completed / acceptance_all_passed / phase_completed / state_field_matches / yaml_has_entries），支持 `--entry` / `--exit` / `--all` / `--json`
- YAML 工作流门禁定义：`pipeline.yaml` + 6 个阶段 `.yaml`（align / design / plan / build / verify / ship），与现有 Markdown 工作流并行
- `--quick` 安装模式：极简安装（AGENTS.md + 主路径工作流 + YAML 门禁 + MISSION.md + STATE.md），5 步引导，适合首次接触或小项目
- `quick` 安装 profile（manifests/install-profiles.json）
- 演进研究文档：Spec-Kit 对比分析、YAML 工作流原型设计、极简入口层设计、定位与叙事草案（docs/evolution/）

### Changed

- `LITE_INCLUDES` 扩展覆盖所有 YAML 门禁文件，lite 模式也可使用 gate 检查
- README 新增 `--quick` 安装入口和 `gate` 命令说明

---

## 6.0.0 (2026-04-02)

### Breaking Changes

- `MISSION.md` 改为薄基线章程：移除阶段计划、需求变更同步记录等高频协作内容
- 新增 `baseline-log/` 目录，取代原 `baseline-log.md` 单文件记录，每条基线/变更请求一个独立文件（`BL-YYYYMMDD-HHMMSS-slug.md` / `CR-YYYYMMDD-HHMMSS-slug.md`）
- `tasks.yaml` 升级到 version 3，新增 `owner`、`baseline_id` 字段，移除顶级 `mission` 字段
- `acceptance.yaml` 新增 `baseline_id`、`baseline_source` 字段
- 安装时自动生成 `.gitignore`（排除 `STATE.md` 等 session 文件）和 `.gitattributes`（`memory.md` 使用 `merge=union`）

### Added

- `CONVENTIONS.md` 模板：锁定项目级代码约定（命名、代码模式、禁止模式），防止跨 session 模式漂移
- 团队协作配置：`--no-team-config` 可跳过 `.gitignore` / `.gitattributes` 生成
- PG-005（Mission 多人冲突热点）登记到问题台账，覆盖锚点已落地
- PL-020（brownfield 场景把整个存量项目误当成当前 mission）登记到问题台账
- `baseline_id` 一致性校验：`validate` 检查 Mission / tasks / acceptance 三处 baseline_id 是否一致

### Changed

- 旧版 `baseline-log.md` 单文件和 `BL-001` 式短 ID 仍可通过校验（带 WARNING）
- `upgrade` 自动清理 `.gitattributes` 中过时的 `tasks.yaml merge=union` 条目
- IDE 兼容性说明新增 Codex CLI / Cursor / Claude Code 的承接路径要求

---

## 5.7.0 (2026-03-31)

### Added

- PL-019（外部编排场景验证闭环被跳过）登记并落地
- `acceptance-gate` 新增证据要求表和自我合理化防御表
- `code-review-guard` Step 0 强制项目原生校验

### Changed

- `verify` workflow 触发条件扩展到外部编排完成后
- `build` workflow 出口规则：完成后必须进入 `/verify`

---

## 5.6.0 (2026-03-30)

### Added

- 团队协作测试用例（`.gitignore` / `.gitattributes` helpers）
- README 团队协作章节

---

## 5.5.1 (2026-03-30)

### Added

- `appendGitignoreEntries` / `appendGitattributesEntries` 幂等写入
- 团队协作指引文档

---

## 5.5.0 (2026-03-26)

### Added

- `--lite` 安装模式：只安装核心 workflow 和 skill，减少 token 占用
- `ai-os-cursor-rules` 子命令：生成 / 清理 Cursor IDE 衍生文件
- `ai-os-token-budget` 子命令：估算框架 token 体量，支持 `--source` 和 `--lite` 对比
- `CLAUDE.md` / `GEMINI.md` IDE 入口文件自动生成
- Quickstart 示例（`examples/quickstart-todo-cli/`）

### Changed

- 文档、示例、eval 全面补齐

---

## 5.4.0 (2026-03-25)

### Changed

- 示例、文档、命名和测试覆盖整体打磨

---

## 5.3.0 (2026-03-25)

### Added

- `tasks.yaml` 新增 `measurable_outcome` 和 `edge_cases` 字段
- `/plan` workflow 禁止 `edge_cases` 为空

---

## 5.1.2 (2026-03-19)

### Fixed

- Skill 文档中的引用路径修正
- CLI 多脚本参数解析增强

### Added

- 交付检查增强：基础设施和配置缺口检测
- PL-015（brownfield 忽略共享基础设施约定）、PL-016（可配置被误解）登记

---

## 5.0.0 (2026-03-17)

### Breaking Changes

- 移除所有 legacy v1 兼容（`new-project`、`new-module`、`quick` 等旧 workflow）
- 强制 v2-only workflows

### Added

- `/review` workflow
- `/postmortem` workflow
- `ai-os-lab` 多场景实验沙箱
- 问题台账覆盖检查
- 跨层交付守卫和风险升级
- PL-013（局部改动不默认全仓扫描）、PL-014（产品形态检查）登记

### Changed

- 确认门和可用性门重新校准
- 项目模板收紧
