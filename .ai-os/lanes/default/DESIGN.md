# AI-OS v9.9 Design-Aware Component-First UI Design

## 1. 设计目标

- **本轮设计目标**：把前端 UI 交付治理从“是否有设计稿”扩展为“UI 来源 + 组件实现路径 + 还原等级 + 业务验收”的稳定契约
- **需要先锁定的关键页面 / 交互 / 接口**：关键对象不是具体页面，而是 `ui_source`、`component_library`、`fidelity_level`、组件选择优先级和不能跳过的业务状态验收
- **必须用户确认的核心设计决策**：采用 Design-Aware Component-First UI；不新增模板库 / CLI / runtime；默认组件库选择偏国内团队熟悉的成熟库

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：AGENTS 原则 → README 用户心智 → artifacts 字段 schema → constitution spec 摘要 → skill routing → lane template → verification guard
- **一级 / 二级结构**：UI source routing → component selection → fidelity level → custom-only gaps → business state verification
- **关键信息优先级**：项目已有组件库优先；设计稿目标效果优先；组件库默认风格只在无设计稿时作为 UI 基线

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| README | 建立用户心智 | Design-aware component-first UI section | 说明有设计稿和无设计稿的不同路径 | yes | confirmed |
| AGENTS.md | 约束 agent 行为 | 前端 UI 来源判定原则 | 阻止跳过业务逻辑 / 权限 / 状态 | yes | confirmed |
| `docs/artifacts.md` | 定义字段写法 | `ui_source`, `surface`, `component_library`, `fidelity_level` | 指导 DESIGN.md 记录 | yes | confirmed |
| `framework/skills/ai-os-delivery/SKILL.md` | 执行层路由 | Frontend UI work + source routing section | 指导 AI 先扫现有组件库再选择 | yes | confirmed |
| lane DESIGN template | 新项目默认工件 | UI Source Routing section | 让前端项目有固定记录位置 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| UI Source Routing | 记录前端 UI 来源 | `design-led`, `component-first`, `existing-style`, `hybrid` | input observed → strategy selected → validation scoped | yes | confirmed |
| Component Selection | 记录组件库选择 | existing dependency, user specified, stack default, ecosystem fit | inspect deps → choose / ask → record reason | yes | confirmed |
| Fidelity Level | 控制还原程度 | `strict`, `practical`, `component-native` | design requirement → implementation policy → acceptance | yes | confirmed |

## 5. 关键流程

1. 用户要求开发 UI 页面或前端功能
2. AI 判断是否有设计稿、现有页面或已有项目组件库
3. 若有设计稿：设计稿作为目标；标准元素优先用项目组件库实现；无法覆盖时封装或定制
4. 若无设计稿：后台 / PC 业务 / 移动业务页默认用现有或栈匹配组件库；强视觉 C 端先确认风格风险
5. AI 在 DESIGN.md 记录 `ui_source`、`component_library`、`selection_reason`、`fidelity_level` 和 `custom_required`
6. 验证覆盖 build / lint / typecheck、表单校验、权限、loading / empty / error、接口失败、响应式适配和组件库选择原因

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：AGENTS、README、artifacts docs、constitution spec、official skill wrapper、lane DESIGN template、verification-matrix template、problem ledger、docs tests、version metadata、self-hosted lane artifacts
- **受影响的接口 / 页面清单**：AI agent behavior routing、DESIGN.md schema guidance、verification matrix failure modes、README product narrative
- **同仓正常实现对照**：v9.6 / v9.7 / v9.8 均采用 docs + template + tests 固化治理契约，不新增 runtime；本轮沿用同一方式
- **副作用清单**：AGENTS.md 必须继续 ≤150 行；constitution spec 必须保持瘦身后的摘要风格；不扩大 doctor warning range；不引入第三方依赖

## 7. UI Source Routing（前端 UI 项目必填）

- **ui_source**：design-led / component-first / existing-style / hybrid
- **surface**：admin-pc / business-pc / business-mobile / consumer
- **frontend_stack**：vue / react / uni-app / taro / mini-program / unknown
- **component_library**：existing / element-plus / antd / vant / antd-mobile / tdesign / arco / uview / nutui / uni-ui / custom
- **selection_reason**：existing dependency / user specified / stack default / ecosystem fit
- **fidelity_level**：strict / practical / component-native
- **custom_required**：仅记录组件库无法覆盖的品牌视觉、特殊布局、动效或还原要求

## 8. 对照参考（reverse-spec 必填）

- **原始参考清单**：用户 2026-06-06 关于后台、PC、App、有设计稿 / 无设计稿、国内熟悉组件库的多轮确认
- **字段级 / 行为级对照摘要**：将用户目标收敛为 design-aware component-first UI；不引入大量模板；保留设计稿优先和组件复用并存
- **仍待解决差异**：不维护组件库实时版本 / 生态活跃度；实际项目仍需读取 package.json 和项目代码确认真实栈

## 9. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | AGENTS / README / artifacts / spec / skill 均说明 UI source routing 和 design-aware component-first 原则 | `npm test` | `test/docs.test.js` |
| AC-002 | REQ-002 | DESIGN template 提供 `ui_source`、`component_library`、`fidelity_level`、`custom_required` 记录位置 | `npm test` | `framework/.agents/templates/lane/DESIGN.md` |
| AC-003 | REQ-003 | verification matrix 覆盖有设计稿偏离、无设计稿手搓、组件优先跳过业务状态等 failure modes | `npm test` | `framework/.agents/templates/lane/verification-matrix.yaml` |
| AC-004 | REQ-004 | 默认组件库选择策略符合国内团队常用栈，且现有依赖优先 | `npm test` | README / artifacts / skill assertions |
| AC-005 | REQ-005 | 不新增 CLI、runtime、doctor warning 或页面模板库 | `npm test` + `npm run lint` | product surface tests |
| AC-006 | REQ-006 | 版本、changelog、自托管 lane 和原生验证收口 | `npm test` + `npm run lint` + `doctor --strict` | version tests + doctor output |

## 10. 设计确认记录

- 2026-06-06：用户确认“有设计图要求的就用设计图，没设计的就都用组件库；有设计稿也能用组件的就用组件”，并要求开始落地到 AI-OS
