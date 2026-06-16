# Example: Multi-tool coexistence (Cursor + Claude Code + AI-OS)

Scenario: a small team uses **Cursor** for daily editing (autocomplete, multi-file refactor via Composer), **Claude Code** in a terminal pane for deep refactors and architectural plans, and wants both agents to follow one delivery discipline. AI-OS provides the trunk; each tool gets a thin shell.

## 0. Install

```bash
cd my-app
npx --yes github:royeedai/ai-os#v10.3.0 .
```

Result:

- `AGENTS.md` at repo root (read by Cursor natively; pointed to by Claude Code via `CLAUDE.md`)
- `CLAUDE.md` thin stub (≤10 lines) pointing at `AGENTS.md`
- `GEMINI.md` thin stub (in case anyone uses Gemini CLI)
- Shared root `.ai-os/MISSION.md` + `.ai-os/memory.md`
- `.ai-os/bin/` committed local doctor entry (every teammate + CI runs doctor offline)
- `.ai-os/lanes/default/` full starter set

## 1. Cursor side: trigger shells, not duplicate rules

Add `.cursor/rules/ai-os-delivery.mdc` (only if you want a project-scoped rule beyond the AGENTS.md auto-load):

```mdc
---
description: AI-OS delivery routing
globs:
  - "**/*"
alwaysApply: false
---

When the user asks for a feature, change, bug fix, verification, or
session recovery, follow [`AGENTS.md`](mdc:AGENTS.md) and the artifact
layout in [`docs/artifacts.md`](mdc:docs/artifacts.md).
```

This is a thin shell. Cursor's auto-loader still reads `AGENTS.md`; the rule just adds a glob trigger. Do not copy the constitution body here — drift risk.

Optional: load the AI-OS skill via the agentskills.io standard:

```bash
npx skills add github:royeedai/ai-os#v10.3.0
```

## 2. Claude Code side: skill + thin stub

The default install already wrote a thin `CLAUDE.md` stub. To also load the constitution as a skill (Claude Code v0.7+):

```bash
npx skills add github:royeedai/ai-os#v10.3.0
```

When Claude Code starts, it pre-loads only the skill `name` + `description`. The body activates when the task description matches.

## 3. Daily flow

### Cursor: implementing a confirmed task

You ask Cursor:

> "Add a 'mute notifications' switch on the settings page. Plan from `.ai-os/lanes/default/tasks.yaml` task TASK-AI-014."

Cursor reads `AGENTS.md` plus the matching task entry. It edits files and runs Composer. Because the task is already in `tasks.yaml` with confirmed AC, this is implementation work — no design stop needed.

### Claude Code: handling a multi-file refactor

You open Claude Code in a terminal:

> "Refactor the notifications module to use the new event bus. Walk me through the impact first."

Claude Code reads `CLAUDE.md` → `AGENTS.md` → lane `STATE.md` → lane `MISSION.md`. Per AGENTS.md "implementation 阶段" rule:

> 跨多文件或边界不清时先只读分析

Claude Code returns a read-only impact report listing every file that touches the notifications module, the schema/route/wrapper parity check, and stops. Asks for confirmation before editing.

### Multi-tool change request

A new requirement comes in: "Add daily-digest emails."

Whichever tool you talk to first writes `.ai-os/lanes/default/baseline-log/CR-20260506-093000-daily-digest.md` and stops. The other tool, when it opens later, reads:

1. `STATE.md` (where the work paused)
2. `baseline-log/CR-20260506-093000-daily-digest.md` (the impact analysis)
3. lane `MISSION.md` (delivery baseline)

Both tools see the same baseline. No drift.

## 4. CI parity (recommended)

Both tools share the same CI gate:

```yaml
# .github/workflows/ai-os.yml
# .ai-os/bin/ is committed, so CI runs doctor offline — no install, no network.
- name: Doctor
  run: node .ai-os/bin/ai-os-doctor.js . --strict
```

`--strict` catches the W070-W078 semantic warnings, for example:

- W070: orphan baseline references (someone updated `MISSION.md` but didn't commit the matching `baseline-log/CR-*.md`)
- W071: tasks without owner (forgot to attribute who's doing what)
- W072: AC not covered by `verification-matrix.yaml` (design ratified but verification not wired up)
- W074 / W076 / W077 / W078: high-risk artifacts, handoff evidence, fact-state review, and long-horizon agent review

## 5. Cross-session recovery (different agent than yesterday)

Day 1, Cursor edits stop mid-task. `STATE.md` reads:

```markdown
# Lane State

- Current position: implementing TASK-AI-014 (mute notifications), 60% complete
- Pending confirmations: copy text for tooltip
- Next step: complete tooltip copy + run e2e
```

Day 2, you open Claude Code instead. Claude Code reads `STATE.md` first (per AGENTS.md §5 progressive-disclosure rule), recognizes there is in-flight work, asks the user about the tooltip copy, and resumes. No "where were we" round.

## 6. Anti-patterns (avoid)

- **Putting different rules in `CLAUDE.md` vs `AGENTS.md`**: drift becomes silent. Always link CLAUDE.md to AGENTS.md as a stub.
- **Letting Cursor `notepads` replace `STATE.md`**: notepads are session-local. Cross-session recovery still goes through `STATE.md`.
- **Loading a stale AI-OS skill copy in one tool while another tracks a newer AGENTS.md**: keep one canonical AGENTS.md trunk; both surfaces should track the same content via reference.
- **Two CRs for the same change** because Cursor wrote one and Claude Code wrote another: the second tool to act should append to the existing CR (or write a `BL-` baseline that subsumes it), not write a parallel CR.

## 7. What each tool owns vs. what AI-OS owns

| Concern | Cursor | Claude Code | AI-OS |
|---|---|---|---|
| Autocomplete + IDE ergonomics | yes | — | — |
| Terminal-native multi-file refactor | — | yes | — |
| Project rules / skills format | thin shell | thin stub | constitution + skill source |
| Notepads / session memory | yes | yes (`/memory`) | — |
| Cross-session recovery | partial | partial | yes (`STATE.md`) |
| Change-management baseline-log | — | — | yes |
| Verification matrix + parity | — | — | yes |
| Doctor / CI gate | — | — | yes |

Both tools converge on AI-OS for "what is the next correct delivery step", and stay specialized in their respective execution strengths.

## See also

- [docs/interop/cursor.md](../docs/interop/cursor.md)
- [docs/interop/claude-code.md](../docs/interop/claude-code.md)
- [docs/interop/mcp-resources.md](../docs/interop/mcp-resources.md) — protocol-level access for non-filesystem agents
