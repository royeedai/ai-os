# {{INITIAL_BASELINE_ID}}

- **Type**: bootstrap
- **Status**: unconfirmed
- **Created At**: {{INITIAL_BASELINE_DATE}}

## Canonical record contract

字段名、大小写、标点和枚举值都是 canonical contract，不得改写或翻译：bootstrap 使用 `Type: bootstrap` / `Status: unconfirmed`；confirmed BL 使用 `Type: baseline` / `Status: confirmed`；CR 使用 `Type: change`，`Status` 只允许 `proposed` / `approved` / `applied` / `rejected`。

bootstrap 与 confirmed BL 创建后不可变。CR 在 `proposed` 状态可编辑；进入 `approved` 后，`approval` 冻结已决定的范围；进入 `applied` 后整条 CR 完整不可变。只有 `approved` CR 可进入 `applied`，且 `result_baseline_id` 必须指向由该 CR 新建的 confirmed BL。

fresh bootstrap 只表示治理工件已创建，不表示用户已确认目标、设计或验收，也不得声称 `Design Locked`。确认或变更基线时新建记录，不回写 bootstrap 或历史 BL。

### Confirmed BL skeleton

```ai-os-confirmed-bl
# BL-YYYYMMDD-HHMMSS-<slug>

- **Type**: baseline
- **Status**: confirmed
- **previous_baseline_id**: <baseline-id>
- **confirmed_by**: <human-identity>
- **confirmed_at**: <ISO-8601>
- **source_refs**:
  - <source-ref>
```

### Change request skeleton

```ai-os-change-request
# CR-YYYYMMDD-HHMMSS-<slug>

- **Type**: change
- **Status**: proposed
- **current_behavior**: <non-empty>
- **proposed_delta**: <non-empty>
- **affected_artifacts**:
  - <artifact-path>
- **acceptance_delta**:
  - <acceptance-ref-or-delta>
- **approval**: ""
- **close_condition**: <non-empty>
- **preventability_review**: <yes-or-no-or-partial-with-reason-and-guard>
- **result_baseline_id**: ""
```

字段的人类可读映射是 Current behavior、Proposed delta、Affected artifacts、Acceptance delta、Approval、Close/archive condition 和 Preventability review；实际记录必须使用 skeleton 中的 canonical 字段名。

## Baseline pointer transition

应用 CR 并新建 confirmed BL 时，在同一个变更集中对齐 `lane.toml.baseline_id`、`MISSION.md` baseline 镜像、`tasks.yaml` 顶层 `baseline_id`，以及文件存在时的 `STATE.md` baseline 镜像。task `approval.baseline_id` 是审批发生时的快照，不得随当前 baseline 机械重写。

## Preventability review 字段说明

`preventability_review` 是 AI-OS 的 framework feedback 入口。每条 CR 关闭前记录“这次修改在 AI 第一次通过 AI-OS 开发时是否本可避免”：

- `Preventable`: `yes` / `no` / `partial`
  - `yes`：本可避免，AI-OS 第一次 session 应该拦住
  - `no`：真实需求变化或外部条件变化，与 AI-OS 框架本身无关
  - `partial`：AI-OS 部分覆盖但仍漏，最有价值的迭代信号
- `If yes, root cause`：AI-OS 第一次 session 没让用户做的事、没问的问题或没锁的设计
- `Suggested guard`：应修改的工件、行为规则或 doctor 检查

数据纯本地、入版本控制，不做任何遥测或上报。

## Lane 关闭 retrospective baseline-log

lane `status` 切到 `closed` 前，建议新增一条 `BL-YYYYMMDD-HHMMSS-retrospective.md`，聚合本 lane 内所有 Preventability review：

- `Type`: `retrospective`
- `Status`: `closed`
- `## Preventable findings`：列出 `Preventable: yes` / `partial` 的 CR 编号与一句话根因
- `## Suggested framework changes`：AGENTS.md / 工件模板 / doctor / docs 应修改什么

retrospective 文件命名规则与 CR 相同，slug 必须包含 `retrospective`，便于 `git grep` 检索。
