# AI-OS

AI-OS 是一套给 AI 开发助手使用的项目交付操作系统。  
它不是业务模板，也不是单纯的提示词集合，而是一套把“需求澄清 -> 项目规划 -> 任务拆解 -> 开发实现 -> 验收交付 -> 发布回滚 -> 复盘沉淀”固化下来的规则、skills、workflows 和初始化 CLI。

目标很明确：让 AI 按项目方式完成交付，而不是只完成一段代码，减少你反复手动提醒遗漏项的次数。

## 适合谁

适合已经在用 AI 开发，但经常遇到这些问题的人：

- 需求一句话就开始写，后面不断返工
- 功能做完了，但任务、验收、发布、回滚没人管
- 同样的坑每个项目都要重新提醒 AI 一遍
- 每个项目都复制一份规则，后续升级越来越难

适用项目类型：

- Web 产品 / SaaS 后台
- API / 服务端项目
- AI Agent / Workflow 应用
- 数据处理 / ETL / 报表系统
- CLI / SDK / 工具类项目
- 轻量移动端 / H5

## 它的核心思路

- 母仓库只维护通用规则、skills、workflows、模板和 CLI
- 新项目通过 `create-ai-os` 一次性初始化
- 项目里保留本地稳定工件，不依赖临时聊天上下文
- 项目经验通过 `memory` 和 `evals` 回流，持续增强系统

如果只记一条原则，就是：

> 通用规则在 AI-OS 仓库里维护，项目事实在项目仓库里维护。

## 快速开始

### 环境要求

- Node.js 18+
- npm / npx
- 能访问公开 GitHub 仓库

### 推荐用法

仓库是公开的，直接通过 GitHub repo 执行即可：

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

参数说明：

- `my-project`：目标项目目录
- `--with-project-files`：额外生成项目章程、任务、验收、发布、记忆等初始文件

### 固定版本初始化

如果你希望新项目稳定复现，不要永远追主分支，可以固定 tag 或 commit。  
但要注意：只有当仓库已经对外创建并推送了对应 tag 或 commit 时，这种写法才可用。

示例：

```bash
npm exec --yes --package=github:royeedai/ai-os#<tag-or-commit> -- create-ai-os my-project --with-project-files
```

例如在你发布了 `v2.2.0` 之后，再使用：

```bash
npm exec --yes --package=github:royeedai/ai-os#v2.2.0 -- create-ai-os my-project --with-project-files
```

## 初始化后会生成什么

AI-OS 会在目标项目里生成两类内容。

### 1. 框架受管文件

- `agent.md`
- `.agents/`
- `.ai-os-project/framework.toml`

这部分由 AI-OS 框架负责，属于“通用交付能力”。

### 2. 项目状态文件

加了 `--with-project-files` 后，还会生成：

- `project-charter.md`
- `risk-register.md`
- `tasks.yaml`
- `acceptance.yaml`
- `release-plan.md`
- `memory.md`
- `specs/`
- `evals/`

这部分属于项目自己，记录当前项目的事实、范围、验收和经验。

## 一个新项目应该怎么使用

推荐流程如下：

1. 初始化项目

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

2. 在项目里先走 `/new-project`

- 明确目标、范围边界、约束、里程碑
- 补全 `project-charter.md` 和 `risk-register.md`

3. 每做一个模块走 `/new-module`

- 为模块产出 `specs/*.spec.md`
- 更新 `tasks.yaml`
- 明确 `acceptance.yaml`

4. 模块完成前走 `/review`

- 做结构化自审
- 检查需求、实现、测试、验收是否对齐

5. 准备交付时走 `/ship`

- 检查发布步骤、Smoke Check、回滚预案
- 完成 `release-plan.md`

6. 出问题时走 `/debug` 或 `/incident`

- 定位问题
- 控制影响面
- 记录修复过程和处置动作

7. 收尾时走 `/postmortem`

