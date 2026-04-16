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
| 需求一模糊，AI 就直接开工 | 先走 `/align`，先锁当前交付基线章程 |
| 需求补充后，AI 直接改代码，文档和代码脱节 | 先走 `/change-request`，更新 `MISSION.md` / spec 再执行 |
| 技术栈或关键方案没对齐，AI 就自己拍板 | 在 `/align` 和 `/design` 里把关键选型、确认状态和待确认项写清 |
| 页面做出来了，但逻辑经常错 | 先锁 Design 和关键逻辑，再进入 build |
| bug 修复时顺手乱改，改 A 坏 B | 先走 `/debug`，锁定边界、影响范围和回归计划 |
| 界面上像有功能，但其实不能真用 | 用 spec / verify / acceptance 拦截“假入口、占位态、未验证能力” |
| 代码跑了，但离可交付还很远 | 用 acceptance 的 4 个质量门拦截伪完成 |
| 天然流式 / 长耗时场景被错建成同步接口 | 在 `/plan` 先锁 `interaction_mode`，避免后置重构 |
| 跨层字段或配置改动总是漏联动 | 用 `contract baseline`、`impact_tags`、`impact_rules` 补联动检查 |
| brownfield 任务里藏着全局拆包 / DTO / 样式约定，AI 却只看局部文件就开改 | 在 `/design`、`/debug` 和 review 里先做共享基础设施审计，再锁局部契约 |
| 老项目开始做新需求时，AI 把整个项目重新当成 mission | 在 brownfield / change 中，`MISSION.md` 只定义本轮交付基准，宿主项目只保留必要上下文 |
| 多人并行时 Mission 总冲突，确认记录和变更日志互相覆盖 | 把 `MISSION.md` 变薄成低频章程，把高频变更挪到 `baseline-log/` 和 `STATE.md` |
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

AI-OS 默认采用“共享根层 + `lanes/default`”的工件拓扑。共享项目事实留在 `.ai-os/` 根层，当前交付线的 Mission / Design / Tasks / Acceptance / State 下沉到 `.ai-os/lanes/default/`。legacy 单交付项目仍可继续使用 `.ai-os/` 根层结构，并可通过 `create-ai-os upgrade . --to-lanes` 机械迁移。

| 路径 | 作用 |
|------|------|
| `.ai-os/project.md` | 跨 lane 共享的宿主项目章程：项目身份、共享技术约束、共享质量基线和跨 lane 协调规则 |
| `.ai-os/CONVENTIONS.md` | 项目级代码约定（命名、模式、分层、日志），防止跨 session 实现风格漂移 |
| `.ai-os/memory.md` | 稳定决策、约束、偏好和坑点 |
| `.ai-os/lanes/default/MISSION.md` | 当前交付线的低频、已确认、共享的交付基线章程：当前目标、范围、模式、质量标准、当前基线 ID |
| `.ai-os/lanes/default/baseline-log/` | 当前交付线的共享基线记录目录：每条记录单独成 `CR-YYYYMMDD-HHMMSS-slug.md` / `BL-YYYYMMDD-HHMMSS-slug.md` 文件，记录基线分析、确认和升格结果，供多人协作对齐和审计；不要再用全局递增的 `001/002` 编号 |
| `.ai-os/lanes/default/DESIGN.md` | 当前交付线的信息架构、关键页面、关键交互、视觉方向、关键流程 |
| `.ai-os/lanes/default/specs/` | 当前交付线的业务规则、交互模式、契约基准、状态流转、边界条件 |
| `.ai-os/lanes/default/tasks.yaml` | 当前交付线的任务波次、角色分工、审批点、impact_tags 和证据要求；团队协作下每个任务必须有稳定 `owner`，任务 ID 推荐用 `TASK-<OWNER>-NNN` |
| `.ai-os/lanes/default/acceptance.yaml` | 当前交付线的质量档位、专项审查、设计门、逻辑门、实现质量门、交付质量门 |
| `.ai-os/lanes/default/STATE.md` | 当前交付线的当前方位、已锁定内容、待确认项、确认停点和下一步 |

按风险或场景补充：

- `.ai-os/lanes/default/release-plan.md`
- `.ai-os/lanes/default/risk-register.md`
- `.ai-os/lanes/default/verification-matrix.yaml`：联动验证命令、impact_rules 和稳定 failure mode guard；high-risk 交付至少保留一条真实 `failure_modes` guard，且 `guards` 应指向 `acceptance.yaml` 已声明 evidence 或现有 `.ai-os/lanes/<lane-id>/evals/*.md`
- `.ai-os/lanes/default/design-pack/parity-map.md`
- `.ai-os/lanes/default/evals/`：把稳定失败模式、关键回归样例和 tricky path 验证沉淀成项目级评估样例

## 5 分钟上手

### 1. 安装

最快体验（只要 MISSION.md + STATE.md + 核心工作流 + 门禁）：

```bash
npx --yes github:royeedai/ai-os my-project --quick
```

新项目完整安装：

```bash
npx --yes github:royeedai/ai-os my-project --profile project
```

