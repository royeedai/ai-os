# Skills 使用指南

AI-OS 的 Skill 组合围绕 3 件事：

1. 把目标说清
2. 把设计和逻辑先锁住
3. 把实现、验证和交付做成可恢复闭环

## 默认主链路

| 阶段 | 优先 Skill |
|------|------------|
| `/align` | `project-planner`、`memory-manager` |
| `/design` | `reverse-engineer`（reverse-spec 时）、`spec-validator` |
| `/plan` | `spec-validator`、`task-orchestrator`、`acceptance-gate` |
| `/build` | `fullstack-dev-checklist`、`code-review-guard`（含 CONVENTIONS.md 模式一致性检查）、`subagent-executor`（多任务执行时） |
| `/verify` | `acceptance-gate`、`code-review-guard`、`testing-strategies` |
| `/ship` | `release-manager` |

## 内部角色协议

多 agent 不是用户侧主入口，但任务可以使用这些内部角色视角：

| execution_role | 主要职责 | 建议 Skill |
|------|------|------|
| `design_mapper` | 把目标、截图、参考站和口述收敛为 IA、页面和交互决策 | `reverse-engineer`、`spec-validator` |
| `contract_mapper` | 把 API、数据和业务规则收敛为 contracts 和状态流转 | `api-design`、`spec-validator` |
| `implementer` | 在门禁通过后完成真实实现 | `fullstack-dev-checklist`、`testing-strategies` |
| `reviewer` | 独立检查设计偏差、逻辑偏差和工程风险 | `code-review-guard`、`acceptance-gate` |

## 重要触发规则

- 目标模糊、范围易漂移：必须用 `project-planner`
- 有截图 / API / 参考源码：必须用 `reverse-engineer`
- 准备生成或重写 spec：必须用 `spec-validator`
- 准备拆任务和执行波次：必须用 `task-orchestrator`
- `/build` 阶段多任务需要隔离执行和审查：用 `subagent-executor`
- 准备判断“做没做对”：必须用 `acceptance-gate`
- 同类提醒重复出现：必须用 `memory-manager`
- 一个任务同时跨页面、接口、持久化或复杂联动：用 `fullstack-dev-checklist`
- 命中资产、权限、不可逆状态流转、跨用户数据、并发敏感更新或外部副作用：必须升级为 `high-risk`
- 交互天然存在增量输出、长耗时、异步完成或持续反馈：必须先做交互模式判型，不得默认普通 request / response

## 不再推荐的旧心智

- 不要把所有项目都默认按“大而全 fullstack 流程”处理
- 不要把 Skill 触发理解成“会写代码就够了”
- 不要在设计门和逻辑门未过时，把 `implementer` 当默认主角色

## 自定义 Skill

如果你要新增或重构自定义 Skill，先看：

- `.agents/skills/references/skill-spec.md`
- `.agents/skills/references/quality-checklist.md`
- `.agents/skills/references/anti-patterns.md`

校验命令：

```bash
create-ai-os skill-check .agents/skills/<skill-name>
create-ai-os skill-check .agents/skills/<skill-name> --strict
```
