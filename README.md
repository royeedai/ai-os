# AI-OS v8

> AI Delivery Constitution + 12-artifact set + reference CLI. Cross-agent. Full lifecycle. Minimal surface.

```bash
# Install into a new project
npx --yes github:royeedai/ai-os my-project

# Install into an existing repo
npx --yes github:royeedai/ai-os .

# Check health
npx --yes github:royeedai/ai-os doctor .

# Migrate from v7
npx --yes github:royeedai/ai-os upgrade .
```

## What AI-OS is

In 2026, AI coding is no longer bottlenecked by "can the model write code" — frontier models (Opus 4.7, GPT-5.4, Kimi K2.6) pass SWE-bench Verified at 85–90%, run autonomously for 25–52 hours, and self-verify before reporting. The new bottleneck is:

- Has the goal been clearly defined?
- Has the key design been locked?
- Is "completion" proven by evidence, not assertion?
- Can another session pick up where this one left off?

**AI-OS is a cross-agent delivery constitution** that answers those four questions. It is intentionally not an IDE, not a harness, not a skill library, and not an orchestration layer.

## 5-second model

One file (`AGENTS.md`) + twelve artifacts (`.ai-os/...`) + three CLI commands.

```
<your-project>/
  AGENTS.md                          # Delivery constitution (≤150 lines)
  CLAUDE.md, GEMINI.md               # Lightweight pointers (≤30 lines)
  .ai-os/
    MISSION.md                       # Goal + success criteria
    DESIGN.md                        # Key design + acceptance
    STATE.md                         # Session recovery (gitignored)
    memory.md                        # Stable decisions + conventions
    baseline-log/                    # Change and baseline records
    specs/                           # Local contracts
    tasks.yaml                       # Tasks with owners
    risk-register.md                 # High-risk register
    release-plan.md                  # Release plan
    verification-matrix.yaml         # Regression assertions
    design-pack/                     # Reverse-spec parity artifacts
    evals/                           # Project-level failure-mode samples
```

All twelve artifacts are always installed. No profiles. No selection. Agents use only what the task needs.

## Five core requirements (the constitution)

1. **Goal and user confirmation first** — serve the user's real goal, not the tool's defaults
2. **Key design locked before scaling out** — modeling, flows, shared-layer side effects all locked before broad implementation
3. **Adaptive governance** — P0 / P1 / P2 by risk; artifact depth scales with risk, not project type
4. **Evidence-based completion** — four gates (design / logic / implementation / delivery) + parity-gate for reverse-spec
5. **Recoverable project memory** — any session can be resumed from artifacts alone

Full text: [AGENTS.md](AGENTS.md)

## Three CLI commands

| Command | Purpose |
|---|---|
| `create-ai-os [dir]` | Install all 12 artifacts + AGENTS.md into the target |
| `create-ai-os doctor [dir]` | Check artifact completeness and constitution compliance |
| `create-ai-os upgrade [dir]` | Migrate a v7 AI-OS project to v8 |

No slash commands. No profile flags. No skill system. Behavior is rule-driven via `AGENTS.md`. See [docs/cli.md](docs/cli.md).

## How agents use AI-OS

There are no slash commands in v8. When an AI agent opens a project with `AGENTS.md`, it reads the constitution and **routes work by task type**:

| User says | Agent (per constitution) does |
|---|---|
| "Build me a new feature" | Produces `MISSION.md` + `baseline-log/CR-*.md`, waits for confirmation |
| "The requirement changed" | Writes `baseline-log/CR-*.md` impact analysis, updates MISSION/DESIGN, waits for confirmation |
| "Fix this bug" | States root cause + reproduction + files to change, waits for "go" |
| "Is it done?" | Runs project-native static check + regression + evidence checklist; never accepts ReadLints alone |
| "I'm back after a break" | Reads `STATE.md`, reconstructs if missing |

Full behavior rules: [AGENTS.md §3](AGENTS.md).

## How this compares

| | Vibe coding | Spec-Kit | Kiro | Cursor long-running | Claude Code MEMORY | **AI-OS v8** |
|---|---|---|---|---|---|---|
| Goal alignment | — | yes | yes | — | — | yes (constitution) |
| Design lock | — | yes | yes | — | — | yes (constitution) |
| Change management | — | — | — | — | — | yes (`baseline-log/`) |
| Evidence gates | — | — | — | — | — | yes (4 gates + parity) |
| Cross-session recovery | — | — | partial | — | partial | yes (`STATE.md`) |
| Cross-agent | — | yes | no (IDE-bound) | no | no | yes (agents.md standard) |
| Full lifecycle | — | 0→1 only | 0→1 mostly | execution only | memory only | yes (all phases) |

AI-OS occupies a deliberate gap: a cross-agent, full-lifecycle, minimal-surface delivery constitution. It does not compete with harnesses, models, IDEs, or native memory systems — it sits above them.

## When to use each role

- **Fresh project**: install → agent reads AGENTS.md → guides you through MISSION.md → locks DESIGN.md → implements with tasks.yaml → verifies with evidence
- **Existing project**: install → agent reads AGENTS.md + your code → proposes MISSION.md that reflects current state → you confirm → continue
- **Requirement change**: agent writes `baseline-log/CR-*.md` before any code change
- **Bug fix**: agent states root cause + impact before first write
- **Team**: `tasks.yaml` owners + `baseline-log/` timestamp naming + `memory.md` union merge
- **High-risk work**: `risk-register.md` + `release-plan.md` + `verification-matrix.yaml` with real failure-mode guards

## Reverse-spec projects

When you are replicating an existing product, API, or design, populate `.ai-os/design-pack/parity-map.md`. The fifth gate (parity) requires every referenced field, behavior, and contract to have a matching entry.

## Team collaboration

Install auto-configures `.gitignore` and `.gitattributes`:

- `STATE.md` is session-local (gitignored)
- `memory.md` uses union merge
- `baseline-log/` uses per-record timestamp filenames to avoid merge conflicts

Skip team config with `--no-team-config` if you are the only maintainer.

## Multiple parallel delivery lines

If a single project has multiple parallel delivery trains (e.g., separate release cadences), create `lanes/`:

```
.ai-os/
  memory.md              # shared across lanes
  lanes/
    payments/            # manually created lane
      MISSION.md
      DESIGN.md
      ...
```

Manually create the `lanes/` directory when the second train starts. AI-OS v8 does not provide a `lane add` command — lanes are just directories with `lane.toml`. Default single-lane projects do not use `lanes/` at all.

## Migration from v7

v7 is a different design (slash commands, skills, workflows, 15 CLI subcommands, 3 profiles). v8 replaces all of it with rule-driven behavior and 3 CLI commands.

```bash
npx --yes github:royeedai/ai-os upgrade .
```

See [docs/migrate-v7-to-v8.md](docs/migrate-v7-to-v8.md) for the full mapping.

v7 users who prefer the command-driven model can stay on the `v7-legacy` branch.

## Further reading

- [AGENTS.md](AGENTS.md) — the constitution (≤150 lines)
- [PROJECT_PURPOSE.md](PROJECT_PURPOSE.md) — positioning and non-goals
- [docs/constitution-spec.md](docs/constitution-spec.md) — AI Delivery Constitution Spec v1.0
- [docs/artifacts.md](docs/artifacts.md) — 12-artifact schema
- [docs/migrate-v7-to-v8.md](docs/migrate-v7-to-v8.md) — v7 → v8 guide
- [docs/cli.md](docs/cli.md) — CLI reference
- [docs/maintainers.md](docs/maintainers.md) — AI-OS repo maintenance guide

## License

MIT
