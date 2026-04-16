# Canonical Example: Multi-Lane Team Workspace

本示例演示 AI-OS 在团队并行开发下的 lane 拓扑，而不只是单条 `lanes/default`。

它展示的不是抽象目录，而是一份真实的协作状态：

- `default`：`active`，负责当前核心 CLI 主线
- `reporting-export`：`draft`，准备中的并行导出功能
- `import-cleanup`：`archived`，已经收口，并把稳定经验回流到共享 `memory.md` / `CONVENTIONS.md`

## 结构总览

- `.ai-os/project.md`：共享项目章程，描述跨 lane 协调规则
- `.ai-os/memory.md`：共享稳定决策，包含从已归档 lane 回流出的导入清洗结论
- `.ai-os/CONVENTIONS.md`：共享代码约定，包含批处理 parse/normalize/persist 约束
- `.ai-os/lanes/default/`：当前 active 主线
- `.ai-os/lanes/reporting-export/`：草拟中的并行功能 lane
- `.ai-os/lanes/import-cleanup/`：已归档 lane，保留 archive metadata 与 release-plan

## 关键观察点

- `create-ai-os lane list .` 应显示 `1 active + 1 draft + 1 archived`
- `import-cleanup/lane.toml` 不只包含 `status = "archived"`，还记录了 `archive_outcome`、`archive_reason` 和 shared reflux 状态
- 共享 `memory.md` 与 `CONVENTIONS.md` 已经吸收 `import-cleanup` lane 的稳定结论，所以经验没有继续困在私有 lane 工件里
- `reporting-export` 仍保持 `draft`，说明并行 lane 不一定都要 active，团队可以用 `activate --only` 控制自动选择
