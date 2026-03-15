# Example Skeleton: Minimum Sufficient Change

这个目录展示一个“小范围改动”的 AI-OS 工件骨架。

它要表达的重点是：

- 小改动仍然要有任务记录、状态同步和最小完成证据
- 但不应默认升级成完整模块重流程

建议结合上层说明一起看：

- [../minimum-sufficient-change.md](../minimum-sufficient-change.md)

## 示例包含

- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- `.ai-os/STATE.md`

这里刻意没有放完整模块 spec，目的是说明：在 `/quick` 场景下，只要问题边界清楚、影响局部、证据充分，就可以采用更轻的工件集合。
