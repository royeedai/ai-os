# Helpdesk Agent 示例项目

这个目录演示一个最小但完整的 AI-OS 项目闭环，适合第一次理解“根目录保留框架入口、项目工件统一进入 `.ai-os-project/`”的布局。

如果你是第一次接触 AI-OS，把它当成一个最小 onboarding 样本即可：先看状态，再看章程与 spec，最后用统一 CLI 入口做检查。

这个示例覆盖的核心工件有：

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

## 第一次上手怎么验证

先用状态类命令理解项目现在在哪里：

```bash
node ../../bin/create-ai-os.js status .
node ../../bin/create-ai-os.js resume .
```

再用检查类命令确认这个示例的工件闭环：

```bash
node ../../bin/create-ai-os.js validate .
node ../../bin/create-ai-os.js next .
node ../../bin/create-ai-os.js release-check .
```
