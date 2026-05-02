# CLI Reference

AI-OS v9 provides **3 primary product operations**: install, doctor, and upgrade.

Install has two equivalent entrypoints: the default positional form (`create-ai-os [target-dir]`) and the explicit alias (`create-ai-os install [target-dir]`). The alias does not add a fourth product operation.

## Quick reference

```bash
create-ai-os [target-dir]
create-ai-os install [target-dir]
create-ai-os doctor [target-dir]
create-ai-os upgrade [target-dir]
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
- layout mode is canonical, legacy, or drift

### Semantic consistency warnings (v9.1+)

In addition to layout health, doctor emits warnings when artifacts drift apart in meaning. These are warnings (non-blocking) by default; `--strict` upgrades them to errors.

- **W070** — lane `MISSION.md` references a `当前基线 ID` that has no matching file in `baseline-log/`
- **W071** — `tasks.yaml` has tasks under the top-level `tasks:` block without an `owner` field
- **W072** — each non-placeholder AC in `DESIGN.md` must be referenced in `verification-matrix.yaml`
- **W073** — each `CR-*` baseline record should include Current behavior, Proposed delta, Affected artifacts, Acceptance delta, and Close/archive condition
- **W074** — high-risk lanes or tasks must have populated `risk-register.md`, `release-plan.md`, and a real verification guard
- **W075** — URL reverse-spec evidence rows must include `observed` / `inferred` / `unknown` confidence

These are skipped on a clean default install (template placeholders are detected and ignored).

### Options

- `--json` — machine-readable output for CI
- `--strict` — exit non-zero on warnings as well as errors

### JSON output

`doctor --json` returns:

- `layout_version`
- `layout_mode`
- `issues[]`
- `semantic_warnings[]` — convenience filter of `issues[]` containing W070-W075 semantic warning codes

## `create-ai-os upgrade [target-dir]`

Normalizes older layouts to v9 canonical layout.

Supported inputs:

- v7 legacy
- v8 root-only
- v8 hybrid root+lane drift

### What it does

1. Replaces `AGENTS.md` with v9
2. Removes obsolete `.agents/` workflow / skill / policy / reference directories
3. Normalizes current delivery artifacts into `.ai-os/lanes/default/`
4. Preserves shared memory at `.ai-os/memory.md`
5. Creates or repairs root shared `.ai-os/MISSION.md`
6. Rewrites metadata and managed-files manifest
7. Refreshes IDE pointers and team config

### What it does not do

- does not touch business code outside AI-OS-managed files
- does not delete user-authored current-lane content without preserving it
- does not treat root-only v8 as canonical in v9
