# Background Agent Handoff

This example shows how AI-OS handles a long-running background or cloud agent without becoming the execution layer.

## 1. User Delegates Work

User:

> Send the W078 doctor check to a background agent and bring it back for review.

Agent:

- Confirms this is delivery-affecting work, so AI-OS governance is active.
- Updates the current lane task before delegation.
- Does not create a new AI-OS command, runner, hook, or cloud task service.

Task excerpt:

```yaml
tasks:
  - id: TASK-AI-960
    title: "Implement W078 long-horizon review"
    status: in_progress
    owner: AI
    acceptance_refs:
      - "AC-001"
    handoff_to: "Codex cloud task"
    context_refs:
      - ".ai-os/lanes/default/MISSION.md"
      - ".ai-os/lanes/default/DESIGN.md"
      - "bin/ai-os-doctor.js"
      - "test/doctor.test.js"
    expected_return:
      - "diff"
      - "test log"
      - "unresolved risks"
    evidence_required:
      - "npm test"
      - "npm run lint"
    agent_run_review:
      execution_surface: "cloud_background"
      run_refs:
        - "branch: codex/w078-long-horizon-review"
        - "agent_session_id: run-123"
      write_scope:
        owned:
          - "bin/ai-os-doctor.js"
          - "test/doctor.test.js"
        out_of_scope:
          - "README.md"
          - "docs/constitution-spec.md"
      progress_checkpoints:
        - "plan accepted"
        - "diff produced"
        - "tests run"
        - "review requested"
      return_packet:
        summary: ""
        changed_files: []
        tests: []
        unresolved_risks: []
        follow_up_needed: []
      human_review_status: "pending"
```

## 2. Background Work Returns

The background agent returns a diff and test log.

Agent:

- Checks branch / PR / session refs against `run_refs`.
- Compares changed files to `write_scope`.
- Reviews tests and unresolved risks.
- Records the returned evidence before closing the task.

```yaml
agent_run_review:
  execution_surface: "cloud_background"
  run_refs:
    - "branch: codex/w078-long-horizon-review"
    - "agent_session_id: run-123"
  write_scope:
    owned:
      - "bin/ai-os-doctor.js"
      - "test/doctor.test.js"
    out_of_scope:
      - "README.md"
      - "docs/constitution-spec.md"
  progress_checkpoints:
    - "plan accepted"
    - "diff produced"
    - "tests run"
    - "review requested"
  return_packet:
    summary: "W078 added and doctor tests pass"
    changed_files:
      - "bin/ai-os-doctor.js"
      - "test/doctor.test.js"
    tests:
      - "npm test"
    unresolved_risks: []
    follow_up_needed: []
  human_review_status: "reviewed"
evidence_produced:
  - "npm test: passed"
```

## 3. Closure Rule

The task can close only when:

- `run_refs` can still locate the returned work
- `write_scope` matches the actual diff
- `return_packet.tests` and `evidence_produced` include native project checks
- `human_review_status` is `reviewed` or `accepted`
- `unresolved_risks` is empty

If any item is missing, doctor --strict emits W078 and the task remains open.
