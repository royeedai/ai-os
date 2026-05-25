# BL-20260525-140000-retrospective-v9-recap

- **Type**: retrospective
- **Status**: active-recap
- **Date**: 2026-05-25
- **Summary**: 对 v9.0 → v9.6 累计 8 条 CR 的 Preventability review 聚合，作为 v9.7 Framework Feedback Loop 上线时的 dogfooding 起点数据。AI-OS 自身 lane 仍在 active 状态，本文件是阶段性回顾，不代表 lane 关闭。
- **Source CRs**: 8 条（v8-constitution-refactor / v9-default-lane-reset / url-reverse-spec-intake / external-learning-fusion / agent-handoff-evidence-loop / hallucination-guard / activation-gate / long-horizon-agent-reliability）

## Preventable findings

| CR | Minor | Preventable | Root cause | 已落 guard |
|---|---|---|---|---|
| CR-20260422-120000-v8-constitution-refactor | v8.0 | partial | v7 第一次设计被 CLI/slash command 风潮带偏，引入 15+14 个命令；本可用"操作面极简"取舍框架避免 | `PROJECT_PURPOSE.md` §5 新需求筛选法 + project-lead 红线 |
| CR-20260422-203000-v9-default-lane-reset | v9.0 | yes | v8 默认布局在 README / schema / install / doctor / tests 间表达不一致，缺"canonical layout 变更必须多文件同步"硬约束 | PT-001 + `docs/maintainers.md` §维护规则 §1 |
| CR-20260502-204346-url-reverse-spec-intake | v9.2 | no | 真实能力扩展，非框架疏漏 | n/a |
| CR-20260502-210628-external-learning-fusion | v9.3 | partial | v9.0 第一次设计宪法时未与开放标准做映射对齐，导致补 interop / `aios://` / SKILL.md 包装 | PL-008 + `docs/interop/` 锚点 |
| CR-20260502-224147-agent-handoff-evidence-loop | v9.4 | partial | v9.0 tasks schema 未把"任务交出去后证据如何回流"明确成 handoff packet | PL-010（旧）+ W076 |
| CR-20260507-092708-hallucination-guard | v9.5 | partial | v9.2 已有 `observed` / `inferred` / `unknown` 词表但只用于 URL 证据，未同步推广到通用任务事实 | PL-011（旧）+ W077 + `fact_state_review` |
| CR-20260521-230548-activation-gate | v9.5.1 | partial | v9.0 设计宪法时未显式区分"普通对话 vs. delivery-affecting work"启用门槛，agent 在 `.ai-os/` 存在时无条件进入 lane 治理 | PL-010（新）+ AGENTS.md 启用门槛 |
| CR-20260521-232937-long-horizon-agent-reliability | v9.6 | partial | v9.4 handoff schema 未把"长时程 / 后台 / 云端 / 外部 PR / 并行执行"作为独立 execution surface 维度建模 | PL-011（新）+ W078 + `agent_run_review` |

## Unmapped → PL candidates

经统计，8 条 CR 中没有出现 `Maps to: unmapped` 但出现 ≥2 次的同一根因——所有 partial/yes 类问题都已映射到 PL-* / PG-* / PT-* 既有条目。

但发现一个 PL ledger 层面的隐患（不是 Preventable 信号，而是台账卫生）：远程 v9.5.1 / v9.6 在新增 PL 条目时**重复使用了 PL-010 / PL-011 编号**，与历史 v9.4 / v9.5 的 PL-010 / PL-011 在同一文件内冲突。本次未擅自修改远程 ledger（已发布），但建议下个 minor 在 `docs/maintainers.md` 增加"PL/PG 编号注册"小节，避免后续并行开发再次撞号。

如果 v9.7 之后第三方用户通过 `.github/ISSUE_TEMPLATE/preventable-modification.md` 反馈出现 ≥2 次未归并根因，应在下一个 minor 升格为新 PL-* / PG-*。

## Suggested framework changes

本次回顾未发现需要立即升格为 PL-* / PG-* 的新 failure mode。但发现两条横向 meta 规律：

- **Meta finding 1**: 8 条 CR 中有 6 条是 partial，意味着 AI-OS 第一次设计常在"词表 / schema / 标准对齐"层面留下可在第一次就更彻底的优化空间。这正是 v9.7 Framework Feedback Loop 要长期捕捉的失败模式。
- **Meta finding 2（本轮发布暴露）**: 多个并行 session 同时迭代 v9.x 时容易撞 doctor warning 编号（本轮 W078 既被 long-horizon 用、又被 framework-feedback 计划用），最后被迫重命名为 W079。下次扩展 doctor 前建议先看一眼远程未发布分支，或在 maintainers.md 维护占用清单。
- **Sustained guard**: v9.7 引入的 `## Preventability review` 段落 + W079a/W079b（INFO）+ dogfooding 流程 + `framework-feedback` issue 模板，已作为 Meta finding 1 的工件层 guard。Meta finding 2 暂记入本 retrospective，待 maintainer 决策是否升级。

## Maintainer 复盘节奏

从 v9.7 起，每个 minor 发布前 maintainer 须执行：

```bash
git grep -n "Preventable: yes\|Preventable: partial" .ai-os/lanes/
git grep -n "Maps to: unmapped" .ai-os/lanes/
```

未归并 unmapped 根因出现 ≥2 次 → 在下个 minor 新增 PL-* / PG-*，并按 guard 落点优先级（AGENTS.md > 工件模板 > doctor > docs）收紧。
