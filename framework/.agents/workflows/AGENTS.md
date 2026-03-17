# Workflows 使用指南（vNext）

AI-OS vNext 默认按交付阶段组织 workflow，而不是先按场景套固定命令。

先判断你现在处于哪一个阶段：

1. 目标和成功标准还没说清：`/align`
2. 关键页面、流程、视觉方向还没锁：`/design`
3. 需要产出 specs、tasks、acceptance：`/plan`
4. 设计和逻辑已锁，准备进入实现：`/build`
5. 需要验证质量、运行态和交付证据：`/verify`
6. 准备交付、发布、回滚和移交：`/ship`

## Phase Workflows

| workflow | 用途 | 结果 |
|------|------|------|
| `/align` | 澄清目标、用户、模式、质量标准、输入素材和待确认项 | 产出 `MISSION.md` 和初版 `STATE.md` |
| `/design` | 锁定信息架构、关键页面、关键交互、视觉方向、关键流程和对照差异 | 产出 `DESIGN.md`，必要时补 `design-pack/parity-map.md` |
| `/plan` | 生成 spec、任务波次、门禁和证据计划 | 产出 `specs/`、`tasks.yaml`、`acceptance.yaml` |
| `/build` | 按 wave 实现，执行角色分工和审批停点 | 更新代码、任务和状态 |
| `/verify` | 做设计、逻辑、工程质量和运行态验证 | 输出 review / parity / runtime 证据 |
| `/ship` | 做交付、发布、回滚和移交 | 输出 `release-plan.md` 和最终交付说明 |

## Continue Workflows

| workflow | 用途 |
|------|------|
| `/status` | 查看当前方位、已锁定内容、待确认项和任务概览 |
| `/next` | 推断当前最值得执行的就绪任务 |
| `/resume` | 从 `STATE.md` 恢复最小阅读集 |
| `/auto-advance` | 在设计门和逻辑门通过后自动按任务波次推进 |

## 基本约束

- 没有完成 `/align`，不要默认进入 `/build`
- 没有锁定关键设计和关键逻辑，不要大规模编码
- `reverse-spec` 项目默认要补 `parity-map`
- `change` 模式允许更轻，但仍需更新 `STATE.md` 和最小证据
- `/auto-advance` 只能在设计门和逻辑门通过后进入大规模推进
- 只有这里列出的阶段入口和继续推进入口属于 vNext 正式支持的 workflow
