# AI-OS v10.3.1 Codex Suitability Mission

## 1. 当前交付基线摘要

- **当前交付主题**：Codex suitability and documentation accuracy patch
- **当前交付目标**：全面审计 AI-OS 中不适合 Codex 前台执行代理的规则表述和项目自描述错误，并修复为跨 IDE 真实、可执行、可验证的 v10.3.1 patch。
- **成功标准**：AGENTS / skill / spec 明确已授权的分析、修复、实现、验证、发布请求可直接进入交付；README / Claude interop 不再把 Codex 描述成拥有 Claude Code pre-tool hook 等同强制能力；package-lock 与 VERSION / package.json 同步；自托管 lane 不再停留在 v10.2；stale upgrade example 修正；`npm test` + `npm run lint` + strict doctor 通过。
- **项目模式**：change + brownfield（改 AI-OS 自身）
- **当前质量档位（quality_tier，真理源见 lane.toml）**：standard
- **当前风险档位（risk_tier，真理源见 lane.toml）**：medium
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260618-114948-codex-suitability-doc-accuracy

## 2. 用户与闭环场景（进入实现前向用户反述并确认）

- **目标用户**：在 Codex、Claude Code、Cursor、Gemini CLI 或普通 shell agent 中使用 AI-OS 的项目交付用户。
- **关键场景**：用户明确要求“全面分析并修复”“修 bug”“验证并发布”时，Codex 应进入 AI-OS 交付流程并完成工作，而不是被模板化“等 go”卡住；同时普通对话仍不得误触发 lane governance。
- **核心主流程（步骤化反述）**：1. 用户发起明确项目修复 / 验证请求。 2. agent 通过 Activation Gate 并读取 L1/L2 工件。 3. agent 审计 AGENTS、skill、docs、tests、lane 和版本元数据。 4. agent 先写 CR 和任务账本，再修文档 / skill / 测试 / 版本。 5. agent 运行项目原生校验并拆分代码 / 数据 / 运行状态收口。
- **关键异常 / 边界分支**：普通讨论仍不能读写 lane；范围 / 验收不清、高风险、共享边界未锁或可能越界时必须停等确认；Codex 不被描述成有 host-level pre-tool hook；doctor 硬阻断只在 hook / pre-commit / CI 等接入面成立。
- **当前最小可行闭环**：v10.3.1 patch 文档 + skill + lane + package-lock + tests 一次性收口。
- **明确后续迭代项**：不新增 CLI、doctor warning、runtime、IDE adapter、MCP server、Codex 专属配置或新的工件类别。

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续零依赖 Node.js CLI；本轮只改 docs、skill、tests、版本元数据和自托管 lane 工件。
- **已确认目标运行态 / 部署约束**：AI-OS 仍是跨 agent 交付宪法；Codex 支持通过 AGENTS / skill / local doctor 使用，不新增 Codex 专属 runtime。
- **已确认质量优先级**：描述真实 > 不误拦 Codex 明确请求 > 不削弱高风险 / 模糊需求确认门 > 不扩张产品 surface。
- **已确认核心设计决策**：确认停点按授权、风险、范围和验收清晰度判断；doctor 是同一条 guard command，强制性取决于接入面。
- **已确认核心逻辑决策**：package-lock 根版本必须跟 VERSION / package.json 一起纳入发布一致性测试。

## 4. 范围边界与非目标

### 范围内

- AGENTS / skill / spec / artifacts 文档中的 Activation Gate 与 confirmation-stop 语义修正。
- README / Claude interop 的 doctor guard 强制性描述修正。
- Problem ledger、maintainers、CHANGELOG、tests、版本元数据同步。
- 自托管 lane 从 v10.2 Product Design 旧任务切到本轮 v10.3.1 patch。

### 范围外

- 新增 CLI 命令、flag、profile、runtime、doctor warning、MCP server、IDE adapter、Codex host hook 或安装器。
- 修改 doctor 逻辑本身。
- 改变 canonical layout schema `9` 或 12 组工件定义。

### 非目标

- 为 Codex 定制私有规则文件或绕过跨 IDE trunk。
- 删除历史 changelog / baseline-log 中真实的 v10.2、v10.3 记录。

## 5. 宿主项目相关上下文（按需引用根层 Mission）

- **本轮依赖的宿主项目事实**：AI-OS 核心边界是不做 IDE、runner、agent router 或代码生成器；核心治理能力必须跨 agent 可承接。
- **必须保持的共享基础设施约束**：AGENTS.md ≤150 行；2 primary product operations；zero runtime deps；canonical layout schema `9`；12 artifact categories。
- **与其他 lane 的边界**：继续使用 `default` lane；历史 Product Design bridge CR 保留为已完成记录。

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增外部依赖；Codex / shell agent 只需要文件系统和本地 Node doctor。
- **稳定风险**：确认停点写得过松会削弱设计锁定，写得过紧会继续误拦 Codex 明确交付请求；doctor 文案写得过强会误导用户关于 Codex hook 能力。
- **高风险触发因素**：不涉及用户资产、身份权限、跨用户数据或外部副作用，不升 high-risk。
- **审批点**：用户于 2026-06-18 明确要求“全面分析该项目，有哪些不适合 Codex 的点，或者本身的描述错误。修复下”。
