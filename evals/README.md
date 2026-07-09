# AI-OS regression evals

Failure-mode samples used to regression-test AI-OS itself. Each entry describes a real project failure mode AI-OS is designed to intercept — not a "does the CLI run" check, but a "does the constitution actually prevent wrong delivery" check.

## Structure of each eval

Every eval starts with YAML frontmatter:

```yaml
---
trigger_source: manual                  # or: promoted-from-verification-matrix
first_baseline_id: ""                   # baseline-log/CR-* id when promoted
risk_source: delivery-governance        # stable taxonomy source
failure_mode: missing-user-confirmation # short failure-mode slug
harm: wrong-work                        # likely delivery harm
artifact_gate: MISSION                  # artifact gate that should catch it
---
```

`trigger_source` lets the constitution distinguish hand-authored regression cases from failure modes that have been observed often enough in a downstream project's `verification-matrix.yaml` to be promoted into evals (per the `AGENTS.md` 稳定失败模式 rule: same root cause hit ≥3 times → promote here).

After the frontmatter, every eval answers 5 questions:

1. **Scenario**: what input situation triggers this failure mode
2. **Wrong delivery**: what the bad outcome looks like
3. **AI-OS expected behavior**: which constitution rule should intercept it
4. **Minimum evidence**: which artifacts should contain proof
5. **If AI-OS needs changes**: where in `AGENTS.md` to strengthen the rule

An optional free-form `trajectory_signature` field may describe the execution-trajectory shape that reproduces the failure (e.g. `"session-resume → skip-STATE.md → write-code"`); omit it when there is no clear trajectory pattern.

## Current baseline samples

Grouped by the five core requirements they enforce.

### R1: Goal and user confirmation first

- `missing-user-confirmation.md` — AI proceeds without user confirmation
- `change-request-before-code.md` — AI changes code before updating baseline
- `inferred-treated-as-fact-into-execution.md` — Inferred / unknown treated as confirmed and carried into execution or closure

### R2: Key design and logic locked first

- `design-not-locked-before-build.md` — Implementation before design confirmed
- `shared-layer-side-effect-audit-missed.md` — No side-effect list for shared-layer changes
- `implicit-mechanism-change-gate-missed.md` — Implicit mechanism changed without entry / scope / order / failure audit

### R3: Adaptive governance

- `debug-overreach-regression.md` — Bug fix scopes creep into unrelated code

### R4: Evidence-based completion

- `feature-visible-but-unusable.md` — UI entry exists but not functional
- `happy-path-passed-but-null-path-broken.md` — Happy path passes, edges crash
- `fix-complete-but-data-runtime-not-recovered.md` — Code fixed but data/runtime not
- `release-truth-drift.md` — Release / publish request drifts from lane state and release artifacts

## Using evals

- When you propose any change to `AGENTS.md`, check if an eval would break.
- When you hit a new real-world failure mode, add a new eval with the 5-question template.
- When a failure mode becomes inert (e.g., covered by model-level self-verification in a future upgrade), archive rather than delete the eval.
