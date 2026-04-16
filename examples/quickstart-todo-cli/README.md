# Quickstart: Todo CLI

本示例演示 AI-OS 如何引导一个简单的 Todo CLI 项目从需求到交付的完整流程。

它同时也是仓库当前的 canonical lane example：共享项目事实放在 `.ai-os/` 根层，当前交付工件放在 `.ai-os/lanes/default/`。

每个 `.ai-os/` 文件展示的是 AI 在对应阶段产出的真实工件，不是空模板。

## 流程总览

1. **`/align`** → 确认目标、用户、范围和质量标准 → 产出 `.ai-os/lanes/default/MISSION.md`
2. **`/design`** → 锁定命令结构、数据存储和关键流程 → 产出 `.ai-os/lanes/default/DESIGN.md`
3. **`/plan`** → 拆解任务、定义验收和证据要求 → 产出 `.ai-os/lanes/default/specs/`、`tasks.yaml`、`acceptance.yaml`
4. **`/build`** → 按 wave 实现 → 更新任务状态
5. **`/verify`** → 逐项验证设计、逻辑、实现和交付质量
6. **`/ship`** → 输出交付说明和移交清单

## 结构总览

- `.ai-os/project.md`：宿主项目共享章程
- `.ai-os/CONVENTIONS.md`、`.ai-os/memory.md`：跨 lane 共享约束与记忆
- `.ai-os/lanes/default/lane.toml`：默认 lane 元数据（status、baseline、quality tier、risk tier）
- `.ai-os/lanes/default/`：当前交付线的 Mission / Design / tasks / acceptance / STATE / specs / baseline-log

## 关键观察点

- `project.md` 和 `lanes/default/MISSION.md` 分开后，项目共享事实与本轮交付基线不会混在一起
- `lanes/default/DESIGN.md` 在写代码前锁定了命令结构和数据格式
- `lanes/default/tasks.yaml` 每个任务都有 `measurable_outcome` 和 `edge_cases`
- `lanes/default/acceptance.yaml` 的 4 个门禁都有明确的通过证据
- `lanes/default/STATE.md` 在任何时刻都能恢复当前 lane 的项目上下文
