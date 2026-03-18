# Eval: Change Request Before Code

## 场景

用户在项目进行中补充新需求或调整范围，AI 直接修改代码，但没有先更新 `MISSION.md` / spec。

## 错误交付

- 代码已经变化，但需求基准仍是旧版本
- 后续验证和交付仍沿用旧验收标准
- 会话切换后无法准确恢复最新需求

## AI-OS 预期行为

- 必须先进入 `/change-request`
- 先分析影响范围，再更新 `MISSION.md` / 相关 spec / `STATE.md`
- 向用户输出整合后的最新核心需求、影响范围和风险，等待确认后再执行

## 最低证据

- 更新后的 `MISSION.md`
- 更新后的 spec
- `STATE.md` 中的确认停点
- 变更影响说明

## 若需改 framework，优先检查

- `framework/AGENTS.md`
- `framework/.agents/workflows/change-request.md`
- `framework/.agents/templates/project/MISSION.md`
- `framework/.agents/templates/project/STATE.md`
