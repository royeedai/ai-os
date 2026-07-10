# AI-OS v11 工件 Schema

AI-OS v11 使用一套 canonical layout：共享根层 + `.ai-os/lanes/default/` 默认交付线。默认安装只包含核心工件；扩展工件按批准的 trigger matrix 按需创建。

## 目录布局（默认安装）

```text
<project-root>/
  AGENTS.md
  .ai-os/
    MISSION.md
    memory.md
    framework.toml
    managed-files.tsv
    bin/
      VERSION
      ai-os-doctor.js
      doctor-shared.js
    reference/
      artifacts.md
    lanes/
      default/
        lane.toml
        MISSION.md
        DESIGN.md
        STATE.md
        baseline-log/
          BL-YYYYMMDD-HHMMSS-bootstrap-unconfirmed.md
        tasks.yaml
```

v11 中 `.ai-os/framework.toml`、`.ai-os/managed-files.tsv`、`.ai-os/reference/artifacts.md` 与 `.ai-os/bin/` 全部入版本控制；只有各 lane 的 `STATE.md` 不入版本控制。其余核心和已创建的按需工件都提交到项目仓库，使团队 clone 与 CI 可离线恢复同一治理事实。

## 核心工件（默认安装）

### 1. `AGENTS.md`

- **位置**：项目根
- **职责**：交付宪法
- **加载层级**：L2

### 2. `.ai-os/MISSION.md`

- **职责**：共享宿主项目上下文、长期边界、跨 lane 约束
- **禁止**：把当前一轮交付基线、阶段状态或待确认项写入共享根层
- **加载层级**：L2

### 3. `.ai-os/memory.md`

- **职责**：共享稳定决策、长期约定、跨层契约、坑点与技术债
- **记录身份**：每条真实记录使用全局唯一且不复用的 `id`，并保留 `status`、`source`、`owner`、`last_verified`、`supersedes`
- **冲突处理**：使用正常 Git 冲突处理；禁止自动并集互相冲突的 active 事实
- **架构护栏**：工程约束分类即架构护栏 / 编码契约登记表；不另建第二真理源文件
- **加载层级**：L2

### 4. `.ai-os/framework.toml`、`managed-files.tsv` 与 `reference/`

- **职责**：记录 schema / layout / framework 版本、受管文件清单及当前版本的 canonical 本地参考
- **所有权**：framework-owned；升级必须按清单与精确内容验证，不得覆盖 project-owned 工件
- **加载层级**：L1（metadata）/ L3（manifest 与 reference）

### 5. `.ai-os/bin/`

- **内容**：`VERSION`、`ai-os-doctor.js`、`doctor-shared.js`
- **职责**：vendored、零网络、零 runtime dependency 的本地 doctor
- **用法**：`node .ai-os/bin/ai-os-doctor.js .`

### 6. `.ai-os/lanes/default/lane.toml`

- **职责**：lane 机器元数据与当前指针真理源
- **关键字段**：`id` `title` `status` `baseline_id` `quality_tier` `risk_tier` `governance_tier`
- **加载层级**：L1

字段类型与枚举：

- `lane.status`（`string`）：`active` / `closed`
- `quality_tier`（`string`）：`unassessed` / `exploratory` / `standard` / `strict`
- `risk_tier`（`string`）：`unassessed` / `low` / `medium` / `high`
- `governance_tier`（`string`）：`unassessed` / `G0` / `G1` / `G2`

fresh lane 的三个 tier 都是单值 `unassessed`，完成评估前不得声称 delivery ready。task `priority` 仍使用独立的 `P0` / `P1` / `P2` / `P3`，不能代替治理档位。

### 7. `.ai-os/lanes/default/MISSION.md`

- **职责**：当前交付目标、成功标准、范围与用户确认的产品 / 验收基线
- **镜像**：tier 和当前 baseline ID 是 `lane.toml` 的单值可读镜像，不是第二指针真理源
- **反述确认**：§2 承载核心主流程、异常与边界分支的需求层反述确认
- **加载层级**：L2

### 8. `.ai-os/lanes/default/DESIGN.md`

