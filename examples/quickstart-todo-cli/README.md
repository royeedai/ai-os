# Quickstart: Todo CLI

本示例演示 AI-OS 如何引导一个简单的 Todo CLI 项目从需求到交付的完整流程。

每个 `.ai-os/` 文件展示的是 AI 在对应阶段产出的真实工件，不是空模板。

## 流程总览

1. **`/align`** → 确认目标、用户、范围和质量标准 → 产出 `MISSION.md`
2. **`/design`** → 锁定命令结构、数据存储和关键流程 → 产出 `DESIGN.md`
3. **`/plan`** → 拆解任务、定义验收和证据要求 → 产出 `specs/`、`tasks.yaml`、`acceptance.yaml`
4. **`/build`** → 按 wave 实现 → 更新任务状态
5. **`/verify`** → 逐项验证设计、逻辑、实现和交付质量
6. **`/ship`** → 输出交付说明和移交清单

## 关键观察点

- `MISSION.md` 不是一句话需求，而是结构化的目标-范围-约束框架
- `DESIGN.md` 在写代码前锁定了命令结构和数据格式
- `tasks.yaml` 每个任务都有 `measurable_outcome` 和 `edge_cases`
- `acceptance.yaml` 的 4 个门禁都有明确的通过证据
- `STATE.md` 在任何时刻都能恢复项目上下文
