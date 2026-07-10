# 当前 Lane 状态

> Session-local 文件。默认不入版本控制，用于恢复当前 lane 的上下文。
> 若文件不存在，agent 应从 lane 的 `MISSION.md`、`baseline-log/`、`DESIGN.md`、`tasks.yaml` 重建。
> 本文件是 session-only 导航镜像；若与 `lane.toml` 或其他已提交真理源冲突，本文件已过期，必须重建，不得反向覆盖已提交真理。

## 当前方位

- **当前阶段**：align / design / plan / build / verify / ship
- **当前质量档位（quality_tier，lane.toml 镜像）**：unassessed
- **当前风险档位（risk_tier，lane.toml 镜像）**：unassessed
- **当前治理档位（governance_tier，lane.toml 镜像）**：unassessed
- **当前目标**：
- **当前任务**：
- **当前确认停点**：
- **当前基线 ID（lane.toml.baseline_id 镜像）**：{{INITIAL_BASELINE_ID}}

> 允许值与 `MISSION.md` 相同；这里只保留 `lane.toml` 当前单值的 session 镜像。

## 已锁定内容

- [无]

## 待确认项

- [无]

## 最近偏差 / 回退

- [无]

## 下一步

- [下一步]
