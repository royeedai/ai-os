# AI-OS v9.5 Hallucination Guard Mission

## 1. 当前交付基线摘要

- **当前交付主题**：hallucination guard
- **当前交付目标**：把 AI 开发中的事实状态显式化，防止 agent 把未观察、未确认、未验证的信息包装成事实并进入实现或交付收口
- **成功标准**：任务模板和当前 lane 任务包含 `fact_state_review`；doctor W077 可检查缺事实状态或 closed-with-unresolved-assumptions；docs/spec/skill/changelog 表达 hallucination guard 是工件治理，不是第二套提示词或运行时
- **项目模式**：change + brownfield
- **当前交付档位**：standard
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260507-092708-hallucination-guard

## 2. 用户与闭环场景

- **目标用户**：需要让 AI coding agent 在长期项目中少脑补、少误报完成、少把推断当事实的个人开发者和小团队
- **关键场景**：用户给出任务 → agent 读取 AI-OS 工件 → 在 `tasks.yaml` 中区分 `observed` / `confirmed` / `inferred` / `unknown` → 未知进入待确认或非目标 → done / verified / shipped 前由 W077 和验证矩阵检查闭环
- **当前最小可行闭环**：不新增执行层；通过 `tasks.yaml`、`verification-matrix.yaml`、docs 和 `doctor --strict` 让事实状态可审计
- **明确后续迭代项**：agent runtime hooks、IDE 专有 memory 写入、自动澄清机器人、prompt marketplace 同步均保持范围外

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续使用零依赖 Node.js CLI；可靠性增强优先进入 templates、docs、doctor 和 tests
- **已确认目标运行态 / 部署约束**：默认安装不启动 IDE 插件、agent runner、kanban server、browser、crawler、MCP server、hooks、sandbox 或外部服务
- **已确认质量优先级**：机械检查 > 文档叙事；工件交叉引用 > agent 记忆；事实状态显式化 > 追加长提示词
- **已确认核心设计决策**：保持 `AGENTS.md` 极简，把 hallucination guard 放进 task fact-state review 和 `doctor --strict`
- **已确认核心逻辑决策**：`observed` / `confirmed` 可支撑执行与关闭；`inferred` 必须标假设；`unknown` 必须进入待确认、非目标、阻塞项或 CR

## 4. 范围边界与非目标

### 范围内

- `bin/ai-os-doctor.js` 新增 W077 task fact-state review warning
- lane `tasks.yaml` 模板新增 `fact_state_review`
- lane `verification-matrix.yaml` 增加 hallucination failure mode guard
- docs/spec/skill/changelog/tests 对齐到 v9.5.0

### 范围外

- 新增 CLI 命令、slash command、IDE hook、Spec Kit command、Kiro hook 或 prompt marketplace package
- 引入 IDE SDK、MCP SDK、browser automation、worktree runner、kanban server 或外部服务运行时依赖
- 默认启动 agent runner、browser、crawler、visual diff、sandbox、MCP server、task server 或 eval runner
- 直接复制 `forrestchang/andrej-karpathy-skills` 作为 AI-OS 的第二真理源

### 非目标

- 把 AI-OS 变成 prompt pack、agent memory system、代码生成器或任务编排器
- 把个别团队的业务判断硬编码为通用事实规则
- 扩大 `AGENTS.md` 成长篇操作手册

## 5. 宿主项目相关上下文

- **本轮依赖的宿主项目事实**：AI-OS 已有 v9 canonical layout、v9.2 URL confidence、v9.4 handoff evidence loop、W070-W076 doctor checks、eval frontmatter
- **必须保持的共享基础设施约束**：README、schema、skill wrapper、templates、tests、CLI help 必须表达同一套最小 surface；hallucination guard 是工件契约，不是执行层
- **与其他 lane 的边界**：当前仓库继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖；Karpathy-inspired coding rules 只作为背景对照，AI-OS 不把外部仓库变成规则源
- **稳定风险**：W077 过严导致旧任务噪声；`fact_state_review` 字段增加用户心智负担；公开文案把 guard 误读为模型安全产品或 prompt pack
- **高风险触发因素**：不涉及用户资产写入、身份权限变更、跨用户数据或外部副作用，不升 high-risk
- **审批点**：用户于 2026-05-07 授权 AI-OS maintainer agent 作为项目负责人决定并完成开发、验证、提交和推送到 `main`
