# AI-OS

> AI Delivery Constitution + canonical lane-first artifact layout + reference CLI.

```bash
# Install into a new project
npx --yes github:royeedai/ai-os my-project

# Install into an existing repo
npx --yes github:royeedai/ai-os .

# Check health
npx --yes github:royeedai/ai-os doctor .
```

## What AI-OS is

In the GPT-5.5 / Opus 4.8 era, frontier models already self-verify code well. The remaining delivery failures are mostly **wrong goal, unlocked design, missing evidence, and lost context** — not "the model cannot write the function." AI-OS targets that layer.

AI-OS is a cross-agent delivery constitution for projects that already use AI coding, but need the AI to more reliably do the **right** work:

- clarify the real goal
- lock key design before scaling out implementation
- reverse-spec accessible websites into auditable evidence before rebuild work
- separate observed / confirmed facts from inferred / unknown assumptions
- review long-running, background, external, or parallel agent work before accepting it
- prove completion with project-level evidence
- recover context across sessions without depending on chat history

It is intentionally **not** an IDE, harness, orchestration layer, runtime runner, agent router, or code generator.

## Canonical layout

There is one default layout:

```text
<project-root>/
  AGENTS.md
  .ai-os/
    MISSION.md
    memory.md
    framework.toml
    managed-files.tsv
    lanes/
      default/
        lane.toml
        MISSION.md
        DESIGN.md
        STATE.md
        baseline-log/
        specs/
        tasks.yaml
        risk-register.md
        release-plan.md
        verification-matrix.yaml
        design-pack/
          parity-map.md
        evals/
```

Root `.ai-os/MISSION.md` is the **shared host-project context**.  
`.ai-os/lanes/default/MISSION.md` is the **current delivery baseline**.

## Five core requirements

1. Goal and user confirmation first
2. Key design and logic locked before scale-out
3. Adaptive governance by risk and ambiguity
4. Evidence-based completion
5. Recoverable project memory

Full text: [AGENTS.md](AGENTS.md)

## Two primary operations

| Operation | CLI entrypoint | Purpose |
|---|---|---|
| install | `create-ai-os [dir]` or `create-ai-os install [dir]` | Install the AI-OS canonical layout |
| doctor | `create-ai-os doctor [dir]` | Check layout health and constitution compliance |

No slash commands. No profile flags. No proprietary AI-OS skill system; the `agentskills.io` wrapper below is an open-standard adapter, not a separate operating surface.

## Why deterministic `doctor` checks instead of prompts

