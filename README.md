# AI 项目交付操作系统 V2

一套适用于任何技术栈的 AI 驱动项目交付框架。目标不是“帮 AI 写代码”，而是让 AI 能从需求开始，沿着固定工件、任务状态、验收门禁、发布回滚和复盘记忆，尽量独立地完成一个项目，减少你反复补提醒的次数。

## 推荐接入方式

当前推荐方式是：**直接通过 Git 仓库执行 `create-ai-os` CLI**。

```bash
# 你的仓库（SSH）
npx --yes git+ssh://git@github.com:royeedai/ai-os.git my-project --with-project-files

# 更显式的写法
npm exec --yes --package=git+ssh://git@github.com:royeedai/ai-os.git -- create-ai-os my-project --with-project-files
```

如果仓库是私有的，先确认本机 SSH 到 GitHub 正常：

```bash
ssh -T git@github.com
```

这个模式的特点：

- 用户不用手动复制 `agent.md` 和 `.agents`
- 暂时不需要发布到 npm registry
- 仓库本身就是唯一真源
- 以后发布 npm 时，CLI 结构可以直接复用

## 管理模型

最合理的管理方式是两层分离：

1. **框架母仓库**
   这个仓库本身，只维护通用规则、skills、workflows、模板和 CLI。
2. **项目本地状态**
   每个项目只保存自己的 `project-charter.md`、`specs/`、`tasks.yaml`、`acceptance.yaml`、`release-plan.md`、`memory.md`。

初始化时，CLI 会把框架文件生成到目标项目，并写入一份项目元数据：

```text
.ai-os-project/
└── framework.toml
```

它用于记录：

- 当前项目采用的分发模式
- 框架版本
- 当前使用的包名与包版本

## 当前 CLI

本仓库已经提供一个可执行包入口：

- `create-ai-os`

本地直接运行：

```bash
node ./bin/create-ai-os.js my-project --with-project-files
```

Git 仓库远程执行：

```bash
npx --yes git+ssh://git@github.com:royeedai/ai-os.git my-project --with-project-files
```

帮助：

```bash
node ./bin/create-ai-os.js --help
```

## 生成内容

CLI 会把以下内容生成到目标项目：

- `agent.md`
- `.agents/`
- `.ai-os-project/framework.toml`

如果加了 `--with-project-files`，还会补齐：

- `project-charter.md`
- `risk-register.md`
- `tasks.yaml`
- `acceptance.yaml`
- `release-plan.md`
- `memory.md`
- `specs/`
- `evals/`

## 备用方案

如果你需要更强的版本锁定或团队内部统一升级策略，还保留了两个备用方案，但它们不再是默认入口：

### 1. Submodule 模式

- `scripts/attach-ai-os-submodule.sh`
- `scripts/update-ai-os-submodule.sh`

适合内部团队、Git 熟练用户、希望显式锁定框架仓库版本的场景。

### 2. Copy 模式

- `scripts/init-ai-os.sh`
- `scripts/upgrade-ai-os.sh`

只作为 fallback，不推荐作为默认方案。

## 框架组成

```text
项目根目录/
├── agent.md                            ← 宪法（项目交付铁律）
├── .agents/
│   ├── skills/                         ← 核心 Skills
│   │   ├── project-planner/            ← 新项目章程、范围、里程碑、风险
│   │   ├── task-orchestrator/          ← 任务图、依赖、DoR/DoD、证据要求
│   │   ├── acceptance-gate/            ← 阶段验收与 Evidence Pack
│   │   ├── change-impact-analyzer/     ← 需求变更影响分析与同步
│   │   ├── release-manager/            ← 发布、回滚、Smoke Check
│   │   ├── memory-manager/             ← 项目记忆与经验沉淀
│   │   ├── agent-evals-guard/          ← 规则/Skill 自身回归验证
│   │   ├── spec-validator/             ← 模块 spec 完整性
│   │   ├── fullstack-dev-checklist/    ← 默认全栈质量清单
│   │   ├── code-review-guard/          ← 交付前结构化自审
│   │   ├── security-guard/             ← 安全审计
│   │   ├── architecture-reviewer/      ← 架构审查
│   │   ├── database-schema-design/     ← 数据库设计
│   │   ├── api-design/                 ← API 设计
│   │   ├── testing-strategies/         ← 测试策略
│   │   ├── systematic-debugging/       ← 系统化调试
│   │   ├── performance-optimization/   ← 性能优化
│   │   ├── git-workflow/               ← Git 规范
│   │   └── find-skills/                ← 搜索安装新 Skills
│   └── workflows/                      ← 交付工作流
│       ├── new-project.md              ← 新项目启动
│       ├── new-module.md               ← 新模块开发
│       ├── review.md                   ← 阶段/交付审查
│       ├── change-request.md           ← 需求变更
│       ├── ship.md                     ← 发布上线
│       ├── debug.md                    ← 调试修复
│       ├── incident.md                 ← 线上事故处置
│       └── postmortem.md               ← 复盘与规则回流
```

## 推荐工件

- `project-charter.md`：项目章程、边界、目标、非功能需求、里程碑
- `specs/*.spec.md`：模块级规格
- `tasks.yaml`：任务图、依赖、状态、证据要求
- `acceptance.yaml`：验收条件与 Evidence Pack
- `risk-register.md`：项目风险与审批点
- `release-plan.md`：发布计划、回滚策略、Smoke Check
- `memory.md`：项目稳定记忆、决策与坑点
- `evals/`：系统规则/Skill 的基准任务与回归样例

## 工作流

| 命令 | 触发方式 | 用途 |
|------|---------|------|
| `/new-project` | “做一个新项目” | 项目章程 → 模块规划 → 任务图 → 风险/验收 |
| `/new-module` | “开发一个新模块” | 模块 spec → 设计 → 编码 → 测试 → 验收 |
| `/review` | “检查下代码/能交付了吗” | 自审 + 验收门禁 + 专项审查 |
| `/change-request` | “需求改一下/范围变了” | 影响分析 → 更新 spec/tasks/tests/release |
| `/ship` | “准备上线/交付用户” | 发布检查、回滚、Smoke Check、观测性 |
| `/debug` | “有个 Bug/测试挂了” | 系统化调试 → 修复 → 回归 → 沉淀 |
| `/incident` | “线上出问题了” | 先止血，再排障，再评估是否回滚 |
| `/postmortem` | “复盘这次事故/漏项” | 结论 → memory → evals → 规则修正 |

## 适用项目类型

V2 默认支持以下 archetype，并要求先选择类型再套用清单：

- 全栈业务系统 / SaaS 后台
- 面向用户的 Web 产品
- API / 服务端项目
- AI Agent / Workflow 应用
- 数据处理 / ETL / 定时报表
- CLI / SDK / 开发工具
- 轻量移动端 / H5 项目

## 使用原则

1. 无项目章程，不启动项目级开发。
2. 无 `.spec.md`、无 `tasks.yaml`、无验收条件，不开始模块编码。
3. 无 Evidence Pack，不允许宣称“完成”。
4. 需求变更必须全链同步，不允许只改代码不改工件。
5. 每次事故、Bug、漏项，都必须回流到 `memory` 或 `evals`。

## 适用范围

- 适用于任何语言（Go/Java/Python/Node/Rust 等）
- 适用于任何前端框架（Vue/React/Angular 等）
- 适用于所有支持 Rules / Skills / Workflows 的 AI 编程环境
