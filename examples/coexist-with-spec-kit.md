# Example: Coexist with GitHub Spec-Kit

Scenario: your team uses GitHub Spec-Kit (`/speckit.*`) for 0→1 kickoff. After implementation lands, you want AI-OS governance for verification, change management, debug, and recovery.

See full coexistence rules: [../docs/interop/spec-kit-coexistence.md](../docs/interop/spec-kit-coexistence.md).

## 1. Phase A: Spec-Kit leads (0→1)

Team runs Spec-Kit as usual:

```bash
specify init
# In agent: /speckit.constitution
# In agent: /speckit.specify "Photo sharing app for nature photographers"
# In agent: /speckit.plan
# In agent: /speckit.tasks
# In agent: /speckit.implement
```

Spec-Kit produces:

```
.specify/
  memory/constitution.md
  specs/001-photo-app/
    spec.md
    plan.md
    tasks.md
```

Code lands. Feature is functionally complete. Now you want quality governance.

## 2. Phase B: Install AI-OS alongside

```bash
npx --yes github:royeedai/ai-os#v10.3.0 .
```

Result: `AGENTS.md` at root + shared root `.ai-os/` + `.ai-os/lanes/default/` starter templates.

## 3. Connect AI-OS MISSION to Spec-Kit spec

Edit `.ai-os/lanes/default/MISSION.md`:

```markdown
# Mission: Photo Sharing App

## 1. Delivery baseline summary

- Requirement source-of-truth: `.specify/specs/001-photo-app/spec.md`
  (Spec-Kit, confirmed 2026-04-15; further requirement changes go through AI-OS `baseline-log/CR-*.md`)
- Current delivery focus: REQ-001 ~ REQ-007 (already implemented)
- Current phase: verify → ship (post-implementation governance)
- Project mode: brownfield (we are adding governance to already-implemented code)

## 5. Stable risks

- Spec-Kit constitution: `.specify/memory/constitution.md`
- Rule: subsequent requirement changes go through `baseline-log/CR-*.md`;
  do NOT reopen `/speckit.specify` (would produce a parallel truth source).
```

## 4. AI-OS handles verification (evidence-gated)

**You**: "Is it ready to ship?"

AI agent (reading AGENTS.md):

1. Loads `.specify/specs/001-photo-app/spec.md` as the requirement source
2. Runs project-native static check (`pnpm build`, `pnpm test`)
3. Cross-references every REQ in spec.md against actual implementation
4. Runs edge-case verification (empty photos, network failure, permission denied, large uploads)
5. Writes `.ai-os/lanes/default/verification-matrix.yaml` with real `failure_modes`
6. Reports: code state / data state / runtime state separately
7. Produces `.ai-os/lanes/default/release-plan.md` with rollback conditions

## 5. AI-OS handles change management

Two weeks later, product says "Add photo tagging."

**You** to agent: "Add photo tagging to the app."

Agent (per AGENTS.md change-request rule):

1. Does NOT call `/speckit.specify` (that would create a parallel truth source)
2. Writes `.ai-os/lanes/default/baseline-log/CR-20260506-093000-photo-tagging.md` with:
   - Impact analysis on existing spec
   - New REQ-008 in `.ai-os/lanes/default/specs/photo-tagging.spec.md`
   - Reference back to Spec-Kit spec.md for original requirements
3. Waits for your confirmation on the new baseline

## 6. AI-OS handles cross-session recovery

Next day, different agent, fresh session.

Agent opens the repo, reads:

1. `AGENTS.md` — constitution
2. `.ai-os/lanes/default/STATE.md` — where things left off yesterday
3. `.ai-os/lanes/default/MISSION.md` — references Spec-Kit spec as requirement truth
4. `.ai-os/lanes/default/baseline-log/` latest file — the CR from yesterday

Agent knows: "Spec-Kit owns original requirements. AI-OS owns verification, change management, and delivery. New request for photo tagging is at CR-20260506 baseline." No confusion about which artifact to trust.

## 7. What each tool is responsible for

| Tool | Owns |
|---|---|
| Spec-Kit | Original requirements (`spec.md`), original plan, original tasks, constitution |
| AI-OS | Change requests (`baseline-log/`), verification (`verification-matrix.yaml`), delivery (`release-plan.md`), cross-session recovery (`STATE.md`), stable memory (`memory.md`) |
| AI agent | Reads both; follows `AGENTS.md` for routing |

## Anti-pattern (do not do this)

Running both `/speckit.specify` and AI-OS `baseline-log/CR-*.md` for the same requirement change. You will end up with two drifting truth sources. Pick one.
