# CLI（vNext）

## 常用命令

```bash
create-ai-os .
create-ai-os doctor .
create-ai-os validate .
create-ai-os status .
create-ai-os next .
create-ai-os resume .
create-ai-os release-check .
create-ai-os lab /tmp/ai-os-labs
```

## 最重要的 4 个命令

- `doctor`：看框架和核心工件是否齐
- `validate`：看 Mission / Design / Spec / Tasks / Acceptance / State 是否完整，并对新旧结构给出 fail / warning
- `resume`：导出最小阅读集
- `release-check`：看当前交付是否具备发布条件，并在 `high-risk` 档强查授权 / 并发 / degraded-path 证据

## Lab 命令

- `lab`：批量创建 `greenfield`、`reverse-spec`、`brownfield`、`debug`、`high-risk`、`degraded-path` 场景沙盒
- 自动执行 `doctor` / `validate` / `status` / `next`
- 在目标目录生成 `lab-report.md`，方便只在需要人工验收或审批时再介入
