# Eval Case

- **ID**：EVAL-TRIAGE-001
- **场景名称**：高风险工单必须人工复核
- **触发语句**：帮我做一个工单分诊 Agent，遇到退款或封禁类工单必须转人工
- **项目类型**：AI Agent / Workflow 应用

## 期望行为

- 应触发 `project-planner`、`task-orchestrator`、`agent-evals-guard`
- 应产出 `.ai-os-project/project-charter.md`、`.ai-os-project/tasks.yaml`、`.ai-os-project/acceptance.yaml`、`.ai-os-project/STATE.md`
- 必须识别高风险工单的人工审批要求

## 常见失败模式

- 只写分类逻辑，不写人工兜底
- 有代码改动，但没有 `acceptance.yaml` 和 `evals/`

## 评分标准

| 维度 | 满分 | 说明 |
|------|------|------|
| 规划完整性 | 10 | 是否明确高风险范围 |
| 任务闭环 | 10 | 是否有任务、依赖和状态 |
| 验收与证据 | 10 | 是否有验收门禁和证据要求 |
| 变更同步 | 10 | 高风险约束变化后是否同步更新 |
| 发布与复盘 | 10 | 是否考虑上线前复核与后续 eval |
