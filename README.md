# AI-OS

> AI Delivery Constitution + canonical lane-first artifact layout + reference CLI.

```bash
# Install into a new project (pin a release: reproducible + cache-friendly)
npx --yes github:royeedai/ai-os#v11.0.0 my-project

# Install into an existing repo
npx --yes github:royeedai/ai-os#v11.0.0 .

# Check health — runs locally with zero network after install
node .ai-os/bin/ai-os-doctor.js .
```

> After the one-time install, `doctor` lives at `.ai-os/bin/` (committed). Daily
> runs, IDE hooks, and CI use the local entry above and make **no external
> request**. Only the first install needs the network.

## What AI-OS is

Frontier models already self-verify code well. The remaining delivery failures are mostly **wrong goal, unlocked design, missing evidence, and lost context** — not "the model cannot write the function." AI-OS targets that layer.

AI-OS is a cross-agent delivery constitution for projects that already use AI coding, but need the AI to more reliably do the **right** work:

- clarify the real goal and restate it back for confirmation
- lock key design before scaling out implementation
- prove completion with project-level evidence, split into code / data / runtime status
- recover context across sessions without depending on chat history

AI-OS does not ban frameworks such as Spring, Vue, React, or uni-app; it requires agents to make framework magic, global mechanisms, implicit state, and high-risk state flows explicit before changing them.

It is intentionally **not** an IDE, harness, orchestration layer, runtime runner, agent router, or code generator.

## Canonical layout

There is one default layout. The default install contains only the **core artifacts**:

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
        tasks.yaml
