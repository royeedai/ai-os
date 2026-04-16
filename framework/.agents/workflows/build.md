---
name: build
description: 在设计门和逻辑门通过后按 wave 实现
---

# /build

当设计和逻辑已经锁定、任务已拆分、验收门已定义后触发。

> 路径说明：lane 布局下，下文提到的 `MISSION.md`、`DESIGN.md`、`tasks.yaml`、`acceptance.yaml`、`STATE.md` 默认位于当前 lane 的 `.ai-os/lanes/<lane-id>/`；legacy 单交付项目仍位于 `.ai-os/` 根层。

## 前置条件

- 当前 lane 的 `MISSION.md` 存在
- 当前 lane 的 `DESIGN.md` 存在
- 当前 lane 的 `tasks.yaml` 存在
- 当前 lane 的 `acceptance.yaml` 存在
- 关键技术栈、目标运行态和阻塞性交付选型已确认或明确批准
- 设计确认门和逻辑确认门已通过或明确批准
- 用户已确认当前 lane 本轮任务拆解、验收标准和需要执行的范围边界

## 执行模式选择

进入 `/build` 后，先根据任务规模选择执行模式：

- **子代理执行**（推荐，3 个以上独立任务时）：使用 `subagent-executor` skill，每任务分配隔离子代理 + 两阶段审查
- **直接执行**（1-2 个简单任务或高度耦合任务时）：在当前会话中按以下步骤执行

## 必做步骤

1. 先判断这次实现是否继续当前 lane，还是应该先切换 / 新建 lane：
   - 若当前 lane 已承载这轮交付目标，继续在当前 lane 执行 `/build`
   - 若这是新的并行交付主题、独立 release train，或不应与当前 Mission / Tasks / Acceptance 共用基线，先执行 `create-ai-os lane add <lane-id> .`
   - 若项目里有多个 active lane 但当前 lane 不明确，先执行 `create-ai-os lane list .`，必要时再用 `create-ai-os lane activate <lane-id> . --only`
2. 读取当前 lane 的 `STATE.md`
3. 按当前 lane `tasks.yaml` 的 wave 顺序执行
4. 对跨多文件、影响边界不清或共享基础设施尚未确认的任务，先做一轮只读分析：确认目标文件、共享约定、验证入口、暂停点和预期影响范围；分析未收敛前禁止进入首个写操作
5. 若当前 task / wave 会触及 shared layer、全局包装层、通用抽象或跨层 entrypoint，先输出副作用影响清单：受影响模块、接口 / 页面、无字段 / 无上下文 / 无鉴权场景，以及白名单 / 排除清单需求；未完成前禁止进入首个写操作
6. 若当前 task / wave 会复用共享抽象、共享审计字段、统一包装层或既有路由模式，先核对真实 schema / route / wrapper 契约，并引用 `similar_impl_refs` 中的同仓正常实现；若决定偏离既有模式，先记录理由
7. **Wave 前置 -- 回归基线快照**：每个 wave 开始前，如果项目有测试套件，运行一次并记录当前通过的测试数量作为基线；如果有 lint / type-check，同时记录当前状态
8. 执行前加载任务的 `context_files`、`impact_tags`、`derived_checks`、`parity_checks`、`similar_impl_refs` 和 `step_validation`
9. 按 `execution_role` 选择当前任务的工作视角：
   - `design_mapper`
   - `contract_mapper`
   - `implementer`
   - `reviewer`
10. 命中 `approval_required` 时暂停，等人工确认
11. 实现时必须对照 spec 中的契约基准和字段映射 / 适配说明，避免跨层命名与状态枚举漂移
12. 实现时必须对照 `.ai-os/CONVENTIONS.md`（如存在）检查代码模式一致性，发现新代码引入了与约定不一致的模式时先修正再继续
13. 实现时严格锁定任务边界；不在任务范围内的优化、重构和顺手修补一律不做
14. 每完成一个高风险 slice、共享层 slice 或跨层 slice，立即执行任务声明中的最小 `step_validation`；若连续两次出现“修一处牵一片”，立即升级为每步验证模式，再继续编码
15. 遇到需求矛盾、依赖缺失、方案失效、影响范围超出预期时，立即暂停并同步用户
16. 每个 wave 完成后、进入下一个 wave 前，执行 wave 自审检查：
   - 对照 spec 和 `measurable_outcome` 检查本 wave 的实现是否符合预期
   - 检查本 wave 是否引入了 `out_of_scope_guard` 中禁止的越界改动
   - 检查 `edge_cases` 中列出的异常路径是否已有验证结论或明确标注为后续 wave 覆盖
   - 检查本 wave 的改动是否影响了其他 wave 任务的前置条件
   - **回归对比**：如果第 7 步记录了测试基线，重新运行测试套件并与基线对比；任何从"通过"变为"失败"的测试都视为回归，必须先修复回归再继续下一个 wave
   - **影响半径检查**：记录本 wave 实际修改的文件列表，如果超出 wave 计划中声明的 `context_files` 范围，暂停并说明原因
   - 检查 shared layer 副作用清单、schema / route / wrapper parity 和同仓对照实现是否仍与实际改动一致；不一致时先回到 spec / task 纠偏
   - 若命中共享代码、共享契约或共享基础设施，记录可能受影响的其他 lane，并在进入 `/verify` 时显式补做这些 lane 的回归，不要默认把“当前 lane 已实现”写成“所有 lane 都安全”
   - 如果自审发现偏差，先修正再继续；偏差涉及设计或需求变更时暂停并同步用户
17. 完成后回写当前 lane 的 `tasks.yaml`、`STATE.md` 和相关证据；`tasks.yaml` 只更新当前责任人任务的运行态字段（如 `status`、`blockers`、`notes`），不要顺手改 `baseline_id`、里程碑定义、他人任务或需求映射；如有测试基线，同步回写回归对比结论
18. 当任务由 IDE 计划模式、todo 列表或其他外部编排机制驱动时，所有编排任务完成后不等于交付完成；必须显式进入 `/verify` 执行项目原生静态校验和验收门禁，再进入 `/ship` 完成交付收口

## 禁止事项

- 禁止设计门未过时批量开工
- 禁止关键技术栈或目标运行态未锁定时批量开工
- 禁止一边大改实现一边默默改设计目标
- 禁止高风险任务未审批就直接推进
- 禁止跳过证据补齐直接宣称完成
- 禁止跳过 wave 自审检查直接进入下一个 wave
- 禁止在只读分析未收敛时边查边写、把代码编辑当成探索手段
- 禁止 shared layer / 通用抽象改动没有副作用清单就直接写代码
- 禁止先套用共享抽象、共享包装层或既有路由模式，再回头补 schema / route / wrapper parity 检查
- 禁止明知仓库里已有正常实现，却另起一套未对照的写法
- 禁止越界修改非相关代码或把需求变更伪装成实现细节
- 禁止存在测试基线时跳过回归对比直接进入下一个 wave
- 禁止多 active lane 未判定当前 lane 就直接开工，导致把并行交付揉进同一条任务线
- 禁止命中共享代码 / 契约 / 基础设施后，只在当前 lane 自证通过，却不为其他受影响 lane 补回归计划
- 禁止以 IDE 编排机制（plan 完成、todo 清零）的完成信号替代 AI-OS 的 `/verify` 和 `/ship` 闭环
