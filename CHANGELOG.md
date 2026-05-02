# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)：

- **patch** (x.y.z)：bugfix、文案修正、文档补全、测试与治理收口
- **minor** (x.y.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

This file only tracks v8 and v9 releases (the supported lines as of v9.3). For v5.x – v7.x history, see [CHANGELOG-archive.md](CHANGELOG-archive.md).

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
