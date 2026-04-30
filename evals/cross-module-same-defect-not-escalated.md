---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Cross-Module Same-Defect Not Escalated

## 场景

debug 中发现一个 bug，根因是某个跨模块都成立的"模式问题"：实体继承 BaseEntity 但表无对应列、Long ID 走 number 序列化精度丢失、`@RequestBody Map<String,?>` 把字段名降级为字符串、笼统 `catch (Exception)` + 业务码包装、SQL 列名硬编码与 schema 不一致、横切基础设施 bean 重复声明等。

## 错误交付

- `SysRoleMenu` 联结表无 id 列报错修完后，`SysOrg extends BaseEntity` 又因 `created_by` 列不存在踩同型；如果第一次同型后强制全仓扫描，本可一次扫完一次修完
- `ds_dataset.type` Integer-vs-字符串枚举错位修完后，`ComponentDTO.id` Long-vs-string 又踩同型；其他 Integer 字段（`sys_plugin.type` / `viz_screen.scale_mode` / `ds_datasource.status` / `ds_dataset.sync_type`）是否同型错位完全没扫
- AI 凭印象新增 `JacksonConfig`，搜索范围只采样 `zhbi-common` 和 `zhbi-server` 两个模块，跳过真正放全局配置的 `zhbi-core` 模块，导致同名 bean 冲突几乎炸应用启动
- debug 默认按"单点修"推进；横切基础设施 bean 新增前的全仓审计搜索范围被采样性收缩；同 session 内连续 2 个同型缺陷往往是发现"全仓约定漂移"的信号但当前流程不强制升级

## AI-OS 预期行为

- 修复 bug 阶段的模式分析必须包含"跨模块同型缺陷扫描"：每发现一个 bug，必须主动扫描同仓是否存在同型缺陷，搜索范围必须覆盖所有模块（不得采样性收缩）
- 升级触发条件：
  - **跨模块同型缺陷 1 次**（即在另一个 bounded context 出现同根因的潜在缺陷）即升级为 P1 全仓扫描
  - **同 session 连续 2 次同型缺陷**强制升级为 P0 全仓扫描 + 约定固化（更新 `.ai-os/memory.md` 跨层契约登记表）
- 升级后必须产出"同型缺陷全仓扫描报告"（落到 lane `baseline-log/CR-*.md` 或 `evals/`），列出所有潜在错位点，由用户决定一次性 batch 修还是分批修
- 横切基础设施 bean 新增前必须全仓审计、搜索范围必须覆盖所有模块、已检索的模块清单必须显式列出
- 同 session 内连续 2 个同型缺陷往往是发现"全仓约定漂移"的信号，必须强制升级而不是按"单点修"推进

## 最低证据

- 修复 bug 阶段输出中包含跨模块同型缺陷扫描结论（至少声明扫描范围、搜索关键词、结果）
- 命中后产出"同型缺陷全仓扫描报告"（落到 lane `baseline-log/CR-YYYYMMDD-HHMMSS-cross-module-same-defect-scan.md`）
- 横切基础设施 bean 新增前在 commit message 或修复说明中显式列出已检索的所有模块清单
- 升级后必须有相应的 P1 / P0 治理档位标记，不能继续按 P2 推进

## 若需改 framework，优先检查

- `AGENTS.md`（行为规则节"修复 bug"；五条核心要求 §3 自适应治理；"稳定失败模式"升格规则）
- `framework/.agents/templates/shared-root/memory.md`（跨层契约登记表）
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/baseline-log/BL-template.md`
- `docs/problem-ledger.md`（PL-036）
