# AI-OS v9

> AI Delivery Constitution + canonical lane-first artifact layout + reference CLI.

```bash
# Install into a new project
npx --yes github:royeedai/ai-os my-project

# Install into an existing repo
npx --yes github:royeedai/ai-os .

# Check health
npx --yes github:royeedai/ai-os doctor .

# Migrate older layouts to v9
npx --yes github:royeedai/ai-os upgrade .
```

## What AI-OS is

AI-OS is a cross-agent delivery constitution for projects that already use AI coding, but need the AI to more reliably do the **right** work:

- clarify the real goal
- lock key design before scaling out implementation
- reverse-spec accessible websites into auditable evidence before rebuild work
- separate observed / confirmed facts from inferred / unknown assumptions
- prove completion with project-level evidence
- recover context across sessions without depending on chat history

It is intentionally **not** an IDE, harness, orchestration layer, or code generator.

## Canonical layout

v9 has one default layout only:

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

## Three primary operations

| Operation | CLI entrypoint | Purpose |
|---|---|
| install | `create-ai-os [dir]` or `create-ai-os install [dir]` | Install AI-OS v9 canonical layout |
| doctor | `create-ai-os doctor [dir]` | Check layout health and constitution compliance |
| upgrade | `create-ai-os upgrade [dir]` | Migrate legacy AI-OS layouts to v9 |

No slash commands. No profile flags. No proprietary AI-OS skill system; the `agentskills.io` wrapper below is an open-standard adapter, not a separate operating surface.

## Why deterministic `doctor` checks instead of prompts

Industry consensus in 2026 (e.g. [anthropics/claude-code RFC #45427](https://github.com/anthropics/claude-code/issues/45427)) is that prompt-style guidance such as `CLAUDE.md` / `.cursor/rules` reaches only ~70% compliance: subagents bypass it, models can rewrite hooks, instructions degrade with context length. Safety-critical boundaries need **deterministic enforcement** — a check whose exit code the model cannot override.

AI-OS uses `doctor` for exactly this. W070-W077 (and `--strict` mode) are deterministic command checks: zero model interpretation, zero prompt re-injection. The same exit code that fails locally fails in pre-commit and in CI:

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
- read `.ai-os/lanes/default/STATE.md` first for current recovery
- read `.ai-os/lanes/default/MISSION.md` for the active delivery baseline
- read `.ai-os/MISSION.md` for shared host-project context

Behavior is rule-driven by task type:

| User says | Agent should do |
|---|---|
| “Build a new feature” | produce / update lane `MISSION.md`, then stop for confirmation |
| “The requirement changed” | write lane `baseline-log/CR-*.md` before code changes |
| “Reverse-spec this URL” | capture screenshots, DOM/CSS, interactions, Network/API observations, and evidence-graded backend behavior into lane artifacts |
| “Fix this bug” | state root cause + scope + files first, then wait for go |
| “Is it done?” | run project-native static check + regression + evidence review |
| “I’m back” | resume from lane `STATE.md` first |

## When to use lanes

You always get `lanes/default/`. Most projects will only ever use that lane.

Create more lanes only when you truly have separate long-lived delivery lines, release trains, or teams working in parallel with different current baselines.

## Migration

```bash
npx --yes github:royeedai/ai-os upgrade .
```

`upgrade` now normalizes legacy layouts to v9:

- v7 legacy
- v8 root-only
- v8 hybrid root+lane drift

See [docs/migrate-to-v9.md](docs/migrate-to-v9.md).

## Cross-agent loading via the `agentskills.io` standard

For agents that prefer the [agentskills.io](https://agentskills.io/specification) skill format (Claude Code, Cursor, Codex, Gemini CLI, ADK, Hermes, ...), AI-OS publishes an official wrapper:

```bash
npx skills add github:royeedai/ai-os
```

This loads `framework/skills/ai-os-delivery/SKILL.md`, which packages the constitution into the open standard. It does not introduce a new command surface — it is a thin wrapper so any spec-compliant agent can pick AI-OS up without per-tool adapters.

## MCP integration

AI-OS artifacts can be exposed as MCP resources via the standard `aios://` URI scheme. See [docs/interop/mcp-resources.md](docs/interop/mcp-resources.md). The default install does not ship or start an MCP server; the integration is a contract document plus an illustrative reference snippet.

## A2A integration

AI-OS v9.4 task handoff fields (and v9.5 `fact_state_review`) map onto the [A2A Protocol v1.0](https://a2a-protocol.org/) `Task` / `Message` / `AgentCard` / `Artifact` objects, so any A2A-compatible runtime can dispatch lane tasks to a remote executor agent without re-inventing field names. See [docs/interop/a2a.md](docs/interop/a2a.md). Same boundary as MCP: AI-OS does not ship or start an A2A server / client.

## Memory tool integration

`.ai-os/memory.md`, lane `STATE.md`, and lane `MISSION.md` can be mounted (read-only) into Anthropic's [Memory tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool) `/memories` directory or projected into a [Memory MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) knowledge graph. AI-OS keeps the markdown as truth source; the memory channel becomes Claude's working notes. See [docs/interop/memory-tool.md](docs/interop/memory-tool.md).

## Further reading

- [AGENTS.md](AGENTS.md)
- [PROJECT_PURPOSE.md](PROJECT_PURPOSE.md)
- [docs/artifacts.md](docs/artifacts.md)
- [docs/cli.md](docs/cli.md)
- [docs/constitution-spec.md](docs/constitution-spec.md)
- [docs/getting-started.md](docs/getting-started.md)
- [docs/reverse-spec-url-intake.md](docs/reverse-spec-url-intake.md)
- [docs/migrate-to-v9.md](docs/migrate-to-v9.md)
- [docs/maintainers.md](docs/maintainers.md)
- [docs/interop/](docs/interop/) — coexistence with spec-kit, Claude Code, Cursor, Kiro, OpenSpec, BMAD, MCP, A2A, Memory Tool, EU AI Act

## License

MIT
