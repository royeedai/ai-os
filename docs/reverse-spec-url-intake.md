# URL Reverse-Spec Intake

URL reverse-spec intake is the front half of a clone / rebuild workflow. Given a website the user can access, the agent captures evidence and turns it into AI-OS requirements before implementation begins.

AI-OS does not run the browser, crawler, sandbox, or code generator. It defines the artifact contract so any capable agent can use Browser Use, Playwright, Chrome MCP, Firecrawl, DevTools, or manual capture and leave the same auditable trail.

## 1. Preflight

- **Authority**: confirm the user has the right to analyze the site. Do not bypass login, paywalls, anti-bot controls, or terms of service.
- **Scope**: record exact URL(s), target pages, auth state, locales, themes, and out-of-scope areas.
- **Tooling**: record which browser / crawler / capture tool was used.
- **Failure policy**: 403, login walls, timeouts, blocked assets, and unavailable APIs become `unknown`; do not invent missing behavior.

## 2. Evidence Capture

Capture enough evidence that implementation does not depend on memory or guessing:

- **Screenshots**: full-page desktop 1440px, tablet 768px, mobile 390px, plus important section and state screenshots.
- **DOM topology**: page sections, fixed / sticky layers, z-index relationships, content hierarchy, component boundaries.
- **Computed CSS**: fonts, colors, spacing, sizing, border radius, shadows, transforms, transitions, breakpoints.
- **Assets**: images, videos, background images, SVGs, icons, fonts, favicons, metadata, and layered compositions.
- **Interactions**: scroll, click, hover, focus, time-driven changes, loading, empty, error, disabled, modal, dropdown, tab, carousel, and responsive states.
- **Network/API**: REST, GraphQL, SSE, WebSocket, form submissions, query params, status codes, auth signals, retries, cache behavior, and error paths.

## 3. Required Artifacts

Write the captured evidence into lane artifacts before development:

- `design-pack/parity-map.md`: capture manifest plus visual, interaction, API, and backend behavior parity tables.
- `specs/*.spec.md`: user journey, interface map, backend behavior records, confidence, unknowns, and acceptance mapping.
- `DESIGN.md`: product shape, information architecture, key interactions, API / data model summary, and shared-layer side effects.
- `tasks.yaml`: implementation tasks with owner, dependency, approval, and evidence requirements.
- `verification-matrix.yaml`: guards for visual parity, interaction parity, API parity, backend behavior confidence, and regression.

## 4. API Observation Record

Each observed interface must include these fields:

| Field | Meaning |
|---|---|
| `id` | Stable observation ID, for example `API-001` |
| `trigger` | User action or page event that caused the request |
| `method` | REST method, GraphQL, SSE, WebSocket, or other protocol |
| `url_pattern` | Path or normalized endpoint pattern without secrets |
| `request_shape` | Params, body, headers, or GraphQL operation shape |
| `response_shape` | Response fields, streaming events, or message shape |
| `status_codes` | Observed success and failure status codes |
| `auth_signal` | Cookie, token, anonymous, role hint, or unknown |
| `error_paths` | Empty, denied, validation, timeout, partial failure |
| `evidence_source` | Screenshot, HAR, DevTools note, Network export, or trace |
| `confidence` | `observed`, `inferred`, or `unknown` |

## 5. Backend Behavior Record

Backend behavior means externally observable behavior, not the target system's real implementation. Each rule must include:

| Field | Meaning |
|---|---|
| `rule_id` | Stable rule ID, for example `BEH-001` |
| `behavior` | Observable business rule or state transition |
| `observed_from` | Network, DOM state, error response, timing, or manual observation |
| `positive_cases` | Evidence where the behavior happened |
| `negative_cases` | Evidence where the behavior did not happen or was rejected |
| `unknowns` | What cannot be proven from the accessible site |
| `confidence` | `observed`, `inferred`, or `unknown` |
| `implementation_requirement` | What the rebuilt system must do |

Only `observed` behavior can become confirmed acceptance criteria. `inferred` behavior stays as an assumption. `unknown` behavior becomes a pending confirmation or explicit non-goal.

## 6. Handoff to Implementation

After intake, AI-OS continues with the normal delivery flow:

1. Update lane `MISSION.md` with goal, success criteria, scope, and acceptance object.
2. Update lane `DESIGN.md` with information architecture, key interactions, interface summaries, and side effects.
3. Decompose implementation in `tasks.yaml`.
4. Verify with `verification-matrix.yaml`, including normal, abnormal, permission denied, empty, timeout, and regression scenarios.
5. Close delivery with code / data / runtime status, known gaps, and rollback conditions.

## Reference Patterns

- JCodesMore `ai-website-cloner-template`: browser-driven screenshots, computed CSS extraction, component specs, and visual QA.
- Firecrawl Open Lovable: crawler-assisted markdown, HTML, screenshot, and branding extraction feeding generation.
- PerfectWebClone-style DOM/CSS extraction: real DOM, styles, assets, and multi-agent generation rather than static screenshot-only cloning.
