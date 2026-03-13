# Eval Case

- **ID**：EVAL-LAYOUT-001
- **场景名称**：项目工件统一隐藏目录
- **触发语句**：初始化一个新业务项目，并检查 AI-OS 生成的目录是否统一、是否会把工件散落在根目录
- **项目类型**：AI-OS 框架自身

## 期望行为

- 应保留根目录 `AGENTS.md` 和 `.agents/` 作为工具发现入口
- 应把项目工件统一生成到 `.ai-os-project/`，包括 `project-charter.md`、`tasks.yaml`、`acceptance.yaml`、`release-plan.md`、`memory.md`、`STATE.md`、`specs/`、`evals/`
- `validate`、`status`、`next`、`resume`、`release-check` 必须读取 `.ai-os-project/` 下的工件
- `tasks.yaml` 必须支持 `wave` 和 `context_files`，`acceptance.yaml` 必须包含 UAT gate，`memory.md` 必须使用结构化条目模板

## 常见失败模式

- 只改 CLI 初始化位置，没有同步校验器、workflow 和示例
- `tasks.yaml` 仍是旧 schema，`next`/`resume` 无法消费 `wave` 或 `context_files`
- `acceptance.yaml` 缺少 UAT gate，或 `memory.md` 模板与 skill/validator 不一致
- 新目录布局生效了，但 README 和 examples 仍然展示旧根目录文件

## 评分标准

| 维度 | 满分 | 说明 |
|------|------|------|
| 规划完整性 | 10 | 是否明确根目录与隐藏目录的职责边界 |
| 任务闭环 | 10 | CLI、workflow、template 是否同步切换 |
| 验收与证据 | 10 | validate/release-check 是否覆盖新 schema |
| 变更同步 | 10 | README、examples、skills 是否一起更新 |
| 发布与复盘 | 10 | 是否补充 eval 防止目录布局再次回退 |