- **职责**：关键设计、共享基础设施审计、验收标准和对照参考
- **契约先行**：核心接口与数据模型未确认时不得进入大规模实现
- **反述确认门**：§10 是设计锁定前的反述确认门
- **加载层级**：L2

### 9. `.ai-os/lanes/default/STATE.md`

- **职责**：session-only 当前方位、待确认项与下一步导航
- **权威边界**：只镜像 `lane.toml` / MISSION / tasks / baseline-log；冲突时视为 stale 并重建，不得反向覆盖已提交真理
- **版本控制**：不入版本控制
- **加载层级**：L1

### 10. `.ai-os/lanes/default/baseline-log/`

- **职责**：bootstrap、confirmed baseline 与 change request 的不可抵赖生命周期记录（L3）
- **命名**：`BL-YYYYMMDD-HHMMSS-<slug>.md` / `CR-YYYYMMDD-HHMMSS-<slug>.md`
- **禁止**：全局递增编号（例如 `BL-001`）与回写已冻结历史

### 11. `.ai-os/lanes/default/tasks.yaml`

- **职责**：任务、owner、依赖、结构化审批、验收引用、证据要求 / 产出和代码 / 数据 / 运行状态（L2）
- **schema**：顶层 `version` 固定为整数 `5`；`baseline_id` 是当前任务集合绑定的 baseline 字符串
- **scope**：`tasks.scope.mode`（`string`）只允许 `change` / `release`；`focus` 与 `baseline_source` 都是字符串
- **task 字段**：`id` `title` `milestone` `status` `owner` `priority` `approval` `depends_on` `acceptance_refs` `evidence_required` `evidence_produced` `delivery_state` `change_scope`

milestone 标题描述待达成目标，不是 fresh bootstrap 的完成声明；fresh task 保持 `todo`、没有 produced evidence，三个 delivery state 都是 `unknown`。

## Canonical baseline 与 CR lifecycle

解析边界固定为：first H1 是 record ID，record region 内必须 exactly one H1；其后的 canonical metadata block 终止于 first `##` 或 EOF。H1 不属于 metadata key block。parser 只解析 metadata；first `##` 之后的说明、示例和 fenced contract 全部忽略，不得把示例中的 Type / Status 当成当前记录。

字段名、大小写、标点和枚举值都是可确定解析的 contract，不得改写或翻译：bootstrap 使用 `Type: bootstrap` / `Status: unconfirmed`；confirmed BL 使用 `Type: baseline` / `Status: confirmed`；CR 使用 `Type: change`，`Status` 只允许 `proposed` / `approved` / `applied` / `rejected`。

```text
bootstrap-unconfirmed
  -> confirmed BL
  -> proposed CR
  -> approved CR
  -> applied CR
  -> new immutable confirmed BL
```

bootstrap 与 confirmed BL 创建后不可变。CR 的可变字段、冻结点、合法 transition 与终态组合只以 `ai-os-cr-transition-matrix` 为准。

### Bootstrap skeleton

```ai-os-bootstrap
# {{INITIAL_BASELINE_ID}}

- **Type**: bootstrap
- **Status**: unconfirmed
- **Created At**: {{INITIAL_BASELINE_DATE}}
```

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

`previous_baseline_id`、`confirmed_by`、`confirmed_at` 是非空字符串；`confirmed_by` 必须标识实际确认者，`confirmed_at` 必须是 ISO-8601；`source_refs` 是至少一个非空字符串的列表。

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

`current_behavior`、`proposed_delta`、`close_condition` 是非空字符串；`affected_artifacts`、`acceptance_delta` 是非空字符串列表。`approval` 在 proposed 时为空；进入 approved / rejected 时写入明确的人类审批证据引用。`result_baseline_id` 在 applied 前为空，applied 时必须是新建 confirmed BL 的完整 ID。

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

应用 CR 并新建 baseline 时，在同一个变更集中对齐 `lane.toml.baseline_id`、`MISSION.md` baseline 镜像、`tasks.yaml` 顶层 `baseline_id`，以及存在时的 `STATE.md` baseline 镜像。task `approval.baseline_id` 是审批快照，不得随当前 baseline 机械重写。

新 baseline 建立后，每个 task approval 必须重新评估；旧 approval.baseline_id 与旧 evidence 不得满足新 baseline。不得机械改写旧人类决定；required task 需要新的明确人类审批。

