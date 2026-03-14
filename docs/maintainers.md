# Maintainers

这份文档面向 AI-OS 母仓库维护者。

如果你只是想知道怎么在项目里使用 AI-OS，优先看：

- [../README.md](../README.md)
- [getting-started.md](getting-started.md)

## 这个仓库负责什么

AI-OS 母仓库负责维护的是“通用交付能力”，包括：

- `framework/AGENTS.md`
- `framework/.agents/skills/`
- `framework/.agents/workflows/`
- `framework/.agents/templates/`
- `bin/` 下的 CLI
- 测试和发布检查逻辑

项目仓库负责维护的是“项目事实”，包括：

- `.ai-os/project-charter.md`
- `.ai-os/specs/`
- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- `.ai-os/release-plan.md`
- `.ai-os/memory.md`
- `.ai-os/STATE.md`
- `.ai-os/evals/`

一句话概括：

> 通用规则在 AI-OS 母仓库里维护，项目事实在项目仓库里维护。

## 仓库结构

```text
framework/   可分发给用户项目的内容
bin/         CLI 源码
test/        CLI 集成测试
docs/        项目文档
README.md    面向用户的首页说明
VERSION      框架版本
```

## 开发约束

这个仓库遵循的关键约束包括：

- 仅使用 Node.js 内置模块
- CLI 脚本放在 `bin/`
- 公共逻辑放在 `bin/shared.js`
- 新增 CLI 命令时同步更新 `package.json` 的 `bin` 字段和 `README.md`
- 改动 `framework/` 下内容时，同步更新 `VERSION`

更完整的开发规则见 [../AGENTS.md](../AGENTS.md)。

## 推荐维护方式

1. 通用规则、skill、workflow、模板和 CLI 都在母仓库迭代
2. 稳定节点更新 `VERSION`
3. 如有必要，创建并推送版本 tag
4. 新项目初始化优先使用稳定 tag
5. 多个项目重复出现的问题，回到母仓库补规则、skill、workflow 或 eval

## 本地开发

常用本地调用方式：

```bash
node ./bin/create-ai-os.js --help
node ./bin/create-ai-os.js my-project --with-project-files
node ./bin/create-ai-os.js doctor my-project
node ./bin/create-ai-os.js validate my-project
```

## 测试

运行完整测试：

```bash
npm test
```

手动验证常见命令：

```bash
node bin/create-ai-os.js /tmp/test-project --with-project-files
node bin/ai-os-doctor.js /tmp/test-project
node bin/ai-os-diff.js /tmp/test-project
node bin/ai-os-upgrade.js /tmp/test-project
node bin/ai-os-release-check.js /tmp/test-project
```

## 发布前自查

发布前至少确认：

- `VERSION` 和 `package.json` 是否一致
- `framework/` 的变更是否反映到 README / docs
- 新命令是否补齐帮助信息
- 测试是否通过
- 如有框架层变更，是否考虑升级说明

## 相关文档

- 审批策略：`framework/.agents/policies/approval-policy.md`
