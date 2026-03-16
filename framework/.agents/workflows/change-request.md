---
name: change-request
description: 兼容别名，映射到 change 模式的 /align
---

# /change-request（兼容别名）

请改用 `/align`，并把模式设为 `change`。

## 变更处理顺序

1. 重新明确变更目标和成功标准
2. 判断是否影响设计
3. 判断是否影响逻辑契约
4. 必要时重新执行 `/design` 或 `/plan`
5. 只有门禁更新后才重新进入 `/build`
