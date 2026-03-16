---
name: build
description: 在设计门和逻辑门通过后按 wave 实现
---

# /build

当设计和逻辑已经锁定、任务已拆分、验收门已定义后触发。

## 前置条件

- `.ai-os/MISSION.md` 存在
- `.ai-os/DESIGN.md` 存在
- `.ai-os/tasks.yaml` 存在
- `.ai-os/acceptance.yaml` 存在
- 设计确认门和逻辑确认门已通过或明确批准

## 必做步骤

1. 读取 `.ai-os/STATE.md`
2. 按 `tasks.yaml` 的 wave 顺序执行
3. 执行前加载任务的 `context_files`
4. 按 `execution_role` 选择当前任务的工作视角：
   - `design_mapper`
   - `contract_mapper`
   - `implementer`
   - `reviewer`
5. 命中 `approval_required` 时暂停，等人工确认
6. 完成后回写 `tasks.yaml`、`STATE.md` 和相关证据

## 禁止事项

- 禁止设计门未过时批量开工
- 禁止一边大改实现一边默默改设计目标
- 禁止跳过证据补齐直接宣称完成
