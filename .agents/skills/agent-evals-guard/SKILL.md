---
name: agent-evals-guard
description: >
  为规则、workflow 和 skills 自身建立回归样例与评估门禁。
  当修改这套系统、出现重复漏项、想验证“这次规则升级有没有真的提升”时必须使用。
---

# Agent Evals 守卫

本 Skill 用于验证“系统本身”是否在变强，而不是只验证某一次代码改动。

## 使用方式

1. 使用 `references/evals-template.md` 维护代表性任务样例
2. 为每个样例写清触发方式、期望工件、常见失败模式、评分标准
3. 当规则、workflow、skill 变更后，至少回看高频场景是否退化
4. 新增复盘结论时，把它转成新的 eval case

## 重点检查

- 是否仍然会漏 project-charter / tasks / acceptance / release / memory
- 是否会过早宣称“完成”
- 是否会在需求变更后漏更新相关工件
- 是否会忽略高风险审批点
