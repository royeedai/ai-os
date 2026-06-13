# AI-OS × Product Design

> Product Design is an optional design-evidence provider for AI-OS. It can enrich Codex workflows, but AI-OS remains fully usable in Cursor, Claude Code, plain IDEs, and no-plugin environments.

## TL;DR

| Situation | AI-OS behavior |
|---|---|
| Product Design available | Use its brief / ideation / prototype / image-to-code / design QA / share outputs as design evidence |
| Product Design unavailable | Use Figma, screenshots, URL reverse-spec, existing code, existing style, component-first, or manual brief fallback |
| Other IDE reads the lane | It only needs `design_input`, `evidence_refs`, and existing task evidence fields |

AI-OS does not install Product Design, run it, host prototypes, or require its tools for core governance.

## `design_input` contract

Record Product Design and fallback sources in lane `DESIGN.md` with the same portable shape:

```yaml
design_input:
  provider: product-design | figma | url | screenshot | existing-code | manual-brief | none
  capability_used: brief | ideation | prototype | image-to-code | design-qa | share | manual
  evidence_refs: []
  fallback_path: figma | screenshot | url-reverse-spec | component-first | existing-style
```

`evidence_refs` may point to a Product Design brief, selected visual option, prototype URL, image-to-code result, design QA comparison screenshot, share URL, Figma frame, captured website evidence, local screenshot, existing component/page path, or a user-confirmed manual brief.

## Product Design workflow mapping

| Product Design workflow | AI-OS mapping |
|---|---|
| `get-context` | Goal / design brief evidence; reflect into lane `MISSION.md` and `DESIGN.md` before implementation |
| `ideate` | Design-option evidence; implementation waits until the user selects a visual direction |
| `prototype` / `url-to-code` / `image-to-code` | Runnable or visual implementation evidence; record in task `evidence_produced` |
| `design-qa` | Visual parity evidence; map to UI parity guards in `verification-matrix.yaml` |
| `share` | Share URL or handoff evidence; not an AI-OS publishing surface |

Product Design evidence does not replace project-native verification. `npm test`, lint, typecheck, build, or the host project's equivalent still close the task.

## No-plugin fallback

If Product Design is not available, choose the best observed source and populate the same fields:

| Fallback | Use when |
|---|---|
| `figma` | A Figma frame, design system, or component library is available |
| `screenshot` | The user provides an image or the agent can capture one |
| `url-reverse-spec` | The source is an accessible URL and behavior needs evidence |
| `component-first` | No design source exists and the surface is admin / business UI |
| `existing-style` | The project already has comparable screens, components, or theme tokens |

## Task evidence loop

Do not add Product Design-specific task fields. Use the existing loop:

- `handoff_to`: `Product Design` or the local agent when it produced the evidence.
- `expected_return`: brief, selected visual option, prototype URL, QA screenshot, share URL, or fallback evidence.
- `evidence_produced`: actual Product Design output or fallback artifact.
- `deviation_log`: design / implementation drift, missing visual source, component-library mismatch, or fallback decision.

## Boundaries

- No new CLI command, runtime, doctor warning, MCP server, IDE adapter, or Product Design hard dependency.
- Product Design can improve design quality, but AI-OS remains the source of delivery governance.
- `AGENTS.md` stays tool-neutral; Product Design details live here, in artifact schema, and in the open skill wrapper.
- Other IDEs do not need to know Product Design tool names; they consume the portable design evidence fields.
