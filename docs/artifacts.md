# Artifacts

AI-OS 的关键价值之一，是把项目事实落到仓库里，而不是留在聊天上下文里。

这份文档解释项目里几类 AI-OS 文件分别负责什么。

## 三类内容

### 1. 框架受管文件

这些文件由 AI-OS 框架负责：

- `AGENTS.md`
- `.agents/skills/`
- `.agents/workflows/`
- `.ai-os/framework.toml`
- `.ai-os/managed-files.tsv`

它们解决的是“AI 怎么工作”的问题。

### 2. 框架内置模板

这些文件也会跟着框架一起安装：

- `.agents/templates/project/`

它们不是当前项目的真实状态文件，而是给 workflow / skill 生成 `.ai-os/*` 文件时使用的参考模板。

如果你看到这里和 `.ai-os/` 中有相似文件名，这是正常设计，不是重复安装错误。

### 3. 项目本地文件

这些文件由项目自己维护：

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

它们解决的是“这个项目当前是什么状态”的问题。

## 重点文件说明

| 文件 | 它回答的问题 | 什么时候最重要 |
|------|------|------|
| `.ai-os/project-charter.md` | 这个项目要做什么，不做什么 | 项目启动、范围争议时 |
| `.ai-os/risk-register.md` | 现在有哪些重要风险 | 涉及外部依赖、上线风险、复杂协作时 |
| `.ai-os/specs/*.spec.md` | 这个模块到底要实现什么 | 模块开发前和验收前 |
| `.ai-os/specs/*.context.md` | 需求澄清时确认过什么 | 需求反复变化或容易误解时 |
| `.ai-os/tasks.yaml` | 现在要做哪些任务、依赖关系如何 | 执行和排期时 |
| `.ai-os/acceptance.yaml` | 什么才算完成，需要什么证据 | 自测、评审、交付前 |
| `.ai-os/release-plan.md` | 上线时要怎么做，回滚怎么做 | 准备发布时 |
| `.ai-os/memory.md` | 这个项目有哪些长期有效的经验和约定 | 多次协作、多人协作时 |
| `.ai-os/STATE.md` | 当前做到哪了，下一步做什么 | 每次恢复上下文时 |
| `.ai-os/verification-matrix.yaml` | 某类改动需要跑哪些验证 | 改动后验证时 |
| `.ai-os/evals/` | 哪些问题以后不能再犯 | 同类错误反复出现时 |

补充：

- `.ai-os/codebase-map.md` 更偏 brownfield 工件
- 它通常由 `/init` 或 `/map-codebase` 在分析已有代码库后生成
- 因此新项目初始化时不一定会先创建它

## 为什么 `STATE.md` 很关键

AI 很容易在会话切换后丢上下文。

AI-OS 把 `.ai-os/STATE.md` 作为恢复方位的第一入口，目的是让新 session 不必重新通读所有文件，也不用只靠聊天记录猜测当前进度。

一个好的 `STATE.md` 至少应该回答：

- 当前在哪个里程碑、模块、阶段
- 当前任务进展如何
- 有哪些 blocker
- 最近做了什么关键决策
- 下一步最应该做什么

## `tasks.yaml` 和 `acceptance.yaml` 为什么要分开

这两个文件很容易被混淆：

- `tasks.yaml` 关注的是“怎么做”
- `acceptance.yaml` 关注的是“做到什么程度算完成”

前者是执行视角，后者是验收视角。

如果只有任务没有验收，最后很容易变成“代码写了，但没有完成口径”。

## `memory.md` 和 `evals/` 的区别

这两者都在做沉淀，但作用不同：

- `memory.md` 记录稳定事实、经验、约定和坑点
- `evals/` 记录可重复验证的回归样例

可以简单理解为：

- `memory` 负责让 AI 以后少走弯路
- `evals` 负责让 AI 以后少犯同样的错

## 初始化时哪些文件会自动创建

使用 `--with-project-files` 时，会自动创建：

- `project-charter.md`
- `risk-register.md`
- `tasks.yaml`
- `acceptance.yaml`
- `release-plan.md`
- `memory.md`
- `STATE.md`
- `verification-matrix.yaml`
- `specs/example.spec.md`
- `evals/eval-example.md`

如果你是老项目接入，也可以先安装框架，再用 `/init` 基于现有代码生成这些文件。

与此同时，项目里还会保留 `.agents/templates/project/` 作为内部参考模板。

## 相关资料

- 上手方式：见 [getting-started.md](getting-started.md)
- workflow 选择：见 [workflows.md](workflows.md)
- CLI 参考：见 [cli.md](cli.md)
