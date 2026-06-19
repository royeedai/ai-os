# Codex AI-OS Field Feedback

This document captures field feedback from local Codex development records where AI-OS was used in real projects. It is an evidence pack for AI-OS maintainers, not a new runtime surface.

## Evidence summary

The local scan covered 42 AI-OS-related Codex rollout summaries across 6 project groups. Public docs intentionally summarize those groups by delivery shape rather than local project names:

- production web app governance: AI-OS vendoring, doctor, production release, governance refresh
- local content / writing workflow: AI-OS-style planning and evidence closure
- mobile app release verification: platform blockers, signing evidence, real-device constraints
- AI-OS dogfooding: release, boundary, doctor, docs
- project-management workflow: lane / task governance
- install / test workspace: local artifact behavior

The recurring signal was not "AI-OS should execute more". It was "AI-OS should make recurring delivery truth and evidence classes harder to blur".

## Accepted optimizations

### Release Truthfulness Review

Before closeout, compare the latest user request, `STATE.md`, `release-plan.md`, and `tasks.yaml` status. If a user asked to publish, submit, deploy, tag, push, or release, the lane must not close with artifacts that still say "not requested", "local only", or "pending" unless that mismatch is explicitly recorded as a blocker.

Use existing fields inside the existing 12 artifacts:

- `STATE.md`: current stage, blockers, next step
- `release-plan.md`: release intent, rollback, manual steps
- `tasks.yaml`: `evidence_required`, `evidence_produced`, `deviation_log`
- `verification-matrix.yaml`: release truthfulness impact rule

### Verification Environment Classification

Verification failures must be classified before being treated as product-code failures:

- `product-code`: source, build, test, or runtime behavior owned by the repo
- `local-environment`: `.env`, proxy, DNS, SDK cache, simulator, local shell, missing local key
- `external-service`: provider outage, cloud API, app store / review system, remote host, third-party dependency
- `production-state-unknown`: deployment, signing, store, live data, or device state not currently observable

The classification belongs in task evidence or `deviation_log`; it does not require a new schema field.

### Task Ledger Conflict Review

After pull, stash, rebase, branch switch, or lane migration, review `tasks.yaml` for:

- duplicate task IDs
- stale completed tasks being reused for current work
- missing `baseline_id` alignment
- status changes without produced evidence
- conflict resolution that drops newer evidence

This is a verification-matrix guard, not a new command.

### Install / Baseline Artifact Review

Generated baseline artifacts, legacy appendices, or installer-created placeholders must be interpreted before being accepted as current scope. If they are not tied to the current baseline, classify them as legacy, generated, non-goal, or pending cleanup rather than allowing them to drive implementation.

## Rejected or deferred optimizations

- **Auto release / auto merge / auto publish**: rejected. AI-OS remains a governance layer; release action stays explicit.
- **Runtime agent runner**: rejected. AI-OS records handoff and evidence, but does not run agents.
- **Telemetry**: rejected. Field feedback uses local artifacts, memory, git, and explicit user-provided records.
- **New doctor warning**: deferred. Candidate checks must be deterministic structural checks and pass Boundary Evolution Policy.
- **New artifact category**: rejected for this pass. Existing lane artifacts can express the required evidence.

## Doctor candidates for later review

These are candidates only. They are not implemented in this pass:

- duplicate task IDs in `tasks.yaml`
- done / verified / shipped tasks with missing `evidence_produced`
- release-plan state contradicting closed release tasks

Each candidate still needs a separate CR, failing fixture, and strict-mode behavior review before becoming a doctor warning.

## Maintainer rule

When field feedback comes from real projects, map it in this order:

1. Existing artifact guidance
2. Template guard
3. Problem-ledger entry
4. Eval sample
5. Deterministic doctor warning only when structural and testable
6. CLI / adapter only after Boundary Evolution Policy proves install + doctor + 12 artifacts cannot cover it

If a proposal starts at runtime, automation, or platform behavior, it must first prove why the existing governance layer cannot express the failure mode.