```

Root `.ai-os/MISSION.md` is the **shared host-project context**.  
`.ai-os/lanes/default/MISSION.md` is the **current delivery baseline**.

**On-demand artifacts** are created by the agent when their trigger condition is hit, never installed by default (schemas in [docs/artifacts.md](docs/artifacts.md)):

| Artifact | Created when |
|---|---|
| `risk-register.md` + `release-plan.md` | work enters the high-risk tier |
| `verification-matrix.yaml` | a stable failure mode / regression guard is registered |
| `specs/` | a large project needs DESIGN split into local contracts |
| `design-pack/` | reverse-spec work needs parity evidence |
| `evals/` | the same failure root cause is hit ≥3 times |

## Five core requirements

1. Goal and user confirmation first
2. Key design and logic locked before scale-out
3. Adaptive governance by risk and ambiguity
4. Evidence-based completion
5. Recoverable project memory

Installed-project constitution source: [framework/.agents/templates/root/AGENTS.md](framework/.agents/templates/root/AGENTS.md)

This repository's own root [AGENTS.md](AGENTS.md) is only a maintainer guard for the AI-OS source repo; it is not the constitution installed into downstream projects.

## Two primary operations

| Operation | CLI entrypoint | Purpose |
|---|---|---|
| install | `create-ai-os [dir]` or `create-ai-os install [dir]` | Install the AI-OS canonical layout |
| doctor | `create-ai-os doctor [dir]` | Check layout health and constitution compliance |

No slash commands. No profile flags. No proprietary AI-OS skill system; the `agentskills.io` wrapper below is an open-standard adapter, not a separate operating surface.

## Why deterministic `doctor` checks instead of prompts

Stronger models improve single-shot compliance, but prompt-style guidance still reaches only partial compliance and cannot enforce project-level contracts by itself. Safety-critical boundaries need **deterministic enforcement** — a check whose exit code the model cannot override.

AI-OS uses `doctor` for exactly this: structural layout checks plus two semantic warnings (W070 baseline consistency, W071 task ownership). The same local command can be wired into pre-commit, CI, or IDE hooks. All runs use the committed local entry, so they run offline:

```bash
node .ai-os/bin/ai-os-doctor.js . --strict
```

| Surface | One-line setup |
|---|---|
| Claude Code | `pre-tool-use` hook calling the command above |
| Cursor | `.cursor/hooks.json` with the same command (see [docs/interop.md](docs/interop.md)) |
| Codex / Gemini / shell agents | run the same local command before claiming completion |
| Local pre-commit / CI | `lefthook` / `pre-commit` / GitHub Action step running the same command |

## How agents use AI-OS

There are no slash commands. When an AI agent opens an installed project with `AGENTS.md`, it should:

- read `AGENTS.md`
- run the Activation Gate before loading lane artifacts
- for delivery-affecting work, read `.ai-os/lanes/default/STATE.md` first for current recovery
- then read `.ai-os/lanes/default/MISSION.md` for the active delivery baseline and `.ai-os/MISSION.md` for shared host-project context

AI-OS artifact governance applies to delivery-affecting work: code or project artifact edits, feature work, requirement changes, bug fixes, verification, shipping, session recovery, and high-risk actions. It does not apply to ordinary conversation, brainstorming, explanation, learning questions, temporary commands, or non-repo tasks.

Behavior is rule-driven by task type:

| User says | Agent should do |
|---|---|
| "Just discuss / brainstorm / explain" | answer directly; do not read or write lane artifacts |
| "Build a new feature" | produce / update lane `MISSION.md`, restate goal / main flow / state transitions / exception paths, then stop for confirmation |
| "The requirement changed" | write lane `baseline-log/CR-*.md` before code changes |
| "Build this UI / page" | determine UI source first: design-led, component-first, existing-style, or hybrid; use existing or stack-appropriate components before custom UI |
| "Fix this bug" | state root cause + scope + files first; if the user already asked to fix and scope is clear, continue within that scope |
| "Is it done?" | run project-native static check + regression + evidence review |
| "I'm back" | resume from lane `STATE.md` first |

## When to use lanes

You always get `lanes/default/`. Most projects will only ever use that lane.

Create more lanes only when you truly have separate long-lived delivery lines, release trains, or teams working in parallel with different current baselines.

## Cross-agent loading via the `agentskills.io` standard

For agents that prefer the [agentskills.io](https://agentskills.io/specification) skill format (Claude Code, Cursor, Codex, Gemini CLI, ...), AI-OS publishes an official wrapper:

```bash
npx skills add github:royeedai/ai-os#v11.0.0
```

This loads `framework/skills/ai-os-delivery/SKILL.md`, which packages the constitution into the open standard. To stay fully offline after cloning, copy `framework/skills/ai-os-delivery` into `.claude/skills/` or `.cursor/skills/` instead of fetching.

## Interop

Coexistence with Cursor, Claude Code, Spec-Kit / Kiro / OpenSpec, Product Design, and MCP (`aios://` URI contract) is documented in a single file: [docs/interop.md](docs/interop.md). AI-OS does not ship servers, clients, or runtimes for any of these — only field mappings and single-truth-source rules.

## Framework feedback loop

AI-OS iterates from "modifications proposed after the first AI-OS delivery that were preventable in the first session". The loop is **installed-project artifacts + explicit maintainer review only**, no telemetry:

- Each `baseline-log/CR-*.md` carries a `## Preventability review` section (`Preventable: yes / no / partial` + root cause + suggested guard).
- A lane closing out aggregates findings into a `BL-*-retrospective*.md`.
- The AI-OS repo does not commit its own `.ai-os/` lane state; recurring feedback is promoted from installed projects, issues, docs tests, and evals.
- Optional feedback path: file an issue with the `framework-feedback` label using [`.github/ISSUE_TEMPLATE/preventable-modification.md`](.github/ISSUE_TEMPLATE/preventable-modification.md). See [`docs/maintainers.md`](docs/maintainers.md) for the merge flow.

## Further reading

- [Distributed AGENTS template](framework/.agents/templates/root/AGENTS.md)
- [PROJECT_PURPOSE.md](PROJECT_PURPOSE.md)
- [docs/artifacts.md](docs/artifacts.md)
- [docs/cli.md](docs/cli.md)
- [docs/getting-started.md](docs/getting-started.md)
- [docs/maintainers.md](docs/maintainers.md)
- [docs/interop.md](docs/interop.md)

## License

MIT
