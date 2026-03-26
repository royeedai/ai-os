# AI-OS

AI-OS 是一套给 AI 开发助手使用的项目交付操作系统。

它的目标不是让 AI 更自动写代码，而是让 AI 更稳定地引导你把项目做对：

1. 先把目标和成功标准说清
2. 先锁关键设计和关键逻辑
3. 再推进实现、验证和交付
4. 全程保留可恢复的项目记忆和证据

一句话说：

> AI-OS 让 AI 按“高质量交付”工作，而不只是按“代码生成”工作。

## 它解决什么问题

很多团队开始用 AI 后，会遇到这些问题：

| 常见问题 | AI-OS 的做法 |
|------|------|
| 需求一模糊，AI 就直接开工 | 先走 `/align`，把 Mission 说清 |
| 需求补充后，AI 直接改代码，文档和代码脱节 | 先走 `/change-request`，更新 `MISSION.md` / spec 再执行 |
| 技术栈或关键方案没对齐，AI 就自己拍板 | 在 `/align` 和 `/design` 里把关键选型、确认状态和待确认项写清 |
| 页面做出来了，但逻辑经常错 | 先锁 Design 和关键逻辑，再进入 build |
| bug 修复时顺手乱改，改 A 坏 B | 先走 `/debug`，锁定边界、影响范围和回归计划 |
| 界面上像有功能，但其实不能真用 | 用 spec / verify / acceptance 拦截“假入口、占位态、未验证能力” |
| 代码跑了，但离可交付还很远 | 用 acceptance 的 4 个质量门拦截伪完成 |
| 天然流式 / 长耗时场景被错建成同步接口 | 在 `/plan` 先锁 `interaction_mode`，避免后置重构 |
| 跨层字段或配置改动总是漏联动 | 用 `contract baseline`、`impact_tags`、`impact_rules` 补联动检查 |
| brownfield 任务里藏着全局拆包 / DTO / 样式约定，AI 却只看局部文件就开改 | 在 `/design`、`/debug` 和 review 里先做共享基础设施审计，再锁局部契约 |
| 用户说“系统可设置”，AI 却没确认到底谁来操作、在哪里操作 | 在 `/align` 和 `/change-request` 里轻量追问配置闭环，避免把“可设置”直接等价成某一种实现方式 |
| 资产 / 权限 / 状态流转类需求没被自动升级 | 用硬触发高风险档和专项审查拦截 |
| happy path 通过，但空值 / 异常一碰就碎 | 用 `degraded-path-check` 拦截只测正常流程的伪完成 |
| 交付还需要 SQL / 重启 / 静态校验，AI 却写成“已经全部完成” | 在 `/verify` 和 `/ship` 里显式区分 `AI 已完成` / `需人工执行`，并要求静态校验证据 |
| 一换 session，AI 就忘了做到哪 | 用 `STATE.md` 做恢复入口 |

这些问题的单独台账、覆盖锚点和后续迭代核对入口统一维护在 [docs/problem-ledger.md](docs/problem-ledger.md)。

## 为什么需要 AI-OS

### 2026 年的 AI 编程现实

AI 编码工具已经普及（92% 的美国开发者日常使用），但质量危机正在加深：

- AI 生成代码的 bug 率是人类代码的 **1.7 倍**（CodeRabbit 2026）
- **45%** 的 AI 生成代码含安全漏洞
- 开发者对 AI 代码的信任度从 77% 降至 **60%**
- 技术债积累速度是传统方式的 **3 倍**
- 开发者自以为快了 20%，实际上复杂任务 **慢了 19%**（METR 研究）

核心问题不是 AI 写不出代码，而是 AI 不知道什么时候该停下来确认、什么才算真正完成。

### AI-OS 的差异化

市场上已有运行时护栏工具（如 AgentSteer、Caliper、Ouro Loop），它们在代码层拦截错误动作。AI-OS 做的是更上游的事：

| 层面 | 运行时护栏工具 | AI-OS |
|------|--------------|-------|
| 拦截层 | 代码生成后 | 需求对齐前 |
| 关注点 | 代码安全、工具调用 | 交付质量、目标正确性 |
| 覆盖范围 | 单次 agent turn | 全项目生命周期 |
| 记忆 | 无跨会话记忆 | STATE.md + memory.md |
| 治理深度 | 规则匹配 | 自适应分级（P0/P1/P2） |

AI-OS 不替代这些工具，而是在它们之上提供交付层治理：先确保目标对、设计锁、逻辑通，再让代码护栏去拦实现错误。

