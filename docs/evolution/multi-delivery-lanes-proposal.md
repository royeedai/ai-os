# AI-OS 7.x 多交付 Lane 演进规划

日期：2026-04-14

## 1. 为什么这件事必须进 7.x

当前 AI-OS 的 `.ai-os/` 根层工件默认只承载一条“当前交付”：

- `MISSION.md` 只有一个 `当前基线 ID`
- `tasks.yaml` / `acceptance.yaml` 只有一个 `baseline_id`
- `release-plan.md` / `risk-register.md` / `verification-matrix.yaml` 也都默认服务同一轮交付
- `status` / `next` / `resume` / `gate` 只理解一个当前阶段和一个当前目标

这套模型适合：

- 单人
- 单分支
- 单轮交付
- 多人但采用“串行基线、并行实现”

它不适合：

- 同一宿主项目里，多个迭代 / 多个 release train / 多条 feature lane 并行推进
- 团队希望在一个工作区内长期保留多条活跃交付线
- 多个 lane 各自维护不同的 Mission / Tasks / Acceptance / Release 状态

结论：这不是 Git 文本冲突问题，而是 **工件拓扑和 CLI 心智都还是单当前交付模型**。

它已经超出 `6.x` 上做局部修补的范围，因为冲突点不是单个模板字段，而是：

- 根层工件是单例
- CLI 默认只有一个当前目标
- workflow 叙事默认只有一条当前交付线
- validate / gate / release-check 的前提都是单 baseline 模型

所以这件事应该直接按 **7.x 主线演进** 规划，而不是继续在 6.x 上叠临时补丁。

## 2. 7.x 的产品目标

7.x 若要进入多交付 lane 模型，目标应是：

1. 支持同一宿主项目下并存多条活跃交付线
2. 每条 lane 拥有独立的需求真理源、任务、验收和交付证据
3. 根层仍保留“项目级共享事实”，避免把每个 lane 都复制成一个完整子仓库
4. `status` / `resume` / `validate` / `gate` / `release-check` 能明确指定 lane
5. 对旧版单交付项目提供确定性迁移路径
6. 新模型必须继续服务 AI-OS 的 5 条核心要求，而不是只引入新目录结构

### 2.1 与 5 条核心要求的映射

这次 7.x 演进不是为了“更自由地并行开发”，而是为了在多人多迭代环境里继续保持：

- `目标与用户确认优先`：每条 lane 的目标、范围和当前基线独立，不再互相污染
- `关键设计与逻辑先锁定`：设计和验收改为 lane 级真理源，避免不同迭代互相覆盖
- `自适应治理`：高风险 lane 可以更重，低风险 lane 可以更轻，而不是整个项目绑死一个档位
- `证据化完成`：验收、release、failure mode 和 eval 改成 lane 级证据闭环
- `可恢复的项目记忆`：根层保留共享记忆，lane 保留交付记忆，恢复成本更低

## 3. 非目标

以下内容不应被 7.x 一起打包：

- 不把 Git 分支本身等同于 lane
- 不尝试自动解决所有跨 lane 的业务依赖排序
- 不让 lane 成为新的 session 临时状态文件
- 不在 `7.0.0` 首版就支持无限层级嵌套 lane
- 不承诺 7.x 首版就能自动消除所有合并冲突；目标是让冲突从“语义不可解”降到“工件边界清晰”

## 4. 推荐模型

推荐采用：

**项目根层共享章程 + lane 级交付工件**

### 4.1 根层保留的共享工件

这些内容属于整个宿主项目，不应按 lane 复制：

- `.ai-os/project.md`
  记录宿主项目身份、共享技术栈、共享约束、共享运行态边界
- `.ai-os/CONVENTIONS.md`
  项目级代码约定
- `.ai-os/memory.md`
  共享稳定决策、约束、坑点、技术债
- `.ai-os/shared/`
  项目级参考资料、共享设计准则、通用 verification 规则

### 4.2 lane 级工件目录

每条交付线拥有独立目录：

```text
.ai-os/
  project.md
  CONVENTIONS.md
  memory.md
  lanes/
    lane-account-deduction/
      lane.toml
      MISSION.md
      baseline-log/
      DESIGN.md
      specs/
      tasks.yaml
      acceptance.yaml
      release-plan.md
      risk-register.md
      verification-matrix.yaml
      evals/
    lane-coupon-refactor/
      lane.toml
      ...
```

### 4.3 lane 身份文件

每个 lane 至少需要一个轻量元数据文件，例如 `lane.toml`：

```toml
id = "lane-account-deduction"
title = "扣减链路稳定性修复"
status = "active"
baseline_id = "BL-20260414-103000-deduction-guard"
quality_tier = "high-risk"
owner = "team-payment"
```

