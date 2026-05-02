# {{INITIAL_BASELINE_ID}}

> 当前 lane 的初始基线记录。新增记录时新建 `CR-*` 或 `BL-*` 文件，不回写历史。

- **Type**: align
- **Status**: confirmed
- **Summary**: 初始交付基线已确认
- **Affects**: lanes/default/MISSION.md, lanes/default/specs/example.spec.md
- **Confirmed At**: {{INITIAL_BASELINE_DATE}}

## 后续 CR delta lifecycle 模板

新增 `CR-YYYYMMDD-HHMMSS-<slug>.md` 时必须包含以下段落，便于 `doctor --strict` 检查变更基线是否可追溯：

1. `## Current behavior`
2. `## Proposed delta`
3. `## Affected artifacts`
4. `## Acceptance delta`
5. `## Close/archive condition`

## Agent handoff / evidence loop 提示

任务进入 `tasks.yaml` 时建议同步记录：

- `handoff_to`：接收任务的 AI agent / IDE / human surface
- `context_refs`：执行任务必须读取的 lane 工件
- `expected_return`：期望返回的 diff / PR / 测试 / review / 运行证据
- `evidence_produced`：任务关闭时实际产出的证据
- `deviation_log`：实现偏离、范围变化或需升级为 CR 的记录
