# AI-OS v11 Quality Hardening Design

- **Status:** approved for planning
- **Approved by:** repository owner in the Codex task on 2026-07-10
- **Target:** unreleased `11.0.0`
- **Scope:** installer, distributed templates, doctor, documentation, examples, evals, tests, CI, repository security, and release metadata

## 1. Goal

Make AI-OS a safe, internally consistent, testable delivery-governance distribution for AI-assisted projects without turning it into an agent runtime, orchestrator, background service, deployment system, or telemetry product.

Completion means all audit findings are either fixed or deliberately removed from the supported product contract, with fresh evidence for code, repository data, and runtime behavior.

## 2. Non-goals

- No agent runner, scheduler, lease service, model router, MCP server, or daemon.
- No automatic memory extraction, automatic CR aggregation, or telemetry upload.
- No subjective project-quality score in doctor.
- No general-purpose package manager or migration framework.
- No automatic production deployment or automatic release platform.
- No new default business artifact category unless a deterministic, cross-project failure requires it.

## 3. Release decision

`11.0.0` has no remote tag and is treated as an unreleased candidate. It can change before publication.

The repository will distinguish:

- `VERSION`: the framework version under development;
- `RELEASED_VERSION`: the latest externally installable immutable tag.

README, examples, and getting-started commands must use `RELEASED_VERSION`, not the unreleased development version. The `11.0.0` changelog entry remains explicitly `Unreleased` until a final release gate is authorized and completed.

AI-OS remains GitHub-distributed. Official messages must never recommend bare `npx create-ai-os`, because the unscoped npm package is not published. Every remote invocation uses an explicit pinned GitHub ref. `package.json` declares the registry-publication decision explicitly so accidental npm publication cannot become an undocumented release path.

## 4. Ownership model

Every installed path has exactly one ownership class.

| Class | Examples | Install/update behavior |
|---|---|---|
| `framework` | local doctor, stable metadata, ownership manifest, local artifact reference | May be replaced only after path-safety checks; source hash is recorded |
| `project` | `AGENTS.md`, shared/lane MISSION, memory, DESIGN, tasks, baseline log, root team config | Create only; never overwrite modified content; known pristine old templates may be upgraded by exact hash |
| `session` | lane `STATE.md` | Create only when absent; never overwrite an existing session state |

IDE pointer files are `project` paths. A pristine, recognized AI-OS stub may be refreshed; a customized file is preserved.

`.gitignore` and `.gitattributes` remain project-owned. AI-OS may replace only its own bounded `BEGIN AI-OS` / `END AI-OS` block. It must not use substring detection or append rules outside that block.

## 5. Canonical layout v11

The layout schema becomes `11`.

```text
<project-root>/
  AGENTS.md
  .ai-os/
    MISSION.md
    memory.md
    framework.toml
    managed-files.tsv
    reference/
      artifacts.md
    bin/
      ai-os-doctor.js
      doctor-shared.js
      VERSION
    lanes/
      default/
        lane.toml
        MISSION.md
        DESIGN.md
        STATE.md
        baseline-log/
        tasks.yaml
```

`.ai-os/reference/artifacts.md` is framework-owned, read-only product reference, not a delivery artifact. It makes on-demand schemas available offline and is the only schema target referenced by the distributed constitution and skill.

`framework.toml` and `managed-files.tsv` become stable, committed framework metadata. Installation timestamps are removed because they are local, non-reproducible data. `.gitignore` ignores only session-local state and genuinely generated temporary files.

`managed-files.tsv` columns are:

```text
path  type  ownership  source_sha256
```

Project/session paths have an empty source hash. Framework paths carry the exact packaged source hash.

## 6. Installer transaction

Installation follows a bounded state machine.

### 6.1 Preflight

Before any target write:

1. Load and validate every packaged source file.
2. Resolve the target root once.
3. Walk every existing parent and destination with `lstat`.
4. Reject symbolic links, junctions, non-directory parents, and real paths outside the resolved target.
5. Classify every destination by ownership and current hash.
6. Detect foreign/custom `AGENTS.md`, IDE pointers, and team-config conflicts.
7. Detect concurrent installation using an exclusive, temporary target-local lock.
8. Build a complete operation plan or fail without changing the target.

Expected filesystem conflicts produce concise installer diagnostics, not raw Node stack traces.

### 6.2 Staging

