# AI Delivery Constitution Spec v2.0

Status: Stable  
Version: 2.0  
Last updated: 2026-06-05  
Reference implementation: [create-ai-os](https://github.com/royeedai/ai-os)

## Changelog

- 2.0 (2026-06-05) — **dedup only, contract unchanged**: extended schema sections (URL reverse-spec, handoff, hallucination guard, long-horizon, framework feedback) now reference [`docs/artifacts.md`](artifacts.md) as the single schema truth source instead of repeating field lists. Open-standard tool mappings consolidated into [`docs/interop/standards-map.md`](interop/standards-map.md).
- 1.9 (2026-05-25) — Framework feedback loop (`## Preventability review`, retrospective baseline-log)
- 1.8 (2026-05-21) — Long-Horizon Agent Reliability Loop (`agent_run_review`, W078)
- 1.7 (2026-05-21) — Activation Gate
- 1.6 (2026-05-07) — Hallucination Guard (`fact_state_review`, W077)
- 1.5 (2026-05-02) — Agent Handoff + Evidence Loop (W076)
- 1.4 – 1.2 — External learning fusion, URL reverse-spec, progressive disclosure, open standards
- 1.1 (2026-04-22) — shared-root + `lanes/default/` canonical layout

## 1. 目的

本规范定义一种跨 agent 通用的 AI 项目交付宪法格式，使不同 agent 在同一个项目中对齐：目标确认、设计锁定、证据化完成、跨 session 恢复。

## 2. 最低兼容要求

符合本规范的项目必须至少包含：

- 根 `AGENTS.md`
- `.ai-os/MISSION.md`、`.ai-os/memory.md`
- `.ai-os/lanes/default/MISSION.md`、`.ai-os/lanes/default/DESIGN.md`
- `.ai-os/lanes/default/baseline-log/`

## 3. 五条核心要求

1. 目标与用户确认优先  
2. 关键设计与逻辑先锁定  
3. 自适应治理  
4. 证据化完成  
5. 可恢复的项目记忆  

完整行为规则见根 `AGENTS.md`（≤150 行）。

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
      design-pack/parity-map.md
      evals/
```

- 根层 `.ai-os/MISSION.md`：共享宿主上下文  
- lane `MISSION.md`：当前交付基线  
- lane `STATE.md`：当前 lane 会话恢复入口（不入版本控制）

## 5. 行为规则与 Activation Gate

| 任务类型 | 必须产出 | 停点 |
|---|---|---|
| 普通对话 / 脑暴 / 解释 | 不读写 lane 工件 | 不进入治理 |
| 新项目 / 需求模糊 | 根层共享上下文 + lane `MISSION.md` | 等用户确认 |
| 设计锁定 | lane `DESIGN.md` | 等用户确认 |
| 需求变化 | lane `baseline-log/CR-*` | 等用户确认 |
| 修复 bug | 根因 + 范围 + 计划文件 | 等用户确认 |
| 验证 / 交付 | 项目原生证据 + 双清单 | 等用户确认 |

**Activation Gate（v1.7）**：只有 delivery-affecting work 才进入 AI-OS 工件治理。普通对话不得读取或写入 `.ai-os/lanes/*`。意图不清时只问一句确认，确认前不加载 L1/L2/L3。

## 6. 证据化完成

设计确认门、逻辑确认门、实现质量门、交付质量门；reverse-spec 额外 parity-gate。模型 self-verification 不等同于项目级证据化完成。

## 7. Canonical layout

- 只有一种 canonical layout：`shared-root-default-lane`（共享根 + `.ai-os/lanes/default/`）

## 8. 与原生工具共存

- agent 原生记忆：会话级  
- AI-OS 工件：项目级共享真理源（Layers 2–3）  
- 开发者级 global rules：各 shell home 目录（Layer 4），AI-OS 不拥有 — 见 [`docs/interop/standards-map.md`](interop/standards-map.md)  
- spec-kit / Kiro / BMAD / OpenSpec：可并存，每类工件只承认一个真理源

## 9. 工件加载分层（L1 / L2 / L3）

Activation Gate 通过后渐进加载：L1 入口（`STATE.md` / `lane.toml`）→ L2 核心（`MISSION.md` / `DESIGN.md` / `tasks.yaml` / …）→ L3 按需（`baseline-log/` / `specs/` / `evals/`）。详见 [`docs/artifacts.md`](artifacts.md)「加载分层」。

## 10. 开放标准适配（wire-format only）

| 标准 | 参考 |
|---|---|
| agentskills.io | `framework/skills/ai-os-delivery/SKILL.md` |
| MCP resources | `aios://` scheme — [`docs/interop/mcp-resources.md`](interop/mcp-resources.md) |
| A2A / Memory tool / EU AI Act / 工具共存 | [`docs/interop/standards-map.md`](interop/standards-map.md) |

AI-OS 默认 install 不 ship 任何 server / client / runtime。

## 11. Failure mode 升格

首次发现 → lane `verification-matrix.yaml`；同一 root cause ≥3 次 → `evals/<name>.md`（`trigger_source: promoted-from-verification-matrix`）。

## 12. 扩展 schema 契约（权威定义在 artifacts.md）

以下能力在 v1.2–v1.9 引入，**字段级 schema、模板示例、doctor 语义说明均以 [`docs/artifacts.md`](artifacts.md) 为准**，本 spec 不重复：

- URL reverse-spec intake（v1.3）— `design-pack/parity-map.md`、`specs/*`、confidence 分级  
- External learning fusion（v1.4）— CR delta lifecycle、bugfix spec route、eval taxonomy frontmatter  
- Agent Handoff + Evidence Loop（v1.5）— `handoff_to` / `context_refs` / `expected_return` / `evidence_produced`；**W076**  
- Hallucination Guard（v1.6）— `fact_state_review`；**W077**  
- Long-Horizon Agent Reliability（v1.8）— `agent_run_review`；**W078**  
- Framework feedback loop（v1.9）— CR `## Preventability review`、lane retrospective；工件契约，非 doctor 阻塞项  

**Doctor 语义警告（v9.8+）**：`W070`–`W078` 为 `--strict` 可升级的确定性检查（基线一致性、owner、AC 覆盖、高风险工件、handoff 证据、事实状态、长时程回收）。CR delta 字段完整性、URL confidence 标注、Preventability review 提示由工件模板与 `AGENTS.md` 行为规则承载，不再由 doctor 软检查重复。

## 13. EU AI Act 工程叙事（非合规承诺）

`baseline-log/` + `tasks.yaml` + `verification-matrix.yaml` + `risk-register.md` 可支撑 Art. 12/14/17 的工程层 record-keeping 叙事。映射表见 [`docs/interop/standards-map.md`](interop/standards-map.md)。
