---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: read-only-analysis-before-edit
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: Read-Only Analysis Before Edit

## 场景

一个任务看起来像局部修改，但实际上跨越共享包装层、DTO / adapter、路由配置或多个模块。AI 直接从第一个看见的文件开始修改，把代码编辑当成探索手段。

## 错误交付

- 目标文件、影响边界和验证入口在实现过程中才逐步暴露
- AI 为了“试试看”连续打补丁，结果返工、越界或把需求升级藏进实现里
- 直到改动扩散后，才发现应该先回到关键设计、变更请求或修复 bug 的定界步骤

## AI-OS 预期行为

- 跨多文件、边界不清或共享约定未确认的任务，在首次写入前先做一轮只读分析
- 只读分析至少要锁定：目标文件、共享约定、验证入口、暂停点和预期影响范围
- 只读分析未收敛前，不得边查边写；若分析发现设计或基准要变化，应先回到关键设计阶段或写 lane `baseline-log/CR-*.md`

## 最低证据

- 实现 / 修复 bug 阶段的输出里有只读分析摘要
- 首次写入前已经说明计划修改文件和验证方式
- 改动后的文件列表没有出现未解释的越界扩散

## 若需改 framework，优先检查

- `AGENTS.md`（绝对禁止 §3"边界未锁、共享约定未确认时边探索边写代码"；行为规则节"实现阶段"和"修复 bug"）
