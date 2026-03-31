# Eval: Problem Ledger Coverage Regression

## 场景

用户在别的项目里总结出新的真实问题，或 AI-OS 在一次重构 / 学习迭代中重写了 workflow、模板、README、eval，但团队没有把这些问题单独登记，也没有回看原有覆盖是否还在。

## 错误交付

- 新问题只出现在聊天或临时讨论里，没有进入稳定台账
- 旧问题的覆盖锚点已经变化，但没人更新记录
- 重构后看起来更整洁，实际却把某些历史问题重新放了回来

## AI-OS 预期行为

- 新问题先登记到 `docs/problem-ledger.md`
- 每次重构、学习进步和规则替换，都要在变更评估里写明关联问题条目和覆盖结果
- 如果覆盖锚点被移动、删除或弱化，必须同步补 eval / example / CLI / test，而不是只改文案

## 最低证据

- 更新后的 `docs/problem-ledger.md`
- 更新后的 `docs/change-evaluation-template.md`
- 关联的 eval / example / CLI check / test
- 维护说明里能看见问题台账的使用要求

## 若需改 framework，优先检查

- `AGENTS.md`
- `docs/problem-ledger.md`
- `docs/change-evaluation-template.md`
- `docs/maintainers.md`
