# AI-OS × OpenSpec

> [OpenSpec](https://github.com/Fission-AI/openspec) is an open-source spec-driven workflow that uses **delta markers** in markdown specs (`+++`, `---`, `~~~`) to record change proposals. AI-OS v9 `baseline-log/CR-*.md` covers the same need but as a full delivery-impact analysis. Both can coexist; the rule is "pick the spec format, AI-OS owns the delivery wrapper".

## TL;DR

| Project shape | Recommended setup |
|---|---|
| OpenSpec for spec evolution, AI-OS for delivery governance | Mode A — OpenSpec deltas as the spec-source-of-truth |
| Brownfield, OpenSpec only | Add AI-OS for change-management + verification + recovery |
| Want a single delta history without delta markers | Use AI-OS `baseline-log/CR-*.md` only |

## Conceptual mapping

| OpenSpec concept | AI-OS equivalent | Notes |
|---|---|---|
| Spec markdown with delta markers | `lanes/default/specs/<name>.spec.md` | both are versioned text |
| Delta proposal (`+++` block) | `baseline-log/CR-YYYYMMDD-HHMMSS-<slug>.md` | OpenSpec is in-place; AI-OS is a separate file |
| Ratified spec | `MISSION.md` Section 4 references | once ratified, lane MISSION points to it |
| Change discussion | `baseline-log/CR-*.md` impact-analysis sections | OpenSpec discusses inside the spec; AI-OS discusses inside the CR |
| OpenSpec CLI commands | n/a | execution layer; AI-OS does not duplicate |

## Mode A: OpenSpec for spec evolution, AI-OS for delivery wrap

This is the recommended pairing.

1. Spec authoring & evolution: OpenSpec deltas inside `specs/<name>.spec.md`
2. Each delta merge → write a brief `baseline-log/CR-*.md` referencing the merged delta:

   ```markdown
   # CR: photo tagging

   - openspec_delta: specs/photos.spec.md @ commit abc1234
   - impact: REQ-008 added; AC-008 added; verification-matrix.yaml updated
   - rollback: revert spec to abc1233; remove FM-009
   ```

3. AI-OS handles verification (`verification-matrix.yaml`), release (`release-plan.md`), recovery (`STATE.md`)

The delta markers are the source of truth for **what** changed. The CR is the source of truth for **why it is safe to ship**.

## Mode B: AI-OS only

For teams that prefer one log instead of inline delta markers:

1. Keep specs as plain markdown without delta markers
2. Track every change as an AI-OS `baseline-log/CR-*.md`
3. Run `npx create-ai-os doctor` to surface W070 (orphan baseline references) and W072 (AC not covered in matrix)

This is essentially what AI-OS does on its own; OpenSpec adds nothing here.

## Artifact coexistence

| OpenSpec file | AI-OS artifact | Coexistence rule |
|---|---|---|
| `specs/<name>.spec.md` (with deltas) | `lanes/default/specs/<name>.spec.md` | one location wins. If you keep OpenSpec under `specs/`, leave the AI-OS lane `specs/` empty and reference outward |
| OpenSpec proposals (PR description / issue) | `lanes/default/baseline-log/CR-*.md` | one CR per merged delta is the cleanest pairing |
| OpenSpec CLI lock | n/a | execution layer |

## Anti-patterns

1. **Both delta markers in spec AND a parallel baseline-log/CR with different content** — pick one as the change-narrative source. CR can reference the delta; do not narrate the same change twice.
2. **Letting deltas stay un-rolled-up in specs forever** — periodically run `openspec finalize` (or your equivalent) to ratify deltas; AI-OS `verification-matrix.yaml` should map to the ratified spec, not floating deltas.
3. **Running OpenSpec across multiple lanes without coordinating in `lane.toml`** — separate lanes with separate spec files; one `baseline_id` per lane keeps the audit trail clean.

## What AI-OS adds that OpenSpec does not

| Capability | OpenSpec | AI-OS |
|---|---|---|
| In-place delta markers | yes | — |
| Spec ratification flow | yes | — |
| Cross-session recovery anchor | — | yes (`STATE.md`) |
| Verification matrix + parity gate | — | yes |
| High-risk approval gate | — | yes (`risk-register.md` + `approval_required` in `tasks.yaml`) |
| Multi-lane delivery | — | yes |
| Cross-IDE portability via `AGENTS.md` | partial | yes |
| Doctor (semantic + layout) | — | yes |

## Migration from OpenSpec-only

If the project currently uses only OpenSpec:

1. Install AI-OS:

   ```bash
   npx --yes github:royeedai/ai-os .
   ```

2. Edit `lanes/default/MISSION.md` Section 4 to reference your OpenSpec specs:

   ```markdown
   ### Range internally

   - Source-of-truth: `specs/photos.spec.md` (OpenSpec)
   - Local contracts (in this lane): `lanes/default/specs/local-cache.spec.md`
   ```

3. For every future change, write `baseline-log/CR-*.md` referencing the OpenSpec delta or commit
4. Add `npx create-ai-os doctor` to CI

## See also

- [spec-kit coexistence](spec-kit-coexistence.md) — same shape but for GitHub Spec-Kit
- [Kiro coexistence](kiro.md) — when steering files coexist with deltas
- [AI-OS skill source](../../framework/skills/ai-os-delivery/SKILL.md)
