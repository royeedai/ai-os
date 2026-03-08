---
name: change-impact-analyzer
description: >
  处理需求变更、范围调整、补充规则和漏项修复。
  当用户修改需求、缩放范围、补充约束或发现“之前漏了什么”时必须使用，
  用于分析影响并同步更新所有相关工件。
---

# 变更影响分析器

本 Skill 用于避免“代码改了，但 spec、任务、测试、验收还是旧的”。

## 使用方式

1. 使用 `references/change-request-template.md` 记录变更
2. 判断影响维度：范围、页面、API、数据、权限、安全、测试、发布、memory、evals
3. 明确哪些工件必须同步更新
4. 标记新增 blocker、风险和审批点
5. 输出“继续做什么”和“暂停什么”

## 必须同步检查

- `project-charter.md`
- 对应 `.spec.md`
- `tasks.yaml`
- `acceptance.yaml`
- 测试用例
- `release-plan.md`
- `memory.md`
- `evals/`
