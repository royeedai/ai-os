# {{INITIAL_BASELINE_ID}}

- **Type**: bootstrap
- **Status**: unconfirmed
- **Created At**: {{INITIAL_BASELINE_DATE}}

## Canonical record contract

解析边界固定为：first H1 是 record ID，record region 内必须 exactly one H1；其后的 canonical metadata block 终止于 first `##` 或 EOF。H1 不属于 metadata key block。parser 只解析 metadata；first `##` 之后的说明、示例和 fenced contract 全部忽略，不得把示例中的 Type / Status 当成当前记录。

字段名、大小写、标点和枚举值都是 canonical contract，不得改写或翻译：bootstrap 使用 `Type: bootstrap` / `Status: unconfirmed`；confirmed BL 使用 `Type: baseline` / `Status: confirmed`；CR 使用 `Type: change`，`Status` 只允许 `proposed` / `approved` / `applied` / `rejected`。

bootstrap 与 confirmed BL 创建后不可变。CR 的可变字段、冻结点、合法 transition 与终态组合只以 `ai-os-cr-transition-matrix` 为准。

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
- **preventability_review**:
  - **status**: pending
  - **preventable**: ""
  - **root_cause**: ""
  - **suggested_guard**: ""
- **result_baseline_id**: ""
```

字段的人类可读映射是 Current behavior、Proposed delta、Affected artifacts、Acceptance delta、Approval、Close/archive condition 和 Preventability review；实际记录必须使用 skeleton 中的 canonical 字段名。

### CR transition matrix

```ai-os-cr-transition-matrix
review.pending=preventable-empty,root_cause-empty,suggested_guard-empty
review.completed=preventable-yes-or-no-or-partial,root_cause-non-empty,suggested_guard-non-empty-or-none
state.proposed.mutable=Status,current_behavior,proposed_delta,affected_artifacts,acceptance_delta,approval,close_condition,preventability_review
state.proposed.result_baseline_id=empty
transition.proposed-to-approved.requires=approval-human-evidence
transition.proposed-to-approved.freezes=current_behavior,proposed_delta,affected_artifacts,acceptance_delta,approval,close_condition
state.approved.mutable=Status,preventability_review,result_baseline_id
state.approved.review=pending-or-completed
state.approved.result_baseline_id=empty
transition.approved-to-applied.requires=result_baseline_id-new-confirmed-bl,preventability_review-completed
state.applied.review=completed
state.applied.terminal=immutable
transition.proposed-to-rejected.requires=approval-human-evidence,result_baseline_id-empty,preventability_review-completed
state.rejected.review=completed
state.rejected.terminal=immutable
```

该 transition matrix 是规范写入 / 评审规则。doctor 面对单个当前快照时只验证当前状态组合、必填值与空值约束，不能证明历史冻结字段从未被修改，也不遍历 Git history 伪造这种证明。

`pending` 只允许出现在 proposed / approved，且 `preventable`、`root_cause`、`suggested_guard` 全为空。applied / rejected 前 review 必须为 `completed`，`preventable` 为 `yes` / `no` / `partial`，`root_cause` 与 `suggested_guard` 非空；确无建议时 `suggested_guard` 明确写 `none`。

## Baseline pointer transition

应用 CR 并新建 confirmed BL 时，在同一个变更集中对齐 `lane.toml.baseline_id`、`MISSION.md` baseline 镜像、`tasks.yaml` 顶层 `baseline_id`，以及文件存在时的 `STATE.md` baseline 镜像。task `approval.baseline_id` 是审批发生时的快照，不得随当前 baseline 机械重写。

新 baseline 建立后，每个 task approval 必须重新评估；旧 approval.baseline_id 与旧 evidence 不得满足新 baseline。不得机械改写旧人类决定；required task 需要新的明确人类审批。

## Preventability review 字段说明

`preventability_review` 是 AI-OS 的 framework feedback 入口。canonical 子字段是 `status`、`preventable`、`root_cause`、`suggested_guard`；每条终态 CR 记录“这次修改在 AI 第一次通过 AI-OS 开发时是否本可避免”：

- `Preventable`: `yes` / `no` / `partial`
  - `yes`：本可避免，AI-OS 第一次 session 应该拦住
  - `no`：真实需求变化或外部条件变化，与 AI-OS 框架本身无关
  - `partial`：AI-OS 部分覆盖但仍漏，最有价值的迭代信号
- `If yes, root cause`：AI-OS 第一次 session 没让用户做的事、没问的问题或没锁的设计
- `Suggested guard`：应修改的工件、行为规则或 doctor 检查

数据纯本地、入版本控制，不做任何遥测或上报。

## Lane 关闭 retrospective baseline-log

lane `status` 切到 `closed` 前，建议新增一条 retrospective，聚合本 lane 内所有 Preventability review：

```ai-os-retrospective
# BL-YYYYMMDD-HHMMSS-retrospective

- **Type**: retrospective
- **Status**: closed
- **source_cr_ids**:
  - <CR-id>
- **preventable_findings**: []
- **suggested_framework_changes**: []
```

文件名严格匹配 `^BL-\d{8}-\d{6}-retrospective\.md$`。`source_cr_ids` 是非空且元素唯一的 CR ID string list；`preventable_findings` 与 `suggested_framework_changes` 都是 string list，无条目时明确写 `[]`。

retrospective 创建后不可变，parser 必须校验其 metadata、字段类型、列表与文件名；它不是 current confirmed baseline，不进入 baseline pointer chain，也不得成为 `lane.toml.baseline_id`。
