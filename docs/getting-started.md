# Getting Started

## 1. Install

```bash
npx --yes github:royeedai/ai-os .
```

This creates:

- `AGENTS.md`
- shared root `.ai-os/MISSION.md` and `.ai-os/memory.md`
- `.ai-os/lanes/default/` with the current delivery artifacts

## 2. First read order

1. `AGENTS.md`
2. Activation Gate: decide whether the request is delivery-affecting work
3. For ordinary conversation, answer directly without reading or writing lane artifacts
4. For delivery-affecting work, read `.ai-os/lanes/default/STATE.md`
5. Then read `.ai-os/lanes/default/MISSION.md`, `.ai-os/MISSION.md`, and `.ai-os/lanes/default/DESIGN.md` as needed

## 3. Recovery order

When resuming work:

1. `.ai-os/lanes/default/STATE.md`
2. `.ai-os/lanes/default/MISSION.md`
3. latest `.ai-os/lanes/default/baseline-log/*.md`
4. `.ai-os/MISSION.md`

## 4. Governance split

- root mission: shared host-project context
- lane mission: current delivery baseline
- root memory: shared stable decisions
- lane state: current session recovery

## 5. Health check

```bash
npx --yes github:royeedai/ai-os doctor .
```
