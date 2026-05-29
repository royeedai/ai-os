# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)：

- **patch** (x.y.z)：bugfix、文案修正、文档补全、测试与治理收口
- **minor** (x.y.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

This file only tracks v8 and v9 releases (the supported lines as of v9.7). For v5.x – v7.x history, see [CHANGELOG-archive.md](CHANGELOG-archive.md).

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

---

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

- All 22 `evals/*.md` files now reference v9 surfaces. Previously every eval's "若需改 framework，优先检查" section pointed at v7 paths that v8 had already deleted (`framework/.agents/workflows/*.md`, `framework/.agents/skills/*/SKILL.md`, `framework/.agents/references/derived-rules.md`, slash commands like `/align` / `/design` / `/build` / `/auto-advance`, and `.ai-os/acceptance.yaml`). Pointers now route to `AGENTS.md` behavior-rule sections, `framework/.agents/templates/lane/`, and `framework/.agents/templates/shared-root/`. Evaluations themselves are unchanged.
- `evals/README.md` updated from "references stale, only the where-to-fix pointer has moved" disclaimer to a confirmation that v9 alignment is complete.

### Removed (dead code)

- `bin/shared.js`: deleted unused `LEGACY_PROJECT_TEMPLATE_ROOT` constant, `copyFile`, `copyDirRecursive` helpers and their exports. These were v7→v8 migration utilities with no remaining callers.
- `bin/shared.js`: trimmed 8 unused root-layout fields (`rootDesign`, `rootState`, `rootTasks`, `rootRiskRegister`, `rootReleasePlan`, `rootVerificationMatrix`, `rootDesignPack`, `rootEvals`, `rootSpecs`, `rootBaselineLog`) from `getArtifactPaths`. Only `LAYOUT_MODE_ROOT_ONLY` triggers E060 (forced upgrade); per-artifact checks underneath that mode were redundant.
- `bin/ai-os-doctor.js`: removed the dead `LAYOUT_MODE_ROOT_ONLY` baseline-log check; the layout error already requires `upgrade` and per-file checks beneath it never run in healthy projects.

### Refactored (zero behavior change)

- `bin/ai-os-doctor.js`: split the 85-line `checkSemanticConsistency` into three focused functions — `checkBaselineConsistency` (W070), `checkTaskOwners` (W071), `checkAcceptanceCoverage` (W072). All warning codes, messages, and trigger conditions are identical.
- `bin/shared.js`: moved `CLAUDE.md` / `GEMINI.md` IDE pointer content from inline string constants into `framework/.agents/templates/ide-pointers/{CLAUDE,GEMINI}.md` so all install templates live under one tree.

### Documentation

- `CHANGELOG.md` archived v5.x – v7.x entries into a new `CHANGELOG-archive.md`. Main `CHANGELOG.md` now stays focused on the supported v8/v9 lines.
- `README.md` removed the "Why v9 changed the layout" historical section. The history is preserved in `CHANGELOG.md` v9.0.0 entry.

### Tests

- 375 assertions passing, 0 lint warnings — same totals as v9.1.0. Version-string assertions in `test/{docs,install,doctor,shared}.test.js` updated to `9.1.1`.

### Migration

None. Drop-in replacement for v9.1.0.

---

## 9.1.0 (2026-04-30) — Open standards alignment

**Minor, fully backward compatible**. v9.1 keeps the canonical layout and three primary product operations intact. It adds open-standard interop (agentskills.io, MCP resources, AGENTS.md/Linux Foundation) and tightens the constitution at three points without growing the operating surface.

### Added

- `framework/skills/ai-os-delivery/SKILL.md` — AI-OS as an [agentskills.io spec v1.0](https://agentskills.io/specification)-compliant skill so any of the 27+ compatible agents (Claude Code, Cursor, Codex, Gemini CLI, ADK, Hermes, ...) can load AI-OS behavior without per-tool adapters
- `docs/interop/mcp-resources.md` — `aios://` URI scheme covering all 12 artifacts plus a ≤50-line zero-dependency illustrative reference snippet (default install does not ship or start any server)
- `docs/interop/claude-code.md` — coexistence with Claude Code via thin `CLAUDE.md` stub or skill loading
- `docs/interop/cursor.md` — coexistence with Cursor `.cursor/rules/*.mdc` and `.cursor/skills/`
- `docs/interop/kiro.md` — coexistence with Kiro steering + EARS-notation specs
- `docs/interop/openspec.md` — coexistence with OpenSpec delta markers
- `docs/interop/eu-ai-act.md` — engineering-narrative mapping of `baseline-log/` + `tasks.yaml` + `verification-matrix.yaml` + `risk-register.md` to EU AI Act Articles 12 / 14 / 17 (non-legal advice)
- `examples/multi-tool-coexistence.md` — Cursor + Claude Code + AI-OS daily flow narrative
- Three new doctor semantic-consistency warnings (W070/W071/W072) and `--strict` upgrades them to errors
- `doctor --json` adds `semantic_warnings[]` field
- Two new problem-ledger entries: PL-008 (cross-tool truth-source confusion), PL-009 (agents reloading artifacts without progressive disclosure)
- Eval frontmatter `trigger_source` + `first_baseline_id` so promoted-from-verification-matrix failure modes can be distinguished from hand-authored ones

### Changed

- `AGENTS.md` (still ≤150 lines) adds two rules: progressive-disclosure layering (L1/L2/L3) under §5; failure-mode promotion threshold (≥3 root-cause hits) in behavior rules
- `docs/artifacts.md` declares `layer` (L1/L2/L3) for every artifact and adds a "progressive disclosure" reference section
- `docs/constitution-spec.md` bumped to v1.2 with non-breaking additions: layer field, agentskills.io wrapping, MCP URI scheme, failure-mode promotion, EU AI Act mapping
- `CLAUDE.md` and `GEMINI.md` IDE pointers thinned to ≤10-line stubs that link to `AGENTS.md` instead of duplicating constitution text (drift-resistant)
- `README.md` first screen adds two short pointers: agentskills.io install and MCP integration; everything else stays minimal

### Tests

- 375 assertions passing (was 245 in v9.0.0). New coverage: artifact layer declarations, SKILL.md spec compliance, MCP URI scheme completeness, doctor W070/W071/W072 trigger conditions, eval frontmatter, interop doc presence, CLAUDE/GEMINI stub-only invariant.

### Migration

None required. v9.0.x → v9.1.0 is additive. Existing repos benefit from the new doctor warnings as soon as they upgrade:

```bash
npx --yes github:royeedai/ai-os doctor . --strict
```

---

## 9.0.0 (2026-04-22) — Default lane reset

**Breaking**. v9 makes **shared root + `.ai-os/lanes/default/`** the only canonical layout. Older root-only or hybrid layouts should run `npx create-ai-os upgrade .`.

### Added

- `docs/migrate-to-v9.md` as the new migration entrypoint
- `doctor --json` layout fields: `layout_version`, `layout_mode`
- AI-OS self-hosted `.ai-os/` updated to the same canonical layout it distributes

### Changed

- Default install now creates:
  - shared root `.ai-os/MISSION.md`
  - shared root `.ai-os/memory.md`
  - `.ai-os/lanes/default/` full current-delivery artifact set
- `doctor` now treats root-only v8 as `root-only-legacy` and root+lane overlap as `hybrid-drift`
- `upgrade` now normalizes v7 legacy, v8 root-only, and v8 hybrid layouts to v9
- `AGENTS.md`, `README.md`, `docs/artifacts.md`, `docs/constitution-spec.md`, `docs/cli.md`, `docs/getting-started.md`, `docs/maintainers.md`, examples, and tests now all point to the same canonical layout
- `PROJECT_PURPOSE.md` current phase updated from v8 to v9

### Removed

- v8 默认 root-only 布局叙事
- `docs/problem-ledger.md` 中已删除 workflow / skill / legacy 命令的"当前覆盖锚点"地位

### Migration

```bash
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os doctor .
```

## 8.0.0 (2026-04-22) — Delivery Constitution refactor

**Breaking**. v8 is a positioning-level refactor, not an incremental upgrade. v7 users: see `docs/migrate-v7-to-v8.md`. Run `npx create-ai-os upgrade .` for mechanical migration. Legacy v7 state tagged as `v7-legacy`.

### Positioning

AI-OS repositioned from "Node.js CLI tool with 15 subcommands + 14 slash commands + skills system" to **"AI Delivery Constitution + 12-artifact set + minimal reference CLI"**. Cross-agent (agents.md open standard), full lifecycle, minimal surface. Sits above harnesses, models, native memory — governs delivery, not execution.

### Added

- `AGENTS.md` (≤150 lines) as the sole Delivery Constitution at project root
- `docs/constitution-spec.md` — AI Delivery Constitution Spec v1.0 for other tools (Kiro, spec-kit, Cursor, Claude Code) to integrate
- `docs/migrate-v7-to-v8.md` — complete v7→v8 migration guide with slash-command-to-behavior-rule mapping
- `bin/ai-os-doctor.js` — unified health check (replaces v7 validate / gate / release-check / status)
- `bin/ai-os-upgrade.js` — mechanical v7→v8 migration: flattens `lanes/default/*` to root, merges CONVENTIONS.md/project.md/acceptance.yaml
- Lightweight `CLAUDE.md` + `GEMINI.md` IDE pointers (≤30 lines each) instead of full session templates

### Changed

- CLI reduced from 15 subcommands to **3**: `install` (default), `doctor`, `upgrade`
- `bin/` from 10,026 lines to **1,258 lines** (-87.5%)
- Artifacts flat under `.ai-os/` by default (no mandatory `lanes/default/`); lanes are optional opt-in for multi-train delivery
- `acceptance.yaml` merged into `DESIGN.md` §13 (verification standards)
- `CONVENTIONS.md` merged into `memory.md` (as conventions + cross-layer contract registry sections)
- `project.md` merged into `MISSION.md` (as "host project context" section)
- `README.md` first screen: 12 artifacts + 3 primary operations + 5 core requirements (no feature parade)
- `PROJECT_PURPOSE.md` updated with 2026 positioning (model self-verification era)

### Removed

- All 12 secondary CLI subcommands: `plan` / `diff` / `lab` / `validate` / `gate` / `skill-check` / `status` / `next` / `resume` / `release-check` / `token-budget` / `cursor-rules` / `lane`
- All 14 slash commands and `framework/.agents/workflows/`: `/align` `/design` `/plan` `/build` `/verify` `/ship` `/change-request` `/debug` `/review` `/postmortem` `/status` `/next` `/resume` `/auto-advance`. Behavior is now **rule-driven via AGENTS.md**, not command-driven.
- Skills system (`framework/.agents/skills/*`) — 10+ skills. AGENTS.md carries the same rules more concisely; native agent skill systems (Cursor, Claude) take over where skills provided modular behavior
- `framework/.agents/policies/`, `framework/.agents/references/`
- 3 install profiles (`quick` / `core` / `project`) — single default form
- Complex IDE auto-generation (`.cursor/rules/*.mdc`, `.cursor/skills/`)
- `manifests/install-profiles.json`
- v7 test suite (replaced with v8-specific tests)
- `docs/evolution/`, `docs/workflows.md`, `docs/skill-tiers.md`, `docs/ai-os-v2-customization-guide.md`
- Most v7 examples (kept 5 canonical narratives: greenfield, brownfield, debug, high-risk, spec-kit coexist)

### Constitution rules carried forward

All five core requirements preserved: **goal confirmation first**, **key design locked first**, **adaptive governance**, **evidence-based completion**, **recoverable project memory**. The constitution delivers the same guarantees via rule-driven behavior instead of command-driven orchestration.

### Migration

```bash
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os doctor .
```

Test suite: 196 assertions passing. Lint: 0 errors, 0 warnings.
