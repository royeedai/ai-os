# Skill 层级审计

审计日期：2026-04-02  
框架版本：v6.0.0

## 目的

确认哪些 skill 被 workflow 和 AGENTS.md skill 路由直接引用（核心），哪些是通用指导性质（补充），为 `--lite` 模式和安装推荐提供依据。

## 审计结果

### 核心 skill（12 个，被 workflow/AGENTS.md 路由引用）

| Skill | 引用 workflow/角色 | `--lite` 包含 |
|-------|-------------------|-------------|
| `project-planner` | `/align` | ✅ |
| `memory-manager` | `/align` | ✅ |
| `reverse-engineer` | `/design` | ✅ |
| `spec-validator` | `/design`, `/plan` | ✅ |
| `task-orchestrator` | `/plan` | ✅ |
| `acceptance-gate` | `/plan`, `/verify` | ✅ |
| `fullstack-dev-checklist` | `/build` | ✅ |
| `code-review-guard` | `/build`, `/verify` | ✅ |
| `subagent-executor` | `/build` | ✅ |
| `testing-strategies` | `/verify` | ✅ |
| `release-manager` | `/ship` | ✅ |
| `api-design` | contract_mapper 角色 | ❌（仅 full） |

### 补充 skill（7 个，无 workflow 引用）

| Skill | 性质 | 建议 |
|-------|------|------|
| `systematic-debugging` | 通用调试方法论 | 保留在 full，不进 lite |
| `performance-optimization` | 通用性能优化指南 | 保留在 full，不进 lite |
| `database-schema-design` | 通用数据库设计 | 保留在 full，不进 lite |
| `architecture-reviewer` | 通用架构审查 | 保留在 full，不进 lite |
| `security-guard` | 安全审查（高风险项目需要） | 保留在 full，不进 lite |
| `change-impact-analyzer` | 变更影响分析 | 保留在 full，不进 lite |
| `git-workflow` | Git 协作指南 | 保留在 full，不进 lite |

## Token 成本对比

| 安装模式 | 文件数 | Token 数（估算） | GPT-4o 占用 |
|---------|-------|----------------|-----------|
| full | 92 | ~106K | ~82.5% |
| lite | 43 | ~58K | ~45.1% |

## 建议

- 大多数项目使用 `--lite` 即可覆盖完整 workflow 流程
- 只有明确需要补充 skill 指导（如数据库设计、性能优化）的项目才需要 full 模式
- 高风险项目如需 `security-guard`，建议使用 full 模式
