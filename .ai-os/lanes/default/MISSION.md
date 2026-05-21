# AI-OS v9.6 Long-Horizon Agent Reliability Mission

## 1. 当前交付基线摘要

- **当前交付主题**：long-horizon agent reliability
- **当前交付目标**：把长时程、后台、外部 PR agent 和并行 agent 的交付回收沉淀为 AI-OS 工件治理契约，确保交出去的工作回来时有 refs、scope、evidence、return packet 和 human review
- **成功标准**：`tasks.yaml` 模板和文档新增可选 `agent_run_review`；doctor 新增 W078；README、spec、artifacts docs、skill wrapper、interop doc、example、problem ledger 和 tests 对齐；版本升级到 9.6.0
- **项目模式**：change + brownfield
- **当前交付档位**：standard
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260521-232937-long-horizon-agent-reliability

## 2. 用户与闭环场景

- **目标用户**：会把任务交给 Codex cloud、Cursor Background Agents、GitHub Copilot cloud agent、Jules、Claude Code subagents / hooks 或其他后台 / 并行执行面的 AI coding 用户
- **关键场景**：用户委托后台 agent → AI-OS 先记录 execution surface、run refs、write scope 和 expected return → work 返回后记录 return packet、native test evidence、human review status 和 unresolved risks → doctor W078 阻止证据缺失的任务关闭
- **当前最小可行闭环**：通过 `agent_run_review` 字段、W078 doctor 检查、模板、docs、interop 示例和 tests 固化回收审查
- **明确后续迭代项**：不新增 CLI command、flag、profile、runtime runner、MCP server、IDE hook、agent router、worktree manager 或云任务调度器

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续使用零依赖 Node.js CLI；本轮增加文档、模板、doctor 语义检查、示例和测试
- **已确认目标运行态 / 部署约束**：AI-OS 仍是治理契约，不执行后台任务，不连接 vendor API，不管理分支或 PR
- **已确认质量优先级**：长时程交付可审查 > 新执行能力；工件契约 > vendor-specific adapter
- **已确认核心设计决策**：`agent_run_review` 默认可选，只在 task 明确使用 delegated / background / cloud / external / parallel execution 时需要
- **已确认核心逻辑决策**：W078 只警告长时程 task 缺 run refs、write scope、expected return、return packet、evidence、human review，或带 unresolved risks 仍关闭

## 4. 范围边界与非目标

### 范围内

- `tasks.yaml` 模板新增 `agent_run_review`
- `verification-matrix.yaml` 模板新增 long-horizon impact rule 和 failure modes
- `bin/ai-os-doctor.js` 新增 W078 semantic warning
- README / docs / constitution spec v1.8 / skill wrapper / examples / interop / problem ledger 更新
- docs tests、doctor tests、version metadata、changelog 和 self-hosted lane 工件更新到本轮基线

### 范围外

- 新增 CLI 命令、flag、profile、配置字段或 schema 版本
- 新增 runtime runner、MCP server、IDE hook、agent router、worktree manager、cloud scheduler 或 vendor adapter
- 把 Codex / Cursor / GitHub / Jules / Claude Code 的产品细节作为 AI-OS 依赖
- 替代人类 review 或项目原生测试

### 非目标

- 自动启动、轮询或合并后台 agent 工作
- 管理外部分支生命周期
- 为每个 vendor 建一套专用 schema

## 5. 宿主项目相关上下文

- **本轮依赖的宿主项目事实**：AI-OS 已有 Activation Gate、Agent Handoff + Evidence Loop、Hallucination Guard 和“不做执行层”的产品边界
- **必须保持的共享基础设施约束**：`agent_run_review` 只能细化长时程执行证据，不替代既有 `handoff_to` / `context_refs` / `expected_return` / `evidence_required` / `evidence_produced` / `deviation_log`
- **与其他 lane 的边界**：当前仓库继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖；vendor 名称仅作 interop 参考
- **稳定风险**：W078 触发过宽会干扰普通 local foreground；触发过窄会放过后台 agent work；文档若写成 runner 会破坏产品边界
- **高风险触发因素**：不涉及用户资产写入、身份权限变更、跨用户数据或外部副作用，不升 high-risk
- **审批点**：用户于 2026-05-21 要求实现 v9.6 Long-Horizon Agent Reliability 方案
