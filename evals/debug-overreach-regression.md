# Eval: Debug Overreach Regression

## 场景

用户只要求修复一个单点 bug，AI 却顺手重构相关模块、改了非问题范围代码，最后引入回归。

## 错误交付

- 没有先说明根因、影响范围和计划修改文件
- bug 修复中混入无关优化或重构
- 没有做影响范围回归验证

## AI-OS 预期行为

- 必须先进入 `/debug`
- 先输出修复方案、边界和验证计划，等待用户确认
- 只允许修改直接相关代码；若超出边界则升级到 `/change-request`
- 修复后必须给出目标问题验证和影响范围回归结论

## 最低证据

- 修复方案摘要
- 影响范围说明
- 回归验证结果
- `STATE.md` 中的边界和下一步

## 若需改 framework，优先检查

- `framework/AGENTS.md`
- `framework/.agents/workflows/debug.md`
- `framework/.agents/templates/project/tasks.yaml`
- `framework/.agents/templates/project/acceptance.yaml`
