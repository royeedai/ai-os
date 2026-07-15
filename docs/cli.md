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

Installs the v11 canonical layout:

- `AGENTS.md`
- `.ai-os/MISSION.md`
- `.ai-os/memory.md`
- `.ai-os/framework.toml`
- `.ai-os/managed-files.tsv`
- `.ai-os/bin/` local doctor runtime (`ai-os-doctor.js` + `doctor-shared.js` + `VERSION`, committed)
- `.ai-os/lanes/default/` core lane set (`lane.toml`, `MISSION.md`, `DESIGN.md`, `STATE.md`, `baseline-log/`, `tasks.yaml`)

Extension artifacts (`risk-register.md`, `release-plan.md`, `verification-matrix.yaml`, `specs/`, `design-pack/`, `evals/`) are **on-demand**: created by the agent when their trigger condition is hit (see `docs/artifacts.md`), never installed by default.

Pin a release for reproducible installs: `npx --yes github:royeedai/ai-os#v10.5.1 .`. The install is the only step that needs the network. The CLI delegates one complete plan to the transactional safe installer; conflicts and filesystem failures stop with no partial install.

### Options

- `--force` — refresh recognized framework-owned files only; project-owned and session-owned bytes are preserved
- `--no-team-config`
- `--no-ide-files`
- `-h, --help` (also works after the explicit `install` alias)

### Removed subcommands

`create-ai-os upgrade` exits with an error because the subcommand was removed in v10 and points to the exact pinned public install form above. It never recommends a destructive force refresh. Unknown options, conflicts, unsafe paths, an active install lock, and a target path that is a regular file fail with one concise diagnostic and no partial writes.

## `create-ai-os doctor [target-dir]`

Checks:

- committed framework metadata and managed-file hashes
- every lane's core layout and canonical metadata
- baseline lifecycle, tier mirrors, task/AC/dependency state, approvals, evidence, and required artifacts
- local Git ancestry, clean state, impact scope, and historical task semantics when completed evidence requires them
- effective `.gitignore` rules, including ordered negation, for session-local lane `STATE.md`
- deterministic schemas for every on-demand artifact that is present

A fresh install is layout-valid but not delivery-ready: its bootstrap baseline is
unconfirmed, tiers are unassessed, and example tasks are still `todo`. Doctor
reports these as informational readiness codes without turning them into layout
errors.

### Local doctor entry (zero external request)

`install` vendors the doctor into the target project at `.ai-os/bin/` (committed). After the one-time install, all daily / IDE-hook / CI runs use the local entry and make **no external request**:

```bash
node .ai-os/bin/ai-os-doctor.js . --strict
```

The local runtime is deliberately small: `ai-os-doctor.js`, its read-only `doctor-shared.js` helper, and `VERSION`. `.ai-os/bin/`, `.ai-os/framework.toml`, and `.ai-os/managed-files.tsv` are committed so teammates and CI share the same doctor and framework identity. The AI-OS-managed ignore block contains only session-local lane `STATE.md`. A fresh install from the pinned release vendors the matching entry.

### Issue codes

The authoritative catalog lives in `bin/ai-os-doctor.js`:

- Structural errors: `E001`, `E002`, `E003`, `E004`, `E010`, `E020`, `E022`, `E050`, `E051`.
- Layout warnings: `W010`, `W011`, `W030`, `W031`, `W040`, `W041`.
- Compatibility semantic warnings: `W070` for the readable MISSION baseline reference and `W071` for legacy owner scanning.
- Session warning: `W072` means optional `STATE.md` mirrors are stale and must be rebuilt; STATE never becomes authority and this code is not copied into `semantic_warnings`.
- Layout information: `I020` means optional session-local `STATE.md` is absent.
- Readiness information: `R001` unconfirmed bootstrap, `R002` status/tier assessment, `R010` baseline alignment/lifecycle, `R020` task/dependency/AC/completion, `R021` evidence binding, `R022` local Git unavailable/dirty/budget failure, `R030` approval, and `R031` required artifact presence.

Every issue has `level === severity`; R codes are informational and block the
affected lane's `delivery_ready`, not `layout_ok`.

### Package boundary

The packaged tarball contains four `bin/` scripts: the thin `create-ai-os.js` entry, the transactional `installer.js`, and the read-only doctor pair `ai-os-doctor.js` / `doctor-shared.js`. Installed projects receive only the doctor pair plus `VERSION`; installer code is never copied into `.ai-os/bin/`.

### Options

- `--json` — machine-readable output for CI
- `--strict` — require `layout_ok && delivery_ready` and no warnings

Normal mode exits 0 when `layout_ok` is true, even when readiness is still
false. Strict mode exits 1 for a layout error, any warning, or incomplete
delivery readiness. A directory without `.ai-os/` exits 2.

### JSON output

`doctor --json` returns the compatibility fields plus `layout_ok`,
`delivery_ready`, and one report for every lane. `semantic_warnings` references
the same W070/W071 issue objects; it is not a second diagnostic truth.

The following normalized fixture is generated from a fresh install. Only the
absolute target path and generated bootstrap ID are replaced.

<!-- doctor-report:start -->
```json
{
  "ok": true,
  "version": "11.0.0",
  "package": "create-ai-os@11.0.0",
  "targetDir": "<target-dir>",
  "installedVersion": "11.0.0",
  "layout_version": "11",
  "layout_mode": "shared-root-default-lane",
  "issues": [
    {
      "level": "info",
      "code": "R001",
      "message": "Current baseline is the unconfirmed bootstrap record.",
      "severity": "info",
      "path": ".ai-os/lanes/default/baseline-log/<bootstrap-id>.md",
      "lane_id": "default"
    },
    {
      "level": "info",
      "code": "R002",
      "message": "Lane tiers are unassessed, inconsistent, or below the required governance floor.",
      "severity": "info",
      "path": ".ai-os/lanes/default/lane.toml",
      "lane_id": "default"
    },
    {
      "level": "info",
      "code": "R020",
      "message": "Every active task must be terminal with complete AC, dependency, evidence, and delivery state.",
      "severity": "info",
      "path": ".ai-os/lanes/default/tasks.yaml",
      "lane_id": "default"
    }
  ],
  "semantic_warnings": [],
  "layout_ok": true,
  "delivery_ready": false,
  "lanes": {
    "default": {
      "layout_ok": true,
      "delivery_ready": false,
      "issues": [
        {
          "level": "info",
          "code": "R001",
          "message": "Current baseline is the unconfirmed bootstrap record.",
          "severity": "info",
          "path": ".ai-os/lanes/default/baseline-log/<bootstrap-id>.md",
          "lane_id": "default"
        },
        {
          "level": "info",
          "code": "R002",
          "message": "Lane tiers are unassessed, inconsistent, or below the required governance floor.",
          "severity": "info",
          "path": ".ai-os/lanes/default/lane.toml",
          "lane_id": "default"
        },
        {
          "level": "info",
          "code": "R020",
          "message": "Every active task must be terminal with complete AC, dependency, evidence, and delivery state.",
          "severity": "info",
          "path": ".ai-os/lanes/default/tasks.yaml",
          "lane_id": "default"
        }
      ]
    }
  }
}
```
<!-- doctor-report:end -->