All replacement content is rendered before commit. Replacement files are written to same-directory temporary files with exclusive/no-follow semantics where the platform supports them. Existing framework-owned files receive bounded backups for rollback.

### 6.3 Commit and rollback

Commit uses atomic rename per file. A commit failure restores framework-owned backups and removes only files/directories created by the current operation. Project-authored files are never rollback targets because they are never overwritten.

The lock and temporary files are removed on both success and handled failure.

### 6.4 Command behavior

- First install creates missing project/session artifacts and all framework paths.
- Reinstall does not create another initial baseline and does not change project/session content.
- `--force` refreshes only framework-owned files. It never changes `AGENTS.md`, MISSION, memory, DESIGN, tasks, baseline log, STATE, or customized IDE/team configuration.
- A foreign/custom root `AGENTS.md` is a preflight conflict. No partial `.ai-os` install is written.
- An exact recognized earlier AI-OS constitution may be upgraded automatically; customized constitutions require a manual merge and remain untouched.
- On-demand artifacts already present are preserved and are never removed by migration.

## 7. v10 to v11 migration

Migration is a specific compatibility path, not a general migration engine.

1. Recognize v10 metadata, pristine template hashes, and the legacy managed git blocks.
2. Preserve all project/session artifacts.
3. Replace only recognized pristine framework/tooling content.
4. Install committed stable metadata, ownership manifest, local reference, and the smaller doctor shared module.
5. Replace the legacy AI-OS `.gitignore` block so metadata/manifest/tooling remain committed and only STATE stays ignored.
6. Remove the AI-OS `memory.md merge=union` rule from the managed `.gitattributes` block.
7. Preserve every existing on-demand artifact.
8. If constitution or team configuration is customized, stop before writes and provide a precise conflict report.

No migration instruction may recommend destructive `install --force` behavior.

## 8. Governance truth model

### 8.1 Authority

The authority order is:

1. root `AGENTS.md`: behavior constitution;
2. lane `lane.toml`: machine-readable lane identity, current baseline, and tier truth;
3. lane `MISSION.md`: human-readable product/acceptance baseline;
4. lane `DESIGN.md`: confirmed contracts and acceptance criteria;
5. lane `tasks.yaml`: execution, approval, dependency, and evidence state;
6. lane `STATE.md`: session navigation only, never an authority over committed truth.

If STATE conflicts with committed truth, STATE is stale and must be rebuilt.

### 8.2 Tiers

Task priority continues to use `P0` / `P1` / `P2` / `P3`. Governance uses a distinct namespace.

| Governance | Meaning | Minimum behavior |
|---|---|---|
| `G0` | low risk, clear scope, exploratory quality | confirmed goal/scope and project-native verification |
| `G1` | standard delivery or medium uncertainty/risk | confirmed design/AC, task/evidence traceability, regression checks |
| `G2` | high risk, strict quality, irreversible/production/asset/permission/external effects | structured human approval, risk/release/verification artifacts, rollback evidence |

Fresh templates use `unassessed` for `quality_tier`, `risk_tier`, and `governance_tier`. Delivery is not ready until they are assessed.

`lane.toml` is the tier truth source. Human-readable mirrors are allowed only where doctor verifies equality.

### 8.3 Baseline lifecycle

The lifecycle is:

```text
bootstrap-unconfirmed
  -> confirmed BL
  -> proposed CR
  -> approved CR
  -> applied CR
  -> new immutable confirmed BL
```

The bootstrap record has no confirmation timestamp or confirmation claim. A confirmed BL records `previous_baseline_id`, `confirmed_by`, `confirmed_at`, and source references. A CR records status, current behavior, proposed delta, affected artifacts, acceptance delta, approval, close condition, and preventability review.

`lane.toml.baseline_id` is the current pointer. Tasks bind to a baseline snapshot. STATE may display the current ID only as a recoverable mirror.

## 9. Task, approval, and evidence schema

The canonical task schema becomes version 5. Every task keeps its existing identity, dependency, priority, acceptance, and scope fields and adds structured approval/evidence.

