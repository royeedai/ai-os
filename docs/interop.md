# 与其他工具共存（Interop）

AI-OS 的宪法主干永远在 `AGENTS.md`；任何工具专属表面都是**薄壳**，只链接不复制。AI-OS 不为任何外部工具 ship server、client 或 runtime。

## 通用规则

1. 每个事实只存在于一个文件；`.cursor/` / `CLAUDE.md` / skill 等表面只链接回 `AGENTS.md` 与 `docs/`
2. 项目层与开发者全局层分离：`~/.cursor/rules/`、`~/.claude/CLAUDE.md`、`~/.codex/` 是个人偏好，不入项目 git；冲突时项目工件胜出
3. 需求真理源只能有一个：与 Spec-Kit / Kiro / OpenSpec / BMAD 共存时，选定一方为真理源，另一方引用
4. `doctor --strict`（`node .ai-os/bin/ai-os-doctor.js . --strict`）是跨 IDE 的确定性 guard：可挂 Claude Code hook、Cursor `hooks.json`、pre-commit、CI；exit code 即契约，全程离线

## Cursor

- Cursor 原生读取 `AGENTS.md`；`.cursor/rules/*.mdc` 只做触发壳（frontmatter 触发条件 + 一句话 + 链接回 `AGENTS.md`）
- 反模式：把五条核心要求复制进 `.cursor/rules/`（漂移不可见）；用 notepads 替代 lane `STATE.md`（notepads 是 session-local）
- 多工具仓库可安装 skill：`npx skills add github:royeedai/ai-os` 或复制 `framework/skills/ai-os-delivery` 到 `.cursor/skills/`
- 已有臃肿 `.cursorrules` 的迁移：项目约定移入 `AGENTS.md`，`.cursorrules` 缩成链接壳，再安装 AI-OS

## Claude Code

- Claude Code 不自动读 `AGENTS.md`（截至 2026-03），install 默认写一个 ≤10 行的 `CLAUDE.md` stub 指回 `AGENTS.md`；用 `--no-ide-files` 跳过
- 反模式：把宪法内容复制进 `CLAUDE.md`；用 `/memory` 替代 lane `STATE.md`；把 AI-OS 规则编码进 `.claude/commands/`
- skill 方式：复制 `framework/skills/ai-os-delivery` 到 `.claude/skills/`，agent 按 agentskills.io 规范渐进加载

## Spec-Kit / Kiro / OpenSpec / BMAD

- **Mode A**：外部工具主导 0→1（spec / PRD / steering），实现落地后安装 AI-OS 接管变更管理、验证、恢复；lane `MISSION.md` 引用外部 spec 为需求真理源，后续变更走 `baseline-log/CR-*.md`
- **Mode B**：AI-OS 自包含，适合 brownfield、长生命周期、多人协作
- 反模式：同一需求同时在 `.specify/specs/` 和 lane `specs/` 各自演化；AI-OS `MISSION.md` 与外部 constitution 同时声称权威

## Product Design（可选设计证据提供方）

- 有 Product Design 时，其 brief / ideation / prototype / image-to-code / design-qa / share 产物进入 `DESIGN.md` 的 `design_input.evidence_refs` 或 task `evidence_produced`
- 没有时用同一字段记录 fallback：figma / screenshot / url-reverse-spec / existing-code / component-first / manual-brief
- 设计证据不替代项目原生 build / lint / typecheck / test

## MCP resources（`aios://` URI 契约）

AI-OS 不 ship MCP server；这只是 wire-level 契约，任何 MCP server 实现都应使用同一 URI 映射：

| URI | 后备文件 | 层级 |
|---|---|---|
| `aios://shared/MISSION` / `aios://shared/memory` | `.ai-os/MISSION.md` / `memory.md` | L2 |
| `aios://shared/framework` | `.ai-os/framework.toml` | L1 |
| `aios://lane/{laneId}/lane-toml` / `STATE` | `lane.toml` / `STATE.md` | L1 |
| `aios://lane/{laneId}/MISSION` / `DESIGN` / `tasks` | 对应 lane 文件 | L2 |
| `aios://lane/{laneId}/baseline-log/{id}` | `baseline-log/{id}.md` | L3 |
| 按需工件（risk-register / release-plan / verification-matrix / spec / eval / parity-map） | 对应 lane 文件（存在时） | L2 / L3 |

约定：`{laneId}` 默认 `default`；资源只读，写入走用户监督的宪法流程；`STATE` 优先级最高（session 恢复入口）。

## Agent 间交接（A2A 等）

`tasks.yaml` 的字段可直接映射到 A2A 等交接协议：`id` / `status` → Task；`acceptance_refs` / `evidence_required` → 计划 artifacts；`evidence_produced` → 返回 artifacts。远程 / 后台 agent 不得直接写 `.ai-os/lanes/`，必须经用户监督的 CR 流程回流。

## 反模式（汇总）

1. 任何表面复制宪法文本而非链接
2. 两个并行需求真理源
3. 远程 agent 直接写 lane 工件
4. 外部工具"已验证"就跳过 `doctor --strict` 与项目原生校验
5. 把可选 adapter 当成 AI-OS 核心运行时依赖
