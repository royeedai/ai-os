# CLI Reference

AI-OS v9 provides **3 commands**.

## Quick reference

```bash
create-ai-os [target-dir]
create-ai-os install [target-dir]
create-ai-os doctor [target-dir]
create-ai-os upgrade [target-dir]
create-ai-os -h | --help
create-ai-os -v | --version
```

## `create-ai-os [target-dir]`

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

### JSON output

`doctor --json` returns:

- `layout_version`
- `layout_mode`
- `issues[]`

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
