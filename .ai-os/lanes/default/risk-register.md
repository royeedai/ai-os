# 风险登记

| 风险 ID | 描述 | 影响范围 | 触发条件 | 规避措施 | 监测入口 | 审批结论 |
|---|---|---|---|---|---|---|
| R-001 | 把 Codex 实战个案过度泛化成 AI-OS 通用 runtime / auto-release 能力 | README、docs、skill、templates | 直接新增 CLI / runtime / doctor warning / release automation | 使用 Boundary Evolution Policy；本轮只改 docs / templates / evals / tests | docs tests + strict doctor + release-plan review | n/a |
| R-002 | 发布真相继续漂移 | STATE、release-plan、tasks、final closeout | 用户要求发布但 lane 仍写 local-only 或旧 baseline | 新增 release truthfulness review 与 eval | verification-matrix + evals/release-truth-drift.md | n/a |
| R-003 | 验证失败被误分类导致错误修复或虚假完成 | tasks、verification matrix、release-plan | 本地环境 / 外部服务 / production unknown 被混成产品代码 | 新增 verification environment classification | evals/verification-environment-misclassified.md | n/a |
| R-004 | git 操作后 task ledger 丢证据 | tasks.yaml、baseline_id、STATE | pull / stash / rebase / branch switch 后冲突机械解决 | 新增 task ledger conflict review | evals/task-ledger-conflict-drift.md | n/a |
| R-005 | install / legacy baseline artifact 被误当当前范围 | STATE、lane.toml、MISSION、DESIGN | 生成物或旧 baseline 未分类就驱动实现 | 新增 baseline artifact interpretation review | evals/install-baseline-artifact-misread.md | n/a |
| R-006 | release 外部副作用不可逆或远端拒绝 | git history、origin/main、tag | commit / push / tag 失败或指向错误版本 | fetch 后确认本地与 origin/main 对齐；验证全绿后再 commit / push / tag；tag 前确认 v10.5.1 不存在 | git status / git rev-list / git push output | user-authorized 2026-06-19 |
