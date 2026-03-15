# Maintainers

这份文档面向 AI-OS 母仓库维护者。

如果你想了解怎么在项目里使用 AI-OS，优先看：

- [../README.md](../README.md)
- [getting-started.md](getting-started.md)

如果你在判断 AI-OS 自身该不该新增要求、该怎么重构，先看：

- [../PROJECT_PURPOSE.md](../PROJECT_PURPOSE.md)
- [../AGENTS.md](../AGENTS.md)
- [change-evaluation-template.md](change-evaluation-template.md)

## 这个仓库负责什么

AI-OS 母仓库负责维护通用交付能力，包括：

- `framework/AGENTS.md`
- `framework/.agents/skills/`
- `framework/.agents/workflows/`
- `framework/.agents/templates/`
- `bin/` 下的 CLI
- 测试和发布检查逻辑

项目仓库负责维护项目事实，包括：

- `.ai-os/project-charter.md`
- `.ai-os/specs/`
- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- `.ai-os/release-plan.md`
- `.ai-os/memory.md`
- `.ai-os/STATE.md`
- `.ai-os/evals/`

一句话概括：通用规则在 AI-OS 母仓库里维护，项目事实在项目仓库里维护。

## 维护时只看这 6 条核心要求

AI-OS 根层治理只认下面 6 条核心要求：

1. `目标对齐`
2. `通用性优先`
3. `项目事实边界`
4. `闭环与证据优先`
5. `复杂度预算`
6. `结构化演进`

它们的主定义在 [../PROJECT_PURPOSE.md](../PROJECT_PURPOSE.md)。维护文档不再发明第二套高层原则。

## 维护筛选法

维护 AI-OS 时，每个新需求都先回答这 4 个问题：

1. 这是 AI-OS 的通用交付问题，还是某个项目、行业、团队的使用问题？
2. 它是否直接提升六条核心要求中的至少一条？
3. 它最合适的承接位置是 `framework/`、项目工件、README/示例，还是明确不纳入？
4. 如果进入 `framework/`，应新增，还是应合并、重写、抽象提升或替换现有结构？

如果一个需求不能稳定映射到六条核心要求之一，默认不进入根层，也不应轻易进入框架。

## 派生规则如何处理

目标市场适配、参考项目命名约束、共享基础能力优先、当前里程碑优先这类具体规则，都是派生规则，不再与核心要求并列。

维护时按下面方式处理：

- 先确认它归属于哪条核心要求
- 先确认它真正影响的是哪类模块和哪种交付等级，而不是假设所有模块都该承担同样流程
- 再决定它应留在 `framework/AGENTS.md`、workflow、skill、模板，还是文档示例
- 如果它已经和现有规则重复，优先合并、重写或替换
- 如果它不能稳定归属到某条核心要求，优先删除、降级或不纳入

当前常见映射：

| 具体规则 | 归属核心要求 |
| --- | --- |
| 目标市场适配 | 项目事实边界 |
| 参考项目命名 / legacy 约束 | 项目事实边界 |
| 共享基础能力先于业务模块 | 闭环与证据优先 |
| 目的与当前里程碑优先 | 闭环与证据优先 |
| 一处定义 / 变更需要证据 / 同步清理旧结构 | 结构化演进 |

## 维护动作要求

即使决定进入 `framework/`，也不要默认直接新增条目。维护者应先检查：

- 现有哪个原则、workflow、skill、模板已经覆盖了相近问题
- 这次更适合合并、重写、抽象提升，还是删除旧规则后替换
- 加完之后整体是否更清晰，还是只是又多了一层补丁

框架级改动还应同时满足：

- 有重复问题、真实项目观察、失败案例，或测试 / eval 证据
- 考虑过复杂度预算，而不是只因为“这个问题存在”就继续加
- 考虑过模块类型和交付等级的差异，避免把页面类 / API 类 / 数据处理类 / 工具类重新拉回同一条重流程
- 同步清理相关旧规则、旧文案、旧模板、旧测试

当前根层基线 eval 放在：

- [../evals/minimum-sufficient-flow.md](../evals/minimum-sufficient-flow.md)
- [../evals/shared-foundation-first.md](../evals/shared-foundation-first.md)
- [../evals/reference-project-boundary.md](../evals/reference-project-boundary.md)

如果你要判断“该怎么用 AI-OS 承接这个需求”，而不是“要不要改 framework”，先看这些示例：

- [../examples/platform-project-foundation-first.md](../examples/platform-project-foundation-first.md)
- [../examples/minimum-sufficient-change.md](../examples/minimum-sufficient-change.md)

如果你要正式评估一次变更建议，直接从这个模板开始：

- [change-evaluation-template.md](change-evaluation-template.md)

如果你在新增或重构 Skill，而不是改 workflow / 根层治理，先看：

- [../framework/.agents/skills/references/skill-spec.md](../framework/.agents/skills/references/skill-spec.md)
- [../framework/.agents/skills/references/quality-checklist.md](../framework/.agents/skills/references/quality-checklist.md)
- [../framework/.agents/skills/references/anti-patterns.md](../framework/.agents/skills/references/anti-patterns.md)

## 维护时的最低足够原则

框架维护时，默认先问：

1. 这个问题是所有模块都会遇到，还是只影响某一类模块？
2. 这个问题需要提升所有交付等级，还是只影响 `L2` / `L3`？
3. 如果只影响局部，能否在模块类型或交付等级层面分流，而不是继续加全局硬规则？

AI-OS 现在的方向不是“所有模块都更严格”，而是“每类模块都用最低足够流程获得稳定交付”。

## 本地开发

常用本地调用方式：

```bash
node ./bin/create-ai-os.js --help
node ./bin/create-ai-os.js my-project --with-project-files
node ./bin/create-ai-os.js doctor my-project
node ./bin/create-ai-os.js validate my-project
node ./bin/create-ai-os.js skill-check framework/.agents/skills/project-planner --strict
```

## 测试

运行完整测试：

```bash
npm test
```

手动验证常见命令：

```bash
node bin/create-ai-os.js /tmp/test-project --with-project-files
node bin/ai-os-doctor.js /tmp/test-project
node bin/ai-os-diff.js /tmp/test-project
node bin/ai-os-upgrade.js /tmp/test-project
node bin/ai-os-release-check.js /tmp/test-project
node bin/ai-os-skill-check.js framework/.agents/skills/project-planner
```

## 发布前自查

发布前至少确认：

- `VERSION` 和 `package.json` 是否一致
- `framework/` 的变更是否反映到 README / docs
- 新命令是否补齐帮助信息
- 测试是否通过
- 如有框架层变更，是否考虑升级说明
- 如有 Skill 规范变更，是否同步更新 `framework/.agents/skills/references/`

## 相关文档

- 审批策略：`framework/.agents/policies/approval-policy.md`
