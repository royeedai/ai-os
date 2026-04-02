# Maintainers

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

- `examples/greenfield-guided-product.md`（含 `.ai-os/` 骨架）
- `examples/reverse-spec-admin-console.md`（含 `.ai-os/` 骨架）
- `examples/brownfield-change-journey.md`（含 `.ai-os/` 骨架）
- `examples/interaction-mode-chat.md`
- `examples/high-risk-state-change.md`（含 `.ai-os/` 骨架 + risk-register）
- `examples/cross-layer-schema-change.md`
- `examples/degraded-path-verification.md`（含 `.ai-os/` 骨架 + acceptance.yaml）
- `examples/change-request-baseline-sync.md`（含 `.ai-os/` 骨架）
- `examples/debug-bounded-fix.md`（含 `.ai-os/` 骨架）
- `examples/brownfield-infrastructure-audit.md`
- `examples/config-closure-clarification.md`

## 治理问题台账

- PG-001: 新问题没有单独记录，重构时容易把覆盖做丢
- PG-002: 框架 token 成本占用过高 → `--lite` / `token-budget`
- PG-003: 框架规则只是建议性的 → CLI validate/doctor 确定性校验
- PG-004: CLI / 框架能力只在单一 IDE 可用 → 必须写清 Codex / Cursor / Claude Code 等承接路径，否则不纳入 CLI 主能力

## 版本纪律

- **patch** (6.0.x)：bugfix、文案修正、文档补全
- **minor** (6.x.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

发版前：

1. 同步更新 `VERSION` 和 `package.json` 的 `version`
2. 在 `CHANGELOG.md` 顶部补充变更记录
3. 运行 `npm test` 确认全绿

## 本地开发补充

常用本地调用方式：

```bash
node ./bin/create-ai-os.js --help
node ./bin/create-ai-os.js plan /tmp/test-project --profile project
node ./bin/create-ai-os.js /tmp/test-project --profile project
node ./bin/ai-os-doctor.js /tmp/test-project
node ./bin/ai-os-diff.js /tmp/test-project
node ./bin/ai-os-upgrade.js /tmp/test-project
node ./bin/ai-os-release-check.js /tmp/test-project
node ./bin/ai-os-skill-check.js framework/.agents/skills/project-planner --strict
```

补充说明：

- `project` 是新项目安装的推荐写法
- `--with-project-files` 仍保留，作为兼容别名
- `plan` 可以在真正写文件前先预览安装范围

## Skill 规范参考

- `framework/.agents/skills/references/skill-spec.md`
- `framework/.agents/skills/references/quality-checklist.md`
- `framework/.agents/skills/references/anti-patterns.md`
