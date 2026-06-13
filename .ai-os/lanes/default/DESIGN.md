# AI-OS v10.2 Product Design Optional Bridge Design

## 1. 设计目标

- **本轮设计目标**：把 Product Design 从 Codex 专属体验降级为 AI-OS 可选设计证据来源，保留完整 Product Design workflow 能力，并让无插件 IDE 走同一工件契约。
- **需要先锁定的关键页面 / 交互 / 接口**：关键对象不是 UI 页面，而是 `design_input`、Product Design workflow mapping、fallback path、handoff evidence reuse 和 no-hard-dependency 边界。
- **必须用户确认的核心设计决策**：Product Design 作为推荐可选能力，不进入 AI-OS 核心依赖；无插件场景必须继续可用。

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：README 用户心智 → Product Design interop → artifacts schema → lane template → skill routing → verification guard
- **一级 / 二级结构**：optional provider detection → Product Design workflow mapping → no-plugin fallback → evidence return → native verification
- **关键信息优先级**：跨 IDE 可用性优先于插件便利性；Product Design 产物进入 evidence，不替代 AI-OS 验证。

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `docs/interop/product-design.md` | 说明可选桥接 | workflow mapping / fallback / boundaries | 告诉 agent 如何用 Product Design 和如何降级 | yes | confirmed |
| `docs/artifacts.md` | 定义通用字段 | `design_input` schema | 让各 IDE 只依赖通用 evidence refs | yes | confirmed |
| lane `DESIGN.md` template | 新项目记录位置 | design input evidence references | 保存 Product Design 或 fallback 证据 | yes | confirmed |
| `tasks.yaml` template | 证据回收 | handoff / expected_return / evidence_produced | 复用现有 task evidence loop | yes | confirmed |
| skill wrapper | 执行层路由 | Product Design optional branch + fallback | 指导 agent 不硬依赖插件 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| Design Input Evidence | 记录设计输入来源 | `provider`, `capability_used`, `evidence_refs`, `fallback_path` | source detected → evidence recorded → validation scoped | yes | confirmed |
| Product Design Workflow Mapping | 把插件产物接入 AI-OS | brief, ideation, prototype, image-to-code, design-qa, share | workflow output → task evidence → native verification | yes | confirmed |
| No-plugin Fallback | 保证其他 IDE 可用 | figma, screenshot, url-reverse-spec, component-first, existing-style | plugin unavailable → fallback selected → same fields populated | yes | confirmed |

## 5. 关键流程

1. 用户要求 UI / prototype / design-led work。
2. agent 判断 Product Design 是否可用，以及是否已有视觉来源。
3. 有 Product Design：先按 Product Design brief gate，必要时进入 ideation / prototype / image-to-code / design-qa / share。
4. agent 把 brief、visual option、prototype link、QA screenshot 或 share URL 作为 evidence refs 写入 AI-OS。
5. 无 Product Design：走 Figma、截图、URL reverse-spec、existing-code、existing-style 或 component-first fallback。
6. 任务关闭前仍运行项目原生静态校验，并把 code / data / runtime 状态拆开交付。

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：README、docs/artifacts、docs/constitution-spec、docs/interop、official skill wrapper、lane DESIGN / tasks / verification templates、problem ledger、maintainers、version metadata、docs tests、自托管 lane artifacts。
- **受影响的接口 / 页面清单**：AI agent behavior routing、DESIGN.md schema guidance、task evidence return contract、UI parity verification guards、interop docs。
- **同仓正常实现对照**：v9.4 handoff、v9.6 long-horizon、v9.9 UI source routing 均把外部执行 / 设计能力映射进工件，不新增运行时；本轮沿用同一模式。
- **副作用清单**：不改 AGENTS.md；不扩大 doctor warning range；不引入第三方依赖；interop 新文档保持 ≤200 行；constitution spec 保持 ≤160 行。

## 7. UI Source Routing（前端 UI 项目必填）

- **ui_source**：design-led / component-first / existing-style / hybrid
- **surface**：admin-pc / business-pc / business-mobile / consumer
- **frontend_stack**：vue / react / uni-app / taro / mini-program / unknown
- **component_library**：existing / element-plus / antd / vant / antd-mobile / tdesign / arco / uview / nutui / uni-ui / custom
- **selection_reason**：existing dependency / user specified / stack default / ecosystem fit
- **fidelity_level**：strict / practical / component-native
- **custom_required**：仅记录组件库无法覆盖的品牌视觉、特殊布局、动效或还原要求
- **design_input.provider**：product-design / figma / url / screenshot / existing-code / manual-brief / none
- **design_input.capability_used**：brief / ideation / prototype / image-to-code / design-qa / share / manual
- **design_input.evidence_refs**：brief、selected visual option、prototype URL、QA screenshot、Figma frame、URL capture 或人工确认记录
- **design_input.fallback_path**：figma / screenshot / url-reverse-spec / component-first / existing-style

## 8. 对照参考（reverse-spec 必填）

- **原始参考清单**：用户 2026-06-13 要求“完整使用 Product Design 的能力”和“不影响其他 IDE”。
- **字段级 / 行为级对照摘要**：将 Product Design 能力接入 AI-OS 的通用 `design_input` / evidence loop；无插件时同字段接受 Figma、截图、URL、existing code 或 manual brief。
- **仍待解决差异**：AI-OS 不检测 Product Design 安装状态；实际 agent 只在当前 shell / IDE 可见能力内判断可用性。

## 9. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | 新增 Product Design interop 文档，覆盖 workflow mapping、fallback 和 no-hard-dependency 边界 | `npm test` | `docs/interop/product-design.md` |
| AC-002 | REQ-002 | artifacts 和 DESIGN template 记录 `design_input` provider / capability / evidence / fallback | `npm test` | `docs/artifacts.md`、`framework/.agents/templates/lane/DESIGN.md` |
| AC-003 | REQ-003 | tasks template 和 skill wrapper 说明 Product Design 输出复用现有 handoff/evidence loop，不新增字段 | `npm test` | `framework/.agents/templates/lane/tasks.yaml`、`framework/skills/ai-os-delivery/SKILL.md` |
| AC-004 | REQ-004 | verification matrix 覆盖插件硬依赖、无 fallback、QA 替代原生验证等 failure modes | `npm test` | `framework/.agents/templates/lane/verification-matrix.yaml` |
| AC-005 | REQ-005 | 不新增 CLI、runtime、doctor warning、MCP server、IDE adapter 或 Product Design 硬依赖 | `npm test` + `npm run lint` | product surface tests |
| AC-006 | REQ-006 | v10.2.0 版本、changelog、自托管 lane 和原生验证收口 | `npm test` + `npm run lint` + `doctor --strict` | version tests + doctor output |

## 10. 反述确认门（设计锁定前必经）

- **agent 反述的关键设计理解**：Product Design 是可选设计证据提供方；AI-OS 接收其 brief、视觉方案、prototype、image-to-code、design QA 和 share 产物，但用通用 `design_input` + task evidence 表达；无插件 IDE 走 Figma / screenshot / URL reverse-spec / component-first / existing-style fallback。
- **用户确认 / 校正**：用户 2026-06-13 明确要求实现已提计划，并补充“需要能完整使用 Product Design 的能力和不影响其他 IDE 的方式”。
- **确认日期**：2026-06-13
