# AI-OS v9.3 External Learning Fusion Design

## 1. 设计目标

- **本轮设计目标**：把外部可靠实践融合成 AI-OS 的工件契约、doctor 机械检查和一致的 release product surface 口径
- **需要先锁定的关键页面 / 交互 / 接口**：不是 UI 变更；关键接口是 doctor warning codes、lane artifact fields、docs/tests contracts
- **必须用户确认的核心设计决策**：不新增 CLI / slash command / runtime dependency，不扩大 `AGENTS.md`

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：README 保持简洁；详细协议进入 docs、templates 和 doctor warnings
- **一级 / 二级结构**：docs 说明契约，templates 承载字段，doctor 检查漂移，tests 固化不回退
- **关键信息优先级**：基线 delta、AC 映射、风险证据、confidence、taxonomy 必须先于实现叙事

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `create-ai-os doctor --strict` | 在 CI / 本地捕捉工件语义漂移 | W070-W075 semantic warnings | 读取 lane 工件并输出 JSON / text | yes | confirmed |
| docs/templates | 让 agent 知道如何写入可靠工件 | CR delta、bugfix spec、evidence matrix、eval taxonomy | 生成可审计需求与验证 | yes | confirmed |
| README / CLI / MCP docs | 防止新增能力误读 | 3 primary operations、install alias、open-standard skill wrapper、illustrative MCP snippet | 发布前口径收口 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| CR delta record | 记录变更生命周期 | `Current behavior` `Proposed delta` `Affected artifacts` `Acceptance delta` `Close/archive condition` | proposed → confirmed → closed/archived | yes | confirmed |
| Bugfix spec route | 约束 bug 修复范围 | root cause、reproduction、blast radius、planned files、regression guard | reproduced → scoped → fixed → guarded | yes | confirmed |
| Evidence package matrix | 接收不同采集工具证据 | evidence kind、accepted source、redaction、confidence mapping | captured → normalized → mapped | yes | confirmed |
| MCP resource annotations | 指导 progressive disclosure clients | `audience` `priority` `lastModified` `subscribe` `listChanged` | listed → read → subscribed | yes | confirmed |
| Eval taxonomy | 结构化失败模式 | `risk_source` `failure_mode` `harm` `artifact_gate` | observed → guarded → promoted | yes | confirmed |

## 5. 关键流程

1. 用户确认外部学习融合路线图
2. lane 新增 CR 记录 current behavior、proposed delta、affected artifacts、acceptance delta 和 close/archive condition
3. docs/templates 表达新契约但不新增 runtime surface
4. doctor 新增 warning 并在 `--strict` 下升级为失败
5. release polish 统一 install alias、skill wrapper、MCP snippet 的公开口径
6. tests 固化 docs/template/doctor/version/CLI surface invariants

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：doctor CLI、framework lane templates、docs、evals、docs tests、version metadata
- **受影响的接口 / 页面清单**：README、docs/cli、docs/artifacts、docs/constitution-spec、docs/reverse-spec-url-intake、docs/interop/mcp-resources、evals/README、CHANGELOG、CLI help
- **同仓正常实现对照**：现有 W070-W075 semantic warning pattern、URL reverse-spec intake protocol、eval frontmatter tests
- **副作用清单**：doctor strict 将更容易发现旧 CR / high-risk / URL evidence 漂移；默认安装仍不启动外部服务；release polish 只改口径和测试，不改变 CLI 行为

## 7. 对照参考（reverse-spec 必填）

- **原始参考清单**：Spec Kit、OpenSpec、Kiro specs、Playwright trace/HAR、Chrome DevTools for agents、Firecrawl formats、MCP resources、ABTest / ATBench-Codex eval taxonomy
- **字段级 / 行为级对照摘要**：吸收 staged spec、delta lifecycle、bugfix route、evidence packages、resource annotations、failure taxonomy，但只落为 AI-OS 工件协议和 doctor checks
- **仍待解决差异**：未内置 MCP server、browser capture adapter、eval runner、visual diff 或 runtime crawler

## 8. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | doctor 新增 CR delta、逐项 AC 映射、high-risk、URL confidence 语义 warning，并支持 `--strict` | `npm test` + `doctor --json --strict` | `test/doctor.test.js` |
| AC-002 | REQ-002 | lane 模板包含 bugfix spec route、CR delta 字段、evidence package / confidence guard | `npm test` | `test/docs.test.js` |
| AC-003 | REQ-003 | URL intake 文档包含证据包适配矩阵、脱敏要求和 confidence mapping | `npm test` | `test/docs.test.js` |
| AC-004 | REQ-004 | MCP resources 文档包含 annotations、`lastModified`、`subscribe`、`listChanged` 指南 | `npm test` | `test/docs.test.js` |
| AC-005 | REQ-005 | eval frontmatter 支持 taxonomy 字段并被 docs tests 校验 | `npm test` | `test/docs.test.js` |
| AC-006 | REQ-006 | CLI surface 仍为 3 primary product operations / 1 bin / 4 bin scripts，install 只有默认入口和显式 alias，版本对齐 v9.3.0 | `npm test` + `npm run lint` | docs/version/product-surface tests |

## 9. 设计确认记录

- 2026-05-02：项目 owner 确认实施外部学习融合路线图，选择 v9.3 change lane，保持零依赖和最小 CLI surface
- 2026-05-02：项目 owner 确认 v9.3 收口打磨，限定为产品口径与测试收口，不新增能力、不升级 v9.4
