# AI-OS × Kiro

> [Kiro](https://kiro.aws) is AWS's spec-driven IDE. It uses **steering files** for long-term project preferences and **EARS-notation specs** under `.kiro/specs/<id>/` for individual modules. AI-OS v9 sits **above** these: steering describes who the project is, AI-OS lane `MISSION.md` describes what is being delivered right now.

## TL;DR

| Project shape | Recommended setup |
|---|---|
| Greenfield AWS-native, Kiro covers the lifecycle | Kiro only; revisit when you need change-management or cross-session recovery |
| Long-lived project, requirements evolve, real debugging | Mode A — Kiro for steering, AI-OS for current delivery |
| Multi-IDE team, Kiro is one of several agents | Mode B — AGENTS.md trunk, Kiro steering links into it |

## Conceptual mapping

| Kiro concept | AI-OS equivalent | Belongs to |
|---|---|---|
| Steering files (`.kiro/steering/*.md`) | root `.ai-os/MISSION.md` + `.ai-os/memory.md` | shared, project-long context |
| `.kiro/specs/<id>/requirements.md` (EARS) | lane `MISSION.md` Section 4 + `lanes/default/specs/*.spec.md` | current delivery baseline |
| `.kiro/specs/<id>/design.md` | lane `DESIGN.md` | current delivery design |
| `.kiro/specs/<id>/tasks.md` | lane `tasks.yaml` | current delivery work breakdown |
| Hooks | Cursor / Codex hooks; AI-OS does not own this layer | execution layer |
| Agent Steering rules | `AGENTS.md` behavior rules | constitution layer |

## Mode A: Kiro for steering, AI-OS for current delivery

When Kiro is the team's primary AI-IDE but the project is brownfield / long-lived:

1. Keep Kiro steering files for **stable, project-long preferences** (architecture choices, code style, region/account constraints)
2. Use AI-OS lane `MISSION.md` / `DESIGN.md` for the **current delivery baseline** that changes per release
3. Reference Kiro steering from `.ai-os/memory.md` so cross-IDE agents see the same rules:

```markdown
## Stable cross-layer contracts (memory.md)

- Region: us-east-1 only (steering: `.kiro/steering/region.md`)
- Auth: Cognito + IAM, no custom JWT (steering: `.kiro/steering/auth.md`)
- DB: DynamoDB single-table design (steering: `.kiro/steering/db.md`)
```

Result: Kiro keeps owning steering; AI-OS owns delivery governance, change management, and cross-session recovery.

## Mode B: AGENTS.md trunk, Kiro contributes

For multi-IDE teams (Kiro + Cursor + Claude Code + Codex):

- `AGENTS.md` is the trunk read by every agent
- Kiro steering complements it for AWS-native preferences but does not contradict it
- AI-OS artifacts handle the lifecycle Kiro does not cover natively (verification matrix, baseline-log, EU AI Act audit trail, multi-lane)

## Artifact coexistence

| Kiro file | AI-OS artifact | Coexistence rule |
|---|---|---|
| `.kiro/steering/*.md` | `.ai-os/memory.md` | steering = stable; AI-OS memory references key decisions, does not duplicate full text |
| `.kiro/specs/<id>/requirements.md` | `.ai-os/lanes/default/specs/<id>.spec.md` (or referenced from `MISSION.md`) | requirements stay in Kiro (EARS notation works there); AI-OS references the path |
| `.kiro/specs/<id>/design.md` | `.ai-os/lanes/default/DESIGN.md` | pick one as the current design source; brownfield → AI-OS lane DESIGN, greenfield → Kiro design |
| `.kiro/specs/<id>/tasks.md` | `.ai-os/lanes/default/tasks.yaml` | pick one; running both diverges quickly |
| Kiro autopilot / agent commands | n/a | execution layer; AI-OS does not own it |
| `.kiro/hooks/*.json` | n/a | recommended: a hook running `npx create-ai-os doctor --strict` |

## Anti-patterns

1. **Two parallel requirement source-of-truths** — `requirements.md` (Kiro) and `MISSION.md` (AI-OS) both claiming authority. Pick one and reference from the other.
2. **Steering file copy of `AGENTS.md`** — steering should be project-long preferences; constitution should stay in `AGENTS.md`. Drift risk otherwise.
3. **Running `/kiro` agent commands plus `baseline-log/CR-*` for the same change** — pick the lifecycle: Kiro for new spec, AI-OS for change request.
4. **Skipping `STATE.md` because Kiro auto-resumes** — Kiro auto-resume is session-level; cross-tool / cross-day recovery still needs `STATE.md`.

## What AI-OS adds that Kiro does not

| Capability | Kiro | AI-OS |
|---|---|---|
| Steering files (long-term prefs) | yes | — |
| EARS-notation requirements | yes | — |
| AWS-native one-click apply | yes | — |
| Cross-IDE portability via `AGENTS.md` | partial | yes |
| Change-management baseline-log | — | yes |
| Verification matrix + parity | — | yes |
| Cross-session recovery anchor | partial | yes (`STATE.md`) |
| Multi-lane delivery | — | yes |
| Doctor (semantic + layout) | — | yes |
| EU AI Act audit-trail framing | — | yes ([eu-ai-act.md](eu-ai-act.md)) |

## Recommended path

1. If the team is new to AI-IDE workflows: start with Kiro for greenfield 0→1
2. When the second module enters maintenance, install AI-OS:

   ```bash
   npx --yes github:royeedai/ai-os .
   ```

3. Move stable conventions to `.ai-os/memory.md`, leaving steering files for AWS-specific preferences
4. Route subsequent change requests through AI-OS `baseline-log/CR-*.md`
5. Use `npx create-ai-os doctor` in CI

## See also

- [spec-kit coexistence](spec-kit-coexistence.md) — same shape as Kiro but for GitHub Spec-Kit
- [OpenSpec coexistence](openspec.md) — when delta-based specs replace EARS
- [AI-OS skill source](../../framework/skills/ai-os-delivery/SKILL.md)
