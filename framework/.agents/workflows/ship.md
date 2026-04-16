---
name: ship
description: 做交付、发布、回滚和移交
---

# /ship

> 路径说明：lane 布局下，下文提到的 `release-plan.md`、`risk-register.md` 默认位于当前 lane 的 `.ai-os/lanes/<lane-id>/`；legacy 单交付项目仍位于 `.ai-os/` 根层。

## 前置条件

- `delivery-readiness` 已通过
- 关键运行态证据已齐
- 高风险审批点已完成
- 用户已看过当前 lane 的交付范围和已知风险

## 必做步骤

1. 先判断这次收口针对哪一条 lane：
   - 若本次发布 / 交付继续当前 lane，继续在当前 lane 生成交付说明
   - 若项目里有多个 active lane 但当前 lane 不明确，先执行 `create-ai-os lane list .`，必要时再用 `create-ai-os lane activate <lane-id> . --only`
   - 若真正要收口的是另一条并行交付线，先切到对应 lane，不要把两个 lane 的 release 说明揉成一份
2. 若共享代码、共享契约或共享基础设施改动可能影响其他 lane，先列出受影响 lane，并明确哪些 lane 已完成 `validate` / `gate verify` / `release-check --lane <lane-id>`，哪些仍待补回归；不要把“当前 lane 可交付”写成“整个项目所有 lane 都已交付”
3. 生成或更新当前 lane 的 `release-plan.md`
4. 明确发布步骤和回滚触发条件，并在步骤中标注 `AI 已完成` 或 `需人工执行`
5. 明确交付说明与移交内容，输出 `AI 已完成` / `需人工执行` 双清单
6. 列出本次已实现功能、未纳入范围的内容、影响范围、上线注意事项和后续维护建议
7. 区分 fallback 证据和正式交付证据，并显式记录静态校验证据
8. 若当前 lane 将在本轮收口后归档，先判断哪些稳定结论要回流到共享 `.ai-os/memory.md` / `.ai-os/CONVENTIONS.md`，并记录各自是 `done` 还是 `not-needed`
9. 若确认要归档当前 lane，在共享结论已回流或已明确 `not-needed` 后，再执行 `create-ai-os lane archive <lane-id> . --outcome <outcome> --reason <reason> --memory-sync <status> --conventions-sync <status> --problem-ledger-sync <status>`
10. 在真正收口前，向用户输出完整交付说明并等待确认

## 禁止事项

- 禁止把未验证能力或未纳入范围的内容写成已交付
- 禁止多 active lane 未判定当前 lane 就输出 release 说明
- 禁止共享代码改动只确认当前 lane，就把其他 lane 一并写成“已交付”
- 禁止把仍需人工执行的 SQL / 重启 / 迁移 / 补数 / 环境变更写成 AI 已全部完成
- 禁止 lane 归档只改 `status = "archived"`，却不先明确共享 `memory.md` / `CONVENTIONS.md` 的回流结果
- 禁止未说明风险、回滚和运行态前提就直接宣称可上线
