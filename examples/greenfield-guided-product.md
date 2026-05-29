# Example: Greenfield guided product

Scenario: you have an idea ("I want a photo-sharing app for nature photographers") and nothing else. You want an AI agent to help you turn the idea into a shipped product without skipping design.

## 0. Install

```bash
npx --yes github:royeedai/ai-os my-nature-photos
cd my-nature-photos
```

You now have: `AGENTS.md` + shared root `.ai-os/` + `.ai-os/lanes/default/` starter templates.

## 1. Alignment (agent reads AGENTS.md; no slash command needed)

**You**: "Build a photo-sharing app for nature photographers."

**Agent behavior (per AGENTS.md behavior rules — new project / module / ambiguous requirement)**:

1. Doesn't write code
2. Establishes shared host-project context in root `.ai-os/MISSION.md` (who the project serves, long-term boundaries), then fills in the current-delivery baseline in `.ai-os/lanes/default/MISSION.md`:
   - Target user: hobbyist nature photographers
   - Key scenario: weekly photo posts + seasonal albums + lightweight community
   - Explicitly out of scope: stock-photo marketplace, pro workflows
   - Success criteria: first 100 beta users can upload and share within 60 seconds
3. Writes `.ai-os/lanes/default/baseline-log/CR-20260422-101500-initial-alignment.md` capturing what it asked vs. what you answered
4. Stops. Asks: "Confirm this lane MISSION.md reflects your intent? (Reply 'confirmed' to proceed.)"

**You**: "Confirmed."

## 2. Design lock (agent detects design is not yet locked)

Agent rule: key design must be confirmed before broad implementation.

1. Opens `.ai-os/lanes/default/DESIGN.md` and fills in:
   - Information architecture: Home / Gallery / Album / Settings
   - Key screens + key interactions + visual direction
   - Section 6: shared-infrastructure audit (empty — greenfield)
   - Section 8: acceptance criteria mapped to REQ-001 ... REQ-007
2. Asks: "Review DESIGN.md, particularly the information architecture and acceptance gates."

**You**: "Change navigation from bottom tabs to top bar." → agent updates, re-asks.

**You**: "Confirmed."

## 3. Planning

1. Agent writes `.ai-os/lanes/default/tasks.yaml` with waves W1 (foundation) → W2 (core features) → W3 (verification)
2. Each task has `owner`, `acceptance_refs`, `evidence_required`, `fact_state_review`
3. Agent asks for task/acceptance confirmation

## 4. Build + verify (evidence-gated)

- Agent implements wave by wave
- For each wave: static check (compile/build) + test run + edge-case coverage
- Final verification (per AGENTS.md verification-phase behavior rule): agent runs project-native static check, reports "code state / data state / runtime state" separately
- ReadLints alone is rejected as evidence

## 5. Ship

Agent produces `.ai-os/lanes/default/release-plan.md`:

- Implemented: REQ-001...REQ-007
- NOT included: pro workflows (explicitly out-of-scope)
- AI done vs. human needed: "Need you to run `pnpm deploy:prod` and create Stripe webhook"
- Rollback conditions

**You**: review + "ship it."

## What the agent NEVER did

- Wrote code before MISSION was confirmed
- Scoped creep into pro workflows (they were out-of-scope)
- Claimed completion without running project-native build
- Treated "UI renders" as "feature works"

This is all enforced by `AGENTS.md` behavior rules — no slash commands, no special harness.
