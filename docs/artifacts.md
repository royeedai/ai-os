# Artifacts（vNext）

AI-OS vNext 采用“少而强的必备工件 + 按风险加深”的策略。

## 核心工件

| 文件 | 作用 |
|------|------|
| `.ai-os/MISSION.md` | 定义目标、范围、模式和质量标准 |
| `.ai-os/DESIGN.md` | 锁定关键页面、信息架构、交互和流程 |
| `.ai-os/specs/` | 定义逻辑规则、契约、状态流转和边界条件 |
| `.ai-os/tasks.yaml` | 编排 wave、角色、审批点和证据要求 |
| `.ai-os/acceptance.yaml` | 管理设计门、逻辑门、实现质量门、交付质量门 |
| `.ai-os/STATE.md` | 恢复当前方位、已锁定内容和下一步 |
| `.ai-os/memory.md` | 记录稳定决策和约束 |

## 按需工件

- `.ai-os/release-plan.md`
- `.ai-os/risk-register.md`
- `.ai-os/design-pack/parity-map.md`
- `.ai-os/evals/`

## 三档深度

- 探索档：Mission + State + 最小设计笔记
- 标准档：再加 Design + Spec + Tasks + Acceptance
- 高风险档：再加 Risk + Release + 运行态证据
