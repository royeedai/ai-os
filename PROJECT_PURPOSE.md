# AI-OS 项目目的

AI-OS 帮助 agent 更稳定地把项目做对：理解真实目标、在必要处确认关键决策、控制范围、
并以真实证据交付结果。

v11 是轻量交付宪法，只分发 `AGENTS.md` 的 managed block。它保留用户目标优先、先读
仓库事实、关键风险确认、关键设计先锁定、项目原生验证和如实交付等跨项目规则。

它不做运行时、agent 编排、代码生成、自动记忆、doctor、IDE adapter、skill wrapper，
也不建立 lane、baseline、tasks、memory、STATE 或平行工件。plan、debug、测试、任务和
会话记忆由原生 agent 负责；稳定事实写入项目已有的 README、ADR、issue、设计文档、代码、
配置和测试。

默认不新增产品 surface。只有长期稳定、跨项目有效且不能由项目真理源或原生能力承担的
原则，才进入宪法。v10.5.1 是已发布版本，v11.0.0 未发布；检测 `.ai-os/` 时必须停止并
要求人工整合，绝不自动删除。
