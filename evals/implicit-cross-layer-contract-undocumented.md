---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Implicit Cross-Layer Contract Undocumented

## 场景

一个全栈项目里存在多种"跨层隐式契约"：HTTP 状态码 ↔ 业务码语义映射、Long/UUID/Instant/枚举的 wire 格式、多租户白名单 / CORS / 序列化忽略字段集等"名单型常量"的反向真理源、敏感字段加密/解密/打码 service 的语义档位、查询引擎方言（Calcite lex / 标识符引号 / SQL 终止符）等。

## 错误交付

- HTTP 401/403 处理只覆盖 401，403 落入缺省分支只弹 Message 不跳登录
- Snowflake 19 位 ID 走 JSON number 在前端被静默截断到 `9007199254740991`
- 多租户 `IGNORE_TABLES` 与 schema 中"哪些表无 `tenant_id`"靠人眼同步，新增表时漏加导致 SQL 报错
- `getDatasourceById` 默认打码 `password`，跨模块消费者用它建数据库连接拿到打码字符串导致 NPE
- Calcite 配置 `lex=MYSQL`（标识符用反引号）但拼 SQL 时用双引号，被当作字符串字面量解析炸出百余行错误
- 这些"看不见的跨层假设"全靠口头约定或单点经验维持，AI 在不同 session、不同模块写代码时各自脑补一份合理但不一致的实现

## AI-OS 预期行为

- 项目级 `.ai-os/CONVENTIONS.md` 必须保留"跨层契约登记表"专章，至少覆盖 HTTP↔业务码↔客户端行为映射、Wire 类型契约、名单型常量反向真理源、敏感数据 service 方法语义档位、中间件/查询引擎方言契约五个子节
- `/design` 在跨层任务前置必须先核对该登记表；本轮引入新的跨层隐式契约（如新查询引擎、新名单型常量、新跨语言精度损失字段类型）必须同步追加条目，未登记不得进入 `/plan`
- `/verify` 必须把"实现是否与登记表一致"作为通过条件，登记表与实现不一致即视为实现质量门未通过
- framework 只规定"必须显式登记"，不硬编码项目特定决策（如必须 Long→String、必须用反引号）

## 最低证据

- `.ai-os/CONVENTIONS.md` 跨层契约登记表五节存在且非空
- `DESIGN.md` 中显式声明本轮触及的登记项，或显式声明本轮引入了新登记项
- `/verify` 输出中包含"跨层契约登记表 vs 实现"的逐项对照结论
- 若涉及名单型常量，提供启动期反向自检结论（如反射扫描所有 `@TableName` 实体对照 `IGNORE_TABLES`）

## 若需改 framework，优先检查

- `framework/.agents/templates/project/CONVENTIONS.md`
- `framework/.agents/workflows/design.md`
- `framework/.agents/workflows/verify.md`
- `framework/.agents/references/derived-rules.md`（4.8 节）
- `docs/problem-ledger.md`（PL-033）
