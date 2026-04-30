---
trigger_source: manual
first_baseline_id: ""
---

# Eval: E2E Journey Broken By Single-Point Pass

## 场景

一个跨栈用户旅程涉及"前端拖入图表 → 选数据集 → 预览数据"或"保存数据集 → 跳到编辑页 → 预览数据 → 配置字段"等多步链路。`/plan` 阶段把"后端图表数据接口"和"前端图表渲染"拆成两个任务，每个任务自验收时只看自己半边。

## 错误交付

- 后端 `ChartController.queryData` 和 `api/chart.ts queryChartData` 都存在多日，但全仓对 `queryChartData` 的调用方数量为 0；图表渲染只读 `comp.configJson` 占位，前端从来没消费过后端真实数据
- `POST /datasets` 返回 `R.ok()` 无 `data`，前端 `res?.id` 永远 falsy，URL 不切到 `/dataset/editor/{id}`，下游"预览数据"路径根本到不了
- 前端 GET `/{id}/preview?page&size` 期望 `{columns, rows, total}`，后端 POST `/{id}/preview?limit` 返回 `List<Map>`：HTTP method、参数名、响应体三重不一致
- 外观 logo 列设计为 `VARCHAR(500)`，但前端 base64 dataURL 实际 ~2.7MB，保存时 MySQL 截断报 `Data too long`
- PropertyPanel 让用户手输 19 位 Snowflake ID 进 `el-input-number`：spec 规定了字段类型 `Long`，没规定字段输入方式，UX 落到 build 时变成"有输入框就行"

## AI-OS 预期行为

- spec 模板第 3 节"界面 / 接口 / 命令清单"表格必须包含 `input_mode` 列；后端 Long/BIGINT/Snowflake ID 字段禁止 `manual_number`
- spec 模板必须有第 5.5 节"User Journey 闭环契约"，列出该模块涉及的端到端 journey 链路（途经接口 / 关键消费点 / 字段映射）
- `tasks.yaml` 必须示范 E2E-SMOKE wave 任务，验收标准为"在本地启动栈走完用户实际路径产出真实响应或渲染截图/日志"
- `/plan` 必须要求跨栈任务显式拆出独立的 E2E-SMOKE 任务，归整条链路的 owner（不归前端也不归后端）
- `database-schema-design` 第四步必须要求列容量标注预期最大体积，禁止 `VARCHAR(200/500)` 作为默认
- `derived-rules` 2.4 节明确"端到端 user journey 必须有独立任务承担"
- `/verify` 必须把 E2E-SMOKE 任务真实跑通作为通过条件，不能用"前后端各自做完了自然就通"代替

## 最低证据

- spec 5.5 节存在 User Journey 闭环契约表（途经接口 + 字段映射）
- `tasks.yaml` 中存在独立的 E2E-SMOKE 任务，验收标准为真实端到端跑通
- E2E-SMOKE 任务输出包含真实请求响应日志或前端渲染截图（落到 `evals/journey-J-XXX-smoke.md`）
- spec 第 3 节所有可输入字段都有 `input_mode` 列；ID 字段未使用 `manual_number`
- `DESIGN.md` 中标注承载用户上传 / 业务文本列的预期最大体积和据此选择的类型

## 若需改 framework，优先检查

- `framework/.agents/templates/project/specs/example.spec.md`（第 3 节 input_mode 列、5.5 节）
- `framework/.agents/templates/project/tasks.yaml`（E2E-SMOKE 任务示例）
- `framework/.agents/workflows/plan.md`（拆 E2E-SMOKE 任务）
- `framework/.agents/workflows/design.md`（input_mode 声明）
- `framework/.agents/workflows/verify.md`（E2E-SMOKE 跑通作为通过条件）
- `framework/.agents/skills/database-schema-design/SKILL.md`（列容量标注）
- `framework/.agents/references/derived-rules.md`（2.4 节）
- `docs/problem-ledger.md`（PL-035）
