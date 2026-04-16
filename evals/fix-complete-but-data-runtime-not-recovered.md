# Eval: Fix Complete But Data / Runtime Not Recovered

## 场景

一个 bug 或修复任务在代码层已经改动完成，但真正恢复还依赖种子数据修正、SQL 补救、服务重启、浏览器刷新、重新登录或缓存清理。

## 错误交付

- 只看到代码 diff 已修复，就宣称问题完成
- 没有区分数据状态和运行状态是否仍需补救
- 缺少每步最小验证，直到最后统一 build 或页面点击时才暴露残留问题

## AI-OS 预期行为

- `/debug` 必须优先追共享包装层，并在结论中显式拆开代码状态 / 数据状态 / 运行状态
- `/build` 对跨层或共享改动执行 step validation，不要把所有验证后置到最后
- `/verify` / `/ship` 不得把待补 SQL、待重启服务、待刷新会话写成“AI 已全部完成”

## 最低证据

- debug 输出中的代码状态 / 数据状态 / 运行状态三分诊断
- tasks 中的 `step_validation`
- acceptance / release 证据中的 `state-triage-note` 或等价记录

## 若需改 framework，优先检查

- `framework/AGENTS.md`
- `framework/.agents/workflows/build.md`
- `framework/.agents/workflows/debug.md`
- `framework/.agents/workflows/verify.md`
- `framework/.agents/templates/project/tasks.yaml`
- `framework/.agents/templates/project/acceptance.yaml`
