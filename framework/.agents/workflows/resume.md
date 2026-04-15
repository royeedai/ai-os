---
name: resume
description: 从 STATE.md 恢复当前方位和最小阅读集
---

# /resume

> 路径说明：lane 布局下，下文提到的 `MISSION.md`、`DESIGN.md`、`tasks.yaml`、`acceptance.yaml`、`STATE.md`、`baseline-log/`、`specs/` 默认位于当前 lane 的 `.ai-os/lanes/<lane-id>/`；legacy 单交付项目仍位于 `.ai-os/` 根层。

## 读取顺序

1. `.ai-os/STATE.md`
   - 若 `STATE.md` 不存在（团队协作模式下此文件为 session-local、不入版本控制），执行以下重建：
     a. 读取 `MISSION.md` 获取项目模式、质量标准
     b. 读取最新 confirmed `baseline-log/` 记录，确认当前共享基线
     c. 读取 `DESIGN.md` 获取已锁定设计
     d. 读取 `tasks.yaml` 获取当前任务状态和进度
     e. 读取 `acceptance.yaml` 获取门禁状态
     f. 根据上述信息填充一份新的 `STATE.md`（按模板结构），写入 `.ai-os/STATE.md`
     g. 在 STATE.md 的"最近偏差 / 回退"中注明"STATE 从项目工件重建（首次 session 或团队协作切换）"
2. `STATE.md` 中的最小阅读集
3. 当前任务相关的 `MISSION.md` / `DESIGN.md` / `specs`
4. 当前任务的 `context_files`
5. `.ai-os/memory.md`（按分层策略加载：先加载所有 `active` 条目；`archived` 条目仅在回溯特定决策历史时按需查阅；活跃条目超过 20 条时只加载最近 3 个里程碑内产生的活跃条目，其余标注"存在更早活跃条目，需要时可展开"）
6. `.ai-os/CONVENTIONS.md`（如存在）：概要读取，确保本 session 的实现对照代码约定基准

## 代码库健康快照（推荐）

恢复上下文后、开始编码前，执行以下可选但推荐的健康检查：

- 如果项目有测试套件：运行一次，记录当前通过率作为 session 健康基线
- 如果项目有 lint / type-check：运行一次，确认当前状态
- 将健康快照记录到 `STATE.md` 的代码库健康区（如有）

## 输出要求

- 当前阶段
- 当前目标
- 当前任务
- 已锁定内容
- 待确认项
- 当前需求基准是否为最新版本
- 当前是否存在必须先停下等待用户确认的事项
- 稳定记忆概要（活跃条目数、是否存在归档条目）
- 代码库健康快照（如有测试：通过率；如有 lint：状态）
- 建议下一步
