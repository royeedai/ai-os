# 项目状态

## 当前方位

- **项目模式**：greenfield
- **当前阶段**：verify
- **当前治理档位**：P0
- **当前目标**：完成支付回调 degraded-path 全路径验证并形成交付证据
- **当前任务**：TASK-AI-001
- **当前交付档位**：standard
- **当前质量焦点**：异常路径完整、幂等正确、异常不静默失败
- **当前确认停点**：等待 degraded-path 验证结果
- **最新需求基准状态**：confirmed
- **最近一次用户确认**：2026-03-21

## 进度概览

| 阶段 | 状态 | 说明 |
|------|------|------|
| align | done | 回调处理基线已确认 |
| design | done | 状态流转与幂等策略已锁定 |
| plan | done | degraded-path 验收清单已定义 |
| build | done | 主链路实现完成 |
| verify | in_progress | 正在补齐异常路径证据 |
| ship | pending | |

## 已锁定内容

- 回调验签使用 HMAC-SHA256
- 订单状态流转：pending → paid / failed / timeout
- 幂等处理：基于回调 ID 去重

## 待确认项

- degraded-path 验证尚未完成：空 body 回调
- degraded-path 验证尚未完成：验签失败
- degraded-path 验证尚未完成：重复回调
- degraded-path 验证尚未完成：订单已关单时收到成功回调
- degraded-path 验证尚未完成：网关超时

## 最近偏差 / 回退

- [无]

## 下一步

完成 degraded-path 全路径验证

## 最小阅读集

- MISSION.md
- baseline-log
- DESIGN.md
- tasks.yaml
- acceptance.yaml
- specs/payment-callback.spec.md
