# AI-OS × Claude Code

> Claude Code is Anthropic's terminal-native agent. As of March 2026 it does **not** auto-load `AGENTS.md`; it reads `CLAUDE.md` plus `agentskills.io`-format skills under `.claude/skills/` or `~/.claude/skills/`. AI-OS keeps the constitution open via `AGENTS.md`, plus a thin `CLAUDE.md` stub and the official [`ai-os-delivery` skill](../../framework/skills/ai-os-delivery/SKILL.md) so Claude Code can pick it up natively.

## TL;DR

| Project shape | Recommended setup |
|---|---|
| Single-tool repo, Claude Code is the only agent | Mode A (CLAUDE.md stub only) |
| Multi-tool repo, Claude Code + Cursor/Codex/Gemini | Mode B (AGENTS.md + lightweight CLAUDE.md stub) |
| Want full progressive disclosure | Mode C (Mode B + install AI-OS skill) |

## Mode A: CLAUDE.md as the only entry

If Claude Code is the only agent, the constitution still lives in `AGENTS.md` for portability, and `CLAUDE.md` is a thin stub:

```markdown
# Claude Code

This project follows AI-OS. See `AGENTS.md` for the delivery constitution.

1. Read `AGENTS.md` and run its Activation Gate first.
2. Ordinary conversation: answer directly; do not read or write `.ai-os/lanes/*`.
3. Delivery-affecting work: read `.ai-os/lanes/default/STATE.md`, then lane and root `.ai-os/MISSION.md`.
```

`create-ai-os` writes this `CLAUDE.md` stub by default; remove it with `--no-ide-files` if you don't use Claude Code.

## Mode B: AGENTS.md + CLAUDE.md stub (cross-tool)

For repos where Claude Code coexists with Cursor / Codex / Gemini CLI / VS Code Copilot:

- `AGENTS.md` — single source of truth (read by everyone except Claude Code as of March 2026)
- `CLAUDE.md` — thin stub pointing back to `AGENTS.md`; do NOT duplicate constitution content here
- `.ai-os/` — full artifact set per [docs/artifacts.md](../artifacts.md)

When Anthropic ships native `AGENTS.md` support (open feature request), the `CLAUDE.md` stub becomes optional.

## Mode C: install AI-OS as a Claude Code skill

`framework/skills/ai-os-delivery/SKILL.md` follows the [agentskills.io spec v1.0](https://agentskills.io/specification). Install it project-locally:

```bash
npx skills add github:royeedai/ai-os
```

This loads `framework/skills/ai-os-delivery/SKILL.md` into your skill manager. If you have vendored the repo, you can instead copy `framework/skills/ai-os-delivery` into `.claude/skills/` manually.

When the skill is active, Claude Code:

1. Pre-loads only the `name` + `description` (~100 tokens) at startup
2. Loads the full SKILL body when a task matches the description
3. Pulls in artifact-specific files (MISSION, DESIGN, STATE, ...) only as needed via `bash` / `Read`

This is the closest thing to "AI-OS as a runtime extension" without giving up portability.

## Global `~/.claude/CLAUDE.md` vs project `CLAUDE.md` stub

Claude Code reads two `CLAUDE.md` files, and they serve opposite layers:

- **`~/.claude/CLAUDE.md`** (home dir, global): developer-level memory — "how *I* work" across every project (language / toolchain / style / communication preferences). It follows your OS user, never enters any project git, and is hand-curated by you. AI-OS does not own this layer (see [standards-map.md](standards-map.md)).
- **Project root `CLAUDE.md`** (in repo): a ≤10-line stub that points back to `AGENTS.md` and `.ai-os/`. It enters git and is shared with contributors; it must not duplicate constitution content.

Keep project facts (stable decisions, conventions, cross-layer contracts) in `.ai-os/memory.md`, not in your global `~/.claude/CLAUDE.md` — otherwise they only exist on your machine and are lost when you switch computers or hand off to another contributor.

## Artifact coexistence

| Claude Code surface | AI-OS artifact | Notes |
|---|---|---|
| `~/.claude/CLAUDE.md` (global) | n/a — developer-level memory | per-developer / per-machine preferences; see [standards-map.md](standards-map.md) |
| `CLAUDE.md` (project root) | references `AGENTS.md` | stub only; no duplicate constitution |
| `.claude/skills/ai-os-delivery/SKILL.md` | mirrors AI-OS rules in `agentskills.io` format | Mode C only |
| `.claude/commands/<x>.md` | n/a | repo-specific user commands stay separate; do not encode AI-OS rules here |
| Memory mode (`/memory`) | references `.ai-os/memory.md` | session-level Anthropic memory complements project-level AI-OS memory |
| Subagents | `.ai-os/lanes/<lane>/MISSION.md` per agent | one subagent per lane is fine for parallel deliveries |

## Anti-patterns

1. **Copying constitution text into `CLAUDE.md`** — any drift becomes silent. Always link back to `AGENTS.md`.
2. **Letting Claude `/memory` replace lane `STATE.md`** — Claude memory is session-local; `STATE.md` is the cross-session recovery anchor. Keep both.
3. **Encoding AI-OS rules into `.claude/commands/`** — slash commands are imperative; AI-OS is rule-driven. Use the skill or `AGENTS.md`.
4. **Running Claude Code skill plus `.cursor/rules/` plus a Codex `AGENTS.override.md` with three different versions of the rules** — pick `AGENTS.md` as the trunk and have all surfaces link, not duplicate.

## Doctor as cross-IDE deterministic guard

Claude Code hooks (especially [deterministic command hooks](https://platform.claude.com/docs/en/agent-sdk/hooks)) are the recommended way to enforce safety boundaries because prompts are advisory and only ~70% reliable in practice (per [RFC #45427](https://github.com/anthropics/claude-code/issues/45427) and the 2026 hooks-vs-prompts consensus). AI-OS `doctor --strict` is the **cross-IDE equivalent**: the same warnings (W070-W078) that Claude Code can wrap as a `pre-tool-use` hook also run as a one-line shell command in Cursor's `hooks.json`, in `lefthook` / `pre-commit`, in GitHub Actions, or simply as a manual check.

| Surface | Setup |
|---|---|
| Claude Code | `pre-tool-use` hook calling `npx --yes github:royeedai/ai-os doctor . --strict` |
| Cursor | `.cursor/hooks.json` with the same command (see [cursor.md](cursor.md)) |
| Local pre-commit | `lefthook` / `pre-commit` running `npx ... doctor --strict` |
| CI | GitHub Action step running the same command |

The exit code is the contract; AI-OS does not depend on model self-policing. This sidesteps the [hook-bypass failure modes documented in 2026 RFCs](https://github.com/anthropics/claude-code/issues/45427) (subagent bypass, silent hook failure, model self-modification, alternative tool paths, CLAUDE.md non-compliance).

## What AI-OS adds that Claude Code does not

| Capability | Claude Code | AI-OS |
|---|---|---|
| Session-level memory | yes (`/memory`) | — |
| Tool restrictions per skill | yes (`allowed-tools`) | — |
| Cross-session recovery anchor | partial (memory) | yes (`STATE.md`) |
| Change-management baseline-log | — | yes |
| Verification matrix + parity gate | — | yes |
| Cross-IDE portability | — | yes (`AGENTS.md` + `agentskills.io`) |
| Multi-lane delivery model | — | yes |
| Default `doctor` health check | — | yes |

## When the install changes

`create-ai-os` writes `CLAUDE.md` as a lightweight pointer by default. The stub is short (≤10 lines, no rule duplication) so it remains pure routing. To skip:

```bash
npx --yes github:royeedai/ai-os --no-ide-files
```

## See also

- [Skill source](../../framework/skills/ai-os-delivery/SKILL.md)
- [MCP resources](mcp-resources.md) for protocol-level access (when remote/non-filesystem agents read AI-OS artifacts)
- [spec-kit coexistence](spec-kit-coexistence.md) for 0→1 followed by AI-OS governance
- [standards-map.md](standards-map.md) for the global `~/.claude/CLAUDE.md` vs project stub split
