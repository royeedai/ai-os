# 示例：legacy 单交付项目迁到 lanes/default

这个示例演示：

1. 为什么不能在 legacy 项目里手工复制 `.ai-os/MISSION.md`、`tasks.yaml`、`acceptance.yaml` 到 `.ai-os/lanes/default/` 后继续双写
2. 如何先运行 `create-ai-os upgrade . --to-lanes --preflight` 审阅迁移计划，再执行正式迁移
3. 迁移完成后，如何用 `status --lane default`、`validate` 和 `release-check` 确认语义闭环没有丢失
