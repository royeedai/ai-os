# AI-OS × A2A Protocol

> [Agent2Agent Protocol (A2A)](https://a2a-protocol.org/) is the Linux-Foundation-stewarded standard for delegating tasks between AI agents across frameworks. AI-OS treats v9.4 task handoff fields and v9.5 fact-state review as the **wire-format mapping** so any A2A-compatible runtime can dispatch lane tasks to a remote executor agent without re-inventing field names.

## Status

- A2A v1.0 went GA in March 2026 (donated to LF in June 2025; merged with IBM ACP in August 2025).
- AI-OS itself does **not** ship or start an A2A server / client in the default install. v9 keeps the CLI to three primary product operations (`install` / `doctor` / `upgrade`) and zero runtime dependencies.
- This document is the **wire-level contract**. It maps AI-OS lane `tasks.yaml` handoff fields onto A2A v1.0 objects (`Task`, `Message`, `AgentCard`, `Artifact`, `Part`, `TaskState`).
- Reading lane artifacts already has a contract — see [mcp-resources.md](mcp-resources.md) (`aios://` URI scheme). A2A messages can reuse those URIs in `file` parts so MCP and A2A compose without duplicating addresses.

## Why A2A is the right complement

MCP solves agent ↔ tool/resource. agentskills.io solves capability packaging. A2A solves agent ↔ agent task delegation. AI-OS treats all three as open standards to bind to, not invent against.

| Layer | Open standard | AI-OS adapter |
|---|---|---|
| Resource discovery | MCP | `aios://` URI scheme ([mcp-resources.md](mcp-resources.md)) |
| Capability wrapping | agentskills.io | `framework/skills/ai-os-delivery/SKILL.md` |
| Inter-agent delegation | A2A v1.0 | This document |

## Field mapping

AI-OS v9.4 task handoff fields (and v9.5 `fact_state_review`) map onto A2A v1.0 objects as follows:

| AI-OS `tasks.yaml` field | A2A v1.0 object | Notes |
|---|---|---|
| `id` (e.g. `TASK-AI-001`) | `Task.id` | reuse the AI-OS task id directly |
| `title` | first `Message.parts[].text` | one-line task statement |
| `status` | `TaskState` | see TaskState mapping below |
| `owner` (`AI` / `human` / `external-agent`) | implied by remote `AgentCard` | dispatcher decides which card to send to |
| `handoff_to` | `AgentCard.url` | A2A endpoint of the executor |
| `context_refs` | `Message.parts[]` (file parts) | values are `aios://lane/{l}/...` URIs |
| `acceptance_refs` | pinned in `AgentCard.skills[].description` and restated in initial `Message` | acceptance is a contract field, not a transport field |
| `expected_return` | planned `Task.artifacts[]` types | declared by the dispatching side |
| `evidence_required` | required output `Artifact` set | dispatcher contract |
| `evidence_produced` | actual `Task.artifacts[]` returned | written back into the lane after completion |
| `deviation_log` | derived from `Task.history[]` | message + status transitions |
| `fact_state_review.observed/confirmed/inferred/unknown` | one structured-data `Artifact` (data Part) | preserves v9.5 hallucination guard semantics |

`TaskState` ↔ AI-OS `status`:

| A2A `TaskState` | AI-OS `tasks.yaml.status` | Note |
|---|---|---|
| `submitted` | `todo` | queued for executor |
| `working` | `in-progress` | |
| `input-required` | `blocked` | record clarifying question in `deviation_log` |
| `auth-required` | `blocked` | also surface in `risk-register.md` |
| `completed` | `done` | MUST arrive with `evidence_produced` populated |
| `canceled` | `todo` | returned without execution |
| `failed` | `blocked` | root cause in `deviation_log` |
| `rejected` | `blocked` | rationale in `deviation_log` |

Terminal states (`completed` / `canceled` / `failed` / `rejected`) returning to AI-OS without populating `evidence_produced` are caught by **doctor W076** (introduced in v9.4) when running `doctor --strict`. No new doctor warning is required for A2A interop.

## AI-OS lane artifacts as A2A inputs

A2A `Message.parts` accepts `file` parts. AI-OS lane artifacts already have stable URIs from the MCP scheme, so the same address works on both protocols:

```json
{
  "kind": "file",
  "file": {
    "uri": "aios://lane/default/MISSION",
    "mimeType": "text/markdown",
    "name": "Lane mission baseline"
  }
}
```

Recommended ordering when sending the initial `Message` (mirrors AI-OS L1 → L2 → L3 progressive disclosure):

1. `aios://lane/{l}/STATE` — recovery context (priority 1.0 in MCP annotations)
2. `aios://lane/{l}/MISSION` — current delivery baseline
3. `aios://lane/{l}/DESIGN` — locked design and side-effect list
4. `aios://lane/{l}/tasks` — full `tasks.yaml` (lets executor see dependencies)
5. `aios://lane/{l}/verification-matrix` — guards the executor must satisfy
6. relevant `aios://lane/{l}/spec/{slug}` and `aios://lane/{l}/baseline-log/{id}` items

## Minimal AgentCard for an AI-OS executor

A remote executor that wants to claim "I can take AI-OS handoffs" should publish an `AgentCard` like:

```json
{
  "name": "ai-os-delivery-executor",
  "description": "Executes AI-OS lane tasks and returns evidence artifacts.",
  "url": "https://example.org/a2a",
  "version": "1.0.0",
  "protocolVersion": "1.0",
  "capabilities": { "streaming": true, "extendedAgentCard": false },
  "defaultInputModes": ["text/plain", "application/json", "text/markdown"],
  "defaultOutputModes": ["text/markdown", "application/json"],
  "skills": [
    {
      "id": "ai-os-task-execute",
      "name": "Execute AI-OS lane task",
      "description": "Accepts a tasks.yaml entry, reads referenced aios:// resources, returns evidence_produced as artifacts and a fact_state_review Part.",
      "tags": ["ai-os", "lane", "evidence"],
      "examples": ["Execute TASK-AI-002 from lane default with the listed context_refs."],
      "inputModes": ["text/markdown", "application/json"],
      "outputModes": ["application/json", "text/markdown"]
    }
  ]
}
```

A skill `id` of `ai-os-task-execute` is a recommended convention, not part of the AI-OS spec — pick anything as long as it is discoverable.

## Returning evidence to the lane

The executor's `Task.artifacts[]` should include at minimum:

| Artifact type | Maps back to | Required when |
|---|---|---|
| Build / lint / test log | `evidence_produced` entry | always before terminal state |
| Project-native static check log | `evidence_produced` (R4 evidence gate) | always before terminal state |
| Affected-files list | `change_scope` (cross-check vs. plan) | code-changing tasks |
| `fact_state_review` (data Part) | `tasks.yaml.fact_state_review` | always; preserves v9.5 W077 contract |
| Risk note | `risk-register.md` append | high-risk tasks |
| Spec / DESIGN delta | `DESIGN.md` / `specs/*.spec.md` patch | design-touching tasks |

Writing back into lane files is **not** done over A2A `tools/call`. The dispatching side reads the artifacts and applies them through the user-supervised CR flow. This keeps A2A as a delegation protocol, not a write-through file API.

## Why this is not in the default CLI

- AI-OS v9 keeps the operating surface to **3 primary product operations** to avoid bloat.
- A2A server lifecycle (HTTP + SSE / OAuth 2.1 / push notifications / audit log) is large; embedding it would conflict with "zero runtime dependencies".
- The contract here is enough: any team that wants A2A exposure can wrap a stock A2A SDK around the same field map.

## Anti-patterns

1. **Re-inventing handoff field names per IDE / agent** — pick the table above instead of inventing `cursor.delegateTo` / `claude.subagentId` / `gemini.outsourcedTo`.
2. **Letting the remote agent write directly into `.ai-os/lanes/`** — A2A is delegation, not a file API. Writes must round-trip through the user-supervised CR flow.
3. **Encoding `fact_state_review` as a prompt string** — it MUST be a structured Artifact (data Part) so v9.5 W077 keeps machine-checking it.
4. **Marking AI-OS task `done` on A2A `completed` without `evidence_produced`** — caught by W076 in `doctor --strict`; do not silence the warning to make it green.
5. **Reusing `Task.id` randomly across lanes** — keep AI-OS `TASK-*` ids stable for traceability; if the executor needs a remote id, store it in `deviation_log`.

## Security note

If you wire AI-OS lane delegation over A2A:

- Use OAuth 2.1 + PKCE per the [A2A specification](https://a2a-protocol.org/latest/specification). A2A endpoints are the trust boundary.
- Bind `aios://lane/{l}/STATE` and `DESIGN` to per-user scopes — these contain in-flight delivery thinking.
- Log task delegation events as part of the audit trail; this aligns with the EU AI Act audit framing in [eu-ai-act.md](eu-ai-act.md).
- Verify executor-supplied artifacts before applying them — A2A does not by itself authenticate the *content* of returned artifacts.
