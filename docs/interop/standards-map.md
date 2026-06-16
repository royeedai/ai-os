# Open Standards & Tool Mapping

> Wire-format contracts for A2A, Product Design evidence, Memory tool, BMAD, OpenSpec, Kiro, EU AI Act audit framing, developer-global memory, and long-horizon agent surfaces. AI-OS does **not** ship servers, clients, or runtimes for any of these — only field mappings and coexistence rules. Core IDE interop: [spec-kit-coexistence.md](spec-kit-coexistence.md), [claude-code.md](claude-code.md), [cursor.md](cursor.md), [product-design.md](product-design.md), [mcp-resources.md](mcp-resources.md).

## Layer stack

| Layer | Standard | AI-OS adapter |
|---|---|---|
| Resource discovery | MCP | `aios://` URI scheme ([mcp-resources.md](mcp-resources.md)) |
| Capability wrapping | agentskills.io | `framework/skills/ai-os-delivery/SKILL.md` |
| Design evidence | Product Design / Figma / URL / screenshot | `DESIGN.md` `design_input` |
| Inter-agent delegation | A2A v1.0 | Field map below |
| Session / working memory | Memory tool / Memory MCP | Mount map below |

## A2A v1.0 ↔ `tasks.yaml`

AI-OS v9.4 handoff + v9.5 `fact_state_review` map onto A2A `Task` / `Message` / `AgentCard` / `Artifact` / `Part` / `TaskState`. Terminal states without `evidence_produced` are caught by **W076** in `doctor --strict` — no new doctor code.

| AI-OS field | A2A object |
|---|---|
| `id`, `title`, `status` | `Task.id`, first `Message` text, `TaskState` |
| `handoff_to` | `AgentCard.url` |
| `context_refs` | `Message.parts[]` file parts (`aios://lane/{l}/...`) |
| `expected_return` / `evidence_required` | planned `Task.artifacts[]` |
| `evidence_produced` | returned `Task.artifacts[]` |
| `deviation_log` | `Task.history[]` |
| `fact_state_review` | structured-data `Artifact` (data Part) |

Recommended `Message` file-part order (L1→L2): `STATE` → `MISSION` → `DESIGN` → `tasks` → `verification-matrix` → relevant `spec/` / `baseline-log/` URIs. AI-OS does **not** ship or start an A2A server / client. 2 primary product operations unchanged.

## Memory tool / Memory MCP ↔ repo files

Read-only mount of `.ai-os/` into `/memories/ai-os/` (symlink or copy script). AI-OS markdown is truth; Memory tool is Claude's working notes.

| `/memories/ai-os/...` | AI-OS file | Layer |
|---|---|---|
| `STATE.md` | lane `STATE.md` | L1 |
| `MISSION-lane.md` | lane `MISSION.md` | L2 |
| `memory.md` | `.ai-os/memory.md` | L2 |

Memory MCP knowledge graph projects entities from `memory.md` / `MISSION.md`; regenerate on markdown change — do not edit JSONL as truth. Anti-pattern: writable mount or letting Memory tool replace `STATE.md`.

## Developer-global memory (Layer 4)

Per-developer / per-machine preferences live in agent shell **global rules** (`~/.cursor/rules/*.mdc`, `~/.claude/CLAUDE.md`, `~/.codex/`). AI-OS owns project layers only (`.ai-os/`). Cross-machine sync: dotfiles, not AI-OS identity. Conflict: **project artifacts win** over global rules.

**Architecture style guide / coding-rules file**: project-level architecture guardrails (response-wrapper contract, must-reuse abstractions, forbidden anti-patterns, dependency policy) register in `.ai-os/memory.md` §2 — this is the home for what external tools call an "architecture style guide" or `.ai-os-rules`; AI-OS does **not** create a second truth-source file. Purely personal coding preferences stay in Layer 4 global rules.

## Long-horizon agent surfaces

Delegated / background / cloud / external PR work records `agent_run_review` in `tasks.yaml`:

- `execution_surface`, `run_refs`, `write_scope`, `progress_checkpoints`, `return_packet`, `human_review_status`
- Surfaces (examples only): Codex cloud, Cursor Background Agents, GitHub Copilot cloud agent, Google Jules, Claude Code subagents / hooks
- **W078** in `doctor --strict` checks closure evidence; not an execution layer

## Tool coexistence (summary)

| Tool | Mode | Rule |
|---|---|---|
| **Product Design** | optional design-evidence provider | Use brief / ideation / prototype / image-to-code / design QA / share outputs as `design_input.evidence_refs`; no-plugin fallback stays valid |
| **BMAD-METHOD** | A: BMAD 0→1, AI-OS governs delivery; B: AI-OS self-contained | BMAD owns PRD/architecture; AI-OS owns `baseline-log/`, verification, `STATE.md`. One requirement truth source |
| **OpenSpec** | A: deltas in spec, CR references delta; B: AI-OS CR only | Delta = what changed; CR = why safe to ship |
| **Kiro** | A: steering stable, lane MISSION current; B: AGENTS.md trunk | Pick one requirements source; reference the other |

## EU AI Act audit framing (non-legal)

Engineering narrative mapping only — not compliance advice. Articles 12 / 14 / 17 map to:

| Obligation | AI-OS artifact |
|---|---|
| Record-keeping (Art. 12) | `baseline-log/CR-*`, `BL-*`, `tasks.yaml` owner, `MISSION.md` |
| Human oversight (Art. 14) | `AGENTS.md` confirmation gates, `approval_required`, delivery double-checklist |
| Quality management (Art. 17) | `DESIGN.md`, `verification-matrix.yaml`, `risk-register.md`, `evals/` |

CI: `node .ai-os/bin/ai-os-doctor.js . --strict` (W070-W078; committed local entry, runs offline). AI-OS is silent on model weights, GDPR flows, Art. 13 transparency, Art. 15 robustness testing.

## Anti-patterns (all mappings)

1. Making Product Design a hard dependency for AI-OS UI work — use `design_input` plus fallback
2. Re-inventing handoff field names per IDE — use the table above
3. Remote agent writing directly into `.ai-os/lanes/` — round-trip through user-supervised CR flow
4. Two parallel requirement truth sources — pick one, reference the other
5. Encoding `fact_state_review` as a prompt string — keep structured in `tasks.yaml`
6. Skipping `doctor --strict` because an external tool "already validated"

## See also

- [spec-kit-coexistence.md](spec-kit-coexistence.md) · [claude-code.md](claude-code.md) · [cursor.md](cursor.md) · [product-design.md](product-design.md)
- [mcp-resources.md](mcp-resources.md) · [../artifacts.md](../artifacts.md) · [../problem-ledger.md](../problem-ledger.md)