作用：

- 提供机器可读的 lane 清单
- 让 CLI 无需解析整份 Mission 才能先知道当前 lane 的基本状态
- 为后续默认 lane 选择、归档和 lane 切换提供稳定入口

## 5. 根层与 lane 的职责边界

### 5.1 根层负责

- 宿主项目的共享上下文
- 长期稳定技术约束
- 通用代码规范
- 跨 lane 的共享记忆

### 5.2 lane 负责

- 当前这轮交付目标
- 当前基线和 change-request 记录
- 本 lane 的任务波次和 owner
- 本 lane 的 acceptance / release / verification
- 本 lane 的 failure mode 和 eval 沉淀

### 5.3 关键判断

`MISSION.md + specs/` 仍然是需求真理源，但要改成：

- **不是整个 `.ai-os/` 根层唯一真理源**
- **而是“当前 lane 内的唯一需求真理源”**

## 6. CLI 影响面

### 6.1 必须支持 `--lane`

- `status`
- `next`
- `resume`
- `validate`
- `gate`
- `release-check`
- `doctor`

默认规则建议：

1. 若仓库只有一个 active lane，默认使用它
2. 若存在多个 active lane，未传 `--lane` 时直接报错并列出候选
3. 若项目仍是旧版单交付结构，则自动退化到 legacy 单 lane 模式

### 6.2 `create-ai-os` / `upgrade`

需要新增两类能力：

- 初始化 lane：`create-ai-os lane add <lane-id>`
- 单交付迁移：`upgrade --to-lanes`

### 6.3 `validate` 语义变化

旧规则：

- `tasks.yaml baseline_id == Mission 当前基线 ID`
- `acceptance.yaml baseline_id == Mission 当前基线 ID`

新规则：

- `lane/<id>/tasks.yaml baseline_id == lane/<id>/MISSION.md 当前基线 ID`
- `lane/<id>/acceptance.yaml baseline_id == lane/<id>/MISSION.md 当前基线 ID`
- 根层共享工件不得反向声明具体 lane 的当前基线

## 7. 工作流影响

### 7.1 `/align` / `/change-request`

要先明确：这次是

- 新建 lane
- 进入已有 lane
- 合并 / 关闭 lane

### 7.2 `/build`

只能修改当前 lane 对应的任务 / 验收 / release 工件，除非用户明确要求跨 lane 协调。

### 7.3 `/verify`

默认只验证当前 lane；若涉及共享代码和多 lane 影响，必须显式列出：

- 当前 lane 验证
- 受影响 lane 回归验证

### 7.4 `/ship`

以 lane 为单位收口，而不是把整个宿主项目当成一次交付。

## 8. 版本分期规划

### 8.1 6.x 过渡带

6.x 不做工件拓扑升级，只做边界澄清和过渡提示：

- 文档明确声明：当前版本仍是 `单工作区 / 单当前交付基线`
- `doctor` / `validate` 在检测到多交付混用迹象时给出 warning
- README / framework 文档统一使用“串行基线、并行实现”的措辞，避免误导
- 补一个专门说明 `6.x -> 7.x lanes` 的演进文档和 FAQ

6.x 的目标不是“局部支持多 lane”，而是 **防止用户误以为已经支持**。

### 8.2 7.0.0 基础结构版

`7.0.0` 只解决一个核心问题：**把单当前交付模型拆成 lane 级实体模型**。

`7.0.0` 应交付：

- `.ai-os/lanes/<lane>/...` 的新工件拓扑
- 根层共享工件与 lane 工件的职责切分
- `status` / `resume` / `validate` / `gate` / `release-check` / `doctor` 的 `--lane`
- 单交付项目到 `lanes/default` 的迁移命令
- legacy 单交付结构的只读兼容
- 最小模板、最小 example、最小 test 覆盖

`7.0.0` 不要求：

- 自动分析跨 lane 依赖图
- 自动推断所有受影响 lane
- lane 级权限 / owner / SLA 等团队管理字段完整成熟

一句话说，`7.0.0` 是 **数据模型和 CLI 入口重构**，不是团队协作高级能力全集。

### 8.3 7.1.0 工作流与质量门版

`7.1.0` 在 `7.0.0` 结构稳定后，再把 workflow 和 guard 完整 lane 化。

`7.1.0` 应交付：

- `/align` / `/change-request` / `/build` / `/verify` / `/ship` 的 lane 作用域规则
- `gate verify`、`release-check`、`validate` 的 lane 级错误信息和修复建议
- lane 级 example / eval / regression tests
- lane 关闭、归档、状态切换的最小治理动作
- README 和 framework 叙事从“当前交付”整体重写成“共享项目 + 当前 lane”

