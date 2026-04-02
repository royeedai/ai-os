# 项目状态

## 当前方位

- **项目模式**：brownfield
- **当前阶段**：plan
- **当前治理档位**：P0
- **当前目标**：锁定高风险扣减链路的状态流转、并发补偿和发布验证方案
- **当前任务**：TASK-AI-001
- **当前交付档位**：high-risk
- **当前质量焦点**：资产安全、并发正确、审计可追溯、不可逆状态可控
- **当前确认停点**：等待用户确认并发冲突策略与发布窗口
- **最新需求基准状态**：confirmed
- **最近一次用户确认**：2026-03-21

## 进度概览

| 阶段 | 状态 | 说明 |
|------|------|------|
| align | done | 高风险交付基线已确认 |
| design | done | 状态流转、审计与幂等约束已锁定 |
| plan | in_progress | 风险登记、验证矩阵和发布计划已建模，待确认关键停点 |
| build | blocked | 等待高风险方案确认后进入 |
| verify | blocked | 等待实现完成 |
| ship | blocked | 等待发布窗口与运行态证据 |

## 已锁定内容

- 扣减接口必须使用幂等键
- 审计日志写入独立表并支持回放
- 状态流转不可逆，失败路径需要补偿策略

## 待确认项

- 扣减失败重试：指数退避 vs 固定间隔
- 并发冲突解决：乐观锁 vs 悲观锁
- 发布窗口内数据库迁移与重启顺序

## 最近偏差 / 回退

- 从标准交付自动升级到 `high-risk`，已补充风险登记、专项审查和运行态验证矩阵

## 下一步

完成并发策略与发布窗口确认后，锁定 `/plan` 产物并进入 `/build`

## 最小阅读集

- MISSION.md
- baseline-log
- DESIGN.md
- CONVENTIONS.md
- tasks.yaml
- acceptance.yaml
- risk-register.md
- release-plan.md
- verification-matrix.yaml
- specs/state-transition.spec.md
