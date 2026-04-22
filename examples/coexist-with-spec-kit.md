# 示例：Spec-Kit 主导 + AI-OS 接管治理

本示例展示 **模式 A** 的最小路径：用 Spec-Kit 完成 0-1 立项，用 AI-OS 接管验证、交付、变更、debug、跨 session 恢复。详细背景见 [docs/interop/spec-kit-coexistence.md](../docs/interop/spec-kit-coexistence.md)。

## 场景

一个全新的 photo-album Web 应用，用户和团队已经习惯 Spec-Kit。希望：

- 用 `/speckit.*` slash 命令完成需求澄清、spec、plan、tasks 和 implement
- 完成后，用 AI-OS 接管：验证是否真实可用、形成交付说明、未来的需求变更和 bug 定界

## 目录结构（共存后）

```
photo-album/
├── .specify/                    # Spec-Kit 工件（需求真理源）
│   ├── memory/
│   │   └── constitution.md
│   └── specs/
│       └── 001-photo-album/
│           ├── spec.md
│           ├── plan.md
│           └── tasks.md
├── .ai-os/                      # AI-OS 工件（治理层）
│   ├── project.md               # 共享项目章程
│   ├── CONVENTIONS.md           # 项目级代码约定 + 跨层契约登记表
│   ├── memory.md                # 跨 session 稳定记忆
│   └── lanes/
│       └── default/
│           ├── lane.toml
│           ├── MISSION.md       # 指向 Spec-Kit spec 的本轮交付基线
│           ├── STATE.md         # session 状态（不入版本控制）
│           └── baseline-log/
│               └── BL-20260415-100000-initial-photo-album.md
└── src/
    ...
```

## 最小落地步骤

### 1. Spec-Kit 立项

```bash
# 在项目目录下
uvx --from git+https://github.com/github/spec-kit.git specify init .
```

然后按 Spec-Kit 文档走：

```
/speckit.constitution Create principles focused on code quality, testing standards, accessibility.
/speckit.specify Build an app that organizes photos into albums grouped by date. Albums support drag-and-drop reordering.
/speckit.plan Use Vite with vanilla HTML/CSS/JS. Images stay local. Metadata in SQLite.
/speckit.tasks
/speckit.implement
```

到此为止是 Spec-Kit 的本职工作。工件位于 `.specify/`，是本轮需求的唯一真理源。

### 2. AI-OS 轻量接入

```bash
npx create-ai-os . --lite
```

选 `--lite` 是因为：Spec-Kit 已经有 constitution / spec / plan / tasks，AI-OS 只需要提供 verify / ship / debug / change-request / resume 这些专项能力，不需要再生成完整骨架。

### 3. 用 `/align` 写一份最小 Mission 指向 Spec-Kit spec

打开 AI agent（Claude Code / Cursor / Codex），说：

> 我用 Spec-Kit 完成了 `.specify/specs/001-photo-album/spec.md` 的立项和实现。请按 `/align` 写一份最小 `MISSION.md`，把需求真理源指向 Spec-Kit 的 spec 文件，并记录本轮范围和非目标。

AI agent 会在 `.ai-os/lanes/default/MISSION.md` 写入类似内容：

```markdown
# Mission

## 1. 交付基线摘要

- **需求真理源**：`.specify/specs/001-photo-album/spec.md`（由 Spec-Kit 在 2026-04-15 完成并确认）
- **本轮交付目标**：实现 spec 中 FR-001 ~ FR-007（相册 CRUD + 拖拽排序 + 按日期分组）
- **本轮非目标**：FR-008 ~ FR-012（Q2 再做：照片 EXIF 提取、云端同步、协作相册）
- **当前基线 ID**：BL-20260415-100000-initial-photo-album

## 2. 用户与闭环场景

- **主要用户**：单机桌面用户
- **主闭环**：打开应用 → 选择照片 → 自动按日期分组 → 拖拽重排 → 保存

## 3. 已确认约束与关键决策

- 技术栈以 Spec-Kit plan.md 为准（Vite + 原生 HTML/CSS/JS + SQLite）
- 规则原则以 `.specify/memory/constitution.md` 为准

## 4. 范围边界与非目标

- 仅覆盖 Spec-Kit spec.md 中 FR-001 ~ FR-007；其余功能不在本轮交付范围
- 不触及 FR-008 ~ FR-012 相关代码路径

## 5. 稳定风险与外部依赖

- 需求变更走 `/change-request` **或** `/speckit.specify` 二选一；禁止同时维护两份真理源
```

