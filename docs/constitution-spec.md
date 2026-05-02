# AI Delivery Constitution Spec v1.3

Status: Stable
Version: 1.3
Last updated: 2026-05-02
Reference implementation: [create-ai-os](https://github.com/royeedai/ai-os)

## Changelog

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
| 新项目 / 需求模糊 | 根层共享上下文 + lane `MISSION.md` 摘要 | 等用户确认 |
| 设计锁定 | lane `DESIGN.md` | 等用户确认 |
| 任务拆解 | lane `tasks.yaml` | 等用户确认 |
| 需求变化 | lane `baseline-log/CR-*` | 等用户确认 |
| 修复 bug | 根因 + 范围 + 计划文件 | 等用户确认 |
| 验证 | 项目原生静态校验证据 + 回归结论 | 失败先同步 |
| 交付 | 双清单 + 回滚条件 | 等用户确认收口 |

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

每个工件应声明加载层级：

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
