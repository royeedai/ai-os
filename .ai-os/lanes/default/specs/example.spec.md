# v9 Default Lane Reset Spec

## 1. 概述与闭环场景

- **目标闭环**：用户安装或升级 AI-OS 后，看到且只看到一套默认布局：shared-root + `.ai-os/lanes/default/`
- **主要输入**：install / doctor / upgrade 命令，README 和 docs 阅读路径
- **主要输出**：统一布局、统一健康判断、统一迁移入口

## 2. 业务规则与交互模式

- **交互模式**：batch
- **核心规则**：root-only v8 属于 legacy；v9 canonical layout 必须作为唯一默认布局

## 3. 契约基准

- **接口 / 数据模型**：`framework.toml`、`managed-files.tsv`、`doctor --json`
- **状态流转**：legacy layout -> upgrade -> canonical layout

## 4. 边界条件与错误路径

- **空数据**：缺失 session-local `STATE.md` 只报 info
- **权限拒绝**：无
- **超时 / 部分失败**：upgrade 遇到 hybrid 冲突时保留 lane 真相并追加 legacy 附录

## 5. 验收映射

| REQ | AC | TASK |
|---|---|---|
| REQ-001 | AC-001 | TASK-AI-001 |
| REQ-002 | AC-002 | TASK-AI-002 |
| REQ-003 | AC-003 | TASK-AI-002 |
| REQ-004 | AC-004 | TASK-AI-003 |