CR 的 `preventability_review` 使用 canonical 子字段 `status`、`preventable`、`root_cause`、`suggested_guard`；记录纯本地、入版本控制，不做遥测。

### Retrospective subtype

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

## Task v5 approval、evidence 与 delivery state

- task `status`（`string`）：`todo` / `in-progress` / `blocked` / `done` / `shipped`
- `depends_on`、`acceptance_refs`、`evidence_required`、`evidence_produced`、`change_scope`、`approved_scope`、`conditions` 都是 list；fresh 空列表必须写 `[]`，不得放空字符串伪 ID
- `approval.required` 是 boolean；其余 approval scalar 是 string，`approved_scope` / `conditions` 是 string list
- `evidence_required` 是稳定的 requirement ID string list；每个 ID 非空且在同一 task 内唯一，例如 `design-note`、`build-log`、`test-log`
- `evidence_produced` 是对象列表；每个 `id` 非空、在同一 task 内唯一，并必须精确匹配该 task 的一个 `evidence_required` ID。跨 task 可以重复同名 requirement / evidence ID；`(task.id, evidence.id)` 是复合身份
- evidence `kind` 是与 requirement ID 独立的分类，只允许 `static` / `test` / `runtime` / `data` / `manual` / `release`
- `delivery_state.code` / `data` / `runtime` 只允许 `observed` / `inferred` / `unknown` / `not-applicable`，三个维度分别持久化

每个 produced evidence 对象必须严格使用以下九个字段，不允许额外字段：

```ai-os-evidence
id: "<requirement-id>"
kind: test
command: "<non-empty-command>"
exit_code: 0
git_sha: "<full-observed-commit-SHA>"
environment: "<non-empty-environment>"
observed_at: "<ISO-8601>"
artifact: "<non-empty-path-or-URL>"
confidence: observed
```

`id`、`kind`、`command`、`git_sha`、`environment`、`observed_at`、`artifact`、`confidence` 是 string，`exit_code` 是 integer。`confidence` 的记录枚举是 `observed` / `inferred` / `unknown`，但只有 `observed` 可通过完成门。完成门只接受下列确定性 contract：

```ai-os-evidence-gate
required_id=non-empty-and-unique-within-task
evidence_id=non-empty-and-unique-within-task
identity=task.id-plus-evidence.id
binding=evidence_produced.id-exactly-matches-evidence_required-id-in-same-task
keys=id,kind,command,exit_code,git_sha,environment,observed_at,artifact,confidence
extra_keys=forbidden
kind=static-or-test-or-runtime-or-data-or-manual-or-release
command=non-empty
exit_code=0
git_sha=full-observed-commit
git_relation=git_sha-is-ancestor-of-current-HEAD
environment=non-empty
artifact=non-empty
confidence=observed
baseline=tasks.yaml.baseline_id-equals-active-lane.toml.baseline_id
worktree=clean
impact_scope=all-tracked-repository-paths
impact_exclusion=.ai-os/lanes/<lane-id-other-than-current-lane>/**
tracked_diff=only-.ai-os/lanes/<current-lane-id>/tasks.yaml-after-impact-exclusion
semantic_change=any-task.status,evidence_produced,delivery_state
semantic_unchanged=version,baseline_id,scope,milestones,task-set,task.id,title,milestone,owner,priority,approval,depends_on,acceptance_refs,evidence_required,change_scope
freshness=active-confirmed-BL.confirmed_at<=observed_at<=fixed-now
ttl=none
reject=missing-key,duplicate-id,future-time,pre-baseline-time,old-baseline,non-ancestor-SHA,non-evidence-tracked-diff,semantic-drift,dirty-worktree
```

因此 `done` / `shipped` 的每个 requirement ID 都要有一条精确绑定的 evidence；produced ID 在各自 task 内唯一。evidence 必须是合法 kind、`confidence: observed`、`exit_code: 0`，并具有非空 command / environment / artifact 与 ISO-8601 `observed_at`。

