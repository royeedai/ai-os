# 12 组工件 Schema

v9 起，AI-OS 只有一套 canonical layout：**共享根层 + `.ai-os/lanes/default/` 默认交付线**。

## 目录布局

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
        specs/
        tasks.yaml
        risk-register.md
        release-plan.md
        verification-matrix.yaml
        design-pack/
          parity-map.md
        evals/
```

## 根层共享工件

### 1. `AGENTS.md`

- **位置**：项目根
- **职责**：交付宪法
- **必需**：required
- **加载层级**：L2

### 2. `.ai-os/MISSION.md`

- **职责**：共享宿主项目上下文、长期边界、跨 lane 约束
- **禁止**：把当前这轮交付基线、阶段状态、待确认项写进这里
- **加载层级**：L2

### 3. `.ai-os/memory.md`

- **职责**：共享稳定决策、长期约定、跨层契约、坑点、技术债
- **架构护栏**：§2 工程约束即「架构护栏 / 编码契约登记表」（统一返回包装、必须复用抽象、禁止反模式、依赖策略），对应外部常说的「架构规范字典 / style guide」，但不另建 `.ai-os-rules` 等第二真理源文件；验证阶段逐条对照
- **版本控制**：入版本控制，使用 union merge
- **加载层级**：L2

### 4. `.ai-os/framework.toml`

- **职责**：记录 schema 版本、layout 版本、layout 模式、framework 版本
- **加载层级**：L1

### 5. `.ai-os/managed-files.tsv`

- **职责**：记录 AI-OS 受管文件路径
- **加载层级**：L3

> 受管工具入口（不计入 12 组工件）：`.ai-os/bin/`（`ai-os-doctor.js` + `shared.js` + `VERSION`）。install 把 doctor vendored 到此，让日常 / hook / CI 用 `node .ai-os/bin/ai-os-doctor.js .` 本地零外部请求。**入版本控制**（与 gitignored 的 `framework.toml` 不同），团队 clone 与 CI 无需重新 install 即可离线运行 doctor；由 install 始终覆盖以与框架版本同步。

### 6. `.ai-os/lanes/`

- **职责**：承载默认和额外 lane
- **默认**：始终至少有 `lanes/default/`
- **加载层级**：L1（目录入口）

## 默认 Lane 工件

### 7. `.ai-os/lanes/default/lane.toml`

- **职责**：lane 元数据
- **关键字段**：`id` `title` `status` `baseline_id` `quality_tier` `risk_tier`
- **加载层级**：L1

### 8. `.ai-os/lanes/default/MISSION.md`

- **职责**：当前交付目标、成功标准、范围、基线 ID
- **说明**：这是当前 lane 的唯一交付基线真理源
- **加载层级**：L2

### 9. `.ai-os/lanes/default/DESIGN.md`

- **职责**：关键设计、共享基础设施审计、验收标准、对照参考
- **契约先行**：§4 核心接口与数据模型即契约层（数据模型 / 接口 / 状态机），确认状态 pending 不得进入大规模实现
- **反述确认门**：§10 是设计锁定前的反述确认门，agent 先反述对关键设计的理解，用户确认或校正后才锁定
- **加载层级**：L2

### 10. `.ai-os/lanes/default/STATE.md`

- **职责**：当前方位、待确认项、下一步
- **版本控制**：不入版本控制
- **加载层级**：L1（session 恢复入口）

### 11. `.ai-os/lanes/default/baseline-log/` + `specs/` + `tasks.yaml`

- **`baseline-log/`**：变更请求与基线升格记录（**L3**）；`CR-*` 记录必须说明 Current behavior、Proposed delta、Affected artifacts、Acceptance delta、Close/archive condition；v9.7+ 起 CR 关闭前补 `## Preventability review`（`Preventable` / `If yes, root cause` / `Maps to` / `Suggested guard`），lane 关闭前补 `BL-*-retrospective*.md` 聚合
- **`specs/`**：大型项目切分 DESIGN 的局部契约（**L3**）；默认包含 generic example 和 bugfix spec route
- **`tasks.yaml`**：任务、owner、依赖、approval、agent handoff、证据要求与证据产出（**L2**）

### 12. `.ai-os/lanes/default/risk-register.md` + `release-plan.md` + `verification-matrix.yaml` + `design-pack/parity-map.md` + `evals/`

