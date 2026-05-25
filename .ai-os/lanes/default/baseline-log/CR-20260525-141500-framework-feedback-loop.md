# CR-20260525-141500-framework-feedback-loop

- **Type**: change-request (minor governance enhancement)
- **Status**: confirmed
- **Date**: 2026-05-25
- **Summary**: Add a Framework Feedback Loop that captures "modifications proposed after AI-OS first delivery that were preventable in the first session" as a local artifact contract. CR baseline records gain `## Preventability review`; lanes closing out aggregate findings into a retrospective baseline-log; doctor adds info-level W079a / W079b guidance. Released as v9.7.0 on top of v9.6.0 (Long-Horizon Agent Reliability). No telemetry, no new CLI command, no new artifact category.
- **Affects**: `AGENTS.md`, `bin/ai-os-doctor.js`, `framework/.agents/templates/lane/baseline-log/BL-template.md`, `docs/artifacts.md`, `docs/cli.md`, `docs/constitution-spec.md`, `docs/maintainers.md`, `docs/problem-ledger.md`, `.github/ISSUE_TEMPLATE/preventable-modification.md`, `.ai-os/lanes/default/baseline-log/*`, `test/*`, `VERSION`, `package.json`, `CHANGELOG.md`, `README.md`
- **Confirmed by**: project owner, 2026-05-25

## Trigger

User asked how AI-OS should collect "usage feedback to drive its own iteration"—specifically the modifications users propose after the first AI-OS delivery that could have been prevented in the first session, without resorting to telemetry or reporting machinery. After local work was committed to a feature branch, a parallel session published v9.6.0 (Long-Horizon Agent Reliability) to the remote main; this CR was rebased onto that baseline and renumbered to v9.7.0 with doctor codes shifted from W078 to W079 to avoid the long-horizon warning collision.

## Current behavior

- AI-OS already provides PL-* / PG-* problem ledger, baseline-log lifecycle, verification-matrix → evals promotion, but all three are framework-side surfaces maintained by the maintainer, with no first-class intake from user lanes.
- Self-hosted CRs (v8-constitution-refactor through hallucination-guard, plus v9.6 activation-gate and long-horizon) carry no explicit preventability signal, so dogfooding insight only lives in maintainer memory.
- There is no lightweight third-party intake path for "AI-OS should have caught this in session one" feedback; the closest is filing a generic feature request.

## Proposed delta

- Extend baseline-log CR lifecycle to include `## Preventability review` (`Preventable` / `If yes, root cause` / `Maps to` / `Suggested guard`) and document a `BL-*-retrospective*.md` aggregation convention when a lane closes.
- Add two AGENTS.md behavior-rule micro-additions (requirement-change rule and delivery-closeout rule) so AI fills the section by default, without growing AGENTS.md beyond 150 lines.
- Add doctor `W079a` (CR missing `## Preventability review`) and `W079b` (closed lane missing retrospective baseline-log) at **info level only**, excluded from `SEMANTIC_WARNING_CODES`, not upgraded by `--strict`. (W078 is already used by v9.6 long-horizon agent reliability warning.)
- Document Framework feedback loop in `docs/artifacts.md`, `docs/cli.md`, `docs/constitution-spec.md` (bumped to v1.9), `docs/maintainers.md` (new "Framework feedback 复盘" section), and `docs/problem-ledger.md` (new PL-012).
- Add `.github/ISSUE_TEMPLATE/preventable-modification.md` with `framework-feedback` label as optional third-party intake; no telemetry, no new CLI, no MCP server, no IDE-specific behavior.
- Dogfood: backfill historical CRs with `## Preventability review`, plus `BL-20260525-140000-retrospective-v9-recap.md` as the first aggregation data point.

## Affected artifacts