```yaml
approval:
  required: true
  status: pending        # not-required | pending | approved | rejected | expired
  decided_by: ""
  decided_at: ""
  baseline_id: ""
  approved_scope: []
  conditions: []
  evidence_ref: ""
evidence_produced:
  - id: EV-001
    kind: test           # static | test | runtime | data | manual | release
    command: "npm test"
    exit_code: 0
    git_sha: "<full commit>"
    environment: "node-24 / ubuntu"
    observed_at: "<ISO-8601>"
    artifact: "<path or URL>"
    confidence: observed # observed | inferred | unknown
delivery_state:
  code: observed
  data: not-applicable
  runtime: unknown
```

The angle-bracket values above describe field meaning in this design, not shipped template placeholders. Shipped templates use empty values and explanatory comments.

Rules:

- An AI agent cannot populate a human approval decision from inference.
- `done`/`shipped` requires valid `acceptance_refs` and fresh observed evidence bound to the active baseline/commit.
- Inferred or unknown evidence cannot satisfy a completion gate.
- Code/data/runtime state is persisted, not only stated in chat.

## 10. On-demand trigger matrix

| Artifact | Trigger |
|---|---|
| `risk-register.md` | G2/high-risk work |
| `release-plan.md` | explicit publish/deploy/release intent, or G2 release preparation |
| `verification-matrix.yaml` | stable failure-mode guard, or G2 minimum guard |
| `specs/` | DESIGN must be split into local contracts |
| `design-pack/` | reverse-spec parity evidence |
| `evals/` | the same root cause is observed at least three times |

This matrix is canonical across AGENTS, local reference, skill, docs, examples, evals, and tests.

## 11. Doctor contract

Doctor remains zero-network and zero-runtime-dependency.

### 11.1 Result dimensions

JSON and text output distinguish:

- `layout_ok`: supported layout, metadata, path types, containment, and required artifacts;
- `delivery_ready`: confirmed baseline, assessed tiers, valid task/AC/evidence state, and required G2 approval/artifacts.

`ok` retains CLI compatibility and means no errors plus, under `--strict`, no warnings.

### 11.2 Exit codes

- `0`: no structural errors; warnings allowed without `--strict`;
- `1`: structural error, or any warning under `--strict`;
- `2`: target is not an AI-OS project.

A fresh install can have `layout_ok=true` and `delivery_ready=false`. It passes non-strict layout inspection and fails strict delivery gating until alignment is confirmed.

### 11.3 Deterministic checks

Doctor validates:

- required metadata keys and exact schema/layout/mode/default-lane values;
- semantic framework versions without inventing current values;
- every lane, not only `default`;
- regular-file/directory types and rejection of managed-path symlinks;
- full anchored baseline filenames and regular-file records;
- lane.toml/MISSION/tasks baseline alignment;
- canonical tasks YAML subset, regardless of field order;
- duplicate task IDs, owner, status, dependency references, acceptance references;
- `done`/`shipped` evidence and G2 approval requirements;
- on-demand artifact structure when present and deterministic trigger-required presence;
- exact active `.gitignore` managed rules, including negation/order handling;
- distributed constitution identity/required anchors without claiming semantic proof it cannot provide.

Unsupported or malformed canonical TOML/YAML fails closed with a specific issue. Doctor does not attempt a general TOML/YAML implementation.

## 12. Memory and multi-agent collaboration

The union merge rule is removed. `memory.md` uses normal Git conflict handling.

Stable entries gain globally unique IDs and fields for `status`, `source`, `owner`, `last_verified`, and `supersedes`. Superseded records remain traceable but cannot appear as simultaneously active truth.

The skill parameterizes lane paths as `{laneId}`. Lane selection uses explicit user target, task/baseline references, and repository facts; ambiguity requires one question. A coordinating writer owns governance artifacts. Worker agents return a bounded handoff:

```text
task_id, lane_id, baseline_id, change_ref, evidence_refs, blockers
```

This is a file/communication protocol, not an orchestrator.

## 13. Skill, docs, examples, and evals

The official skill becomes a thin activation/loading adapter. It contains applicability, Activation Gate, lane selection, read order, and a requirement to follow local `AGENTS.md`; it does not duplicate the constitution.

Distributed references point only to files that exist after installation. Downstream AGENTS no longer references AI-OS maintainer documentation.

Examples must obey the same scope and trigger rules they teach. The photo example removes the invented Stripe webhook and does not create a CR for initial alignment. Release-plan examples use the canonical release-intent trigger.

Each repository eval becomes a machine-checkable oracle with:

- `input`;
- `expected_decisions`;
- `forbidden_actions`;
- `required_artifact_deltas`;
- `minimum_evidence`;
- `oracle_version` and framework provenance.

