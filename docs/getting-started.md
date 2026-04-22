# Getting Started

## 1. Install

```bash
# New project
npx --yes github:royeedai/ai-os my-project

# Existing repo (idempotent)
npx --yes github:royeedai/ai-os .
```

Installation creates:

- `AGENTS.md` at project root — delivery constitution, ≤150 lines
- `CLAUDE.md`, `GEMINI.md` — lightweight IDE pointers (≤30 lines each)
- `.ai-os/` with all 12 artifacts (always; no profiles)
- `.gitignore` + `.gitattributes` entries for team collaboration

## 2. First read

After install, read these in order:

1. `AGENTS.md` — the delivery constitution (5–10 min)
2. `.ai-os/MISSION.md` — empty template; you will fill this in next
3. `docs/artifacts.md` (in the AI-OS repo, not your project) — 12-artifact schema reference

## 3. How agents use AI-OS

There are **no slash commands** in v8. When you open your project with an AI coding agent (Cursor, Claude Code, Codex, etc.):

- The agent reads `AGENTS.md` automatically (it is agents.md open standard)
- Behavior is rule-driven: agent decides what to produce and when to stop based on the task type
- For a fresh project, the agent will typically ask you to confirm `MISSION.md` before any code

## 4. Core behavior rules

From `AGENTS.md`:

- **New project / unclear requirement** → agent produces `MISSION.md` + `baseline-log/CR-*.md`, waits for confirmation
- **Key design not locked** → agent produces `DESIGN.md`, waits for approval
- **Requirement change** → agent writes `baseline-log/CR-<timestamp>.md` impact analysis first
- **Bug fix** → agent states root cause + scope + files to touch, waits for "go"
- **Verification** → agent provides project-native static-check evidence (not just ReadLints)
- **Session resume** → agent reads `STATE.md` first

## 5. When to escalate governance

- `P0` (full governance): new project, new module, large-scope change
- `P1` (change-request + plan): small feature add, non-core change
- `P2` (debug lightweight): single-point bug, wording, minor config

**High-risk escalation** (user assets, permission changes, irreversible state, cross-tenant data, concurrency-sensitive, external side effects):

- `tasks.yaml` sets `approval_required: true`
- Populate `.ai-os/risk-register.md` and `.ai-os/release-plan.md`
- Add at least one real `failure_modes` guard to `.ai-os/verification-matrix.yaml`

## 6. Check health

```bash
npx --yes github:royeedai/ai-os doctor .
```

Checks:

- `AGENTS.md` exists and is at most 150 lines
- All 12 artifacts are present (or session-local ones justified)
- `baseline-log/` has at least one record
- Naming conventions follow `CR-YYYYMMDD-HHMMSS-*` / `BL-YYYYMMDD-HHMMSS-*`
- `.gitignore` excludes `STATE.md`
- Any `lanes/` subdirectories have `lane.toml`

## 7. Multiple parallel delivery lines

For most projects, you will **never need** `lanes/`. If you do have separate parallel delivery trains:

```bash
mkdir -p .ai-os/lanes/payments
cp -r .ai-os/{MISSION.md,DESIGN.md,STATE.md,tasks.yaml,baseline-log,specs} .ai-os/lanes/payments/
# Create .ai-os/lanes/payments/lane.toml
```

Shared across lanes: `.ai-os/memory.md`.

## 8. Upgrading from v7

See [migrate-v7-to-v8.md](migrate-v7-to-v8.md).

```bash
npx --yes github:royeedai/ai-os upgrade .
```

## 9. Common first tasks

| You want to... | Open your AI agent and... |
|---|---|
| Start a new project from scratch | Tell it your goal — agent guides through MISSION.md |
| Add a feature to existing repo | Ask — agent reads code, proposes updated MISSION baseline |
| Change a requirement | Say "we need to change X" — agent writes `baseline-log/CR-*.md` first |
| Fix a bug | Describe symptom — agent states root cause before touching code |
| Verify completion | Ask "is it done?" — agent runs static check + regression + evidence list |

## 10. Further reading

- [AGENTS.md](../AGENTS.md) — constitution
- [artifacts.md](artifacts.md) — artifact schema
- [cli.md](cli.md) — CLI reference (3 commands)
- [constitution-spec.md](constitution-spec.md) — formal spec
- [migrate-v7-to-v8.md](migrate-v7-to-v8.md) — migration guide
