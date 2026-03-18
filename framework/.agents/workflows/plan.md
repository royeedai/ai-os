---
name: plan
description: 生成 specs、tasks、acceptance 和证据计划
---

# /plan

当目标和关键设计已经足够明确，准备进入可执行交付时触发。

## 目标

把“要做什么”和“怎样算完成”变成结构化项目工件。

## 必做步骤

1. 读取 `.ai-os/MISSION.md`、`.ai-os/DESIGN.md`、`.ai-os/STATE.md`
2. 确认 `MISSION.md` 与 `DESIGN.md` 已经完成本轮用户确认；未确认则暂停
3. 生成或更新 `specs/*.spec.md`，显式写清交互模式、契约基准、字段映射 / 适配说明、集成触点和异常 / 空数据证据
4. 根据需求特征先判断交互模式：`sync` / `streaming` / `async-job` / `event-driven`
5. 逐条建立“需求点 -> spec -> task -> acceptance”的映射，确保无遗漏、无合并丢失
6. 生成或更新 `.ai-os/tasks.yaml`，为任务补齐 `impact_tags`、`derived_checks`、`risk_triggers`、边界说明和验收映射
7. 生成或更新 `.ai-os/acceptance.yaml`，写入 `quality_tier`、`required_special_reviews`、逐项验收标准和 degraded-path 证据要求
8. 命中高风险触发时，强制补 `risk-register.md`、`release-plan.md`、`verification-matrix.yaml`
9. 更新 `.ai-os/STATE.md`，把当前阶段切到 `plan`，并记录待用户确认的任务 / 验收摘要
10. 向用户输出任务拆解、优先级、验收标准、风险点和遗漏检查结果，等待确认后再进入 `/build`

## 输出

- `specs/*.spec.md`
- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- 必要时补充的高级工件

## 禁止事项

- 禁止只有任务没有验收
- 禁止只有 spec 没有任务波次
- 禁止跳过交互模式判型就直接默认 request / response
- 禁止设计门和逻辑门未定义就进入 `/build`
- 禁止在用户未确认任务拆解和验收标准前直接开工
