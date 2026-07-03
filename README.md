# AI-OS

> AI Delivery Constitution + canonical lane-first artifact layout + reference CLI.

```bash
# Install into a new project (pin a release: reproducible + cache-friendly)
npx --yes github:royeedai/ai-os#v10.5.1 my-project

# Install into an existing repo
npx --yes github:royeedai/ai-os#v10.5.1 .

# Check health — runs locally with zero network after install
node .ai-os/bin/ai-os-doctor.js .
```

> After the one-time install, `doctor` lives at `.ai-os/bin/` (committed). Daily
> runs, IDE hooks, and CI use the local entry above and make **no external
> request**. Only the first install needs the network.

## What AI-OS is

In the GPT-5.5 / Opus 4.8 era, frontier models already self-verify code well. The remaining delivery failures are mostly **wrong goal, unlocked design, missing evidence, and lost context** — not "the model cannot write the function." AI-OS targets that layer.

AI-OS is a cross-agent delivery constitution for projects that already use AI coding, but need the AI to more reliably do the **right** work:

- clarify the real goal
- lock key design before scaling out implementation
- route frontend UI work through design-aware component reuse when designs or component libraries exist
- preserve optional design evidence from Product Design, Figma, screenshots, URLs, existing code, or manual briefs
- reverse-spec accessible websites into auditable evidence before rebuild work
- separate observed / confirmed facts from inferred / unknown assumptions
- review long-running, background, external, or parallel agent work before accepting it
- keep long-lived AI projects from drifting through evidence-triggered maintenance, not periodic big-bang refactors
- evolve AI-OS boundaries through evidence-gated review, not permanent freeze or surface creep
- prove completion with project-level evidence
- recover context across sessions without depending on chat history

It is intentionally **not** an IDE, harness, orchestration layer, runtime runner, agent router, or code generator.

## Boundary Evolution Policy

AI-OS stays small by default, but its boundary is not a permanent freeze. New capabilities are classified before implementation:

- **Kernel**: Activation Gate, 12 artifact categories, `AGENTS.md`, lane recovery, `memory.md`, project-native verification, local doctor, no telemetry, and no default external service
- **Controlled Extension**: doctor warnings, CLI subcommands, schema fields, or release checks may evolve only through CR evidence, native tests, docs assertions, and eval / verification guards when applicable
- **Adapter**: hooks, CI, MCP resources, IDE guidance, and cloud-agent mappings stay optional, thin, removable, and outside the core runtime
- **Forbidden**: built-in agent runner, refactor scheduler, model router, auto-release platform, long-running background service, telemetry collection, or IDE-exclusive hard dependency

This is why most releases still say "no new CLI / runtime / doctor warning / artifact category": that is the default boundary, not a claim that AI-OS can never grow.

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

Installed-project constitution source: [framework/.agents/templates/root/AGENTS.md](framework/.agents/templates/root/AGENTS.md)

This repository's own root [AGENTS.md](AGENTS.md) is only a maintainer guard for the AI-OS source repo; it is not the constitution installed into downstream projects.

## Two primary operations

| Operation | CLI entrypoint | Purpose |
|---|---|---|
| install | `create-ai-os [dir]` or `create-ai-os install [dir]` | Install the AI-OS canonical layout |
| doctor | `create-ai-os doctor [dir]` | Check layout health and constitution compliance |

No slash commands. No profile flags. No proprietary AI-OS skill system; the `agentskills.io` wrapper below is an open-standard adapter, not a separate operating surface.

## Why deterministic `doctor` checks instead of prompts