- Runtime code: `bin/ai-os-doctor.js` (new `checkPreventabilityReview` / `checkLaneRetrospective` info-level checks emitting W079a / W079b)
- Constitution: `AGENTS.md` (two behavior-rule lines extended), constitution spec bumped to v1.9
- Framework templates: `framework/.agents/templates/lane/baseline-log/BL-template.md`
- Docs: `docs/artifacts.md`, `docs/cli.md`, `docs/constitution-spec.md`, `docs/maintainers.md`, `docs/problem-ledger.md`
- Issue template: `.github/ISSUE_TEMPLATE/preventable-modification.md`
- Self-hosted lane dogfood: historical CRs (incl. v9.6 activation-gate and long-horizon) + new retrospective baseline-log
- Tests: `test/docs.test.js`, `test/doctor.test.js`, `test/install.test.js`, `test/shared.test.js`
- Metadata: `VERSION`, `package.json`, `CHANGELOG.md`, `README.md`

## Acceptance delta

- AC-001: `framework/.agents/templates/lane/baseline-log/BL-template.md` documents `## Preventability review` schema and `BL-*-retrospective*.md` aggregation convention.
- AC-002: AGENTS.md remains ≤150 lines; behavior rules for `需求变化` and `交付收口` mention Preventability review / retrospective aggregation.
- AC-003: doctor emits `W079a` (info) when CR baseline records lack `## Preventability review`, and `W079b` (info) when a closed lane has no retrospective; `--strict` does NOT upgrade either to error.
- AC-004: `docs/problem-ledger.md` registers PL-012 with coverage anchors pointing to the new template, doctor checks, maintainers section, and issue template.
- AC-005: `docs/constitution-spec.md` is at v1.9 with the Framework feedback loop section; `docs/artifacts.md` documents the loop without adding a 13th artifact category.
- AC-006: All self-hosted historical CRs (incl. the two v9.6 CRs added on remote main) carry `## Preventability review`; `BL-20260525-140000-retrospective-v9-recap.md` aggregates findings.
- AC-007: `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict` all pass; product surface remains 3 primary operations, 4 bin scripts, 12 artifact categories.

## Close/archive condition

- `npm test` passes.
- `npm run lint` passes (zero warnings).
- `node bin/create-ai-os.js doctor . --json --strict` returns ok (W079a / W079b are info, so they cannot block --strict).
- VERSION / package.json / `.ai-os/framework.toml` bumped to 9.7.0.
- Changes committed to `main` and tagged `v9.7.0`.

## Rollback path

- Revert v9.7 docs/template/test/version changes if the info-level W079 guidance turns out to be noisy or if the section is repeatedly skipped without value.
- Keep `docs/maintainers.md` Framework feedback 复盘 section as a manual practice even if the doctor checks are reverted; the underlying signal source is the CR section, not the doctor reminder.

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: v9.0 第一次设计 baseline-log CR lifecycle 时，已经把"变更可追溯"做成 5 段 schema（Current behavior / Proposed delta / ...），但未在第一时间为框架自身的迭代闭环留下"本可避免性"反馈位；导致 v9.0 → v9.6 历史 CR 全靠 maintainer 记忆复盘而非工件复盘。本可在 v9.0 CR lifecycle 设计时就并入 Preventability review。同时本轮发布过程中暴露了第二个 partial：并行 v9.6 发布占用了 W078 编号，本地原计划的 W078a/W078b 不得不重命名为 W079a/W079b——这是 doctor 编号空间缺乏注册中心的副作用。
- **Maps to**: PL-012（AI-OS 第一次开发未拦住本可避免的修改，本 CR 同步登记）
- **Suggested guard**: 本次已经落 guard：BL-template / AGENTS.md 行为规则 / doctor W079a/W079b / docs/maintainers.md 复盘流程 / issue 模板。后续若反馈通道证明"info 级 W079 太轻被忽略"，可考虑把 W079a 升格为 warning（但需先经 PL-012 累计证据评估）。另一条 follow-up：考虑在 `docs/maintainers.md` 维护一个"doctor warning code 已占用清单"（W070-W079 当前覆盖），避免下次并行 minor 又撞编号。
