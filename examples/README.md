# AI-OS Examples（vNext）

这些示例的目的，是演示新版 AI-OS 如何把用户一步步带到高质量交付，而不是提供业务代码模板。

## 当前示例

- `greenfield-guided-product.md`
- `reverse-spec-admin-console.md`
- `brownfield-change-journey.md`
- `interaction-mode-chat.md`
- `high-risk-state-change.md`
- `cross-layer-schema-change.md`
- `degraded-path-verification.md`

每个示例都配一套最小 `.ai-os/` 骨架，帮助维护者判断：

- 哪些工件是核心
- 关键设计和逻辑应该在什么阶段被锁定
- 什么时候可以进入 build / verify
- 哪些场景必须先做交互模式判型、联动检查和 degraded-path 验证
