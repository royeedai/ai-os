# AI-OS 问题台账

本文件记录 AI-OS 必须持续覆盖的稳定问题，以及它们在当前版本中的真实承接点。

AI-OS 拦截的真实交付失败模式包括：需求模糊就开工、需求变化后基线脱节、设计未锁就实现、前端 UI 来源与组件库实现路径混淆、设计插件能力被误写成硬依赖、修复越界、完成声明缺项目级证据、session 切换丢上下文、隐式跨层契约漂移、弱类型洞擦除契约、单点合格但端到端 journey 未闭环、跨模块同型缺陷未升级、普通对话误触发治理、推断当事实进入交付、后台 agent 回收不可审查、开发者级与项目级记忆混写、长期 AI 项目无证据周期性大重构或漂移信号不回流、Codex 实战反馈中的发布状态漂移 / 验证环境误分类 / task ledger 冲突 / baseline 误读，以及首轮交付本可避免的返工。每条下方有编号与覆盖锚点。

## 当前覆盖

### PL-001 需求一模糊，AI 就直接开工

- **AI-OS 必须保证**：先澄清目标、成功标准和范围边界，再进入设计或实现
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §1 反述确认门）、`.ai-os/lanes/default/MISSION.md`（§2 主流程 / 异常分支反述）、`.ai-os/lanes/default/DESIGN.md`（§10 反述确认门）、`docs/artifacts.md`（反述确认 / 双向对齐门）、`examples/greenfield-guided-product.md`

### PL-002 需求变化后，代码和基线脱节

- **AI-OS 必须保证**：任何需求变化先写 lane `baseline-log/CR-*.md`
- **当前覆盖锚点**：`AGENTS.md`、`docs/artifacts.md`、`.ai-os/lanes/default/baseline-log/`

### PL-003 关键设计没锁就进入实现

- **AI-OS 必须保证**：设计锁定先于大规模实现
- **当前覆盖锚点**：`AGENTS.md`、`.ai-os/lanes/default/DESIGN.md`、`examples/brownfield-change-journey.md`

### PL-004 bug 修复越界，修 A 坏 B

- **AI-OS 必须保证**：先定界，再修复，再验证影响范围
- **当前覆盖锚点**：`AGENTS.md`、`examples/debug-bounded-fix.md`、`.ai-os/lanes/default/tasks.yaml`

### PL-005 完成声明没有项目级证据

- **AI-OS 必须保证**：至少一项项目原生静态校验证据 + 回归结论 + 交付双清单
- **当前覆盖锚点**：`AGENTS.md`、`docs/cli.md`、`.ai-os/lanes/default/verification-matrix.yaml`

### PL-006 session 切换后丢失当前交付上下文

- **AI-OS 必须保证**：从 lane `STATE.md` 恢复当前方位，从 root `MISSION.md` 恢复共享上下文
- **当前覆盖锚点**：`AGENTS.md`、`docs/getting-started.md`、`.ai-os/lanes/default/STATE.md`

### PL-007 默认布局真相分叉

- **AI-OS 必须保证**：install、doctor、README、schema、tests 只表达一套 canonical layout
- **当前覆盖锚点**：`README.md`、`docs/artifacts.md`、`docs/constitution-spec.md`、`bin/create-ai-os.js`、`bin/ai-os-doctor.js`、`test/docs.test.js`

### PL-008 跨工具真理源混乱

- **场景**：项目同时引入 Spec-Kit、AI-OS、Cursor rules、Kiro steering、OpenSpec 等多套工件，每套都自称"真理源"，导致需求 / 设计 / 变更记录在多处独立漂移
- **AI-OS 必须保证**：每个工件类别只承认一个真理源；其他工具的工件以 reference 形式接入，不再独立维护同语义内容
- **当前覆盖锚点**：`docs/interop/spec-kit-coexistence.md`、`docs/interop/claude-code.md`、`docs/interop/cursor.md`、`docs/interop/standards-map.md`、`AGENTS.md`

### PL-009 反复全量加载工件，浪费 session context

- **场景**：agent 在长 session 中没有先读 L1 入口（`STATE.md` / `lane.toml` / `framework.toml`），而是直接全量加载所有 12 工件，导致 token 浪费且行为漂移
- **AI-OS 必须保证**：工件按 L1 / L2 / L3 渐进式加载；除非用户切换阶段，不重复升级层级
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §5）、`docs/artifacts.md`（"加载分层" 章节）、`framework/skills/ai-os-delivery/SKILL.md`、`docs/interop/mcp-resources.md`（resource priority annotations）、`docs/interop/standards-map.md`（just-in-time retrieval mapping）

