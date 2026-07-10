# {{INITIAL_BASELINE_ID}}

> 安装器创建的 bootstrap 记录，仅表示治理工件已初始化，不表示用户已确认交付基线。
> 确认或变更基线时必须新建 `BL-*` 或 `CR-*` 文件，不回写历史记录。

- **Type**: bootstrap
- **Status**: unconfirmed
- **Summary**: 安装后待确认的初始交付基线
- **Affects**: lanes/default/MISSION.md
- **Created At**: {{INITIAL_BASELINE_DATE}}

## 升格为 confirmed BL

用户确认当前交付基线后，新建不可变的 `BL-YYYYMMDD-HHMMSS-<slug>.md`，并包含：

- `previous_baseline_id`
- `confirmed_by`
- `confirmed_at`
- `source_refs`

随后将 `lane.toml.baseline_id` 与 `tasks.yaml.baseline_id` 指向该 confirmed BL；本 bootstrap 记录保持不变。

## 后续 CR delta lifecycle 模板

新增 `CR-YYYYMMDD-HHMMSS-<slug>.md` 时必须包含以下段落：

1. `## Current behavior`
2. `## Proposed delta`
3. `## Affected artifacts`
4. `## Acceptance delta`
5. `## Approval`
6. `## Close/archive condition`
7. `## Preventability review`

CR 状态按 `proposed` → `approved` → `applied` 推进；只有具备有效审批的 CR 才能进入 `applied`，并引用由它产生的新 confirmed BL。历史 CR 与 BL 均不可回写。

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
