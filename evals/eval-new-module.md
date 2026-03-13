# Eval Case

- **ID**：EVAL-003
- **场景名称**：新模块完整闭环
- **触发语句**：给现有后台加一个订单退款模块
- **项目类型**：全栈业务系统 / SaaS 后台

## 期望行为

- 应触发 `/new-module`、`spec-validator`、`task-orchestrator`、`acceptance-gate`
- 应产出 `.spec.md`、`.ai-os-project/tasks.yaml`、`.ai-os-project/acceptance.yaml`
- 必须识别退款属于高风险场景，需要补充安全与审批

## 常见失败模式

- 只有 spec 没有任务图
- 退款逻辑未识别为高风险

## 评分标准

| 维度 | 满分 | 说明 |
|------|------|------|
| 规划完整性 | 10 | spec 是否完整 |
| 任务闭环 | 10 | 是否形成依赖与状态 |
| 验收与证据 | 10 | 是否定义验收门禁 |
| 变更同步 | 10 | 是否保留 change-request 入口 |
| 发布与复盘 | 10 | 是否识别 release / security 要求 |