Static tests validate oracle structure and cross-surface trigger/authority matrices. A live cross-model harness is not shipped. Maintainers may run a documented, manual model matrix and record sanitized results.

## 14. Test architecture

Tests migrate to Node's built-in `node:test` so individual cases have isolation, names, timeouts, and native coverage.

Required suites:

1. source/unit tests for strict parsers, hashes, ownership, and operation planning;
2. fresh-install integration tests;
3. reinstall/force/v10-migration tests proving user content and baseline count are unchanged;
4. adversarial filesystem tests for symlinks, junctions where available, wrong types, readonly paths, concurrency, and rollback;
5. doctor table tests for every metadata field, lane, baseline, task order/form, approval, evidence, and gitignore negation;
6. installed-reference/link integrity tests;
7. npm-pack allowlist and tarball-install smoke tests;
8. docs/examples/eval matrix consistency tests;
9. release-truth tests separating `VERSION` and `RELEASED_VERSION`.

Coverage thresholds start no lower than the freshly measured baseline and may increase after parser/security branches are covered. Coverage is supporting evidence, not a substitute for contract tests.

## 15. CI and supply chain

Repository CI will include:

- explicit `permissions: contents: read`;
- GitHub Actions pinned to reviewed full commit SHAs;
- full `npm ci`, lint, tests, diff-check, and pack smoke on supported Node versions;
- Node 22 and 24 blocking jobs;
- Node 26 canary coverage;
- Ubuntu and Windows blocking smoke, with macOS path/symlink smoke where behavior differs;
- Unicode/space paths and CRLF coverage;
- production dependency audit and a scheduled/full development audit;
- package contents and executable-mode checks.

`package.json` declares the supported Node floor consistently with the developer toolchain. Node 18/20 are removed from the supported matrix.

Repository security additions:

- `.github/dependabot.yml` for npm and GitHub Actions;
- `SECURITY.md`;
- `.github/CODEOWNERS` protecting installer, templates, workflows, release metadata, and CODEOWNERS itself;
- dependency review and CodeQL configuration where repository settings permit them.

After local implementation and spec review, repository rules are configured to require PR review, current CI checks, resolved conversations, no force push/deletion, and code-owner review for critical paths. External settings are verified by readback.

## 16. Release gate

Every patch, minor, and major release requires a tag. The release checklist proves:

1. `VERSION`, package version, lockfile, changelog target, and candidate tag agree;
2. README/docs pins agree with `RELEASED_VERSION` before and after release transition;
3. all supported-platform CI and tarball smoke checks pass;
4. production audit has no known vulnerability;
5. the release commit and annotated tag are signed or otherwise verified under the repository's documented trust policy;
6. the GitHub Release points to the exact tag and includes checksum/package-content evidence;
7. a pinned-ref installation smoke test succeeds.

Creating/pushing the final public tag or release is a separate external release action. Until that action is explicitly executed, docs continue to point to the last real release and v11 remains `Unreleased`; the repository never advertises a nonexistent ref.

## 17. Error handling and compatibility

- Expected user/path/schema conflicts have stable diagnostics and no stack dump.
- JSON doctor fields are additive except where the v11 schema intentionally changes truth semantics.
- Existing on-demand artifacts are preserved; v11 doctor validates them only when present or deterministically required.
- Modified user content always wins over framework convenience.
- Failure leaves either the previous valid state or a complete new state, not a claimed successful mixture.

## 18. Completion evidence

The goal is complete only when all of the following are current-state facts:

- no official command references a nonexistent or unintended package/ref;
- normal/force/migration installs cannot overwrite project/session content;
- adversarial link tests cannot write outside the target;
- reinstall is file-set and baseline-count idempotent;
- failed install rolls back;
- fresh install is unconfirmed and not delivery-ready;
- local schema references resolve offline;
- governance tiers, baseline lifecycle, approval, evidence, and authority are consistent everywhere;
- doctor is fail-closed for its canonical formats and checks every lane;
- skill is a thin adapter and examples/evals satisfy the canonical matrices;
- native tests, lint, diff-check, pack/tarball smoke, coverage, and supported-platform CI pass;
- repository security/release settings are applied or explicitly proven unavailable with a non-misleading documented state;
- code, repository data, and runtime status are reported separately with evidence.
