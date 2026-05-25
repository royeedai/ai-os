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

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: v7 第一次设计时没有"操作面是否最小化"的判定，被 2025 年 CLI / slash command 风潮带偏，引入 15 个 CLI 子命令 + 14 个 slash command；本可在 v7 第一次 session 就用"操作面极简 + 工件面完整"的取舍框架避免。
- **Maps to**: unmapped → 后续在 `PROJECT_PURPOSE.md` 的"新需求筛选法"（4 个判断问题）+ 守住不扩张的红线（不新增 slash commands / 不自造 skill 系统）中沉淀
- **Suggested guard**: 已在 `PROJECT_PURPOSE.md` §5（新需求筛选法）、`docs/maintainers.md` §产品方向（默认答案是"不纳入"）、project-lead 规则的红线列表中落点。
