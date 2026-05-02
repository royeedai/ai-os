# Parity Map

## 原始参考清单

- [截图 / API / 源码 / 文档]

## URL reverse-spec capture manifest

| Source ID | Source kind | URL / path | Captured at | Viewport / auth state | Evidence path | Confidence |
|---|---|---|---|---|---|---|
| SRC-001 | url / screenshot / DOM / Network / docs | [URL or file] | [ISO timestamp] | 1440 / 768 / 390, public / logged-in | [artifact path] | observed / inferred / unknown |

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
| [Hero desktop] | [screenshot path] | [component / route] | [difference] | pending |

## Interaction parity

| Interaction | Trigger | Observed behavior | Target implementation | Evidence path | Conclusion |
|---|---|---|---|---|---|
| [Tab switch] | click / hover / scroll / time | [state transition] | [component behavior] | [screenshot / note] | pending |

## API / interface parity

| API observation ID | Trigger | Method / URL pattern | Request shape | Response shape / status codes | Auth signal | Error paths | Confidence |
|---|---|---|---|---|---|---|---|
| API-001 | [UI action] | GET /api/example | [fields] | [fields, 200/4xx] | cookie / token / none / unknown | [empty / denied / timeout] | observed / inferred / unknown |

## Backend behavior parity

| Rule ID | Behavior | Observed from | Positive cases | Negative cases | Unknowns | Implementation requirement | Confidence |
|---|---|---|---|---|---|---|---|
| BEH-001 | [externally observable rule] | [Network / DOM / error response] | [evidence] | [evidence] | [unknowns] | [requirement] | observed / inferred / unknown |

## 字段级对照

| 原始字段 / 行为 | 本项目实现 | 差异 | 结论 |
|---|---|---|---|
| [原字段] | [本字段] | [差异] | pending |
