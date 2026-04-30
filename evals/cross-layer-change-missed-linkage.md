---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Cross-Layer Change Missed Linkage

## 场景

一个模块同时改了入口、契约字段和运行配置，但任务拆分和 review 没有显式补齐联动检查。

## 错误交付

- 改了接口 / 命令入口，却漏掉代理、网关、鉴权或启动链路
- 改了 schema / mapping，却漏掉序列化、迁移、兼容性或空值处理
- `tasks.yaml` 没有 `impact_tags`、`derived_checks`

## AI-OS 预期行为

- `/plan` 必须根据 spec 的 `集成触点` 派生 `context_files`、`impact_tags`、`derived_checks`
- `/build` 和 `/verify` 必须按联动矩阵补查入口、映射、运行态影响
- `verification-matrix.yaml` 必须支持 `impact_rules`

## 最低证据

- spec 中的 `集成触点`
- tasks 中的 `impact_tags` / `derived_checks`
- verification-matrix 中的 `impact_rules`
- contract / degraded-path 证据

## 若需改 framework，优先检查

- `framework/.agents/skills/task-orchestrator/SKILL.md`
- `framework/.agents/skills/fullstack-dev-checklist/SKILL.md`
- `framework/.agents/templates/project/tasks.yaml`
- `framework/.agents/templates/project/verification-matrix.yaml`
