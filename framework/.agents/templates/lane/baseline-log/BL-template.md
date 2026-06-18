# {{INITIAL_BASELINE_ID}}

> 当前 lane 的初始基线记录。新增记录时新建 `CR-*` 或 `BL-*` 文件，不回写历史。

- **Type**: align
- **Status**: confirmed
- **Summary**: 初始交付基线已确认
- **Affects**: lanes/default/MISSION.md, lanes/default/specs/example.spec.md
- **Confirmed At**: {{INITIAL_BASELINE_DATE}}

## 后续 CR delta lifecycle 模板

新增 `CR-YYYYMMDD-HHMMSS-<slug>.md` 时必须包含以下段落（schema 由模板与 `AGENTS.md` 行为规则承载，maintainer 用 `git grep` 复盘）：

1. `## Current behavior`
2. `## Proposed delta`
3. `## Affected artifacts`
4. `## Acceptance delta`
5. `## Close/archive condition`
6. `## Preventability review`

## Preventability review 字段说明（v9.7+）

`## Preventability review` 段落是 AI-OS 的 framework feedback 入口。建议每条 CR 关闭前补一段，记录"这次修改在 AI 第一次通过 AI-OS 开发时是否本可避免"。字段：

- `Preventable`: `yes` / `no` / `partial`
  - `yes`：本可避免，AI-OS 第一次 session 应该拦住
  - `no`：真实需求变化或外部条件变化，与 AI-OS 框架本身无关
  - `partial`：AI-OS 部分覆盖但仍漏，最有价值的迭代信号
- `If yes, root cause`：AI-OS 第一次 session 没让用户做的事、没问的问题或没锁的设计（自由文字）
- `Maps to`：已有的 `PL-*` / `PG-*` 编号；若框架尚未登记，标 `unmapped`
- `Suggested guard`：如果要在 AI-OS 框架里防住，应改哪个工件 / 行为规则 / doctor 检查（自由文字）
- `Maintenance disposition`：是否进入维护 CR、小步重构、`memory.md` 技术债、`verification-matrix.yaml` guard 或 `evals/`；无 drift evidence 时标 `none`

数据纯本地、入版本控制；AI-OS maintainer 通过 `git grep` 与 dogfooding 通道定时归并到 `docs/problem-ledger.md`，不做任何遥测或上报。

## Lane 关闭 retrospective baseline-log

lane `status` 切到 `closed` 前，建议新增一条 `BL-YYYYMMDD-HHMMSS-retrospective.md`，聚合本 lane 内所有 `Preventability review`：

- `Type`: `retrospective`
- `Status`: `closed`
- `## Preventable findings`：列出 `Preventable: yes` / `partial` 的 CR 编号 + 一句话根因
- `## Unmapped → PL candidates`：标 `unmapped` 但出现 ≥2 次的根因，提议升格为新 `PL-*` / `PG-*`
- `## Suggested framework changes`：AGENTS.md / 工件模板 / doctor / docs 该改什么

retrospective 文件命名规则与 CR 相同，只是 slug 必须以 `retrospective` 开头或包含 `retrospective`，便于 `git grep` 检索。

## Agent handoff / evidence loop 提示

任务进入 `tasks.yaml` 时建议同步记录：

- `handoff_to`：接收任务的 AI agent / IDE / human surface
- `context_refs`：执行任务必须读取的 lane 工件
- `expected_return`：期望返回的 diff / PR / 测试 / review / 运行证据
- `fact_state_review`：把任务依据拆成 `observed` / `confirmed` / `inferred` / `unknown`
- `agent_run_review`：长时程 / 后台 / 并行 agent 的执行面、run_refs、write_scope、progress_checkpoints、return_packet 和 human_review_status
- `maintenance_review`：长期维护 / drift 控制任务的 drift_signals、refactor_trigger、contract_impact、native_checks 和 debt_disposition；无证据不得开启周期性大重构
- `evidence_produced`：任务关闭时实际产出的证据
- `deviation_log`：实现偏离、范围变化或需升级为 CR 的记录
