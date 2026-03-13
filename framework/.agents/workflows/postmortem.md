---
description: 事故、漏项和重大偏差的复盘流程
---

# 复盘流程

当用户说"复盘一下"、"为什么会漏掉"、"把这次经验沉淀下来"时触发此流程。

## 步骤

1. 记录事件背景、影响、根因、触发条件、发现方式、处置过程
2. 调用 `memory-manager`，把稳定结论写入项目记忆
3. 调用 `agent-evals-guard`，将此次问题转化为回归样例或验收门禁
4. 若暴露出 spec、任务图或验收设计问题，补充 `.ai-os/project-charter.md`、`.spec.md`、`.ai-os/tasks.yaml`、`.ai-os/acceptance.yaml`
5. 输出“下次如何避免”的具体机制，而不是只写口头结论
