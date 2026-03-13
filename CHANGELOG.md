# Changelog

## Unreleased

### Changed
- 新业务项目的 AI 工件不再散落在仓库根目录，统一收口到 `.ai-os-project/`。
- 根目录只保留框架入口：`AGENTS.md`、`.agents/` 和 `.ai-os-project/`。
- `tasks.yaml` 统一为带 `wave` 和 `context_files` 的 schema。
- `memory.md` 统一为结构化条目格式，与 `memory-manager` 和 `validate` 对齐。
- `acceptance.yaml` 统一包含 UAT gate，和 `acceptance-gate` / `review` 流程对齐。
- README、workflow 索引、示例项目和 CLI help 统一改为 `Start / Continue / Finish` 的首次成功路径分层。
- 文档统一主推 `create-ai-os <command>` 这一套 CLI 心智，`ai-os-*` 保留为兼容别名。

### Added
- `ai-os-diff` 现在区分 `modified` 和 `outdated`，避免把“仅版本落后”误判为本地冲突。
- 新初始化项目会写入 `.ai-os-project/managed-files.tsv`，用于后续框架升级判断。
- `validate`、`status`、`next`、`resume`、`release-check` 全部切换到读取 `.ai-os-project/`。
- 新增隐藏目录布局回归样例，防止后续再次退回到根目录散落模式。
- 新增“首次成功路径路由”回归样例，防止入口说明再次分叉。

### Breaking
- 新规范只保证 `.ai-os-project/` 布局。
- 旧项目根目录布局不会被自动迁移到新布局。
- `ai-os-upgrade` 只升级框架受管文件，不会帮你搬迁旧项目工件。

## Upgrade Guide

### 适用对象
- 你已经有一个旧版 AI-OS 项目。
- 旧项目的 `project-charter.md`、`tasks.yaml`、`acceptance.yaml`、`STATE.md`、`specs/`、`evals/` 等文件还在仓库根目录。

### 升级目标
- 保留根目录的 `AGENTS.md` 和 `.agents/`。
- 把项目工件统一迁到 `.ai-os-project/`。
- 让新版 CLI 都能按新布局工作。

### 1. 先备份并提交当前项目
推荐先提交或打一个备份分支，再执行迁移。

### 2. 先升级框架文件
这一步只会升级 `AGENTS.md` 和 `.agents/`。

```bash
npx --yes github:royeedai/ai-os upgrade . --preflight
npx --yes github:royeedai/ai-os upgrade .
```

如果 `--preflight` 提示有 `modified` 冲突，先人工确认这些框架文件是不是你自己改过。

### 3. 创建新目录

```bash
mkdir -p .ai-os-project/specs .ai-os-project/evals .ai-os-project/references
```

如果你有复刻项目素材，也一并准备：

```bash
mkdir -p .ai-os-project/references/clone-materials
```

### 4. 迁移核心项目工件

```bash
mv project-charter.md risk-register.md tasks.yaml acceptance.yaml release-plan.md memory.md STATE.md .ai-os-project/
```

如果部分文件不存在，按你项目实际情况移动即可。

### 5. 迁移目录型工件

```bash
mv specs/* .ai-os-project/specs/
mv evals/* .ai-os-project/evals/
```

如果是空目录，可以直接删除旧目录：

```bash
rmdir specs evals
```

### 6. 迁移可选工件
如果你的项目里已经有这些文件，也建议一起迁过去：

```bash
mv review-report.md .ai-os-project/ 2>/dev/null || true
mv codebase-map.md .ai-os-project/ 2>/dev/null || true
mv references/clone-materials .ai-os-project/references/ 2>/dev/null || true
```

### 7. 检查文件内引用
重点检查这些引用是否还是旧根目录路径：
- `specs/...`
- `evals/...`
- `project-charter.md`
- `tasks.yaml`
- `acceptance.yaml`
- `release-plan.md`
- `memory.md`
- `STATE.md`

通常需要更新为：
- `.ai-os-project/specs/...`
- `.ai-os-project/evals/...`
- `.ai-os-project/project-charter.md`
- `.ai-os-project/tasks.yaml`
- `.ai-os-project/acceptance.yaml`
- `.ai-os-project/release-plan.md`
- `.ai-os-project/memory.md`
- `.ai-os-project/STATE.md`

注意：
- `tasks.yaml` 里的 `inputs` 和 `context_files` 如果指向业务代码，如 `src/...`、`tests/...`，不要错误改成 `.ai-os-project/src/...`。
- 只有 AI-OS 项目工件要迁入 `.ai-os-project/`，业务代码目录仍留在原位置。

### 8. 用新版 CLI 做验证

```bash
npx --yes github:royeedai/ai-os validate .
npx --yes github:royeedai/ai-os status .
npx --yes github:royeedai/ai-os next .
npx --yes github:royeedai/ai-os resume .
npx --yes github:royeedai/ai-os release-check .
```

期望结果：
- `validate` 通过。
- `status` / `next` / `resume` 能正确读取 `.ai-os-project/`。
- `release-check` 如果失败，应当是因为项目本身尚未达到发布条件，而不是路径找不到。

### 9. 处理常见问题

`upgrade` 成功了，但 `validate` 仍报文件缺失
- 说明框架文件已升级，但项目工件还没迁到 `.ai-os-project/`。

`resume` 或 `next` 找不到任务上下文
- 检查 `.ai-os-project/tasks.yaml` 中的 `context_files` 是否还保留了错误路径。

`release-check` 报 `NOT_READY`
- 先看是否是 `acceptance.yaml` 仍为 `blocked`，或 `tasks.yaml` 里还有未完成任务；这属于正确阻止。

### 10. 完成后提交
迁移完成并验证通过后，再提交一次目录收口变更。
