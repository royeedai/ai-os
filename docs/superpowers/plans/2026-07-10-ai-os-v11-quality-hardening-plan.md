# AI-OS v11 Quality Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved v11 hardening design across release truth, installer safety, governance/doctor, distributed surfaces/evals, CI/security, and completion evidence.

**Architecture:** Six bounded subplans form one dependency-ordered program.
Foundation runs first. Installer safety Tasks 1-3 precede governance-template
Task 1; installer Tasks 4-7 then consume those schemas; governance/doctor Tasks
2-6 consume the installed layout. Surfaces precede CI to avoid shared-doc edits,
and completion runs last against reviewed local and remote state.

**Tech Stack:** Node.js 22.13+, CommonJS, `node:test`, npm, Markdown/TOML/YAML canonical subsets, GitHub Actions/API.

## Global Constraints

- Follow `/Users/dai/code/ai-os/docs/superpowers/specs/2026-07-10-ai-os-v11-quality-hardening-design.md` exactly.
- Do not create repository `.ai-os/` state or run AI-OS doctor against this source repository.
- Preserve zero production dependencies and the non-runtime/non-orchestrator boundary.
- Use TDD and a focused commit for every subplan task.
- Do not start a dependent subplan until its consumed interfaces pass review.
- Do not publish/merge/tag v11 as part of implementation completion.

---

## Program File Structure

- `bin/doctor-shared.js`: vendorable layout/parser/path primitives.
- `bin/installer.js`: ownership-aware install plan and transaction.
- `bin/create-ai-os.js`: CLI entry only.
- `bin/ai-os-doctor.js`: all-lane layout/readiness inspection and report.
- `framework/.agents/templates/`: distributed constitution/project templates.
- `docs/artifacts.md`: canonical artifact schema copied into installed reference.
- `test/`: native test, security, migration, package, contract, eval, and CI policy suites.
- `.github/`: supported CI, security workflows, ownership, and desired protection payload.
- `docs/superpowers/plans/*completion-matrix.md`: final evidence ledger.

## Dependency Graph

```text
Foundation
  -> Safe Installer Tasks 1-3
    -> Governance Task 1 (canonical templates)
      -> Safe Installer Tasks 4-7
        -> Governance + Doctor Tasks 2-6
          -> Surfaces + Evals
            -> CI + Supply Chain
All implementation + reviews
  -> Completion + Repository Governance
```

## Approved Design Coverage

| Design section | Implemented by |
| --- | --- |
| 1. Goal | All six subplans; Completion Tasks 1 and 7 prove the objective |
| 2. Non-goals | Global constraints; Installer Tasks 1-7; Surfaces Task 5 |
| 3. Release truth | Foundation Tasks 2-3; Completion Tasks 3, 5, and 7 |
| 4. Ownership model | Installer Tasks 1-5 |
| 5. Layout v11 | Installer Task 4; Governance Tasks 1 and 3 |
| 6. Safe transaction | Installer Tasks 1-3 and 5 |
| 7. Bounded v10 migration | Installer Task 6; Completion Task 2 |
| 8. Governance model | Governance Tasks 1 and 4; Surfaces Task 1 |
| 9. Task/approval/evidence schema | Governance Tasks 1, 2, and 4 |
| 10. Artifact triggers | Surfaces Tasks 1 and 3; Governance Task 5 |
| 11. Doctor semantics | Governance Tasks 2-6 |
| 12. Memory and conflict safety | Governance Task 1; Installer Task 6; Surfaces Task 3 |
| 13. Distributed surfaces | Installer Task 4; Surfaces Tasks 1-4 and 6 |
| 14. Tests and evals | Foundation Tasks 1 and 3; Surfaces Task 5; all subplan TDD tasks |
| 15. CI and supply chain | CI/Security Tasks 1-5; Completion Tasks 5-6 |
| 16. Release process | Foundation Task 2; Surfaces Task 6; Completion Tasks 3, 5-7 |
| 17. Error and recovery behavior | Installer Tasks 2-3 and 7; Governance Tasks 3-5 |
| 18. Completion criteria | Completion Tasks 1-7 |
| 19. Workstream decomposition | This dependency graph and Tasks 1-6 below |

### Task 1: Execute the foundation subplan

