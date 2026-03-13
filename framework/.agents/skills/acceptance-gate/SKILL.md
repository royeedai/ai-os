---
name: acceptance-gate
description: >
  阶段验收与 Evidence Pack 守卫。在模块完成、阶段交付、准备上线或用户问"是否完成/能交付了吗"时使用。
  它负责检查 Definition of Done、证据完整性和阻塞项，给出通过/阻塞结论，并生成 UAT 脚本供用户手工验证。
---

# 验收门禁

本 Skill 用于防止 AI 在缺少证据时过早宣称"完成"。

## 使用方式

1. 读取 `.spec.md`、`.ai-os/tasks.yaml`、`.ai-os/verification-matrix.yaml`、测试结果、构建结果、截图或接口样例
2. 使用下方模板生成或更新 `.ai-os/acceptance.yaml`
3. 检查每个验收项是否有对应证据
4. 输出通过项、阻塞项、建议优化项
5. **生成 UAT 脚本**（见下方模板），供用户手工验证功能是否符合预期
6. 若存在 blocker，不得把结果表述为"已完成"

## 必查项

- Definition of Done 是否满足
- Evidence Pack 是否完整
- 本次变更要求的 restart / cold-start 验证是否已执行并留痕
- blocker 是否被显式记录
- 需求变更是否已同步到 spec / tasks / tests
- 准备上线时是否还缺发布或回滚条件

---

## 验收模板

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
    title: "运行验证与交付证据"
    status: pending
    checks:
      - "本次变更要求的验证动作已执行"
      - "需要重启的服务已完成重启"
      - "需要冷启动的链路已完成 Smoke Check"
      - "关键接口样例或截图齐全"
      - "风险与剩余问题已记录"
    evidence:
      - "verification-plan"
      - "restart-log"
      - "cold-start-log"
      - "post-restart-smoke-log"
      - "api-sample-or-screenshot"
      - "risk-note"

  - id: GATE-004
    title: "人工验证（UAT）"
    status: pending
    checks:
      - "UAT 脚本已生成"
      - "用户已执行 UAT 并确认结果"
    evidence:
      - "uat-result"

result:
  decision: blocked
  blockers: []
  advisories: []
```

---

## UAT 脚本模板

验收报告末尾**必须附带** UAT 脚本，供用户手工验证。

```markdown
## 人工验证脚本（UAT）

> 以下步骤由 AI 基于 .spec.md 和 `.ai-os/acceptance.yaml` 自动生成，
> 供用户手工验证功能是否符合预期。每项标记 ✅ / ❌ / ⚠️。

### 前置条件

- [ ] 本地环境已启动（命令：`[启动命令]`）
- [ ] 已具备测试数据 / 测试账号

### 正常路径验证

| # | 操作步骤 | 预期结果 | 通过？ |
|---|---------|---------|--------|
| 1 | [具体操作] | [预期行为] | |
| 2 | [具体操作] | [预期行为] | |

### 异常路径验证

| # | 操作步骤 | 预期结果 | 通过？ |
|---|---------|---------|--------|
| 1 | [触发异常的操作] | [预期的错误处理] | |

### 边界条件验证

| # | 操作步骤 | 预期结果 | 通过？ |
|---|---------|---------|--------|
| 1 | [边界操作] | [预期行为] | |

### 验证结论

- [ ] 全部通过 → 确认验收
- [ ] 存在失败项 → 记录实际行为，AI 将自动诊断并生成修复计划
```

### UAT 脚本生成规则

1. 从 `.spec.md` 的功能需求（FR-XXX）中提取可测试的用户操作
2. 每个核心功能至少一个正常路径 + 一个异常路径
3. 操作步骤必须具体到可执行（"点击XX按钮"而非"测试XX功能"）
4. 预期结果必须可观测（"页面显示XX"而非"功能正常"）
5. 若涉及数据库操作，附带验证 SQL 或检查命令
