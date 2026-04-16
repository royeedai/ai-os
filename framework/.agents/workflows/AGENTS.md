# Workflows 使用指南

AI-OS 仍以阶段式 workflow 为主，但补充了变更和修复的专项入口，确保“先确认再执行、先更新基准再动手”能在不同任务级别下稳定落地。

> 路径说明：lane 布局下，下文提到的 `MISSION.md`、`DESIGN.md`、`tasks.yaml`、`acceptance.yaml`、`STATE.md`、`baseline-log/`、`specs/` 默认位于当前 lane 的 `.ai-os/lanes/<lane-id>/`；legacy 单交付项目仍位于 `.ai-os/` 根层。

先判断你现在处于哪类任务：

1. 新项目、新模块、需求模糊：`/align`
2. 关键页面、流程、视觉方向或核心方案还没锁：`/design`
3. 需要把需求拆成 spec / tasks / acceptance：`/plan`
4. 已完成确认，准备实现：`/build`
5. 需要验证质量、运行态和交付证据：`/verify`
6. 准备交付、发布、回滚和移交：`/ship`
7. 已有需求发生变化，需要先更新基准：`/change-request`
8. 单点 bug 或轻量改动，需要先定界再修：`/debug`
9. 需要做结构化质量审查：`/review`
10. 需要做项目 / 里程碑复盘和经验沉淀：`/postmortem`

在 lane 项目里，进入 workflow 前先判断：

1. 这次工作是否继续当前 lane 的交付目标
2. 这次工作是否其实应该新建并行 lane
3. 若存在多个 active lane，当前到底要操作哪一条

不要默认把并行交付揉进同一条 lane。需要时先执行：

- `create-ai-os lane list .`
- `create-ai-os lane add <lane-id> .`
- `create-ai-os lane activate <lane-id> . --only`

## Phase Workflows

| workflow | 用途 | 结果 |
|------|------|------|
| `/align` | 澄清目标、用户、模式、质量标准、输入素材和待确认项 | 产出或更新当前 lane 的 `MISSION.md`、`baseline-log/` 和 `STATE.md`，等待用户确认需求基准；brownfield / change 先锁当前 lane，不重写整个存量项目 |
| `/design` | 锁定信息架构、关键页面、关键交互、视觉方向、关键流程和对照差异 | 产出或更新 `DESIGN.md`，必要时补 `design-pack/parity-map.md`，等待用户确认设计方案 |
| `/plan` | 生成 spec、任务波次、门禁和证据计划 | 产出或更新 `specs/`、`tasks.yaml`、`acceptance.yaml`，等待用户确认任务与验收 |
| `/build` | 按 wave 实现，执行角色分工和审批停点 | 更新代码、任务、状态和实现证据 |
| `/verify` | 做设计、逻辑、工程质量和运行态验证 | 输出逐项验证结论、回归结论和证据 |
| `/ship` | 做交付、发布、回滚和移交 | 输出 `release-plan.md`、最终交付说明和 lane 收口决定，等待用户确认收口 |

## Specialized Workflows

| workflow | 用途 | 结果 |
|------|------|------|
| `/change-request` | 在任何需求补充、范围调整、验收变化前，先完成影响分析和基准同步 | 先新增 `baseline-log/CR-YYYYMMDD-HHMMSS-slug.md`，再按需更新当前 lane 的 `MISSION.md` / `specs/` / `DESIGN.md` / `STATE.md`，形成最新需求基准并等待用户确认 |
| `/debug` | 对单一 bug、配置修复、文案或样式微调执行轻量闭环 | 输出修复方案、边界、验证结果；若超出边界则升级到 `/change-request` 或 `/design` |
| `/review` | 对当前方案、实现或交付进行多维度结构化审查 | 输出带风险等级的问题清单、影响说明和优化建议 |
| `/postmortem` | 对项目或里程碑做复盘并沉淀稳定经验 | 输出复盘结论、归档条目清单（如有），并同步更新共享 `memory.md` / `CONVENTIONS.md` |

## Continue Workflows

| workflow | 用途 |
|------|------|
| `/status` | 查看当前方位、已锁定内容、待确认项、确认停点和任务概览 |
| `/next` | 推断当前最值得执行且已满足确认条件的就绪任务 |
| `/resume` | 从 `STATE.md` 恢复最小阅读集和当前确认状态 |
| `/auto-advance` | 仅在设计门、逻辑门通过且用户明确授权时自动按任务波次推进 |

## 全局执行约束

- 没有已确认的 `MISSION.md`，不要默认进入 `/build`
- 需求变化先走 `/change-request`，bug 修复先走 `/debug`；二者都不是绕过阶段式治理的捷径
- 没有锁定关键设计和关键逻辑，不要大规模编码
- 复杂多文件或边界不清的 `/build` / `/debug` 任务，在首次写入前先做只读分析，先锁目标文件、共享约定和验证入口
- 没有用户确认，不要静默跨阶段推进
- `reverse-spec` 项目默认要补 `parity-map`
- `change` / `debug` 允许更轻，但仍需更新 `STATE.md`、同步基准并保留验证证据
- 共享层、全局包装层、通用抽象或跨层 entrypoint 改动，先列副作用影响清单，再进入实现
- 复用共享抽象、统一 wrapper、schema / route 模式前，先找同仓正常实现，再做 parity 检查；不要先套抽象后补核对
- `debug` / `/verify` 暴露新的稳定 failure mode 时，补 `evals/` 或 `verification-matrix.yaml`，不要只留在当前会话
- lane 项目中的 `/align`、`/change-request`、`/build`、`/verify`、`/ship`，先确认当前 lane；若这轮工作属于新的并行交付线，先建 lane 再继续
- `/verify` 遇到共享代码改动时，不要只给一个笼统“已验证”；必须说明当前验证覆盖了哪些 lane，哪些 lane 仍待回归
- lane 准备归档前，先判断哪些稳定结论要回流到共享 `memory.md` / `CONVENTIONS.md`，不要把稳定经验继续留在 lane 私有工件里
- `debug` / `/verify` / `/ship` 输出修复与交付结论时，显式拆开代码状态、数据状态、运行状态
- `/auto-advance` 只能在不存在待确认项、审批点和高风险阻塞时进入大规模推进
- 存在测试套件的项目，`/build` 和 `/verify` 必须执行回归基线对比；原本通过的测试变为失败时，必须先修复回归再继续
