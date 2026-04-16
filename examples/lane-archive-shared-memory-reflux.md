# 示例：lane 收口后的 shared memory reflux

适用场景：团队并行推进多条 lane，其中一条 lane 已完成实现与验证，准备归档。

正确做法不是只把 `lane.toml` 改成 `status = "archived"`，而是先判断这条 lane 里新形成的稳定结论应回流到哪里：

- 进入共享 `.ai-os/memory.md` 的稳定决策、约束、坑点
- 进入共享 `.ai-os/CONVENTIONS.md` 的稳定代码模式、反模式、分层约束
- 对 AI-OS 母仓库维护者，再额外判断是否需要同步 `docs/problem-ledger.md`

推荐收口顺序：

1. 在 `/ship` 中确认当前 lane 的交付说明、发布范围和回滚条件
2. 在 `/postmortem` 中区分“稳定结论”和“临时观察”
3. 把稳定结论回流到共享 `memory.md` / `CONVENTIONS.md`
4. 再执行 `create-ai-os lane archive <lane-id> . --outcome <outcome> --reason <reason> --memory-sync <status> --conventions-sync <status> --problem-ledger-sync <status>`

如果只改 lane 状态、不做 shared reflux，结果通常是：

- 经验继续留在 lane 私有工件里
- 其他 lane 无法自动恢复这些结论
- 团队反复踩同类坑

完整的 canonical 样例见 `examples/multi-lane-team-workspace/`：其中 `import-cleanup` lane 已归档，相关导入清洗约束已经回流到共享 `memory.md` / `CONVENTIONS.md`。