Stronger models improve single-shot compliance, but they still bypass subagent rules, degrade with context length, and cannot enforce project-level contracts by themselves. Industry consensus in 2026 (e.g. [anthropics/claude-code RFC #45427](https://github.com/anthropics/claude-code/issues/45427)) is that prompt-style guidance such as `CLAUDE.md` / `.cursor/rules` reaches only ~70% compliance. Safety-critical boundaries need **deterministic enforcement** — a check whose exit code the model cannot override.

AI-OS uses `doctor` for exactly this. W070-W078 (and `--strict` mode) are deterministic structural checks for layout health, ownership, evidence loops, and high-risk completeness — not "teach the model how to think." The same local command can be wired into pre-commit, CI, or IDE hooks where that surface supports hooks. All runs use the committed local entry `node .ai-os/bin/ai-os-doctor.js . --strict`, so they run offline:

| Surface | One-line setup |
|---|---|
| Claude Code | `pre-tool-use` hook calling `node .ai-os/bin/ai-os-doctor.js . --strict` |
| Cursor | `.cursor/hooks.json` with the same command (see [docs/interop/cursor.md](docs/interop/cursor.md)) |
| Codex / Gemini / shell agents | run the same local command before closure; use pre-commit or CI when you need hard enforcement |
| Local pre-commit | `lefthook` / `pre-commit` running `node .ai-os/bin/ai-os-doctor.js . --strict` |
| CI | GitHub Action step running the same command |

This makes AI-OS the portable command contract behind Claude Code hooks, Cursor hooks, Codex local checks, pre-commit, and CI. Enforcement strength depends on where you wire the command: hooks / pre-commit / CI can block, while Codex and other shell agents can run it as a required local guard before claiming completion. The check itself is identical everywhere and makes zero external request because the doctor entry is vendored into `.ai-os/bin/`.

## How agents use AI-OS

There are no slash commands. When an AI agent opens an installed project with `AGENTS.md`, it should:

- read `AGENTS.md`
- run the Activation Gate before loading lane artifacts
- for delivery-affecting work, read `.ai-os/lanes/default/STATE.md` first for current recovery
- then read `.ai-os/lanes/default/MISSION.md` for the active delivery baseline and `.ai-os/MISSION.md` for shared host-project context

AI-OS artifact governance applies to delivery-affecting work: code or project artifact edits, feature work, requirement changes, bug fixes, verification, shipping, session recovery, URL reverse-spec intake, and high-risk actions. It does not apply to ordinary conversation, brainstorming, explanation, learning questions, temporary commands, or non-repo tasks.

Behavior is rule-driven by task type:

| User says | Agent should do |
|---|---|
| “Just discuss / brainstorm / explain” | answer directly; do not read or write lane artifacts |
| “Build a new feature” | produce / update lane `MISSION.md`, restate goal / main flow / state transitions / exception paths, then stop for confirmation |
| “The requirement changed” | write lane `baseline-log/CR-*.md` before code changes |
| “Reverse-spec this URL” | capture screenshots, DOM/CSS, interactions, Network/API observations, and evidence-graded backend behavior into lane artifacts |
| “Build this UI / page” | determine UI source first: design-led, component-first, existing-style, or hybrid; use existing or stack-appropriate components before custom UI |
| “Delegate this to a background / cloud / PR agent” | record `agent_run_review` run refs, write scope, return packet, evidence, and human review before closing |
| “Fix this bug” | state root cause + scope + files first; if the user already asked to fix and scope is clear, continue within that scope |
| “This AI-built project is drifting” | record drift evidence in `maintenance_review`, open a maintenance CR only when evidence exists, and feed stable findings back to memory / verification / evals |
| “Is it done?” | run project-native static check + regression + evidence review |
| “I’m back” | resume from lane `STATE.md` first |

## Design-aware component-first UI

Frontend delivery routes UI source and implementation separately:

- With a design: the design is the target; reuse existing project components first, then theme / wrap / customize only where needed.
- Without a design: use the project's existing component library; if none exists, choose by stack and surface before asking.
- Existing project style wins over new library preference. Do not mix multiple component libraries on one surface unless the project already does.
- Component-first replaces ad-hoc visual design, not business logic: fields, APIs, permissions, validation, loading / empty / error states, and responsive behavior still need acceptance coverage.

When Product Design is available, AI-OS can use its brief, ideation, prototype, image-to-code, design QA, and share outputs as optional design evidence. Without Product Design, the same `design_input` contract accepts Figma, screenshots, URL reverse-spec, existing code / style, component-first, or manual brief fallback. See [docs/interop/product-design.md](docs/interop/product-design.md).

Default library preference is China-friendly and conservative: Vue PC uses Element Plus; React PC uses Ant Design; Vue H5 uses Vant; React H5 uses Ant Design Mobile; uni-app uses uView / uni-ui; Taro or WeChat-heavy surfaces use NutUI or TDesign; cross-stack enterprise consistency may choose TDesign; modern enterprise dashboards may choose Arco Design.

## When to use lanes

You always get `lanes/default/`. Most projects will only ever use that lane.

Create more lanes only when you truly have separate long-lived delivery lines, release trains, or teams working in parallel with different current baselines.

## Long-lived AI project maintenance

AI-OS does not treat "refactor every few weeks" as a maintenance strategy. Long-lived AI projects stay stable by closing each delivery with a drift review:

- collect observed drift signals such as repeated rework, same-root-cause defects, stale guards, contract drift, or debt with no disposition
- open a maintenance CR or scoped refactor task only when those signals have evidence
- record `maintenance_review` in `tasks.yaml`: `drift_signals`, `refactor_trigger`, `contract_impact`, `native_checks`, and `debt_disposition`
- feed stable findings back into `.ai-os/memory.md`, `verification-matrix.yaml`, or `evals/`

This keeps maintenance small, auditable, and test-backed. If there is no drift evidence, do not schedule a big-bang refactor just because the project has been AI-built for a while.

## Codex field feedback closeout

Real Codex projects using AI-OS showed recurring closeout drift: release requests not reflected in lane artifacts, verification failures blurred with local / external environment issues, `tasks.yaml` conflicts after git operations, and generated baseline artifacts being treated as current scope.

AI-OS handles this inside the existing 12 artifacts:

- compare the latest user request with `STATE.md`, `release-plan.md`, and `tasks.yaml` before claiming release / publish / deploy completion
- classify failed verification as `product-code`, `local-environment`, `external-service`, or `production-state-unknown`
- review task IDs, baseline alignment, and evidence after pull / stash / rebase / branch switch
- classify generated or legacy artifacts as current, legacy, generated, non-goal, or pending cleanup before using them as scope

See [docs/codex-aios-field-feedback.md](docs/codex-aios-field-feedback.md). This is deliberately not a new CLI command, doctor warning, runtime, or artifact category.

## Cross-agent loading via the `agentskills.io` standard

For agents that prefer the [agentskills.io](https://agentskills.io/specification) skill format (Claude Code, Cursor, Codex, Gemini CLI, ADK, Hermes, ...), AI-OS publishes an official wrapper:

```bash
# Pin a release; or vendor the folder offline once cloned (no network)
npx skills add github:royeedai/ai-os#v10.5.1
```

This loads `framework/skills/ai-os-delivery/SKILL.md`, which packages the constitution into the open standard. It does not introduce a new command surface — it is a thin wrapper so any spec-compliant agent can pick AI-OS up without per-tool adapters. To stay fully offline after cloning, copy `framework/skills/ai-os-delivery` into `.claude/skills/` or `.cursor/skills/` instead of fetching.

## MCP integration

AI-OS artifacts can be exposed as MCP resources via the standard `aios://` URI scheme. See [docs/interop/mcp-resources.md](docs/interop/mcp-resources.md). The default install does not ship or start an MCP server; the integration is a contract document plus an illustrative reference snippet.

## Open standards map

A2A task delegation, Product Design optional evidence, Memory tool mounts, BMAD / OpenSpec / Kiro coexistence, EU AI Act audit framing, developer-global memory, and long-horizon agent surfaces are documented in the interop docs and standards map. AI-OS does not ship servers or clients for any of these — only field mappings and single-truth-source rules.

## Framework feedback loop (v9.7+)

AI-OS iterates from "modifications proposed after the first AI-OS delivery that were preventable in the first session". The loop is **installed-project artifacts + explicit maintainer review only**, no telemetry:

- Each `baseline-log/CR-*.md` carries a `## Preventability review` section (`Preventable: yes / no / partial` + root cause + maps-to + suggested guard).
- A lane closing out aggregates findings into a `BL-*-retrospective*.md`.
- The AI-OS repo does not commit its own `.ai-os/` lane state; recurring feedback is promoted from installed projects, issues, docs tests, and evals.

Optional feedback path: file an issue with the `framework-feedback` label using [`.github/ISSUE_TEMPLATE/preventable-modification.md`](.github/ISSUE_TEMPLATE/preventable-modification.md) and paste your CR's section verbatim. The AI-OS maintainer merges recurring root causes into [`docs/problem-ledger.md`](docs/problem-ledger.md) (PL-012) and tightens AGENTS.md / artifact templates / doctor in the next minor. See [`docs/maintainers.md`](docs/maintainers.md#framework-feedback-复盘) for the merge flow.

## Further reading

- [Distributed AGENTS template](framework/.agents/templates/root/AGENTS.md)
- [PROJECT_PURPOSE.md](PROJECT_PURPOSE.md)
- [docs/artifacts.md](docs/artifacts.md)
- [docs/cli.md](docs/cli.md)
- [docs/constitution-spec.md](docs/constitution-spec.md)
- [docs/codex-aios-field-feedback.md](docs/codex-aios-field-feedback.md)
- [docs/getting-started.md](docs/getting-started.md)
- [docs/reverse-spec-url-intake.md](docs/reverse-spec-url-intake.md)
- [docs/maintainers.md](docs/maintainers.md)
- [docs/interop/](docs/interop/) — spec-kit, Claude Code, Cursor, Product Design, MCP (`aios://`), and [standards-map](docs/interop/standards-map.md) (A2A, Memory tool, BMAD, OpenSpec, Kiro, EU AI Act, long-horizon agents)

## License

MIT
