# Eval: Legacy To Lanes Migration Skipped

## 场景

一个已经在 `.ai-os/` 根层使用 legacy 单交付工件的项目，开始进入多人并行或多迭代推进阶段。AI 知道 `7.x` 默认推荐 `lanes/default`，但没有先检查当前项目布局，就边改边把部分工件手工复制到 `.ai-os/lanes/default/`。

## 错误交付

- 根层 legacy 工件和 `lanes/default` 工件同时存在，形成 mixed layout
- 团队成员不知道应该继续读根层还是 lane 下的 Mission / tasks / acceptance
- AI 把“支持 lane”理解成“多建一套文件”，而不是经过可审阅的迁移

## AI-OS 预期行为

- 在 legacy 项目里，先识别当前交付布局，再决定继续走 legacy fallback 还是执行 `upgrade --to-lanes`
- 需要迁移时，先给出 `upgrade --to-lanes --preflight` 的迁移计划和阻塞项，再执行正式迁移
- 不得手工复制 root MISSION / tasks / acceptance 到 `lanes/default` 后继续双轨维护
- 迁移完成后，应重新验证 `status` / `validate` / `release-check` 在 `default` lane 下语义闭环成立

## 最低证据

- 有当前布局判断结果：`legacy` / `lanes` / `mixed`
- 有 `upgrade --to-lanes --preflight` 或等价迁移审阅输出
- 迁移后 `validate` 通过，且不再残留 mixed layout

## 若需改 framework，优先检查

- `bin/shared.js`
- `bin/ai-os-upgrade.js`
- `bin/ai-os-doctor.js`
- `docs/cli.md`