`git_sha` 是实际执行验证的 full observed commit，不是写入 evidence 后的自引用 SHA；它必须是当前 HEAD 的祖先，当前 worktree 必须 clean。对 observed / current 两版任务做 strict parsed semantic comparison 时，允许一个或多个 task 的 `status`、`evidence_produced`、`delivery_state` 发生 evidence-recording 变化，其余 top-level 和 task contract 字段必须不变。因此可以用一个或多个 evidence-only commit 持久化结果，又不会要求 commit hash 引用自身。

Impact scope 不按“代码 / 文档”等主观类别判断。执行 `git diff --name-only <observed-sha>..<current-HEAD>` 取得全部 tracked path，将严格位于 `.ai-os/lanes/<other-lane-id>/**` 的其他 lane 子树路径排除；其余路径只能精确等于 `.ai-os/lanes/<current-lane-id>/tasks.yaml`。因此其他 lane 的治理文件不影响当前 lane evidence，而任何 root config、lockfile、CI、migration、schema、asset、共享根层、项目文件或当前 lane 其他文件的差异都会使旧 evidence 失效。

`tasks.yaml.baseline_id` 必须等于 active `lane.toml.baseline_id`；时间窗固定为 active confirmed BL 的 `confirmed_at <= observed_at <= fixed now`，采用 no TTL。缺字段、task 内重复 ID、未来时间、早于 baseline、旧 baseline、非祖先 SHA、impact scope 内非 evidence 的 tracked diff、semantic drift 或 dirty worktree 一律不能通过完成门。

Approval 组合规则：

- `not-required` 使用 `required: false`；`pending` 使用 `required: true`；两者的 decision fields `decided_by`、`decided_at`、`evidence_ref` 必须为空，`approved_scope` 与 `conditions` 也保持空列表
- `approved` / `rejected` / `expired` 都使用 `required: true`，并必须记录明确的人类 `decided_by`、ISO-8601 `decided_at` 与非空 `evidence_ref`
- `approved_scope` 对 `approved` 必须非空；对 rejected / expired 保持空列表；`conditions` 只记录决定附带的明确条件
- `approval.baseline_id` 是非空 string，始终是审批发生时的快照，不是当前指针镜像
- AI 不得自我审批，也不得从上下文推断人类决定；AI 只能抄录可引用的明确人类审批证据

`done` / `shipped` 还必须具备有效 `acceptance_refs` 和通过上述当前 baseline / commit 证据门的 observed evidence。

## 按需工件（默认不安装）

以下工件不随 install 生成。doctor 会校验所有已存在的按需工件的确定性 schema，并按 canonical trigger 检查必须存在的最小工件；它不根据主观猜测发明 release intent。

| 工件 | canonical 触发 |
|---|---|
| `risk-register.md` | `G2 / high-risk work` |
| `verification-matrix.yaml` | `stable failure / G2 minimum guard` |
| `release-plan.md` | 显式 `release intent / G2 release preparation` |
| `specs/` | DESIGN 必须切分为局部契约 |
| `design-pack/` | reverse-spec parity evidence |
| `evals/` | 同一 root cause observed 至少三次 |

非 release 的 G2 工作不强制创建 `release-plan.md`；只有显式 publish / deploy / release 意图或 G2 release preparation 才创建。未执行发布必须写成 blocker / manual action / non-goal，不能伪造已发布状态。

### `risk-register.md`

- **schema**：`| R-<id> | 风险描述 | 影响范围 | 缓解措施 | 状态 |`
- **加载层级**：L2

### `release-plan.md`

- **schema**：release intent、发布步骤、回滚条件、blockers、manual steps
- **加载层级**：L2

### `verification-matrix.yaml`

- **schema**：`impact_rules`（`when` / `run`）+ `failure_modes`（`id` / `scenario` / `expected` / `guard`）
- **加载层级**：L2

### `specs/`

- **schema**：`*.spec.md` 锁定接口 / 数据 / 行为契约与验收映射；bug spec 锁定 root cause、reproduction、blast radius、planned files、regression guard
- **加载层级**：L3

### `design-pack/`

- **schema**：`parity-map.md` 记录 capture manifest 与 visual / interaction / API parity；`confidence` 为 `observed` / `inferred` / `unknown`，只有 observed 可进入 confirmed acceptance criteria；证据写入前脱敏 cookies / tokens / PII
- **加载层级**：L3

