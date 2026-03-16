---
name: map-codebase
description: 兼容别名，用于 brownfield 模式下的定点结构梳理
---

# /map-codebase（兼容别名）

这是 `brownfield` 模式下的辅助动作，不再是默认前置步骤。

## 什么时候需要

- 你还不知道模块在哪
- 影响边界不清
- 当前 Mission / Design 无法判断下一步

## 现在应做什么

1. 先执行 `/align`
2. 只做定点结构梳理，而不是默认全仓扫描
3. 结论回写 `MISSION.md`、`STATE.md`，必要时再进 `/design` 或 `/plan`