- **risk-register / release-plan**：high-risk 风险与发布计划（**L2**）
- **verification-matrix**：回归 guard 和 failure mode（**L2**）
- **design-pack/parity-map**：reverse-spec 对照；URL intake 时记录截图、DOM/CSS、交互、API 和后端行为 parity（**L3**）
- **evals/**：项目级失败模式样例（**L3**）

## 关键语义约束

- 根层 `.ai-os/MISSION.md` 是**共享宿主上下文**
- lane `MISSION.md` 是**当前交付基线**
- `STATE.md` 只允许存在于 lane 内
- `memory.md` 只保留根层一份
- `baseline-log/`、`specs/`、`tasks.yaml`、`risk-register.md`、`release-plan.md`、`verification-matrix.yaml`、`design-pack/`、`evals/` 默认都属于当前 lane

## 命名规范

- `CR-YYYYMMDD-HHMMSS-<slug>.md`
- `BL-YYYYMMDD-HHMMSS-<slug>.md`

禁止使用全局递增编号如 `BL-001`。

## 加载分层（progressive disclosure）

工件按 L1 → L2 → L3 渐进式加载，让 agent 在长 session 下减少重复全量读盘。Agent 应先通过 Activation Gate，确认这是 delivery-affecting work 后才加载 lane 工件；普通对话不读取或写入 `.ai-os/lanes/*`。Agent 应只在用户切换阶段时才升级层级。

### L1 — 入口元数据

会话恢复或第一次进入仓库时优先读：

- `.ai-os/lanes/default/STATE.md`：当前方位
- `.ai-os/lanes/default/lane.toml`：lane 元数据与 `baseline_id`
- `.ai-os/framework.toml`：layout 与 schema 版本
- `.ai-os/lanes/`：lane 列表

### L2 — 核心文档

进入对齐 / 设计 / 验证阶段时升级：

- 根 `AGENTS.md` / `MISSION.md` / `memory.md`
- lane `MISSION.md` / `DESIGN.md` / `tasks.yaml`
- lane `verification-matrix.yaml` / `risk-register.md` / `release-plan.md`

### L3 — 详细资源

仅在引用对应 ID / 路径时按需读：

- lane `baseline-log/CR-*.md` / `BL-*.md`
- lane `specs/*.spec.md`
- lane `design-pack/parity-map.md`（reverse-spec / URL intake 对照）
- lane `evals/*.md`
- 根 `managed-files.tsv`

## Activation Gate（v9.5.1）

AI-OS 工件治理只适用于 delivery-affecting work：改代码、改项目文档或工件、实现功能、修 bug、需求变化、验证、发布、恢复交付现场、URL reverse-spec intake 或高风险动作。

普通对话不进入 lane governance，包括需求脑暴、先聊聊、代码解释、方案比较、学习提问、临时命令查询、非仓库交付任务，或用户明确说不要进入 AI-OS / 不要改项目。普通对话只遵守真实目标优先、不得脑补事实、不得伪造验证结果；不写 `MISSION.md` / `DESIGN.md` / `tasks.yaml`，也不进入 debug / plan / verification 流程。

如果用户意图不清，agent 只问一句：“这是先讨论，还是要进入项目交付流程？”确认前不加载 L1 / L2 / L3 lane 工件。用户已明确要求分析、修复、实现、验证或发布当前项目时，这已经是 delivery-affecting work，agent 直接从 L1 进入恢复与审计，不再反问。

确认停点只在用户尚未授权当前阶段、范围 / 验收对象不清、高风险或可能越界时阻塞。用户已经明确要求修复、实现、验证或发布且范围可从用户原话和仓库事实界定时，前序授权可以作为继续依据；agent 仍必须记录 root cause / scope / planned files / evidence。

## Design-Aware Component-First UI（v9.9）

前端交付先判定 UI source，再决定实现手段。设计稿和组件库不是二选一：

- 有设计稿：设计稿是目标效果；优先用项目现有组件库或已选组件库实现标准元素，组件无法满足时再封装或定制。
- 无设计稿：组件库默认风格作为 UI 基线；后台、PC 业务系统、App / H5 / 小程序业务页默认不要求独立视觉稿。
- 老项目已有风格：沿用现有组件、布局和主题；不得因 AI 偏好引入第二套组件库。
- 混合场景：核心页面可按设计稿，普通业务页走组件库。

`DESIGN.md` 对 UI 项目可记录：

```yaml
ui_source: design-led | component-first | existing-style | hybrid
surface: admin-pc | business-pc | business-mobile | consumer
frontend_stack: vue | react | uni-app | taro | mini-program | unknown
component_library: existing | element-plus | antd | vant | antd-mobile | tdesign | arco | uview | nutui | uni-ui | custom
selection_reason: existing dependency | user specified | stack default | ecosystem fit
fidelity_level: strict | practical | component-native
custom_required: []
design_input:
  provider: product-design | figma | url | screenshot | existing-code | manual-brief | none
  capability_used: brief | ideation | prototype | image-to-code | design-qa | share | manual
  evidence_refs: []
  fallback_path: figma | screenshot | url-reverse-spec | component-first | existing-style
```

默认选择顺序：已有组件库 > 用户指定 > 项目生态匹配 > 国内团队熟悉度。常用默认：Vue PC → Element Plus；React PC → Ant Design；Vue H5 → Vant；React H5 → Ant Design Mobile；uni-app → uView / uni-ui；Taro / 微信生态 → NutUI / TDesign；跨 Vue / React / 小程序统一风格 → TDesign；现代企业中后台 → Arco Design。C 端首页、活动页、品牌页、强视觉页面即使无设计稿，也必须先确认视觉风险或风格基线。

### Product Design optional design-evidence bridge（v10.2）

Product Design 是可选设计证据提供方，不是 AI-OS 硬依赖。有 Product Design 时，`get-context` / `ideate` / `prototype` / `image-to-code` / `design-qa` / `share` 的产物进入 `design_input.evidence_refs` 或 task `evidence_produced`；无 Product Design 时，同一字段接受 Figma、截图、URL reverse-spec、existing-code、manual brief、component-first 或 existing-style fallback。

Product Design brief 只锁目标，不自动等于视觉目标；没有 URL、截图、Figma frame、mockup 或用户选定 visual option 时，不得直接进入大规模 UI 实现。Product Design QA 截图、prototype link 或 share URL 只是设计 / 视觉证据，不能替代项目原生 build、lint、typecheck、test 或 `doctor --strict`。

## URL Reverse-Spec Intake（v9.2）

当用户提供可访问网站 URL 并要求复刻需求、截图、接口或行为时，AI-OS 不新增 CLI 或运行时抓取器，而是要求 agent 把采集证据写入现有 lane 工件：

- `design-pack/parity-map.md`：capture manifest、visual parity、interaction parity、API / interface parity、backend behavior parity
- `specs/*.spec.md`：API observation records、backend behavior records、confidence、unknowns、验收映射
- `verification-matrix.yaml`：视觉、交互、接口、后端行为信心等级和异常路径 guard

后端行为只代表浏览器可观察行为。`confidence` 必须是 `observed` / `inferred` / `unknown`；只有 `observed` 可进入 confirmed acceptance criteria。

### Evidence package adaptation（v9.3）

URL reverse-spec 可接受 `trace.zip`、network log / HAR、screenshots、DOM snapshots、rawHtml、markdown、structured JSON 等证据包。所有证据写入工件前必须脱敏 cookies、tokens、auth headers、PII 和私密用户数据，并映射到 `observed` / `inferred` / `unknown`。

### Bugfix spec route（v9.3）

Bug 修复可使用 `specs/bugfix.spec.md` 模板，必须锁定 root cause、reproduction、blast radius、planned files、regression guard，并在交付时拆分 code / data / runtime 状态。

如果用户已经明确要求“修复”且问题范围清楚，agent 在给出 root cause、复现、影响范围和计划文件后可继续执行本轮修复；若范围不清、涉及高风险动作、跨共享边界或会扩大到未授权模块，必须停等“可执行”确认。

## Agent Handoff + Evidence Loop（v9.4）

AI-OS 运行在 Cursor、Claude Code、Codex、Copilot 等 IDE / agent 环境内部；它不接管执行，而是让执行结果可审计。任务交接进入 `tasks.yaml`：

- `handoff_to`：接收任务的 AI agent、IDE surface 或 human reviewer
- `context_refs`：执行任务必须读取的 lane 工件路径
- `expected_return`：期望返回的 diff、PR、测试日志、review note 或运行证据
- `evidence_required`：任务关闭前必须证明的内容
- `evidence_produced`：任务关闭时实际产出的证据
- `deviation_log`：实现偏离、范围变化、阻塞或需升级为 CR 的记录

`doctor --strict` 可用 W076 捕捉缺失 `acceptance_refs` / `evidence_required`、交接缺上下文 / 期望返回、以及 done / verified / shipped 任务没有 produced evidence 的情况。

## Long-Horizon Agent Reliability Loop（v9.6）

AI-OS 不执行后台任务、不创建 agent runner、不接管 PR 或分支。它只要求长时程、后台、外部 PR agent 或并行 agent 工作在 `tasks.yaml` 中留下可审查的 `agent_run_review`：

- `execution_surface`：`local_foreground` / `cloud_background` / `external_pr_agent` / `human`
- `run_refs`：branch、PR、issue、外部 task URL、agent session ID 等可追回入口
- `write_scope`：owned files / modules 与明确 out-of-scope 区域，便于发现并行 agent 重叠修改
- `progress_checkpoints`：plan accepted、diff produced、tests run、blocker surfaced、review requested
- `return_packet`：summary、changed files、tests、unresolved risks、follow-up needed
- `human_review_status`：`pending` / `reviewed` / `rejected` / `accepted`

`agent_run_review` 默认可选；只有 task 明确使用 delegated / background / cloud / external / parallel execution 时才需要。既有 `handoff_to`、`context_refs`、`expected_return`、`evidence_required`、`evidence_produced` 和 `deviation_log` 继续有效；`agent_run_review` 只是补充长时程执行回收证据。

`doctor --strict` 可用 W078 捕捉长时程 task 缺 `run_refs` / `write_scope` / `expected_return`、关闭前缺 `return_packet` / `evidence_produced` / human review，或带 unresolved risks 仍标记 done / verified / shipped 的情况。local foreground 或纯 human task 不触发 W078。

## Hallucination Guard（v9.5）

AI-OS 对抗 AI 开发幻觉的方式不是追加第二套提示词，而是把事实来源写进现有任务和验证工件。`tasks.yaml` 可用 `fact_state_review` 区分：

- `observed`：agent 真实读到、运行到或检查到的代码 / 日志 / 测试 / 页面 / 接口证据
- `confirmed`：用户、当前 lane 工件或已确认设计明确给出的事实
- `inferred`：agent 推断；必须标为假设，不得冒充 confirmed
- `unknown`：未知；必须进入待确认项、非目标或后续 CR

`doctor --strict` 可用 W077 捕捉执行 / 完成任务缺 `fact_state_review`，以及 done / verified / shipped 任务仍保留未解决 `inferred` / `unknown` 的情况。

## Framework Feedback Loop（v9.7）

AI-OS 自身的迭代输入来自"用户在 AI 第一次开发后提出的修改中，哪些本可在第一次 session 就拦掉"。这条反馈链不引入任何 telemetry，全靠本地工件 + git：

- `baseline-log/CR-*.md` 在 lifecycle 末尾追加 `## Preventability review`：
  - `Preventable`：`yes` / `no` / `partial`
  - `If yes, root cause`：AI-OS 第一次 session 没问 / 没锁 / 没确认的事
  - `Maps to`：已有 `PL-*` / `PG-*` 编号，或 `unmapped`
  - `Suggested guard`：建议在框架内落点（AGENTS / 工件 / doctor / docs）
- lane `status` 切到 `closed` 前补一条 `BL-YYYYMMDD-HHMMSS-retrospective*.md`，聚合本 lane 全部 Preventability findings、`unmapped` 高频根因与建议的 framework changes。

数据归集流程见 `docs/maintainers.md` 的 "Framework feedback 复盘" 章节（`git grep` + 可选 `framework-feedback` issue）；用户主动反馈通道为 `.github/ISSUE_TEMPLATE/preventable-modification.md`。v9.8+ 起不再用 doctor 软检查提示 Preventability review — 由模板 schema 与 maintainer 复盘承载。

## Long-lived AI Project Maintenance Loop（v10.4）

长期纯 AI / AI-assisted 项目不靠固定周期大重构维持质量。AI-OS 的默认控制方式是每轮交付收口做 drift evidence review，只有证据明确时才进入维护 CR 或 scoped refactor task：

- `drift_signals`：重复返工、同型缺陷、架构护栏未回流、验证矩阵过时、技术债无处置、共享契约漂移等 observed evidence
- `refactor_trigger`：为什么现在需要维护 / 重构；必须是证据触发，不得是 calendar-based 或 "AI 写了一段时间所以重构"
- `contract_impact`：对 `.ai-os/memory.md` 架构护栏、跨层契约、API / data / UI 状态、依赖策略的影响
- `native_checks`：本项目原生 build / lint / typecheck / test / smoke / doctor 等证据
- `debt_disposition`：resolved、写入 `.ai-os/memory.md`、加入 `verification-matrix.yaml` guard、升格 `evals/`、或作为技术债保留

这些字段进入 `tasks.yaml` 的可选 `maintenance_review`。它不是 doctor 新警告，也不是第 13 类工件；普通功能任务可以删除该块。`verification-matrix.yaml` 用 `long-lived-maintenance-review` impact rule 覆盖维护任务，baseline-log `## Preventability review` 用 `Maintenance disposition` 决定是否需要维护 CR / 小步重构 / memory / guard / eval 回流。

外部工具只作为可移植实践来源：Spec-Kit / Kiro / OpenSpec 的持久 spec、Copilot cloud agent 的 branch / PR / log 可审查、Cursor / Claude / Kiro 的精简规则与按需加载、OpenAI agent improvement loop 的 feedback / eval 思路，都映射到现有 AI-OS 工件；AI-OS 不新增 IDE adapter、runtime runner、重构调度器或遥测。

## Boundary Evolution Policy（v10.5）

AI-OS 的边界不是永久冻结，也不是开放式扩张。任何新能力先按四层分类：

- **Kernel**：Activation Gate、12 组工件、`AGENTS.md`、lane 恢复、`memory.md`、项目原生验证、local doctor、无遥测、无默认外部服务。Kernel 默认稳定，改动按 minor / major 走完整 CR、docs、tests。
- **Controlled Extension**：doctor warning、CLI 子命令、schema 字段、release check 等。准入条件是：有真实 failure mode 或高频维护需求；现有 install / doctor / 12 工件不能充分表达；有 CR、验收、项目原生验证、docs tests，必要时有 `verification-matrix.yaml` guard 或 `evals/`。
- **Adapter**：hooks、CI、MCP resources、IDE 指引、cloud-agent 映射、skills wrapper。必须可选、薄封装、可删除，不得成为 AI-OS 核心运行时或唯一生效路径。
- **Forbidden**：内置 agent runner、重构调度器、模型路由器、自动发版平台、长期后台服务、遥测收集、IDE 专属硬依赖。这些不进入 AI-OS core。

具体准入规则：

- **新增 doctor warning**：必须是确定性结构检查，不能依赖 LLM 判断语义；需要 PL / CR 证据、测试和 `--strict` 语义说明。
- **新增 CLI 子命令**：只有 install / doctor 无法覆盖高频核心操作时才允许；不得引入长期服务或外部依赖。
- **新增 adapter**：只能作为文档、模板、skill 或薄脚本；核心治理必须仍可在无该工具时完成。
- **新增工件类别**：默认禁止；只有现有 12 类无法表达多个真实案例，且迁移 / 兼容成本被 CR 明确评估后才可讨论。

因此，release notes 里的“本轮不新增 CLI / runtime / doctor warning / 工件类别”是默认边界，不是永久冻结承诺。

## 反述确认 / 双向对齐门（v10.1）

frontier 模型会更快、更大规模地放大模糊目标，所以 AI-OS 在「目标确认优先」之上补一个显式的反述动作，而不是新增 runtime 或第二套提示词：

- 进入设计锁定或大规模实现前，agent 必须用结构化方式反述已理解的目标、核心主流程、状态流转与关键异常路径（`AGENTS.md` §1）
- 需求层反述落在 lane `MISSION.md` §2（核心主流程 / 关键异常 / 边界分支字段），设计层反述落在 lane `DESIGN.md` §10（反述确认门）
- 用户确认或校正后才锁定；用户不确认则回到 `MISSION.md` / `DESIGN.md` 修正，不进入实现
- 这是行为门，**不引入 doctor warning code**——确定性结构检查无法判断「反述是否真实对齐用户意图」，由 `AGENTS.md` 行为规则、模板 schema 与 example 承载，与模型自带的 self-verification 互补

### 加载顺序约定

1. 任意会话开始：先读 `AGENTS.md` 并执行 Activation Gate
2. 只有 delivery-affecting work 才读 L1 全部 → 决定是否需要 L2；明确“分析并修复 / 实现 / 验证 / 发布”请求直接算 delivery-affecting
3. 用户进入"对齐 / 设计 / 验证 / 修 bug"等阶段：升级到 L2
4. 用户引用具体 baseline ID / spec 路径 / failure mode：仅按需读对应 L3
5. 长 session 持续推进时不重复升级；只有阶段切换才重新评估
