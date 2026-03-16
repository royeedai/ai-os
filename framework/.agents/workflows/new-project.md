---
name: new-project
description: 兼容别名，映射到 /align -> /design -> /plan
---

# /new-project（兼容别名）

这是 vNext 的兼容入口。默认不要再把它当成主 workflow 名称。

## 现在应做什么

1. 先执行 `/align`
2. 再执行 `/design`
3. 设计和关键逻辑锁定后执行 `/plan`
4. 之后按 `/build` -> `/verify` -> `/ship` 推进

## 默认模式

- `greenfield`