### PL-010 任务交付给执行 agent / IDE 后，证据没回流到工件

- **场景**：AI-OS 把任务 handoff 给 Cursor agent / Claude Code / 本地 runner 执行，执行端完成代码后没有把测试输出、原生静态校验、影响清单等证据写回 lane 工件，导致仓库内只看到代码而看不到完成证据
- **AI-OS 必须保证**：`tasks.yaml` 在 done / verified / shipped 之前必须有 `acceptance_refs`、`evidence_required`、handoff `context_refs` / `expected_return` 与 `evidence_produced`
- **当前覆盖锚点**：`AGENTS.md`（行为规则 §交付收口）、`docs/cli.md`（W076）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/constitution-spec.md`（v2.2）

### PL-011 agent 把推断 / 未观察的信息当事实进入实现或交付

- **场景**：agent 在没有源码、网络抓包、运行截图、原生校验等证据时，把"应该是这样"的推断、"通常这样"的常识、"AI 默认行为"的偏好直接当作 confirmed 进入 tasks 与 verification
- **AI-OS 必须保证**：`tasks.yaml` `fact_state_review` 必须把每条事实标为 `observed` / `confirmed` / `inferred` / `unknown`；`inferred` 必须留 assumptions，`unknown` 必须进入待确认或非目标，closed 任务不得保留未解决 `inferred` / `unknown`
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §1、绝对禁止 §1）、`docs/cli.md`（W077）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/constitution-spec.md`（v2.2）

### PL-012 AI-OS 第一次开发未拦住本可避免的修改

- **场景**：用户用 AI-OS 完成首轮交付后，又提出一批修改；这些修改的根因其实是 AI-OS 第一次 session 没问的问题、没锁的设计或没让用户确认的范围——本可在第一次就拦掉，却让框架进入了下一轮返工
- **AI-OS 必须保证**：CR `baseline-log/CR-*.md` 提供 `## Preventability review` 段落（`Preventable` / `If yes, root cause` / `Maps to` / `Suggested guard`），lane 关闭前补一条 `BL-*-retrospective*.md` 聚合本 lane 所有 Preventability findings；AI-OS maintainer 通过 dogfooding `git grep` 与 GitHub `framework-feedback` issue 定期归并到本台账，并按 guard 落点优先级（AGENTS.md > 工件模板 > doctor > docs）在下一个 minor 收紧
- **当前覆盖锚点**：`AGENTS.md`（行为规则 §需求变化、§交付收口）、`framework/.agents/templates/lane/baseline-log/BL-template.md`、`docs/artifacts.md`、`docs/constitution-spec.md`（v2.2）、`docs/maintainers.md`（Framework feedback 复盘章节）、`.github/ISSUE_TEMPLATE/preventable-modification.md`

### PL-013 开发者级与项目级记忆混写，污染项目共享层或丢失个人偏好

- **场景**：用户把"我个人的编码 / 沟通偏好"（语言、工具链、风格、激进度）commit 进 `.ai-os/memory.md`，让所有 contributor 背个人习惯；或反过来把"这个项目的稳定决策 / 跨层契约"写进 agent shell 的 home 级 global rules（Cursor user rules、Claude Code 全局 CLAUDE.md、Codex 全局 instructions），导致换电脑或换人后项目真相丢失
- **AI-OS 必须保证**：开发者级记忆（第 4 层，按本机 OS 用户 / home 目录识别）属于各 agent shell 的 global rules，AI-OS 不自造第二真理源、不引入 identity / 登录态 / 云端；项目级记忆（第 2/3 层）留在 `.ai-os/`，冲突时项目工件赢；跨机同步个人偏好走 dotfiles 而非 AI-OS
- **当前覆盖锚点**：`docs/interop/standards-map.md`（developer-global memory Layer 4）、`docs/interop/cursor.md`、`docs/interop/claude-code.md`、`PROJECT_PURPOSE.md`（§3.5）、`AGENTS.md`（绝对禁止 §10、§13）

### PL-014 非交付对话误触发治理

- **场景**：用户只是想先聊需求、解释代码、比较方案、问工具用法、运行临时命令或处理非仓库任务，但 agent 因仓库存在 `.ai-os/` 自动进入 debug / plan / verification，读取 lane 工件甚至写入 `MISSION.md` / `DESIGN.md` / `tasks.yaml`
- **AI-OS 必须保证**：先经过 Activation Gate；只有 delivery-affecting work 才启用 AI-OS artifact governance，普通对话不得读写 lane 工件
- **当前覆盖锚点**：`AGENTS.md`（启用门槛）、`README.md`（How agents use AI-OS）、`framework/skills/ai-os-delivery/SKILL.md`、`docs/artifacts.md`、`docs/constitution-spec.md`、`examples/non-delivery-discussion.md`、`test/docs.test.js`

