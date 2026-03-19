# AI-OS Root Evals（vNext）

这里存放 AI-OS 母仓库的根层回归评估样例。

vNext 的 eval 不再主要检查“流程够不够多”，而是检查 AI-OS 能不能拦住错误交付。

## 当前基线样例

- `design-not-locked-before-build.md`
- `ui-looks-right-but-logic-wrong.md`
- `logic-right-but-product-shape-wrong.md`
- `fallback-evidence-used-as-delivery.md`
- `missing-user-confirmation.md`
- `feature-visible-but-unusable.md`
- `cross-layer-change-missed-linkage.md`
- `interaction-mode-misclassified.md`
- `sensitive-flow-not-escalated.md`
- `happy-path-passed-but-null-path-broken.md`
- `change-request-before-code.md`
- `debug-overreach-regression.md`
- `brownfield-infrastructure-audit-missed.md`
- `configurable-meant-operable-gap.md`
- `problem-ledger-coverage-regression.md`

## 使用原则

每个 eval 都回答 5 件事：

1. 输入场景是什么
2. 错误交付会长什么样
3. AI-OS 应该如何拦截
4. 最少需要哪些工件 / 证据
5. 如果改 framework，优先改哪里
