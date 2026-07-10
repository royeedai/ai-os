# 工件 Schema

v10 起，AI-OS 只有一套 canonical layout：**共享根层 + `.ai-os/lanes/default/` 默认交付线**。默认安装只包含核心工件；扩展工件按需由 agent 在触发条件命中时创建。

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
      ai-os-doctor.js
      shared.js
      VERSION
    lanes/
      default/
        lane.toml
        MISSION.md
        DESIGN.md
        STATE.md
        baseline-log/
        tasks.yaml
```

## 核心工件（默认安装）

### 1. `AGENTS.md`

- **位置**：项目根
- **职责**：交付宪法
- **加载层级**：L2

### 2. `.ai-os/MISSION.md`

- **职责**：共享宿主项目上下文、长期边界、跨 lane 约束
- **禁止**：把当前这轮交付基线、阶段状态、待确认项写进这里
- **加载层级**：L2

### 3. `.ai-os/memory.md`

- **职责**：共享稳定决策、长期约定、跨层契约、坑点、技术债
- **架构护栏**：§2 工程约束即「架构护栏 / 编码契约登记表」（统一返回包装、必须复用抽象、禁止反模式、依赖策略）；不另建 `.ai-os-rules` 等第二真理源文件；验证阶段逐条对照
- **版本控制**：入版本控制，使用正常 Git 冲突处理；禁止自动并集互相冲突的 active 事实
- **记录身份**：每条 stable record 使用全局唯一且不复用的 `id`，并保留 `status`、`source`、`owner`、`last_verified`、`supersedes`
- **加载层级**：L2

### 4. `.ai-os/framework.toml` + `managed-files.tsv`

- **职责**：schema / layout / framework 版本；受管文件清单
- **版本控制**：不入版本控制（gitignore）
- **加载层级**：L1 / L3

> 受管工具入口（不计入工件）：`.ai-os/bin/`（`ai-os-doctor.js` + `shared.js` + `VERSION`）。install 把 doctor vendored 到此，日常 / hook / CI 用 `node .ai-os/bin/ai-os-doctor.js .` 本地零外部请求。**入版本控制**，团队 clone 与 CI 无需重新 install 即可离线运行。

### 5. `.ai-os/lanes/default/lane.toml`

- **职责**：lane 元数据
- **关键字段**：`id` `title` `status` `baseline_id` `quality_tier` `risk_tier` `governance_tier`
- **真理源**：当前 baseline 指针和三种 tier 均以此文件为准；`MISSION.md` / `STATE.md` 只能镜像
- **加载层级**：L1

### 6. `.ai-os/lanes/default/MISSION.md`

- **职责**：当前交付目标、成功标准、范围、基线 ID
- **说明**：当前 lane 的唯一交付基线真理源；§2 承载需求层反述确认（核心主流程 / 关键异常 / 边界分支）
- **加载层级**：L2

### 7. `.ai-os/lanes/default/DESIGN.md`

- **职责**：关键设计、共享基础设施审计、验收标准、对照参考
- **契约先行**：核心接口与数据模型是契约层，确认状态 pending 不得进入大规模实现
- **反述确认门**：§10 是设计锁定前的反述确认门，agent 先反述对关键设计的理解，用户确认或校正后才锁定
- **加载层级**：L2

### 8. `.ai-os/lanes/default/STATE.md`

- **职责**：当前方位、待确认项、下一步
- **版本控制**：不入版本控制
- **权威边界**：仅用于 session 导航；与已提交真理源冲突时视为 stale 并重建
- **加载层级**：L1（session 恢复入口）

### 9. `.ai-os/lanes/default/baseline-log/`

- **职责**：变更请求与基线升格记录（**L3**）
- **CR schema**：`CR-*` 记录必须说明 Current behavior、Proposed delta、Affected artifacts、Acceptance delta、Approval、Close/archive condition；CR 关闭前补 `## Preventability review`（`Preventable: yes / no / partial` + root cause + suggested guard）；lane 关闭前补 `BL-*-retrospective*.md` 聚合

### 10. `.ai-os/lanes/default/tasks.yaml`