## 核心心智

AI-OS 默认按交付阶段进入：

1. `/align`
2. `/design`
3. `/plan`
4. `/build`
5. `/verify`
6. `/ship`

在这条主路径之外，新增兼容性的专项入口：

- `/change-request`：需求变更先同步基准
- `/debug`：单点修复先锁边界再执行
- `/review`：多维度结构化审查
- `/postmortem`：复盘并沉淀稳定经验

它们不替代阶段式 workflow，只负责把变更和修复安全地路由回主流程。

## 新版核心工件

AI-OS 默认围绕这套 `.ai-os/` 工件工作：

| 文件 | 作用 |
|------|------|
| `.ai-os/MISSION.md` | 项目目标、用户、范围、模式、质量标准和最新需求基准 |
| `.ai-os/DESIGN.md` | 信息架构、关键页面、关键交互、视觉方向、关键流程 |
| `.ai-os/specs/` | 业务规则、交互模式、契约基准、状态流转、边界条件 |
| `.ai-os/tasks.yaml` | 任务波次、角色分工、审批点、impact_tags 和证据要求 |
| `.ai-os/acceptance.yaml` | 质量档位、专项审查、设计门、逻辑门、实现质量门、交付质量门 |
| `.ai-os/STATE.md` | 当前方位、已锁定内容、待确认项、确认停点和下一步 |
| `.ai-os/memory.md` | 稳定决策、约束、偏好和坑点 |

按风险或场景补充：

- `.ai-os/release-plan.md`
- `.ai-os/risk-register.md`
- `.ai-os/verification-matrix.yaml`
- `.ai-os/design-pack/parity-map.md`
- `.ai-os/evals/`

## 5 分钟上手

### 1. 安装

新项目：

```bash
npx --yes github:royeedai/ai-os my-project --with-project-files
```

已有项目：

```bash
npx --yes github:royeedai/ai-os .
```

### 2. 在 AI 工具里选对入口

- 从想法开始做项目：`/align`
- 有截图 / API / 参考源码：`/align`，模式设为 `reverse-spec`
- 已有仓库上的需求变更：`/change-request`
- 修一个单点 bug 或做微调：`/debug`
- 需要审查当前方案或实现：`/review`
- 项目 / 里程碑结束复盘：`/postmortem`

### 3. 按确认停点推进

- 目标不清：停在 `/align`
- 设计和流程没锁：停在 `/design`
- 需要 spec / tasks / acceptance：先 `/plan`
- 只有在用户确认了需求基准、设计方案和任务验收后，才进入 `/build`
- 准备判断“是不是做对了”：`/verify`
- 准备交付：`/ship`

## 三条推荐路径

### 1. 从想法开始的新项目

`/align -> /design -> /plan -> /build -> /verify -> /ship`

### 2. 截图 / API / 源码驱动的对标项目

`/align(reverse-spec) -> /design -> /plan -> /build -> /verify -> /ship`

### 3. 已有项目里的局部变更

`/change-request -> /plan 或 /design -> /build -> /verify`

### 4. 单点 bug / 微调

`/debug -> /verify`

## 常用 CLI

```bash
npx --yes github:royeedai/ai-os doctor .
npx --yes github:royeedai/ai-os validate .
npx --yes github:royeedai/ai-os status .
npx --yes github:royeedai/ai-os next .
npx --yes github:royeedai/ai-os resume .
npx --yes github:royeedai/ai-os diff .
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os release-check .
npx --yes github:royeedai/ai-os cursor-rules .
npx --yes github:royeedai/ai-os token-budget .
npx --yes github:royeedai/ai-os lab /tmp/ai-os-labs
```

`lab` 会批量创建多种项目类型的本地沙盒，自动跑 `doctor` / `validate` / `status` / `next`，并输出一份 `lab-report.md`，适合做 AI-OS 自身的 smoke 和“做到哪一步才该叫用户验收”的演练。

## 更多文档

- [docs/getting-started.md](docs/getting-started.md)
- [docs/workflows.md](docs/workflows.md)
- [docs/artifacts.md](docs/artifacts.md)
- [docs/problem-ledger.md](docs/problem-ledger.md)
- [docs/ai-os-v2-customization-guide.md](docs/ai-os-v2-customization-guide.md)
- [docs/cli.md](docs/cli.md)
- [examples/README.md](examples/README.md)
- [evals/README.md](evals/README.md)
