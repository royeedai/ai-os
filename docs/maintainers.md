# Maintainers（vNext）

维护 AI-OS 时，优先看：

- `PROJECT_PURPOSE.md`
- `AGENTS.md`
- `docs/problem-ledger.md`
- `docs/change-evaluation-template.md`

## 维护判断标准

每个变更都先问：

1. 它是不是在提升“高质量完成项目”
2. 它提升的是目标确认、设计锁定、逻辑锁定、证据完成，还是恢复能力
3. 它更适合落在根层原则、workflow、skill、模板、CLI、示例还是 eval
4. 它是在减少错误交付，还是只是在增加概念

除此之外，每次维护都补做两件事：

1. 新出现的真实问题先登记到 `docs/problem-ledger.md`
2. 每次重构、学习进步或规则替换，都在变更评估里写清本次回看了哪些问题条目、覆盖是否变弱

## 当前基线 eval

- `evals/design-not-locked-before-build.md`
- `evals/ui-looks-right-but-logic-wrong.md`
- `evals/logic-right-but-product-shape-wrong.md`
- `evals/fallback-evidence-used-as-delivery.md`
- `evals/missing-user-confirmation.md`
- `evals/feature-visible-but-unusable.md`
- `evals/cross-layer-change-missed-linkage.md`
- `evals/interaction-mode-misclassified.md`
- `evals/sensitive-flow-not-escalated.md`
- `evals/happy-path-passed-but-null-path-broken.md`
- `evals/change-request-before-code.md`
- `evals/debug-overreach-regression.md`
- `evals/brownfield-infrastructure-audit-missed.md`
- `evals/configurable-meant-operable-gap.md`
- `evals/problem-ledger-coverage-regression.md`

## 当前主示例

- `examples/greenfield-guided-product.md`
- `examples/reverse-spec-admin-console.md`
- `examples/brownfield-change-journey.md`
- `examples/interaction-mode-chat.md`
- `examples/high-risk-state-change.md`
- `examples/cross-layer-schema-change.md`
- `examples/degraded-path-verification.md`
- `examples/change-request-baseline-sync.md`
- `examples/debug-bounded-fix.md`
- `examples/brownfield-infrastructure-audit.md`
- `examples/config-closure-clarification.md`
