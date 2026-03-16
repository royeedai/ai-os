---
name: quick
description: 兼容别名，映射到 change 模式的轻量 /align -> /plan 或 /build
---

# /quick（兼容别名）

这是 vNext 的兼容入口，适用于低风险局部改动。

## 现在应做什么

1. 先执行 `/align`，把模式设为 `change`
2. 如果变更会影响设计或逻辑，先补 `/design` 或 `/plan`
3. 如果只是低风险局部改动，可在最小工件更新后进入 `/build`
4. 完成后仍需走 `/verify`

## 最低要求

- `STATE.md` 必须更新
- 至少有最小证据
- 不允许用“小改动”跳过质量门
