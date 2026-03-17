# Maintainers（vNext）

维护 AI-OS 时，优先看：

- `PROJECT_PURPOSE.md`
- `AGENTS.md`
- `docs/change-evaluation-template.md`

## 维护判断标准

每个变更都先问：

1. 它是不是在提升“高质量完成项目”
2. 它提升的是目标确认、设计锁定、逻辑锁定、证据完成，还是恢复能力
3. 它更适合落在根层原则、workflow、skill、模板、CLI、示例还是 eval
4. 它是在减少错误交付，还是只是在增加概念

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

## 当前主示例

- `examples/greenfield-guided-product.md`
- `examples/reverse-spec-admin-console.md`
- `examples/brownfield-change-journey.md`
- `examples/interaction-mode-chat.md`
- `examples/high-risk-state-change.md`
- `examples/cross-layer-schema-change.md`
- `examples/degraded-path-verification.md`
