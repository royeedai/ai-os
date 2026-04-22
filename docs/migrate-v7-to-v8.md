# 从 AI-OS v7 迁移到 v8

v8.0.0 是定位级重构，不是渐进升级。核心变化：

- 从"15 CLI + 14 slash commands + skills + workflows"的重工具形态，重构为"1 份 AGENTS.md 宪法 + 12 组工件默认全装 + 3 个 CLI"的极简操作形态
- 行为从"命令驱动"转向"规则驱动"
- 工件能力 100% 保留，操作面大幅精简

本指南说明你需要做什么。

## 1. 快速判断

- 如果你在 v7 用过 `/align`、`/design`、`/plan`、`/build`、`/verify`、`/ship`、`/change-request`、`/debug`、`/review`、`/postmortem`、`/status`、`/next`、`/resume`、`/auto-advance` 等 slash commands：**行为仍在，只是不再通过命令触发**。见下文"slash → 行为规则等价映射"。
- 如果你在 v7 用过 `plan` / `diff` / `lab` / `validate` / `gate` / `skill-check` / `status` / `next` / `resume` / `release-check` / `token-budget` / `cursor-rules` 等 CLI 子命令：**大部分被合并到 `doctor` 或删除**。见下文"CLI 迁移映射"。
- 如果你在 v7 用过 `--profile quick/core/project`：**v8 只有一个默认形态**，三个 profile 合并。
- 如果你在 v7 用过 `lanes`、`tasks.yaml`、`specs/`、`risk-register`、`verification-matrix`、`parity-map`：**全部保留，默认安装**。

## 2. 一键迁移

```bash
# 在 v7 项目根运行
npx --yes github:royeedai/ai-os upgrade .
```

`upgrade` 会做：

- 把 `.ai-os/framework.toml`、`.ai-os/managed-files.tsv` 更新到 v8
- 把 `CONVENTIONS.md` 合并进 `memory.md` 的"约定"章节
- 把 `project.md` 合并进 `MISSION.md` 的宿主项目上下文章节
- 把根层 `AGENTS.md` 替换为 v8 版本（≤150 行）
- 删除 v7 特有的 workflow 指令文件（`.agents/workflows/*.md`）和 skills 目录（`.agents/skills/`）

不会做：

- 修改你的 MISSION / DESIGN / specs / tasks 等业务工件（内容保持）
- 修改你的业务代码

迁移后立刻运行：

```bash
npx --yes github:royeedai/ai-os doctor .
```

确认工件完整性。

## 3. slash commands → 行为规则等价映射

v8 完全删除 14 个 slash commands。agent 读 `AGENTS.md` 的"行为规则"章节自动路由。对照表：

| v7 slash command | v8 行为规则触发条件 | 必须产出 | 停点 |
|---|---|---|---|
| `/align` | 新项目 / 新模块 / 需求模糊 | `MISSION.md` + `baseline-log/` + 待确认项清单 | 等用户确认"需求对齐，可进入下一阶段" |
| `/design` | 关键设计未锁 | `DESIGN.md` + 关键取舍 + 共享层副作用清单 | 等用户确认方案 |
| `/plan` | 需求已确认、待拆解任务 | `specs/` + `tasks.yaml` + `acceptance` | 等用户确认任务与验收 |
| `/build` | 用户确认可实现 | 代码 + 任务运行态 + 实现证据 | — |
| `/verify` | 实现完成、待验证 | 逐项对照结论 + 原生静态校验证据 + 异常路径结论 | 验证失败先同步 |
| `/ship` | 验证通过、待交付 | `release-plan.md` + 双清单（已实现 / 未纳入 / AI 完成 / 需人工） | 等用户确认收口 |
| `/change-request` | 需求变化 | `baseline-log/CR-*.md` + 按需更新 MISSION/DESIGN/specs | 等用户确认新基准 |
| `/debug` | 单点 bug / 微调 | 根因 + 复现 + 影响 + 计划修改文件 | 等用户确认"可执行" |
| `/review` | 需要质量审查 | 带风险等级的问题清单 + 影响说明 | — |
| `/postmortem` | 项目 / 里程碑结束 | 复盘结论 + 归档条目清单 + 共享 memory 回流 | — |
| `/status` | 不知道当前方位 | 读 `STATE.md` 的摘要 | — |
| `/next` | 寻找下一步 | 从 `tasks.yaml` 中推断就绪任务 | — |
| `/resume` | 新 session 启动 | 读 `STATE.md`，缺失时从 MISSION/baseline/DESIGN/tasks 重建 | — |
| `/auto-advance` | 已完全确认、要批量推进 | 按任务波次执行 | 遇待确认项立即停 |

**迁移建议**：agent 完全可以不"知道"这些 slash commands 存在。只要它读了 v8 `AGENTS.md`，根据任务类型判断应当产出什么工件、停在哪里，就等价于调用对应的 slash command。

## 4. CLI 迁移映射

