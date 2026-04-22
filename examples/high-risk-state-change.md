# Example: High-risk state change

Scenario: you need to migrate user accounts from a legacy auth system to a new identity provider. This is irreversible and touches user assets.

## 1. Request

**You**: "We're switching from our legacy auth to Auth0. Migrate all 50k users."

## 2. Agent detects high-risk (per AGENTS.md §4 + absolute rule #11)

Hard triggers:

- User assets (account identities)
- Permission / identity change
- Irreversible state transition
- Cross-user data operation

Agent automatically escalates governance to **high-risk tier**:

1. In `.ai-os/tasks.yaml`, every task has `approval_required: true`
2. `.ai-os/risk-register.md` becomes mandatory
3. `.ai-os/release-plan.md` becomes mandatory
4. `.ai-os/verification-matrix.yaml` must include at least one real `failure_modes` guard
5. No auto-advance

## 3. Mission + risk register

Agent writes (and waits for your confirmation):

**MISSION §5 (stable risks)**:

- Failure to migrate = users locked out of accounts
- Partial migration = some users in old system, some in new → split brain
- Migration data leak = PII breach

**risk-register.md**:

| ID | Risk | Impact | Mitigation | Approval |
|---|---|---|---|---|
| R-001 | User locked out mid-migration | High | Feature flag + dual-auth window | CTO |
| R-002 | Split-brain (some users in old, some new) | High | Atomic per-user cutover with DB transaction | CTO |
| R-003 | PII leak during export | Critical | Encrypted transfer + audit log | Security Lead |

Agent stops and asks: "All three approvers needed before we plan implementation. Waiting for confirmation."

## 4. Release plan (before code)

`.ai-os/release-plan.md`:

1. Phase 1: Dual-auth window (both systems active, reads from old, writes to both)
2. Phase 2: Migration batch (1k users / hour with verification after each batch)
3. Phase 3: Cutover (reads from new, writes to new)
4. Phase 4: Legacy decommission (only after 30-day stability)

**Rollback conditions**:

- >0.5% migration failures → pause and investigate
- Any PII anomaly → immediate rollback + security review

Agent lists exactly which steps are "AI done" (writing migration code, writing tests) vs. "human needed" (running batch in production, approving each phase).

## 5. Verification matrix with real failure-mode guard

`.ai-os/verification-matrix.yaml`:

```yaml
failure_modes:
  - id: per-user-migration-partial
    trigger: "User migration fails halfway (old system deleted, new system insert failed)"
    guards:
      - "Migration runs in DB transaction; rollback on any error"
      - "Post-batch verification: diff old vs. new for every migrated user"
      - "Escalation: pause if failure rate > 0.5%"
  - id: pii-leak-during-export
    trigger: "Encrypted export channel drops encryption"
    guards:
      - "TLS + at-rest encryption checked before each batch"
      - "Audit log captures every export; security review post-migration"
```

## 6. Build (wave by wave)

Each wave requires explicit user approval before execution. Agent:

- Wave 1: dual-auth middleware (AI does, human reviews)
- Wave 2: migration script (AI does, security lead reviews)
- Wave 3: verification harness (AI does)
- Wave 4: rollback procedure (AI does, runs dry-run, human approves)

## 7. Execute (human-driven, AI-supported)

AI doesn't run the migration. AI prepares:

- Pre-flight checklist
- Per-batch commands to run
- Post-batch verification commands
- Monitoring dashboards to watch

Human runs each batch. Between batches, AI analyzes the run's logs and flags anomalies.

## 8. Delivery handoff

`.ai-os/release-plan.md` final delivery split:

- **AI completed**: migration code, test harness, rollback script, verification dashboard
- **Human required**: executed each batch, reviewed each verification pass, signed off after 30 days
- **Still pending**: legacy system decommission (after 30-day stability window)

## What the agent NEVER did

- Wrote migration code before risk register was signed off
- Claimed completion until all 4 phases passed real verification
- Treated code-state as full state (explicitly split code/data/runtime)
- Allowed auto-advance between phases (each phase required human approval)

This is the entire high-risk flow with no slash commands and no special workflow. `AGENTS.md` absolute rule #11 triggers it; the 12 artifacts carry the evidence.
