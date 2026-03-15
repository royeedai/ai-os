# CLI Reference

AI-OS 的 CLI 分成两类：

- 初始化框架
- 检查、恢复、维护和发布辅助

官方推荐的主入口是统一使用 `create-ai-os`。

通过 GitHub 直接执行时，文档统一写成：

```bash
npx --yes github:royeedai/ai-os <command> .
```

兼容别名如 `ai-os-status`、`ai-os-validate` 仍然存在，但不建议作为主文档入口。

## 初始化

### 新项目

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

执行后通常会看到三类内容：

- `AGENTS.md`、`.agents/skills/`、`.agents/workflows/` 这类框架文件
- `.agents/templates/project/` 这类内部参考模板
- `.ai-os/` 下的项目状态文件

真正需要持续维护的项目工件主要在 `.ai-os/`。

从 `v2.7.0` 开始，新初始化项目的工件还会明确：

- 核心模块属于什么模块类型（页面 / API / 数据处理 / 工具）
- 默认交付等级是什么（L1 / L2 / L3）
- 是否存在共享基础能力依赖结构

### 老项目第一次接入

```bash
npx --yes github:royeedai/ai-os .
```

### 固定版本

```bash
npm exec --yes --package=github:royeedai/ai-os#<tag-or-commit> -- create-ai-os my-project --with-project-files
```

## 帮助

查看主帮助：

```bash
node ./bin/create-ai-os.js --help
```

当前入口摘要：

- `create-ai-os [target-dir]`
- `create-ai-os doctor [target-dir]`
- `create-ai-os validate [target-dir]`
- `create-ai-os status [target-dir]`
- `create-ai-os next [target-dir]`
- `create-ai-os resume [target-dir]`
- `create-ai-os affected [target-dir]`
- `create-ai-os diff [target-dir]`
- `create-ai-os upgrade [target-dir]`
- `create-ai-os release-check [target-dir]`

## 检查类命令

### `doctor`

检查 AI-OS 框架是否安装完整。

```bash
npx --yes github:royeedai/ai-os doctor .
npx --yes github:royeedai/ai-os doctor . --strict
```

`--strict` 会进一步校验项目本地交付工件。

### `validate`

检查 `.ai-os/` 中关键工件的结构完整性。

```bash
npx --yes github:royeedai/ai-os validate .
```

重点覆盖：

- `project-charter.md`
- `risk-register.md`
- `tasks.yaml`
- `acceptance.yaml`
- `release-plan.md`
- `memory.md`
- `STATE.md`
- `verification-matrix.yaml`
- `specs/`
- `evals/`

从 `v2.7.0` 起，`validate` 也会兼容新的 spec 结构：

- spec 中允许记录模块类型和交付等级
- “界面 / 接口 / 命令清单”这类更通用的章节标题会被识别
- 不再强依赖所有模块都按页面 + API + 数据库三件套书写

## 恢复与继续

### `status`

查看当前位置、阻塞项和任务概览。

```bash
npx --yes github:royeedai/ai-os status .
```

### `next`

推断依赖已经满足的下一批任务。

```bash
npx --yes github:royeedai/ai-os next .
```

### `resume`

输出恢复 session 需要的最小上下文包。

这三个命令仍然围绕 `.ai-os/STATE.md`、`.ai-os/tasks.yaml` 工作；如果项目已经按模块类型和交付等级记录，它们会更容易给出贴合当前模块的续做入口。

```bash
npx --yes github:royeedai/ai-os resume .
```

## 变更感知验证

### `affected`

根据代码变更和 `.ai-os/verification-matrix.yaml` 决定应该执行哪些验证动作。

```bash
npx --yes github:royeedai/ai-os affected .
npx --yes github:royeedai/ai-os affected . --staged
npx --yes github:royeedai/ai-os affected . --base origin/main
npx --yes github:royeedai/ai-os affected . --execute
```

默认输出计划。带 `--execute` 时才真正执行。

## 框架维护

### `diff`

对比目标项目的框架受管文件和当前 AI-OS 源。

```bash
npx --yes github:royeedai/ai-os diff .
npx --yes github:royeedai/ai-os diff . --quiet
npx --yes github:royeedai/ai-os diff . --stat
```

### `upgrade`

升级框架受管文件。

```bash
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os upgrade . --dry-run
npx --yes github:royeedai/ai-os upgrade . --preflight
npx --yes github:royeedai/ai-os upgrade . --force
```

注意：

- 默认只升级安全可替换的框架文件
- `--preflight` 用来先检查冲突
- `--force` 会覆盖冲突的框架受管文件
- 项目自己的 `.ai-os/specs/`、`.ai-os/tasks.yaml`、`.ai-os/memory.md` 不应被框架覆盖

## 发布前检查

### `release-check`

检查发布计划、验收条件和任务完成情况是否具备交付条件。

```bash
npx --yes github:royeedai/ai-os release-check .
```

对于 `L3` 高风险模块，`release-check` 更重要，因为这类模块通常还要求额外的安全、架构和回滚准备。

## 本地开发时的调用方式

在仓库开发阶段，推荐直接调用本地入口：

```bash
node ./bin/create-ai-os.js my-project --with-project-files
node ./bin/create-ai-os.js doctor my-project
node ./bin/create-ai-os.js validate my-project
node ./bin/create-ai-os.js affected my-project
node ./bin/create-ai-os.js diff my-project
node ./bin/create-ai-os.js upgrade my-project
node ./bin/create-ai-os.js status my-project
node ./bin/create-ai-os.js next my-project
node ./bin/create-ai-os.js resume my-project
node ./bin/create-ai-os.js release-check my-project
```
