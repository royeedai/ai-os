# CLI

## 常用命令

```bash
create-ai-os .
create-ai-os plan . --profile core
create-ai-os my-project --profile project
create-ai-os . --lite
create-ai-os doctor .
create-ai-os validate .
create-ai-os status .
create-ai-os next .
create-ai-os resume .
create-ai-os release-check .
create-ai-os cursor-rules .
create-ai-os token-budget .
create-ai-os lab /tmp/ai-os-labs
create-ai-os diff .
create-ai-os upgrade .
create-ai-os skill-check .agents/skills/my-skill
```

## 最重要的 4 个命令

- `doctor`：看框架和核心工件是否齐
- `validate`：看 Mission / Design / Spec / Tasks / Acceptance / State 是否完整，并对新旧结构给出 fail / warning
- `resume`：导出最小阅读集
- `release-check`：看当前交付是否具备发布条件，并在 `high-risk` 档强查授权 / 并发 / degraded-path 证据

## 框架维护命令

- `diff`：对比项目中已安装的框架文件与最新源文件的差异，标记 modified / outdated / missing / extra
- `upgrade`：将项目中的框架文件升级到最新版本
- `skill-check`：校验自定义 Skill 目录中的 SKILL.md，检查 frontmatter、章节结构、references 导航等；`--strict` 启用生产级检查

### Upgrade 冲突处理

`upgrade` 会对比每个框架托管文件（`AGENTS.md` 和 `.agents/` 下的全部文件）的 SHA-256 哈希。文件会被分为四类：

- **outdated**：内容与 AI-OS 源不同，但本地哈希仍匹配安装时记录的旧版本 -> 自动更新
- **missing**：AI-OS 源有但本地不存在 -> 自动创建
- **modified**：内容与 AI-OS 源不同，且本地哈希也不匹配安装时的记录（说明用户做过手动修改）-> 默认阻塞
- **extra**：本地有但 AI-OS 源没有 -> 忽略

当存在 modified 文件时，upgrade 默认会阻塞并列出冲突文件。可选策略：

```bash
create-ai-os upgrade . --preflight   # 只检查是否能安全升级，不做任何修改
create-ai-os upgrade . --dry-run     # 显示将要执行的操作，不做任何修改
create-ai-os upgrade . --force       # 强制覆盖所有冲突文件（慎用）
```

推荐流程：

1. 先跑 `diff` 查看差异全貌
2. 用 `--preflight` 确认是否有冲突
3. 如果有冲突，手动检查 modified 文件，决定是否保留本地修改
4. 确认可以覆盖后，用 `--force` 执行

注意：`.ai-os/` 下的项目工件（MISSION.md、DESIGN.md、tasks.yaml 等）不是框架托管文件，upgrade 不会触碰它们。

## Lite 模式

`--lite` 只安装最小必要文件集，token 占用从 ~99K 降到 ~32K（减少 68%）：

```bash
create-ai-os my-project --profile project --lite
```

包含：`AGENTS.md` + 核心 workflow（align/design/build/verify/debug）+ 必要 skill（acceptance-gate/memory-manager）+ 全部模板 + references + policies。

适用场景：小项目、首次体验、token 预算敏感的模型。

## 安装 profile 与计划预览

- `core`：只安装框架层和 `.ai-os/framework.toml`、`.ai-os/managed-files.tsv`
- `project`：安装框架层，并补齐 starter 项目工件
- `--with-project-files`：兼容别名，等价于 `--profile project`

在真正写文件前，可以先预览：

```bash
create-ai-os plan . --profile core
create-ai-os plan my-project --profile project
create-ai-os plan my-project --profile project --lite --json
```

如果项目是用 `core` profile 安装，且尚未初始化 starter 工件，`doctor --strict` 会跳过项目工件校验。

## 团队协作配置（默认开启）

`init` / `upgrade` 完成后会自动（幂等）追加：

- `.gitignore`：忽略会话态与 CLI 元数据（如 `.ai-os/STATE.md`、`framework.toml`、`managed-files.tsv` 等）
- `.gitattributes`：为 `memory.md`、`tasks.yaml` 设置 `merge=union`，降低多人并行合并冲突

若不需要上述行为（例如自有 Git 策略），安装时使用：

```bash
create-ai-os my-project --profile project --no-team-config
```

`upgrade` 也会在结束时尝试补全上述条目（同样幂等）；详见已安装项目中的 `AGENTS.md`「团队协作」一节。

## Cursor Rules 适配

将已安装的 AI-OS 框架转换为 `.cursor/rules/*.mdc` 格式，让 Cursor 原生加载：

```bash
create-ai-os cursor-rules .
create-ai-os cursor-rules . --clean   # 清理旧的再重新生成
```

生成规则：
- `AGENTS.md` → `ai-os-constitution.mdc`（alwaysApply: true）
- 每个 workflow → `ai-os-wf-<name>.mdc`
- 每个 skill → `ai-os-sk-<name>.mdc`
- Router 索引 → `ai-os-workflow-router.mdc` / `ai-os-skill-router.mdc`

## Token Budget

分析框架文件的 token 占用：

```bash
create-ai-os token-budget .
create-ai-os token-budget --source        # 分析母仓库源
create-ai-os token-budget --source --lite  # 对比 lite 模式
```

## Lab 命令

- `lab`：批量创建 `greenfield`、`reverse-spec`、`brownfield`、`debug`、`high-risk`、`degraded-path` 场景沙盒
- 自动执行 `doctor` / `validate` / `status` / `next`
- 在目标目录生成 `lab-report.md`，方便只在需要人工验收或审批时再介入
