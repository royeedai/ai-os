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
| 编码过程中（页面 + API + 持久化强耦合模块） | `fullstack-dev-checklist` |
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
| L1 探索 | `task-orchestrator` + `code-review-guard`（简化模式） | `acceptance-gate`（轻量模式） |
| L2 标准 | `spec-validator` + `task-orchestrator` + `code-review-guard` + `acceptance-gate` | `fullstack-dev-checklist`、`git-workflow`、`testing-strategies` |
| L3 高风险 | L2 全部 + `security-guard` + `architecture-reviewer` + `release-manager` | — |

## 模块类型与 Skill 分流

模块进入实现前，先识别其类型，再决定优先 Skill 组合：

| 模块类型 | 优先 Skill |
|----------|------------|
| `页面类` | `spec-validator` + `code-review-guard`（若同时涉及 API 与持久化联动，再追加 `fullstack-dev-checklist`） |
| `API 类` | `spec-validator` + `api-design` + `testing-strategies` |
| `数据处理类` | `spec-validator` + `testing-strategies` + `code-review-guard`（生产调度 / 批处理再按需追加 `release-manager`） |
| `工具类` | `spec-validator` + `code-review-guard`（对外发布或安装交付时再按需追加 `release-manager`） |

补充约束：

- `fullstack-dev-checklist` 不是所有模块的默认 Skill，只在一个模块同时跨越界面、接口、持久化或复杂前后端联动时强制使用
- 不要因为模块里“顺手改到一个接口”或“顺手补了一个页面”就自动升级为完整全栈检查

## 如何使用

1. Agent 根据当前任务上下文，匹配上述触发条件
2. 找到对应 Skill 目录，读取 `SKILL.md` 获取完整指令
3. 先结合模块类型和交付等级，选择最低足够的 Skill 组合
4. 按 `SKILL.md` 中的步骤执行
5. 若使用 `/auto-advance` 模式，按 `.ai-os/tasks.yaml` 的 wave 顺序自动触发相关 Skill

## 新增或重构自定义 Skill

如果你要在当前项目里新增或重构自定义 Skill，先看：

- `.agents/skills/references/skill-spec.md`
- `.agents/skills/references/quality-checklist.md`
- `.agents/skills/references/anti-patterns.md`

建议流程：

1. 先按 `skill-spec.md` 写出最小可用版本
2. 再按 `quality-checklist.md` 做自查
3. 最后运行校验命令

```bash
npx --yes github:royeedai/ai-os skill-check .agents/skills/<skill-name>
npx --yes github:royeedai/ai-os skill-check .agents/skills/<skill-name> --strict
```

说明：

- 默认模式检查基线结构，适合日常迭代
- `--strict` 会额外检查边界、维护信息、长文档拆分和导航入口，更适合准备沉淀为长期复用 Skill 时使用
