# CR-20260613-110848 Product Design Optional Bridge

## Summary

Add a Product Design optional design-evidence bridge so Codex users can fully use Product Design brief / ideation / prototype / image-to-code / design QA / share workflows, while AI-OS remains portable in Cursor, Claude Code, plain IDEs, and no-plugin environments.

## Current behavior

- AI-OS v9.9 records UI source routing and component-library implementation choices.
- Product Design workflow outputs have no explicit AI-OS mapping, so agents may either ignore Product Design capabilities or treat them as a Codex-only dependency.
- No-plugin IDEs can use UI source routing, but there is no shared `design_input` fallback contract that accepts Figma, screenshots, URL captures, existing code, or manual briefs in the same shape.

## Proposed delta

- Add `docs/interop/product-design.md` as the Product Design ↔ AI-OS bridge document.
- Extend UI Source Routing with optional `design_input.provider`, `capability_used`, `evidence_refs`, and `fallback_path`.
- Update lane templates and the official skill wrapper so Product Design results flow through existing task handoff / evidence fields.
- Add verification guards for plugin hard dependency, missing fallback, and Product Design QA replacing native project verification.
- Bump release metadata to v10.2.0.

## Affected artifacts

- Docs: `README.md`, `docs/artifacts.md`, `docs/constitution-spec.md`, `docs/interop/product-design.md`, `docs/interop/standards-map.md`, `docs/problem-ledger.md`, `docs/maintainers.md`
- Templates / skill: `framework/.agents/templates/lane/DESIGN.md`, `framework/.agents/templates/lane/tasks.yaml`, `framework/.agents/templates/lane/verification-matrix.yaml`, `framework/skills/ai-os-delivery/SKILL.md`
- Tests / metadata: `test/docs.test.js`, `VERSION`, `package.json`, `package-lock.json`, `CHANGELOG.md`
- Self-hosted lane: `MISSION.md`, `DESIGN.md`, `tasks.yaml`, `verification-matrix.yaml`, `STATE.md`, `lane.toml`, `.ai-os/memory.md`

## Acceptance delta

- AC-001: Product Design interop doc exists and covers workflow mapping, fallback, and no-hard-dependency boundary.
- AC-002: `docs/artifacts.md` and lane `DESIGN.md` template include `design_input` fields.
- AC-003: `tasks.yaml` template and skill wrapper reuse existing handoff / evidence fields for Product Design outputs.
- AC-004: verification matrix covers Product Design hard dependency and QA / native-verification confusion.
- AC-005: no new CLI, runtime, doctor warning, MCP server, IDE adapter, or Product Design hard dependency.
- AC-006: version/changelog/self-hosted lane/native verification close out v10.2.0.

## Close/archive condition

Close when `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict` all pass and current lane tasks record produced evidence.

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: v9.9 UI source routing recognized design input and component-first implementation paths, but did not model design tooling as a portable evidence provider. That left room for a later Product Design-specific request to be handled either as a Codex-only integration or as an ignored capability.
- **Maps to**: PL-008, PL-010, PL-020, PL-021
- **Suggested guard**: Add `design_input` fallback contract and Product Design interop tests; keep plugin-specific behavior in interop docs and the skill wrapper, not in AGENTS.md or a runtime adapter.
