# AI-OS Examples

这些示例的目的，是演示新版 AI-OS 如何把用户一步步带到高质量交付，而不是提供业务代码模板。

## Quickstart

**首次了解 AI-OS？从这里开始：**

- `quickstart-todo-cli/` — 一个完整走通 `/align` → `/ship` 的迷你项目演示，展示每个阶段产出的真实工件

## 场景示例

- `greenfield-guided-product.md`
- `reverse-spec-admin-console.md`
- `brownfield-change-journey.md`
- `interaction-mode-chat.md`
- `high-risk-state-change.md`
- `cross-layer-schema-change.md`
- `degraded-path-verification.md`
- `change-request-baseline-sync.md`
- `debug-bounded-fix.md`
- `brownfield-infrastructure-audit.md`
- `config-closure-clarification.md`
- `failure-mode-eval-closure.md`

每个示例都配一套最小 `.ai-os/` 骨架，帮助维护者判断：

- 哪些工件是核心
- 关键设计和逻辑应该在什么阶段被锁定
- 什么时候可以进入 build / verify
- 哪些场景必须先做变更同步、边界确认和回归验证
