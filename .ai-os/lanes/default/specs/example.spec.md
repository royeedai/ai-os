# Current Install And Local Doctor Spec

## 1. 概述与闭环场景

- **目标闭环**：用户安装 AI-OS 后，看到一套默认布局：shared-root + `.ai-os/lanes/default/`，并使用 committed local doctor 做日常 / hook / CI 验证。
- **主要输入**：install 命令、本地 `node .ai-os/bin/ai-os-doctor.js .`、README 和 docs 阅读路径
- **主要输出**：统一布局、统一健康判断、零外部请求的日常验证入口

## 2. 业务规则与交互模式

- **交互模式**：batch
- **核心规则**：当前产品面只有 install + doctor；fresh install 是唯一支持入口；`.ai-os/bin/` 的 local doctor 入版本控制并随 install 刷新。

## 3. 契约基准

- **接口 / 数据模型**：`framework.toml`、`managed-files.tsv`、`.ai-os/bin/VERSION`、`doctor --json`
- **状态流转**：fresh install -> canonical layout -> committed local doctor -> pre-commit / CI / closure evidence

## 4. 边界条件与错误路径

- **空数据**：缺失 session-local `STATE.md` 只报 info
- **权限拒绝**：目标路径不可写或目标为普通文件时 install 失败且不触碰用户文件
- **超时 / 部分失败**：远程 one-time audit 可用，但 daily / hook / CI 不应依赖远程 npx；local doctor 缺失时重新 install 或 install --force

## 5. 验收映射

| REQ | AC | TASK |
|---|---|---|
| REQ-001 | AC-001 | TASK-AI-1101 |
| REQ-002 | AC-002 | TASK-AI-1102 |
| REQ-003 | AC-003 | TASK-AI-1103 |
| REQ-004 | AC-004 | TASK-AI-1102 |
| REQ-005 | AC-005 | TASK-AI-1102 |
