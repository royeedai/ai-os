# Workflows

AI-OS 的 workflow 是给 AI 使用的工作入口。

第一次使用时，不需要记住所有名字。你只需要先会判断：

- 我现在是在开始一个任务
- 还是在继续推进
- 还是在收尾、验收或处理变更

## Start

这组 workflow 用来把任务送进正确入口。

| workflow | 适用场景 | 结果 |
|------|------|------|
| `/init` | 老项目第一次初始化 AI-OS 基础文件 | 分析现有代码库并生成项目章程、任务图、STATE 等 |
| `/new-project` | 从 0 启动新项目 | 先明确目标、范围、风险、里程碑和模块规划 |
| `/map-codebase` | 先理解现有代码库 | 识别技术栈、架构、命名和约束 |
| `/new-module` | 做一个正式的新模块 | 经过澄清、spec、任务、编码、测试、验收、重规划 |
| `/quick` | 小范围改动 | 走快速通道，但仍保留任务和状态记录 |
| `/clone-project` | 复刻或仿制一个已有产品 | 从素材逆向出模块和 spec，再并入标准交付 |

## Continue

这组 workflow 用来恢复上下文和持续推进。

| workflow | 适用场景 | 结果 |
|------|------|------|
| `/status` | 想知道现在做到哪 | 查看当前位置、阻塞项和任务概览 |
| `/next` | 想知道下一步做什么 | 推断依赖已满足的就绪任务 |
| `/resume` | 中断后继续 | 输出恢复 session 的最小阅读集 |
| `/auto-advance` | 想让 AI 自动连续推进 | 按任务图的顺序自动执行，并在关键点暂停 |

## Finish / Govern

这组 workflow 用来做交付收口、变更和事故处置。

| workflow | 适用场景 | 结果 |
|------|------|------|
| `/review` | 模块完成前自审 | 检查需求、实现、测试、验收是否对齐 |
| `/ship` | 准备交付或上线 | 检查发布步骤、回滚预案和 Smoke Check |
| `/change-request` | 需求变化或范围变化 | 同步更新 spec、tasks、acceptance、release 等 |
| `/debug` | 普通 bug 排查 | 用更系统化的方式定位和修复问题 |
| `/incident` | 线上事故或高风险故障 | 先止血，再定位、修复和记录 |
| `/postmortem` | 收尾复盘 | 把经验沉淀进 memory 和 evals |

## 三条最常见的推荐路径

### 1. 新项目

推荐路径：

1. `/new-project`
2. `/new-module`
3. `/review`
4. `/ship`
5. `/postmortem`

这个路径适合从头规划并逐步交付的项目。

### 2. 老项目第一次接入

推荐路径：

1. `/init`
2. `/map-codebase`
3. `/new-module` 或 `/quick`
4. `/review`

这里最重要的是，先让 AI 认识现有代码库，再开始动手。

### 3. 复刻已有系统

推荐路径：

1. 准备素材
2. `/clone-project`
3. `/new-module`
4. `/review`
5. `/ship`

常见素材包括：

- 页面截图
- 线上 URL
- API 文档
- 产品说明
- 交互描述

## `/quick` 什么时候适合，什么时候不适合

适合：

- 小 bug
- 配置修改
- 文案修改
- 影响范围清晰的 1 到 3 个文件改动

不适合：

- 已经涉及多个模块
- 涉及数据库、接口契约、权限、金额、删除
- 改动范围还不明确
- 需要正式验收和交付证明

一旦超出快速通道边界，就应该切回 `/new-module`。

## `status`、`next`、`resume` 的区别

- `/status` 看的是当前总览
- `/next` 看的是当前最值得执行的就绪任务
- `/resume` 给的是恢复工作所需的最小阅读集

如果你只记一个恢复入口，就记住：

> 新 session 先看 `.ai-os/STATE.md`，然后再决定是否用 `/status`、`/next`、`/resume`。

## 什么时候需要 `change-request`

出现下面这些情况，说明你不该只改代码：

- 用户补了新需求
- 范围扩大了
- 验收口径变了
- 技术方案发现必须调整
- 新风险影响到交付计划

这时应该让变更同步到项目工件，而不是只让聊天记录记住。

## 相关资料

- AI-OS 首页说明：见 [../README.md](../README.md)
- 项目文件说明：见 [artifacts.md](artifacts.md)
- CLI 命令：见 [cli.md](cli.md)
