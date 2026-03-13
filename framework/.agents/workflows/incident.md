---
name: incident
description: 线上事故处置流程（先止血，再定位，再回滚或修复）
---

# 线上事故处置流程

当用户说"线上挂了"、"生产有问题"、"先帮我止血"时触发此流程。

## 步骤

1. 先判断事故级别、影响范围、是否需要暂停发布
2. 调用 `systematic-debugging` 收集证据并定位根因
3. 若存在明显风险，优先执行回滚、禁用入口、降级或 Feature Flag 止血
4. 需要上线修复时，调用 `release-manager` 走紧急发布检查
5. 修复后执行回归与 Smoke Check
6. 事故结束后，必须触发 `/postmortem`
