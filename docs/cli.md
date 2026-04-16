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
create-ai-os lane list .
create-ai-os lane add payments .
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
- `validate`：看 Mission / Design / Spec / Tasks / Acceptance / State 是否完整，并对新旧结构、shared-layer / parity / step-validation 锚点给出 fail / warning
- `resume`：导出最小阅读集
- `release-check`：看当前交付是否具备发布条件，并在 `high-risk` 档强查授权 / 并发 / degraded-path 证据

## 多交付 Lane 支持

`project` profile 新安装默认采用“共享根层 + `.ai-os/lanes/default/`”布局。`status`、`next`、`resume`、`doctor`、`validate`、`gate`、`release-check` 都支持 `--lane` 参数，可在 lane 级工件目录下读取交付状态：

```bash
create-ai-os status . --lane default
create-ai-os next . --lane lane-account-deduction
create-ai-os resume . --lane default --markdown
create-ai-os doctor . --lane default
create-ai-os validate . --lane default
create-ai-os gate verify . --lane default
create-ai-os release-check . --lane default
```

Lane 选择规则：

1. 若项目只有一个 active lane，自动选择
2. 若存在多个 active lane 但未传 `--lane`，CLI 报错并列出候选、推荐 `--lane` 示例，并提示如何恢复自动选择
3. 若项目仍是旧版单交付结构（无 `.ai-os/lanes/`），自动退化到 legacy 模式

Lane 生命周期：

```bash
create-ai-os lane list .
create-ai-os lane add payments .
create-ai-os lane add payments . --owner team-pay --quality-tier high-risk --risk-tier high
create-ai-os lane activate payments .
create-ai-os lane activate payments . --only
create-ai-os lane archive payments . --outcome shipped --reason "Merged in 2026-04 train" --memory-sync done --conventions-sync not-needed --problem-ledger-sync not-needed
```

- `lane list`：列出 `active / draft / archived` lane、topology、baseline、quality tier、risk tier 和 owner，并提示缺失 owner / 仍在使用推导 risk tier 的 lane
- `lane add`：创建新 lane。可选写入 `--owner`、`--quality-tier`、`--risk-tier`；若项目里已存在 active lane，则新 lane 默认以 `draft` 创建，避免刚创建就打破自动选择；传 `--activate` 可直接创建为 active
- `lane activate`：把指定 lane 标记为 active；配合 `--only` 会把其他 active lane 回退为 `draft`，用于恢复单 lane 自动选择
- `lane archive`：用于本轮交付结束后的正式收口。必须显式给出 `--outcome`、`--reason`，并对共享 `memory.md` / `CONVENTIONS.md` 的回流写出 `--memory-sync`、`--conventions-sync`；维护 AI-OS 母仓库或存在等价治理台账时，再通过 `--problem-ledger-sync` 标记治理回流结果
- `status` / `doctor`：在 lane 项目里会额外输出当前 lane 的 status、quality tier、risk tier、owner 和拓扑摘要，帮助团队确认当前真正操作的是哪条 lane
- 进入 `/align`、`/change-request`、`/build`、`/verify`、`/ship` 这类 lane 敏感 workflow 前，先判断这次工作是否继续当前 lane；若是新的并行交付线，先 `lane add`
- `ai-os-validate`、`create-ai-os gate`、`ai-os-release-check` 现在会输出 lane-aware 修复建议：lane 选择错误时，直接给出带 `--lane` 的重跑命令；显式指定 lane 时，也会提醒这次只覆盖当前 lane，若共享代码 / 契约 / 基础设施变更影响其他 lane，必须补跑对应 lane
- 若仓库已有 Git 基线，这三条命令还会读取当前 worktree 的改动路径作为启发式信号：命中共享根层工件、其他 lane 工件，或 `.ai-os/` 之外的仓库文件时，会把最可能受影响的 lane 提前列出来，便于优先补跑
- canonical 多 lane 团队示例见 `examples/multi-lane-team-workspace/`，其中归档 lane 演示了 shared `memory.md` / `CONVENTIONS.md` 回流后的收口形态

Lane 目录结构：

```text
.ai-os/
  project.md         # 共享项目章程
  memory.md          # 共享（不随 lane 移动）
  CONVENTIONS.md     # 共享
  lanes/
    default/
      lane.toml      # lane 元数据（id、status、baseline_id、quality_tier、risk_tier、owner；归档后追加 archive/sync 字段）
      MISSION.md
      DESIGN.md
      tasks.yaml
      acceptance.yaml
      STATE.md
      baseline-log/
      specs/
```

legacy 单交付项目可以通过下面的命令机械迁移到默认 lane 布局：

```bash
create-ai-os upgrade . --to-lanes
create-ai-os upgrade . --to-lanes --preflight
```

详细演进规划见 `docs/evolution/multi-delivery-lanes-proposal.md`。

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

Quick 模式只安装最小必需文件：AGENTS.md + 主路径工作流 + YAML 门禁 + MISSION.md + STATE.md。适合首次接触或小项目。项目复杂度增长时，直接重新运行 `create-ai-os <target> --profile project` 补齐完整 starter 工件。

## 框架维护命令

- `diff`：对比项目中已安装的框架文件与最新源文件的差异，标记 modified / outdated / missing / extra
- `upgrade`：将项目中的框架文件升级到最新版本；legacy 项目可配合 `--to-lanes` 迁到默认 lane 布局
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
create-ai-os upgrade . --to-lanes    # 把 legacy 单交付工件迁到 .ai-os/lanes/default/
```

推荐流程：

1. 先跑 `diff` 查看差异全貌
2. 用 `--preflight` 确认是否有冲突
3. 如果有冲突，手动检查 modified 文件，决定是否保留本地修改
4. 确认可以覆盖后，用 `--force` 执行

注意：默认情况下，`.ai-os/` 下的项目工件（MISSION.md、baseline-log/、DESIGN.md、tasks.yaml 等）不是框架托管文件，upgrade 不会触碰它们。只有显式传入 `--to-lanes` 时，legacy 单交付项目的这些工件才会被机械迁到 `.ai-os/lanes/default/`。

## Lite 模式

`--lite` 只安装最小必要文件集，token 占用从 ~99K 降到 ~32K（减少 68%）：

```bash
create-ai-os my-project --profile project --lite
```

包含：`AGENTS.md` + 核心 workflow（align/design/build/verify/debug）+ 必要 skill（acceptance-gate/memory-manager）+ 全部模板 + references + policies。

适用场景：小项目、首次体验、token 预算敏感的模型。

## 安装 profile 与计划预览

- `core`：只安装框架层和 `.ai-os/framework.toml`、`.ai-os/managed-files.tsv`
- `project`：安装框架层，并补齐共享根层工件 + `lanes/default` starter 项目工件
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

- `.gitignore`：忽略会话态与 CLI 元数据（如 legacy `.ai-os/STATE.md`、lane `.ai-os/lanes/*/STATE.md`、`framework.toml`、`managed-files.tsv` 等）
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
