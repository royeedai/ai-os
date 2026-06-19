# AI-OS Codex Field Feedback Mission

## 1. 当前交付基线摘要

- **当前交付主题**：Codex AI-OS Field Feedback Closeout
- **当前交付目标**：把本机 Codex 开发项目中使用 AI-OS 的重复问题回流为 AI-OS 治理优化，完成全文审计后发布 v10.5.1 patch release。
- **成功标准**：新增证据包、problem-ledger、evals、docs、skill、lane templates 和 docs tests；明确 accepted / rejected scope；不新增 CLI、runtime、doctor warning、adapter implementation、agent runner、自动发布或第 13 类工件；项目原生验证通过；version metadata / docs pins / CHANGELOG 对齐 v10.5.1；commit、push、tag 成功。
- **项目模式**：change + brownfield
- **当前质量档位（quality_tier，真理源见 lane.toml）**：standard
- **当前风险档位（risk_tier，真理源见 lane.toml）**：high
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260619-230709-field-feedback-release-audit

## 2. 用户与闭环场景（进入实现前向用户反述并确认）

- **目标用户**：使用 Codex / Claude Code / Cursor / Copilot 等 AI coding surface 管理长期项目交付的个人开发者、维护者和小团队。
- **关键场景**：本机多个 Codex 项目中，AI-OS 帮助恢复上下文和证据，但反复出现发布状态、验证环境、任务账本和安装基线解释漂移；用户要求审核计划后开始优化。
- **核心主流程（步骤化反述）**：1. 从本机 Codex 记录归纳重复 failure classes。 2. 判断哪些属于 AI-OS 治理优化而非运行时能力。 3. 建 CR 与证据包。 4. 用现有 docs / templates / evals / tests 落 guard。 5. 全面审计本次改动与 AI-OS 全文。 6. bump v10.5.1、运行原生验证。 7. commit、push origin/main、tag v10.5.1。
- **关键异常 / 边界分支**：语义分类问题不直接做 doctor warning；release 自动化不进入 AI-OS；外部服务 / 本地环境 blocker 不能被写成产品代码完成；旧 baseline / generated artifact 不能驱动当前 scope。
- **当前最小可行闭环**：docs/codex-aios-field-feedback.md + PL-025 + 4 个 eval + lane template guard + docs tests。
- **明确后续迭代项**：若以后要新增 doctor warning，只能选择确定性结构检查（如 duplicate task IDs、closed task missing evidence），另开 CR 和 fixture。

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续零依赖 Node.js CLI；本轮只改 artifact governance / docs / templates / evals / tests。
- **已确认目标运行态 / 部署约束**：AI-OS 不做 IDE、runtime、agent runner、model router、auto-release platform、telemetry system 或 release bot。
- **已确认质量优先级**：交付真相一致性 > 验证环境分类 > task ledger 可恢复 > baseline artifact 可解释 > 保持 AI-OS 边界。
- **已确认核心设计决策**：Field feedback 先走 existing artifact guidance、template guard、problem-ledger、eval；doctor / CLI / runtime 只有通过 Boundary Evolution Policy 才能新增。
- **已确认核心逻辑决策**：本轮 bump v10.5.1、commit、push、tag；npm publish 仍不在本轮范围内。

## 4. 范围边界与非目标

### 范围内

- 建立 `docs/codex-aios-field-feedback.md` 和本轮 CR。
- `docs/problem-ledger.md` 新增 PL-025。
- 新增 release truth、verification environment、task ledger、install baseline 相关 eval。
- 更新 `docs/artifacts.md`、README、maintainers、official skill wrapper。
- 更新 lane `tasks.yaml` 与 `verification-matrix.yaml` 模板。
- 更新 docs tests 并运行原生验证。
- 更新 self-hosted lane 到当前 release audit CR。
- bump v10.5.1，commit，push origin/main，推送 tag `v10.5.1`。

### 范围外

- 新增 CLI 命令、flag、runtime、doctor warning、MCP server、IDE adapter、agent runner、worktree manager、release automation 或第 13 类工件。
- 修改 `bin/` 行为或 doctor 规则。
- npm publish。

### 非目标

- 把 Codex 专属能力写成 AI-OS 硬依赖。
- 用聊天记录替代 lane artifacts。
- 把外部 AI coding 市场趋势直接变成 AI-OS 产品 surface。

## 5. 宿主项目相关上下文（按需引用根层 Mission）

- **本轮依赖的宿主项目事实**：AI-OS 的核心价值是稳定交付治理，不是执行层自动化。
- **必须保持的共享基础设施约束**：AGENTS.md ≤150 行；2 primary product operations；zero runtime deps；canonical layout schema `9`；12 artifact categories；doctor semantic warnings 当前仍为 W070-W078。
- **与其他 lane 的边界**：继续使用 `default` lane；v10.5 Boundary Evolution Policy 是上一轮已验证基线，本轮应用该 policy 决定不新增 surface。

## 6. 稳定风险与外部依赖

- **外部依赖**：前序审核已参考 OpenAI Codex、Copilot coding agent、Claude Code hooks、Kiro spec-driven workflow、MCP 等公开方向；本轮不引入外部 runtime 依赖。
- **稳定风险**：过度泛化会把 Codex 个案写成通用框架规则；过度保守会让重复 drift 继续靠记忆处理。
- **高风险触发因素**：commit、push、tag 属于外部副作用，升 high-risk。
- **审批点**：用户于 2026-06-19 要求“都没问题后再提交推送发新版本”。
