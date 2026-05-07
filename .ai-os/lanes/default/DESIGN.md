# AI-OS v9.5 Hallucination Guard Design

## 1. 设计目标

- **本轮设计目标**：把 AI 开发幻觉抑制从口号转成任务级事实状态记录与 doctor 机械检查
- **需要先锁定的关键页面 / 交互 / 接口**：不是 UI 变更；关键接口是 `tasks.yaml` 的 `fact_state_review` 字段、W077 warning、docs/tests contracts
- **必须用户确认的核心设计决策**：不新增 CLI / slash command / IDE plugin / runtime runner，不复制外部 prompt pack 作为第二真理源

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：README 保持产品边界；详细 hallucination guard 进入 docs、templates、doctor 和 tests
- **一级 / 二级结构**：docs 说明事实状态，templates 承载字段，doctor 检查漂移，tests 固化不回退
- **关键信息优先级**：观察到什么、确认了什么、推断了什么、仍未知什么，优先于 agent 自信叙事

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `tasks.yaml` | 表达 task fact-state review | `fact_state_review.observed` `confirmed` `inferred` `unknown` | 任务执行、证据收口、未知项处理 | yes | confirmed |
| `create-ai-os doctor --strict` | 捕捉事实状态漂移 | W077 semantic warning | 读取 lane tasks 并输出 JSON / text | yes | confirmed |
| docs/templates | 防止 hallucination guard 被误读为 prompt pack | artifacts、constitution spec、skill wrapper | 生成可审计任务事实状态 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| Fact-state review | 记录任务依据的事实状态 | `observed` `confirmed` `inferred` `unknown` | unknown/inferred → confirmed/observed 或 pending/non-goal/CR | yes | confirmed |
| W077 doctor warning | 检查任务事实状态语义漂移 | missing observed/confirmed; closed with inferred/unknown | warning → strict failure | yes | confirmed |
| Hallucination failure guard | 防止推断冒充事实 | `verification-matrix.yaml` failure mode | first occurrence → guard; repeated root cause → eval | yes | confirmed |

## 5. 关键流程

1. 用户授权 Hallucination Guard 方向和 maintainer agent 自主执行
2. lane 新增 CR 记录 current behavior、proposed delta、affected artifacts、acceptance delta 和 close/archive condition
3. `tasks.yaml` 模板新增 `fact_state_review`
4. doctor 新增 W077，在 `--strict` 下阻断缺事实状态或 closed-with-unresolved-assumptions 的任务
5. docs/spec/skill/changelog 统一表达：AI-OS 管事实状态证据，不接管执行、不复制外部 prompt pack
6. tests 固化模板字段、W077、版本和 product-surface invariants

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：doctor CLI、framework lane templates、docs、skill wrapper、docs tests、doctor tests、version metadata
- **受影响的接口 / 页面清单**：README、AGENTS、docs/cli、docs/artifacts、docs/constitution-spec、docs/interop/eu-ai-act、docs/interop/cursor、framework skill、CLI JSON semantic warning list
- **同仓正常实现对照**：现有 W070-W076 semantic warning pattern、tasks owner checker、handoff evidence loop checker、URL evidence confidence guard；本轮延伸到 W077
- **副作用清单**：`doctor --strict` 将对执行/关闭任务要求 fact-state review；默认安装仍不启动执行层；任务字段增加但不改变 CLI 命令 surface

## 7. 对照参考（reverse-spec 必填）

- **原始参考清单**：Karpathy-inspired Claude Code Guidelines / forrestchang `andrej-karpathy-skills` 的 think-before-coding、simplicity、surgical-change、goal-driven execution 背景；AI-OS 既有 URL confidence、handoff evidence loop、failure-mode promotion
- **字段级 / 行为级对照摘要**：吸收“不要把假设静默当事实”的核心失败模式；不吸收外部仓库文件结构、Claude 专有安装方式、prompt pack 分发或全量文案
- **仍待解决差异**：未内置自动澄清、runtime fact tracer、IDE hook 或 model-level hallucination detector

## 8. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | lane 和分发模板中的 `tasks.yaml` 包含 `fact_state_review` 与 `observed` / `confirmed` / `inferred` / `unknown` | `npm test` | `test/docs.test.js` |
| AC-002 | REQ-002 | doctor 新增 W077，能发现缺 observed/confirmed fact state、closed task 保留 inferred / unknown，并在修复后清除 | `npm test` + `doctor --json --strict` | `test/doctor.test.js` |
| AC-003 | REQ-003 | docs/spec/skill 说明 hallucination guard 是工件治理，不是外部 prompt pack 或 runtime layer | `npm test` | `test/docs.test.js` |
| AC-004 | REQ-004 | self-hosted lane 的任务、验证矩阵和 CR 均映射到 v9.5 基线且 strict doctor 无警告 | `node bin/create-ai-os.js doctor . --json --strict` | `.ai-os/lanes/default/*` |
| AC-005 | REQ-005 | version/changelog/tests 对齐到 v9.5.0，CLI surface 仍保持 3 primary product operations / 1 bin / 4 bin scripts | `npm test` + `npm run lint` | version/product-surface tests |

## 9. 设计确认记录

- 2026-05-07：项目 owner 授权 AI-OS maintainer agent 作为项目负责人决定并完成 Hallucination Guard 的开发、验证、提交和推送到 `main`
