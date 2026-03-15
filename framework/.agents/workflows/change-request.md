---
name: change-request
description: 需求变更流程（范围变化、补充需求、漏项修正）
---

# 需求变更流程

当用户说"改一下需求"、"补一个要求"、"这个不做了"、"范围扩大/缩小"时触发此流程。

## 步骤

1. 先读取 `.ai-os/project-charter.md` 和 `.ai-os/STATE.md`，判断该变更是否直接影响当前项目目标、当前里程碑目标、当前核心验收路径或当前进行中的任务
2. 若该变更不阻塞当前目标，且用户未明确要求立即插入，先把变更放入待排期项，不要默认打断当前主线
3. 调用 `change-impact-analyzer`，记录变更内容、原因、优先级和影响范围
4. 判断变更影响的是项目章程、模块 spec、任务图、测试、验收、发布还是运行中环境
5. 同步更新 `.ai-os/project-charter.md`、相关 `.spec.md`、`.ai-os/tasks.yaml`、`.ai-os/acceptance.yaml`
6. 若影响接口、数据结构或上线计划，同步更新测试、`.ai-os/release-plan.md`、风险清单
7. 将变更后的范围、优先级判断和新增 blocker 明确告知用户，再继续执行
