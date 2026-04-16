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
3. 生成或更新 `specs/*.spec.md`，显式写清交互模式、契约基准、字段映射 / 适配说明、集成触点、shared layer / 包装层副作用审计、路由 / 入口契约对照、静态路径 / 动态路径冲突备注、schema / 存储一致性说明、同仓正常实现对照和异常 / 空数据证据
4. 根据需求特征先判断交互模式：`sync` / `streaming` / `async-job` / `event-driven`
5. 逐条建立“需求点 -> task -> acceptance”的映射，确保无遗漏、无合并丢失
6. 对大型项目 / 模块主动拆分里程碑，明确每个里程碑的交付目标、范围、验收标准和排期 / 目标窗口
7. 若任务触及 shared layer、通用抽象、schema / route / wrapper parity 或跨层 entrypoint，必须把副作用清单、同仓对照实现、parity 检查点和 step validation 显式写进 spec / tasks / acceptance，而不是只在会话里说明
8. 生成或更新 `.ai-os/tasks.yaml`，为任务补齐优先级、依赖关系、改动范围、风险点、`impact_tags`、`derived_checks`、`risk_triggers`、`parity_checks`、`similar_impl_refs`、`step_validation`、边界说明和验收映射；每个任务必须填写 `measurable_outcome`（用可验证的具体条件替代形容词）和 `edge_cases`（本任务必须覆盖的异常路径）
9. 生成或更新 `.ai-os/acceptance.yaml`，写入 `quality_tier`、`required_special_reviews`、逐项验收标准，以及 shared-impact / route-contract / schema-parity / degraded-path / state-triage 等证据要求
10. 命中高风险触发时，强制补 `risk-register.md`、`release-plan.md`、`verification-matrix.yaml`
11. 更新 `.ai-os/STATE.md`，把当前阶段切到 `plan`，并记录待用户确认的任务 / 验收摘要
12. 向用户输出任务清单、里程碑、优先级、依赖、改动范围、风险点、同仓对照实现、step validation 计划和验收标准，等待确认后再进入 `/build`

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
- 禁止 shared layer / 通用抽象任务没有副作用清单、parity 检查点和 step validation 就直接排进执行波次
- 禁止 client/server entrypoint 变更没有路由契约对照和静态 / 动态路径冲突备注
- 禁止任务的 `measurable_outcome` 使用模糊形容词（如"性能良好""用户体验好"），必须转化为可验证条件
- 禁止任务的 `edge_cases` 为空；至少列出 1 条与本任务最相关的异常路径
- 禁止在用户未确认任务拆解和验收标准前直接开工
