# Hallucination Guard Spec

## 1. Spec route

- **Route type**: change + brownfield
- **Baseline ID**: CR-20260507-092708-hallucination-guard
- **Source artifacts**: lane MISSION, lane DESIGN, AGENTS.md, docs/constitution-spec.md
- **Confidence rule**: only `observed` and `confirmed` can support task closure; `inferred` and `unknown` must stay visible until resolved

## 2. 业务规则与交互模式

- **核心规则**：
  - `fact_state_review.observed` records facts actually inspected in code, tests, logs, runtime, pages, interfaces, or other evidence.
  - `fact_state_review.confirmed` records facts confirmed by the user, current lane artifacts, specs, or baseline records.
  - `fact_state_review.inferred` records assumptions; these cannot be presented as confirmed facts.
  - `fact_state_review.unknown` records missing knowledge; these must become pending confirmations, non-goals, blockers, or CRs.
  - `done` / `verified` / `shipped` tasks cannot keep unresolved `inferred` or `unknown` entries.
- **关键状态**：todo → in_progress → done / verified / shipped
- **关键异常**：任务进入 execution / completion without observed or confirmed facts；closed task keeps unresolved inference / unknown

## 3. 验收标准

| AC ID | Requirement | Acceptance |
|---|---|---|
| AC-001 | REQ-001 | Task template and self-hosted tasks include `fact_state_review` with four state buckets |
| AC-002 | REQ-002 | W077 warns for missing observed/confirmed fact state and closed unresolved inferred/unknown |
| AC-003 | REQ-003 | Docs/spec/skill keep Hallucination Guard inside artifact governance |
| AC-004 | REQ-004 | Self-hosted lane passes strict doctor |
| AC-005 | REQ-005 | Version and product surface tests align to 9.5.0 |

## 4. 契约基准

| Contract | Field | Required for | Rule |
|---|---|---|---|
| Task fact-state review | `fact_state_review.observed` | in_progress / done / verified / shipped | At least one observed or confirmed source must exist |
| Task fact-state review | `fact_state_review.confirmed` | in_progress / done / verified / shipped | At least one observed or confirmed source must exist |
| Task fact-state review | `fact_state_review.inferred` | allowed only while unresolved | Must be resolved or moved before done / verified / shipped |
| Task fact-state review | `fact_state_review.unknown` | allowed only while unresolved | Must be resolved, moved to pending confirmation, non-goal, blocker, or CR before closure |
| Doctor warning | W077 | strict verification | Warning by default; `--strict` fails |

## 5. 边界条件与错误路径

- **空数据**：empty `fact_state_review` counts as missing source state.
- **权限拒绝**：permission-blocked evidence must be `unknown`, not `observed`.
- **超时**：timeout evidence must stay `unknown` until retried or scoped out.
- **回归**：if W077 stops firing for missing source state or unresolved inferred/unknown, `test/doctor.test.js` must fail.

## 6. 验收映射

| Requirement | Acceptance | Task |
|---|---|---|
| REQ-001 | AC-001 | TASK-AI-401 |
| REQ-002 | AC-002 | TASK-AI-402 |
| REQ-003 | AC-003 | TASK-AI-403 |
| REQ-004 | AC-004 | TASK-AI-404 |
| REQ-005 | AC-005 | TASK-AI-404 |
