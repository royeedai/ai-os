# Helpdesk Agent 示例项目

这个目录演示一个最小但完整的 AI-OS 项目闭环，适合第一次理解“根目录保留框架入口、项目工件统一进入 `.ai-os-project/`”的布局：

- `.ai-os-project/project-charter.md`
- `.ai-os-project/risk-register.md`
- `.ai-os-project/tasks.yaml`
- `.ai-os-project/acceptance.yaml`
- `.ai-os-project/release-plan.md`
- `.ai-os-project/memory.md`
- `.ai-os-project/STATE.md`
- `.ai-os-project/specs/`
- `.ai-os-project/evals/`
- `.ai-os-project/review-report.md`

## 示例场景

项目目标是做一个“工单分诊 Agent”，把新工单自动归类、标优先级，并在高风险场景转人工。

## 建议阅读顺序

1. 先读 `.ai-os-project/STATE.md`
2. 再读 `.ai-os-project/project-charter.md`
3. 再读 `.ai-os-project/specs/ticket-triage.spec.md`
4. 然后读 `.ai-os-project/tasks.yaml` 和 `.ai-os-project/acceptance.yaml`
5. 最后看 `.ai-os-project/review-report.md` 和 `.ai-os-project/release-plan.md`

## 可以怎么验证

```bash
node ../../bin/ai-os-validate.js .
node ../../bin/ai-os-status.js .
node ../../bin/ai-os-next.js .
node ../../bin/ai-os-release-check.js .
```
