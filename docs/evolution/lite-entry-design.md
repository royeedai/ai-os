# AI-OS 极简入口层设计

## 1. 问题

AI-OS 完整安装（`--profile project`）生成约 10+ 工件文件、19 个 skills、15 个 workflows。首次接触的用户面对大量概念，入口成本过高。

对比 Spec-Kit 的 4 步上手：`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`，AI-OS 缺少等价的极简路径。

## 2. 设计方案：`--quick` 安装模式

### 2.1 新增安装 profile

在 `manifests/install-profiles.json` 中新增 `quick` profile：

```json
{
  "quick": {
    "description": "Minimal entry: AGENTS.md, core workflows, and just MISSION.md + STATE.md.",
    "includeProjectFiles": true,
    "quickMode": true
  }
}
```

### 2.2 Quick 模式安装内容

| 类别 | 安装的文件 | 说明 |
|---|---|---|
| 宪法 | `AGENTS.md` | 核心规则，不裁剪 |
| 工作流 | `workflows/AGENTS.md`、`align.md`、`design.md`、`plan.md`、`build.md`、`verify.md` | 只有主路径，无专项流程 |
| 门禁 | `workflows/pipeline.yaml`、`align.yaml`~`verify.yaml` | 可执行门禁 |
| Skills | 无 | Quick 模式不安装 skills |
| 项目工件 | `MISSION.md`、`STATE.md` | 只有最小必需工件 |
| 目录 | `baseline-log/`（含 BL-template） | 用于记录基线 |

### 2.3 Quick 模式的 5 步快速路径

用户在安装后看到的引导：

```
AI-OS Quick Start — 5 步完成交付

1. /align    → 说清楚你要做什么（生成 MISSION.md）
2. /design   → 锁定关键设计（生成 DESIGN.md）
3. /build    → 实现代码
4. /verify   → 验证质量
5. gate      → 随时检查：create-ai-os gate <phase>

当项目复杂度增长时，运行 create-ai-os upgrade 升级到完整框架。
```

### 2.4 渐进升级路径

```
Quick 模式 (2 个工件)
  ↓ create-ai-os upgrade --profile project
完整模式 (10+ 工件, 19 skills, 15 workflows)
  ↓ 按需裁剪
Lite 模式 (精选 workflows + skills)
```

## 3. 实现清单

### 3.1 修改 `manifests/install-profiles.json`

新增 `quick` profile 定义。

### 3.2 修改 `bin/shared.js`

- 新增 `QUICK_INCLUDES` 常量（类似 `LITE_INCLUDES`）
- 修改 `copyFramework` 和 `createProjectFiles` 支持 quick 模式
- Quick 模式下项目文件只安装 `MISSION.md`、`STATE.md`、`baseline-log/`

### 3.3 修改 `bin/create-ai-os.js`

- 支持 `--quick` 标志
- 安装完成后显示 Quick Start 引导

### 3.4 新增 Quick Start 引导输出

安装完成后打印 5 步引导，替代完整模式下的冗长说明。

## 4. Quick 模式 vs Spec-Kit 入口对比

| 步骤 | Spec-Kit | AI-OS Quick |
|---|---|---|
| 安装 | `uvx specify init <project>` | `npx create-ai-os <project> --quick` |
| 定义意图 | `/speckit.specify` | `/align`（生成 MISSION.md） |
| 设计方案 | `/speckit.plan` | `/design`（生成 DESIGN.md） |
| 拆分任务 | `/speckit.tasks` | 可选，直接 `/build` |
| 实现 | `/speckit.implement` | `/build` |
| 验证 | `/speckit.analyze`（可选） | `/verify`（内置） |
| 门禁 | 无 | `create-ai-os gate`（内置） |

## 5. Quick 模式的价值主张

- **5 分钟上手**：只需要理解 2 个工件（MISSION.md + STATE.md）和 4 个 slash 命令
- **内置门禁**：比 Spec-Kit 更安全，`gate` 命令自动检查前置条件
- **可升级**：从 quick 到 full 只需一条 `upgrade` 命令
- **不牺牲核心**：仍然有 AGENTS.md 宪法、阶段式工作流和 STATE.md 恢复能力