Stronger models improve single-shot compliance, but they still bypass subagent rules, degrade with context length, and cannot enforce project-level contracts by themselves. Industry consensus in 2026 (e.g. [anthropics/claude-code RFC #45427](https://github.com/anthropics/claude-code/issues/45427)) is that prompt-style guidance such as `CLAUDE.md` / `.cursor/rules` reaches only ~70% compliance. Safety-critical boundaries need **deterministic enforcement** — a check whose exit code the model cannot override.

AI-OS uses `doctor` for exactly this. W070-W078 (and `--strict` mode) are deterministic structural checks for layout health, ownership, evidence loops, and high-risk completeness — not "teach the model how to think." The same exit code that fails locally fails in pre-commit and in CI:

| Surface | One-line setup |
|---|---|
| Claude Code | `pre-tool-use` hook calling `npx --yes github:royeedai/ai-os doctor . --strict` |
| Cursor | `.cursor/hooks.json` with the same command (see [docs/interop/cursor.md](docs/interop/cursor.md)) |
| Local pre-commit | `lefthook` / `pre-commit` running `npx ... doctor --strict` |
| CI | GitHub Action step running the same command |

This makes AI-OS the cross-IDE equivalent of a Claude Code deterministic command hook: same enforcement guarantee (100% or it fails), but portable to Cursor, Codex, Gemini CLI, and any other agent with shell access.

## How agents use AI-OS

There are no slash commands in v9. When an AI agent opens a repo with `AGENTS.md`, it should:

- read `AGENTS.md`
- run the Activation Gate before loading lane artifacts
- for delivery-affecting work, read `.ai-os/lanes/default/STATE.md` first for current recovery
- then read `.ai-os/lanes/default/MISSION.md` for the active delivery baseline and `.ai-os/MISSION.md` for shared host-project context

AI-OS artifact governance applies to delivery-affecting work: code or project artifact edits, feature work, requirement changes, bug fixes, verification, shipping, session recovery, URL reverse-spec intake, and high-risk actions. It does not apply to ordinary conversation, brainstorming, explanation, learning questions, temporary commands, or non-repo tasks.

Behavior is rule-driven by task type:

| User says | Agent should do |
|---|---|
| “Just discuss / brainstorm / explain” | answer directly; do not read or write lane artifacts |
| “Build a new feature” | produce / update lane `MISSION.md`, then stop for confirmation |
| “The requirement changed” | write lane `baseline-log/CR-*.md` before code changes |
| “Reverse-spec this URL” | capture screenshots, DOM/CSS, interactions, Network/API observations, and evidence-graded backend behavior into lane artifacts |
| “Delegate this to a background / cloud / PR agent” | record `agent_run_review` run refs, write scope, return packet, evidence, and human review before closing |
| “Fix this bug” | state root cause + scope + files first, then wait for go |
| “Is it done?” | run project-native static check + regression + evidence review |
| “I’m back” | resume from lane `STATE.md` first |

## When to use lanes

You always get `lanes/default/`. Most projects will only ever use that lane.

Create more lanes only when you truly have separate long-lived delivery lines, release trains, or teams working in parallel with different current baselines.

## Cross-agent loading via the `agentskills.io` standard

For agents that prefer the [agentskills.io](https://agentskills.io/specification) skill format (Claude Code, Cursor, Codex, Gemini CLI, ADK, Hermes, ...), AI-OS publishes an official wrapper:

```bash
npx skills add github:royeedai/ai-os
```

This loads `framework/skills/ai-os-delivery/SKILL.md`, which packages the constitution into the open standard. It does not introduce a new command surface — it is a thin wrapper so any spec-compliant agent can pick AI-OS up without per-tool adapters.

## MCP integration

AI-OS artifacts can be exposed as MCP resources via the standard `aios://` URI scheme. See [docs/interop/mcp-resources.md](docs/interop/mcp-resources.md). The default install does not ship or start an MCP server; the integration is a contract document plus an illustrative reference snippet.

## Open standards map

A2A task delegation, Memory tool mounts, BMAD / OpenSpec / Kiro coexistence, EU AI Act audit framing, developer-global memory, and long-horizon agent surfaces are documented in one wire-format map: [docs/interop/standards-map.md](docs/interop/standards-map.md). AI-OS does not ship servers or clients for any of these — only field mappings and single-truth-source rules.

## Framework feedback loop (v9.7+)

AI-OS itself iterates from "modifications proposed after the first AI-OS delivery that were preventable in the first session". The loop is **artifact + git only**, no telemetry:

- Each `baseline-log/CR-*.md` carries a `## Preventability review` section (`Preventable: yes / no / partial` + root cause + maps-to + suggested guard).
- A lane closing out aggregates findings into a `BL-*-retrospective*.md`.
- Maintainer dogfooding via `git grep` — not doctor soft checks (v9.8+ removed W079a/b as redundant with stronger models + template schema).

Optional feedback path: file an issue with the `framework-feedback` label using [`.github/ISSUE_TEMPLATE/preventable-modification.md`](.github/ISSUE_TEMPLATE/preventable-modification.md) and paste your CR's section verbatim. The AI-OS maintainer merges recurring root causes into [`docs/problem-ledger.md`](docs/problem-ledger.md) (PL-012) and tightens AGENTS.md / artifact templates / doctor in the next minor. See [`docs/maintainers.md`](docs/maintainers.md#framework-feedback-复盘) for the merge flow.

## Further reading

- [AGENTS.md](AGENTS.md)
- [PROJECT_PURPOSE.md](PROJECT_PURPOSE.md)
- [docs/artifacts.md](docs/artifacts.md)
- [docs/cli.md](docs/cli.md)
- [docs/constitution-spec.md](docs/constitution-spec.md)
- [docs/getting-started.md](docs/getting-started.md)
- [docs/reverse-spec-url-intake.md](docs/reverse-spec-url-intake.md)
- [docs/maintainers.md](docs/maintainers.md)
- [docs/interop/](docs/interop/) — spec-kit, Claude Code, Cursor, MCP (`aios://`), and [standards-map](docs/interop/standards-map.md) (A2A, Memory tool, BMAD, OpenSpec, Kiro, EU AI Act, long-horizon agents)

## License

MIT
