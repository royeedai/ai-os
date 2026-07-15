# Example: Greenfield guided product

Scenario: you have an idea ("I want a photo-sharing app for nature photographers") and nothing else. You want an AI agent to help you turn the idea into a shipped product without skipping design.

## 0. Install

```bash
npx --yes github:royeedai/ai-os#v10.5.1 my-nature-photos
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
   - Core main flow (restated): sign in -> upload photo -> tag season -> publish to gallery -> followers notified
   - Key exception / boundary branches: oversized upload rejected, duplicate post, private-album access denied
   - Explicitly out of scope: stock-photo marketplace, pro workflows
   - Success criteria: first 100 beta users can upload and share within 60 seconds
3. Keeps the installer-created unconfirmed bootstrap record as immutable history; initial alignment is not a change request
4. Restate-and-confirm gate (per AGENTS.md §1): before locking anything, the agent restates its understanding back to you in structured form — "Here's what I understood: **goal** = ship a 60-second upload-and-share loop for hobbyists; **core main flow** = sign in -> upload -> tag season -> publish -> notify followers; **state transitions** = draft -> published -> archived; **key exception paths** = oversized upload, duplicate post, private-album access denied. Confirm or correct before I lock the MISSION."

**You**: "Correct, but archived albums must stay viewable by the owner." → agent updates that exception branch in MISSION.md §2 and re-asks.

**You**: "Confirmed."

The agent now appends the immutable confirmed `BL-20260422-101500-nature-sharing.md` record and points `lane.toml` at it. Later requirement changes use CR records; the first agreement does not.

## 2. Design lock (agent detects design is not yet locked)

Agent rule: key design must be confirmed before broad implementation.

1. Opens `.ai-os/lanes/default/DESIGN.md` and fills in:
   - Information architecture: Home / Gallery / Album / Settings
   - Key screens + key interactions + visual direction
   - Section 6: shared-infrastructure audit (empty — greenfield)
   - Section 9: acceptance criteria mapped to REQ-001 ... REQ-007
2. Restate-and-confirm gate at the design layer (recorded in DESIGN.md §10): before locking, the agent restates the key design back to you — "Here's the design I'm about to lock: **IA** = Home / Gallery / Album / Settings; **core contract** = Photo {id, season, visibility, album_id} with transitions draft -> published -> archived; **key exception paths** = oversized upload rejected, private-album access denied. Confirm or correct."
3. Asks: "Review DESIGN.md, particularly the information architecture and acceptance gates."

**You**: "Change navigation from bottom tabs to top bar." → agent updates, re-asks.

**You**: "Confirmed."

## 3. Planning

1. Agent writes `.ai-os/lanes/default/tasks.yaml` with waves W1 (foundation) → W2 (core features) → W3 (verification)
2. Each task has `owner`, `acceptance_refs`, `evidence_required`
3. Agent asks for task/acceptance confirmation

## 4. Build + verify (evidence-gated)

- Agent implements wave by wave
- For each wave: static check (compile/build) + test run + edge-case coverage
- Final verification (per AGENTS.md verification-phase behavior rule): agent runs project-native static check, reports "code state / data state / runtime state" separately
- ReadLints alone is rejected as evidence

## 5. Ship

After your explicit release intent ("ship it"), the agent creates `.ai-os/lanes/default/release-plan.md`; this release intent is the trigger, not generic high-risk work:

- Implemented: REQ-001...REQ-007
- NOT included: pro workflows (explicitly out-of-scope)
- AI done vs. human needed: "Need you to run `pnpm deploy:prod` after reviewing the production target"
- Rollback conditions

**You**: review + "ship it."

## What the agent NEVER did

- Wrote code before MISSION was confirmed
- Scoped creep into pro workflows (they were out-of-scope)
- Claimed completion without running project-native build
- Treated "UI renders" as "feature works"

This is all enforced by `AGENTS.md` behavior rules — no slash commands, no special harness.
