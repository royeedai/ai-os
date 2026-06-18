# AI-OS v10.5.0 Boundary Evolution Policy Design

## 1. 设计目标

- **本轮设计目标**：让 AI-OS 的长期边界从“每次发布不新增 X”的静态口径，升级为可复用、可验证、可审查的边界演进策略。
- **需要先锁定的关键页面 / 交互 / 接口**：Boundary Evolution Policy、four-layer boundary taxonomy、extension gates、maintainer checklist、docs tests、version metadata。
- **必须用户确认的核心设计决策**：用户已同意先计划后开始；本轮只增加边界决策规则，不新增 runtime / CLI / doctor warning / artifact category。

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：AGENTS 宪法 → skill wrapper → README → artifacts schema → constitution spec → maintainers checklist → interop docs → tests。
- **一级 / 二级结构**：kernel boundary → controlled extension → adapter layer → forbidden surfaces → entry criteria。
- **关键信息优先级**：先明确核心边界不放松，再说明哪些扩展可被证据化接受，最后列永久禁止项。

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `AGENTS.md` | 分发宪法 | 边界演进行为规则 | 说明受控扩展必须有证据门 | yes | confirmed |
| `README.md` | 用户心智 | Boundary Evolution Policy | 解释 AI-OS 不变胖但能有证据地演进 | yes | confirmed |
| `docs/artifacts.md` | schema 语义 | four-layer boundary taxonomy | 说明本策略不新增工件类别 | yes | confirmed |
| `docs/maintainers.md` | 维护者判断 | Boundary Decision Checklist | 判断 doctor / CLI / adapter / artifact category 准入 | yes | confirmed |
| `test/docs.test.js` | 回归 guard | boundary assertions | 防止未来把边界写成永久冻结或无限扩张 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| Kernel boundary | 永久核心 | Activation Gate / 12 artifacts / AGENTS / memory / local doctor / native verification / no telemetry | stable | yes | confirmed |
| Controlled Extension | 受控扩展 | CR / evidence / native tests / docs tests / eval or verification guard | request → boundary review → CR → tests → release | yes | confirmed |
| Adapter layer | 外部工具薄集成 | optional / thin / removable / no hard dependency | doc/spec/example → optional adoption | yes | confirmed |
| Forbidden surfaces | 永久禁区 | agent runner / refactor scheduler / model router / auto-release platform / long-running service / telemetry / IDE-only dependency | blocked | yes | confirmed |

## 5. 关键流程

1. 用户确认 AI-OS 长期发展需要边界演进规则。
2. agent 建立本轮 CR，基于 v10.4 已验证本地基线继续。
3. agent 更新 AGENTS、skill、README、artifacts、constitution spec、maintainers、interop、tests、version metadata。
4. agent 运行项目原生验证：`npm test`、`npm run lint`、`node bin/create-ai-os.js doctor . --json --strict`。
5. 交付时拆分代码 / 数据 / 运行状态，并说明本轮没有新增任何运行面。

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：AGENTS、README、docs/artifacts、docs/constitution-spec、docs/maintainers、docs/interop/standards-map、official skill wrapper、docs tests、version metadata、self-hosted lane。
- **受影响的接口 / 页面清单**：AI-OS product boundary language、extension gate semantics、maintainer release matrix、version pin docs、docs test assertions。
- **同仓正常实现对照**：v10.1 / v10.2 / v10.3 / v10.4 均保持 no-runtime/no-surface expansion；本轮保留该事实，但避免把它写成永久冻结。
- **副作用清单**：不改 CLI 行为；不新增 doctor warning；不新增 artifact category；不新增 runtime；历史 changelog / historical CR 版本事实保留。

## 7. UI Source Routing（前端 UI 项目必填）

- **ui_source**：none
- **surface**：unknown
- **frontend_stack**：unknown
- **component_library**：custom
- **selection_reason**：not a frontend UI delivery
- **fidelity_level**：component-native
- **custom_required**：无 UI 实现
- **design_input.provider**：manual-brief
- **design_input.capability_used**：manual
- **design_input.evidence_refs**：用户 2026-06-18 边界决策请求 + repo artifact audit
- **design_input.fallback_path**：existing-style

## 8. 对照参考（reverse-spec 必填）

- **原始参考清单**：用户确认的 “v10.5 Boundary Evolution Policy” 方案。
- **字段级 / 行为级对照摘要**：计划要求核心边界不变，但允许证据化薄扩展；新增 boundary policy 文档和测试；不新增 runtime / CLI / doctor warning / artifact category。
- **仍待解决差异**：未来真实扩展仍需另开 CR；本轮不提前实现任何扩展。

## 9. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | Public docs and skill describe Kernel / Controlled Extension / Adapter / Forbidden boundary layers | `npm test` | docs assertions |
| AC-002 | REQ-002 | Doctor warning, CLI subcommand, interop adapter, and artifact-category entry criteria are documented | `npm test` | boundary checklist assertions |
| AC-003 | REQ-003 | Docs avoid permanent freeze wording and describe evidence-gated extension | `npm test` + review | no-freeze assertions |
| AC-004 | REQ-004 | Product surface remains unchanged in this release | `npm test` + strict doctor | no new bin / doctor warning assertions |
| AC-005 | REQ-005 | VERSION / package.json / package-lock / docs pins all align to 10.5.0 and spec v2.6 | `npm test` | version assertions |
| AC-006 | REQ-006 | Native verification passes | `npm test` + `npm run lint` + `doctor --strict` | command outputs |

## 10. 反述确认门（设计锁定前必经）

- **agent 反述的关键设计理解**：AI-OS 不该变胖，但也不该把当前边界写成永久冻结。本轮将边界拆成 Kernel / Controlled Extension / Adapter / Forbidden；未来新增 doctor / CLI / adapter / artifact category 必须有证据门和 CR，本轮本身不新增这些 surface。
- **用户确认 / 校正**：用户 2026-06-18 表示“同意。计划后开始”。
- **确认日期**：2026-06-18