### 4. 填跨层契约登记表

Spec-Kit 不关心 HTTP 状态码 ↔ 业务码、Wire 类型、名单型常量这些跨层隐式契约，但 AI-OS 需要。打开 `.ai-os/CONVENTIONS.md`，在跨层契约登记表五节里补一轮项目实情（单机桌面 app 的话大部分节都是"暂无"）。

### 5. 用 AI-OS `/verify` 做证据化验证

```
/verify
```

AI-OS 会：

- 对照 Spec-Kit spec 逐条核对实现（工程可维护 + 用户任务可用性 + 双向溯源）
- 要求至少一项项目原生静态校验证据（`npm run build` / `vite build`）
- 检查 degraded path（空相册、拖拽到自身、只读磁盘、损坏图片）
- 生成四门（设计 / 逻辑 / 实现 / 交付）结论

### 6. 用 `/ship` 收口

```
/ship
```

AI-OS 产出：

- `release-plan.md`：发布前检查、发布步骤、运行态验证、回滚条件
- 双清单：`AI 已完成` vs `需人工执行`（如数据库迁移、重启 Vite dev server、刷新浏览器缓存）

### 7. 后续变更和 bug

- 若产品经理要加 FR-008（EXIF 提取）：走 `/change-request` 更新 `MISSION.md` + 追加 `.ai-os/lanes/default/baseline-log/CR-*.md`。**或者** 走 `/speckit.specify` 补 Spec-Kit spec 然后再 `/change-request` 同步。**不要同时在两处改。**
- 若用户反馈某张照片无法拖拽：走 `/debug`，按"最小复现 → 根因 → 边界锁定 → 修复 → 回归"走完。如果命中跨模块同型缺陷（另一处 UI 交互也挂了），按 `derived-rules.md` 4.9 节升级为 P1 全仓扫描。

### 8. 跨 session 恢复

```
/resume
```

AI-OS 读 `STATE.md` + `memory.md`，一次性恢复上次做到哪、已锁定什么、待确认项还有哪些、下一步是什么。这是 Spec-Kit 完全没有的能力。

## 什么时候应该切回模式 B

出现以下任一情况时，建议把 `.specify/` 整合进 `.ai-os/` 或停用 Spec-Kit：

- 团队在 Spec-Kit 和 AI-OS 两个 spec 之间反复复制内容
- `.specify/specs/<id>/spec.md` 被当成"快照"，真实变更只在 `baseline-log/` 里
- 需要 lane 模型管理多条并行交付线
- 项目变成长期维护，立项阶段已经远去

迁移很简单：把 Spec-Kit spec 的内容复制到 `.ai-os/lanes/default/specs/<module>.spec.md`，再用 `/change-request` 把 AI-OS 工件对齐到最新真理源。`.specify/` 目录可以保留作为历史归档。

## 不推荐的反模式

- **`--quick` 模式 + Spec-Kit**：AI-OS 极简模式和 Spec-Kit 几乎没有互补，选一个完整方案即可
- **两套 tasks 并行维护**：Spec-Kit tasks.md 和 AI-OS tasks.yaml 两边都加任务，最后没人知道当前 wave 该做哪条
- **跳过 `/align` 直接 `/verify`**：即使需求基准来自 Spec-Kit，AI-OS 也需要一份最小 `MISSION.md` 才能做 verify；请写一份最小指向型 Mission

## 相关文档

- [docs/interop/spec-kit-coexistence.md](../docs/interop/spec-kit-coexistence.md)：共存原理和工件映射
- [docs/evolution/spec-kit-comparison.md](../docs/evolution/spec-kit-comparison.md)：完整对比分析
- [docs/workflows.md](../docs/workflows.md)：AI-OS workflow 清单