`7.1.0` 的目标是把新结构真正变成 **可日常使用的交付工作流**，而不是仅能通过 validate。

### 8.4 7.2.0 团队协同增强版

`7.2.0` 再进入团队级补强，而不是把这些复杂度压进 `7.0.0`。

`7.2.0` 可交付：

- lane 清单、active / archived 状态管理
- 受影响 lane 提示和跨 lane 回归提醒
- lane owner / quality tier / risk tier 的更完整元数据
- 关闭 lane 时的沉淀与共享记忆回流规则
- 多 lane 项目的 README / docs / examples 体系

`7.2.0` 仍然不建议承诺：

- 自动安排团队排期
- 自动合并跨 lane 冲突
- 把 Git、项目管理平台和 AI-OS lane 完全绑定成一个系统

## 9. 迁移策略

### 9.1 6.x 先做的事

不改工件拓扑，只明确限制：

- 文档写明：当前只支持单工作区 / 单当前交付基线
- 当检测到多人多迭代混用迹象时，CLI 给 warning
- 推荐协作方式继续保持“串行基线、并行实现”

### 9.2 7.0 再做结构迁移

迁移命令把旧结构：

```text
.ai-os/MISSION.md
.ai-os/tasks.yaml
.ai-os/acceptance.yaml
...
```

迁移为：

```text
.ai-os/project.md
.ai-os/lanes/default/
  MISSION.md
  tasks.yaml
  acceptance.yaml
  ...
```

首版迁移规则应尽量机械、无歧义，不要求用户手工重写所有工件。

### 9.3 建议的迁移原则

迁移过程建议遵守这几条硬原则：

1. 不在一次升级里同时重写 lane 结构和业务工件内容
2. 优先把旧根层工件机械搬到 `lanes/default/`，再做语义升级
3. legacy 项目在未运行迁移前仍可只读验证，避免升级即不可用
4. `upgrade --to-lanes` 的输出必须可重复执行、可审阅、可回滚

## 10. 实施工作流拆分

7.x 实施不要按“文档 / CLI / framework”分散推进，而要按 4 条主工作流推进：

### 10.1 工件与模板流

- 根层共享工件命名重整
- lane 目录结构和模板落地
- MISSION / tasks / acceptance / release-plan / verification-matrix lane 化

### 10.2 CLI 与兼容流

- `--lane` 解析
- active lane 选择逻辑
- legacy fallback
- `upgrade --to-lanes`

### 10.3 Workflow 与治理流

- `/align`、`/build`、`/verify`、`/ship` lane 语义
- quality gate / release gate lane 化
- failure_modes / eval / acceptance 证据闭环在 lane 内收口

### 10.4 示例与回归流

- lane 示例项目
- 单 lane legacy 示例
- 迁移回归 eval
- 多 lane 冲突语义的 CLI 测试

## 11. 风险与代价

### 11.1 明显收益

- 真正支持多人多迭代并行
- lane 级交付上下文更清晰
- `status` / `resume` / `validate` 语义不再混乱
- release / risk / failure_modes 终于能按交付线隔离

### 11.2 明显代价

- 这是 7.0 级破坏性变更
- 所有 workflow、模板、CLI、tests、examples 都要改
- 根层“当前交付”叙事需要整体重写
- 迁移和兼容期会持续一段时间

### 11.3 最大风险

最大的风险不是“改不动”，而是 **只改目录，不改心智**。如果 7.0 只是把文件搬到 `lanes/`，但：

- 根层文档仍在讲“当前交付”
- CLI 仍默认偷偷选一个 lane
- workflow 仍不要求 lane 作用域
- tests / evals 仍只覆盖单 lane

那 AI-OS 只是把原来的歧义搬到了新目录里，问题不会真正解决。

## 12. 建议结论

建议采用：

1. **6.x 不硬补** 多 lane 结构，只明确限制并加强提示
2. **7.0.0 先落结构与 CLI 基础能力**
3. **7.1.0 再补 workflow / gate / release 的 lane 化闭环**
4. **7.2.0 再做团队协同增强，不把高级能力提前塞进 7.0**
5. 根层只保留共享项目章程，交付工件全部下沉到 lane 目录
6. 所有“当前基线 / 当前阶段 / 当前任务 / 当前验收”语义改为 lane 作用域

一句话总结：

**AI-OS 6.x 解决的是“单当前交付如何稳定做对”；AI-OS 7.x 要支持团队多人多迭代，就必须把“当前交付”从根层单例升级成 lane 级实体，并按 `7.0 -> 7.1 -> 7.2` 分阶段落地。**

`7.0.0` 的具体实施拆分见 `docs/evolution/multi-delivery-lanes-7.0-backlog.md`。
