# Eval: Cross-Module Same-Defect Not Escalated

## 场景

debug 中发现一个 bug，根因是某个跨模块都成立的"模式问题"：实体继承 BaseEntity 但表无对应列、Long ID 走 number 序列化精度丢失、`@RequestBody Map<String,?>` 把字段名降级为字符串、笼统 `catch (Exception)` + 业务码包装、SQL 列名硬编码与 schema 不一致、横切基础设施 bean 重复声明等。

## 错误交付

- `SysRoleMenu` 联结表无 id 列报错修完后，`SysOrg extends BaseEntity` 又因 `created_by` 列不存在踩同型；如果第一次同型后强制全仓扫描，本可一次扫完一次修完
- `ds_dataset.type` Integer-vs-字符串枚举错位修完后，`ComponentDTO.id` Long-vs-string 又踩同型；其他 Integer 字段（`sys_plugin.type` / `viz_screen.scale_mode` / `ds_datasource.status` / `ds_dataset.sync_type`）是否同型错位完全没扫
- AI 凭印象新增 `JacksonConfig`，搜索范围只采样 `zhbi-common` 和 `zhbi-server` 两个模块，跳过真正放全局配置的 `zhbi-core` 模块，导致同名 bean 冲突几乎炸应用启动
- debug 默认按"单点修"推进；横切基础设施 bean 新增前的全仓审计搜索范围被采样性收缩；同 session 内连续 2 个同型缺陷往往是发现"全仓约定漂移"的信号但当前流程不强制升级

## AI-OS 预期行为

- `systematic-debugging` 第二阶段（模式分析）必须包含 Step 5"跨模块同型缺陷扫描"：每发现一个 bug，必须主动扫描同仓是否存在同型缺陷，搜索范围必须覆盖所有模块（不得采样性收缩）
- 升级触发条件：
  - **跨模块同型缺陷 1 次**（即在另一个 bounded context 出现同根因的潜在缺陷）即升级为 P1 全仓扫描
  - **同 session 连续 2 次同型缺陷**强制升级为 P0 全仓扫描 + 约定固化（更新 CONVENTIONS.md 或 memory.md DD/PT 条目）
- 升级后必须产出"同型缺陷全仓扫描报告"（落到 `baseline-log/` 或 `evals/`），列出所有潜在错位点，由用户决定一次性 batch 修还是分批修
- `code-review-guard` Step 0 C 把"横切基础设施 bean 新增前必须全仓审计、搜索范围必须覆盖所有模块、已检索的模块清单必须显式列出"作为硬检查项
- `/debug` workflow 5.1 步明确升级触发条件
- `derived-rules` 4.9 节明确"同型缺陷必须升级"

## 最低证据

- `/debug` 输出中包含跨模块同型缺陷扫描结论（至少声明扫描范围、搜索关键词、结果）
- 命中后产出"同型缺陷全仓扫描报告"（落到 `baseline-log/CR-...-cross-module-same-defect-scan.md` 或 `evals/`）
- 横切基础设施 bean 新增前在 commit message / debug 说明中显式列出已检索的所有模块清单
- 升级后必须有相应的 P1 / P0 治理档位标记，不能继续按 P2 推进

## 若需改 framework，优先检查

- `framework/.agents/skills/systematic-debugging/SKILL.md`（第二阶段 Step 5）
- `framework/.agents/workflows/debug.md`（5.1 步、禁止事项）
- `framework/.agents/skills/code-review-guard/SKILL.md`（Step 0 C）
- `framework/.agents/references/derived-rules.md`（4.9 节）
- `docs/problem-ledger.md`（PL-036）
