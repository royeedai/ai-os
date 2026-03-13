---
description: 需求变更流程（范围变化、补充需求、漏项修正）
---

# 需求变更流程

当用户说"改一下需求"、"补一个要求"、"这个不做了"、"范围扩大/缩小"时触发此流程。

## 步骤

1. 调用 `change-impact-analyzer`，记录变更内容、原因、优先级和影响范围
2. 判断变更影响的是项目章程、模块 spec、任务图、测试、验收、发布还是运行中环境
3. 同步更新 `.ai-os-project/project-charter.md`、相关 `.spec.md`、`.ai-os-project/tasks.yaml`、`.ai-os-project/acceptance.yaml`
4. 若影响接口、数据结构或上线计划，同步更新测试、`.ai-os-project/release-plan.md`、风险清单
5. 将变更后的范围和新增 blocker 明确告知用户，再继续执行
