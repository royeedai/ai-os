---
description: 模块完成后的质量审查流程（一键触发全套检查）
---

# 质量审查流程

当用户说"检查下代码"、"review一下"、"模块做完了"、"能交付了吗"时触发此流程。

## 步骤

1. 定位当前模块对应的 `.spec.md`、`tasks.yaml`、`acceptance.yaml`
2. 执行项目级编译/构建命令确认无错误
3. 调用 `code-review-guard`，执行完整结构化自审：
   - Step 0：工程完整性（编译、入口、脚手架）
   - Step 1：逐项 .spec 对照
   - Step 2：九维度全面检查（引用 fullstack-dev-checklist）
   - Step 3：深度审计（页面/API/回归/数据层面）
4. 调用 `acceptance-gate` 检查 Definition of Done、Evidence Pack、阻塞项和验收结论
5. 若涉及金额/权限/状态流转 → 追加调用 `security-guard`
6. 若涉及复杂架构/大重构 → 追加调用 `architecture-reviewer`
7. 若有性能敏感场景 → 参考 `performance-optimization`
8. 若发现重复性漏项或规则缺口 → 追加调用 `memory-manager` 或 `agent-evals-guard`
9. **向用户输出格式化的验收报告**，列出通过项、未通过项、建议优化项和缺失证据
