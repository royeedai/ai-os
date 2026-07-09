# {{INITIAL_BASELINE_ID}}

> 当前 lane 的初始基线记录。新增记录时新建 `CR-*` 或 `BL-*` 文件，不回写历史。

- **Type**: align
- **Status**: confirmed
- **Summary**: 初始交付基线已确认
- **Affects**: lanes/default/MISSION.md
- **Confirmed At**: {{INITIAL_BASELINE_DATE}}

## 后续 CR delta lifecycle 模板

新增 `CR-YYYYMMDD-HHMMSS-<slug>.md` 时必须包含以下段落：

1. `## Current behavior`
2. `## Proposed delta`
3. `## Affected artifacts`
4. `## Acceptance delta`
5. `## Close/archive condition`
6. `## Preventability review`

## Preventability review 字段说明

`## Preventability review` 段落是 AI-OS 的 framework feedback 入口。每条 CR 关闭前补一段，记录"这次修改在 AI 第一次通过 AI-OS 开发时是否本可避免"。字段：

- `Preventable`: `yes` / `no` / `partial`
  - `yes`：本可避免，AI-OS 第一次 session 应该拦住
  - `no`：真实需求变化或外部条件变化，与 AI-OS 框架本身无关
  - `partial`：AI-OS 部分覆盖但仍漏，最有价值的迭代信号
- `If yes, root cause`：AI-OS 第一次 session 没让用户做的事、没问的问题或没锁的设计（自由文字）
- `Suggested guard`：如果要在 AI-OS 框架里防住，应改哪个工件 / 行为规则 / doctor 检查（自由文字）

数据纯本地、入版本控制，不做任何遥测或上报。

## Lane 关闭 retrospective baseline-log

lane `status` 切到 `closed` 前，建议新增一条 `BL-YYYYMMDD-HHMMSS-retrospective.md`，聚合本 lane 内所有 `Preventability review`：

- `Type`: `retrospective`
- `Status`: `closed`
- `## Preventable findings`：列出 `Preventable: yes` / `partial` 的 CR 编号 + 一句话根因
- `## Suggested framework changes`：AGENTS.md / 工件模板 / doctor / docs 该改什么

retrospective 文件命名规则与 CR 相同，slug 必须包含 `retrospective`，便于 `git grep` 检索。
