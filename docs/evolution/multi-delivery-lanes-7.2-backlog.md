# AI-OS 7.2.0 团队协同增强 Backlog

日期：2026-04-16

## 1. 版本目标

`7.2.0` 不再继续扩 lane 基础模型，而是把 lane 变成团队长期可管理的协作实体。

本阶段优先解决 3 件事：

1. lane 元数据与拓扑可见性
2. lane 关闭后的沉淀与共享记忆回流
3. 多 lane 项目的标准示例与协作说明

## 2. 发布出口条件

`7.2.0` 至少应满足：

1. `lane.toml` 不再只是最小身份文件，而是稳定承载 `status / baseline / quality tier / risk tier / owner`
2. `lane list`、`status`、`doctor` 能直接看出当前 lane 元数据和并行拓扑
3. lane 收口时，有明确的共享记忆 / conventions / problem-ledger 回流规则
4. 至少有一份多 lane canonical example 展示团队并行交付
5. README / CLI / maintainers 文档改成“团队日常操作 lane”的叙事，而不只是介绍目录结构

## 3. Workstreams

### L72-01 Lane 元数据与可见性

- **目标**：让 lane 的 owner、quality tier、risk tier、status 和 baseline 成为一等协作信息，而不是隐藏在文件里。
- **主要改动点**：
  - 扩展 `lane.toml`
  - `lane add` 支持更完整元数据
  - `lane list`、`status`、`doctor` 显示 lane 元数据和 topology
  - 对缺失 owner、使用推导 risk tier、无效 metadata 的场景给出提示
- **当前状态**：进行中

### L72-02 Lane 收口与记忆回流

- **目标**：避免 lane 归档后，结论仍然只留在 lane 私有工件里。
- **主要改动点**：
  - 为 `lane archive` 补收口清单
  - 明确哪些结论应回流到共享 `memory.md` / `CONVENTIONS.md` / `problem-ledger.md`
  - 增加 lane 关闭后的 evidence / note 要求
- **当前状态**：待开始

### L72-03 多 lane 示例与协作叙事

- **目标**：让团队能看到一份真实、完整的并行交付样例。
- **主要改动点**：
  - 新增多 lane canonical example
  - README / docs / framework workflow 增补团队并行 lane 的日常操作说明
  - 增加对应 eval / docs / examples 回归
- **当前状态**：待开始

## 4. 建议实施顺序

1. 先做 `L72-01`，让 lane 元数据和拓扑可见
2. 再做 `L72-02`，把 lane 关闭后的沉淀规则补上
3. 最后做 `L72-03`，用 example 和文档把团队心智收口
