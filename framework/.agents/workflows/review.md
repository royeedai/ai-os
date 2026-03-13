---
description: 模块完成后的质量审查流程（一键触发全套检查）
---

# 质量审查流程

当用户说"检查下代码"、"review一下"、"模块做完了"、"能交付了吗"时触发此流程。

## 步骤

1. 定位当前模块对应的 `.spec.md`、`.ai-os/tasks.yaml`、`.ai-os/acceptance.yaml`、`.ai-os/verification-matrix.yaml`
2. 调用 `code-review-guard`，执行完整结构化自审（含编译验证、变更感知验证、spec 对照、九维度检查、交付证据与验收门禁）
3. 若涉及金额/权限/状态流转 → 追加调用 `security-guard`
4. 若涉及复杂架构/大重构 → 追加调用 `architecture-reviewer`
5. 若有性能敏感场景 → 参考 `performance-optimization`
6. 若发现重复性漏项或规则缺口 → 追加调用 `memory-manager` 或 `agent-evals-guard`
7. **向用户输出格式化的验收报告**，列出通过项、未通过项、建议优化项和缺失证据

> **注意**：编译验证与 restart / cold-start 验证已包含在 `code-review-guard` 的 Step 0 中，`acceptance-gate` 调用已包含在 Step 4 的流程里（由 `code-review-guard` 负责触发），因此本 workflow 无需额外列出单独的验证或 `acceptance-gate` 步骤。
