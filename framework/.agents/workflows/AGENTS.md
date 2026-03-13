# Workflows 使用指南

本目录包含 AI-OS 的交付工作流。每个工作流是一个 Markdown 文件，定义了特定场景下的执行步骤。

第一次上手时，不需要记住所有命令。先记住 `Start` 这一组入口，再按需要使用 `Continue` 和 `Finish / Govern`。

## Start

| 命令 | 用途 |
|------|------|
| `/init` | 老项目初始化（分析代码库 → 生成项目章程、任务图等基础文件） |
| `/new-project` | 新项目启动（需求 → 章程 → 模块规划 → 任务图） |
| `/map-codebase` | 分析已有代码库（技术栈、架构、约定、模式） |
| `/new-module` | 新模块开发（澄清 → spec → 任务 → 编码 → 验收 → 重规划） |
| `/quick` | 小任务快速通道（1-3 文件改动，无需完整三件套） |
| `/clone-project` | 复刻项目（素材收集 → 逆向分析 → 标准交付） |

## Continue

| 命令 | 用途 |
|------|------|
| `/status` | 查看当前位置、阻塞项和任务概览 |
| `/next` | 推断当前最值得执行的就绪任务 |
| `/resume` | 从 `.ai-os/STATE.md` 恢复上下文并给出最小阅读集 |
| `/auto-advance` | 自动推进模式（按 `.ai-os/tasks.yaml` 的 wave 顺序自动执行） |

## Finish / Govern

| 命令 | 用途 |
|------|------|
| `/review` | 模块完成后质量审查（含 UAT 脚本） |
| `/ship` | 发布与交付（发布检查、回滚准备、Smoke Check） |
| `/change-request` | 需求变更（范围变化、补充需求、漏项修正） |
| `/debug` | Bug 系统化调试 |
| `/incident` | 线上事故处置（止血 → 定位 → 修复） |
| `/postmortem` | 事故与漏项复盘 |

## 如何触发

当用户提到以上命令或描述了匹配的场景时，读取对应的 `.md` 文件并按步骤执行。

## 项目文件自动创建

`npx create-ai-os .` 安装框架文件（`AGENTS.md`、`.agents/`）和元数据。项目工件（`project-charter.md`、`tasks.yaml`、`STATE.md` 等）通过 `/init` 工作流一次性生成，或由其他 workflow 在执行过程中按需创建。如果 `.ai-os/` 目录不存在，workflow 应自动创建它。

## 场景匹配指南

### Start

| 用户说 | 触发 |
|--------|------|
| "初始化项目" / "初始化老项目" / "给项目建基础文件" / "init" | `/init` |
| "做一个新项目" / "从 0 开始" | `/new-project` |
| "复刻一个系统" / "仿制一个产品" | `/clone-project` |
| "分析一下现有代码" / "先了解下代码库" | `/map-codebase` |
| "加个功能" / "做一个新模块" | `/new-module` |
| "改个小 bug" / "加个配置" / "改个文案" | `/quick` |

### Continue

| 用户说 | 触发 |
|--------|------|
| "自动往下做" / "按任务图继续" / "auto" | `/auto-advance` |
| "现在做到哪了" / "status" | `/status` |
| "下一步做什么" / "next" | `/next` |
| "继续" / "resume" / "从上次接着来" | `/resume` |

### Finish / Govern

| 用户说 | 触发 |
|--------|------|
| "检查下代码" / "review 一下" | `/review` |
| "需求变了" / "加个新要求" | `/change-request` |
| "准备上线" / "可以发布了吗" | `/ship` |
| "有个 bug" / "报错了" | `/debug` |
| "线上出问题了" / "紧急故障" | `/incident` |
| "复盘一下" / "总结经验" | `/postmortem` |
