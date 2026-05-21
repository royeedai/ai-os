# Example: Non-delivery discussion

Scenario: you are inside a repo that has AI-OS installed, but you want to talk through a requirement before changing anything.

## 1. You start with discussion only

**You**: "先聊下会员定价页可能怎么做，不要改项目。"

**Agent behavior**:

1. Reads `AGENTS.md` enough to see the Activation Gate.
2. Classifies the request as ordinary conversation, not delivery-affecting work.
3. Does not read `.ai-os/lanes/default/STATE.md`, `MISSION.md`, `DESIGN.md`, or `tasks.yaml`.
4. Does not create a CR, design doc, task, debug plan, verification matrix entry, or code diff.
5. Discusses product options, constraints, open questions, and trade-offs directly.

## 2. Ambiguous intent gets one question

**You**: "会员定价页这里看起来不太对，帮我看看。"

If it is unclear whether this is just product feedback or a requested fix, the agent asks:

> 这是先讨论，还是要进入项目交付流程？

Until you confirm delivery, the agent does not load lane artifacts or start debug / plan / verification routing.

## 3. You explicitly enter delivery

**You**: "现在进入实现，按刚才讨论的方案改。"

Now the request is delivery-affecting work. The agent activates AI-OS governance:

1. Reads L1 recovery metadata.
2. Updates or confirms lane `MISSION.md` / `DESIGN.md` as needed.
3. Writes a scoped task or CR before code changes when the baseline changes.
4. Implements only after the confirmed scope is clear.
5. Verifies with project-native evidence before claiming delivery.

## What the agent never did

- Treated every repo-local conversation as a delivery task.
- Read or wrote lane artifacts during ordinary discussion.
- Converted brainstorming into MISSION / DESIGN / tasks without user confirmation.
- Entered debug / plan / verification routing before delivery intent was clear.
