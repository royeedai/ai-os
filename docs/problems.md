# Problems AI-OS Addresses

AI-OS is designed to intercept real delivery failures:

- vague requirement, AI starts coding anyway
- requirement changed, code changed first and baseline later
- design not locked, AI silently picks an irreversible path
- bug fix overscopes and breaks unrelated behavior
- “works locally” is reported as done without project-native evidence
- session changes and the AI loses the current delivery context
- shared contracts drift across layers and across sessions
- multiple contributors collide on the current baseline

Current traceability lives in [problem-ledger.md](problem-ledger.md).
