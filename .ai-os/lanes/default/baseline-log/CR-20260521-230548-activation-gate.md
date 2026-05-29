# CR-20260521-230548 Activation Gate

## Current behavior

AI-OS already uses progressive disclosure and says it is not an execution layer, but the public rules still make agents treat any project-local conversation as a delivery-governed task. Pure discussion, requirement brainstorming, code explanation, tool questions, and non-repo side tasks can incorrectly trigger lane loading, debug routing, planning, or artifact writes.

## Proposed delta

Add a front-door Activation Gate: AI-OS artifact governance only starts for delivery-affecting work. Delivery-affecting work includes code or project artifact edits, feature implementation, bug fixes, requirement changes, verification, shipping, session recovery, and high-risk actions. Ordinary conversation stays outside lane governance; if intent is unclear, the agent asks one confirmation question before reading or writing lane artifacts.

## Affected artifacts

- `AGENTS.md`
- `framework/skills/ai-os-delivery/SKILL.md`
- `README.md`
- `docs/constitution-spec.md`
- `docs/artifacts.md`
- `docs/problem-ledger.md`
- `examples/`
- `test/docs.test.js`
- `VERSION`, `package.json`, `package-lock.json`, `CHANGELOG.md`
- Self-hosted lane `MISSION.md`, `DESIGN.md`, `tasks.yaml`, and `verification-matrix.yaml`

## Acceptance delta

- Public rules state that AI-OS governance applies only to delivery-affecting work.
- Non-delivery conversation explicitly avoids lane artifact reads/writes and debug / plan / verification routing.
- Ambiguous intent resolves through one confirmation question: "这是先讨论，还是要进入项目交付流程？"
- No new CLI command, flag, install profile, persistent config, runtime layer, or `.ai-os` schema field is introduced.
- Tests assert the Activation Gate appears in the constitution, README, official skill wrapper, spec, artifacts docs, and problem ledger.

## Close/archive condition

Close this CR when `npm test`, `npm run lint`, and `node bin/create-ai-os.js doctor . --json --strict` pass with version metadata updated to `9.5.1`.

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: v9.0 第一次设计宪法时已经声明"AI-OS 不接管执行，工件按 progressive disclosure 加载"，但没有显式区分"普通对话 vs. delivery-affecting work"的启用门槛；导致 agent 在仓库存在 `.ai-os/` 时会无条件进入 lane 工件读写，普通讨论也被治理化。本可在 v9.0 AGENTS.md 设计时就加一条"先判定是否 delivery-affecting"的前置规则。
- **Maps to**: PL-014（非交付对话误触发治理，本 CR 同步登记）
- **Suggested guard**: 已在 AGENTS.md 启用门槛章节、`framework/skills/ai-os-delivery/SKILL.md`、`docs/constitution-spec.md` v1.7、`examples/non-delivery-discussion.md` 中沉淀。后续若仍有 agent 越界，可考虑把启用门槛升级为 doctor 检查项。
