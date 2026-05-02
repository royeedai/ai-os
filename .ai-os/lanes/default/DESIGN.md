# AI-OS v9.4 Agent Handoff + Evidence Loop Design

## 1. 设计目标

- **本轮设计目标**：把 IDE/agent 执行层的任务交接与证据回传沉淀为 AI-OS 的 task/evidence 工件契约和 doctor 机械检查
- **需要先锁定的关键页面 / 交互 / 接口**：不是 UI 变更；关键接口是 `tasks.yaml` 字段、W076 warning、docs/tests contracts
- **必须用户确认的核心设计决策**：不新增 CLI / slash command / IDE plugin / runtime runner，不扩大 `AGENTS.md`

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：README 保持产品边界；详细 handoff loop 进入 docs、templates、doctor 和 tests
- **一级 / 二级结构**：docs 说明契约，templates 承载字段，doctor 检查漂移，tests 固化不回退
- **关键信息优先级**：任务交给谁、依据什么上下文、期望返回什么、已产出什么证据、有哪些偏差，优先于执行叙事

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `tasks.yaml` | 表达 agent handoff packet | `handoff_to` `context_refs` `expected_return` `evidence_produced` `deviation_log` | 任务分解、执行交接、证据收口 | yes | confirmed |
| `create-ai-os doctor --strict` | 捕捉任务交接和证据闭环漂移 | W076 semantic warning | 读取 lane tasks 并输出 JSON / text | yes | confirmed |
| docs/templates | 防止 handoff 被误读为 runner | artifact schema、constitution spec、skill wrapper | 生成可审计任务与验证闭环 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| Task handoff packet | 把任务交给 IDE/agent/human 执行面 | `handoff_to` `context_refs` `expected_return` | planned → handed-off → returned | yes | confirmed |
| Evidence loop | 证明任务已按验收闭环 | `evidence_required` `evidence_produced` `acceptance_refs` | required → produced → verified | yes | confirmed |
| Deviation log | 记录实现偏离或范围调整 | `deviation_log` plus CR reference | none → observed → CR/rollback | yes | confirmed |
| W076 doctor warning | 检查任务交接语义漂移 | missing fields / done without evidence | warning → strict failure | yes | confirmed |

## 5. 关键流程

1. 用户确认 Agent Handoff + Evidence Loop 方向
2. lane 新增 CR 记录 current behavior、proposed delta、affected artifacts、acceptance delta 和 close/archive condition
3. `tasks.yaml` 模板新增 handoff/context/expected return/evidence produced/deviation log 字段
4. doctor 新增 W076，在 `--strict` 下阻断缺交接上下文或 done-without-evidence 的任务
5. docs/spec/skill/changelog 统一表达：AI-OS 管交付证明，不接管执行
6. tests 固化模板字段、W076、版本和 product-surface invariants

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：doctor CLI、framework lane templates、docs、skill wrapper、docs tests、doctor tests、version metadata
- **受影响的接口 / 页面清单**：README、docs/cli、docs/artifacts、docs/constitution-spec、docs/interop/eu-ai-act、docs/interop/cursor、framework skill、CLI JSON semantic warning list
- **同仓正常实现对照**：现有 W070-W075 semantic warning pattern、tasks owner checker、docs product-surface tests、URL evidence confidence guard；本轮延伸到 W076
- **副作用清单**：`doctor --strict` 将对 done tasks 要求 produced evidence；默认安装仍不启动执行层；任务字段增加但不改变 CLI 行为

## 7. 对照参考（reverse-spec 必填）

- **原始参考清单**：Traycer implementation verification、Task Master / Shrimp task DAG、Agent OS standards + specs、BMAD role gates、Spec Kit plan/tasks、OpenSpec delta、PRP context packet
- **字段级 / 行为级对照摘要**：吸收 task handoff、context refs、expected return、produced evidence、deviation log、done-without-evidence guard；不吸收角色扮演、kanban runner、worktree automation、IDE plugin 或 task server
- **仍待解决差异**：未内置 agent execution adapter、MCP task server、PR orchestrator、kanban UI、worktree lifecycle manager

## 8. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | lane 和分发模板中的 `tasks.yaml` 包含 handoff/context/expected return/produced evidence/deviation log 字段 | `npm test` | `test/docs.test.js` |
| AC-002 | REQ-002 | doctor 新增 W076，能发现缺 acceptance/evidence、handoff 无 context/return、done 无 produced evidence 的任务 | `npm test` + `doctor --json --strict` | `test/doctor.test.js` |
| AC-003 | REQ-003 | docs/spec/skill 说明 handoff loop 是工件契约，不是 IDE/runner/orchestrator | `npm test` | `test/docs.test.js` |
| AC-004 | REQ-004 | self-hosted lane 的任务、验证矩阵和 CR 均映射到 v9.4 基线且 strict doctor 无警告 | `node bin/create-ai-os.js doctor . --json --strict` | `.ai-os/lanes/default/*` |
| AC-005 | REQ-005 | version/changelog/tests 对齐到 v9.4.0，CLI surface 仍保持 3 primary product operations / 1 bin / 4 bin scripts | `npm test` + `npm run lint` | version/product-surface tests |

## 9. 设计确认记录

- 2026-05-02：项目 owner 确认将 Agent Handoff + Evidence Loop 作为下一轮融合主题，限定为工件契约、doctor、docs 和 tests，不新增执行层
