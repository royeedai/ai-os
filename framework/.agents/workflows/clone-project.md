---
name: clone-project
description: 兼容别名，映射到 reverse-spec 模式的 /align -> /design -> /plan
---

# /clone-project（兼容别名）

这是 vNext 的兼容入口。默认不要再把它当成主 workflow 名称。

## 现在应做什么

1. 执行 `/align`，并把项目模式设为 `reverse-spec`
2. 执行 `/design`，补齐 `DESIGN.md` 和 `design-pack/parity-map.md`
3. 执行 `/plan`，生成 spec、tasks、acceptance
4. 只有在设计门和逻辑门通过后才进入 `/build`

## 关键约束

- 素材不足时先停在 `/align` 或 `/design`
- 必须补 parity 证据，不能只看“像不像”
