# AI-OS × Cursor

> Cursor reads `AGENTS.md` natively (since the [Linux Foundation AAIF adoption](https://www.agents.md/) in late 2025) and also supports `.cursor/rules/*.mdc` and `.cursor/skills/*/SKILL.md`. AI-OS keeps the trunk in `AGENTS.md`; Cursor-specific surfaces should be **thin shells** that link back, never copy.

## TL;DR

| Project shape | Recommended setup |
|---|---|
| Cursor only, AI-OS trunk in `AGENTS.md` | Mode A — thin `.cursor/rules/*.mdc` shells |
| Cursor + multi-tool repo | Mode B — `AGENTS.md` plus `agentskills.io`-format SKILL referenced from `.cursor/` |
| Cursor + automated doctor in CI | Mode C — Mode B plus a Cursor hook to run `npx create-ai-os doctor --strict` |

## Mode A: Cursor only, thin rule shells

`.cursor/rules/<name>.mdc` files in Cursor are markdown with YAML frontmatter for trigger conditions. Per the [AI documentation layering rule](../../.cursor/rules/) used by AI-OS itself, each rule file should be:

- Trigger condition (frontmatter)
- One-sentence action
- Link to `AGENTS.md` / `docs/<topic>.md`

**Good** `.cursor/rules/ai-os-delivery.mdc`:

```mdc
---
description: Apply AI-OS delivery constitution on tasks involving AGENTS.md and .ai-os/
globs:
  - "**/*"
alwaysApply: false
---

When the user asks for a feature, change, bug fix, verification, or session
recovery, follow [`AGENTS.md`](mdc:AGENTS.md) and the artifact layout in
[`docs/artifacts.md`](mdc:docs/artifacts.md).
```

**Bad** — copying the five core requirements into `.cursor/rules/*.mdc`. Drift is silent and impossible to spot in code review.

## Mode B: AGENTS.md + skill (cross-tool)

For repos that mix Cursor with Claude Code / Codex / Gemini CLI, install the official AI-OS skill so any spec-aware Cursor flow can pick it up:

```bash
mkdir -p .cursor/skills
cp -R framework/skills/ai-os-delivery .cursor/skills/
```

Cursor will pre-load only the skill metadata. The full body activates on tasks that match the skill description.

`.cursor/rules/*.mdc` continues to act as thin trigger shells. They co-exist with the skill; the rule fires when a glob matches files, the skill fires when the task description matches.

## Mode C: doctor in pre-commit / CI

Cursor supports hooks via `hooks.json`. Add a `pre-commit`-style hook to run AI-OS doctor:

```json
{
  "hooks": [
    {
      "event": "pre-commit",
      "command": "npx --yes github:royeedai/ai-os doctor . --strict"
    }
  ]
}
```

This catches W070-W077 semantic drift before commits land.

## Cursor 2.0+ subagents / cloud agents and AI-OS handoff

Cursor 2.0 (October 2025) introduced cloud agents; 2.4 (January 2026) added subagents with their own context windows; Cursor 3 (April 2026) ships the Agents Window for parallel multi-agent worktree execution. AI-OS v9.4 task handoff fields map cleanly onto these:

| Cursor concept | AI-OS `tasks.yaml` field |
|---|---|
| Subagent invocation (foreground / background) | `handoff_to: "[subagent-name]"` (or `AI` if local) |
| Files / artifacts the subagent should read | `context_refs: [".ai-os/lanes/.../..."]` |
| Subagent return type (PR / log / artifact) | `expected_return: [...]` |
| Cloud agent PR with logs / videos / screenshots | `evidence_produced: [...]` (paths to attached evidence) |
| Plan-mode plan diverged during execution | `deviation_log: [...]` |
| Parallel worktree task family | one AI-OS task per worktree, all sharing `acceptance_refs` |

Cursor's cloud agent PR is the natural carrier for `evidence_produced` — the agent's PR can attach test logs / screenshots / video, which AI-OS lane reviewers copy or reference under `evidence_produced`. **W076** (introduced in v9.4) catches "PR merged but `evidence_produced` empty" before the lane task can be closed.

For inter-agent delegation across non-Cursor runtimes (Claude Managed Agents, Devin, custom A2A executors), see [a2a.md](a2a.md) — the same handoff fields map onto the open A2A wire format.

## Artifact coexistence

| Cursor surface | AI-OS artifact | Rule |
|---|---|---|
| `AGENTS.md` (root) | constitution | trunk; never duplicated elsewhere |
| `.cursor/rules/*.mdc` | trigger shells | 1–3 lines, link only |
| `.cursor/skills/ai-os-delivery/SKILL.md` | open-format wrapper | mirrors AGENTS.md rules per `agentskills.io` |
| `.cursor/notepads/` | session scratchpad | does not replace `STATE.md`; both exist |
| `.cursor/hooks/` | doctor / lint integration | recommended for CI parity |

## Anti-patterns

1. **Long `.cursor/rules/*.mdc` files that re-state the constitution** — every fact lives in exactly one file (per [ai-doc-layering rule](https://docs.cursor.com/) / AI-OS).
2. **Notepads as the only memory** — Cursor notepads are session-local. Cross-session recovery still goes through lane `STATE.md` + `MISSION.md`.
3. **`.cursor/rules/` claiming authority over `AGENTS.md`** — when a `.cursor/rules/*.mdc` and `AGENTS.md` disagree, the trunk wins and the rule shell is broken; fix the shell, not the constitution.
4. **Disabling `AGENTS.md` reading in Cursor settings** — defeats cross-tool portability. If a Cursor-specific tweak is needed, put it in `.cursor/rules/*.mdc` referencing the relevant section of `AGENTS.md`.

## What AI-OS adds that Cursor does not

| Capability | Cursor | AI-OS |
|---|---|---|
| Native AGENTS.md reading | yes | — |
| Per-glob rule scoping | yes | — |
| Notepads (session-level) | yes | — |
| Multi-model routing | yes | — |
| Cross-session recovery anchor | partial (notepads) | yes (`STATE.md`) |
| Change-management baseline-log | — | yes |
| Verification matrix + parity gate | — | yes |
| Cross-IDE portability | partial | yes |
| Doctor (semantic + layout) | — | yes |

## Migration if you currently have a fat `.cursorrules`

1. Move project conventions and AI rules into `AGENTS.md`
2. Reduce `.cursorrules` (or `.cursor/rules/*.mdc`) to trigger shells with links
3. Run `npx create-ai-os .` to add the AI-OS layout
4. Run `npx create-ai-os doctor --strict` to catch any broken references

## See also

- [AI-OS skill source](../../framework/skills/ai-os-delivery/SKILL.md)
- [MCP resources URI scheme](mcp-resources.md)
- [Claude Code coexistence](claude-code.md) for repos using both
