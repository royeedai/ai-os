# CLI Reference

AI-OS v8 provides **3 commands**. No subcommand overlap. No profile flags.

## Quick reference

```bash
create-ai-os [target-dir]                   # Install
create-ai-os install [target-dir]           # Same as above (explicit)
create-ai-os doctor [target-dir]            # Health check
create-ai-os upgrade [target-dir]           # v7 → v8 migration
create-ai-os -h | --help                    # Show help
create-ai-os -v | --version                 # Show version
```

If `[target-dir]` is omitted, the current directory is used.

---

## `create-ai-os [target-dir]` — Install

Installs AI-OS v8 into the target. Always installs:

- `AGENTS.md` at the project root
- `CLAUDE.md`, `GEMINI.md` — lightweight pointers (≤30 lines each)
- `.ai-os/` with all 12 artifacts (6 core + 6 extension)
- `.ai-os/framework.toml` + `.ai-os/managed-files.tsv`
- `.gitignore` / `.gitattributes` entries for AI-OS managed files

### Options

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing `AGENTS.md` and any `.ai-os/*` files that already exist |
| `--no-team-config` | Skip `.gitignore` / `.gitattributes` updates |
| `--no-ide-files` | Skip `CLAUDE.md` / `GEMINI.md` generation |

### Behavior

- Never overwrites user-authored content unless `--force` is passed
- If `.ai-os/` already exists, only fills in what is missing (idempotent)
- Creates an initial baseline record `baseline-log/BL-<timestamp>-initial-baseline.md`

### Examples

```bash
# Fresh install into a new project
npx --yes github:royeedai/ai-os my-project

# Install into existing repo (idempotent)
npx --yes github:royeedai/ai-os .

# Force reinstall (wipes AGENTS.md and .ai-os/ templates, keeps user content)
npx --yes github:royeedai/ai-os . --force
```

---

## `create-ai-os doctor [target-dir]` — Health check

Validates artifact completeness and constitution compliance. Replaces v7's `validate`, `gate`, `release-check`, and `status`.

### Options

| Flag | Description |
|------|-------------|
| `--json` | Output JSON for CI integration |
| `--strict` | Exit non-zero on warnings (not just errors) |

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed (errors=0; warnings allowed unless `--strict`) |
| 1 | At least one error, or warnings present under `--strict` |
| 2 | Target is not an AI-OS project |

### Issue levels

| Level | Code prefix | Meaning |
|------|-------------|---------|
| ERROR | `E***` | Core artifact missing, constitution violation, schema mismatch |
| WARN  | `W***` | Extension artifact missing, suspect file, naming convention drift |
| INFO  | `I***` | Session-local file absent (expected to reappear) |

### Selected checks

- `E001`: `.ai-os/framework.toml` missing (not an AI-OS project)
- `E002`: `schema_version` is not `8`
- `E010`: `AGENTS.md` missing at project root
- `E020`: Core file missing (`MISSION.md`, `DESIGN.md`, `memory.md`, or `baseline-log/`)
- `W010`: `AGENTS.md` exceeds 200 lines (v8 target: ≤150)
- `W020`: Extension artifact missing (tasks, risk-register, verification-matrix, etc.)
- `W021`: Artifact exists but is empty
- `W030`: `baseline-log/` is empty (expected ≥1 baseline record)
- `W031`: `baseline-log/` entry does not follow `CR-*` / `BL-*` timestamp naming
- `W040`: `.gitignore` does not include `.ai-os/STATE.md`
- `I020`: Session-local file missing (will be recreated on first session)

### JSON output

```bash
create-ai-os doctor . --json
```

Returns:

```json
{
  "ok": true,
  "version": "8.0.0",
  "package": "create-ai-os@8.0.0",
  "targetDir": "/path/to/project",
  "installedVersion": "8.0.0",
  "issues": []
}
```

---

## `create-ai-os upgrade [target-dir]` — v7 → v8 migration

Migrates a v7 AI-OS project to v8. Mechanical, non-destructive to user content.

### Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would change without writing files |
| `--force` | Overwrite v8 conflicts (advanced; rarely needed) |

### What it does

1. Replaces root `AGENTS.md` with the v8 constitution
2. Removes obsolete framework (`.agents/workflows/`, `skills/`, `policies/`, `references/`)
3. Flattens `.ai-os/lanes/default/*` to `.ai-os/*` (for single-lane projects)
4. Merges `.ai-os/CONVENTIONS.md` into `.ai-os/memory.md`
5. Merges `.ai-os/project.md` into `.ai-os/MISSION.md`
6. Merges `.ai-os/acceptance.yaml` into `.ai-os/DESIGN.md` §13
7. Refreshes `.ai-os/framework.toml` + `managed-files.tsv` to v8 schema
8. Removes `.cursor/skills/` and `.cursor/rules/` auto-generated directories
9. Installs lightweight `CLAUDE.md` / `GEMINI.md` pointers
10. Updates `.gitignore` / `.gitattributes`
11. Fills missing v8 starter artifacts without overwriting user content

### What it does NOT do

- Does not touch business code
- Does not modify user-authored content inside `MISSION.md`, `DESIGN.md`, `specs/`, `tasks.yaml`, `memory.md`, or `baseline-log/` entries
- Does not delete your custom `.cursor/rules/*.mdc` files that weren't auto-generated (only the generated set)

### Recommended workflow

```bash
# 1. Dry run to see what will change
npx --yes github:royeedai/ai-os upgrade . --dry-run

# 2. Commit current state
git add -A && git commit -m "checkpoint before v8 upgrade"

# 3. Run the upgrade
npx --yes github:royeedai/ai-os upgrade .

# 4. Verify
npx --yes github:royeedai/ai-os doctor .

# 5. Review the diff, then commit
git diff
git add -A && git commit -m "migrate AI-OS v7 → v8"
```

---

## What was removed from v7

The following CLI subcommands **no longer exist**. Their behavior is covered by AI agents reading `AGENTS.md` directly:

| v7 command | v8 replacement |
|------------|----------------|
| `plan` | Dropped (install is idempotent; no preview needed) |
| `diff` | Dropped (use `git diff`) |
| `lab` | Dropped (use temp directories directly) |
| `validate` | Merged into `doctor` |
| `gate <phase>` | Merged into `doctor` (agents check gates via `AGENTS.md` behavior rules) |
| `skill-check` | Removed (skills system removed in v8) |
| `status` | Dropped (agents read `STATE.md` directly) |
| `next` | Dropped (agents read `tasks.yaml` directly) |
| `resume` | Dropped (agents read `STATE.md` directly) |
| `release-check` | Merged into `doctor` |
| `token-budget` | Dropped (model layer handles budgets natively) |
| `cursor-rules` | Dropped (IDE integration simplified) |
| `lane list/add/activate/archive` | Dropped (lanes are just directories; manage via file system / git) |

See [migrate-v7-to-v8.md](migrate-v7-to-v8.md) for behavioral equivalences.

---

## Invocation patterns

### Via `npx` (GitHub)

```bash
npx --yes github:royeedai/ai-os [subcommand] [args]
```

### Local development

```bash
node ./bin/create-ai-os.js [subcommand] [args]
```

### Global install

If published to npm:

```bash
npm install -g create-ai-os
create-ai-os [subcommand] [args]
```

---

## Environment

- Node.js ≥ 18 (for `fs.rmSync({ recursive: true })` support)
- Zero runtime dependencies
- `devDependencies` for development only: `eslint`
