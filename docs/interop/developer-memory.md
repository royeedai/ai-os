# AI-OS × Developer-Level Memory (per-developer / per-machine)

> "记住我是谁、我怎么写代码"的记忆，**不属于 AI-OS 工件**。它属于每个 agent shell 自己的 **global rules**（home 目录下，按本机 OS 用户识别）：Cursor user rules、Claude Code 全局 `~/.claude/CLAUDE.md`、Codex 全局 instructions。AI-OS 只负责**项目级**真理源（`.ai-os/`）。这份文档说明四层记忆如何分工、各自栖息在哪、写入路径是什么，以及为什么 AI-OS 不自己造第四层。

## TL;DR

| 想存的东西 | 该放哪 | 不该放哪 |
|---|---|---|
| 我的编码偏好（语言 / 工具链 / 风格） | agent shell 的 global rules（home 目录） | `.ai-os/memory.md`（那是项目级、入 git、全员共享） |
| 我希望 AI 怎么跟我沟通（节奏 / 提问频率 / 激进度） | global rules | lane `STATE.md` / `MISSION.md` |
| 这个项目的稳定决策 / 约定 / 坑点 | `.ai-os/memory.md`（入 git） | global rules（会污染到无关项目） |
| 当前这条交付线的方位 / 待确认项 | lane `STATE.md`（本机、gitignored） | global rules |

## Four memory layers, no overlap

AI-OS v9 覆盖第 2、3 层（项目级）；第 1 层（会话级）由模型 / IDE 负责，第 4 层是各 agent shell 自带的开发者级 global rules——这两层 AI-OS 都不重造，只指路。

| Layer | 栖息地 | 识别维度 | Lifetime | Owner | 写入路径 | AI-OS 现状 |
|---|---|---|---|---|---|---|
| 1. 会话级 | Cursor 聊天 / Claude session / Codex session | 这次对话 | 临时 | model | model 自动 | 不管（模型/IDE 的事） |
| 2. 项目本机操作者 | `.ai-os/lanes/*/STATE.md` | 项目 + 这份 worktree | 当前 lane | 用户主导 | 用户主导，gitignored | **已有** |
| 3. 项目共享 | `.ai-os/memory.md` / lane `MISSION.md` / `baseline-log/` | 项目（入 git） | 项目生命周期 | 用户主导 + CR flow | CR / 用户确认后入 git | **已有** |
| 4. 开发者跨项目 | `~/.cursor/rules/*.mdc`（global）/ `~/.claude/CLAUDE.md` / `~/.codex/` instructions | 本机 OS 用户 home | 跨项目、跨 session | 开发者本人 | 开发者手动 curate | **不在 AI-OS 内，本文档指路** |

这四层互不替代：第 4 层是"我这个人怎么干活"，第 3 层是"这个项目怎么干活"。把它们混写会同时坏掉两边——个人偏好被埋进项目 git 让所有 contributor 背，或者项目决策散落到只在你这台电脑生效的 global rules 里。

## 第四层能做什么用

**A. 个人编码偏好（最常用）**

- 语言 / 工具链：`我默认用 TypeScript + pnpm + Vitest`
- 风格：`总是写 explicit return type`、`用中文回答`、`不用 emoji`
- 骨架：`新建前端默认 Vite + React + TanStack Query`

**B. AI 行为偏好**

- 沟通节奏：`先讲设计再上代码` 或 `少废话直接给可运行代码`
- 提问频率：`关键停点必问，其余自行决定`
- 激进 / 保守：`允许大胆重构` 或 `谨慎，改动前先列影响`

**C. 跨项目教训（边界谨慎）**

- 你个人的长期踩坑：`上次因为忘了 X 翻过车，以后默认检查 X`
- 注意：AI-OS 红线"不做自动记忆抽取"。第四层只能**人手 curate**，AI 不替你自动沉淀。

**D. 与 AI-OS 工件的协作**

- agent session 启动顺序：先读 shell 的 global rules（第 4 层，谁在操作）→ 再过 AI-OS Activation Gate → 确认是 delivery work 才读 lane 工件（第 2/3 层）。
- 两边语义不重叠：global rules 说"我这个人"，AI-OS 工件说"这个项目"。冲突时**项目工件赢**（你在项目里确认过的设计，优先于你的个人默认偏好）。

## "按开发者识别" vs "按电脑识别"：本地的真相