- **职责**：任务、owner、依赖、结构化审批、证据要求 / 产出和代码 / 数据 / 运行状态（**L2**）
- **关键字段**：`id` `title` `milestone` `status` `owner` `priority` `approval` `depends_on` `acceptance_refs` `evidence_required` `evidence_produced` `delivery_state` `change_scope`

## 治理、基线、审批与证据契约

### Tier 与优先级

- `quality_tier`：`unassessed` / `exploratory` / `standard` / `strict`
- `risk_tier`：`unassessed` / `low` / `medium` / `high`
- `governance_tier`：`unassessed` / `G0` / `G1` / `G2`
- task `priority`：`P0` / `P1` / `P2` / `P3`；它只表示任务优先级，不能代替治理档位

新建 lane 的三个 tier 都是 `unassessed`，完成评估前不得声称 delivery ready。`G0` 用于低风险且范围清晰的 exploratory 交付，`G1` 用于 standard 交付或中等不确定性 / 风险，`G2` 用于 strict、高风险、不可逆、生产、资产、权限或外部副作用交付。

### Baseline 与 CR 生命周期

```text
bootstrap-unconfirmed
  -> confirmed BL
  -> proposed CR
  -> approved CR
  -> applied CR
  -> new immutable confirmed BL
```

- bootstrap 只含创建事实，`status` 为 `unconfirmed`，不得包含确认时间或确认声明。
- confirmed BL 必须记录 `previous_baseline_id`、`confirmed_by`、`confirmed_at`、`source_refs`，且历史记录不可变。
- CR 必须记录 `status`、`current_behavior`、`proposed_delta`、`affected_artifacts`、`acceptance_delta`、`approval`、`close_condition`、`preventability_review`。只有已审批 CR 才能进入 applied，并指向新建的 confirmed BL。
- `lane.toml.baseline_id` 是当前指针；`tasks.yaml.baseline_id` 绑定任务快照；`STATE.md` 中的 ID 只是可重建镜像。

### Task v5、审批与证据枚举

- task `status`：`todo` / `in-progress` / `blocked` / `done` / `shipped`。
- `approval.required`：布尔值。`approval.status` 只允许 `not-required` / `pending` / `approved` / `rejected` / `expired`；`required: false` 对应 `not-required`。
- 审批还必须保留 `decided_by`、`decided_at`、`baseline_id`、`approved_scope`、`conditions`、`evidence_ref`。AI 不得自我审批，也不得从上下文推断出人类审批；只有明确的人类决定才能写入审批结果和来源证据。
- `evidence_produced[].kind`：`static` / `test` / `runtime` / `data` / `manual` / `release`。
- evidence 记录包含 `id`、`kind`、`command`、`exit_code`、`git_sha`、`environment`、`observed_at`、`artifact`、`confidence`；`observed_at` 使用 ISO-8601，`git_sha` 使用产生证据时的完整 commit SHA。
- evidence `confidence`：`observed` / `inferred` / `unknown`。只有与当前 baseline / commit 绑定的 fresh `observed` 证据能满足完成门。
- `delivery_state.code` / `data` / `runtime`：`observed` / `inferred` / `unknown` / `not-applicable`。三个维度必须分别持久化，不得用聊天结论相互代替。
- `done` / `shipped` 任务必须具备有效 `acceptance_refs` 和 fresh observed evidence；`inferred` 或 `unknown` 不能满足完成门。

## 按需工件（默认不安装）

以下工件不随 install 生成。触发条件命中时由 agent 在 lane 目录下创建，doctor 不做结构检查：

### `risk-register.md` + `release-plan.md`

- **触发**：进入高风险档位（用户资产、权限 / 身份变更、不可逆状态流转、跨用户数据、并发敏感更新、外部副作用）
- **risk-register**：`| R-<id> | 风险描述 | 影响范围 | 缓解措施 | 状态 |` 表格
- **release-plan**：发布步骤、回滚条件、blockers、manual steps；用户要求 publish / release / deploy 时必须表达当前 release intent，未执行发布必须写成 blocker / manual action / non-goal
- **加载层级**：L2

### `verification-matrix.yaml`

- **触发**：登记稳定失败模式或回归 guard
- **schema**：`impact_rules`（`when` / `run` 场景检查清单）+ `failure_modes`（`id` / `scenario` / `expected` / `guard`）
- **加载层级**：L2

### `specs/`

