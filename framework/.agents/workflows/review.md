---
name: review
description: 模块完成后的质量审查流程（一键触发全套检查）
---

# 质量审查流程

当用户说"检查下代码"、"review一下"、"模块做完了"、"能交付了吗"时触发此流程。

## 步骤

1. 定位当前模块对应的 `.spec.md`、`.ai-os/tasks.yaml`、`.ai-os/acceptance.yaml`（如适用）、`.ai-os/verification-matrix.yaml`
2. 先识别当前模块的模块类型和交付等级，按“最低足够流程”判断本次 review 需要的深度
3. 调用 `code-review-guard`，执行结构化自审（含编译验证、变更感知验证、spec 对照、交付证据与验收门禁）
4. 若涉及金额/权限/状态流转，或交付等级为 `L3` → 追加调用 `security-guard`
5. 若涉及复杂架构/大重构，或交付等级为 `L3` → 追加调用 `architecture-reviewer`
6. 若有性能敏感场景 → 参考 `performance-optimization`
7. 若发现重复性漏项或规则缺口 → 追加调用 `memory-manager` 或 `agent-evals-guard`
8. 向用户输出格式化的验收报告，列出通过项、未通过项、建议优化项和缺失证据

> 注意：
>
> - 编译验证与 restart / cold-start 验证已包含在 `code-review-guard` 中
> - `acceptance-gate` 的深度应与模块类型和交付等级一致，不要默认所有模块都按最重验收输出
> - 只有需要人工验证的用户可见模块，才强制要求完整 UAT 脚本
