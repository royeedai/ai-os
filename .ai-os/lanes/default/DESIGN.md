# AI-OS Codex Field Feedback Design

## 1. 设计目标

- **本轮设计目标**：把本机 Codex AI-OS 实战反馈转成可恢复、可验证、可跨 surface 使用的治理 guard，并在全文审计后发布 v10.5.1。
- **需要先锁定的关键页面 / 交互 / 接口**：field feedback evidence doc、problem-ledger、evals、docs/artifacts、README、maintainers、skill wrapper、lane templates、docs tests。
- **必须用户确认的核心设计决策**：用户已审核并要求开始执行，后续又明确要求审核无误后提交推送发新版本；本轮只增强治理材料，不新增 runtime / CLI / doctor warning / artifact category。

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：CR → evidence doc → problem ledger → evals → artifacts schema → lane templates → skill / README → docs tests。
- **一级 / 二级结构**：accepted optimizations → rejected / deferred optimizations → future doctor candidates → maintainer mapping order。
- **关键信息优先级**：先命名重复问题，再说明如何用现有工件承载，最后明确不做的产品 surface。

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `docs/codex-aios-field-feedback.md` | 证据包 | accepted / rejected scope | 记录 field feedback 与映射顺序 | yes | confirmed |
| `docs/problem-ledger.md` | 稳定问题台账 | PL-025 | 防止重复 drift 留在聊天记录 | yes | confirmed |
| `evals/*.md` | 回归样例 | release truth / environment / ledger / baseline | 未来规则修改时保留 failure mode | yes | confirmed |
| `framework/.agents/templates/lane/verification-matrix.yaml` | 新项目继承 guard | field-feedback-closeout impact rule | 把检查落到 lane 验证矩阵 | yes | confirmed |
| `test/docs.test.js` | 原生验证 | docs assertions | 防止文档 / 模板 / eval 漂移 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| Release truthfulness review | 发布 / 提交 / 上线请求收口 | latest user request / STATE / release-plan / tasks / evidence | requested → planned / blocked / manual / done | yes | confirmed |
| Verification environment classification | 验证失败归因 | product-code / local-environment / external-service / production-state-unknown | failure → classify → repair / environment action / blocker | yes | confirmed |
| Task ledger conflict review | git 操作后恢复任务真相 | task IDs / baseline_id / status / evidence_produced / deviation_log | pull / stash / rebase → review → align / CR | yes | confirmed |
| Baseline artifact interpretation | install / legacy / generated artifact 解释 | current / legacy / generated / non-goal / pending cleanup | observe → classify → use or ignore | yes | confirmed |

## 5. 关键流程

1. 建立 field feedback CR 与证据包。
2. 将重复 root cause 登记到 PL-025。
3. 为四类 failure mode 新增 eval。
4. 更新 artifacts、README、maintainers、skill 和 lane templates。
5. 在 docs tests 中断言证据包、模板、evals 和 no-surface boundary。
6. 全面审计本次 diff、AGENTS、README、docs、templates、evals、doctor/test 契约和 self-hosted lane。
7. bump v10.5.1，运行 `npm test`、`npm run lint`、`node bin/create-ai-os.js doctor . --json --strict`。
8. commit、push origin/main、tag v10.5.1。

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：README、docs/artifacts、docs/maintainers、docs/problem-ledger、official skill wrapper、lane templates、evals、docs tests、self-hosted lane、root memory。
- **受影响的接口 / 页面清单**：AI-OS closeout guidance、verification matrix impact rules、tasks template evidence guidance、eval catalog。
- **同仓正常实现对照**：v10.4 用 maintenance_review 承载 drift evidence；v10.5 用 Boundary Evolution Policy 拦住无证据产品 surface。本轮沿用两者。
- **副作用清单**：不改 AGENTS 分发宪法、不改 CLI 行为、不新增 doctor warning、不新增 artifact category；本轮会 bump v10.5.1、commit、push、tag，npm publish 不在范围内。

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
- **design_input.evidence_refs**：用户 2026-06-19 field feedback 执行请求 + local Codex rollout scan summary + public AI coding market audit
- **design_input.fallback_path**：existing-style

## 8. 对照参考（reverse-spec 必填）

- **原始参考清单**：用户要求“读本地所有 codex 开发项目的记录使用了 ai os 的”“审核计划”“开始执行”；前序审核给出的 narrowed plan。
- **字段级 / 行为级对照摘要**：计划要求 CR/evidence/docs/templates/evals/tests；加入 release truthfulness 与 verification environment classification；defer doctor warning；reject auto-release / runtime / platform scripts。
- **仍待解决差异**：未来是否把 deterministic candidates 做成 doctor warning，需另开 CR。

## 9. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | Field feedback evidence doc records problem classes, accepted scope, rejected scope, and doctor candidates | `npm test` | docs assertions |
| AC-002 | REQ-002 | PL-025 maps recurring Codex AI-OS field failures to concrete coverage anchors | `npm test` | problem-ledger assertions |
| AC-003 | REQ-003 | Four evals cover release truth drift, environment misclassification, task ledger conflict drift, and baseline artifact misread | `npm test` | eval assertions |
| AC-004 | REQ-004 | Lane templates expose field-feedback-closeout guard without new schema category | `npm test` | template assertions |
| AC-005 | REQ-005 | Docs and skill preserve no CLI / runtime / doctor warning / artifact category boundary | `npm test` + strict doctor | no-surface assertions |
| AC-006 | REQ-006 | Native verification and release checks pass; v10.5.1 metadata aligns before commit / push / tag | `npm test` + `npm run lint` + `doctor --strict` + `git diff --check` + git push / tag | command outputs + git refs |

## 10. 反述确认门（设计锁定前必经）

- **agent 反述的关键设计理解**：本轮不是增强 AI-OS 执行能力，而是把 Codex 实战中重复出现的交付真相和证据分类问题沉淀为现有工件 guard；发布动作只限 v10.5.1 commit / push / tag，不新增运行时、CLI、doctor warning 或 release automation。
- **用户确认 / 校正**：用户 2026-06-19 表示“开始执行”，随后要求“都没问题后再提交推送发新版本”。
- **确认日期**：2026-06-19
