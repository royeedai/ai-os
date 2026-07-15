# AI-OS regression evals

This directory contains 11 machine-readable behavior oracles for delivery-governance failure modes. They test whether a constitution or model response makes the required decisions, avoids concrete forbidden actions, updates only triggered artifacts, and produces sufficient evidence. They are not a live model harness.

## Oracle contract

Every non-README Markdown file has strict scalar frontmatter:

```yaml
---
oracle_version: 1
framework_version: "11.0.0"
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: missing-user-confirmation
harm: wrong-work
artifact_gate: MISSION
---
```

`trigger_source` is `manual` or `promoted-from-verification-matrix`. A downstream failure mode is promoted only after the same root cause is observed three times. `first_baseline_id` records that provenance when one exists.

Each oracle has exactly these sections and parseable list prefixes:

- `Input`
- `Expected decisions` with `DECISION:` items
- `Forbidden actions` with `FORBID:` items
- `Required artifact deltas` with `DELTA:` items
- `Minimum evidence` with `EVIDENCE:` items
- `Framework change targets` with `TARGET:` items

`DELTA: none — reason` is the only empty-delta form. Optional artifacts remain governed by the canonical trigger matrix; an oracle cannot require one merely to make its evidence list larger.

## Current oracle inventory

- `missing-user-confirmation.md`
- `change-request-before-code.md`
- `inferred-treated-as-fact-into-execution.md`
- `design-not-locked-before-build.md`
- `shared-layer-side-effect-audit-missed.md`
- `implicit-mechanism-change-gate-missed.md`
- `debug-overreach-regression.md`
- `feature-visible-but-unusable.md`
- `happy-path-passed-but-null-path-broken.md`
- `fix-complete-but-data-runtime-not-recovered.md`
- `release-truth-drift.md`

## Maintainer use

- Run `node --test test/evals.test.js` after changing the distributed constitution, artifact schema, skill, or an oracle.
- A maintainer may manually run the same inputs against a dated model matrix and attach results to an issue or pull request.
- Matrix runs are manual maintainer evidence, not product telemetry: AI-OS does not collect prompts, responses, usage, or background analytics.
- Archive an obsolete oracle with an explicit rationale; do not silently weaken or delete a regression contract.
