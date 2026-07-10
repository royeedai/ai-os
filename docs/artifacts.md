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

字段名、大小写、标点和枚举值都是可确定解析的 contract，不得改写或翻译：bootstrap 使用 `Type: bootstrap` / `Status: unconfirmed`；confirmed BL 使用 `Type: baseline` / `Status: confirmed`；CR 使用 `Type: change`，`Status` 只允许 `proposed` / `approved` / `applied` / `rejected`。

```text
bootstrap-unconfirmed
  -> confirmed BL
  -> proposed CR
  -> approved CR
  -> applied CR
  -> new immutable confirmed BL
```

bootstrap 与 confirmed BL 创建后不可变。CR 在 `proposed` 状态可编辑；进入 `approved` 后，`approval` 冻结已决定的范围；进入 `applied` 后整条 CR 完整不可变。只有 `approved` CR 可进入 `applied`，且 `result_baseline_id` 必须指向由该 CR 新建的 confirmed BL。

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
- **preventability_review**: <yes-or-no-or-partial-with-reason-and-guard>
- **result_baseline_id**: ""
```

`current_behavior`、`proposed_delta`、`close_condition` 与 `preventability_review` 是非空字符串；`affected_artifacts`、`acceptance_delta` 是非空字符串列表。`approval` 在 proposed 时为空；进入 approved / rejected 时写入明确的人类审批证据引用。`result_baseline_id` 在 applied 前为空，applied 时必须是新建 confirmed BL 的完整 ID。

应用 CR 并新建 baseline 时，在同一个变更集中对齐 `lane.toml.baseline_id`、`MISSION.md` baseline 镜像、`tasks.yaml` 顶层 `baseline_id`，以及存在时的 `STATE.md` baseline 镜像。task `approval.baseline_id` 是审批快照，不得随当前 baseline 机械重写。

CR 的 `preventability_review` 记录 `Preventable: yes / no / partial`、`If yes, root cause`、`Suggested guard`。lane 关闭前可新建 `BL-YYYYMMDD-HHMMSS-retrospective.md` 聚合 Preventable findings 与 Suggested framework changes；记录纯本地、入版本控制，不做遥测。

## Task v5 approval、evidence 与 delivery state

- task `status`（`string`）：`todo` / `in-progress` / `blocked` / `done` / `shipped`
- `depends_on`、`acceptance_refs`、`evidence_required`、`evidence_produced`、`change_scope`、`approved_scope`、`conditions` 都是 list；fresh 空列表必须写 `[]`，不得放空字符串伪 ID
- `approval.required` 是 boolean；其余 approval scalar 是 string，`approved_scope` / `conditions` 是 string list
- `evidence_required` 是 evidence kind 列表，只允许 `static` / `test` / `runtime` / `data` / `manual` / `release`
- `evidence_produced` 是对象列表；每个对象只使用既有字段 `id`、`kind`、`command`、`exit_code`、`git_sha`、`environment`、`observed_at`、`artifact`、`confidence`
- evidence 的 `id`、`kind`、`command`、`git_sha`、`environment`、`observed_at`、`artifact`、`confidence` 都是 string；`exit_code` 是 integer
- evidence `confidence` 只允许 `observed` / `inferred` / `unknown`；`observed_at` 是 ISO-8601，`git_sha` 是产生证据时的完整 commit SHA
- 每个 `evidence_required` kind 都必须有同一 kind 的 fresh、`observed` `evidence_produced` 才能满足；inferred / unknown、旧 baseline、旧 commit 或非零 / 缺失 exit code 不能满足完成门
- `delivery_state.code` / `data` / `runtime` 只允许 `observed` / `inferred` / `unknown` / `not-applicable`，三个维度分别持久化

Approval 组合规则：

- `not-required` 使用 `required: false`；`pending` 使用 `required: true`；两者的 decision fields `decided_by`、`decided_at`、`evidence_ref` 必须为空，`approved_scope` 与 `conditions` 也保持空列表
- `approved` / `rejected` / `expired` 都使用 `required: true`，并必须记录明确的人类 `decided_by`、ISO-8601 `decided_at` 与非空 `evidence_ref`
- `approved_scope` 对 `approved` 必须非空；对 rejected / expired 保持空列表；`conditions` 只记录决定附带的明确条件
- `approval.baseline_id` 是非空 string，始终是审批发生时的快照，不是当前指针镜像
- AI 不得自我审批，也不得从上下文推断人类决定；AI 只能抄录可引用的明确人类审批证据

`done` / `shipped` 还必须具备有效 `acceptance_refs` 和与当前 baseline / commit 绑定的 fresh observed evidence。

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
