# 高风险触发与联动分类

本清单用于 `project-planner`、`task-orchestrator`、`acceptance-gate` 共享判定，不依赖具体语言或框架。

## 一、硬触发高风险档

命中以下任一类，当前项目或任务必须升级为 `high-risk`，不得继续按普通标准档处理：

- 用户资产、额度、余额、积分、权益扣减
- 权限、身份、角色或组织归属变更
- 不可逆状态流转、审批流、关闭 / 作废 / 结算类状态更新
- 跨用户或跨租户的数据读取、转移、代操作
- 并发敏感更新、幂等要求、竞态覆盖风险
- 对外计费、通知、下游系统写入或其他外部副作用

## 二、高风险档强制动作

- `quality_tier` 必须设为 `high-risk`
- 生成或更新 `risk-register.md`
- 生成或更新 `release-plan.md`
- 相关任务必须声明 `approval_required`
- `required_special_reviews` 至少包含：
  - `security-guard`
  - `authorization-boundary-check`
  - `concurrency-safety-check`

## 三、impact_tags 抽象分类

- `entrypoint`
- `transport`
- `gateway`
- `auth`
- `schema`
- `mapping`
- `storage`
- `runtime-config`
- `external-dependency`
- `state-transition`
- `async-processing`

## 四、使用规则

- `spec` 先声明交互模式、契约基准、字段映射/适配说明、集成触点，再进入任务拆分
- `task-orchestrator` 根据 `集成触点` 派生 `context_files`、`impact_tags`、`derived_checks`
- `verify` 和 `release-check` 必须同时检查正常路径与 degraded-path 证据
