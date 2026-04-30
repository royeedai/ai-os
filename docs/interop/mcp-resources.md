# AI-OS × MCP resources

> [Model Context Protocol](https://modelcontextprotocol.io) is the Linux-Foundation-stewarded standard for letting agents discover and read structured context. AI-OS defines a **stable URI scheme** so any MCP server can expose AI-OS artifacts as resources without each implementation reinventing paths.

## Status

- AI-OS itself does **not** ship an MCP server in the default install. v9 keeps the CLI to three commands (`install` / `doctor` / `upgrade`) and zero runtime dependencies.
- This document is the **wire-level contract**. Anyone can implement it: a 50-line Node script (below), an official SDK server, or a remote HTTP gateway.
- Reading is enough for most agents. AI-OS artifacts are mostly read-only resources; writes go through the user-supervised constitution flow, not through `tools/call`.

## URI scheme

All resources use the custom `aios://` scheme.

### Shared root

| URI | Backing file | Layer |
|---|---|---|
| `aios://shared/MISSION` | `.ai-os/MISSION.md` | L2 |
| `aios://shared/memory` | `.ai-os/memory.md` | L2 |
| `aios://shared/framework` | `.ai-os/framework.toml` | L1 |
| `aios://shared/managed-files` | `.ai-os/managed-files.tsv` | L3 |

### Lane scope (template)

| URI | Backing file | Layer |
|---|---|---|
| `aios://lane/{laneId}` | `.ai-os/lanes/{laneId}/` directory listing | L1 |
| `aios://lane/{laneId}/lane-toml` | `.ai-os/lanes/{laneId}/lane.toml` | L1 |
| `aios://lane/{laneId}/MISSION` | `.ai-os/lanes/{laneId}/MISSION.md` | L2 |
| `aios://lane/{laneId}/DESIGN` | `.ai-os/lanes/{laneId}/DESIGN.md` | L2 |
| `aios://lane/{laneId}/STATE` | `.ai-os/lanes/{laneId}/STATE.md` | L1 |
| `aios://lane/{laneId}/tasks` | `.ai-os/lanes/{laneId}/tasks.yaml` | L2 |
| `aios://lane/{laneId}/risk-register` | `.ai-os/lanes/{laneId}/risk-register.md` | L2 |
| `aios://lane/{laneId}/release-plan` | `.ai-os/lanes/{laneId}/release-plan.md` | L2 |
| `aios://lane/{laneId}/verification-matrix` | `.ai-os/lanes/{laneId}/verification-matrix.yaml` | L2 |
| `aios://lane/{laneId}/parity-map` | `.ai-os/lanes/{laneId}/design-pack/parity-map.md` | L3 |

### Lane collections (resource templates per [MCP spec §3.4](https://modelcontextprotocol.io/specification/latest/server/resources))

| URI template | Backing file | Layer |
|---|---|---|
| `aios://lane/{laneId}/baseline-log/{id}` | `.ai-os/lanes/{laneId}/baseline-log/{id}.md` | L3 |
| `aios://lane/{laneId}/spec/{slug}` | `.ai-os/lanes/{laneId}/specs/{slug}.spec.md` | L3 |
| `aios://lane/{laneId}/eval/{slug}` | `.ai-os/lanes/{laneId}/evals/{slug}.md` | L3 |

`{laneId}` defaults to `default`. `{id}` follows `(BL|CR)-YYYYMMDD-HHMMSS-<slug>` per AI-OS naming convention.

## MCP capability declaration

A server exposing AI-OS resources should declare:

```json
{
  "capabilities": {
    "resources": {
      "subscribe": true,
      "listChanged": true
    }
  }
}
```

`listChanged` lets clients see when a new baseline-log entry is created. `subscribe` lets clients tail `STATE.md` across a long session.

## Resource annotations

Each resource should carry MCP annotations so progressive-disclosure-aware clients can prefer the right files:

| URI prefix | `audience` | `priority` | Note |
|---|---|---|---|
| `aios://lane/{l}/STATE` | `["assistant"]` | 1.0 | always read first on session start |
| `aios://shared/MISSION`, `aios://lane/{l}/MISSION`, `aios://lane/{l}/DESIGN` | `["assistant"]` | 0.8 | core L2 |
| `aios://shared/memory`, `aios://lane/{l}/tasks`, `aios://lane/{l}/verification-matrix` | `["assistant"]` | 0.7 | extended L2 |
| `aios://lane/{l}/baseline-log/{id}`, `aios://lane/{l}/spec/{slug}`, `aios://lane/{l}/eval/{slug}` | `["assistant"]` | 0.4 | L3, on demand |

## Reference implementation (≤50 lines, zero dependencies)

The following Node.js script maps AI-OS artifacts to `aios://` URIs and serves them over a minimal newline-delimited JSON-RPC stdio loop. **Production deployments should use the official MCP SDK**; this is just enough to verify the URI contract end-to-end.

```js
// reference: ai-os-mcp.js — wire-level demo only
const fs = require("fs");
const path = require("path");
const root = path.resolve(process.argv[2] || ".");
const M = (uri, file, layer) => ({ uri, name: uri, mimeType: "text/markdown", description: `AI-OS ${layer}` , file: path.join(root, file) });
function build() {
  const list = [
    M("aios://shared/MISSION", ".ai-os/MISSION.md", "L2"),
    M("aios://shared/memory", ".ai-os/memory.md", "L2"),
    M("aios://shared/framework", ".ai-os/framework.toml", "L1"),
    M("aios://lane/default/lane-toml", ".ai-os/lanes/default/lane.toml", "L1"),
    M("aios://lane/default/STATE", ".ai-os/lanes/default/STATE.md", "L1"),
    M("aios://lane/default/MISSION", ".ai-os/lanes/default/MISSION.md", "L2"),
    M("aios://lane/default/DESIGN", ".ai-os/lanes/default/DESIGN.md", "L2"),
    M("aios://lane/default/tasks", ".ai-os/lanes/default/tasks.yaml", "L2"),
    M("aios://lane/default/verification-matrix", ".ai-os/lanes/default/verification-matrix.yaml", "L2"),
    M("aios://lane/default/risk-register", ".ai-os/lanes/default/risk-register.md", "L2"),
    M("aios://lane/default/release-plan", ".ai-os/lanes/default/release-plan.md", "L2"),
    M("aios://lane/default/parity-map", ".ai-os/lanes/default/design-pack/parity-map.md", "L3"),
  ];
  for (const sub of ["baseline-log", "specs", "evals"]) {
    const dir = path.join(root, ".ai-os/lanes/default", sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".md"))) {
      const slug = f.replace(/\.md$/, "");
      const key = sub === "baseline-log" ? "baseline-log" : sub === "specs" ? "spec" : "eval";
      list.push(M(`aios://lane/default/${key}/${slug}`, `.ai-os/lanes/default/${sub}/${f}`, "L3"));
    }
  }
  return list;
}
const send = (m) => process.stdout.write(JSON.stringify(m) + "\n");
let buf = "";
process.stdin.on("data", (c) => { buf += c; let i; while ((i = buf.indexOf("\n")) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); const r = build();
  if (m.method === "initialize") send({ jsonrpc: "2.0", id: m.id, result: { capabilities: { resources: { listChanged: true } }, serverInfo: { name: "ai-os-mcp-ref", version: "0.1.0" } } });
  else if (m.method === "resources/list") send({ jsonrpc: "2.0", id: m.id, result: { resources: r.map(({ file: _, ...x }) => x) } });
  else if (m.method === "resources/read") { const hit = r.find((x) => x.uri === m.params.uri); send({ jsonrpc: "2.0", id: m.id, result: hit ? { contents: [{ uri: hit.uri, mimeType: hit.mimeType, text: fs.readFileSync(hit.file, "utf8") }] } : { contents: [] } }); }
} });
```

## Why this is not in the default CLI

- AI-OS v9 keeps the operating surface to **3 CLI subcommands** to avoid bloat
- MCP server lifecycle (auth, transport, OAuth 2.1, audit logging) is large; embedding it would conflict with "zero runtime dependencies"
- The contract here is enough: any team that wants MCP exposure can drop the snippet above into their stack, or wrap a richer MCP SDK around the same URI map

## Anti-patterns

1. **Reinventing paths per implementation** — Pick the URI table above instead of inventing `mcp://aios-default-mission` etc.
2. **Mixing reads and writes** — AI-OS resources are read. Writes (e.g. CR creation, STATE updates) belong to the user-supervised flow, not `tools/call`.
3. **Skipping `STATE` priority** — Without the priority=1.0 annotation, agents that prefetch resources may load DESIGN before STATE and waste tokens.

## Security note

If you expose AI-OS resources via remote HTTP-MCP rather than stdio:

- Use OAuth 2.1 + PKCE (per [MCP best practices](https://mcp-best-practice.github.io/mcp-best-practice/best-practice/))
- Bind STATE / DESIGN to per-user scopes — these contain in-flight delivery thinking
- Log resource reads as part of audit trail (this aligns with the EU AI Act audit framing in [eu-ai-act.md](eu-ai-act.md))
