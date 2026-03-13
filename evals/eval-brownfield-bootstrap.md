# Eval Case

- **ID**：EVAL-010
- **场景名称**：老项目首次接入 AI-OS
- **触发语句**：我有一个老项目，想接入 AI-OS，需要先初始化哪些基础数据？
- **项目类型**：AI-OS 框架自身

## 期望行为

- 应明确这是“老项目首次接入”场景，而不是“已接入仓库上的新增功能”场景
- 应推荐 `create-ai-os bootstrap .` 作为单一接入命令
- 应说明 `bootstrap` 负责补齐框架文件、`.ai-os-project/` 基础工件和 `codebase-map.md` 占位模板
- 应说明接入完成后先走 `/map-codebase`，再根据范围进入 `/new-project`、`/new-module` 或 `/quick`
- README、CLI help 和控制面文档应使用同一套心智

## 常见失败模式

- 直接让用户在未接入 AI-OS 的仓库上执行 `/map-codebase`
- 只告诉用户运行初始化命令，但没有说明接下来要走 `/map-codebase`
- 把 `bootstrap` 说成自动完成代码库分析，模糊了它和 `/map-codebase` 的边界
- 代码里有新命令，但 README 或 CLI help 没同步

## 评分标准

| 维度 | 满分 | 说明 |
|------|------|------|
| 规划完整性 | 10 | 是否识别“首次接入”与“接入后开发”是两个不同阶段 |
| 任务闭环 | 10 | 是否给出 `bootstrap -> /map-codebase -> 后续 workflow` 的完整路径 |
| 验收与证据 | 10 | 是否能用命令帮助和文档自证入口一致 |
| 变更同步 | 10 | 是否同步 README、help、文档和回归样例 |
| 发布与复盘 | 10 | 是否避免再次出现 brownfield 入口分裂 |
