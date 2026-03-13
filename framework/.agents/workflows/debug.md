---
name: debug
description: 遇到 Bug 时的系统化调试流程
---

# 系统化调试流程

当用户说"有个 Bug"、"这里报错了"、"为什么不工作"时触发此流程。

## 步骤

1. 调用 `systematic-debugging` Skill 的方法论进行系统化调试
2. 收集错误信息：错误日志、请求/响应、堆栈跟踪
3. 定位根因（不臆断，按证据推理）
4. 实施修复
5. 编译验证修复无误
6. **回归检查**：修改了共享代码时，确认关联模块不受影响
7. 执行相关测试用例确认修复有效
8. 若该问题来自需求遗漏、任务拆分不足或验收口径不清，触发 `change-impact-analyzer`
9. 若该 Bug **不会后续触发 `/incident` → `/postmortem`**，使用 `memory-manager` 记录稳定经验
10. 若该问题具有通用性或曾重复出现，且不走 `/postmortem`，使用 `agent-evals-guard` 新增回归样例
11. 向用户报告根因、修复内容和新增的防再发措施

> **注意**：如果问题严重到需要走 `/incident` → `/postmortem`，memory 和 evals 由 `/postmortem` 流程统一处理，此处不重复执行。
