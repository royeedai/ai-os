# AI-OS × Anthropic Memory Tool / Memory MCP

> [Anthropic Memory tool](https://docs.claude.com/en/docs/agents-and-tools/tool-use/memory-tool) (client-side `/memories` directory, ZDR-eligible) and the [Memory MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) (knowledge-graph JSONL store) give Claude cross-session recall. AI-OS already keeps recoverable memory in repo files (`.ai-os/memory.md`, lane `STATE.md`, lane `MISSION.md`). This document is the **wire-format mapping** so Memory-tool / Memory-MCP users can mount AI-OS artifacts as memory directories without losing the v9 progressive-disclosure layering.

## Status

- Anthropic Memory tool became GA in the Claude API in October 2025; Anthropic Managed Agents (April 2026) added workspace-scoped persistent memory directories on top.
- AI-OS itself does **not** ship a Memory tool client / Memory MCP server. v9 keeps the CLI to three primary product operations (`install` / `doctor` / `upgrade`) and zero runtime dependencies.
- This document is the **wire-format contract**. It says how to mount `.ai-os/memory.md`, lane `STATE.md`, and lane `MISSION.md` into a Memory-tool `/memories` directory or expose them through Memory MCP.

## Memory layers, no overlap

| Layer | Where it lives | Lifetime | Owner | Write path |
|---|---|---|---|---|
| Conversation | Claude session | within session | model | model |
| `/memories` (Memory tool) | client-side directory | cross-session per workspace | model + user | model writes via tool, user can edit |
| Memory MCP knowledge graph | JSONL store (local or remote) | indefinite | server | model via `tools/call` |
| Developer-global rules | `~/.cursor/rules/*.mdc` / `~/.claude/CLAUDE.md` / `~/.codex/` (home dir) | cross-project, cross-session | developer | developer hand-curated |
| `.ai-os/memory.md` | repo, version-controlled | indefinite, project-wide | maintainer | user-supervised CR flow only |
| Lane `STATE.md` | repo, gitignored | per session | maintainer | user-supervised |
| Lane `MISSION.md` / `DESIGN.md` | repo, version-controlled | per delivery line | maintainer | baseline-log + user confirmation |

These do not replace each other. Memory tool stores Claude's evolving working notes; AI-OS stores user-confirmed project truth. The **developer-global rules** layer is "how *I* work across projects" (per-developer / per-machine), which AI-OS does not own — see [developer-memory.md](developer-memory.md) for that layer's habitat, write path, and anti-patterns.

## Mounting AI-OS artifacts into a `/memories` directory

Memory tool reads any markdown / text file under the `/memories` root. Recommended mapping (read-only mount):

| `/memories/...` path | AI-OS file | Layer |
|---|---|---|
| `/memories/ai-os/STATE.md` | `.ai-os/lanes/default/STATE.md` | L1 |
| `/memories/ai-os/lane.toml` | `.ai-os/lanes/default/lane.toml` | L1 |
| `/memories/ai-os/framework.toml` | `.ai-os/framework.toml` | L1 |
| `/memories/ai-os/MISSION-shared.md` | `.ai-os/MISSION.md` | L2 |
| `/memories/ai-os/MISSION-lane.md` | `.ai-os/lanes/default/MISSION.md` | L2 |
| `/memories/ai-os/DESIGN.md` | `.ai-os/lanes/default/DESIGN.md` | L2 |
| `/memories/ai-os/memory.md` | `.ai-os/memory.md` | L2 |
| `/memories/ai-os/tasks.yaml` | `.ai-os/lanes/default/tasks.yaml` | L2 |

Mount as **read-only** from Claude's side. Writes still go through the user-supervised CR flow described in `AGENTS.md`. Symlinks or a small copy script are both fine; AI-OS does not prescribe the mechanism.

`STATE.md` and `lane.toml` should be loaded **first** (priority 1.0 in MCP annotations). The Memory tool's just-in-time retrieval naturally biases toward small, frequently-referenced files — `STATE.md` and `lane.toml` fit that exactly. This keeps the v9 progressive-disclosure layering (L1 → L2 → L3) intact across runtimes.

## Memory MCP knowledge-graph bridge (optional)

If you also expose AI-OS via Memory MCP knowledge graph, treat AI-OS markdown as the **truth source** and the graph as a derived index, not the other way around:

| AI-OS source | Knowledge graph projection |
|---|---|
| `.ai-os/memory.md` "稳定决策" entry | `entity` (project) + `observation` (decision text) |
| `.ai-os/memory.md` "约定" entry | `entity` (convention) + `relation` (applies-to → module) |
| `.ai-os/memory.md` "坑点" entry | `entity` (anti-pattern) + `observation` (lesson) |
| `.ai-os/lanes/<l>/MISSION.md` | `entity` (lane) + `observation` (current `baseline_id`) |
| `.ai-os/lanes/<l>/baseline-log/CR-*.md` | `relation` (changed → lane) but **not** an entity (preserve temporal order) |

When the markdown changes, regenerate the graph; do not manually edit JSONL. This keeps `git log .ai-os/memory.md` as the audit trail.

`aios://shared/memory` and `aios://lane/{l}/MISSION` (already defined in [mcp-resources.md](mcp-resources.md)) work as both MCP resource URIs and stable identifiers inside the knowledge graph.

## Why AI-OS keeps memory in repo files

- `.ai-os/memory.md` is committed and reviewable. Model-written `/memories/*.md` is not.
- Markdown supports union-merge (per the `AGENTS.md` multi-lane rule). JSONL knowledge graphs do not.
- `git log` already gives auditability that ZDR memory tool sessions can erase.
- Cross-IDE portability: a Cursor / Codex / Gemini user does not have `/memories`, but they all read repo files.

Think of Memory tool as **Claude's working notes** and `.ai-os/memory.md` as the **project's stable record**. Different audiences, different write paths.

## Why this is not in the default CLI

- AI-OS v9 keeps the operating surface to **3 primary product operations** to avoid bloat.
- Memory tool client lifecycle (filesystem driver, OAuth for remote MCP, ZDR config) is large; embedding it would conflict with "zero runtime dependencies".
- The contract here is enough: mount, symlink, or expose via MCP — pick one.

## Anti-patterns

1. **Letting Memory tool replace `STATE.md`** — `/memories` is per-workspace per-Claude, not per-lane. `STATE.md` is the cross-IDE, cross-session recovery anchor. Keep both.
2. **Letting Claude write through to `.ai-os/memory.md`** — `memory.md` is an audited file. Stable decisions land via the user-supervised CR flow in `AGENTS.md`, not via Memory tool `tools/call`.
3. **Encoding `fact_state_review` into `/memories`** — `fact_state_review` is a task-level v9.5 governance contract checked by W077. It belongs in `tasks.yaml`, not in long-term memory.
4. **Dumping `baseline-log/CR-*.md` into the knowledge graph as entities** — baseline-log is history with provenance. Treating CR entries as entities loses the temporal ordering that makes them useful; project them as `relation` events instead.
5. **Mounting `/memories` as writable** — turns Claude into the source of truth for project memory. Always read-only mount; writes go through CR.

## Security note

If you wire AI-OS lane artifacts to a remote Memory MCP server (rather than local mount):

- Use OAuth 2.1 + PKCE on the MCP transport (per [mcp-resources.md](mcp-resources.md) security guidance).
- Bind `aios://lane/{l}/STATE` and `DESIGN` to per-user scopes — these contain in-flight delivery thinking.
- Prefer ZDR-eligible deployments; AI-OS already keeps the audit trail in `git log`, but the memory tool channel itself should not retain after-the-fact.
- Log read events alongside the existing audit trail; this aligns with the EU AI Act framing in [eu-ai-act.md](eu-ai-act.md).

## See also

- [developer-memory.md](developer-memory.md) — the developer-global layer (per-developer / per-machine preferences) that AI-OS deliberately does not own
- [mcp-resources.md](mcp-resources.md) — the same `aios://` URIs work as MCP resources and as Memory MCP graph identifiers
- [a2a.md](a2a.md) — agent-to-agent task delegation (complementary to memory)
- [claude-code.md](claude-code.md) — `/memory` slash command vs lane `STATE.md`
