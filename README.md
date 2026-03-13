# AI-OS

AI-OS 是一套给 AI 开发助手使用的项目交付操作系统。  
它不是业务模板，也不是单纯的提示词集合，而是一套把“需求澄清 -> 项目规划 -> 任务拆解 -> 开发实现 -> 验收交付 -> 发布回滚 -> 复盘沉淀”固化下来的规则、skills、workflows 和初始化 CLI。

**跨工具兼容：** AI-OS 基于 `AGENTS.md` 和 `SKILL.md` 两个开放标准构建，原生支持 Google Antigravity、Cursor、OpenAI Codex 以及其他兼容工具（Copilot、Claude Code、Gemini CLI 等）。

目标很明确：让 AI 按项目方式完成交付，而不是只完成一段代码，减少你反复手动提醒遗漏项的次数。

如果把 OpenSpec 看成偏“变更 / spec 协作层”的轻量框架，AI-OS 更偏“交付控制面”：除了 spec，还把 `tasks`、`acceptance`、`release`、`memory`、`evals` 和状态恢复放进同一套闭环。

## 第一次使用只看这里

先不要记所有 skill 名称。第一次上手先分清 1 个接入命令和 4 条 workflow 入口：

| 你现在的场景 | 先用什么 | 结果 |
|------|------|------|
| 老项目第一次接入 AI-OS | `create-ai-os bootstrap .` → 直接开发 | 安装框架后直接用 workflow 开发，项目文件按需自动生成 |
| 从 0 开始做一个项目 | `/new-project` | 先得到项目章程、任务图和风险边界 |
| 已接入 AI-OS 的已有仓库上加功能 | `/map-codebase` → `/new-module` | 先摸清现有架构，再进入模块闭环 |
| 只是修个小 bug / 改个配置 | `/quick` | 快速改动，但仍记录 `tasks.yaml` 和 `STATE.md` |
| 要复刻一个已有系统 | `/clone-project` | 从素材逆向出模块和 spec，再并入标准交付 |

先开始，再继续，再交付：

| 阶段 | 记住这些入口 | 作用 |
|------|------|------|
| Start | `/new-project`、`/map-codebase`、`/quick`、`/clone-project` | 先把任务送进正确 workflow |
| Continue | `/status`、`/next`、`/resume`、`/auto-advance` | 看当前位置、恢复上下文、继续推进 |
| Finish / Govern | `/review`、`/ship`、`/change-request`、`/debug`、`/incident`、`/postmortem` | 做质量审查、交付、变更和事故处理 |

如果你想先看一个完整样本，在初始化时使用 `--with-project-files`，然后查看 `.ai-os/` 下的工件。

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
- 复刻 / 仿制项目（从截图、URL、API 文档逆向还原）

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

仓库是公开的，直接通过 GitHub repo 执行即可。

新项目初始化：

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

老项目第一次接入 AI-OS：

```bash
npx --yes github:royeedai/ai-os bootstrap .
```

参数说明：

- `my-project`：目标项目目录
- `--with-project-files`：额外生成项目章程、任务、验收、发布、记忆、验证基线等初始文件
- `bootstrap .`：在当前已有仓库中补齐 AI-OS 框架文件和基础项目数据，不覆盖已有项目工件

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

- `AGENTS.md`（跨工具通用宪法层，Antigravity / Cursor / Codex 共读）
- `.agents/`（内含 `SKILL.md` 标准的技能模块和工作流）
- `.ai-os/framework.toml`

这部分由 AI-OS 框架负责，属于“通用交付能力”。

### 2. 项目状态文件

加了 `--with-project-files` 后，还会生成：

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

这部分属于项目自己，记录当前项目的事实、范围、验收和经验。

如果执行的是 `create-ai-os bootstrap .`（老项目接入），只会安装框架受管文件和元数据，不会生成项目状态文件。项目文件会在你使用 workflow 时按需自动创建。

当仓库还没有接入 AI-OS 时，先运行 `create-ai-os bootstrap .` 或新项目初始化命令，再进入下面的 workflow。

## 用哪个 workflow

### Start

| 场景 | 推荐入口 | 不该直接做什么 |
|------|----------|----------------|
| 新项目规划 | `/new-project` | 直接开始编码 |
| 既有代码库分析 | `/map-codebase` | 跳过现有约束分析 |
| 新模块开发 | `/new-module` | 只有 spec 没有任务图就开工 |
| 小改动 | `/quick` | 超出 3 个文件还继续走 quick |
| 复刻已有系统 | `/clone-project` | 没整理素材就直接写 spec |

### Continue

