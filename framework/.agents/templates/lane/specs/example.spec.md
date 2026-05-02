# Example Spec

## 1. 概述与闭环场景

- **目标闭环**：
- **主要输入**：
- **主要输出**：
- **Spec route**：feature / bugfix / reverse-spec / high-risk
- **Reverse-spec source**（如适用）：URL / screenshot / DOM / Network / docs
- **授权边界**（如适用）：public / user-authorized / authenticated-by-user / unknown

## 2. 业务规则与交互模式

- **交互模式**：sync / async / streaming / batch
- **核心规则**：
- **证据等级**：observed / inferred / unknown

## 3. Reverse-spec evidence sources（reverse-spec 必填）

| Source ID | Evidence type | Path / URL | Captured state | Confidence | Notes |
|---|---|---|---|---|---|
| SRC-001 | screenshot / DOM / computed CSS / Network / manual observation | [path or URL] | 1440 / 768 / 390, public / logged-in | observed / inferred / unknown | [notes] |

### Evidence package adaptation（URL reverse-spec 如适用）

| Package kind | Accepted source | Must redact | Maps to | Confidence rule |
|---|---|---|---|---|
| trace.zip | Playwright trace or equivalent | cookies, tokens, form values | screenshots, DOM, Network, console | observed if captured directly |
| network log / HAR | browser DevTools or proxy export | auth headers, query secrets, PII payloads | API observation records | observed for captured requests |
| screenshots | desktop / tablet / mobile captures | private user data | visual parity | observed for visible state only |
| DOM snapshots | browser DOM export | hidden secrets and user data | DOM topology and component boundaries | observed for captured DOM |
| rawHtml | crawler or browser HTML export | secrets, inline personal data | content hierarchy and metadata | observed / inferred by source quality |
| markdown | crawler markdown extraction | private content | content inventory | inferred unless backed by DOM/screenshot |
| structured JSON | crawler / API / tool output | secrets and personal data | assets, forms, links, metadata | observed if source is direct, otherwise inferred |

## 4. 契约基准

- **接口 / 数据模型**：
- **状态流转**：

### API observation records（reverse-spec 如涉及接口则必填）

最小字段：`id`、`trigger`、`method`、`url_pattern`、`request_shape`、`response_shape`、`status_codes`、`auth_signal`、`error_paths`、`evidence_source`、`confidence`。

| ID | Trigger | Method | URL pattern | Request shape | Response shape | Status codes | Auth signal | Error paths | Evidence source | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| API-001 | [UI action] | GET / POST / GraphQL / SSE / WebSocket | [pattern] | [fields] | [fields] | 200 / 4xx / 5xx | cookie / token / none / unknown | empty / denied / timeout | SRC-001 | observed / inferred / unknown |

### Backend behavior records（reverse-spec 后端行为规格必填）

最小字段：`rule_id`、`behavior`、`observed_from`、`positive_cases`、`negative_cases`、`unknowns`、`confidence`、`implementation_requirement`。

| Rule ID | Behavior | Observed from | Positive cases | Negative cases | Unknowns | Implementation requirement | Confidence |
|---|---|---|---|---|---|---|---|
| BEH-001 | [externally observable rule] | Network / DOM / error response / timing | [evidence] | [evidence] | [unknowns] | [requirement] | observed / inferred / unknown |

> `observed` 可进入验收标准；`inferred` 必须标注假设；`unknown` 必须进入待确认项，不得伪装成已确认需求。

## 5. 边界条件与错误路径

- **空数据**：
- **权限拒绝**：
- **超时 / 部分失败**：
- **受限 / 登录 / 403 / 反爬响应**：

## 6. 验收映射

| REQ | AC | TASK |
|---|---|---|
| REQ-001 | AC-001 | TASK-AI-001 |
