# 从旧 AI-OS 布局迁移到 v9

AI-OS v9 的 canonical layout 是：

- 根层共享：`.ai-os/MISSION.md`、`.ai-os/memory.md`
- 当前交付：`.ai-os/lanes/default/*`

## 迁移命令

```bash
npx --yes github:royeedai/ai-os upgrade .
```

## 支持的输入布局

- v7 legacy
- v8 root-only
- v8 hybrid root+lane drift

## 迁移结果

所有旧布局都会被统一到：

```text
.ai-os/
  MISSION.md
  memory.md
  framework.toml
  managed-files.tsv
  lanes/
    default/
      lane.toml
      MISSION.md
      DESIGN.md
      STATE.md
      baseline-log/
      specs/
      tasks.yaml
      risk-register.md
      release-plan.md
      verification-matrix.yaml
      design-pack/
      evals/
```

## 特别说明

- root-only v8 不再是 v9 健康布局
- hybrid root+lane 会被视为 drift，并由 upgrade 规范化
- root `memory.md` 会保留为共享记忆真相源
- legacy `CONVENTIONS.md`、`project.md`、`acceptance.yaml` 会被迁移吸收到 v9 对应工件
