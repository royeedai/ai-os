# AI-OS × Spec-Kit 共存指南

> GitHub 官方的 [Spec-Kit](https://github.com/github/spec-kit)（截至 2026-04 已有 87K+ stars）是 2026 年 spec-driven 开发的事实标准。AI-OS 不和它对立，而是**在它之上补上它不做的事**：跨 session 恢复、变更管理、证据化验证、交付闭环、bug 定界。
>
> 这份文档说明两种典型共存模式，以及在每种模式下 AI-OS 的哪些能力值得开启。详细对比见 [docs/evolution/spec-kit-comparison.md](../evolution/spec-kit-comparison.md)。

## TL;DR 选型建议

| 项目类型 | 推荐模式 |
|---|---|
| 全新 greenfield，0-1 一次性开发 | 模式 A：Spec-Kit 主导 + AI-OS 补交付闭环 |
| 短周期原型 / demo / hackathon | 只用 Spec-Kit 就够 |
| Brownfield 老项目、长期维护、多人协作 | 模式 B：AI-OS 自包含 |
| 需求会变、会中断、会 debug、会复盘的真实项目 | 模式 B：AI-OS 自包含 |

## 模式 A：Spec-Kit 做 0-1 + AI-OS 接管治理

### 适用场景

- 项目刚开始，团队习惯 Spec-Kit 的 `/speckit.*` slash 命令
- 希望用 Spec-Kit 的 constitution / specify / plan / tasks / implement 走一遍立项
- 但同时知道：实现完成后还需要 verify、ship、change-request、debug、resume 这些 Spec-Kit 不覆盖的事

### 工作流

```
阶段 1（Spec-Kit 主导）：
  /speckit.constitution    → .specify/memory/constitution.md
  /speckit.specify         → .specify/specs/<id>/spec.md
  /speckit.plan            → .specify/specs/<id>/plan.md
  /speckit.tasks           → .specify/specs/<id>/tasks.md
  /speckit.implement       → 产出代码

阶段 2（AI-OS 接管）：
  npx create-ai-os .       # 安装 AI-OS（可选 --lite 减少 token）
  /verify                  → 证据化验证、degraded path、静态校验
  /ship                    → 交付说明、双清单、回滚条件
  /change-request          → 后续需求变更
  /debug                   → 后续 bug 定界
  /postmortem              → 里程碑复盘
  /resume                  → 跨 session 恢复
```

### 工件并存规则

两套工件共存时，**以 Spec-Kit 工件为需求基准来源**，AI-OS 工件承接后续治理：

| Spec-Kit 工件 | AI-OS 工件（映射关系） |
|---|---|
| `.specify/memory/constitution.md` | `.ai-os/CONVENTIONS.md` 可以追加"项目级代码约定"层；Spec-Kit 宪法仍是原则真理源 |
| `.specify/specs/<id>/spec.md` | 可在 `.ai-os/lanes/default/specs/` 放一份引用或摘要；以 Spec-Kit 原文为真理源 |
| `.specify/specs/<id>/plan.md` | — 不需要在 AI-OS 再建一份，避免维护两套 |
| `.specify/specs/<id>/tasks.md` | — 同上；若进入 AI-OS `/change-request`，再按当时基线在 `.ai-os/lanes/default/tasks.yaml` 补充新任务 |
| 无 | `.ai-os/MISSION.md`（lane 布局下 `.ai-os/lanes/default/MISSION.md`）：记录"本轮交付基线"，可以用一句话指向 Spec-Kit spec 文件 |
| 无 | `.ai-os/STATE.md`、`.ai-os/memory.md`、`.ai-os/baseline-log/`：AI-OS 独有的跨 session 恢复与变更记录 |

### Mission 骨架示例

```markdown
# Mission

## 1. 交付基线摘要

- **需求真理源**：`.specify/specs/001-photo-album/spec.md`（由 Spec-Kit 在 2026-04-15 生成并确认）
- **本轮交付目标**：实现 spec 中 FR-001 ~ FR-007
- **本轮非目标**：FR-008 ~ FR-012（roadmap 里 Q2 再做）

## 5. 稳定风险与外部依赖

- Spec-Kit 宪法文件：`.specify/memory/constitution.md`
- AI-OS 只负责后续 verify / ship / 变更 / debug；原始需求变更走 `/speckit.specify` 或 `/change-request` 二选一（不要两套并行）
```

### 推荐只启用的 AI-OS 能力

在模式 A 下，AI-OS 不需要完整安装。建议：

```bash
npx create-ai-os . --lite
```

`--lite` 模式只安装 workflow + 核心 skill + derived-rules，不再创建 MISSION / DESIGN / Tasks / Acceptance 的完整骨架。你可以在需要时用 `/align` 补上最小章程。

## 模式 B：AI-OS 完整自包含

### 适用场景

- Brownfield 老项目接入
- 长期维护、多人协作、多轮迭代
- 需求会变、session 会断、bug 会来
- 用户希望一套工件做完整生命周期，不想在两个工具间切换

### 工作流

```
/align           → MISSION.md + baseline-log
/design          → DESIGN.md + 跨层契约登记表前置
/plan            → specs/ + tasks.yaml + acceptance.yaml + 跨栈 E2E-SMOKE
/build           → wave 实现 + 回归基线
/verify          → 设计 / 逻辑 / 实现 / 交付四门 + 静态校验证据
/ship            → release-plan.md + 双清单（AI 已完成 / 需人工执行）

后续循环：
/change-request  → 基线同步
/debug           → 定界修复 + 跨模块同型扫描
/postmortem      → 复盘 + memory.md / CONVENTIONS.md 回流
/resume          → 跨 session 恢复
```

### 工件清单

见 [docs/artifacts.md](../artifacts.md) 和 [docs/getting-started.md](../getting-started.md)。

## 不推荐的共存方式

1. **两套需求基准并行维护**
    - 同一份需求既在 `.specify/specs/<id>/spec.md`，又在 `.ai-os/lanes/default/specs/*.spec.md` 分别更新
    - 会导致团队不知道哪份才是当前真理源；任何变更必然漂移
    - 正确做法：只选一个真理源，另一个引用它

2. **在 Spec-Kit 未完成 constitution 时就启动 AI-OS `/align`**
    - `/align` 会再生成一份交付基线章程，和 Spec-Kit 宪法叠层
    - 正确做法：先 `/speckit.constitution` 或先 `/align`，二选一

3. **把 AI-OS `--quick` 和 Spec-Kit 混用**
    - `--quick` 模式下 AI-OS 只有极简的 Mission + State，和 Spec-Kit 几乎没有互补
    - 正确做法：只用 Spec-Kit 或使用完整 AI-OS 安装

## 差异化核心

Spec-Kit 的价值边界在"0 到 1 把 spec 落成可实现的 tasks"。AI-OS 在此之外仍独有的能力：

| 能力 | Spec-Kit | AI-OS |
|---|---|---|
| 跨 session 恢复（STATE.md + memory.md + /resume） | 无 | 有 |
| 变更管理（baseline-log + /change-request） | 无 | 有 |
| Debug 定界流程（/debug + 跨模块同型扫描） | 无 | 有 |
| 证据化 verify / ship 闭环 | 无 | 有 |
| Lane 模型（多条并行交付线） | 无 | 有 |
| 跨层契约登记表（PL-033） | 无 | 有 |
| 弱类型洞硬禁令（PL-034） | 无 | 有 |
| E2E-SMOKE 独立任务（PL-035） | 无 | 有 |
| 跨模块同型缺陷升级（PL-036） | 无 | 有 |
| CLI 确定性校验（validate / doctor / gate） | 无 | 有 |

Spec-Kit 把 AI 从 "vibe coding" 拉到 "spec-driven"；AI-OS 把 "spec-driven" 继续拉到 "证据化交付 + 可恢复记忆 + 全生命周期"。两者解决的是 LLM-driven 开发的不同阶段问题。

## 参考示例

- 模式 A 最小示例：[examples/coexist-with-spec-kit.md](../../examples/coexist-with-spec-kit.md)
- 模式 B canonical 示例：[examples/quickstart-todo-cli/](../../examples/quickstart-todo-cli/)
- 多 lane 协作示例：[examples/multi-lane-team-workspace/](../../examples/multi-lane-team-workspace/)
