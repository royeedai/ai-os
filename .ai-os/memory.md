# AI-OS 共享记忆

## active

### 1. 设计决策

#### DD-001: v9 采用 shared-root + default lane 作为唯一 canonical layout

- **决策**：根层只承载共享宿主上下文和共享记忆，当前交付工件全部进入 `.ai-os/lanes/default/`
- **原因**：修复 v8 中 README / schema / CLI / 测试对默认布局表达不一致的问题
- **影响范围**：AGENTS、templates、install、doctor、upgrade、docs、examples、tests
- **确认来源**：2026-04-22 用户确认执行 v9 计划
- **日期**：2026-04-22

#### DD-002: v9.3 以后可靠性增强优先进入 doctor 与 lane 工件契约

- **决策**：保持 `AGENTS.md` 极简；外部 spec-driven、MCP、browser evidence、eval taxonomy 的可靠实践优先沉淀为 lane 模板字段、docs、eval frontmatter 和 `doctor --strict` semantic warnings
- **原因**：AI-OS 的长期定位是跨 agent 交付宪法，不是运行时编排器；机械检查比扩展提示词更能防止跨工件漂移
- **影响范围**：doctor、baseline-log、specs、verification-matrix、reverse-spec intake、MCP resources、evals、tests
- **确认来源**：2026-05-02 用户确认执行外部学习融合路线图
- **日期**：2026-05-02

#### DD-003: Agent handoff 属于任务证据契约，不属于执行层

- **决策**：AI-OS 吸收 Traycer / Task Master / Agent OS / BMAD / PRP 等产品的方法时，只把 agent handoff、context packet、expected return、produced evidence 和 deviation log 落入 `tasks.yaml` / `verification-matrix.yaml` / doctor，不新增 IDE、runner、kanban、MCP task server 或 orchestration runtime
- **原因**：AI-OS 的使用位置是在 Cursor / Claude Code / Codex / Copilot 等执行环境内部；其价值是让这些执行环境交付可追踪、可恢复、可审计，而不是替代它们
- **影响范围**：tasks schema、doctor W076、docs、skill wrapper、tests
- **确认来源**：2026-05-02 用户确认 Agent Handoff + Evidence Loop 融合方向
- **日期**：2026-05-02

#### DD-004: AI 开发幻觉治理进入任务事实状态，而不是第二套提示词

- **决策**：AI-OS 用 `tasks.yaml` 的 `fact_state_review` 区分 `observed` / `confirmed` / `inferred` / `unknown`，并用 doctor W077 检查执行 / 关闭任务缺事实状态或保留未解决推断 / 未知
- **原因**：幻觉的工程根因是把猜测包装成事实；把事实状态落入工件和机械检查，比复制热门 prompt 规则更可审计、更跨 agent
- **影响范围**：AGENTS、tasks schema、verification-matrix、doctor W077、docs、skill wrapper、tests
- **确认来源**：2026-05-07 用户授权 AI-OS maintainer agent 自主决定并完成 Hallucination Guard
- **日期**：2026-05-07

#### DD-005: AI-OS 只在 delivery-affecting work 启用工件治理

- **决策**：AI-OS 增加 Activation Gate；只有改代码、改项目工件、实现、修 bug、需求变化、验证、发布、恢复交付现场或高风险动作才进入 lane 工件治理；普通对话、需求脑暴、代码解释、方案比较、学习提问、临时命令和非仓库交付任务不读写 lane 工件
- **原因**：真实项目中经常需要先聊需求或处理非交付任务；把所有项目内对话都自动识别成 debug / plan / verify 会造成过度治理和上下文浪费
- **影响范围**：AGENTS、README、docs/artifacts、docs/constitution-spec、official skill wrapper、problem ledger、examples、docs tests
- **确认来源**：2026-05-21 用户确认“交付任务才介入”和“规则和文档”方案
- **日期**：2026-05-21

#### DD-006: 长时程 agent 可靠性属于回收审查契约，不属于执行层

- **决策**：AI-OS 用 `tasks.yaml` 的 `agent_run_review` 和 doctor W078 管理后台、云端、外部 PR agent、delegated 或 parallel execution 的 refs、write scope、progress checkpoints、return packet、human review status 和 unresolved risks；不新增 runner、MCP server、IDE hook、agent router、worktree manager 或 vendor adapter
- **原因**：最新 AI coding 生态正转向长时程、后台、并行、可审查 agent 交付；AI-OS 的价值是让这些执行面返回后可追踪、可验证、可接受，而不是替代执行面本身
- **影响范围**：tasks schema、verification-matrix、doctor W078、docs、skill wrapper、examples、interop、tests
- **确认来源**：2026-05-21 用户要求实现 v9.6 Long-Horizon Agent Reliability 方案
- **日期**：2026-05-21

#### DD-007: 前端 UI 采用感知设计稿的组件优先交付

- **决策**：AI-OS 前端 UI 先做 UI source routing：有设计稿时设计稿定义目标效果，组件库仍是优先实现路径；无设计稿时后台、PC 业务系统、App / H5 / 小程序业务页默认按项目现有或栈匹配组件库交付
- **原因**：项目负责人需要统一效果和开发效率，同时不能因为有设计稿就放弃可维护组件，也不能因为无设计稿就跳过业务逻辑、权限、状态和异常路径确认
- **影响范围**：AGENTS、DESIGN template、verification-matrix、docs/artifacts、constitution spec、skill wrapper、README、docs tests
- **确认来源**：2026-06-06 用户确认“有设计图要求的就用设计图，没设计的就都用组件库；有设计稿也能用组件的就用组件”
- **日期**：2026-06-06

### 2. 工程约束

#### EC-001: 核心治理能力必须能在已承诺环境稳定承接

- **约束**：进入根层治理和 CLI 的能力不能依赖单一 IDE 的专有加载机制
- **原因**：AI-OS 的定位是跨 agent 宪法，不是某个 IDE 的私有插件
- **影响范围**：CLI、README、docs、examples
- **确认来源**：PROJECT_PURPOSE.md + docs/maintainers.md
- **日期**：2026-04-22

### 3. 已知坑点

#### PT-001: 文档真相与安装真相分叉会直接降低交付质量

- **问题**：同一版本里同时存在 root-only 和 default-lane 两套默认布局叙事
- **根因**：重构后规范、实现、测试、维护文档未一起回正
- **绕行方案**：任何 major 布局变更必须同时改 AGENTS、schema、CLI、upgrade、tests
- **影响范围**：交付一致性、doctor 可信度、用户心智模型
- **日期**：2026-04-22

### 4. 技术债追踪

#### TD-001: legacy project 模板仍保留用于迁移辅助

- **类型**：architecture-violation
- **严重度**：low
- **影响范围**：framework templates、upgrade 兼容逻辑
- **消除计划**：后续在确认不再需要 v8 root-only 兼容后清理 project legacy 模板
- **日期**：2026-04-22

## archived

> 不再生效的条目移到这里，归档而非删除。
