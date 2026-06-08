# CR-20260606-123822-design-aware-component-first-ui

- **Type**: change-request (minor framework enhancement)
- **Status**: confirmed
- **Date**: 2026-06-06
- **Summary**: Add Design-Aware Component-First UI routing. Frontend work should separate UI source from implementation path: when a design exists, the design is the target and mature project components remain the preferred implementation; when no design exists, backend, PC business, App / H5, and mini-program business pages default to component-library baselines selected from existing dependencies, stack, surface, and China-familiar mature libraries. No new CLI, runtime, doctor warning, or page template library.
- **Affects**: `AGENTS.md`, `README.md`, `docs/artifacts.md`, `docs/constitution-spec.md`, `docs/problem-ledger.md`, `docs/maintainers.md`, `framework/skills/ai-os-delivery/SKILL.md`, `framework/.agents/templates/lane/DESIGN.md`, `framework/.agents/templates/lane/verification-matrix.yaml`, `test/docs.test.js`, `VERSION`, `package.json`, `package-lock.json`, `.ai-os/memory.md`, `.ai-os/lanes/default/*`
- **Confirmed by**: project owner, 2026-06-06

## Trigger

Project owner asked whether backend, PC, App / H5, and designed pages can use Vue / React component libraries by default so delivery is consistent and less dependent on bespoke design. Through discussion, the target was refined: design files should be honored when present, but standard UI elements should still reuse components; when design files are absent, component libraries should provide the UI baseline, with defaults chosen for Chinese teams and common domestic business UI expectations.

## Current behavior

- AI-OS requires key design and logic to be locked, but it does not distinguish UI source from implementation path.
- Existing guidance can be read as "with design, manually match the design" or "without design, ask for design first", which is too slow for admin / business UI and can lead to hand-rolled UI.
- Lane DESIGN template has no place to record `ui_source`, selected component library, fidelity level, or custom-only gaps.
- Verification matrix does not name failure modes where component-first UI skips permissions, empty/error states, or responsive behavior.

## Proposed delta

- Add Design-Aware Component-First UI as a governance rule: design-led / component-first / existing-style / hybrid.
- State explicitly that design files define target effects, while component libraries remain the preferred implementation path for standard UI.
- State that no-design admin, PC business, and mobile business UI defaults to component-library baselines.
- Document selection priority: existing dependency > user specified > ecosystem fit > China-familiar default.
- Add conservative defaults: Vue PC → Element Plus; React PC → Ant Design; Vue H5 → Vant; React H5 → Ant Design Mobile; uni-app → uView / uni-ui; Taro / WeChat-heavy → NutUI / TDesign; cross-stack enterprise consistency → TDesign; modern enterprise admin → Arco Design.
- Add DESIGN template fields and verification matrix failure modes.
- Register PL-020 and add docs tests.
- Bump framework version to 9.9.0 and constitution spec to v2.1.

## Affected artifacts

- Rules / narrative: `AGENTS.md`, `README.md`
- Schema / spec: `docs/artifacts.md`, `docs/constitution-spec.md`
- Skill wrapper: `framework/skills/ai-os-delivery/SKILL.md`
- Templates: `framework/.agents/templates/lane/DESIGN.md`, `framework/.agents/templates/lane/verification-matrix.yaml`
- Quality ledger: `docs/problem-ledger.md`, `.ai-os/memory.md`
- Tests / metadata: `test/docs.test.js`, `test/install.test.js`, `test/shared.test.js`, `test/doctor.test.js`, `VERSION`, `package.json`, `package-lock.json`, `CHANGELOG.md`
- Self-hosted lane: this CR, lane MISSION / DESIGN / tasks / verification matrix

## Acceptance delta

- AC-001: AGENTS / README / artifacts / spec / skill consistently describe UI source routing and component-first implementation.
- AC-002: lane DESIGN template includes `ui_source`, `surface`, `frontend_stack`, `component_library`, `selection_reason`, `fidelity_level`, and `custom_required`.
- AC-003: lane verification matrix includes design-aware component-first UI impact rules and failure modes.
- AC-004: component library defaults are China-friendly, conservative, and subordinate to existing project dependencies.
- AC-005: no new CLI command, doctor warning, runtime dependency, component installer, or page template library.
- AC-006: version metadata, changelog, docs tests, lint, and strict doctor are clean.

## Close/archive condition

- `npm test` passes.
- `npm run lint` passes.
- `node bin/create-ai-os.js doctor . --json --strict` returns ok true with no semantic warnings.
- VERSION / package.json / package-lock.json are synced to 9.9.0.
- AGENTS.md remains ≤150 lines and no product surface expands beyond 3 primary operations.

## Rollback path

- Revert this CR's docs/template/test changes and restore VERSION / package metadata to 9.8.0.
- Existing projects are unaffected because no runtime behavior, CLI interface, doctor warning, or installed dependency changed.

## Preventability review

- **Preventable**: no
- **If yes, root cause**: n/a — this is an intentional framework enhancement from project owner product direction, not rework caused by missed scope or an unlocked design in a previous AI-OS delivery.
- **Maps to**: PL-020
- **Suggested guard**: keep UI source routing as a DESIGN/template/docs contract and docs-test invariant; do not add doctor NLP soft checks or a component template library unless repeated real projects show the artifact-only guard is insufficient.
