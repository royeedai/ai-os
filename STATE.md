# AI-OS 母仓状态仪表盘

> 本文件用于维护 AI-OS 母仓的当前优化方向，便于新 session 快速恢复上下文。

## 当前位置

- **里程碑**：M1 产品可靠性
- **当前模块**：CLI 与工作流体验
- **当前阶段**：实施 / 收尾
- **当前任务**：落地变更感知验证与运行时门禁
- **交付等级**：L2 标准

## 进度概览

| 里程碑 | 模块 | 状态 | 任务完成 |
|--------|------|------|---------|
| M1 | CLI 与文档收口 | 🔵 进行中 | 2/2 |

## 阻塞项

- [无]

## 最近决策

- 2026-03-13: 新增 `create-ai-os affected` 与 `.ai-os-project/verification-matrix.yaml`，将 restart / cold-start smoke 纳入 CLI、模板、workflow、验收和 eval，版本升至 2.4.0
- 2026-03-13: 全面文档一致性审查，修复 8 处跨文件冲突/不一致（L3 release-manager 定位、路径前缀、阶段跳转描述等），版本升至 2.3.1
- 2026-03-13: 用统一模板源替代散落在 skills references 下的项目模板
- 2026-03-13: 将 `validate/status/next/resume` 纳入官方 CLI 与 workflow 入口
- 2026-03-13: 对外入口统一采用 `Start / Continue / Finish` workflow 分层和 `create-ai-os <command>` CLI 主心智
- 2026-03-13: 新增“首次成功路径路由”母仓 eval，防止 README、CLI help 和示例项目再次分叉

## 下一步

- 观察 `affected` 在真实项目中的路径规则与命令粒度，评估是否需要补 watch / trace 能力
- 视反馈决定是否把 `change-request` / `change-impact-analyzer` 进一步收口到运行时门禁更新

## 快速任务记录

| ID | 描述 | 状态 | 日期 |
|----|------|------|------|
| DOC-001 | 全面文档一致性审查与修复（8 项） | 完成 | 2026-03-13 |
| UX-001 | README / workflow / CLI / example 入口收口 | 完成 | 2026-03-13 |
| REL-001 | 变更感知验证与运行时门禁落地 | 完成 | 2026-03-13 |
