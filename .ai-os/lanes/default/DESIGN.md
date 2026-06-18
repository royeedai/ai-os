# AI-OS v10.3.1 Codex Suitability Design

## 1. 设计目标

- **本轮设计目标**：修正 AI-OS 对 Codex 前台执行代理不友好的确认停点描述、过度泛化的 doctor hook 强制性叙事，以及 release metadata / self-hosted lane 的自描述漂移。
- **需要先锁定的关键页面 / 交互 / 接口**：关键对象是 Activation Gate、confirmation-stop semantics、doctor guard integration wording、version metadata parity、dogfood lane baseline。
- **必须用户确认的核心设计决策**：用户已明确要求“全面分析并修复”，本轮可直接进入交付；仍不新增 Codex 专属 surface 或 runtime。

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：AGENTS 宪法 → skill wrapper → README / interop docs → spec / artifacts schema → tests → dogfood lane。
- **一级 / 二级结构**：explicit delivery request routing → confirmation-stop boundaries → portable doctor guard wording → version parity → lane recovery state。
- **关键信息优先级**：先保证 agent 行为不误拦明确交付请求，再保证对 Codex / hooks 的技术描述真实，最后同步自托管工件。

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `AGENTS.md` | 分发宪法 | Activation Gate / 确认停点 / bugfix rule | 明确已授权请求不二次反问 | yes | confirmed |
| `framework/skills/ai-os-delivery/SKILL.md` | agentskills wrapper | explicit delivery requests / confirmation stops | 让 Codex 等 spec-aware agent 按同一规则执行 | yes | confirmed |
| README / Claude interop | 用户心智 | portable guard command / hook vs local guard | 不把 Codex 写成 host-level hook | yes | confirmed |
| tests / version files | 发布一致性 | VERSION / package.json / package-lock | 锁住 metadata parity | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| Activation Gate Semantics | 判断是否读 lane | delivery-affecting / ordinary / ambiguous / explicit request | ordinary → no lane；ambiguous → one question；explicit delivery → L1 | yes | confirmed |
| Confirmation Stop Semantics | 判断是否停等用户 | authorization / scope clarity / acceptance clarity / risk / boundary | authorized + clear → proceed；unclear / high-risk / out-of-scope → stop | yes | confirmed |
| Doctor Guard Wording | 描述强制边界 | local command / host hook / pre-commit / CI / Codex local closure | command shared → enforcement depends on integration surface | yes | confirmed |
| Version Metadata Parity | 发布一致性 | VERSION / package.json / package-lock root package | bump → tests assert all three match | yes | confirmed |

## 5. 关键流程

1. 用户要求全面分析并修复 AI-OS 对 Codex 不友好或描述错误的点。
2. agent 通过 Activation Gate，读取 L1/L2 工件并建立本轮 CR。
3. agent 审计公开 docs、skill、tests、version metadata、自托管 lane 与 stale spec。
4. agent 修正确认停点、doctor guard 文案、v9 残留、package-lock 版本和 lane 自描述。
5. agent 运行 `npm test`、`npm run lint`、`node bin/create-ai-os.js doctor . --json --strict` 后收口。

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：AGENTS、README、docs/artifacts、docs/constitution-spec、docs/interop/claude-code、problem ledger、maintainers guide、official skill wrapper、docs tests、version metadata、self-hosted lane。
- **受影响的接口 / 页面清单**：AI agent task routing、Activation Gate、bugfix flow、doctor guard setup guidance、release metadata checks。
- **同仓正常实现对照**：v10.0 去版本化要求避免把 schema `9` 读成当前产品版本；v10.3 local doctor 要求日常 guard 零网络；v9.5 Activation Gate 要求普通对话不读 lane。
- **副作用清单**：不改 CLI 行为；不新增 doctor warning；不新增 Codex-only files；不改变 canonical layout；历史 changelog / old CR 的版本事实保留。

## 7. UI Source Routing（前端 UI 项目必填）

- **ui_source**：none
- **surface**：unknown
- **frontend_stack**：unknown
- **component_library**：custom
- **selection_reason**：not a frontend UI delivery
- **fidelity_level**：component-native
- **custom_required**：无 UI 实现
- **design_input.provider**：none
- **design_input.capability_used**：manual
- **design_input.evidence_refs**：用户 2026-06-18 请求 + 仓库实际文件审计
- **design_input.fallback_path**：existing-style

## 8. 对照参考（reverse-spec 必填）

- **原始参考清单**：用户要求“全面分析该项目，有哪些不适合 Codex 的点，或者本身的描述错误。修复下”。
- **字段级 / 行为级对照摘要**：确认停点从固定 wait 改为授权 / 风险 / 范围敏感；doctor guard 从同等 hook 改为 portable command；version metadata 从 VERSION/package-only 扩到 package-lock parity。
- **仍待解决差异**：AI-OS 仍不检测 Codex 宿主能力；只能描述本地 command、pre-commit 和 CI 接入边界。

## 9. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | Explicit Codex-style delivery requests no longer force ritual re-confirmation | `npm test` | AGENTS / skill / artifacts / spec assertions |
| AC-002 | REQ-002 | Doctor guard wording distinguishes hooks from Codex local / CI guard | `npm test` | README / claude-code assertions |
| AC-003 | REQ-003 | VERSION / package.json / package-lock all match 10.3.1 | `npm test` | version parity assertions |
| AC-004 | REQ-004 | Skill wrapper no longer calls current AI-OS “v9” | `npm test` | skill assertion |
| AC-005 | REQ-005 | Dogfood lane and example spec no longer describe v10.2 / removed upgrade path as current | `doctor --strict` + review | self-hosted lane files |
| AC-006 | REQ-006 | Native verification passes | `npm test` + `npm run lint` + `doctor --strict` | command outputs |

## 10. 反述确认门（设计锁定前必经）

- **agent 反述的关键设计理解**：这是 patch 级治理和文案准确性修复；用户已明确授权“分析并修复”，因此本轮可在写 CR 后继续执行。核心设计是让确认停点不误拦 Codex 明确交付请求，同时保留模糊 / 高风险 / 越界停点；doctor 强制性必须按接入面描述。
- **用户确认 / 校正**：用户 2026-06-18 明确要求全面分析并修复。
- **确认日期**：2026-06-18
