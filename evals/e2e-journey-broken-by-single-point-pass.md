---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: e2e-journey-broken-by-single-point-pass
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: E2E Journey Broken By Single-Point Pass

## 场景

一个跨栈用户旅程涉及“前端拖入图表 → 选数据集 → 预览数据”或“保存数据集 → 跳到编辑页 → 预览数据 → 配置字段”等多步链路。任务拆解阶段把“后端图表数据接口”和“前端图表渲染”拆成两个任务，每个任务自验收时只看自己半边。

## 错误交付

- 后端 `ChartController.queryData` 和 `api/chart.ts queryChartData` 都存在多日，但全仓对 `queryChartData` 的调用方数量为 0；图表渲染只读 `comp.configJson` 占位，前端从来没消费过后端真实数据
- `POST /datasets` 返回 `R.ok()` 无 `data`，前端 `res?.id` 永远 falsy，URL 不切到 `/dataset/editor/{id}`，下游“预览数据”路径根本到不了
- 前端 GET `/{id}/preview?page&size` 期望 `{columns, rows, total}`，后端 POST `/{id}/preview?limit` 返回 `List<Map>`：HTTP method、参数名、响应体三重不一致
- 外观 logo 列设计为 `VARCHAR(500)`，但前端 base64 dataURL 实际 ~2.7MB，保存时 MySQL 截断报 `Data too long`
- PropertyPanel 让用户手输 19 位 Snowflake ID 进 `el-input-number`：spec 规定了字段类型 `Long`，没规定字段输入方式，UX 落到 build 时变成“有输入框就行”

## AI-OS 预期行为

- 关键设计阶段（lane `DESIGN.md`）必须把核心交互与状态流转锁定到端到端 journey 链路：列出途经接口、关键消费点、字段映射，而不是只描述单个接口
- 跨栈 user journey 必须由独立任务承担端到端验证，不能用单点接口合格代替；该任务归整条链路的 owner（不归前端也不归后端），用 `impact_tags` / `change_scope` / `acceptance_refs` / `evidence_required` 标清范围与证据
- 关键设计阶段必须为承载用户上传 / 业务文本的存储列标注预期最大体积并据此选型，禁止 `VARCHAR(200/500)` 之类默认值兜底
- 关键设计阶段必须确认可输入字段的输入方式；后端 Long/BIGINT/Snowflake ID 字段禁止走会经过 JS Number 的输入控件
- 验证阶段必须以真实跑通端到端路径（真实请求响应或渲染截图/日志）作为通过条件，不能用“前后端各自做完了自然就通”代替

## 最低证据

- lane `DESIGN.md` 中显式描述本轮涉及的端到端 journey 链路（途经接口 + 关键消费点 + 字段映射）
- lane `tasks.yaml` 中存在归整条链路 owner 的独立端到端验证任务，`evidence_required` 要求真实端到端跑通证据
- lane `verification-matrix.yaml` 中存在覆盖该 journey 的 failure_mode guard
- 验证产出包含真实请求响应日志或前端渲染截图（可落到 lane `evals/`）
- lane `DESIGN.md` 标注承载用户上传 / 业务文本列的预期最大体积与据此选择的类型，并确认关键输入字段的输入方式

## 若需改 framework，优先检查

- `AGENTS.md`（行为规则节“任务拆解”、“关键设计未锁”、“验证阶段”；五条核心要求 §2 关键设计先锁）
- `framework/.agents/templates/lane/DESIGN.md`（端到端链路、列容量与输入方式标注）
- `framework/.agents/templates/lane/tasks.yaml`（端到端验证任务示例）
- `framework/.agents/templates/lane/verification-matrix.yaml`（journey failure_mode guard）
- `docs/problem-ledger.md`（PL-018）
