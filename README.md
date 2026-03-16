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

| 常见问题 | AI-OS vNext 的做法 |
|------|------|
| 需求一模糊，AI 就直接开工 | 先走 `/align`，把 Mission 说清 |
| 页面做出来了，但逻辑经常错 | 先锁 Design 和关键逻辑，再进入 build |
| 代码跑了，但离可交付还很远 | 用 acceptance 的 4 个质量门拦截伪完成 |
| 一换 session，AI 就忘了做到哪 | 用 `STATE.md` 做恢复入口 |
| reverse-spec 项目只会“做得像” | 用 parity map 管关键对照关系 |
| 用户没有确认关键决策 | 把待确认项和设计确认记录写进工件 |

## vNext 心智

AI-OS vNext 默认按交付阶段进入，而不是先按场景命令进入：

1. `/align`
2. `/design`
3. `/plan`
4. `/build`
5. `/verify`
6. `/ship`

继续推进时常用：

- `/status`
- `/next`
- `/resume`
- `/auto-advance`

旧命令仍保留一个大版本作为兼容别名：

- `/new-project`
- `/clone-project`
- `/new-module`
- `/quick`
- `/review`
- `/change-request`
- `/init`
- `/map-codebase`

## 新版核心工件

AI-OS vNext 默认围绕这套 `.ai-os/` 工件工作：

| 文件 | 作用 |
|------|------|
| `.ai-os/MISSION.md` | 项目目标、用户、范围、模式和质量标准 |
| `.ai-os/DESIGN.md` | 信息架构、关键页面、关键交互、视觉方向、关键流程 |
| `.ai-os/specs/` | 业务规则、接口契约、状态流转、边界条件 |
| `.ai-os/tasks.yaml` | 任务波次、角色分工、审批点和证据要求 |
| `.ai-os/acceptance.yaml` | 设计门、逻辑门、实现质量门、交付质量门 |
| `.ai-os/STATE.md` | 当前方位、已锁定内容、待确认项、下一步和最小阅读集 |
| `.ai-os/memory.md` | 稳定决策、约束、偏好和坑点 |

按风险或场景补充：

- `.ai-os/release-plan.md`
- `.ai-os/risk-register.md`
- `.ai-os/design-pack/parity-map.md`
- `.ai-os/verification-matrix.yaml`
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

### 2. 在 AI 工具里从 `/align` 开始

常见起点：

- 从想法开始做项目：`/align`
- 有截图 / API / 参考源码：`/align`，模式设为 `reverse-spec`
- 已有仓库上的变更：`/align`，模式设为 `change`

### 3. 按阶段推进

- 目标不清：`/align`
- 设计和流程没锁：`/design`
- 需要 spec / tasks / acceptance：`/plan`
- 准备实现：`/build`
- 准备判断“是不是做对了”：`/verify`
- 准备交付：`/ship`

## 三条推荐路径

### 1. 从想法开始的新项目

`/align -> /design -> /plan -> /build -> /verify -> /ship`

### 2. 截图 / API / 源码驱动的对标项目

`/align(reverse-spec) -> /design -> /plan -> /build -> /verify -> /ship`

### 3. 已有项目里的局部变更

`/align(change) -> /plan 或 /design -> /build -> /verify`

## 常用 CLI

```bash
npx --yes github:royeedai/ai-os doctor .
npx --yes github:royeedai/ai-os validate .
npx --yes github:royeedai/ai-os status .
npx --yes github:royeedai/ai-os next .
npx --yes github:royeedai/ai-os resume .
npx --yes github:royeedai/ai-os migrate .
npx --yes github:royeedai/ai-os release-check .
```

## 迁移旧项目

如果你的项目还是旧版工件命名，可以先运行：

```bash
npx --yes github:royeedai/ai-os migrate .
```

它会尝试：

- `project-charter.md -> MISSION.md`
- `reference-code-map.md -> design-pack/parity-map.md`
- 自动补出 `DESIGN.md`
- 生成迁移说明文件

## 更多文档

- [docs/getting-started.md](docs/getting-started.md)
- [docs/workflows.md](docs/workflows.md)
- [docs/artifacts.md](docs/artifacts.md)
- [docs/cli.md](docs/cli.md)
- [examples/README.md](examples/README.md)
- [evals/README.md](evals/README.md)
