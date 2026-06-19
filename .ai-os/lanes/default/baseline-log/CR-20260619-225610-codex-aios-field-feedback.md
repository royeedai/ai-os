# CR-20260619-225610 Codex AI-OS Field Feedback

## Summary

This change absorbs local Codex field feedback from AI-OS-enabled projects into AI-OS governance artifacts. The goal is to prevent recurring delivery drift in release truthfulness, verification environment classification, task ledger conflicts, and install / baseline artifact interpretation without expanding AI-OS into a runtime, agent runner, auto-release platform, or IDE-specific dependency.

## Source evidence

- Local Codex memory scan found 42 AI-OS-related rollout summaries across 6 project groups.
- Public docs summarize recurring project groups by delivery shape rather than local project names: production web app governance, content / writing workflows, mobile release verification, AI-OS dogfooding, project-management workflow, and install / test workspaces.
- The same root causes recurred across project contexts rather than appearing as one-off repository bugs.

## Problem classes

1. Release truth drift: user asked for publish / submit / release, but `STATE.md`, `release-plan.md`, or `tasks.yaml` still described local-only or not-requested status.
2. Verification environment confusion: local `.env`, DNS/proxy, SDK networking, provider outages, real-device blockers, and production-signing blockers were sometimes mixed with product-code failures.
3. Task ledger conflict: stash / rebase / moving release lanes produced `tasks.yaml` conflicts or stale task IDs that could hide current work.
4. Install and baseline interpretation: generated or legacy AI-OS artifacts were sometimes treated as current delivery scope without a review pass.

## Change plan

- Add an evidence document under `docs/` that summarizes the field feedback and its accepted / rejected AI-OS optimizations.
- Add problem-ledger and eval coverage for the recurring field-feedback classes.
- Extend existing lane templates and skill guidance with release truthfulness and verification environment classification using current artifact fields.
- Keep the implementation in docs, templates, evals, and tests. Do not add CLI commands, runtime services, telemetry, auto-release behavior, new artifact categories, or a new doctor warning unless a deterministic structural rule is proven later.

## Non-goals

- No release automation.
- No cloud / background agent orchestration.
- No model routing or provider abstraction.
- No schema field addition for this pass.
- No new doctor warning in this pass.
- No version bump, tag, push, or publish without a separate explicit release request.

## Impact

- Existing users can keep the same 12 artifact categories.
- The field-feedback loop becomes auditable through `docs/problem-ledger.md`, evals, and template guard text.
- Future doctor work remains possible only if a candidate check is deterministic and passes Boundary Evolution Policy.

## Verification plan

- Run project-native docs / template tests.
- Run local doctor strict after artifact updates.
- Confirm the docs explicitly preserve the Boundary Evolution Policy and no-runtime boundary.

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: AI-OS already had feedback and maintenance loops, but the field evidence showed recurring release-status and environment-classification drift that was not named as a stable class.
- **Maps to**: PL-024 and new PL-025
- **Suggested guard**: problem-ledger entry, evals, verification-matrix impact rules, tasks template guidance, and docs tests. Do not start with a doctor warning because the first correction is semantic classification, not a deterministic structural absence.
