# 项目共享记忆

> 只记录跨 session、跨 lane 仍稳定有效的事实：已确认决策、长期约束、用户偏好、已知坑点、跨层契约和技术债。
> 当前交付过程中的临时状态进入具体 lane 的 `STATE.md`、`baseline-log/` 或 spec，不写入这里。
> 每条真实记录的 `id` 在项目内全局唯一、永久不复用；使用正常 Git 冲突处理，不自动并集两个版本。
> 新记录取代旧记录时，新记录的 `supersedes` 引用旧 ID，旧记录改为 `superseded` 并移入 archived。已取代记录可追溯但属于非活动真理，不能与新记录同时生效。

## 记录 schema（不是记录）

下面 fenced block 只定义字段，不属于 active 或 archived，不得把尖括号占位符当成真实 ID 提交：

```ai-os-memory-record-schema
id: <globally-unique-id>
status: <active-or-superseded-or-archived>
source: <path-or-confirmation-ref>
owner: <human-or-team>
last_verified: <ISO-8601>
supersedes: []
kind: <decision-or-engineering-constraint-or-preference-or-pitfall-or-technical-debt-or-cross-layer-contract>
title: <non-empty>
details: <non-empty>
```

真实记录必须填写全部字段。`source` 指向用户确认、baseline-log 或代码 / 文档证据；`last_verified` 使用 ISO-8601；`supersedes` 是真实旧记录 ID 列表或 `[]`。

## active

### 1. 设计决策

> 暂无记录。

### 2. 工程约束（架构护栏 / 编码契约登记表）

> 暂无记录。允许的约束类型包括 return-contract / must-reuse-abstraction / forbidden-antipattern / dependency-policy / implicit-mechanism / technology-profile / high-risk-state-flow。

### 3. 用户偏好

> 暂无记录。

### 4. 已知坑点

> 暂无记录。

### 5. 技术债追踪

> 暂无记录。技术债必须有 drift_signals / refactor_trigger / native_checks 证据，不得登记无证据的周期性大重构。

### 6. 跨层契约

> 暂无记录。HTTP 状态 / 业务码 / 客户端行为映射和 wire 类型契约都使用上方同一 record schema，不另建无身份表格。

## archived

> 暂无记录。归档时移动完整真实记录并保留原始 ID 和全部字段；`status` 使用 `superseded` 或 `archived`，ID 永不复用。