- 把重复性坑和有效做法沉淀进 `memory.md`
- 把关键回归场景沉淀进 `evals/`

## 项目里最重要的工件

- `project-charter.md`：项目章程、范围边界、成功标准、非功能要求
- `specs/*.spec.md`：模块需求规格
- `tasks.yaml`：任务图、依赖、DoR/DoD、证据要求
- `acceptance.yaml`：验收门禁和 Evidence Pack
- `release-plan.md`：发布、回滚、Smoke Check
- `memory.md`：稳定记忆、设计决策、常见坑
- `evals/`：回归用例和系统防退化样例

## 仓库结构

```text
agent.md                         宪法层
.agents/skills/                 能力模块
.agents/workflows/              交付工作流
bin/create-ai-os.js             Git 仓库可执行 CLI
VERSION                         框架版本
```

核心 Skills：

- `project-planner`
- `task-orchestrator`
- `acceptance-gate`
- `change-impact-analyzer`
- `release-manager`
- `memory-manager`
- `agent-evals-guard`
- `spec-validator`
- `fullstack-dev-checklist`
- `code-review-guard`
- `security-guard`
- `architecture-reviewer`
- `database-schema-design`
- `api-design`
- `testing-strategies`
- `systematic-debugging`
- `performance-optimization`
- `git-workflow`

核心 Workflows：

- `/new-project`
- `/new-module`
- `/review`
- `/change-request`
- `/ship`
- `/debug`
- `/incident`
- `/postmortem`

## 这个仓库应该怎么维护

把它当成唯一的 AI-OS 母仓库维护，不要把规则分散到每个项目里。

### 母仓库负责什么

- `agent.md`
- `.agents/skills/`
- `.agents/workflows/`
- 模板和 CLI
- 通用规则、公共经验、回归样例

### 项目仓库负责什么

- `project-charter.md`
- `specs/`
- `tasks.yaml`
- `acceptance.yaml`
- `release-plan.md`
- `memory.md`
- `evals/`

### 推荐维护方式

1. 小改动直接在母仓库迭代
2. 稳定节点更新 `VERSION` 和 `package.json`
3. 创建并推送 tag，例如 `v2.2.0`
4. 新项目初始化优先使用已存在的 tag
5. 多个项目里反复出现的问题，回到母仓库补 rule、skill、workflow 或 eval

## 当前版本下的升级建议

现在已经有初始化 CLI，但还没有完整的 `upgrade` / `doctor` / `diff` CLI。  
所以当前阶段推荐这样管理：

- 新项目：如果已经发布 tag，就固定 tag 初始化；否则先用主分支
- 老项目要同步框架：先人工评估差异，再决定是否重跑初始化
- 如果明确要覆盖框架文件，可以在项目根目录重新执行并加 `--force-framework`

主分支示例：

```bash
npx --yes github:royeedai/ai-os . --force-framework
```

固定版本示例：

```bash
npm exec --yes --package=github:royeedai/ai-os#<tag-or-commit> -- create-ai-os . --force-framework
```

注意：

- `--force-framework` 只应该用于替换 `agent.md` 和 `.agents/`
- 项目自己的 `specs/`、`tasks.yaml`、`memory.md` 不应该被母仓库覆盖

## 本地开发

直接运行 CLI：

```bash
node ./bin/create-ai-os.js my-project --with-project-files
```

查看帮助：

```bash
node ./bin/create-ai-os.js --help
```

## 当前状态

当前版本：`v2.2.0`

当前已经具备：

- 公开 Git 仓库可执行初始化 CLI
- 项目章程 / 任务 / 验收 / 发布 / 记忆模板
- 面向项目交付的 skills 和 workflows

下一步优先补：

- `upgrade` CLI
- `doctor` CLI
- `diff` CLI

这三项补上后，AI-OS 就不只是“能初始化”，而是能持续管理整个 AI 项目开发流程。
