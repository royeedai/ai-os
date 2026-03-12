---
name: acceptance-gate
description: >
  阶段验收与 Evidence Pack 守卫。在模块完成、阶段交付、准备上线或用户问"是否完成/能交付了吗"时使用。
  它负责检查 Definition of Done、证据完整性和阻塞项，给出通过/阻塞结论。
---

# 验收门禁

本 Skill 用于防止 AI 在缺少证据时过早宣称"完成"。

## 使用方式

1. 读取 `.spec.md`、`tasks.yaml`、测试结果、构建结果、截图或接口样例
2. 使用下方模板生成或更新 `acceptance.yaml`
3. 检查每个验收项是否有对应证据
4. 输出通过项、阻塞项、建议优化项
5. 若存在 blocker，不得把结果表述为"已完成"

## 必查项

- Definition of Done 是否满足
- Evidence Pack 是否完整
- blocker 是否被显式记录
- 需求变更是否已同步到 spec / tasks / tests
- 准备上线时是否还缺发布或回滚条件

---

## 模板

```yaml
version: 1
scope:
  type: module
  name: "example-module"
  spec: "specs/example.spec.md"

gates:
  - id: GATE-001
    title: "需求对齐"
    status: pending
    checks:
      - "spec 已确认"
      - "变更已同步"
    evidence: []

  - id: GATE-002
    title: "实现与测试"
    status: pending
    checks:
      - "核心功能已实现"
      - "构建通过"
      - "测试通过"
    evidence:
      - "build-log"
      - "test-log"

  - id: GATE-003
    title: "交付证据"
    status: pending
    checks:
      - "关键接口样例或截图齐全"
      - "风险与剩余问题已记录"
    evidence:
      - "api-sample-or-screenshot"
      - "risk-note"

result:
  decision: blocked
  blockers: []
  advisories: []
```