已有项目：

```bash
npx --yes github:royeedai/ai-os .
```

安装前如果想先看会管理哪些内容：

```bash
npx --yes github:royeedai/ai-os plan . --profile core
npx --yes github:royeedai/ai-os plan my-project --profile project
```

说明：

- 默认 profile 是 `core`
- `quick`：极简安装，只含 AGENTS.md + 主路径工作流 + YAML 门禁 + MISSION.md + STATE.md，适合首次接触或小项目
- `core`：只安装框架层和 `.ai-os/framework.toml`、`.ai-os/managed-files.tsv`，适合已有项目先接入
- `project`：安装框架层，并创建共享根层工件 + `.ai-os/lanes/default/` starter 工件，适合新项目
- `--with-project-files` 仍然保留，作为 `--profile project` 的兼容别名
- `--quick` 项目复杂度增长时，可直接重新运行 `create-ai-os <target> --profile project` 补齐完整 starter 工件
- 老项目第一次接入时，常见做法是先用默认 `core` profile 安装框架，再通过 `/align` / `/plan` 逐步生成项目事实

### 2. 在 AI 工具里选对入口

- 从想法开始做项目：`/align`
- 有截图 / API / 参考源码：`/align`，模式设为 `reverse-spec`
- 已有仓库上的需求变更：`/change-request`（先新增 `baseline-log/CR-YYYYMMDD-HHMMSS-slug.md`，`MISSION.md` 只在章程变化时更新）
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

## 四条推荐路径

### 1. 从想法开始的新项目

`/align -> /design -> /plan -> /build -> /verify -> /ship`

### 2. 截图 / API / 源码驱动的对标项目

`/align(reverse-spec) -> /design -> /plan -> /build -> /verify -> /ship`

### 3. 已有项目里的局部变更

`/change-request -> /plan 或 /design -> /build -> /verify`

### 4. 单点 bug / 微调

`/debug -> /verify`

## 团队协作

多人使用 AI-OS 同时开发同一项目时，`create-ai-os` 会自动配置 `.gitignore` 和 `.gitattributes`：

- **会话文件**（根层 legacy `STATE.md`，以及 lane 结构下的 `.ai-os/lanes/*/STATE.md`、`context-snapshot.md` 等）不入版本控制，每位开发者本地维护；`/status`、`/next`、`/resume` 会在缺失 `STATE.md` 时从 `MISSION.md`、最新 confirmed baseline、`DESIGN.md`、`tasks.yaml`、`acceptance.yaml` 自动重建
- **追加式知识** 中，`baseline-log/` 通过“一条记录一个文件”降低冲突；`memory.md` 使用 `merge=union` 降低追加式合并冲突；`tasks.yaml` 保持正常合并，避免把同一任务的并发编辑静默拼接
- **项目共识**（`MISSION.md`、`DESIGN.md`、`CONVENTIONS.md`、`specs/`、`acceptance.yaml` 等；lane 模型下其中前四类默认分布在共享根层和 `.ai-os/lanes/<lane-id>/`）正常入版本控制，团队共享
- `baseline-log/` 文件名默认使用“时间戳 + 语义 slug”，避免多人分支去抢 `BL-001` 这类连续编号

推荐协作方式：

- 会改变 `MISSION.md` 的需求基线调整，先走独立的 baseline-sync 提交落主干
- 功能分支默认不修改 `MISSION.md`，只消费最新 baseline 并更新代码、spec、tasks、acceptance
- `tasks.yaml` 里每个任务都要有稳定 `owner`；`/build` 阶段默认只更新自己任务的运行态字段（如 `status`、`blockers`、`notes`），不要顺手改 `baseline_id`、里程碑定义或他人任务

如需跳过自动配置：

```bash
npx --yes github:royeedai/ai-os my-project --profile project --no-team-config
```

### 多交付 Lane

`project` profile 新安装默认会创建 `.ai-os/lanes/default/`。如果是旧版单交付项目，可运行 `create-ai-os upgrade . --to-lanes` 把根层 Mission / Design / Tasks / Acceptance / State / baseline-log / specs 机械迁到 `lanes/default/`。

`status`、`next`、`resume`、`doctor`、`validate`、`gate`、`release-check` 都支持 `--lane <lane-id>` 读取指定 lane；若项目仍是 legacy 单交付结构，则自动退化到根层 `.ai-os/`。当存在多个 active lane 而未传 `--lane` 时，CLI 会列出候选 lane、推荐命令示例，并提示如何恢复自动选择。详见 `docs/cli.md` 和 `docs/evolution/multi-delivery-lanes-proposal.md`。

Lane 生命周期命令：

```bash
create-ai-os lane list .
create-ai-os lane add payments .
create-ai-os lane activate payments .
create-ai-os lane activate payments . --only
create-ai-os lane archive payments .
```

