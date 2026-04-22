# AI Delivery Constitution Spec v1.1

Status: Stable  
Version: 1.1  
Last updated: 2026-04-22  
Reference implementation: [create-ai-os](https://github.com/royeedai/ai-os)

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
