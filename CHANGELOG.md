# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)。v5.x–v10.x 历史见
[CHANGELOG-archive.md](CHANGELOG-archive.md)。

## 11.0.0 (Unreleased)

**Major, breaking.** AI-OS 收敛为只安装 `AGENTS.md` managed block 的轻量交付宪法。

### Changed

- 安装和重装只创建或刷新 AI-OS block，保留 `AGENTS.md` 的 block 外内容。
- 宪法聚焦目标、范围、关键确认、项目原生验证和如实交付。
- 稳定事实回归项目已有 README、ADR、issue、设计文档、代码、配置和测试。

### Removed

- `.ai-os/` 及 lane、baseline、tasks、memory、STATE 等默认工件。
- doctor、安装后 runtime、IDE pointer、adapter、skill wrapper 和流程台账。

### Migration

- `v10.5.1` 仍是已发布版本；`v11.0.0` 未发布。
- 检测到 `.ai-os/` 时 v11 停止并要求人工迁移，绝不自动合并、移动或删除。
- 先把有效事实人工整合进项目权威真理源，再自行归档或删除旧目录，最后安装 v11 block。