| 场景 | 推荐入口 | 不该直接做什么 |
|------|----------|----------------|
| 自动连续推进 | `/auto-advance` | 在 `.ai-os/STATE.md` / `.ai-os/tasks.yaml` 缺失时继续 |
| 看当前进度 | `/status` | 只靠聊天上下文回忆 |
| 判断下一步 | `/next` | 不看依赖图和 wave 就拍脑袋选任务 |
| 恢复中断上下文 | `/resume` | 不读 `.ai-os/STATE.md` 就直接接着做 |

### Finish / Govern

| 场景 | 推荐入口 | 不该直接做什么 |
|------|----------|----------------|
| 模块完成自审 | `/review` | 不看 spec / tasks / acceptance 就宣称完成 |
| 准备交付 | `/ship` | 没有发布计划就宣称可上线 |
| 需求变化 | `/change-request` | 只改代码，不同步工件 |
| 普通 Bug 排查 | `/debug` | 不留证据就拍脑袋修 |
| 线上事故处置 | `/incident` | 先大改而不先止血 |
| 收尾复盘 | `/postmortem` | 修完就结束，不沉淀 memory / evals |

## 一个新项目应该怎么使用

推荐流程如下：

1. 初始化项目

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

2. 在项目里先走 `/new-project`

- 明确目标、范围边界、约束、里程碑
- 选择项目 archetype 和交付等级（L1/L2/L3）
- 补全 `.ai-os/project-charter.md`、`.ai-os/risk-register.md`、`.ai-os/STATE.md`

3. 若在已有代码库上开发，先走 `/map-codebase`

- 分析技术栈、架构、命名约定、现有模式
- 产出 `.ai-os/codebase-map.md`，后续开发参考

4. 每做一个模块走 `/new-module`

- 阶段零：需求澄清（Discuss），理解用户意图
- 阶段一：需求定义，产出 `.ai-os/specs/*.spec.md`
- 阶段二至五：技术设计 → 编码 → 测试 → 审查（含 UAT 脚本）
- 阶段六：重规划检查，评估新发现对后续计划的影响

5. 小任务走 `/quick`

- 1-3 个文件的改动、bug fix、配置变更
- 仍需更新 `.ai-os/tasks.yaml` 和保证编译

6. 想让 AI 连续执行时走 `/auto-advance`

- 按 `.ai-os/tasks.yaml` 的 wave 顺序自动推进
- 每 3 个任务做一次自检，高风险任务暂停确认

7. 模块完成前走 `/review`

- 做结构化自审
- 检查需求、实现、测试、验收是否对齐
- 输出含 UAT 脚本的验收报告

8. 准备交付时走 `/ship`

- 检查发布步骤、Smoke Check、回滚预案
- 完成 `.ai-os/release-plan.md`

9. 出问题时走 `/debug` 或 `/incident`

- 定位问题
- 控制影响面
- 记录修复过程和处置动作

10. 收尾时走 `/postmortem`

- 把重复性坑和有效做法沉淀进 `.ai-os/memory.md`
- 把关键回归场景沉淀进 `.ai-os/evals/`

## 老项目第一次接入应该怎么使用

只需两步：

1. 在现有仓库里安装 AI-OS 框架

```bash
npx --yes github:royeedai/ai-os bootstrap .
```

2. 在 AI 工具里直接开始开发

`bootstrap` 只安装框架文件（`AGENTS.md`、`.agents/`）和元数据，不会生成空模板。项目文件（`project-charter.md`、`tasks.yaml`、`STATE.md` 等）会在你使用 workflow 时按需自动创建并填入真实内容。

按场景选择 workflow：

- 想先分析代码库 → `/map-codebase`
- 要加功能或模块 → `/new-module`
- 小改动 → `/quick`
- 想把整个项目纳入 AI-OS 管理 → `/new-project`

## 复刻项目应该怎么使用

如果你要复刻/仿制一个已有系统，推荐流程如下：

1. 初始化项目

```bash
npx --yes github:royeedai/ai-os my-clone-project --with-project-files
```

2. 收集素材

   - 在项目里创建 `.ai-os/references/clone-materials/` 目录
   - 按类型放入素材：截图放 `screenshots/`、API 文档放 `api/`、URL 写入 `urls.md`、描述写入 `descriptions.md`

3. 启动复刻流程 `/clone-project`

   - AI 自动评估素材覆盖度，提醒你补充不足的部分
   - AI 调用 `reverse-engineer` 逆向分析所有素材
   - 反推出模块清单和每个模块的 `.spec.md` 草稿
   - 你只需要**审阅和修正**，不需要从零写 spec
   - 每条信息标记置信度：`[确认]` / `[推断]` / `[待确认]`

