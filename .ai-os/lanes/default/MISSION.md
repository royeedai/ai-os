# AI-OS v10.5.0 Boundary Evolution Policy Mission

## 1. 当前交付基线摘要

- **当前交付主题**：Boundary Evolution Policy
- **当前交付目标**：把 AI-OS 长期发展边界从静态“不要新增 X”升级为可审查的边界演进规则：Kernel 保持严格，Controlled Extension 有证据准入，Adapter 保持可选薄封装，Forbidden 永久禁止。
- **成功标准**：AGENTS / skill / README / artifacts / constitution spec / maintainers / interop / tests 均表达同一套 v10.5.0 边界策略；不新增 CLI、runtime、doctor warning、adapter implementation、agent runner 或工件类别；版本元数据同步；`npm test` + `npm run lint` + strict doctor 通过。
- **项目模式**：change + brownfield
- **当前质量档位（quality_tier，真理源见 lane.toml）**：standard
- **当前风险档位（risk_tier，真理源见 lane.toml）**：medium
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260618-132214-boundary-evolution-policy

## 2. 用户与闭环场景（进入实现前向用户反述并确认）

- **目标用户**：长期使用 AI-OS 治理 AI-assisted 项目的个人开发者、小团队和维护者。
- **关键场景**：AI-OS 继续迭代时，过窄边界会让必要能力无法进入，过宽边界会把 AI-OS 变成 IDE / runtime / 调度平台；用户要求反复思考后决定是否改边界。
- **核心主流程（步骤化反述）**：1. 保持 Kernel 不变。 2. 新能力先判断属于 controlled extension、adapter 还是 forbidden。 3. controlled extension 必须有 CR / evidence / tests / guard。 4. adapter 只能是可选、薄封装、可删除。 5. forbidden 不进入 AI-OS 核心。
- **关键异常 / 边界分支**：无真实 failure mode 不新增 PL；无确定性结构信号不新增 doctor warning；install / doctor 能覆盖则不新增 CLI；外部工具集成不得成为核心硬依赖。
- **当前最小可行闭环**：v10.5.0 docs + skill + self-hosted lane + docs tests，证明边界可以演进但不扩大运行面。
- **明确后续迭代项**：如未来确需新增 doctor / CLI / artifact category，必须按本策略另开 CR 并提供证据。

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续零依赖 Node.js CLI；本轮只改 artifact governance / docs / tests / version metadata。
- **已确认目标运行态 / 部署约束**：AI-OS 不做 IDE、runtime、agent runner、model router、auto-release platform 或 telemetry system。
- **已确认质量优先级**：Kernel 稳定 > 可证据化扩展 > 薄 adapter > 拒绝运行面膨胀。
- **已确认核心设计决策**：边界分为 Kernel / Controlled Extension / Adapter / Forbidden；controlled extension 用 evidence gate，不用绝对冻结。
- **已确认核心逻辑决策**：本轮不新增任何产品 surface，只改决策规则。

## 4. 范围边界与非目标

### 范围内

- AGENTS / skill 增加边界演进规则。
- README / artifacts / constitution spec / maintainers / interop docs 同步 v10.5.0。
- docs tests 增加 Boundary Evolution Policy 断言。
- 自托管 lane 切到本轮 CR。
- 版本元数据提升到 10.5.0。

### 范围外

- 新增 CLI 命令、flag、runtime、doctor warning、MCP server、IDE adapter、agent runner、worktree manager、重构调度器或第 13 类工件。
- 为外部工具写专有插件或自动编排层。
- 修改 `bin/` 行为或 doctor 规则。

### 非目标

- 放松 Activation Gate、目标确认、设计锁定、证据化完成、memory 回流等核心要求。
- 把“受控扩展”解释成可以跳过 CR / test / docs。
- 为尚未出现的边界失败新增 PL。

## 5. 宿主项目相关上下文（按需引用根层 Mission）

- **本轮依赖的宿主项目事实**：AI-OS 的核心价值是稳定交付治理，不是执行层自动化。
- **必须保持的共享基础设施约束**：AGENTS.md ≤150 行；2 primary product operations；zero runtime deps；canonical layout schema `9`；12 artifact categories；doctor semantic warnings 当前仍为 W070-W078。
- **与其他 lane 的边界**：继续使用 `default` lane；v10.4 Long-lived AI Project Maintenance Loop 是上一轮已验证但未发布的本地基线。

## 6. 稳定风险与外部依赖

- **外部依赖**：上一轮已核对 Codex / Kiro / Cursor / Claude / Copilot / OpenAI eval loop；本轮不新增外部 runtime 依赖。
- **稳定风险**：边界写得过松会导致 scope creep；写得过硬会阻碍必要演进。
- **高风险触发因素**：不涉及用户资产、身份权限、跨用户数据或外部副作用，不升 high-risk。
- **审批点**：用户于 2026-06-18 同意方案并要求“计划后开始”。
