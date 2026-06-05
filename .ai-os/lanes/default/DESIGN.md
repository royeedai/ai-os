# AI-OS v9.6 Long-Horizon Agent Reliability Design

## 1. 设计目标

- **本轮设计目标**：在不新增执行层的前提下，让长时程 / 后台 / 外部 PR / 并行 agent work 有可审查的委托边界、运行引用、返回包、证据和人工审查状态
- **需要先锁定的关键页面 / 交互 / 接口**：关键接口是 `tasks.yaml` optional `agent_run_review`、doctor W078、docs / skill wrapper / interop 示例和 product boundary wording
- **必须用户确认的核心设计决策**：采用 governance contract only；不新增 CLI、runtime、MCP server、IDE hook、agent router 或 vendor adapter

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：README 说明 long-horizon task routing；artifacts docs 和 spec 定义字段；interop doc 给工具中立流程；example 展示委托与回收；doctor W078 做机械检查
- **一级 / 二级结构**：Activation Gate → existing handoff loop → `agent_run_review` → return packet / human review → evidence closure
- **关键信息优先级**：是否长时程执行优先于字段强制；local foreground 和 human task 不触发 W078

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| README | 给用户建立长时程 agent 回收心智 | background / cloud / PR agent row、no runtime boundary | 说明只记录审查，不执行任务 | yes | confirmed |
| `docs/artifacts.md` | 定义字段语义 | `agent_run_review` 字段列表、W078 语义 | 说明 optional by default | yes | confirmed |
| `docs/interop/standards-map.md` | 跨工具执行面映射（v9.8 起由 standards-map 承载） | Codex、Cursor、GitHub Copilot cloud agent、Jules、Claude Code | vendor 名称仅作 surface 示例 | yes | confirmed |
| `bin/ai-os-doctor.js` | 机械检查 | W078 | 长时程 task 缺回收证据时 warning | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `agent_run_review` | 记录长时程 agent work 的执行面与回收审查 | `execution_surface`, `run_refs`, `write_scope`, `progress_checkpoints`, `return_packet`, `human_review_status` | pending → reviewed / rejected / accepted | yes | confirmed |
| W078 | 检查长时程 work 可审查性 | run refs, write scope, expected return, evidence, return packet, human review, unresolved risks | warning by default; strict blocks | yes | confirmed |
| Public version contract | 说明本轮为兼容 minor | `9.6.0`, spec `v1.8` | no CLI / runtime change | yes | confirmed |

## 5. 关键流程

1. 用户要求实现 v9.6 Long-Horizon Agent Reliability
2. lane 新增 CR，说明当前长时程 agent work 回收不可审查风险、拟议字段、影响工件和验收条件
3. 模板和 docs 增加 `agent_run_review`
4. doctor 新增 W078，只在 task 明确声明 background / cloud / external / parallel execution 时触发
5. interop doc 和 example 覆盖委托前、运行中、返回后、失败升级
6. docs tests、doctor tests、version metadata、changelog 和 self-hosted lane 更新
7. `npm test`、`npm run lint`、`doctor --json --strict` 完成收口

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：templates/lane/tasks.yaml、templates/lane/verification-matrix.yaml、doctor、README、docs/artifacts、docs/constitution-spec、docs/cli、official skill wrapper、docs tests、doctor tests、version metadata、self-hosted lane artifacts
- **受影响的接口 / 页面清单**：How agents use AI-OS、task schema docs、Semantic consistency warnings、Skill routing table、interop docs、problem ledger
- **同仓正常实现对照**：v9.4 W076 和 v9.5 W077 都是 optional task-level governance + doctor warning；本轮沿用同一方式增加 W078
- **副作用清单**：clean install template placeholders 不应触发 W078；local foreground task 不应触发 W078；cloud/background/external/parallel task 缺 review fields 应触发 W078

## 7. 对照参考（reverse-spec 必填）

- **原始参考清单**：用户指定 GPT-5.5 / Codex、Cursor、Jules、GitHub Copilot cloud agent、Claude Code subagents/hooks 等最新 AI coding 生态趋势
- **字段级 / 行为级对照摘要**：吸收长时程、后台、并行、可审查交付的治理契约；不吸收 vendor API、后台 runner、hooks runtime、PR automation 或云执行能力
- **仍待解决差异**：AI-OS 无法强制外部 agent 返回标准 packet，只能通过 task contract、doctor warning 和 review checklist 约束接受条件

## 8. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | `tasks.yaml` 模板和 artifacts/spec/skill docs 定义 `agent_run_review` 字段及 optional-by-default 语义 | `npm test` | `test/docs.test.js` |
| AC-002 | REQ-002 | doctor W078 只检查明确长时程 / 后台 / 外部 / 并行执行的 task，local foreground 不触发 | `npm test` | `test/doctor.test.js` |
| AC-003 | REQ-003 | W078 检查缺 run refs、write scope、expected return、return packet、evidence、human review、unresolved risks | `npm test` | `test/doctor.test.js` |
| AC-004 | REQ-004 | interop doc 和 example 覆盖 Codex、Cursor Background Agents、GitHub Copilot cloud agent、Jules、Claude Code subagents/hooks，且保持 tool-neutral | `npm test` | `docs/interop/standards-map.md`, `examples/background-agent-handoff.md` |
| AC-005 | REQ-005 | 不新增 CLI、flag、profile、runtime runner、MCP server、IDE hook、agent router 或 schema version | `npm test` + `npm run lint` | product-surface tests |
| AC-006 | REQ-006 | version/changelog/tests 对齐到 9.6.0 / spec v1.8，self-hosted lane strict doctor 无警告 | `npm test` + `doctor --json --strict` | version tests + `.ai-os/lanes/default/*` |

## 9. 设计确认记录

- 2026-05-21：用户要求实现 AI-OS v9.6 Long-Horizon Agent Reliability 方案；默认策略为 governance contract only，优先长时程交付可靠性