实操里两者**几乎等价**，因为这三个 agent shell 的 global rules 都落在 `$HOME` 下：

- Cursor user rules / `~/.cursor/`
- Claude Code `~/.claude/CLAUDE.md`
- Codex `~/.codex/` instructions

也就是说"按开发者识别"在本地退化成"按本机这个 OS 用户的 home 目录识别"。要让同一个开发者跨多台电脑共享偏好，正确答案是**同步 home 目录里的这些文件**，不是让 AI-OS 造一个 identity 层：

- dotfiles 工具：[chezmoi](https://www.chezmoi.io/) / [yadm](https://yadm.io/) / GNU Stow
- IDE 自带同步：Cursor Settings Sync 等

AI-OS **明确不引入** 独立 identity 层 / 登录态 / 云端 store —— 这违反 v9.7 "不做 framework feedback 遥测 / 上报" 与 "不引入第二套 prompt / rules 真理源" 两条红线（见 [`PROJECT_PURPOSE.md`](../../PROJECT_PURPOSE.md) §2 反向边界与 [`AGENTS.md`](../../AGENTS.md)）。

## 各 shell 的具体落点

| Shell | 全局（第 4 层，开发者级） | 项目（第 2/3 层，AI-OS 工件） |
|---|---|---|
| Cursor | user rules + `~/.cursor/rules/*.mdc`（global，home 下） | 项目内 `.cursor/rules/*.mdc` thin shell + `.ai-os/`，见 [cursor.md](cursor.md) |
| Claude Code | `~/.claude/CLAUDE.md`（全局） | 项目根 `CLAUDE.md` stub（≤10 行）+ `.ai-os/`，见 [claude-code.md](claude-code.md) |
| Codex | `~/.codex/` 全局 instructions | 项目根 `AGENTS.md` + `.ai-os/` |

关键区分：**全局** rules 在 home 下、按本机用户生效、不入任何项目 git；**项目** thin shell / stub 在仓库内、入 git，但只做指路（链接回 `AGENTS.md`），不复制宪法内容。

## 为什么 AI-OS 不自己造第四层

- **避免第二真理源**：Cursor / Claude / Codex 的 global rules 已经是它们自己的开发者偏好真理源。AI-OS 再造一个 `~/.ai-os/operator.md` 只会和它们打架，违反单一真理源原则。
- **保持 3 primary product operations**：第四层若进 CLI 就会催生 `--with-operator` 之类 install profile，破坏"一个默认形态"红线。
- **doctor 不跨仓库**：global rules 在 home 下、不属于任何被治理的仓库，doctor 无从校验，也不该校验。
- **可移植性**：第 2/3 层是 repo 文件，任何 IDE 都能读；第 4 层天然是各 shell 私有的，强行统一反而损失各 shell 的原生能力。

## Anti-patterns

1. **把个人偏好 commit 进 `.ai-os/memory.md`** —— 它入 git、全员共享。你的 `用中文回答` / `我爱 pnpm` 会变成所有 contributor 的负担。个人偏好放 global rules。
2. **把项目决策写进 global rules** —— `这个项目的 user.id 必须是 string` 属于项目跨层契约，要进 `.ai-os/memory.md`，否则换台电脑或换个 contributor 就丢了。
3. **指望 AI 自动把对话沉淀进第四层** —— AI-OS 不做记忆 auto-extract；第四层由你手动维护。
4. **造 `~/.ai-os/` 个人记忆目录** —— 与各 shell 的 global rules 重叠，制造第二真理源。要跨机同步就用 dotfiles 同步现有 global rules 文件。
5. **让 global rules 覆盖项目里已确认的设计** —— 冲突时项目工件赢；global rules 只是默认偏好，不是项目契约。

## See also

- [memory-tool.md](memory-tool.md) —— 会话级 / 项目级记忆与 Anthropic Memory tool / Memory MCP 的 wire-format 映射（四层中的第 1–3 层）
- [cursor.md](cursor.md) —— Cursor global vs 项目 rules 分工
- [claude-code.md](claude-code.md) —— `~/.claude/CLAUDE.md` 全局 vs 项目 `CLAUDE.md` stub 分工
- [`PROJECT_PURPOSE.md`](../../PROJECT_PURPOSE.md) §3.5 —— 可恢复记忆的职责分工（原生工具负责会话级，AI-OS 负责稳定决策）
