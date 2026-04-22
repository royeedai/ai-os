# CR-20260422-v8-constitution-refactor

- **Type**: change-request (positioning-level)
- **Status**: confirmed
- **Date**: 2026-04-22
- **Summary**: Refactor AI-OS from command-driven tooling (v7) to constitution-driven minimal surface (v8). Replace 15 CLI subcommands and 14 slash commands with 3 CLI commands and rule-driven agent behavior. Preserve all five core requirements and all 12 artifact capabilities.
- **Affects**: `AGENTS.md` (rewrite), `bin/*.js` (12 scripts removed), `framework/.agents/workflows/` (removed), `framework/.agents/skills/` (removed), `README.md` (rewrite), `PROJECT_PURPOSE.md` (rewrite), `docs/*` (substantial restructure), `examples/*` (reduced to 5 narratives), `test/*` (v8 suite), `VERSION` (7.4.0 → 8.0.0), `package.json`
- **Confirmed by**: project owner, 2026-04-22

## 1. Trigger

User asked: "AI is evolving fast, Opus 4.7 released — do we need to adjust the project's direction and core goals?"

After cross-web research on 2026 AI coding landscape (Opus 4.7 self-verification + instruction-literal behavior, Cursor 52h long-running agents, Codex 25h, Kimi K2.6 300 sub-agents, Kiro IDE spec-driven, GitHub spec-kit at v0.7.4, Claude Code `MEMORY.md`, Cursor notepads), the conclusion was:

- Five core requirements remain valid and are **more relevant** in the self-verification era, not less
- But v7's command-driven implementation (15 CLI + 14 slash + skills) is working against model-level capability gains (Opus 4.7 instruction-literal behavior rewards rule-driven over command-driven)
- AI-OS's unique positioning — cross-agent, full-lifecycle, minimal-surface delivery constitution — is in an otherwise empty niche

## 2. Impact analysis

### What changes

- **Positioning**: from "CLI tool" to "AI Delivery Constitution + 12-artifact set + reference implementation"
- **Surface area**: 15 → 3 CLI subcommands; 14 → 0 slash commands; 10+ → 0 skills
- **Code size**: `bin/` 10,026 → 1,258 lines (-87.5%)
- **File count**: ~243 → ~50 repo files after the cut
- **Mental model for users**: memorize 14 slash commands → read one AGENTS.md file

### What does NOT change

- **Five core requirements**: goal first, design lock first, adaptive governance, evidence-based completion, recoverable memory. All preserved verbatim.
- **12-artifact capabilities**: all 12 artifacts still installed by default; no capability regression for brownfield, high-risk, or reverse-spec projects.
- **Zero external dependencies**: still Node.js built-ins only.
- **Team collaboration**: `baseline-log/` timestamp naming, `memory.md` union merge, `tasks.yaml` owner conventions all unchanged.

### Impact by scenario (from earlier discussion with user)

| Scenario | v7 | v8 |
|---|---|---|
| Greenfield + frontier model | Overhead | **Better** (less friction) |
| Brownfield complex change | `specs/` cuts | On par (still have `specs/`) |
| Team collaboration | `lanes/` + owners | On par (lanes optional, owners preserved) |
| High-risk state change | Structured gates | On par (all gates artifact-preserved) |
| Reverse-spec | parity-map | On par (preserved) |
| Weak model (not frontier) | Workflow scaffolding | **Worse** (no external scaffolding) |
| New user onboarding | Complex | **Better** (15 min) |
| Integration with other tools | Hard (IDE-specific) | **Better** (agents.md standard) |

Net assessment: v8 strictly wins on frontier-model + independent-developer scenarios and long-term maintenance; on-par for team / high-risk / brownfield / reverse-spec scenarios when the full artifact set is active; slightly worse only for weaker-model setups (accepted risk, documented in `docs/migrate-v7-to-v8.md`).

## 3. Alternatives considered

### A. Pure minimalism (6 files + 3 CLI, no extensions)

Rejected. Would regress team / high-risk / brownfield scenarios. See user discussion 2026-04-22.

### B. Status quo with better docs

Rejected. Doesn't address the command-driven vs rule-driven mismatch with 2026 frontier models. Keeps compounding complexity.

### C. Chosen: "Minimal operational surface + complete artifact surface"

All 12 artifacts default-installed; operational surface minimized; rule-driven behavior via AGENTS.md. No profile selection, no command memorization.

## 4. Execution summary (3 phases, all complete)

### Phase 1: Specification (docs only)

- Rewrote root `AGENTS.md` to 117 lines — delivery constitution
- Rewrote `PROJECT_PURPOSE.md` with 2026 positioning
- New `docs/constitution-spec.md` v1.0 — integration spec for other tools
- New `docs/migrate-v7-to-v8.md` with slash-to-rule mapping
- Rewrote `docs/artifacts.md` with 12-artifact schema

### Phase 2: Reference implementation

- Deleted 12 CLI scripts + 3 scratch files
- Removed `framework/.agents/workflows/` (14 workflows)
- Removed `framework/.agents/skills/` (10+ skills)
- Removed `framework/.agents/policies/`, `references/`
- Trimmed `framework/.agents/templates/project/` to 12-artifact starters
- Rewrote `bin/shared.js` (3,213 → 430 lines)
- Rewrote `bin/create-ai-os.js` (326 → 180 lines)
- Rewrote `bin/ai-os-doctor.js` (356 → 348 lines; absorbs v7 validate / gate / release-check / status)
- Rewrote `bin/ai-os-upgrade.js` (579 → 300 lines; mechanical v7→v8 migration)
- Bumped `VERSION` to 8.0.0, synced `package.json`

### Phase 3: Docs + examples + tests + release prep

- Rewrote `README.md` (279 → 175 lines) with minimal first-screen
- Rewrote `docs/cli.md` (3 commands)
- Deleted `docs/evolution/`, `docs/workflows.md`, `docs/skill-tiers.md`, `docs/ai-os-v2-customization-guide.md`
- Rewrote `docs/getting-started.md`, `docs/problems.md`, `docs/interop/spec-kit-coexistence.md`
- Trimmed `examples/` from 17 files + 9 dirs to 5 narrative examples
- Trimmed `evals/` (removed 2 lane-specific evals, rewrote README)
- Replaced v7 test suite with v8 suite (196 assertions, all passing)
- ESLint zero errors, zero warnings
- Tagged legacy state as `v7-legacy`
- Updated `CHANGELOG.md` with v8.0.0 entry

## 5. Confirmation gate

This CR is the AI-OS v8 baseline. Subsequent requirement changes go through new `baseline-log/CR-*.md` entries, not through rewriting this CR or `MISSION.md`.

## 6. Rollback path

If v8 fails to meet its positioning goals:

- `git checkout v7-legacy` restores the v7.4.0 state
- `v7-legacy` branch stays available as a long-term alternative
- Users can run `npx create-ai-os upgrade .` to go v7→v8, or stay on v7 indefinitely

## 7. Open items for future baselines

- Monitor adoption and feedback within 30 days
- If integration partners (Kiro, spec-kit, Cursor, Claude Code) adopt `docs/constitution-spec.md`, consider v8.1 minor to formalize extension points
- If a weaker-model ecosystem demands command scaffolding, consider optional `docs/command-aliases.md` that maps behavior rules to slash commands for compatibility
