# Parity Map

## 原始参考清单

- 当前仓库中的 v8 layout、AGENTS、README、docs、CLI、tests

## 字段级对照

| 原始布局 | v9 canonical layout | 差异 | 结论 |
|---|---|---|---|
| root-only `.ai-os/MISSION.md` | root shared `.ai-os/MISSION.md` + lane `.ai-os/lanes/default/MISSION.md` | 共享上下文与当前交付语义拆分 | accepted |
