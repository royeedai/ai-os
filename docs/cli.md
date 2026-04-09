# CLI

## 常用命令

```bash
create-ai-os .
create-ai-os plan . --profile core
create-ai-os my-project --profile project
create-ai-os my-project --quick
create-ai-os . --lite
create-ai-os doctor .
create-ai-os validate .
create-ai-os gate align .
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

## 最重要的 5 个命令

- `gate`：检查当前阶段的门禁是否通过，回答"能不能进入下一阶段"
- `doctor`：看框架和核心工件是否齐
- `validate`：看 Mission / Design / Spec / Tasks / Acceptance / State 是否完整，并对新旧结构给出 fail / warning
- `resume`：导出最小阅读集
- `release-check`：看当前交付是否具备发布条件，并在 `high-risk` 档强查授权 / 并发 / degraded-path 证据

CLI 新能力默认要求能被所有已承诺支持的环境承接。只在单一 IDE 生效的行为，不进入 CLI 主命令，最多作为该 IDE 的适配层扩展。

## Phase Gate 命令

`gate` 读取 YAML 工作流定义（`framework/.agents/workflows/*.yaml`）中的门禁规则，对项目工件做确定性检查，回答"当前阶段的前置/出口条件是否满足"。

```bash
create-ai-os gate align .          # 检查 align 出口门禁
create-ai-os gate design --entry . # 检查 design 入口门禁
create-ai-os gate build --exit .   # 检查 build 出口门禁
create-ai-os gate --all .          # 检查所有阶段
create-ai-os gate --json .         # JSON 输出（CI 集成）
```

门禁类型：
- `file_exists`：文件是否存在
- `dir_not_empty`：目录是否非空
- `field_not_placeholder`：Markdown 字段是否已填写（非模板占位符）
- `section_not_empty`：Markdown 章节是否有内容
- `file_min_lines`：文件最小行数
- `tasks_all_completed`：tasks.yaml 中所有任务是否完成
- `acceptance_all_passed`：acceptance.yaml 中所有项是否通过
- `phase_completed`：前置阶段出口门禁是否全部通过

每条门禁有 `error`（阻塞）和 `warning`（提示）两种严重级别。只要有 error 级门禁未通过，退出码为 1。

### 与其他命令的关系

- `doctor`：检查框架安装健康度
- `validate`：检查工件结构合规性
- `gate`：检查工作流门禁（能不能进入下一阶段）

## Quick 安装模式

```bash
create-ai-os my-project --quick
```

Quick 模式只安装最小必需文件：AGENTS.md + 主路径工作流 + YAML 门禁 + MISSION.md + STATE.md。适合首次接触或小项目。项目复杂度增长时，用 `upgrade --profile project` 升级到完整框架。

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

注意：`.ai-os/` 下的项目工件（MISSION.md、baseline-log/、DESIGN.md、tasks.yaml 等）不是框架托管文件，upgrade 不会触碰它们。

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

`create-ai-os` 初始化和 `upgrade` 完成后会自动（幂等）追加：

- `.gitignore`：忽略会话态与 CLI 元数据（如 `.ai-os/STATE.md`、`framework.toml`、`managed-files.tsv` 等）
- `.gitattributes`：仅为 `memory.md` 设置 `merge=union`；`tasks.yaml` 保持正常合并，避免把同一任务的并发编辑静默拼接；`baseline-log/` 通过一条记录一个文件降低多人并行合并冲突

此外，`status` / `next` / `resume` 在 `STATE.md` 缺失时，会从 `MISSION.md`、最新 confirmed baseline、`DESIGN.md`、`tasks.yaml`、`acceptance.yaml` 自动重建最小状态。

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

说明：`cursor-rules` 只是 Cursor 的适配器再生成入口，不代表 AI-OS 可以接受“只在 Cursor 生效”的 CLI 主能力。CLI 层规则仍需满足跨环境承接要求。

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
