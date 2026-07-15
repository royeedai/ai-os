# Getting Started

## 1. Install

```bash
npx --yes github:royeedai/ai-os#v10.5.1 .
```

Pinning a release tag keeps installs reproducible and cache-friendly. This is the only step that needs the network.

This creates:

- `AGENTS.md`
- shared root `.ai-os/MISSION.md` and `.ai-os/memory.md`
- `.ai-os/lanes/default/` with the core delivery artifacts (`lane.toml`, `MISSION.md`, `DESIGN.md`, `STATE.md`, `baseline-log/`, `tasks.yaml`)

Extension artifacts (risk-register, release-plan, verification-matrix, specs, design-pack, evals) are created on demand by the agent — see `docs/artifacts.md`.

## 2. First read order

1. `AGENTS.md`
2. Activation Gate: decide whether the request is delivery-affecting work
3. For ordinary conversation, answer directly without reading or writing lane artifacts
4. For delivery-affecting work, select `{laneId}` and read its lane.toml plus optional STATE
5. Then read `.ai-os/lanes/{laneId}/MISSION.md`, `.ai-os/MISSION.md`, and `.ai-os/lanes/{laneId}/DESIGN.md` as needed

## 3. Recovery order

When resuming work:

1. `.ai-os/lanes/{laneId}/lane.toml` and optional STATE
2. `.ai-os/lanes/{laneId}/MISSION.md`
3. latest `.ai-os/lanes/{laneId}/baseline-log/*.md`
4. `.ai-os/MISSION.md`

`STATE.md` is rebuildable navigation; it never overrides committed truth.

## 4. Governance split

- root mission: shared host-project context
- lane mission: current delivery baseline
- root memory: shared stable decisions
- lane state: current session recovery

## 5. Health check

Install vendors the doctor into `.ai-os/bin/` (committed), so the daily check runs locally with **zero external request**:

```bash
node .ai-os/bin/ai-os-doctor.js .
```

To audit a repo you have not installed into yet, a one-time remote run still works: `npx --yes github:royeedai/ai-os#v10.5.1 doctor .`
