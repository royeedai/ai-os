# AI-OS v9.4 Agent Handoff + Evidence Loop Mission

## 1. 当前交付基线摘要

- **当前交付主题**：agent handoff evidence loop
- **当前交付目标**：把外部产品中值得学习的 agent 交接、任务 DAG、context packet 和验证闭环实践融合为 AI-OS 的 task/evidence 契约
- **成功标准**：任务模板明确 handoff/context/expected return/produced evidence/deviation log；doctor W076 可检查闭环漂移；docs/tests 固化“不做 IDE/runner/orchestrator”的边界
- **项目模式**：change + brownfield
- **当前交付档位**：standard
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260502-224147-agent-handoff-evidence-loop

## 2. 用户与闭环场景

- **目标用户**：需要让 AI coding agent 在长期项目中更可靠交付的个人开发者和小团队
- **关键场景**：用户在 Cursor / Claude Code / Codex / Copilot 等 IDE/agent 中交付任务 → AI-OS 记录交给谁、依据什么上下文、期望返回什么、实际产出什么证据、是否有实现偏差
- **当前最小可行闭环**：不新增执行层；通过 `tasks.yaml`、`verification-matrix.yaml`、docs 和 `doctor --strict` 让任务交接与证据闭环可审计
- **明确后续迭代项**：真实 agent execution adapter、kanban/worktree runner、PR 自动编排、MCP task server 均保持范围外

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续使用零依赖 Node.js CLI；可靠性增强优先进入 templates、docs、doctor 和 tests
- **已确认目标运行态 / 部署约束**：默认安装不启动 IDE 插件、agent runner、kanban server、browser、crawler、MCP server、hooks、sandbox 或外部服务
- **已确认质量优先级**：机械检查 > 文档叙事；工件交叉引用 > agent 记忆；证据可审计 > 工具专有能力
- **已确认核心设计决策**：保持 `AGENTS.md` 极简，把 handoff loop 放进任务工件和 `doctor --strict`
- **已确认核心逻辑决策**：task handoff、context refs、expected return、produced evidence、deviation log 必须能被测试覆盖

## 4. 范围边界与非目标

### 范围内

- `bin/ai-os-doctor.js` 新增 W076 task handoff / evidence loop warning
- lane `tasks.yaml` 模板新增 handoff/context/expected return/produced evidence/deviation log 字段
- lane `verification-matrix.yaml` 增加 handoff loop failure mode guard
- docs/spec/skill/changelog/tests 对齐到 v9.4.0

### 范围外

- 新增 CLI 命令、slash command、IDE hook、Spec Kit command、Kiro hook 或 project-management command
- 引入 IDE SDK、MCP SDK、browser automation、worktree runner、kanban server 或外部服务运行时依赖
- 默认启动 agent runner、browser、crawler、visual diff、sandbox、MCP server、task server 或 eval runner
- 改变安装布局、改变 CLI 行为或新增执行能力

### 非目标

- 把 AI-OS 变成 spec executor、代码生成器、浏览器采集器或任务编排器
- 把 AI-OS 变成 Task Master / Traycer / Vibe Kanban 的替代品
- 扩大 `AGENTS.md` 成长篇操作手册

## 5. 宿主项目相关上下文

- **本轮依赖的宿主项目事实**：AI-OS 已有 v9 canonical layout、v9.2 URL intake、W070-W075 doctor checks、eval frontmatter，本轮新增 W076
- **必须保持的共享基础设施约束**：README、schema、skill wrapper、templates、tests、CLI help 必须表达同一套最小 surface；task handoff 是工件契约，不是执行层
- **与其他 lane 的边界**：当前仓库继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖；外部研究只转化为工具无关契约
- **稳定风险**：W076 过严导致旧任务噪声；模板字段过多导致用户心智负担增加；公开文案把 task handoff 误读为 AI-OS 接管 agent 执行
- **高风险触发因素**：不涉及用户资产写入、身份权限变更、跨用户数据或外部副作用，不升 high-risk
- **审批点**：用户于 2026-05-02 确认将 Agent Handoff + Evidence Loop 融入 AI-OS
