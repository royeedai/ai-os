---
name: acceptance-gate
description: >
  阶段验收与 Evidence Pack 守卫。在模块完成、阶段交付、准备上线或用户问“是否完成/能交付了吗”时使用。
  它负责检查 Definition of Done、证据完整性和阻塞项，给出通过/阻塞结论。
---

# 验收门禁

本 Skill 用于防止 AI 在缺少证据时过早宣称“完成”。

## 使用方式

1. 读取 `.spec.md`、`tasks.yaml`、测试结果、构建结果、截图或接口样例
2. 使用 `references/acceptance-template.yaml` 生成或更新 `acceptance.yaml`
3. 检查每个验收项是否有对应证据
4. 输出通过项、阻塞项、建议优化项
5. 若存在 blocker，不得把结果表述为“已完成”

## 必查项

- Definition of Done 是否满足
- Evidence Pack 是否完整
- blocker 是否被显式记录
- 需求变更是否已同步到 spec / tasks / tests
- 准备上线时是否还缺发布或回滚条件
