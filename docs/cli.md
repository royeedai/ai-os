# CLI Reference

AI-OS provides **2 primary product operations**: install and doctor.

Install has two equivalent entrypoints: the default positional form (`create-ai-os [target-dir]`) and the explicit alias (`create-ai-os install [target-dir]`). The alias does not add a third product operation.

## Quick reference

```bash
create-ai-os [target-dir]
create-ai-os install [target-dir]
create-ai-os doctor [target-dir]
create-ai-os -h | --help
create-ai-os -v | --version
```

## Install: `create-ai-os [target-dir]` / `create-ai-os install [target-dir]`

Installs the v9 canonical layout:

- `AGENTS.md`
- `.ai-os/MISSION.md`
- `.ai-os/memory.md`
- `.ai-os/framework.toml`
- `.ai-os/managed-files.tsv`
- `.ai-os/lanes/default/` full starter set

### Options

- `--force`
- `--no-team-config`
- `--no-ide-files`

## `create-ai-os doctor [target-dir]`

Checks:

- `AGENTS.md` exists
- root shared artifacts exist
- `.ai-os/lanes/default/` exists
- lane core artifacts exist
- baseline log naming is valid
- `.gitignore` contains lane `STATE.md` and generated file ignores
- layout mode is canonical

### Structural & metadata codes

Beyond the semantic warnings below, doctor also emits structural / metadata codes for layout health: `E001` / `E002` (missing or wrong-schema `framework.toml`), `E010` (missing `AGENTS.md`), `E020` (missing core lane artifact), `E022` (expected directory is a file), `E050` / `E051` (`.ai-os/lanes` not a directory / missing default lane), `W001` (no `framework_version`), `W002` (installed framework older than current major), `W010` (`AGENTS.md` over the `<=150`-line target), `W011` (missing constitution section markers), `W020` / `W021` (missing extension artifact / empty file), `W030` / `W031` (empty baseline-log / non-conforming baseline name), `W040` / `W041` (`.gitignore` missing managed-file ignores), and `I020` (session-local `STATE.md` absent — informational). These run on every invocation; the authoritative list lives in `bin/ai-os-doctor.js`.

### Semantic consistency warnings (v9.1+)

In addition to layout health, doctor emits warnings when artifacts drift apart in meaning. These are warnings (non-blocking) by default; `--strict` upgrades them to errors.

- **W070** — lane `MISSION.md` references a `当前基线 ID` that has no matching file in `baseline-log/`
- **W071** — `tasks.yaml` has tasks under the top-level `tasks:` block without an `owner` field
- **W072** — each non-placeholder AC in `DESIGN.md` must be referenced in `verification-matrix.yaml`
- **W074** — high-risk lanes or tasks must have populated `risk-register.md`, `release-plan.md`, and a real verification guard
- **W076** — task handoff / evidence loops should include `acceptance_refs`, `evidence_required`, handoff `context_refs` / `expected_return`, and produced evidence before `done` / `verified` / `shipped`
- **W077** — tasks in execution / completion should include `fact_state_review`, and closed tasks must not retain unresolved `inferred` / `unknown` entries
- **W078** — long-horizon / background / external / parallel agent work should include `agent_run_review` run refs, write scope, expected return, produced evidence, return packet, human review, and no unresolved risks before closure

These are skipped on a clean default install (template placeholders are detected and ignored).

CR delta lifecycle fields, URL evidence confidence, and Framework feedback `## Preventability review` are carried by artifact templates and `AGENTS.md` behavior rules — not doctor soft checks (removed in v9.8 as redundant with stronger frontier models). Maintainer aggregation: `docs/maintainers.md` (Framework feedback 复盘).

### Options

- `--json` — machine-readable output for CI
- `--strict` — exit non-zero on warnings as well as errors

### JSON output

`doctor --json` returns:

- `layout_version`
- `layout_mode`
- `issues[]`
- `semantic_warnings[]` — convenience filter of `issues[]` containing W070-W078 semantic warning codes
