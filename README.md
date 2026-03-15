# AI-OS

AI-OS 是一套给 AI 开发助手使用的项目交付操作系统。

如果你不太熟悉 AI 开发流程，可以把它理解成一套安装到项目里的规则、技能和工作流，让 AI 不只是“写一段代码”，而是按项目方式推进：先澄清需求，再拆任务、实现、验收、发布、复盘。

它不是业务模板，也不是某个单一工具的专属插件。它更像是一层可落地到仓库里的交付规范，核心通过 `AGENTS.md`、`SKILL.md`、workflow 文件和 `.ai-os/` 项目状态文件来工作。

## 60 秒看懂

AI-OS 主要做三件事：

1. 用 `create-ai-os` 把一套交付规则安装进项目。
2. 在 Codex、Cursor、Antigravity 这类支持 `AGENTS.md` / `SKILL.md` 的工具里，使用 `/init`、`/new-project`、`/new-module` 等 workflow 驱动 AI 工作。
3. 把项目事实写进仓库中的 `.ai-os/`，让 AI 能恢复上下文、同步任务、验收和发布，而不是只靠聊天记录。

一句话说，AI-OS 想解决的是：

> 让 AI 按项目交付，而不只是按对话输出。

## 它真正解决什么问题

很多团队开始用 AI 写代码后，会遇到这些很真实的问题：

| 常见问题 | AI-OS 的做法 |
|------|------|
| 需求一句话就开工，越做越偏 | 先通过 workflow 做需求澄清、项目章程和 spec |
| 代码写出来了，但任务、验收、发布没人管 | 把 `tasks`、`acceptance`、`release` 一起放进流程 |
| 一换会话，AI 就忘了做到哪 | 用 `.ai-os/STATE.md` 和项目工件恢复上下文 |
| 每个项目都得反复提醒 AI 规范和边界 | 把通用规则放在 `AGENTS.md` 和 `.agents/` |
| 老项目接入 AI 很乱，不知道先分析还是先改 | 提供 `/init`、`/map-codebase`、`/quick` 等分场景入口 |
| 需求变了，代码改了，但文档和验收口径没同步 | 用变更流程把 spec、tasks、acceptance、release 一起更新 |

如果你只想判断这项目值不值得用，可以看一个标准：

- 如果你只是偶尔让 AI 改两行代码，AI-OS 可能偏重。
- 如果你已经开始让 AI 连续做模块、做交付、做维护，AI-OS 会更有价值。

## 你真正会怎么使用它

正常使用时，不需要先背所有 skill 名称。先记住下面这套心智就够了：

- 第一步：用 `npx` 把 AI-OS 安装到项目里。
- 第二步：在 AI 工具里输入适合当前场景的 workflow。
- 第三步：让 AI 把项目状态写进 `.ai-os/`，以后都从这里继续。

最常见的 4 种用法如下：

| 你的场景 | 先做什么 | 结果 |
|------|------|------|
| 老项目第一次接入 AI-OS | `npx --yes github:royeedai/ai-os .` 然后用 `/init` | 安装框架并生成项目基础文件 |
| 从 0 开始做一个项目 | `npx --yes github:royeedai/ai-os my-project --with-project-files` 然后用 `/new-project` | 建立项目章程、范围和任务图 |
| 已接入 AI-OS 的仓库上加功能 | `/map-codebase` 然后 `/new-module` | 先摸清现状，再按模块闭环开发 |
| 只是修个小 bug / 改配置 | `/quick` | 快速改动，但仍保留任务和状态记录 |

现在还有一个关键心智：

- 不是所有模块都走同一条重流程
- `new-module` 会先判断模块类型（页面 / API / 数据处理 / 工具）和交付等级（L1 / L2 / L3）
- 页面类模块如果能把静态 UI 明确拆成独立子任务，可以先交给更适合视觉产出的模型，再回到主流程完成数据接入、状态、路由和验收
- AI-OS 追求的是“最低足够流程”，不是所有需求一律按全栈大模块处理

## 5 分钟上手

### 环境要求

- Node.js 18+
- npm / npx
- 能访问 GitHub 仓库

### 1. 安装到目标项目

新项目：

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

老项目第一次接入：

```bash
npx --yes github:royeedai/ai-os .
```

### 2. 在 AI 工具里输入第一个 workflow

按你的场景选一个开始：

- 现有仓库第一次初始化基础文件：`/init`
- 从 0 启动新项目：`/new-project`
- 给已有仓库加功能：`/map-codebase`，然后 `/new-module`
- 小改动：`/quick`
- 复刻一个已有产品：`/clone-project`

### 3. 看生成出来的关键文件

安装后你会在项目里看到三类内容：

- 框架文件：`AGENTS.md`、`.agents/skills/`、`.agents/workflows/`、`.ai-os/framework.toml`
- 内部参考模板：`.agents/templates/project/`
- 项目文件：`.ai-os/project-charter.md`、`.ai-os/tasks.yaml`、`.ai-os/acceptance.yaml`、`.ai-os/STATE.md` 等

这里最容易让人困惑的是第二类。

`.agents/templates/project/` 里也会有 `project-charter.md`、`tasks.yaml`、`STATE.md` 这些名字，但它们是框架自带模板，不是你日常维护的项目事实。

真正会持续更新、代表当前项目状态的，是 `.ai-os/` 下面那一套文件。

## 安装后你会得到什么

### 1. 一套框架能力

这部分由 AI-OS 维护，负责让不同 AI 工具在同一个项目里遵守一致规则：

- `AGENTS.md`
- `.agents/skills/`
- `.agents/workflows/`
- `.ai-os/framework.toml`
- `.ai-os/managed-files.tsv`

### 2. 一套内部参考模板

