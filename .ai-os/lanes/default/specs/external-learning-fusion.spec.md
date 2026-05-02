# External Learning Fusion Spec

## 1. 概述与闭环场景

- **目标闭环**：把外部可靠实践转化为 AI-OS 可审计工件和 doctor semantic checks
- **主要输入**：已确认的外部学习融合路线图
- **主要输出**：v9.3 docs/templates/tests/doctor/version 变更
- **Spec route**：feature / change
- **授权边界**：公开资料只作为设计参考，默认安装不引入外部服务

## 2. 需求契约

| REQ | Requirement | Acceptance |
|---|---|---|
| REQ-001 | doctor 捕捉 CR delta、AC mapping、high-risk、URL confidence 漂移 | AC-001 |
| REQ-002 | lane 模板支持 CR delta 和 bugfix route | AC-002 |
| REQ-003 | URL intake 支持 evidence package adaptation matrix | AC-003 |
| REQ-004 | MCP resources 文档支持 annotations vNext | AC-004 |
| REQ-005 | evals 支持 failure taxonomy frontmatter | AC-005 |
| REQ-006 | 最小 CLI surface 与版本元数据保持一致 | AC-006 |

## 3. 契约基准

- **CLI surface**：3 primary product operations / 1 bin / 4 bin scripts
- **Runtime dependency**：zero runtime dependencies
- **Doctor warning codes**：W070-W075
- **No-import boundary**：不引入 Kiro hooks、Spec Kit slash commands、Firecrawl、Playwright、Chrome DevTools 或 MCP SDK 作为默认依赖

## 4. 边界条件与错误路径

- **旧 CR 缺 delta 字段**：doctor warning，`--strict` 失败
- **AC 未逐项映射**：doctor warning，指出缺失 AC id
- **high-risk 缺风险 / 发布 / guard 工件**：doctor warning
- **URL evidence 缺 confidence**：doctor warning

## 5. 验收映射

| REQ | AC | TASK |
|---|---|---|
| REQ-001 | AC-001 | TASK-AI-201 / TASK-AI-204 |
| REQ-002 | AC-002 | TASK-AI-201 / TASK-AI-202 |
| REQ-003 | AC-003 | TASK-AI-202 |
| REQ-004 | AC-004 | TASK-AI-203 |
| REQ-005 | AC-005 | TASK-AI-203 |
| REQ-006 | AC-006 | TASK-AI-204 |
