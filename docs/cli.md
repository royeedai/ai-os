# CLI Reference

AI-OS provides **2 primary product operations**: install and doctor.

Install has two equivalent entrypoints: the default positional form (`create-ai-os [target-dir]`) and the explicit alias (`create-ai-os install [target-dir]`).

## Quick reference

```bash
create-ai-os [target-dir]
create-ai-os install [target-dir]
create-ai-os doctor [target-dir]
create-ai-os -h | --help
create-ai-os -v | --version
```

## Install: `create-ai-os [target-dir]` / `create-ai-os install [target-dir]`

Installs the v10 canonical layout:

- `AGENTS.md`
- `.ai-os/MISSION.md`
- `.ai-os/memory.md`
- `.ai-os/framework.toml`
- `.ai-os/managed-files.tsv`
- `.ai-os/bin/` local doctor entry (`ai-os-doctor.js` + `shared.js` + `VERSION`, committed)
- `.ai-os/lanes/default/` core lane set (`lane.toml`, `MISSION.md`, `DESIGN.md`, `STATE.md`, `baseline-log/`, `tasks.yaml`)

Extension artifacts (`risk-register.md`, `release-plan.md`, `verification-matrix.yaml`, `specs/`, `design-pack/`, `evals/`) are **on-demand**: created by the agent when their trigger condition is hit (see `docs/artifacts.md`), never installed by default.

Pin a release for reproducible installs: `npx --yes github:royeedai/ai-os#v11.0.0 .`. The install is the only step that needs the network.

### Options

- `--force`
- `--no-team-config`
- `--no-ide-files`
- `-h, --help` (also works after the explicit `install` alias)

### Removed subcommands

`create-ai-os upgrade` exits with an error pointing to `create-ai-os install . --force` (removed in v10). A target path that exists but is a regular file also fails cleanly instead of crashing.

## `create-ai-os doctor [target-dir]`

Checks:

- `AGENTS.md` exists
- root shared artifacts exist
- `.ai-os/lanes/default/` exists with core lane artifacts
- baseline log naming is valid
- `.gitignore` contains lane `STATE.md` and generated file ignores
- layout mode is canonical

### Local doctor entry (zero external request)

`install` vendors the doctor into the target project at `.ai-os/bin/` (committed). After the one-time install, all daily / IDE-hook / CI runs use the local entry and make **no external request**:

```bash
node .ai-os/bin/ai-os-doctor.js . --strict
```

Because `.ai-os/bin/` is committed (unlike the gitignored `.ai-os/framework.toml`), teammates and CI that clone the repo run doctor offline without re-installing — the committed `.ai-os/bin/VERSION` supplies the framework version. Re-run `install . --force` to refresh the vendored entry after upgrading the framework.

### Structural & metadata codes

`E001` / `E002` (missing or wrong-schema `framework.toml`), `E010` (missing `AGENTS.md`), `E020` (missing core lane artifact), `E022` (artifact path has the wrong type), `E050` / `E051` (`.ai-os/lanes` not a directory / missing default lane), `W001` (no `framework_version`), `W002` (installed framework older than current major), `W010` (`AGENTS.md` over the `<=150`-line target), `W011` (missing constitution section markers), `W020` / `W021` (missing extension artifact / empty file), `W030` / `W031` (empty baseline-log / non-conforming baseline name), `W040` / `W041` (`.gitignore` missing managed-file ignores), `W050` (lane missing `lane.toml`), and `I020` (session-local `STATE.md` absent — informational). The authoritative list lives in `bin/ai-os-doctor.js`.

### Semantic consistency warnings

Warnings (non-blocking) by default; `--strict` upgrades them to errors.

- **W070** — lane `MISSION.md` references a `当前基线 ID` that has no matching file in `baseline-log/`
- **W071** — `tasks.yaml` has tasks under the top-level `tasks:` block without an `owner` field

On-demand artifacts (risk-register, verification-matrix, etc.) are not structurally checked by doctor; their correct use is carried by `AGENTS.md` behavior rules and artifact schemas.

### Options

- `--json` — machine-readable output for CI
- `--strict` — exit non-zero on warnings as well as errors

### JSON output

`doctor --json` returns:

- `layout_version`
- `layout_mode`
- `issues[]`
- `semantic_warnings[]` — convenience filter of `issues[]` containing W070/W071 semantic warning codes
