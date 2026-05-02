# URL Reverse-Spec Intake Spec

## 1. 概述与闭环场景

- **目标闭环**：用户提供授权可访问 URL 后，agent 先输出可审计需求与 parity 工件，再由 AI-OS 驱动完整开发和验证
- **主要输入**：URL、授权边界、目标页面、目标视口、可用浏览器 / crawler 工具
- **主要输出**：截图矩阵、DOM/CSS 证据、交互记录、Network/API observation records、backend behavior records、unknowns、验收映射
- **Reverse-spec source**：URL / screenshot / DOM / computed CSS / Network / docs
- **授权边界**：public / user-authorized / authenticated-by-user / unknown

## 2. 业务规则与交互模式

- **交互模式**：batch intake → review / confirmation → implementation
- **核心规则**：
  - URL intake 不新增 AI-OS CLI 或运行时依赖
  - 截图、DOM/CSS、交互、Network/API 和后端行为证据必须落入 lane artifacts
  - 后端行为只表示可观察行为，不代表真实内部实现
  - `observed` 可进入验收；`inferred` 进入假设；`unknown` 进入待确认或非目标
- **证据等级**：observed / inferred / unknown

## 3. Reverse-spec evidence sources

| Source ID | Evidence type | Path / URL | Captured state | Confidence | Notes |
|---|---|---|---|---|---|
| SRC-001 | reference research | JCodesMore / Open Lovable / PerfectWebClone references | public docs / repos | observed | Used to shape artifact protocol, not runtime dependency |
| SRC-002 | local implementation | `framework/.agents/templates/lane/*` | v9.2.0 templates | observed | AI-OS distributes artifact fields |

## 4. 契约基准

- **接口 / 数据模型**：API observation record、backend behavior record、confidence model
- **状态流转**：captured evidence → parity map → spec → DESIGN / tasks → verification

### API observation records

| ID | Trigger | Method | URL pattern | Request shape | Response shape | Status codes | Auth signal | Error paths | Evidence source | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| API-001 | UI action or page load | REST / GraphQL / SSE / WebSocket | normalized endpoint path | params / body / headers | response fields / events | 2xx / 4xx / 5xx | cookie / token / none / unknown | empty / denied / timeout / partial | HAR / DevTools / trace | observed / inferred / unknown |

### Backend behavior records

| Rule ID | Behavior | Observed from | Positive cases | Negative cases | Unknowns | Implementation requirement | Confidence |
|---|---|---|---|---|---|---|---|
| BEH-001 | externally observable state or business rule | Network / DOM / error response / timing | observed success | observed rejection | internal source / database / permission policy | rebuild must match observable behavior | observed / inferred / unknown |

## 5. 边界条件与错误路径

- **空数据**：必须采集或声明 unknown；不得假设默认空态
- **权限拒绝**：403、登录墙、角色差异必须记录为 error path 或 unknown
- **超时 / 部分失败**：必须进入 Network/API observation record
- **受限 / 登录 / 403 / 反爬响应**：不得绕过；记录为 unknown 或非目标

## 6. 验收映射

| REQ | AC | TASK |
|---|---|---|
| REQ-001 | AC-001 | TASK-AI-101 |
| REQ-002 | AC-002 | TASK-AI-102 |
| REQ-003 | AC-003 | TASK-AI-103 |
| REQ-004 | AC-004 | TASK-AI-103 |
| REQ-005 | AC-001 / AC-002 | TASK-AI-104 |