- `lane add` 默认会在已有 active lane 的项目里把新 lane 建成 `draft`，避免刚创建就打破自动选择；如果这是项目里的第一条 lane，或你显式传了 `--activate`，则会直接成为 active
- `lane activate ... --only` 会把其他 active lane 回退为 `draft`，适合在多人并行后恢复“单 active lane 自动选择”
- `lane list` 会列出 `active / draft / archived` lane 及其 baseline、quality tier、owner，方便团队确认当前并行拓扑
- 进入 `/align`、`/change-request`、`/verify` 前，先判断这轮工作是继续当前 lane，还是应该先 `lane add` 新建并行 lane；不要把两条并行交付线硬塞进同一条 lane
- `ai-os-validate`、`create-ai-os gate`、`ai-os-release-check` 在 lane 项目里会给出 lane-aware 修复建议：lane 选错时直接列出可复制的 `--lane` 重跑命令；显式指定某条 lane 时，也会提醒这次只覆盖当前 lane，若共享代码 / 契约 / 基础设施受影响，仍需补跑其他 lane
- 若仓库已有 Git 基线，这三条命令还会结合当前 worktree 改动给出更高置信度的 lane 候选：例如命中了共享根层工件、其他 lane 工件，或仓库里存在 `.ai-os/` 之外的改动时，会优先提示最可能需要补跑的 lane

## IDE 兼容性

安装时自动生成所有 IDE 适配文件，无需额外步骤：

| IDE 工具 | 加载机制 | 生成产物 |
|----------|---------|---------|
| **Codex CLI** | 原生读取 `AGENTS.md` + `.agents/skills/` | 无需额外文件 |
| **Cursor** | `.cursor/rules/` + `.cursor/skills/` | 1 条 alwaysApply 规则 + N 个渐进式披露 Skill |
| **Claude Code** | 优先读 `CLAUDE.md` | 会话初始化 + workflow 命令表 + skill 触发表 |
| **Antigravity** | 原生读 `AGENTS.md`，`GEMINI.md` 补充 | workflow 快速参考 |

安装后的效果：

- 在 Cursor 中输入 `/align`、`/design` 等命令，agent 自动发现对应 workflow skill
- 在 Claude Code 中新建 session，自动加载 `CLAUDE.md` 获得 workflow 和 skill 引用
- 在 Codex CLI 中，`.agents/skills/` 原生作为 skill 被发现
- 在 Antigravity 中，`AGENTS.md` 原生加载 + `GEMINI.md` 提供命令快速参考

进入 AI-OS CLI 主能力的规则，默认要求在所有已承诺支持的环境都有等价承接；如果只能在单一 IDE 生效，就留在该 IDE 的适配层，不进入 CLI 主能力。

如需跳过 IDE 文件生成：

```bash
npx --yes github:royeedai/ai-os my-project --profile project --no-ide-files
```

如需手动重新生成（例如删除了 IDE 适配文件后恢复）：

```bash
npx --yes github:royeedai/ai-os cursor-rules .
```

IDE 适配文件（`CLAUDE.md`、`GEMINI.md`、`.cursor/`）建议入版本控制，供团队共享。

## 常用 CLI 命令

官方推荐的主入口是 `create-ai-os`。通过 GitHub 直接执行时，下面这些示例会写成 `npx --yes github:royeedai/ai-os <command> ...` 的形式。

除了初始化，AI-OS 还提供一组用于检查、恢复和维护的 CLI：

```bash
npx --yes github:royeedai/ai-os plan . --profile core
npx --yes github:royeedai/ai-os doctor .
npx --yes github:royeedai/ai-os validate .
npx --yes github:royeedai/ai-os gate align .
npx --yes github:royeedai/ai-os status .
npx --yes github:royeedai/ai-os lane list .
npx --yes github:royeedai/ai-os lane add payments .
npx --yes github:royeedai/ai-os next .
npx --yes github:royeedai/ai-os resume .
npx --yes github:royeedai/ai-os diff .
npx --yes github:royeedai/ai-os upgrade .
npx --yes github:royeedai/ai-os release-check .
npx --yes github:royeedai/ai-os cursor-rules .
npx --yes github:royeedai/ai-os token-budget .
npx --yes github:royeedai/ai-os lab /tmp/ai-os-labs
```

这些命令分别用来做：

- `plan`：预览当前 profile 会管理哪些内容
- `doctor` / `validate`：检查框架和交付工件是否完整
- `gate`：检查阶段门禁——当前阶段的前置/出口条件是否满足，回答"能不能进入下一阶段"
- `status` / `next` / `resume`：恢复项目上下文
- `lane`：管理多交付 lane（list / add / activate / archive）
- `diff` / `upgrade`：对比并升级框架文件
- `release-check`：发布前做最后检查
- `cursor-rules`：手动重新生成 IDE 适配文件（安装时已自动生成，通常不需要单独运行）

`gate` 读取 YAML 工作流定义中的门禁规则，对项目工件做确定性检查。支持 `gate <phase>`（检查指定阶段出口）、`gate <phase> --entry`（检查入口）、`gate --all`（全阶段扫描）、`gate --json`（CI 集成输出）。详见 [docs/cli.md](docs/cli.md)。

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
