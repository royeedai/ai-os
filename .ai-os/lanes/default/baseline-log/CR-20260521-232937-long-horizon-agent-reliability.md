# CR-20260521-232937-long-horizon-agent-reliability

> v9.6 change request for long-horizon / background / external / parallel agent delivery review.

- **Type**: change
- **Status**: confirmed
- **Summary**: Add a governance loop for long-running agent work without adding an execution layer.
- **Affects**: tasks.yaml, verification-matrix.yaml, doctor, README, docs, skill wrapper, examples, tests, version metadata
- **Confirmed At**: 2026-05-21T23:29:37+08:00

## Current behavior

AI-OS v9.4 records basic agent handoff context and evidence through `handoff_to`, `context_refs`, `expected_return`, `evidence_required`, `evidence_produced`, and `deviation_log`. v9.5 adds fact-state review. These fields do not yet distinguish foreground work from long-running background, cloud, external PR, or parallel agent execution.

As a result, a task can be delegated to a background agent and later return with only a diff or status claim. The lane may not capture branch / PR / session refs, write ownership, progress checkpoints, return packet, unresolved risks, or human review status.

## Proposed delta

Add v9.6 Long-Horizon Agent Reliability as a non-breaking governance layer:

- Add optional `agent_run_review` in `tasks.yaml` for long-horizon work.
- Add W078 doctor warning for explicitly delegated / background / cloud / external / parallel execution.
- Add template guards and failure modes for orphaned runs, unreviewed PRs, branch drift, missing native evidence, overlapping write scopes, and unclear network / secrets boundaries.
- Add tool-neutral interop guidance and a background handoff example.
- Bump version to 9.6.0 and constitution spec to v1.8.

## Affected artifacts

- `framework/.agents/templates/lane/tasks.yaml`
- `framework/.agents/templates/lane/verification-matrix.yaml`
- `framework/.agents/templates/lane/baseline-log/BL-template.md`
- `bin/ai-os-doctor.js`
- `docs/artifacts.md`
- `docs/constitution-spec.md`
- `docs/cli.md`
- `docs/interop/long-horizon-agents.md`
- `framework/skills/ai-os-delivery/SKILL.md`
- `README.md`
- `examples/background-agent-handoff.md`
- `docs/problem-ledger.md`
- `test/docs.test.js`
- `test/doctor.test.js`
- `VERSION`
- `package.json`
- `package-lock.json`

## Acceptance delta

- `agent_run_review` appears in task templates and docs.
- W078 warns on missing run refs / write scope for cloud background task.
- W078 warns when a closed long-horizon task lacks return packet or human review.
- W078 warns when unresolved risks remain in returned work marked verified.
- W078 does not fire for clean local foreground tasks.
- Complete background task evidence clears W078.
- Product surface still has no new CLI command, flag, profile, runtime runner, MCP server, IDE hook, agent router, or vendor dependency.

## Close/archive condition

Close this CR when `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict` pass with version metadata updated to `9.6.0` and spec updated to `v1.8`.

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: v9.4 Agent Handoff + Evidence Loop 已经定义 `handoff_to` / `context_refs` / `expected_return` / `evidence_produced` / `deviation_log`，但未把"长时程 / 后台 / 云端 / 外部 PR / 并行执行"作为独立的 execution surface 维度建模。结果当 task 真的被交给 cloud agent / Cursor background / Copilot cloud 时，run refs、write scope、return packet、human review 等回收证据没有专门字段记录。本可在 v9.4 schema 设计时就预留 `agent_run_review`（execution surface + run refs + write scope + return packet + human review），避免 v9.6 才补。
- **Maps to**: PL-015（长时程 / 后台 agent 交付回收不可审查，本 CR 同步登记）
- **Suggested guard**: 已在 `framework/.agents/templates/lane/tasks.yaml` `agent_run_review`、`bin/ai-os-doctor.js` W078、`docs/interop/long-horizon-agents.md`、`examples/background-agent-handoff.md` 中沉淀。后续 schema 扩展应同时回看"是否对所有可能的 execution surface 都有回收契约"，避免再次补丁式扩展。
