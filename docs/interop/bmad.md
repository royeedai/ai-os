# AI-OS × BMAD coexistence

> [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (Breakthrough Method for Agile AI-Driven Development) is a 43k-star spec-driven framework built around six AI agent personas (Analyst, PM, Architect, Developer, UX Designer, Technical Writer) running a four-phase pipeline (Analysis → Planning → Solutioning → Implementation). AI-OS v9 complements it by covering **what happens to the artifacts after BMAD generates them**: change management, evidence-based verification, cross-session recovery, and cross-IDE governance.

## TL;DR

| Project shape | Recommended setup |
|---|---|
| Greenfield, BMad personas drive 0→1 | Mode A — BMAD leads pipeline, AI-OS takes over governance |
| Brownfield, evolving requirements, multi-IDE | Mode B — AI-OS self-contained |
| Regulated / audit-heavy, BMad Enterprise track | Mode A — BMAD persona artifacts, AI-OS verification matrix + risk register |

## Mode A: BMAD pipeline leads, then AI-OS

**When to use**: fresh module / greenfield, team already runs `npx bmad-method`, wants AI-OS to handle delivery governance once implementation starts.

```
Phase 1 (BMAD personas):
  Analyst        → market / brief
  PM             → PRD
  Architect      → architecture spec
  UX Designer    → UX spec
  Developer      → user stories + code
  Technical Writer → docs

Phase 2 (AI-OS takes over):
  npx --yes github:royeedai/ai-os .
  → AI-OS v9 constitution governs change management, verification,
    cross-session recovery, doctor health check
```

### Artifact coexistence

Keep BMAD persona artifacts as the requirement / design source-of-truth. AI-OS artifacts are minimal and reference-only:

| BMAD artifact | AI-OS mapping |
|---|---|
| PRD (PM persona) | referenced from lane `MISSION.md`; do **not** restate requirements |
| Architecture spec (Architect) | referenced from lane `DESIGN.md`; the AI-OS `DESIGN.md` only adds shared-layer side-effect lists |
| UX spec (UX Designer) | referenced from lane `DESIGN.md` and parity-map (when reverse-speccing accessible UI) |
| User stories (Developer) | mapped onto `requirement_refs` / `acceptance_refs` inside lane `tasks.yaml`; AI-OS does not duplicate the story text |
| Code | governed by AI-OS evidence gates (W076 / W077) once committed |
| — | AI-OS `STATE.md`, `baseline-log/`, `verification-matrix.yaml`, `release-plan.md`, `risk-register.md`, `memory.md` (unique to AI-OS) |

### Sample lane `MISSION.md` header for Mode A

```markdown
# Mission

## 1. Delivery baseline summary

- Requirement source-of-truth: `bmad/prd-checkout-flow.md` (BMAD PM persona, 2026-04-18)
- Architecture source-of-truth: `bmad/architecture-checkout.md` (BMAD Architect, 2026-04-19)
- This cycle's goal: implement Stories CHK-001 through CHK-007
- Not in this cycle: Stories CHK-008 ~ CHK-012

## 5. Stable risks

- Further requirement changes go through either BMAD PM (regenerate PRD)
  OR AI-OS `baseline-log/CR-*.md` — pick one per delta, never both
```

## Mode B: AI-OS self-contained

**When to use**: brownfield, multi-IDE team, long lifecycle, evolving requirements, real debugging and post-mortems. AI-OS produces the 12 canonical artifacts directly without going through a persona pipeline.

See [../getting-started.md](../getting-started.md).

## Why both can coexist without overlap

| Concern | BMAD | AI-OS |
|---|---|---|
| Who creates the artifact | persona-driven (Analyst → PM → Architect → ...) | rule-driven (`AGENTS.md` behavior rules) |
| What enforces it | system prompts on each persona | deterministic `doctor` checks (W070-W077) |
| Lifecycle | 4-phase pipeline before / during implementation | full lifecycle, especially **after** implementation |
| Cross-IDE | requires BMAD-aware agents | works on any agent reading `AGENTS.md` |
| Memory | context sharding inside persona prompts | repo-committed `memory.md` + `STATE.md` |
| Audit | persona output history | `git log` + `baseline-log/` + `evidence_produced` |

These are different layers, not competing standards. BMAD answers **"who writes what"**; AI-OS answers **"how do we know it stayed correct over time"**.

## Anti-patterns

1. **Two parallel requirement sources-of-truth**
   - Same requirement tracked in both `bmad/prd-*.md` and `.ai-os/lanes/<l>/specs/*.spec.md`, each evolving independently
   - Fix: pick one, reference from the other (Mode A → BMAD owns it; Mode B → AI-OS owns it)

2. **Letting BMAD personas write to `.ai-os/lanes/`**
   - BMAD personas generate their own artifact tree; AI-OS lane artifacts are user-supervised
   - Fix: BMAD writes to `bmad/`, AI-OS lane updates go through the CR / handoff flow

3. **Hardcoding BMAD persona names into `AGENTS.md` rules**
   - AI-OS rules are persona-agnostic on purpose (any agent should be able to follow them)
   - Fix: if a project needs persona-specific guidance, put it in BMAD's persona prompts, not in AI-OS

4. **Skipping `doctor --strict` because BMAD already validated the artifacts**
   - BMAD validates persona outputs at generation time; AI-OS `doctor` validates ongoing artifact consistency (e.g. acceptance_refs / evidence_produced / fact_state_review)
   - Fix: keep `doctor --strict` in pre-commit / CI even with BMAD active

## What AI-OS uniquely provides next to BMAD

| Capability | BMAD | AI-OS v9 |
|---|---|---|
| Persona pipeline | yes | — |
| Context sharding into persona prompts | yes | — (uses progressive disclosure L1/L2/L3 instead) |
| Cross-session recovery (`STATE.md`) | — | yes |
| Change management (`baseline-log/`) | — | yes |
| Evidence-based verification (4 gates + W076/W077) | — | yes |
| Hallucination guard (`fact_state_review`) | — | yes |
| Cross-IDE portability via `AGENTS.md` | — | yes |
| Deterministic CLI integrity check (`doctor`) | — | yes |
| Open-standard handoff to executor agents (A2A) | — | yes (see [a2a.md](a2a.md)) |
| Reverse-spec parity artifact | — | yes |

BMAD pushed AI coding from "ad-hoc prompting" to "structured persona pipeline". AI-OS pushes "structured pipeline" further into **"evidence-backed delivery + recoverable memory + cross-IDE governance for the full lifecycle"**.

## See also

- [spec-kit-coexistence.md](spec-kit-coexistence.md) — same coexistence pattern with GitHub Spec-Kit
- [openspec.md](openspec.md) — OpenSpec coexistence
- [a2a.md](a2a.md) — handoff protocol when BMAD's Developer persona delegates to a remote executor