| v7 CLI 子命令 | v8 去向 |
|---|---|
| `create-ai-os` | 保留（默认命令，无参数即装全部） |
| `create-ai-os plan <path> --profile X` | 删除（无需预览；一个默认形态） |
| `create-ai-os doctor` | 保留并增强（检查 12 组工件） |
| `create-ai-os validate` | 合并到 `doctor` |
| `create-ai-os gate` | 合并到 `doctor`（`doctor --gate <phase>`）|
| `create-ai-os skill-check` | 删除（skills 系统已删除）|
| `create-ai-os release-check` | 合并到 `doctor`（`doctor --release`）|
| `create-ai-os status` | 删除（读 `STATE.md` 即可）|
| `create-ai-os next` | 删除（agent 读 `tasks.yaml` 即可）|
| `create-ai-os resume` | 删除（agent 读 `STATE.md` 即可）|
| `create-ai-os diff` | 删除（用 `git diff`）|
| `create-ai-os upgrade` | 保留（扩展为 v7 → v8 迁移）|
| `create-ai-os lab` | 删除（用普通临时目录）|
| `create-ai-os token-budget` | 删除（模型层自带 task budgets）|
| `create-ai-os cursor-rules` | 删除（IDE 适配层简化）|
| `create-ai-os lane list/add/activate/archive` | **保留**（作为 `doctor --lane` 或内置到主 install 命令；lanes 工件保留）|

## 5. profile 合并

v7 提供 `quick` / `core` / `project` 三个 profile：

| v7 profile | 安装范围 | v8 对应 |
|---|---|---|
| `quick` | AGENTS.md + 主路径 workflow + YAML 门禁 + MISSION + STATE | 用 v8 默认安装再删掉不需要的扩展 |
| `core` | 框架层 + framework.toml + managed-files.tsv | v8 默认安装 |
| `project` | core + 共享根层工件 + lanes/default starter | v8 默认安装 |

**v8 推荐做法**：无脑装默认形态。12 组工件都在场，但 agent 只在场景到了才用对应工件。不再有"装得少还是装得多"的决定。

## 6. 工件合并

| v7 工件 | v8 去向 |
|---|---|
| `.ai-os/CONVENTIONS.md` | 合并到 `.ai-os/memory.md` 的"约定"章节（含跨层契约登记表）|
| `.ai-os/project.md` | 合并到 `.ai-os/MISSION.md` 的"宿主项目上下文"章节 |
| `.ai-os/lanes/*/acceptance.yaml` | 合并到 `.ai-os/lanes/*/DESIGN.md` 的"验收标准"章节 |
| `.ai-os/framework.toml` / `managed-files.tsv` | 保留（CLI 内部使用）|

其他工件（MISSION / DESIGN / STATE / memory / baseline-log / specs / tasks / lanes / risk-register / release-plan / verification-matrix / parity-map）**原地不动**，`upgrade` 不会修改它们的内容。

## 7. IDE 适配简化

v7 会自动生成：

- `CLAUDE.md`（Claude Code 完整 session 模板）
- `GEMINI.md`（Antigravity workflow 快速参考）
- `.cursor/rules/project-lead.mdc` + N 个 skill 规则
- `.cursor/skills/` 目录

v8 只生成：

- 根 `AGENTS.md`（agents.md 开放标准）
- 轻量 `CLAUDE.md`（≤30 行，仅 "see AGENTS.md"）
- 轻量 `GEMINI.md`（≤30 行，仅 "see AGENTS.md"）
- 不再生成 `.cursor/rules/` 或 `.cursor/skills/`

**为什么**：[agents.md](https://agents.md/) 是跨工具开放标准，所有主流 agent 都原生支持。v7 里多份专有 IDE 文件维护成本过高，且容易漂移。

**重度依赖 `.cursor/rules/` 的用户**：`upgrade` 会保留你项目内 `.cursor/rules/` 下手工写的 `.mdc` 文件，只删除 AI-OS 自动生成的那些。

## 8. 对你交付质量的影响

v8 在下述场景**比 v7 更好**：

- frontier 模型（Opus 4.7 / GPT-5.4）独立开发
- 新用户上手
- 长期维护
- 被其他工具（Kiro / Cursor / Claude Code）集成

v8 在下述场景**和 v7 打平**（前提是默认全装扩展）：

- 大型 brownfield（依赖 `specs/` 切分）
- 多人团队（依赖 `tasks.yaml` owner）
- High-risk 项目（依赖 `risk-register` / `verification-matrix`）
- reverse-spec 密集对标（依赖 `parity-map`）

v8 在下述场景**有风险变差**：

- 使用较弱模型的团队（没有 workflow 文件作为外部脚手架）
- 重度依赖 slash commands 的团队（需要一段适应期）

**缓解建议**：保持 `AGENTS.md` 在 agent 的系统提示或 session 初始化中；`doctor` 定期检查工件完整性。

## 9. 升级节奏建议

- 阅读新 `AGENTS.md` 和 `docs/constitution-spec.md`
- 运行 `upgrade` 命令
- 运行 `doctor` 确认工件完整
- 用一次 `/change-request` 等价行为测试 agent 理解（例如手动提出需求变更，看 agent 是否主动写 `baseline-log/CR-*.md`）
- 跑一次 `/verify` 等价行为测试（让 agent 逐项对照 `verification-matrix.yaml` 并给出原生静态校验证据）
- 如果行为符合预期，删除 v7 的遗留 IDE 生成文件

## 10. 回退

如果 v8 不适合你的团队：

```bash
git checkout v7-legacy-baseline  # 使用迁移前打的 tag
```

v7 将作为 `v7-legacy` 分支归档，代码可继续使用，但不再更新。

## 11. 遇到问题

- `doctor` 报告工件缺失：参考 `docs/artifacts.md` 的 schema
- 不确定某个行为在 v8 里怎么触发：查本文 §3 映射表
- agent 不再主动按阶段停：确认它读到了 `AGENTS.md`（Cursor 中需在 `.cursor/rules/` 写个 alwaysApply 指针，或直接把 AGENTS.md 作为 system prompt 附加）
