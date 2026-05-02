# Parity Map

## 原始参考清单

- JCodesMore `ai-website-cloner-template`：browser automation、screenshots、computed CSS、component specs、visual QA
- Firecrawl Open Lovable：markdown / HTML / screenshot / branding extraction as generator context
- PerfectWebClone pattern：real DOM / CSS / asset extraction before generation

## URL reverse-spec capture manifest

| Source ID | Source kind | URL / path | Captured at | Viewport / auth state | Evidence path | Confidence |
|---|---|---|---|---|---|---|
| SRC-001 | docs / repo reference | external references reviewed during planning | 2026-05-02 | public | docs/reverse-spec-url-intake.md | observed |
| SRC-002 | docs / repo reference | external learning fusion plan | 2026-05-02 | public | .ai-os/lanes/default/baseline-log/CR-20260502-210628-external-learning-fusion.md | observed |

## Evidence package adaptation matrix

| Package kind | Accepted source | Must redact | Maps to | Confidence rule |
|---|---|---|---|---|
| trace.zip | Playwright trace / browser trace | cookies, tokens, form values | screenshots, DOM, Network, console | observed if captured directly |
| network log / HAR | DevTools / proxy / browser export | auth headers, query secrets, PII payloads | API observation records | observed for captured requests |
| screenshots | 1440 / 768 / 390 captures | private user data | visual parity | observed for visible state only |
| DOM snapshots | browser DOM export | hidden secrets and user data | DOM topology | observed for captured DOM |
| rawHtml | browser / crawler HTML export | secrets and inline personal data | content hierarchy | observed / inferred by source quality |
| markdown | crawler markdown extraction | private content | content inventory | inferred unless backed by DOM/screenshot |
| structured JSON | crawler / API / tool output | secrets and personal data | assets, forms, links, metadata | observed if source is direct, otherwise inferred |

## Visual parity

| Section / state | Reference evidence | Target implementation | Difference | Conclusion |
|---|---|---|---|---|
| Screenshot matrix | JCodesMore desktop/mobile capture pattern | `docs/reverse-spec-url-intake.md` requires 1440 / 768 / 390 | AI-OS records requirement, does not run capture | accepted |

## Interaction parity

| Interaction | Trigger | Observed behavior | Target implementation | Evidence path | Conclusion |
|---|---|---|---|---|---|
| Interaction sweep | scroll / click / hover / time | Reference workflows require state extraction before build | URL intake doc + verification matrix guards | docs/reverse-spec-url-intake.md | accepted |

## API / interface parity

| API observation ID | Trigger | Method / URL pattern | Request shape | Response shape / status codes | Auth signal | Error paths | Confidence |
|---|---|---|---|---|---|---|---|
| API-001 | browser Network request | normalized endpoint pattern | request_shape | response_shape / status_codes | auth_signal | empty / denied / timeout | observed / inferred / unknown |

## Backend behavior parity

| Rule ID | Behavior | Observed from | Positive cases | Negative cases | Unknowns | Implementation requirement | Confidence |
|---|---|---|---|---|---|---|---|
| BEH-001 | externally observable backend behavior only | Network / DOM / error response | positive evidence | negative evidence | unobservable internals | rebuild must match observed behavior | observed / inferred / unknown |

## 字段级对照

| 原始字段 / 行为 | 本项目实现 | 差异 | 结论 |
|---|---|---|---|
| Clone skill component specs | AI-OS `specs/*.spec.md` | AI-OS stores requirements, not builder prompts | accepted |
| Visual QA diff | AI-OS `verification-matrix.yaml` guards | Tool-specific visual diff remains external | accepted |
| Backend inference | Confidence-graded backend behavior records | Internal implementation truth remains unknown unless observed | accepted |