### `evals/`

- **schema**：每个 eval 是一个 markdown 文件，记录 scenario、expected、trigger_source 与首次出现的 baseline-log ID
- **加载层级**：L3

## 隐式机制审计落点

隐式机制审计不是新默认 artifact，不改变默认安装布局。命中隐式机制或高风险状态流时：

- lane `DESIGN.md` 记录触发入口、生效范围、执行顺序、失败表现、路径清单和最小验证证据
- 根层 `.ai-os/memory.md` 登记稳定工程约束，类型可用 `implicit-mechanism` / `technology-profile` / `high-risk-state-flow`
- G2 / 高风险状态流创建 `risk-register.md` 与 `verification-matrix.yaml`；`release-plan.md` 仍只按上方 release trigger 创建

## 关键语义约束

- 根层 `.ai-os/MISSION.md` 是共享宿主上下文；lane `MISSION.md` 是当前产品 / 验收基线
- `lane.toml` 是 lane identity、tier 和 baseline pointer 的机器真理源
- `STATE.md` 只允许存在于 lane 内；`memory.md` 只保留根层一份
- 所有 lane 工件（核心 + 按需）默认属于当前 lane

## 命名规范

- `CR-YYYYMMDD-HHMMSS-<slug>.md`
- `BL-YYYYMMDD-HHMMSS-<slug>.md`

禁止使用全局递增编号如 `BL-001`。

## 加载分层（progressive disclosure）

Agent 先通过 Activation Gate，确认是 delivery-affecting work 后才加载 lane 工件；普通对话不读取或写入 `.ai-os/lanes/*`。层级只在阶段切换时升级：

- **L1 — 入口元数据**：lane `STATE.md`、`lane.toml`、`.ai-os/framework.toml`、`.ai-os/lanes/` 列表
- **L2 — 核心文档**：根 `AGENTS.md` / `MISSION.md` / `memory.md`；lane `MISSION.md` / `DESIGN.md` / `tasks.yaml`；已创建的按需 L2 工件
- **L3 — 详细资源**：lane `baseline-log/`、已创建的 `specs/` / `design-pack/` / `evals/`、`.ai-os/managed-files.tsv` 与 `.ai-os/reference/artifacts.md`

## Activation Gate

AI-OS 工件治理只适用于 delivery-affecting work：改代码、改项目文档或工件、实现功能、修 bug、需求变化、验证、发布、恢复交付现场或高风险动作。

普通对话（需求脑暴、先聊聊、代码解释、方案比较、学习提问、临时命令、非仓库交付任务）不进入 lane governance，只遵守真实目标优先、不得脑补事实、不得伪造验证结果。

如果用户意图不清，agent 只问一句：“这是先讨论，还是要进入项目交付流程？”用户已明确要求分析、修复、实现、验证或发布当前项目时，直接从 L1 进入恢复与审计，不再反问。确认停点只在尚未授权当前阶段、范围 / 验收不清、高风险或可能越界时阻塞。

## 反述确认 / 双向对齐门

进入设计锁定或大规模实现前，agent 必须结构化反述目标、核心主流程、状态流转与关键异常路径。需求层反述落在 lane `MISSION.md` §2，设计层反述落在 lane `DESIGN.md` §10；用户确认或校正后才锁定。

## 验证与收口约定

- 验证失败先分类为 `product-code` / `local-environment` / `external-service` / `production-state-unknown`；只有 product-code 直接进入代码修复
- 收口前对齐最新用户请求与 lane 状态；交付结论拆成代码状态 / 数据状态 / 运行状态
- pull / stash / rebase / branch switch 后检查 `tasks.yaml` duplicate IDs、baseline alignment 与证据丢失

## 边界原则

AI-OS kernel（Activation Gate、核心工件、`AGENTS.md`、lane 恢复、`memory.md`、项目原生验证、local doctor、无遥测、无默认外部服务）保持稳定。新增 doctor warning 必须是确定性结构检查；新增 CLI 子命令、adapter 或工件类别默认禁止，除非明确需求与测试 / 文档同步批准。内置 agent runner、重构调度器、模型路由器、自动发版平台、长期后台服务、遥测收集不进入 core。