**Plan:** `docs/superpowers/plans/2026-07-10-ai-os-v11-foundation-plan.md`

- [ ] Complete native test migration and make the pre-existing docs-directory failure green.
- [ ] Separate `VERSION=11.0.0` from `RELEASED_VERSION=10.5.1`.
- [ ] Add actual tarball install/package tests and coverage floors.
- [ ] Run the subplan's full gate and obtain an independent review.

**Exit interface:** native tests are fail-fast; release pins are truthful; packaged docs are observable in tarball tests.

### Task 2: Execute the safe-installer subplan

**Plan:** `docs/superpowers/plans/2026-07-10-ai-os-v11-installer-plan.md`

- [ ] Complete installer Tasks 1-3: path/hash/ownership primitives, planning,
  adversarial links, staging, rollback, lock, and transaction review.
- [ ] Pause for governance Task 1 so canonical v11 templates exist.
- [ ] Install layout v11 with local reference and unconfirmed bootstrap.
- [ ] Prove reinstall/force idempotency and project/session preservation.
- [ ] Add bounded v10 hash compatibility and managed-block migration.
- [ ] Split installer runtime from vendored doctor runtime.
- [ ] Run the subplan's full gate and two-stage review.

**Exit interface:** `installProject`, `inspectPath`, strict metadata/manifest contract, vendored `doctor-shared` boundary.

### Task 3: Execute the governance/doctor subplan

**Plan:** `docs/superpowers/plans/2026-07-10-ai-os-v11-governance-doctor-plan.md`

- [ ] After installer Task 3, complete governance Task 1 to upgrade
  lane/tasks/baseline/memory schemas, test it, and review the template contract.
- [ ] Resume only after installer Tasks 4-7 complete.
- [ ] Implement strict canonical parsers.
- [ ] Check layout metadata and every lane.
- [ ] Check baseline/task/approval/evidence/G2 readiness.
- [ ] Close gitignore and present-artifact bypasses.
- [ ] Document exact JSON/text/exit behavior.
- [ ] Run the subplan's full gate and two-stage review.

**Exit interface:** `inspectProject` returns direct `layout_ok`, `delivery_ready`, per-lane reports, and deterministic issues.

### Task 4: Execute the surfaces/evals subplan

**Plan:** `docs/superpowers/plans/2026-07-10-ai-os-v11-surfaces-evals-plan.md`

- [ ] Converge constitution/reference trigger and authority matrices.
- [ ] Reduce skill to a thin `{laneId}` adapter.
- [ ] Correct authority, handoff, memory, examples, and feedback surfaces.
- [ ] Convert all 11 evals to machine-checkable oracles.
- [ ] Run the subplan's full gate and independent spec review.

**Exit interface:** every distributed/repository surface agrees with the canonical schema and passes drift tests.

### Task 5: Execute the CI/security subplan

**Plan:** `docs/superpowers/plans/2026-07-10-ai-os-v11-ci-security-plan.md`

- [ ] Remove the full-audit development vulnerability.
- [ ] Add pinned supported Node/OS/coverage/package CI.
- [ ] Add dependency review, CodeQL, scheduled audit, Dependabot.
- [ ] Add SECURITY and CODEOWNERS.
- [ ] Run static CI-policy tests and all local equivalents.
- [ ] Obtain an independent workflow/supply-chain review before completion.

**Exit interface:** repository files express least privilege, immutable Actions, supported platforms, security update/review policy, and critical owners.

### Task 6: Execute completion and remote-governance subplan

**Plan:** `docs/superpowers/plans/2026-07-10-ai-os-v11-completion-plan.md`

- [ ] Build the completion matrix before claiming status.
- [ ] Run adversarial, real-v10 migration, full local distribution, audit, and package evidence.
- [ ] Obtain independent spec/security review and fix findings with TDD.
- [ ] Push a branch, create a draft PR, and obtain actual supported-platform checks.
- [ ] Apply/read back approved branch protection, Actions SHA policy, alerts/fixes/private reporting, and feedback label.
- [ ] Prove every matrix row, commit/push evidence, then mark the persistent goal complete.

**Exit interface:** no unproven requirement remains; v11 is an honest unreleased candidate and main/release governance is enforced without publishing v11.