- **触发**：大型项目需要把 DESIGN 切分为局部契约
- **schema**：`*.spec.md`，锁定接口 / 数据 / 行为契约与验收映射；bug 修复 spec 必须锁定 root cause、reproduction、blast radius、planned files、regression guard
- **加载层级**：L3

### `design-pack/`

- **触发**：reverse-spec / URL 复刻需要对照证据
- **schema**：`parity-map.md` 记录 capture manifest、visual / interaction / API parity；后端行为只代表浏览器可观察行为，`confidence` 必须是 `observed` / `inferred` / `unknown`，只有 `observed` 可进入 confirmed acceptance criteria；证据写入前必须脱敏 cookies / tokens / PII
- **加载层级**：L3

### `evals/`

- **触发**：同一失败模式 root cause 命中 ≥3 次时从 `verification-matrix.yaml` 升格
- **schema**：每个 eval 一个 markdown 文件，记录 scenario、expected、trigger_source、首次出现的 baseline-log ID
- **加载层级**：L3

## 隐式机制审计落点

隐式机制审计不是新默认 artifact，不改变默认安装布局。命中隐式机制或高风险状态流时：

- lane `DESIGN.md` 记录触发入口、生效范围、执行顺序、失败表现、路径清单和最小验证证据；共享层命中时与共享基础设施审计同段维护
- 根层 `.ai-os/memory.md` §2 记录稳定项目事实和技术栈 profile，类型可用 `implicit-mechanism` / `technology-profile` / `high-risk-state-flow`
- 高风险状态流创建 `risk-register.md` + `release-plan.md`，并在 `verification-matrix.yaml` 登记至少一条真实 failure mode guard

## 关键语义约束

- 根层 `.ai-os/MISSION.md` 是**共享宿主上下文**；lane `MISSION.md` 是**当前交付基线**
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
- **L3 — 详细资源**：lane `baseline-log/`、已创建的 `specs/` / `design-pack/` / `evals/`、根 `managed-files.tsv`

## Activation Gate

AI-OS 工件治理只适用于 delivery-affecting work：改代码、改项目文档或工件、实现功能、修 bug、需求变化、验证、发布、恢复交付现场或高风险动作。

普通对话（需求脑暴、先聊聊、代码解释、方案比较、学习提问、临时命令、非仓库交付任务）不进入 lane governance，只遵守真实目标优先、不得脑补事实、不得伪造验证结果。

如果用户意图不清，agent 只问一句："这是先讨论，还是要进入项目交付流程？"用户已明确要求分析、修复、实现、验证或发布当前项目时，直接从 L1 进入恢复与审计，不再反问。确认停点只在用户尚未授权当前阶段、范围 / 验收不清、高风险或可能越界时阻塞。

## 反述确认 / 双向对齐门

进入设计锁定或大规模实现前，agent 必须结构化反述已理解的目标、核心主流程、状态流转与关键异常路径（`AGENTS.md` §1）。需求层反述落在 lane `MISSION.md` §2，设计层反述落在 lane `DESIGN.md` §10；用户确认或校正后才锁定，不确认则回到 `MISSION.md` / `DESIGN.md` 修正，不进入实现。这是行为门，不引入 doctor warning。

## 验证与收口约定

- 验证失败先分类：`product-code` / `local-environment` / `external-service` / `production-state-unknown`；只有 `product-code` 直接进入代码修复
- 收口前对齐最新用户请求与 lane 状态；交付结论拆成代码状态 / 数据状态 / 运行状态
- pull / stash / rebase / branch switch 后检查 `tasks.yaml` 的 duplicate IDs、baseline alignment 与证据丢失；install / 模板 / legacy 生成物必须先分类为 current / legacy / generated / non-goal 才能进入当前范围

## 边界原则

AI-OS kernel（Activation Gate、核心工件、`AGENTS.md`、lane 恢复、`memory.md`、项目原生验证、local doctor、无遥测、无默认外部服务）保持稳定。新增 doctor warning 必须是确定性结构检查；新增 CLI 子命令只有 install / doctor 无法覆盖高频核心操作时才允许；adapter 必须可选、薄封装、可删除；新增工件类别默认禁止。内置 agent runner、重构调度器、模型路由器、自动发版平台、长期后台服务、遥测收集不进入 core。