4. 确认后自动合流到标准交付

   - 按模块走 `/new-module`（从技术设计阶段起）
   - 中途对方补充新素材，走 `/change-request` 自动同步
   - 模块完成走 `/review`，准备交付走 `/ship`

## 项目里最重要的工件

- `.ai-os/project-charter.md`：项目章程、范围边界、成功标准、非功能要求
- `.ai-os/specs/*.spec.md`：模块需求规格
- `.ai-os/specs/*.context.md`：模块需求澄清记录（Discuss 阶段产出）
- `.ai-os/tasks.yaml`：任务图、依赖、wave 并行标注、DoR/DoD、证据要求
- `.ai-os/acceptance.yaml`：验收门禁和 Evidence Pack
- `.ai-os/release-plan.md`：发布、回滚、Smoke Check
- `.ai-os/memory.md`：结构化项目记忆（架构决策、编码约定、坑点、偏好、约束）
- `.ai-os/STATE.md`：项目状态仪表盘，AI 恢复上下文的第一入口
- `.ai-os/verification-matrix.yaml`：路径到验证动作、重启和冷启动 Smoke 的基线
- `.ai-os/evals/`：回归用例和系统防退化样例

## 仓库结构

```text
AGENTS.md                        宪法层（AGENTS.md 开放标准）
.agents/skills/                 能力模块（SKILL.md 开放标准）
.agents/skills/AGENTS.md        Skills 触发规则索引
.agents/workflows/              交付工作流
.agents/workflows/AGENTS.md     Workflows 用法索引
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
- `reverse-engineer`
- `find-skills`

核心 Workflows：

- `/new-project`
- `/clone-project`
- `/new-module`（含需求澄清阶段和重规划检查）
- `/quick`（小任务快速通道）
- `/auto-advance`（自动推进模式）
- `/status`（查看当前位置和阻塞项）
- `/next`（推断当前就绪任务）
- `/resume`（恢复上下文）
- `/map-codebase`（已有代码库分析）
- `/review`（含 UAT 脚本）
- `/change-request`
- `/ship`
- `/debug`
- `/incident`
- `/postmortem`

## 跨工具兼容

AI-OS 使用两个开放标准，无需为每种工具维护独立配置文件：

| 标准 | 用途 | 支持的工具 |
|------|------|----------|
| `AGENTS.md` | 项目级规则和宪法 | Antigravity、Cursor、Codex、Copilot、Claude Code、Gemini CLI |
| `SKILL.md` | 可复用技能模块 | Antigravity、Cursor、Codex、Claude Code、Gemini CLI |

在任何工具中打开项目，均可自动读取 `AGENTS.md` 和 `.agents/skills/*/SKILL.md`。

## 这个仓库应该怎么维护

把它当成唯一的 AI-OS 母仓库维护，不要把规则分散到每个项目里。

### 母仓库负责什么

- `AGENTS.md`
- `.agents/skills/`
- `.agents/workflows/`
- 模板和 CLI
- 通用规则、公共经验、回归样例

### 项目仓库负责什么

- `.ai-os/project-charter.md`
- `.ai-os/specs/`
- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- `.ai-os/release-plan.md`
- `.ai-os/memory.md`
- `.ai-os/STATE.md`
- `.ai-os/evals/`

### 推荐维护方式

1. 小改动直接在母仓库迭代
2. 稳定节点更新 `VERSION` 和 `package.json`
3. 创建并推送 tag，例如 `v2.2.0`
4. 新项目初始化优先使用已存在的 tag
5. 多个项目里反复出现的问题，回到母仓库补 rule、skill、workflow 或 eval

## 项目管理 CLI

除了初始化外，AI-OS 还提供一组项目生命周期命令。文档统一使用 `npx --yes github:royeedai/ai-os <command> .` 这一种主心智；`ai-os-*` 可执行文件仍保留为兼容别名，但不是默认文档入口。

### `bootstrap` — 老项目接入

在已有仓库里首次接入 AI-OS 时，优先使用这个命令补齐框架文件和基础项目数据。

```bash
npx --yes github:royeedai/ai-os bootstrap .
npx --yes github:royeedai/ai-os bootstrap . --force-framework
```

它会：

- 补齐 `AGENTS.md` 和 `.agents/`（框架受管文件）
- 写入 `.ai-os/framework.toml` 和 `managed-files.tsv`，让 `doctor / validate / status / resume` 可以工作

它不会：

- 生成空模板项目文件（项目文件由 workflow 按需创建）
- 自动分析代码库或代替 `/map-codebase`
- 取代后续的 `/new-project`、`/new-module` 或 `/quick`

### `doctor` / `validate` — 框架与工件检查

检查目标项目的框架完整性和交付工件闭环。

```bash
npx --yes github:royeedai/ai-os doctor .
npx --yes github:royeedai/ai-os validate .
```

输出 ✓ / ✗ / ⚠ 逐项报告：框架元数据、`AGENTS.md`、skills、workflows、受管文件完整性、项目状态文件。

```bash
npx --yes github:royeedai/ai-os doctor . --strict
```

`--strict` 会进一步校验 `spec -> tasks -> acceptance -> release -> memory -> evals` 的结构完整性和关键引用关系。

`validate` 重点检查：

- `.ai-os/project-charter.md` / `.ai-os/risk-register.md`
- `.ai-os/tasks.yaml` / `.ai-os/acceptance.yaml`
- `.ai-os/release-plan.md` / `.ai-os/memory.md` / `.ai-os/STATE.md` / `.ai-os/verification-matrix.yaml`
- `.ai-os/specs/` / `.ai-os/evals/`
- 关键引用是否存在

### `affected` — 变更感知验证

根据当前变更文件和 `.ai-os/verification-matrix.yaml`，规划或执行 `validate / verify / build / restart / cold-start smoke` 动作。

```bash
npx --yes github:royeedai/ai-os affected .
npx --yes github:royeedai/ai-os affected . --staged
npx --yes github:royeedai/ai-os affected . --base origin/main
npx --yes github:royeedai/ai-os affected . --execute
```

`affected` 默认输出执行计划；带 `--execute` 时会按顺序真正执行动作，并在缺少命令配置或某一步失败时中止。

### `status` / `next` / `resume` — 状态恢复

```bash
npx --yes github:royeedai/ai-os status .
npx --yes github:royeedai/ai-os next .
npx --yes github:royeedai/ai-os resume .
```

- `status`：看当前位置、阻塞项、任务概览
- `next`：找出依赖已满足的就绪任务
- `resume`：输出恢复 session 的最小阅读集

### `diff` / `upgrade` — 框架维护

对比并升级目标项目的框架受管文件。

```bash
npx --yes github:royeedai/ai-os diff .
npx --yes github:royeedai/ai-os diff . --quiet   # 只显示有差异的文件
npx --yes github:royeedai/ai-os diff . --stat     # 只显示统计行
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os upgrade . --dry-run   # 预览变更不实际写入
npx --yes github:royeedai/ai-os upgrade . --preflight # 先检查是否存在覆盖冲突
npx --yes github:royeedai/ai-os upgrade . --force      # 跳过冲突检查直接覆盖
```

`diff` 输出分类：`modified`（本地改动冲突）、`outdated`（仅版本落后，可安全升级）、`missing`（母仓库新增）、`extra`（项目独有）、`unchanged`（一致）。

升级只更新框架受管文件（`AGENTS.md`、`.agents/`），不动项目自有文件（`.ai-os/specs/`、`.ai-os/tasks.yaml`、`.ai-os/memory.md` 等）。用户自定义的额外 skill 或 workflow 会被保留。

注意：

- `--preflight` 可先检查是否存在需人工确认的覆盖冲突
- `--force` 只应该用于替换 `AGENTS.md` 和 `.agents/`
- 项目自己的 `.ai-os/specs/`、`.ai-os/tasks.yaml`、`.ai-os/memory.md` 不应该被母仓库覆盖

### `release-check` — 发布前检查

```bash
npx --yes github:royeedai/ai-os release-check .
```

检查 `.ai-os/release-plan.md` 是否具备具体的发布步骤、Smoke Check、回滚条件，并交叉验证 `.ai-os/acceptance.yaml` 和 `.ai-os/tasks.yaml`。

## 本地开发

本地开发时，也优先使用统一入口：

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

查看帮助：

```bash
node ./bin/create-ai-os.js --help
```

## 当前状态

当前仓库版本号：`2.5.0`

说明：

- 这是当前仓库内的 framework/package version
- 固定版本初始化仍以远端已经存在的 tag 或 commit 为准

当前已经具备：

- 公开 Git 仓库可执行初始化 CLI
- 项目章程 / 任务 / 验收 / 发布 / 记忆模板
- 面向项目交付的 skills 和 workflows
- 框架健康检查（`doctor`）、严格工件校验（`validate`）、状态恢复（`status` / `next` / `resume`）CLI
- 变更感知验证（`affected`）CLI，可根据改动决定是否需要 build / restart / cold-start smoke
- 发布前检查（`release-check`）、差异对比（`diff`）、版本升级（`upgrade`）CLI

## 设计文档

- [Approval Policy](.agents/policies/approval-policy.md)

## License

MIT
