---
trigger_source: manual
first_baseline_id: ""
risk_source: delivery-governance
failure_mode: fix-complete-but-data-runtime-not-recovered
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: Fix Complete But Data / Runtime Not Recovered

## 场景

一个 bug 或修复任务在代码层已经改动完成，但真正恢复还依赖种子数据修正、SQL 补救、服务重启、浏览器刷新、重新登录或缓存清理。

## 错误交付

- 只看到代码 diff 已修复，就宣称问题完成
- 没有区分数据状态和运行状态是否仍需补救
- 缺少每步最小验证，直到最后统一 build 或页面点击时才暴露残留问题

## AI-OS 预期行为

- 修复 bug 阶段必须优先追共享包装层，并在结论中显式拆开代码状态 / 数据状态 / 运行状态
- 实现阶段对跨层或共享改动执行分步验证，不要把所有验证后置到最后
- 验证和交付收口不得把待补 SQL、待重启服务、待刷新会话写成"AI 已全部完成"，必须按双清单"AI 已完成 vs 需人工执行"显式拆分

## 最低证据

- 修复 bug 输出中的代码状态 / 数据状态 / 运行状态三分诊断
- lane `tasks.yaml` 中的 `evidence_required` / `evidence_produced`
- lane `verification-matrix.yaml` / `release-plan.md` 中的代码 / 数据 / 运行三态恢复记录

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §4"代码状态 / 数据状态 / 运行状态"三段拆分；行为规则节"修复 bug"、"实现阶段"、"验证阶段"、"交付收口"）
- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/release-plan.md`
