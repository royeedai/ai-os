# Long-Horizon Agents

AI coding tools are moving toward long-running, background, parallel, and PR-based execution. AI-OS does not compete with those execution surfaces. It keeps the project contract clear before delegation, preserves run traceability while work is away, and requires reviewable evidence before the returned work is accepted.

## Execution Surfaces

| Surface | AI-OS view | Record in `agent_run_review` |
|---|---|---|
| Codex local foreground | local agent work in the current repo | `execution_surface: local_foreground` when no background review is needed |
| Codex cloud / parallel task | background task that can return a diff or PR | `execution_surface: cloud_background`, plus branch / PR / session refs |
| Cursor Background Agents | IDE-managed background branch or task | `execution_surface: cloud_background`, plus branch / task URL |
| GitHub Copilot cloud agent | issue / PR based external agent | `execution_surface: external_pr_agent`, plus issue / PR refs |
| Google Jules | asynchronous coding task returned for review | `execution_surface: cloud_background`, plus task URL / branch / PR refs |
| Claude Code subagents / hooks | delegated local or automated execution surface | `execution_surface: local_foreground` for local helper work, or `cloud_background` / `external_pr_agent` if work leaves the foreground repo |

Vendor names are examples only. AI-OS does not depend on their APIs, CLIs, MCP servers, webhooks, branch names, or task lifecycles.

## Before Delegation

Update the task before sending work away:

```yaml
agent_run_review:
  execution_surface: "cloud_background"
  run_refs:
    - "branch: codex/long-horizon-review"
    - "external_task_url: https://example.invalid/task/123"
  write_scope:
    owned:
      - "bin/ai-os-doctor.js"
      - "test/doctor.test.js"
    out_of_scope:
      - "docs/cli.md"
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

Also keep the existing handoff loop fields:

- `handoff_to`
- `context_refs`
- `expected_return`
- `evidence_required`
- `deviation_log`

## While Work Is Away

Keep progress small and factual. A checkpoint can be a branch link, PR link, test log, blocker note, or review request. Do not turn a background run into a second source of truth; the current lane still owns the delivery baseline.

If another agent starts in parallel, compare `write_scope.owned` and `write_scope.out_of_scope` before accepting either diff.

## On Return

Before marking the task `done`, `verified`, or `shipped`, fill the return packet:

```yaml
agent_run_review:
  return_packet:
    summary: "W078 implemented and tested"
    changed_files:
      - "bin/ai-os-doctor.js"
      - "test/doctor.test.js"
    tests:
      - "npm test"
      - "npm run lint"
    unresolved_risks: []
    follow_up_needed: []
  human_review_status: "reviewed"
evidence_produced:
  - "npm test: passed"
  - "npm run lint: passed"
```

If `unresolved_risks` is non-empty, the task cannot be closed as done / verified / shipped. Move the risk into `deviation_log`, a new `CR-*`, or a pending follow-up task.

## W078 Checks

`doctor --strict` emits W078 only for tasks that explicitly declare background, cloud, external, delegated, or parallel execution. It does not warn for normal foreground tasks or pure human review tasks.

W078 catches:

- missing `run_refs`
- missing `write_scope`
- missing `expected_return`
- closed task without `evidence_produced`
- closed task without `return_packet`
- closed task without reviewed / accepted `human_review_status`
- closed task with unresolved risks in the return packet

## Product Boundary

This document does not add a CLI command, flag, install profile, runtime runner, MCP server, IDE hook, agent router, worktree manager, or cloud task scheduler. It is a tool-neutral governance contract for accepting work from whatever execution surface the team already uses.