这部分也会跟着框架一起安装，但它不是你日常维护的项目事实，而是给 workflow / skill 生成工件时参考的模板：

- `.agents/templates/project/`

可以把它理解成：

- `.agents/templates/project/*`：框架模板
- `.ai-os/*`：当前项目真正生效的文件

### 3. 一套项目事实

这部分属于你的项目，记录真实的范围、进度和交付状态：

- `.ai-os/project-charter.md`
- `.ai-os/risk-register.md`
- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- `.ai-os/release-plan.md`
- `.ai-os/memory.md`
- `.ai-os/STATE.md`
- `.ai-os/verification-matrix.yaml`
- `.ai-os/specs/`
- `.ai-os/evals/`

补充一点：

- `.ai-os/codebase-map.md` 通常不是在新项目初始化时直接创建
- 它更常见于老项目接入，由 `/init` 或 `/map-codebase` 在分析现有代码库后生成

## 关键文件，用人话解释

如果你第一次接触这些文件，不必被名字吓到。它们分别对应的是：

| 文件 | 作用 |
|------|------|
| `.ai-os/project-charter.md` | 这个项目要做什么，不做什么，成功标准是什么 |
| `.ai-os/specs/*.spec.md` | 某个模块的需求定义，包含模块类型和交付等级 |
| `.ai-os/tasks.yaml` | 这次要做哪些任务，先做什么，后做什么，会按模块类型和等级缩放 |
| `.ai-os/acceptance.yaml` | 什么算完成，需要哪些证据，会按模块类型和等级缩放 |
| `.ai-os/release-plan.md` | 真要交付或上线时怎么发，怎么回滚 |
| `.ai-os/memory.md` | 项目里长期有效的约定、坑点和经验 |
| `.ai-os/STATE.md` | 当前做到哪了，下一步是什么，恢复上下文先看它 |
| `.ai-os/verification-matrix.yaml` | 哪类改动需要执行哪些验证动作 |
| `.ai-os/evals/` | 用来防止 AI 以后重复犯错的回归样例 |

补充：

- `.ai-os/specs/*.context.md` 不是每个模块都一定会创建
- 它只在需求仍然模糊、需要记录用户偏好或 AI 默认决策时才出现

## 什么时候用哪个 workflow

第一次上手，不需要记住全部，只要先会选入口。

### Start

| 场景 | 用哪个 workflow |
|------|------|
| 老项目初始化基础文件 | `/init` |
| 新项目启动 | `/new-project` |
| 分析已有代码库 | `/map-codebase` |
| 开发一个新模块 | `/new-module` |
| 小范围改动 | `/quick` |
| 复刻已有系统 | `/clone-project` |

`/new-module` 现在会先判断：

- 这是页面类、API 类、数据处理类还是工具类
- 该模块属于 `L1`、`L2` 还是 `L3`
- 是否受当前里程碑和共享基础能力依赖约束
- 若为页面类，是否存在可独立切分的静态 UI 子任务

所以它不再是“所有新功能都按一条固定重流程处理”。

补充一点：

- 静态 UI 子任务只负责页面结构、样式、响应式和占位内容
- API、状态管理、路由、权限、数据接入和最终验收仍然要回到主流程完成

### Continue

| 场景 | 用哪个 workflow |
|------|------|
| 看当前位置 | `/status` |
| 判断下一步 | `/next` |
| 恢复中断上下文 | `/resume` |
| 自动连续推进 | `/auto-advance` |

### Finish / Govern

| 场景 | 用哪个 workflow |
|------|------|
| 模块完成后自审 | `/review` |
| 需求变更 | `/change-request` |
| 准备交付 / 发布 | `/ship` |
| 调试问题 | `/debug` |
| 线上事故处理 | `/incident` |
| 复盘沉淀 | `/postmortem` |

完整说明见 [docs/workflows.md](docs/workflows.md)。

如果只是纯视觉微调、静态样式修正或低风险排版调整，也可以走 `/quick`。但一旦涉及交互、状态、接口或数据逻辑，就不应继续按“纯静态 UI”处理。

## 常用 CLI 命令

除了初始化，AI-OS 还提供一组用于检查、恢复和维护的 CLI：

```bash
npx --yes github:royeedai/ai-os doctor .
npx --yes github:royeedai/ai-os validate .
npx --yes github:royeedai/ai-os status .
npx --yes github:royeedai/ai-os next .
npx --yes github:royeedai/ai-os resume .
npx --yes github:royeedai/ai-os affected .
npx --yes github:royeedai/ai-os diff .
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os release-check .
```

这些命令分别用来做：

- `doctor` / `validate`：检查框架和交付工件是否完整
- `status` / `next` / `resume`：恢复项目上下文
- `affected`：按代码变更决定要做哪些验证
- `diff` / `upgrade`：对比并升级框架文件
- `release-check`：发布前做最后检查

完整参数和示例见 [docs/cli.md](docs/cli.md)。

## 跨工具兼容

AI-OS 基于 `AGENTS.md` 和 `SKILL.md` 两个开放标准构建。当前文档明确覆盖的工具有：

- Antigravity
- Cursor
- Codex

如果某个工具支持读取 `AGENTS.md` / `SKILL.md`，通常也能复用这套结构。

## 更多文档

- [docs/getting-started.md](docs/getting-started.md) - 面向第一次接触 AI-OS 的完整上手说明
- [docs/workflows.md](docs/workflows.md) - 各个 workflow 该在什么场景下使用
- [docs/artifacts.md](docs/artifacts.md) - `.ai-os/` 中每类文件到底记录什么
- [docs/cli.md](docs/cli.md) - CLI 命令参考
- [docs/maintainers.md](docs/maintainers.md) - 这个母仓库如何维护、测试和发布
- [examples/README.md](examples/README.md) - 两类高频项目场景的使用示例

## License

MIT