### PL-015 长时程 / 后台 agent 交付回收不可审查

- **场景**：agent 把任务交给后台、云端、外部 PR agent 或并行 subagent 后，只拿到一句“完成了”或一个 diff；缺 branch / PR / session refs、写入范围、测试证据、人工审查和 unresolved risks 记录，导致无法判断是否可接受
- **AI-OS 必须保证**：长时程 agent work 不进入执行层编排，但必须通过 `agent_run_review` 记录 run refs、write scope、progress checkpoints、return packet、human review status，并由 doctor W078 检查关闭前证据
- **当前覆盖锚点**：`docs/artifacts.md`（Long-Horizon Agent Reliability Loop）、`docs/constitution-spec.md`（v2.2）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/interop/standards-map.md`、`examples/background-agent-handoff.md`、`bin/ai-os-doctor.js`（W078）、`test/doctor.test.js`、`test/docs.test.js`

### PL-016 隐式跨层契约未显式登记，各 session 各自脑补

- **场景**：全栈项目存在 HTTP↔业务码语义映射、Long/UUID/枚举的 wire 格式、名单型常量反向真理源、敏感字段加解密/打码 service 语义档位、查询引擎方言等"看不见的跨层假设"，全靠口头约定维持，AI 在不同 session、不同模块各自脑补一份合理但不一致的实现
- **AI-OS 必须保证**：跨层任务前必须先核对 `.ai-os/memory.md` 跨层契约登记表；本轮引入新的跨层隐式契约必须同步登记，未登记不得进入任务拆解；验证阶段把"实现与登记表一致"作为通过条件。framework 只规定"必须显式登记"，不硬编码项目特定决策
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §2、行为规则 §关键设计未锁 / §验证阶段）、`framework/.agents/templates/shared-root/memory.md`（§2 架构护栏 / §6 跨层契约登记表）、`framework/.agents/templates/lane/DESIGN.md`、`evals/implicit-cross-layer-contract-undocumented.md`

### PL-017 弱类型洞擦除契约

- **场景**：契约承载在字符串 / Map / 自由对象 / 弱类型字段 / 库隐式默认值上（`@RequestBody Map`、裸字符串动词、前端自由 reactive 字段、笼统 `catch (Exception)` + 业务码包装、承载 19 位 ID 的默认 max 控件等），导致字段名降级、静默丢弃、精度夹断、错误吞没
- **AI-OS 必须保证**：验证阶段把通用弱类型反模式扫描作为实现质量门硬检查项，命中即视为未通过；项目特定的具体类型 / 控件 / 异常基类选择留给项目 `.ai-os/memory.md`，框架只锁定通用反模式禁令
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §4、行为规则 §验证阶段）、`framework/.agents/templates/lane/verification-matrix.yaml`、`framework/.agents/templates/shared-root/memory.md`（§2 架构护栏 / 编码契约登记表 / §5 技术债追踪）、`evals/weak-type-hole-erodes-contract.md`

### PL-018 单点接口合格不等于端到端 journey 闭环

- **场景**：跨栈 user journey 被拆成前端 / 后端两个任务各自只验半边；接口存在却无调用方、响应体字段不匹配、method / 参数 / 响应三重不一致、列容量不足，导致整条 journey 走不通
- **AI-OS 必须保证**：关键设计阶段在 `DESIGN.md` 锁定核心交互与状态流转的端到端链路（途经接口 / 关键消费点 / 字段映射）；跨栈链路必须由独立任务承担端到端验证，归整条链路 owner；验证阶段以真实跑通端到端路径作为通过条件，不能用单点接口合格代替
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §2、行为规则 §任务拆解 / §验证阶段）、`framework/.agents/templates/lane/DESIGN.md`、`framework/.agents/templates/lane/verification-matrix.yaml`、`evals/e2e-journey-broken-by-single-point-pass.md`

### PL-019 跨模块同型缺陷只修单点，不升级全仓扫描

- **场景**：debug 发现的 bug 根因是跨模块都成立的模式问题（实体继承但表无列、Long ID 精度丢失、笼统 catch、横切 bean 重复声明等），却按"单点修"推进，全仓审计搜索范围被采样性收缩，同型缺陷散落各模块未被一次扫清
- **AI-OS 必须保证**：修复 bug 的模式分析必须包含跨模块同型缺陷扫描，搜索范围覆盖所有模块、不得采样收缩；命中同型缺陷必须按"稳定失败模式"升格规则升级治理档位并产出全仓扫描结论
- **当前覆盖锚点**：`AGENTS.md`（行为规则 §修复 bug、五条核心要求 §3、行为规则·稳定失败模式）、`framework/.agents/templates/lane/verification-matrix.yaml`、`framework/.agents/templates/lane/baseline-log/BL-template.md`、`evals/cross-module-same-defect-not-escalated.md`

### PL-020 前端 UI 来源与组件库实现路径混淆

- **场景**：有设计稿时误以为不能用组件库，导致手搓 UI、维护成本高；无设计稿时又误以为不需要任何设计确认，跳过组件库选择、字段、权限、状态和异常路径；老项目里还可能因 AI 偏好混入第二套组件库
- **AI-OS 必须保证**：前端 UI 先判定 `ui_source`（design-led / component-first / existing-style / hybrid），设计稿只定义目标效果，组件库仍是优先实现路径；无设计稿的后台、PC 业务系统和移动业务页默认走组件库基线；新增组件库前必须先检查现有依赖
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §2）、`README.md`（Design-aware component-first UI）、`docs/artifacts.md`、`docs/constitution-spec.md`（v2.4）、`framework/skills/ai-os-delivery/SKILL.md`、`framework/.agents/templates/lane/DESIGN.md`、`framework/.agents/templates/lane/verification-matrix.yaml`、`test/docs.test.js`

### PL-021 Product Design 能力被误写成单一 IDE 硬依赖

- **场景**：Codex 中可用 Product Design 后，agent 把 brief、ideation、prototype、image-to-code、design QA、share 写成 AI-OS 必备流程，导致 Cursor、Claude Code、普通 IDE 或无插件环境无法按同一规则交付；反过来也可能因担心兼容性而完全不用 Product Design 的设计证据
- **AI-OS 必须保证**：Product Design 只是可选 `design_input.provider`；其产物通过 `evidence_refs` / `evidence_produced` 回流。无插件场景必须有 Figma、截图、URL reverse-spec、existing-code、manual brief、component-first 或 existing-style fallback，且 Product Design evidence 不替代项目原生验证
- **当前覆盖锚点**：`docs/interop/product-design.md`、`docs/artifacts.md`、`docs/constitution-spec.md`（v2.4）、`framework/skills/ai-os-delivery/SKILL.md`、`framework/.agents/templates/lane/DESIGN.md`、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`test/docs.test.js`

### PL-022 其他项目用 AI-OS 时 doctor 走远程冷拉，工作时反复外部请求拖慢

- **场景**：装了 AI-OS 的用户项目把 doctor 当作收口证据 / IDE hook / CI guard 反复调用，但项目内没有本地 doctor 入口，只能用 npx 远程（github:royeedai/ai-os doctor）解析 HEAD + 下载整仓 + 临时 npm install，秒级冷启动 × 高频 = 拖慢日常开发；首次安装之外的任何工作都不应再产生外部请求
- **AI-OS 必须保证**：install 把 doctor 入口（doctor 脚本 + 共享模块 + 版本文件）vendored 到目标项目 .ai-os/bin/ 并入 git，日常 / hook / CI 一律走本地 node .ai-os/bin/ai-os-doctor.js 零网络；团队 clone 缺 gitignored 元数据时本地 doctor 以 committed 版本文件降级、不报 E001；install / skills 命令 pin 到 release tag，减少 ls-remote 且可复现；首次 install 是唯一允许的一次性联网
- **当前覆盖锚点**：`bin/shared.js`（installLocalDoctor + 双模式版本解析）、`bin/create-ai-os.js`、`bin/ai-os-doctor.js`（embedded E001 降级）、`README.md`、`docs/cli.md`、`docs/getting-started.md`、`test/install.test.js`、`test/doctor.test.js`、`test/shared.test.js`

### PL-023 前台执行代理被确认停点误拦，或把 hook 强制性错误泛化到 Codex

- **场景**：用户已经明确要求“全面分析并修复”“修这个 bug”“验证并发布”，但 agent 仍按模板固定停等“go”，导致 Codex 这类前台执行代理无法一次性交付；或文档把 Claude Code pre-tool hook 的强制能力说成 Codex / shell agent 的同等宿主能力，误导用户以为所有表面都有 100% 阻断式 hook。
- **AI-OS 必须保证**：Activation Gate 把明确的分析 / 修复 / 实现 / 验证 / 发布请求视为 delivery-affecting work，直接进入 L1；确认停点只阻塞未授权、模糊、高风险或越界工作。doctor 是同一条本地 guard 命令，但 Codex 中通常作为本地 / pre-commit / CI 证据门，不描述成宿主 pre-tool hook。
- **当前覆盖锚点**：`AGENTS.md` Activation Gate 与确认停点、`framework/skills/ai-os-delivery/SKILL.md` 行为路由、`docs/constitution-spec.md` v2.4、README deterministic doctor 段、`docs/interop/claude-code.md` portable guard command、`test/docs.test.js`

### PL-024 长期 AI 项目靠定期大重构防漂移，或漂移信号未证据化回流

- **场景**：纯 AI / AI-assisted 项目经历多轮交付后，团队用“每隔一段时间大重构一次”作为默认维护方式；或者重复返工、同型缺陷、架构护栏未回流、验证矩阵过时、技术债无处置等漂移信号只留在聊天 / 总结里，没有进入 CR、任务证据、memory、verification guard 或 eval。
- **AI-OS 必须保证**：长期维护按 drift evidence 触发。只有 observed drift signals 明确时才开启维护 CR 或 scoped refactor task；任务用 `maintenance_review` 记录 `drift_signals`、`refactor_trigger`、`contract_impact`、`native_checks`、`debt_disposition`；稳定发现必须回流 `.ai-os/memory.md`、`verification-matrix.yaml` 或 `evals/`。
- **当前覆盖锚点**：`AGENTS.md`（行为规则 §长期维护）、`README.md`（Long-lived AI project maintenance）、`docs/artifacts.md`（Long-lived AI Project Maintenance Loop）、`docs/constitution-spec.md` v2.6、`framework/skills/ai-os-delivery/SKILL.md`、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`framework/.agents/templates/lane/baseline-log/BL-template.md`、`examples/long-lived-maintenance-loop.md`、`evals/periodic-refactor-without-drift-evidence.md`、`evals/drift-signal-not-fed-back.md`、`test/docs.test.js`

### PL-025 Codex 实战反馈未回流，导致发布真相、验证环境、任务账本和 baseline 继续漂移

- **场景**：本机多个 Codex 项目使用 AI-OS 后反复出现同型问题：用户已要求发布但 lane 工件仍写本地 / 未请求（release truth drift）；本地 `.env`、DNS / proxy、SDK 网络、真实设备、签名、远端服务等验证环境问题被混成产品代码问题（verification environment misclassification）；pull / stash / rebase 后 `tasks.yaml` 冲突或复用旧 task ID；install / legacy baseline 生成物被当成当前交付范围。
- **AI-OS 必须保证**：实战反馈先进入证据包和问题台账，再用现有 12 工件表达：closeout 前做 release truthfulness review；验证失败先分类为 `product-code` / `local-environment` / `external-service` / `production-state-unknown`；分支 / stash / rebase 后检查 task ledger；生成或遗留 baseline artifact 必须被解释为 current / legacy / generated / non-goal / pending cleanup。默认不新增 CLI、runtime、artifact category 或 doctor warning；只有确定性结构检查才可走 Boundary Evolution Policy。
- **当前覆盖锚点**：`docs/codex-aios-field-feedback.md`、`.ai-os/lanes/default/baseline-log/CR-20260619-225610-codex-aios-field-feedback.md`、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`framework/skills/ai-os-delivery/SKILL.md`、`evals/release-truth-drift.md`、`evals/verification-environment-misclassified.md`、`evals/task-ledger-conflict-drift.md`、`evals/install-baseline-artifact-misread.md`、`test/docs.test.js`

### PG-001 新问题没有独立登记，重构后覆盖漂移

- **AI-OS 必须保证**：问题先进入台账，再进入实现与测试
- **当前覆盖锚点**：`docs/problem-ledger.md`、`docs/maintainers.md`、`docs/change-evaluation-template.md`

## 历史归档

v7 / v8 的旧体系（workflow / skill / policy、root-only 布局、旧 lane CLI、`CONVENTIONS.md` / `project.md` / `acceptance.yaml`）及其迁移已随 v10 移除 `upgrade` 退出当前覆盖，完整历史见 `CHANGELOG-archive.md`。v7 台账的 PL-033 ~ PL-036 已在 v9.7.2 以新语义登记为 PL-016 ~ PL-019，编号不复用、不冲突。
