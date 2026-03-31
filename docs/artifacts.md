# Artifacts

AI-OS 采用“少而强的必备工件 + 按风险加深”的策略。

## 核心工件

| 文件 | 作用 |
|------|------|
| `.ai-os/MISSION.md` | 定义宿主项目必要上下文，以及当前交付的目标、范围、模式、治理档位和最新确认的需求基准 |
| `.ai-os/DESIGN.md` | 锁定关键页面、信息架构、交互和流程 |
| `.ai-os/specs/` | 定义逻辑规则、契约、状态流转、边界条件和验收映射 |
| `.ai-os/tasks.yaml` | 编排 wave、角色、审批点、impact_tags、边界和证据要求 |
| `.ai-os/acceptance.yaml` | 管理质量档位、专项审查、设计门、逻辑门、实现质量门、交付质量门 |
| `.ai-os/STATE.md` | 恢复当前方位、已锁定内容、待确认项和确认停点 |
| `.ai-os/memory.md` | 记录稳定决策和约束 |

## 按需工件

- `.ai-os/release-plan.md`
- `.ai-os/risk-register.md`
- `.ai-os/verification-matrix.yaml`
- `.ai-os/design-pack/parity-map.md`
- `.ai-os/evals/`

## 使用原则

- `MISSION.md` + `specs/` 是当前交付的唯一需求真理源
- `brownfield` / `change` 下，`MISSION.md` 写的是当前这轮交付，不是整个存量项目
- 任何需求变化先更新工件，再改代码
- 轻量流程也必须同步 `STATE.md` 和验证证据

## 三档深度

- 探索档：Mission + State + 最小设计笔记
- 标准档：再加 Design + Spec + Tasks + Acceptance
- 高风险档：再加 Risk + Release + 运行态证据
