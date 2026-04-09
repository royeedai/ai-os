# Spec-Kit vs AI-OS 流程对比分析

## 1. 阶段映射

| Spec-Kit 阶段 | AI-OS 阶段 | 重叠度 | 核心差异 |
|---|---|---|---|
| `/speckit.constitution` | `AGENTS.md` + `CONVENTIONS.md` | 高 | Spec-Kit 每个项目单独定义原则；AI-OS 在框架层预置宪法，项目层通过 CONVENTIONS 补充 |
| `/speckit.specify` | `/align` | 高 | Spec-Kit 偏"描述要做什么"；AI-OS 偏"澄清目标、暴露歧义、确认基准" |
| `/speckit.clarify` | `/align` 中的问题清单 | 高 | Spec-Kit 独立出了 clarify 步骤；AI-OS 把它合并在 align 内部 |
| `/speckit.plan` | `/design` + `/plan` | 中 | Spec-Kit 把技术选型和实现计划合并在一步；AI-OS 显式拆成"先锁设计"和"再拆任务" |
| `/speckit.tasks` | `/plan` 的 tasks.yaml | 高 | 功能几乎等价 |
| `/speckit.implement` | `/build` | 中 | Spec-Kit 一步到底；AI-OS 有 wave 机制、回归基线、自审检查点 |
| `/speckit.analyze` | `/verify` + `/review` | 低 | Spec-Kit 的 analyze 是可选的事前审计；AI-OS 的 verify 是强制的事后验证 |
| `/speckit.checklist` | `acceptance.yaml` | 中 | Spec-Kit 生成检查清单；AI-OS 有结构化验收矩阵 |
| 无 | `/ship` | — | Spec-Kit 无显式交付收口；AI-OS 有发布计划、回滚、双清单 |
| 无 | `/change-request` | — | Spec-Kit 无变更管理；AI-OS 有基线同步机制 |
| 无 | `/debug` | — | Spec-Kit 无 debug 治理；AI-OS 有定界修复流程 |
| 无 | `/postmortem` | — | Spec-Kit 无复盘机制 |
| 无 | `/resume` + `/status` | — | Spec-Kit 无跨 session 恢复；AI-OS 有 STATE.md + memory.md |

## 2. 架构差异

### 2.1 执行模式

| 维度 | Spec-Kit | AI-OS |
|---|---|---|
| 执行者 | AI agent（通过 slash 命令引导） | AI agent（通过 workflow markdown 引导） |
| CLI 角色 | `specify` CLI 做项目初始化和脚本生成 | `create-ai-os` CLI 做安装、诊断、校验 |
| 流程驱动 | Agent 读 slash 命令 → 生成工件 → 人工审核 | Agent 读 workflow markdown → 生成工件 → 人工确认 |
| 门禁执行 | 无程序化门禁，靠人工审核 | CLI 有 doctor/validate，但不参与流程推进 |
| 状态管理 | Git 分支名隐含当前 feature | STATE.md 显式记录阶段、进度、待确认项 |

### 2.2 工件体系

| 维度 | Spec-Kit | AI-OS |
|---|---|---|
| 规范文件 | `.specify/` 下的 spec、plan、tasks | `.ai-os/` 下的 MISSION、DESIGN、specs/、tasks.yaml、acceptance.yaml |
| 原则文件 | `.specify/constitution.md` | `AGENTS.md`（框架级）+ `CONVENTIONS.md`（项目级） |
| 状态文件 | 无 | `STATE.md`（session-local）+ `memory.md`（跨 session） |
| 变更记录 | 无 | `baseline-log/`（追加式，降低冲突） |
| 深度 | 轻量（~5 个文件） | 重量（10+ 工件） |

### 2.3 适用场景

| 场景 | Spec-Kit | AI-OS |
|---|---|---|
| Greenfield 从零开始 | 极强（核心设计场景） | 强 |
| Brownfield 老项目改造 | 弱（无共享基础设施审计） | 强（有基础设施审计、本轮交付基准隔离） |
| 变更管理 | 弱（无 change-request 机制） | 强（baseline-log、影响分析） |
| 多人协作 | 弱（无协作规则） | 中（文件分治、任务所有权、追加式合并） |
| 跨 session 恢复 | 弱（无状态管理） | 强（STATE.md、memory.md、/resume） |
| 证据化交付 | 弱（无 verify/ship 闭环） | 强（四门验证、双清单） |

## 3. 关键启发

### 3.1 AI-OS 应该学习的

1. **极简入口**：Spec-Kit 4 个命令上手，84K stars。AI-OS 需要一个等价的快速路径。
2. **Slash 命令驱动**：`/speckit.specify` 比阅读一个 markdown workflow 更有引导性。AI-OS 的 `/align` 等 slash 命令已经存在，但需要更好的引导式体验。
3. **Constitution 的独立性**：每个项目可以定义自己的 constitution，而不是只用框架全局规则。AI-OS 的 CONVENTIONS.md 部分覆盖了这一点，但可以更显式。
4. **Clarify 的独立步骤**：把"澄清歧义"独立成一个可重复调用的步骤，降低认知负担。
5. **社区扩展机制**：Extensions 和 Presets 让 Spec-Kit 变成了平台而不只是工具。

### 3.2 AI-OS 不应该学习的

1. **无状态的设计**：Spec-Kit 没有跨 session 恢复机制，这在真实项目中是致命缺陷。
2. **无变更管理**：真实项目需求一定会变，没有 change-request 机制的框架注定只适合一次性 demo。
3. **无验证闭环**：implement 之后没有 verify/ship，等于把质量交给运气。
4. **无 brownfield 支持**：大量真实工作是在已有项目上做变更，不是从零开始。

### 3.3 AI-OS 的真正差异化

Spec-Kit 解决的是 "0 to 1" 的 spec-driven 开发。AI-OS 解决的是**全生命周期的交付治理**：

- 需求会变（change-request + baseline-log）
- 会话会断（STATE.md + memory.md + /resume）
- 质量会偏（四门验证 + 证据化完成）
- bug 会来（/debug 定界修复）
- 代码会漂移（CONVENTIONS.md + 回归基线）
- 项目会复盘（/postmortem）

这不是复杂度税，这是真实项目交付的必要基础设施。

## 4. 行动建议

1. **新增极简入口层**（design-lite-entry），让首次接触等价于 Spec-Kit 的 4 步体验
2. **新增 CLI gate 命令**，让阶段过渡有程序化校验而不只是 markdown 建议
3. **保留全生命周期深度**作为核心差异化，但通过渐进暴露降低入口成本
4. **考虑项目级 constitution 机制**，让团队可以在 AGENTS.md 基础上叠加项目特定原则
