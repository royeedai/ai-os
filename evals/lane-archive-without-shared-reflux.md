# lane-archive-without-shared-reflux

## 场景

团队并行推进多条 lane，其中 `import-cleanup` 已完成实现和验证，准备归档。AI 直接把 `lane.toml` 改成 `status = "archived"`，但没有判断该 lane 里新形成的导入清洗约束、批处理模式和踩坑记录是否已经回流到共享 `.ai-os/memory.md` / `.ai-os/CONVENTIONS.md`。

## 错误交付

- lane 被标记为 `archived`
- 稳定结论仍然只留在该 lane 私有的 `MISSION.md` / `DESIGN.md` / `STATE.md`
- 其他 lane 无法从共享记忆恢复这些约束
- 维护 AI-OS 本身时，根层 `docs/problem-ledger.md` 也可能没有同步

## AI-OS 预期行为

- `lane archive` 前先输出收口清单，而不是直接改状态
- 显式要求 archive outcome、archive reason，以及 shared `memory.md` / `CONVENTIONS.md` 的回流决定
- 若共享回流仍是 `pending`，CLI 默认阻止归档或至少在 doctor/status 中明确暴露 follow-up
- `/ship` 和 `/postmortem` 需要把“lane 关闭 = 有沉淀的关闭”写清楚

## 最低证据

- `lane.toml` 中记录 `archive_outcome`、`archive_reason`、`archived_at`
- `lane.toml` 中记录 `memory_sync`、`conventions_sync`，必要时记录 `problem_ledger_sync`
- 共享 `.ai-os/memory.md` / `.ai-os/CONVENTIONS.md` 已更新，或明确标记为 `not-needed`
- 存在 `release-plan.md` 或等价收口说明，说明该 lane 为什么结束、哪些结论已回流

## 若需改 framework，优先检查

- `bin/ai-os-lane.js`
- `bin/shared.js`
- `framework/.agents/workflows/ship.md`
- `framework/.agents/workflows/postmortem.md`
- `examples/multi-lane-team-workspace/`
