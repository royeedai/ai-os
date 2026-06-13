# AI-OS v10.2 Product Design Optional Bridge Mission

## 1. 当前交付基线摘要

- **当前交付主题**：Product Design optional design-evidence bridge
- **当前交付目标**：让 Codex + `@product-design` 场景完整利用 Product Design 的 brief、视觉探索、prototype、image-to-code、design QA、share 能力，同时保证 Cursor、Claude Code、普通 IDE 和无插件环境仍可按同一 AI-OS 工件交付。
- **成功标准**：新增 `docs/interop/product-design.md`；`docs/artifacts.md`、lane `DESIGN.md` 模板、`tasks.yaml` 模板和 `ai-os-delivery` skill 记录 `design_input` 与 fallback；Product Design workflow 映射到现有 handoff/evidence 字段；`docs/problem-ledger.md`、maintainers、CHANGELOG、version 和 tests 同步；不新增 CLI、runtime、doctor code、MCP server、IDE adapter 或 Product Design 硬依赖；`npm test` + `npm run lint` + strict doctor 全绿。
- **项目模式**：change + brownfield（改 AI-OS 自身）
- **当前质量档位（quality_tier，真理源见 lane.toml）**：standard
- **当前风险档位（risk_tier，真理源见 lane.toml）**：medium
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260613-110848-product-design-optional-bridge

## 2. 用户与闭环场景

- **目标用户**：在 Codex 中可用 `@product-design` 的 AI-OS 用户，以及在 Cursor、Claude Code、普通 IDE 或无插件环境中做 UI / prototype / design-led 交付的用户。
- **关键场景**：有 Product Design 时，agent 先走 Product Design brief gate、视觉探索或 prototype 证据，再把输出沉淀到 AI-OS lane；无 Product Design 时，同一 `design_input` 契约接受 Figma、截图、URL reverse-spec、现有代码、组件库或人工 brief。
- **核心主流程（步骤化反述）**：
  1. 用户要求 UI、prototype、设计稿还原或设计驱动交付。
  2. agent 先判断是否存在 Product Design 能力与可用视觉来源。
  3. 有 Product Design：按 Product Design brief gate / ideation / prototype / QA workflow 产出证据，写入 AI-OS `design_input`、`evidence_refs` 与 task evidence。
  4. 无 Product Design：使用 Figma、截图、URL reverse-spec、existing-style 或 component-first fallback，仍写入同一字段。
  5. 实现和交付仍通过 AI-OS 原生任务、验证矩阵和项目原生静态校验收口。
- **关键异常 / 边界分支**：Product Design 不可用或用户未安装插件 → 不阻塞 AI-OS；Product Design 产物缺截图 / prototype / QA 证据 → 不得当作 confirmed design target；插件产物与项目组件库冲突 → `DESIGN.md` 记录 fidelity / component selection trade-off；share URL 只是证据或人工后续动作，不是 AI-OS 发布能力。
- **当前最小可行闭环**：通用 `design_input` schema + Product Design interop doc + fallback path + tests，一次性落地为 v10.2.0。
- **明确后续迭代项**：不新增执行层 adapter、插件安装器、UI sandbox、Product Design-only template 或 doctor warning。

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续零依赖 Node.js CLI；本轮只改 docs、templates、tests、自托管 lane 和版本。
- **已确认目标运行态 / 部署约束**：AI-OS 仍是跨 IDE 交付宪法，不执行 Product Design workflow，不安装插件，不托管 prototype。
- **已确认质量优先级**：完整利用 Product Design 能力 > 设计证据可审计 > 无插件降级可用 > 不扩张 AI-OS 核心 surface。
- **已确认核心设计决策**：Product Design 是可选设计证据提供方；AI-OS 只定义通用设计输入、证据回收、降级路径和验证门。
- **已确认核心逻辑决策**：复用 `tasks.yaml` 现有 `handoff_to` / `expected_return` / `evidence_produced` / `deviation_log`，不新增 handoff schema 或 doctor code。

## 4. 范围边界与非目标

### 范围内

- `docs/interop/product-design.md` 新增 Product Design ↔ AI-OS 映射与 no-plugin fallback。
- `docs/artifacts.md` 扩展 `design_input` 可选字段。
- lane `DESIGN.md` / `tasks.yaml` / `verification-matrix.yaml` 模板更新。
- `framework/skills/ai-os-delivery/SKILL.md` 更新前端 UI source routing 行为。
- README / constitution spec / standards-map / problem ledger / maintainers / changelog / tests / version 同步。

### 范围外

- 新增 CLI 命令、flag、profile、runtime、doctor warning、MCP server、IDE adapter、Product Design 依赖或插件安装流程。
- 把 Product Design 规则写入 `AGENTS.md` 成为所有 IDE 的硬要求。
- 替 Product Design 实现、运行或托管 prototype / design QA。

### 非目标

- 用 Product Design 替代项目原生静态校验、业务逻辑验收、组件库选择或 AI-OS evidence gate。
- 让无插件 IDE 理解 Product Design 工具名；它们只需要读取通用 `design_input` 与 evidence 字段。

## 5. 宿主项目相关上下文（按需引用根层 Mission）

- **本轮依赖的宿主项目事实**：AI-OS 已有 Activation Gate、Design-Aware Component-First UI、Agent Handoff + Evidence Loop、Long-Horizon Agent Reliability 和 no-runtime / no-adapter 边界。
- **必须保持的共享基础设施约束**：AGENTS.md ≤150 行；constitution-spec ≤160 行；interop docs ≤200 行；2 primary product operations；zero runtime deps；canonical layout schema `9`。
- **与其他 lane 的边界**：继续使用 `default` lane。

## 6. 稳定风险与外部依赖

- **外部依赖**：Product Design 插件可选；无插件环境必须保持功能完整。
- **稳定风险**：写得太像 Codex 专属集成会破坏跨 IDE；写得太抽象会让 Product Design 的能力无法完整落地。用通用字段 + 专门 interop 文档平衡。
- **高风险触发因素**：不涉及用户资产、身份权限、跨用户数据或外部副作用，不升 high-risk。
- **审批点**：用户于 2026-06-13 明确要求按计划实现，并强调“完整使用 Product Design 能力且不影响其他 IDE”。
