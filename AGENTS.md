# AI-OS 仓库维护规则

本仓库是 AI-OS 的安装器、模板和文档源码仓库，不是安装后的 AI-OS 项目。

## 核心边界

- 不在本仓库创建、恢复或维护 `.ai-os/`、lane、baseline、tasks、memory、STATE 或其他下游项目工件。
- 根 `AGENTS.md` 只约束本仓库维护；分发宪法源只能是 `framework/.agents/templates/root/AGENTS.md`。
- 不新增 doctor、安装后 runtime、IDE pointer、adapter、skill wrapper 或工件类别，除非用户明确要求。

## 修改原则

- 先读相关源码和测试，再做最小必要改动；改安装行为时同步更新安装器、模板、README、文档和测试。
- v11 只维护 `AGENTS.md` 的 AI-OS managed block，必须保留 block 外项目规则。
- 检测到 v10 `.ai-os/` 必须停止并要求人工整合；不得自动删除、迁移或猜测合并项目事实。
- 稳定事实应落在项目已有的 README、ADR、issue、设计文档、代码、配置或测试中。
- 不提交逐任务 plan、spec、流程或会话记忆文档。

## 验证

- 常规收口：`npm test`、`npm run lint`、`git diff --check`。
- 安装测试应覆盖创建和更新 managed block、保留既有内容，以及发现 `.ai-os/` 时安全停止。
