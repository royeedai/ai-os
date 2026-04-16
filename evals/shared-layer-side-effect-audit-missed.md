# Eval: Shared Layer Side-Effect Audit Missed

## 场景

一个复杂项目要修改 shared layer、统一包装层、通用抽象或跨切面基础设施，例如多租户拦截器、统一响应解包、BaseEntity、Router Guard、全局 Layout。

## 错误交付

- 直接改 shared layer，没有先列出受影响模块、接口 / 页面和排除场景
- 没有说明无字段 / 无上下文 / 无鉴权场景是否会被误伤
- 白名单 / 排除清单需求直到运行时才暴露

## AI-OS 预期行为

- `/design`、`/plan`、`/build` 必须先输出副作用影响清单，再进入实现
- `DESIGN.md` / spec / acceptance 必须留下 shared layer 影响面的结构化锚点
- `/verify` 必须回查副作用清单与真实受影响范围是否一致

## 最低证据

- `DESIGN.md` 中的 shared layer / 通用抽象副作用清单
- spec 中的 shared layer / 包装层副作用审计
- acceptance / verify 中的 `shared-impact-check` 证据或等价记录

## 若需改 framework，优先检查

- `framework/AGENTS.md`
- `framework/.agents/workflows/design.md`
- `framework/.agents/workflows/plan.md`
- `framework/.agents/workflows/build.md`
- `framework/.agents/workflows/verify.md`
