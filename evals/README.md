# AI-OS v8 regression evals

Failure-mode samples used to regression-test AI-OS itself. Each entry describes a real project failure mode AI-OS is designed to intercept — not a "does the CLI run" check, but a "does the constitution actually prevent wrong delivery" check.

## Structure of each eval

Every eval starts with YAML frontmatter:

```yaml
---
trigger_source: manual                  # or: promoted-from-verification-matrix
first_baseline_id: ""                   # baseline-log/CR-* id when promoted
---
```

`trigger_source` lets the constitution distinguish hand-authored regression cases from failure modes that have been observed often enough in `verification-matrix.yaml` to be promoted into evals (per the `AGENTS.md` failure-mode-harvest rule: same root cause hit ≥3 times → promote here).

After the frontmatter, every eval answers 5 questions:

1. **Scenario**: what input situation triggers this failure mode
2. **Wrong delivery**: what the bad outcome looks like
3. **AI-OS expected behavior**: which constitution rule should intercept it
4. **Minimum evidence**: which artifacts should contain proof
5. **If AI-OS needs changes**: where in `AGENTS.md` to strengthen the rule

## Current baseline samples

Grouped by the five core requirements they enforce.

### R1: Goal and user confirmation first

- `missing-user-confirmation.md` — AI proceeds without user confirmation
- `change-request-before-code.md` — AI changes code before updating baseline
- `configurable-meant-operable-gap.md` — "Configurable" requirements without operational closure

### R2: Key design and logic locked first

- `design-not-locked-before-build.md` — Implementation before design confirmed
- `ui-looks-right-but-logic-wrong.md` — UI renders but business logic broken
- `logic-right-but-product-shape-wrong.md` — Logic correct but IA / product shape off
- `interaction-mode-misclassified.md` — Streaming / long-running UX built as sync
- `brownfield-infrastructure-audit-missed.md` — Shared infrastructure not audited
- `shared-layer-side-effect-audit-missed.md` — No side-effect list for shared-layer changes
- `parity-before-reuse-skipped.md` — Abstraction reused without parity check
- `implicit-cross-layer-contract-undocumented.md` — Cross-layer contract not registered in `memory.md`
- `weak-type-hole-erodes-contract.md` — Map/Any/untyped catch erodes contract

### R3: Adaptive governance

- `sensitive-flow-not-escalated.md` — High-risk signal not escalated
- `debug-overreach-regression.md` — Bug fix scopes creep into unrelated code
- `read-only-analysis-before-edit.md` — Agent starts editing before read-only analysis
- `cross-module-same-defect-not-escalated.md` — Same bug shape across modules, fixed singly

### R4: Evidence-based completion

- `fallback-evidence-used-as-delivery.md` — Fallback / stub treated as delivered
- `feature-visible-but-unusable.md` — UI entry exists but not functional
- `happy-path-passed-but-null-path-broken.md` — Happy path passes, edges crash
- `cross-layer-change-missed-linkage.md` — Cross-layer change misses impact surface
- `fix-complete-but-data-runtime-not-recovered.md` — Code fixed but data/runtime not
- `e2e-journey-broken-by-single-point-pass.md` — Single endpoints pass, end-to-end journey broken

### R5: Recoverable project memory

- `problem-ledger-coverage-regression.md` — Problem coverage regresses after refactor

## Using evals

- When you propose any change to `AGENTS.md`, check if an eval would break.
- When you hit a new real-world failure mode, add a new eval with the 5-question template.
- When a failure mode becomes inert (e.g., covered by model-level self-verification in a future upgrade), archive rather than delete the eval.

## Notes

- v8 removed evals tied to v7 lane machinery (`legacy-to-lanes-migration-skipped`, `lane-archive-without-shared-reflux`) since lanes are now optional and non-automated.
- v9.1.1 realigned every eval's "若需改 framework，优先检查" pointers to the v9 surface: rules live in root `AGENTS.md` behavior-rule sections; per-lane structure lives under `framework/.agents/templates/lane/`; shared root structure lives under `framework/.agents/templates/shared-root/`. No eval should still reference `framework/.agents/workflows/*` or `framework/.agents/skills/*` (those were the v7 surface).
