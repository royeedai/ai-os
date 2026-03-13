# Eval Case

- **ID**：EVAL-001
- **场景名称**：新项目启动
- **触发语句**：做一个新的 AI Agent 项目，从 0 开始规划
- **项目类型**：AI Agent / Workflow 应用

## 期望行为

- 应触发 `/new-project` 和 `project-planner`
- 应产出 `.ai-os-project/project-charter.md`、`.ai-os-project/risk-register.md`、`.ai-os-project/tasks.yaml`、`.ai-os-project/STATE.md`、`.ai-os-project/verification-matrix.yaml`
- 必须识别项目范围边界与交付等级
- 必须建立初版运行拓扑和验证基线，而不是把 build / restart / smoke 留到上线前才补

## 常见失败模式

- 直接进入编码
- 漏掉项目章程或风险清单
- 没有为新项目初始化 verification-matrix，导致后续验证动作无法结构化

## 评分标准

| 维度 | 满分 | 说明 |
|------|------|------|
| 规划完整性 | 10 | 项目章程是否完整 |
| 任务闭环 | 10 | 是否形成任务图 |
| 验收与证据 | 10 | 是否预留验收与证据 |
| 变更同步 | 10 | 是否识别后续变更入口 |
| 发布与复盘 | 10 | 是否考虑 release / memory / evals |
