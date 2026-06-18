# Example: Long-lived AI project maintenance loop

Scenario: a solo developer has maintained a pure-AI-built operations dashboard for six weeks. The app works, but recent AI sessions repeatedly touch the same API wrapper, re-fix the same empty-state bug, and forget a project-specific response-code convention.

The user asks:

> 这个项目 AI 写了很久了，是不是该整体重构一次？

## 1. Do not start with a big refactor

AI-OS does not treat project age as a refactor trigger. The agent enters delivery because the user is asking for a project maintenance decision, then reads:

- `.ai-os/lanes/default/STATE.md`
- `.ai-os/lanes/default/MISSION.md`
- `.ai-os/memory.md`
- `.ai-os/lanes/default/tasks.yaml`
- `.ai-os/lanes/default/verification-matrix.yaml`

The agent answers with evidence, not taste:

- observed: three CRs changed `src/api/client.ts`
- observed: two bugfixes mention "empty list renders as error"
- observed: `.ai-os/memory.md` has no HTTP status / business-code mapping for this project
- inferred: the API wrapper may be carrying an undocumented cross-layer contract

The inference is not enough to refactor. It becomes a maintenance CR proposal.

## 2. Open a maintenance CR only from drift evidence

The new `baseline-log/CR-*` says:

```markdown
## Current behavior

- API response-code behavior is fixed in several call sites but not registered in memory.
- Empty-state regressions repeat across list pages.

## Proposed delta

- Register response-code behavior in `.ai-os/memory.md`.
- Add one verification guard for empty-list rendering.
- Refactor only the API wrapper and affected list-state adapter, not the whole app.
```

## 3. Record `maintenance_review`

The lane task keeps the decision inspectable:

```yaml
maintenance_review:
  drift_signals:
    - "three CRs touched src/api/client.ts for response-code handling"
    - "two empty-list regressions across list pages"
  refactor_trigger: "observed repeated drift in API response handling and empty-state rendering"
  contract_impact:
    - ".ai-os/memory.md HTTP status / business-code mapping"
    - "verification-matrix empty-list guard"
  native_checks:
    - "npm run typecheck"
    - "npm test -- list-empty-state"
  debt_disposition:
    - "response-code contract added to memory.md"
    - "empty-list failure mode added to verification-matrix.yaml"
```

## 4. Keep the refactor scoped

Allowed:

- register the missing cross-layer contract in `memory.md`
- update the shared API wrapper
- update the two list adapters that consume it
- add targeted tests / smoke checks

Not allowed without a new CR:

- rewrite all pages
- change routing
- swap component libraries
- rename unrelated services
- "clean up" every old AI-generated file

## 5. Feed back stable findings

Closeout records:

- code status: scoped wrapper/list-state changes landed
- data status: no migration
- runtime status: typecheck and targeted tests passed
- memory feedback: response-code mapping added
- verification feedback: empty-list guard added
- eval feedback: not promoted yet; same root cause has not hit three times

If the same root cause appears again, AI-OS promotes it to `evals/` with `trigger_source: promoted-from-verification-matrix`.

## Anti-pattern

"AI built this for six weeks, so refactor everything" is not an AI-OS maintenance loop. It is an unbounded change request with no drift evidence.
