# Skills 使用指南

本目录包含 AI-OS 的所有 Skill 模块。每个 Skill 遵循 `SKILL.md` 开放标准。

## 触发规则

### 项目级自动触发

| 时机 | Skill |
|------|-------|
| 启动新项目 | `project-planner` |
| 模块拆分/排期 | `task-orchestrator` |
| 阶段验收/准备交付 | `acceptance-gate` |
| 需求变更/补充需求 | `change-impact-analyzer` |
| 复刻/仿制已有系统 | `reverse-engineer` |
| 准备上线/交付用户 | `release-manager` |
| 重复漏项/事故复盘 | `memory-manager`、`agent-evals-guard` |

### 模块级自动触发

| 时机 | Skill |
|------|-------|
| 创建/修改 spec | `spec-validator` |
| 设计数据库 | `database-schema-design` |
| 设计 API | `api-design` |
| 编码过程中（全栈/CRUD 项目） | `fullstack-dev-checklist` |
| 每次提交代码 | `git-workflow` |
| 模块完成 | `code-review-guard` |

### 按需触发

| 条件 | Skill |
|------|-------|
| 涉及订单/金额/权限/删除 | `security-guard` |
| 大重构/复杂模块 | `architecture-reviewer` |
| 涉及后端业务逻辑 | `testing-strategies` |
| 遇到 Bug/测试失败 | `systematic-debugging` |
| 性能瓶颈 | `performance-optimization` |
| 需要新能力 | `find-skills` |

## 交付等级与 Skill 组合

不同交付等级适用不同深度的 Skill 组合（详见 `AGENTS.md` 附录 A）：

| 等级 | 必须使用的 Skill | 可选追加 |
|------|-----------------|---------|
| L1 探索 | `code-review-guard`（简化模式） | — |
| L2 标准 | `spec-validator` + `task-orchestrator` + `code-review-guard` + `acceptance-gate` | `fullstack-dev-checklist`、`git-workflow` |
| L3 高风险 | L2 全部 + `security-guard` + `architecture-reviewer` | `release-manager`、`testing-strategies` |

## 如何使用

1. Agent 根据当前任务上下文，匹配上述触发条件
2. 找到对应 Skill 目录，读取 `SKILL.md` 获取完整指令
3. 按 SKILL.md 中的步骤执行
4. 若使用 `/auto-advance` 模式，按 `.ai-os-project/tasks.yaml` 的 wave 顺序自动触发相关 Skill
