# CR-20260502-210628-external-learning-fusion

- **Type**: change-request (minor governance enhancement)
- **Status**: confirmed
- **Date**: 2026-05-02
- **Summary**: Fuse external spec-driven, MCP resource, browser-evidence, and eval-taxonomy practices into AI-OS without expanding the default CLI or runtime surface.
- **Affects**: `bin/ai-os-doctor.js`, `framework/.agents/templates/lane/*`, `docs/*`, `evals/*`, `test/*`, `VERSION`, `package.json`, `CHANGELOG.md`
- **Confirmed by**: project owner, 2026-05-02

## Trigger

User requested implementation of the approved "AI-OS 外部学习融合路线图". The selected output is a v9.3 change line, not a new runtime, IDE integration, crawler, or orchestration layer.

## Current behavior

- AI-OS v9.2 has URL reverse-spec intake, progressive disclosure, MCP URI documentation, and W070/W071/W072 doctor semantic warnings.
- Baseline-log CR files are human-readable impact notes, but the spec delta lifecycle fields are not mechanically checked.
- Specs include a generic example, but bugfix routing is not represented as a first-class template.
- URL intake lists evidence categories, but does not yet define a tool-neutral evidence package adaptation matrix.
- MCP resource docs define `audience` and `priority`, but do not give a complete vNext annotation recommendation including `lastModified`.
- Evals have `trigger_source` and `first_baseline_id`, but not a richer failure taxonomy.
- Release polish finding: `install` can be read as both a product command and an alias, README used an unqualified no-skill-system phrase while shipping an open-standard `agentskills.io` wrapper, and MCP docs can imply a packaged reference server instead of an illustrative snippet.

## Proposed delta

- Keep `AGENTS.md` short and shift more reliability into `doctor --strict` semantic checks.
- Require CR entries to state `Current behavior`, `Proposed delta`, `Affected artifacts`, `Acceptance delta`, and `Close/archive condition`.
- Add a bugfix spec template covering root cause, reproduction, blast radius, planned files, and regression guard.
- Add a URL evidence package adaptation matrix covering `trace.zip`, network logs/HAR, screenshots, DOM snapshots, rawHtml, markdown, and structured JSON with redaction and confidence mapping.
- Extend MCP resource annotations with `lastModified`, explicit `subscribe`, and `listChanged` guidance while keeping the default install serverless.
- Add optional eval taxonomy frontmatter: `risk_source`, `failure_mode`, `harm`, `artifact_gate`.
- Clarify release product surface wording: AI-OS has three primary product operations; install has a default positional form and an explicit alias; the skill wrapper is an open-standard adapter; the MCP sample is an illustrative reference snippet, not a shipped server.

## Affected artifacts

- Runtime code: `bin/ai-os-doctor.js`
- Framework templates: lane baseline-log, spec, parity, verification, and tasks templates
- Docs: CLI, artifacts, constitution spec, URL intake, MCP resources, eval README, changelog
- Release polish docs: README, CLI help, product-surface wording tests
- Tests: docs, doctor, install, shared
- Metadata: `VERSION`, `package.json`

## Acceptance delta

- `doctor --json --strict` reports new semantic warnings for missing CR delta fields, incomplete AC-to-verification mapping, high-risk missing risk/release/guard artifacts, and URL evidence rows without confidence.
- Docs/tests assert the bugfix spec template, evidence package adaptation matrix, MCP annotation guidance, and eval taxonomy fields.
- CLI surface remains three primary product operations, one bin entry, four bin scripts, and zero runtime dependencies; docs/tests prevent install alias, skill wrapper, or MCP snippet from being described as new default product surface.

## Close/archive condition

- Close when `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict` all pass with no warnings for the self-hosted AI-OS lane.
- Archive or revise if any change requires a new default runtime dependency, new CLI command, default browser/crawler/MCP server, or a larger `AGENTS.md` operating surface.

## Rollback path

- Revert v9.3 docs/template/test/version changes if the semantic checks create excessive false positives or imply AI-OS owns runtime execution.
- Keep v9.2 URL reverse-spec intake as the stable fallback protocol.
