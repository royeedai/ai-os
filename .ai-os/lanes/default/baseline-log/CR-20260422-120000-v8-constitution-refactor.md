# CR-20260422-v8-constitution-refactor

- **Type**: change-request (positioning-level)
- **Status**: confirmed
- **Date**: 2026-04-22
- **Summary**: Refactor AI-OS from command-driven tooling (v7) to constitution-driven minimal surface (v8). Replace 15 CLI subcommands and 14 slash commands with 3 CLI commands and rule-driven agent behavior. Preserve all five core requirements and all 12 artifact capabilities.
- **Affects**: `AGENTS.md`, `bin/*.js`, `framework/.agents/workflows/`, `framework/.agents/skills/`, `README.md`, `PROJECT_PURPOSE.md`, `docs/*`, `examples/*`, `test/*`, `VERSION`, `package.json`
- **Confirmed by**: project owner, 2026-04-22

## Trigger

User asked whether frontier-model progress required AI-OS to change direction and core goals. The answer was yes on operational surface, no on the five core requirements.

## Impact analysis

- Positioning changed from CLI-heavy workflow system to constitution + artifacts + reference implementation
- Operational surface dropped to 3 CLI commands
- Five core requirements and 12 artifact capabilities were preserved

## Current behavior

- v7 shipped command-driven workflows, slash commands, skills, policies, and many CLI subcommands.

## Proposed delta

- Reframe AI-OS as a delivery constitution with 12 artifacts and a minimal reference CLI.

## Affected artifacts

- `AGENTS.md`, CLI scripts, framework workflows / skills, docs, examples, tests, version metadata.

## Acceptance delta

- The five core requirements remain expressible through rule-driven behavior and the CLI surface drops to three commands.

## Close/archive condition

- Close when v8 docs, tests, and version metadata align with the constitution-first positioning.

## Execution summary

- Rewrote root constitution and major docs
- Removed v7 workflows, skills, and most legacy scripts
- Replaced v7 test suite with v8-specific suite
- Bumped version to 8.0.0

## Rollback path

- `git checkout v7-legacy`
