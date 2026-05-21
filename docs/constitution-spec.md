# AI Delivery Constitution Spec v1.8

Status: Stable
Version: 1.8
Last updated: 2026-05-21
Reference implementation: [create-ai-os](https://github.com/royeedai/ai-os)

## Changelog

- 1.8 (2026-05-21) — non-breaking addition: Long-Horizon Agent Reliability Loop `agent_run_review` vocabulary and doctor W078 warning for background / cloud / external / parallel agent work
- 1.7 (2026-05-21) — non-breaking addition: Activation Gate so AI-OS artifact governance applies only to delivery-affecting work, not ordinary conversation
- 1.6 (2026-05-07) — non-breaking addition: Hallucination Guard `fact_state_review` vocabulary and doctor W077 unresolved inference / unknown warning
- 1.5 (2026-05-02) — non-breaking addition: Agent Handoff + Evidence Loop fields in `tasks.yaml` and doctor W076 task evidence-loop warning
- 1.4 (2026-05-02) — non-breaking additions: CR delta lifecycle fields, bugfix spec route, URL evidence package adaptation matrix, MCP resource annotation recommendations, eval taxonomy frontmatter, and stricter doctor semantic warnings
- 1.3 (2026-05-02) — non-breaking addition: URL reverse-spec intake protocol with visual / interaction / API / backend behavior evidence and `observed` / `inferred` / `unknown` confidence
- 1.2 (2026-04-30) — non-breaking additions: artifact `layer` field (L1/L2/L3 progressive disclosure), `agentskills.io` cross-agent skill wrapping, `aios://` MCP resources URI scheme, failure-mode promotion rule, EU AI Act audit-trail mapping
- 1.1 (2026-04-22) — shared-root + lanes/default canonical layout

## 1. 目的

本规范定义一种跨 agent 通用的 AI 项目交付宪法格式，使不同 agent 在同一个项目中对齐：

- 目标确认
- 设计锁定
- 证据化完成
- 跨 session 恢复

## 2. 最低兼容要求

符合本规范的项目必须至少包含：

- 根 `AGENTS.md`
- `.ai-os/MISSION.md`
- `.ai-os/memory.md`
- `.ai-os/lanes/default/MISSION.md`
- `.ai-os/lanes/default/DESIGN.md`
- `.ai-os/lanes/default/baseline-log/`

## 3. 五条核心要求

1. 目标与用户确认优先
2. 关键设计与逻辑先锁定
3. 自适应治理
4. 证据化完成
5. 可恢复的项目记忆

## 4. Canonical layout

```text
.ai-os/
  MISSION.md
  memory.md
  framework.toml
  managed-files.tsv
  lanes/
    default/
      lane.toml
      MISSION.md
      DESIGN.md
      STATE.md
      baseline-log/
      specs/
      tasks.yaml
      risk-register.md
      release-plan.md
      verification-matrix.yaml
      design-pack/
        parity-map.md
      evals/
```

### 4.1 根层共享语义

- `.ai-os/MISSION.md`：共享宿主上下文
- `.ai-os/memory.md`：共享稳定决策

### 4.2 lane 语义

- `lanes/default/MISSION.md`：当前交付基线
- `lanes/default/STATE.md`：当前 lane 会话恢复入口
- `lanes/default/DESIGN.md`：当前 lane 关键设计

## 5. 行为规则

| 任务类型 | 必须产出 | 停点 |
|---|---|---|
| 普通对话 / 需求脑暴 / 代码解释 | 不读写 lane 工件；直接回答 | 不进入 AI-OS 工件治理 |
| 新项目 / 需求模糊 | 根层共享上下文 + lane `MISSION.md` 摘要 | 等用户确认 |
| 设计锁定 | lane `DESIGN.md` | 等用户确认 |
| 任务拆解 | lane `tasks.yaml` | 等用户确认 |
| 需求变化 | lane `baseline-log/CR-*` | 等用户确认 |
| 修复 bug | 根因 + 范围 + 计划文件 | 等用户确认 |
| 验证 | 项目原生静态校验证据 + 回归结论 | 失败先同步 |
| 交付 | 双清单 + 回滚条件 | 等用户确认收口 |

### 5.1 Activation Gate（v1.7）

兼容实现必须先判断用户请求是否属于 delivery-affecting work，再进入 AI-OS 工件治理。触发项包括改代码、改项目文档或工件、实现功能、修 bug、需求变化、验证、发布、恢复交付现场、URL reverse-spec intake 和高风险动作。

普通对话不应读取或写入 `.ai-os/lanes/*`，也不应进入 debug / plan / verification 路由。普通对话包括需求脑暴、先聊聊、代码解释、方案比较、学习提问、临时命令查询、非仓库交付任务，或用户明确说不要进入 AI-OS / 不要改项目。

若意图不清，兼容实现只问一句确认：“这是先讨论，还是要进入项目交付流程？”确认进入交付前，不加载 L1 / L2 / L3 lane 工件。

## 6. 证据化完成

- 设计确认门
- 逻辑确认门
- 实现质量门
- 交付质量门
- reverse-spec 额外 parity-gate

## 7. layout 漂移语义

- `shared-root-default-lane`：当前 canonical layout
- `root-only-legacy`：旧布局，需要 upgrade
- `hybrid-drift`：根层 lane 工件与 `lanes/default/` 并存，需要 normalize

## 8. 与原生工具的共存

- agent 原生记忆负责会话级记忆
- AI-OS 工件负责项目级共享真理源
- spec-kit / Kiro 等可与 AI-OS 并存，但 AI-OS 负责全生命周期治理

## 9. 工件加载分层（v1.2）

Activation Gate 通过后，每个工件应声明加载层级：

- **L1**：入口元数据，每次会话先读（`STATE.md` / `lane.toml` / `framework.toml`）
- **L2**：核心文档，进入对齐 / 设计 / 验证阶段时升级（`MISSION.md` / `DESIGN.md` / `memory.md` / `tasks.yaml` / `verification-matrix.yaml` / `risk-register.md` / `release-plan.md` / `AGENTS.md`）
- **L3**：详细资源，按需引用（`baseline-log/*` / `specs/*` / `design-pack/*` / `evals/*` / `managed-files.tsv`）

## 10. agentskills.io 兼容包装（v1.2）

实现可选地提供一份符合 [agentskills.io spec v1.0](https://agentskills.io/specification) 的 `SKILL.md`，让任何兼容 agent（Claude Code、Cursor、Codex、Gemini CLI、ADK、Hermes 等）通过 skill 标准加载本 spec 行为。包装本身不是新规范，只是开放标准的 wire-format。

## 11. MCP resources URI scheme（v1.2）

实现可选地通过 MCP server 暴露 AI-OS 工件，URI 用以下 scheme：

- `aios://shared/{artifact}` — 根层共享工件
- `aios://lane/{laneId}/{artifact}` — lane 工件
- `aios://lane/{laneId}/{collection}/{id}` — lane 集合（baseline-log / specs / evals）

## 12. failure mode 升格规则（v1.2）

稳定失败模式：首次发现登记到 lane `verification-matrix.yaml`；同一 root cause 命中 ≥3 次时必须升格到 `evals/<name>.md`，记录 `trigger_source: promoted-from-verification-matrix` 与 `first_baseline_id`。

## 13. EU AI Act audit-trail 映射（v1.2，非合规承诺）

`baseline-log/` + `tasks.yaml` (owner / approval_required) + `verification-matrix.yaml` + `risk-register.md` 同时承担 EU AI Act 第 12 / 14 / 17 条要求的工程层 record-keeping。具体映射见参考实现 `docs/interop/eu-ai-act.md`。本节是 spec 层叙事，不构成合规建议。

## 14. URL reverse-spec intake（v1.3）

当用户给出可访问 URL 并要求复刻需求、截图、接口或行为时，实现不得把截图观察直接当作完整需求。兼容实现应把采集结果写入现有 lane 工件：

- `design-pack/parity-map.md`：capture manifest、visual parity、interaction parity、API / interface parity、backend behavior parity
- `specs/*.spec.md`：API observation records、backend behavior records、confidence、unknowns、验收映射
- `verification-matrix.yaml`：视觉、交互、接口、后端行为信心等级和异常路径 guard

API observation record 最低字段：`id`、`trigger`、`method`、`url_pattern`、`request_shape`、`response_shape`、`status_codes`、`auth_signal`、`error_paths`、`evidence_source`、`confidence`。

Backend behavior record 最低字段：`rule_id`、`behavior`、`observed_from`、`positive_cases`、`negative_cases`、`unknowns`、`confidence`、`implementation_requirement`。

`confidence` 只允许 `observed`、`inferred`、`unknown`。只有 `observed` 可进入 confirmed acceptance criteria；`inferred` 必须标注假设；`unknown` 必须进入待确认项或非目标。

## 15. External learning fusion contracts（v1.4）

兼容实现应保持 `AGENTS.md` 极简，把更细的可靠性要求落实到工件和机械检查：

- `CR-*` baseline records 应包含 Current behavior、Proposed delta、Affected artifacts、Acceptance delta、Close/archive condition。
- bugfix specs 应锁定 root cause、reproduction、blast radius、planned files、regression guard。
- URL intake 可接收 `trace.zip`、network log / HAR、screenshots、DOM snapshots、rawHtml、markdown、structured JSON 等证据包；写入工件前必须脱敏 secrets / PII，并映射到 `observed` / `inferred` / `unknown`。
- MCP resource annotations 建议包含 `audience`、`priority`、真实文件 `lastModified`；server 可对 `STATE.md` 支持 `subscribe`，对 lane collections 支持 `listChanged`。
- eval frontmatter 可增加 `risk_source`、`failure_mode`、`harm`、`artifact_gate`，便于把失败样例从列表升级为 taxonomy。
- doctor 可用 warnings 检查 baseline delta、AC-to-verification mapping、high-risk 工件完整性和 URL evidence confidence；`--strict` 可在 CI 中升级为失败。

## 16. Agent Handoff + Evidence Loop（v1.5）

兼容实现可在 `tasks.yaml` 中为每个 task 记录 agent handoff packet 与 evidence loop：

- `handoff_to`：接收任务的 AI agent、IDE surface 或 human reviewer
- `context_refs`：执行该任务必须读取的工件路径
- `expected_return`：期望返回的 diff、PR、测试日志、review note 或运行证据
- `evidence_required`：关闭任务前必须满足的证据要求
- `evidence_produced`：任务标记 done / verified / shipped 时实际产出的证据
- `deviation_log`：实现偏离、阻塞、范围变化或应升级为 CR 的记录

该 loop 是工件治理层，不是执行层。实现不得因此要求默认 IDE plugin、agent runner、kanban server、MCP task server、worktree manager 或外部 runtime。

doctor 可用 W076 检查 task 缺 `acceptance_refs` / `evidence_required`、声明 handoff 但缺 `context_refs` / `expected_return`、或 done / verified / shipped 时缺 `evidence_produced`。

## 17. Hallucination Guard（v1.6）

兼容实现应把 AI 开发中的事实状态显式写入任务或 spec 工件，避免把猜测包装成事实。`tasks.yaml` 可使用 `fact_state_review`：

- `observed`：来自代码、日志、测试、运行、页面、接口或其他实际检查证据
- `confirmed`：来自用户确认、当前 lane `MISSION.md` / `DESIGN.md` / `specs/*` 或已确认基线
- `inferred`：agent 推断；必须保留为假设，不得进入 confirmed acceptance criteria
- `unknown`：未知；必须进入待确认项、非目标、阻塞项或新的 CR

实现进入 execution / completion 阶段时，至少应有 `observed` 或 `confirmed` 的事实来源。任务标记 done / verified / shipped 前，不得保留未解决 `inferred` / `unknown`。

doctor 可用 W077 检查执行 / 完成任务缺 `fact_state_review`，以及关闭任务时仍有未解决 `inferred` / `unknown` 的情况。

## 18. Long-Horizon Agent Reliability Loop（v1.8）

兼容实现可在 `tasks.yaml` 中为 delegated / background / cloud / external / parallel agent work 记录 `agent_run_review`。该字段是治理契约，不是执行接口：

- `execution_surface`：`local_foreground` / `cloud_background` / `external_pr_agent` / `human`
- `run_refs`：branch、PR、issue、external task URL、agent session ID 等可追回入口
- `write_scope`：owned files / modules 与 explicit out-of-scope 区域
- `progress_checkpoints`：plan accepted、diff produced、tests run、blocker surfaced、review requested
- `return_packet`：summary、changed files、tests、unresolved risks、follow-up needed
- `human_review_status`：`pending` / `reviewed` / `rejected` / `accepted`

`agent_run_review` 默认可选，只有 task 明确声明后台、云端、外部 PR agent、delegated 或 parallel execution 时才需要。既有 `handoff_to`、`context_refs`、`expected_return`、`evidence_required`、`evidence_produced` 和 `deviation_log` 仍然有效；`agent_run_review` 细化长时程执行面的回收审查。

实现不得因此新增 CLI command、flag、profile、runtime runner、MCP server、IDE hook、agent router、默认 worktree manager 或云任务调度器。

doctor 可用 W078 检查长时程 task 缺 `run_refs` / `write_scope` / `expected_return`，关闭前缺 `return_packet` / `evidence_produced` / human review，或带 unresolved risks 仍标记 done / verified / shipped。`local_foreground` 和纯 `human` task 不应触发 W078。
