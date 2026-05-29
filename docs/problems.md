# Problems AI-OS Addresses

AI-OS is designed to intercept real delivery failures:

- vague requirement, AI starts coding anyway
- requirement changed, code changed first and baseline later
- design not locked, AI silently picks an irreversible path
- bug fix overscopes and breaks unrelated behavior
- “works locally” is reported as done without project-native evidence
- session changes and the AI loses the current delivery context
- shared, cross-layer contracts stay implicit and drift across sessions and modules
- weak-typed payloads (free-form maps, untyped fields) quietly erode those contracts
- a single endpoint passes but the end-to-end user journey is never closed
- the same root-cause defect is fixed in one place but never escalated across modules
- multiple contributors collide on the current baseline
- ordinary discussion is misclassified as delivery work and over-governed
- inferred or unobserved facts are treated as confirmed and flow into delivery
- background / cloud / PR agent work returns without refs, scope, evidence, or human review
- developer-level and project-level memory get mixed, polluting shared context
- preventable rework slips through the first delivery instead of being caught up front

Every item above maps to a tracked entry; numbering and coverage anchors live in [problem-ledger.md](problem-ledger.md).
