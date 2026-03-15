# Getting Started

这份文档给第一次接触 AI-OS 的人看。

如果你之前没有系统化使用过 AI 开发，可以先把 AI-OS 理解成：

- 一套安装到仓库里的交付规则
- 一组可复用的技能和工作流
- 一套让 AI 能跨会话恢复上下文的项目文件

它的目标不是让 AI 更会“聊天”，而是让 AI 更会“交付”。

## 先建立一个正确心智

很多人第一次看到 AI-OS，会误以为它是：

- 一个业务脚手架
- 一套提示词合集
- 一个只能在单一工具里使用的插件

其实都不是。

AI-OS 更接近下面这个模型：

1. 你先把 AI-OS 安装进项目。
2. 项目里会多出 `AGENTS.md`、`.agents/` 和 `.ai-os/`。
3. 你在 Codex、Cursor、Antigravity 这类工具里，通过 workflow 驱动 AI。
4. AI 按项目方式工作，并把项目状态写回 `.ai-os/`。

这里有一个第一次很容易误会的点：

- `.agents/templates/project/` 里放的是框架自带模板
- `.ai-os/` 里放的是你这个项目真正要维护的文件

如果两个目录里都出现了 `project-charter.md`、`tasks.yaml`、`STATE.md` 之类的名字，不代表初始化出错，而是“模板”和“实例”同时存在。

## 环境要求

- Node.js 18+
- npm / npx
- 能访问 GitHub 仓库

## 最常见的三种上手路径

### 场景一：从 0 开始做新项目

1. 初始化项目

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

2. 在 AI 工具里使用 `/new-project`

这一步的重点不是立刻写代码，而是先把下面这些东西定下来：

- 目标和成功标准
- 范围边界
- 风险和约束
- 项目里程碑
- 模块和任务图

3. 之后每做一个模块，用 `/new-module`

如果只是一个特别小的改动，可以走 `/quick`。

### 场景二：老项目第一次接入 AI-OS

1. 在项目根目录安装框架

```bash
npx --yes github:royeedai/ai-os .
```

2. 在 AI 工具里使用 `/init`

`/init` 会先分析现有代码库，再生成基础项目文件。重点是：

- 不是从空模板开始手填
- 而是尽量根据现有代码、结构和约束生成真实内容

3. 后续按场景继续

- 加功能或模块：`/map-codebase` 然后 `/new-module`
- 小改动：`/quick`
- 需求变化：`/change-request`

### 场景三：已有仓库上继续开发新功能

如果项目已经接入 AI-OS，推荐这样做：

1. 先用 `/map-codebase`
2. 再用 `/new-module`
3. 模块完成前用 `/review`
4. 准备交付时用 `/ship`

这样做的原因很简单：

- `map-codebase` 帮 AI 先理解当前架构
- `new-module` 让需求、任务、编码、验收保持同步
- `review` 和 `ship` 避免“代码做了，但交付没闭环”

## 如果只是修个小问题怎么办

AI-OS 并不是所有事情都要走完整流程。

下面这类任务通常适合 `/quick`：

- 1 到 3 个文件的小改动
- 小 bug 修复
- 配置修改
- 文案调整

但如果出现下面这些情况，就不该继续走 `/quick`：

- 改动开始扩散
- 牵涉表结构、接口契约、权限、金额或删除类操作
- 需要跨模块联动

这时应该升级到正式模块流程。

## 安装后会生成什么

### 框架文件

这部分由 AI-OS 维护：

- `AGENTS.md`
- `.agents/skills/`
- `.agents/workflows/`
- `.ai-os/framework.toml`

### 项目文件

这部分记录项目事实：

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

如果初始化时加了 `--with-project-files`，会直接创建这些模板。

另外，`.agents/templates/project/` 也会一起出现在项目里。它们是 workflow 和 skill 的参考模板，不是你日常应该直接维护的项目工件。

## 固定版本初始化

如果你希望新项目以后可以稳定复现，不要总是追主分支，可以固定 tag 或 commit：

```bash
npm exec --yes --package=github:royeedai/ai-os#<tag-or-commit> -- create-ai-os my-project --with-project-files
```

例如：

```bash
npm exec --yes --package=github:royeedai/ai-os#v2.6.2 -- create-ai-os my-project --with-project-files
```

前提是对应 tag 或 commit 已经存在于远端仓库。

## 第一次接入后，建议你先确认这几件事

- `AGENTS.md`、`.agents/`、`.ai-os/` 是否已写入仓库
- 团队实际使用的 AI 工具是否能读取 `AGENTS.md`
- `STATE.md` 是否被当成恢复上下文的第一入口
- 小改动和正式模块开发是否明确区分
- 需求变化时，是否会同步更新 `spec`、`tasks`、`acceptance`

## 下一步看什么

- 想知道不同 workflow 怎么选：看 [workflows.md](workflows.md)
- 想知道各个项目文件有什么用：看 [artifacts.md](artifacts.md)
- 想看 CLI 命令：看 [cli.md](cli.md)
