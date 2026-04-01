# Getting Started

AI-OS 的默认顺序不是"先写代码"，而是：

1. `/align`
2. `/design`
3. `/plan`
4. `/build`
5. `/verify`
6. `/ship`

## 选择安装方式

**完整安装**（19 个 skill + 14 个 workflow，~99K tokens）：

```bash
npx --yes github:royeedai/ai-os my-project --profile project
```

安装前如果想先确认 AI-OS 会管理哪些内容，可以先预览：

```bash
npx --yes github:royeedai/ai-os plan . --profile core
npx --yes github:royeedai/ai-os plan my-project --profile project
```

其中：

- `core` 只安装框架层和 `.ai-os/` 元数据
- `project` 会额外创建 starter 项目工件
- `--with-project-files` 仍保留，作为 `--profile project` 的兼容别名

**轻量安装**（核心 workflow + 必要 skill，~32K tokens，适合小项目或首次体验）：

```bash
npx --yes github:royeedai/ai-os my-project --profile project --lite
```

**IDE 适配文件**：安装时会自动生成 `.cursor/`、`CLAUDE.md`、`GEMINI.md`。

如需手动恢复：

```bash
npx --yes github:royeedai/ai-os cursor-rules my-project
```

如需跳过生成：

```bash
npx --yes github:royeedai/ai-os my-project --profile project --no-ide-files
```

## 第一次使用先记住 6 件事

- `MISSION.md` + `specs/` 是当前交付的唯一需求真理源
- `brownfield` / `change` 下，`MISSION.md` 记录的是本轮要交付什么，不是把整个老项目重新定义一遍
- `DESIGN.md` 负责锁关键页面和关键流程
- `CONVENTIONS.md` 负责锁项目级代码约定，避免多 session / 多人协作时模式漂移
- `tasks.yaml` + `acceptance.yaml` 负责把任务、验收和证据闭环写清
- `STATE.md` 负责恢复上下文、确认停点和下一步

## 安装后你会看到什么

- `AGENTS.md`
- `.agents/skills/`（lite 模式只含 acceptance-gate 和 memory-manager）
- `.agents/workflows/`（lite 模式只含 align/design/build/verify/debug）
- `.ai-os/MISSION.md`
- `.ai-os/DESIGN.md`
- `.ai-os/CONVENTIONS.md`
- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- `.ai-os/STATE.md`
- `.ai-os/memory.md`
- `.ai-os/specs/`

只有使用 `project` profile（或兼容别名 `--with-project-files`）时，这些 starter 文件才会在初始化阶段直接创建。`core` profile 只会先写入框架和 `.ai-os/framework.toml`、`.ai-os/managed-files.tsv`。

## 什么时候用专项入口

- 需求补充、范围变化、验收改变：`/change-request`
- 单一 bug、样式微调、文案修正、配置修复：`/debug`
- 需要正式审查当前方案或实现：`/review`
- 项目 / 里程碑结束后做复盘：`/postmortem`

## 什么时候继续往下做

- Mission 说不清：不要离开 `/align`
- 老项目新增需求时，不要把整个存量项目重写成 Mission；先锁本轮交付基准
- Design 没锁：不要进入完整 `/build`
- Spec / tasks / acceptance 不完整：先 `/plan`
- 命中资产、权限、不可逆状态流转、跨用户数据或并发敏感更新：直接升到 `high-risk`
- 想判断"是不是真的做对了"：用 `/verify`

## 检查你的项目

```bash
npx --yes github:royeedai/ai-os doctor .        # 框架和工件健康检查
npx --yes github:royeedai/ai-os validate .       # 交付工件完整性校验
npx --yes github:royeedai/ai-os token-budget .   # 查看框架 token 占用
```
