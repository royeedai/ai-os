# AI-OS v11 Merge-Readiness Fixes Design

**Date:** 2026-07-16  
**Status:** Approved  
**Scope:** Source and local quality gates only. Remote GitHub settings and PR creation remain external follow-up actions.

## Problem

The v11 hardening branch is clean and its ordinary test suite passes, but it is
not merge-ready:

1. the Node 24 coverage gate fails its committed line and function thresholds;
2. the completion matrix marks rows as `pass` while 22 rows reference four
   nonexistent test files, and the matrix validator does not detect that;
3. the v11 changelog still describes the superseded v10 layout, tasks v4,
   shallow doctor behavior, and an obsolete migration path;
4. remote PR checks and repository settings are not available as merge
   evidence, so local readiness must be reported separately from remote state.

## Selected Approach

Keep the existing quality contract and repair the evidence behind it.

- Add focused tests for real uncovered behavior until the exact Node 24
  coverage command passes without lowering thresholds.
- Replace stale completion-matrix test paths with the current consolidated test
  suites.
- Extend the matrix validator with deterministic validation of repository-local
  evidence references. It must reject missing `test/*.test.js`,
  `scripts/*.js`, and other explicitly referenced repository files without
  executing arbitrary Markdown commands.
- Add regression tests proving stale evidence paths fail validation.
- Rewrite the v11 changelog so layout, governance schema, doctor readiness,
  migration, tests, and release state match the implementation.
- Keep remote rows blocked or pending until a PR and reviewed repository
  settings exist. Update stale explanatory text when current readback disproves
  the recorded reason.

## Rejected Approaches

### Lower coverage thresholds

Rejected because the thresholds are part of the reviewed CI contract. Lowering
them would make the gate green without repairing the missing behavioral
evidence.

### Broad runtime refactoring

Rejected because splitting the doctor or installer is not required to address
the observed failures and would increase regression risk across transaction,
migration, parser, and readiness code.

## Components

### Coverage tests

Tests will target exported or externally observable behavior. They may exercise
CLI error handling, canonical parser validation, governance validation, and
doctor filesystem/Git fallbacks. Tests must assert stable outcomes rather than
calling internal branches solely for coverage.

### Completion evidence validator

The validator will extract repository-local file references from each evidence
cell and verify containment, canonical spelling, and existence. Validation is
structural and read-only; it will not evaluate shell syntax or execute evidence
commands. Existing live validators remain the only executable matrix evidence.

### Changelog

The unreleased v11 entry will describe:

- layout schema 11;
- tasks schema v5 and structured approval/evidence semantics;
- transactional installer and bounded v10 migration;
- deterministic doctor layout and delivery-readiness checks;
- actual current test organization and release boundary.

## Verification

The implementation is locally merge-ready only when all of the following pass:

```bash
npm test
npm run test:coverage
npm run lint
git diff --check
npm pack --dry-run --json
npm audit
npm audit --omit=dev
node scripts/verify-completion-matrix.js --allow-pending
```

Coverage must also pass under Node 24, matching the blocking CI job. Remote
validators are run read-only and reported separately; their failure due to a
missing PR or unapplied settings does not become a false local success claim.

## Merge-Readiness Decision

After the fixes are committed:

- source is merge-ready only if every local command above is green and no
  unresolved high- or medium-priority review finding remains;
- repository data and runtime CI remain explicitly unverified until a draft PR
  runs the required checks and reviewed settings are applied/read back;
- no tag, release, merge, PR creation, or repository-setting mutation is
  authorized by this design.
