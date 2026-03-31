---
name: task-orchestrator
description: >
  当 spec 已可进入 build、需要在 /plan 阶段拆任务时，使用本 Skill 把 Mission / Design / Spec 收敛为可执行任务波次和角色分工。
  P0 任务要求步骤级粒度：精确文件路径、完整代码和验证命令。
---

# 任务编排器

## 使用时机

- 设计和逻辑已经足够明确
- 准备进入 build
- 需要按 wave 和 execution_role 组织任务

## 使用方式

P0 任务的计划，假设执行者是一个**有开发能力但没有项目上下文、没有设计品味、对测试缺乏主动性**的人。因此计划必须把所有决策和细节前置到计划中，不留给执行阶段判断。

### 必做步骤

1. 读取 `MISSION.md`、`DESIGN.md`、specs 和 `STATE.md`
2. 把任务拆成可独立验证的单元
3. 为每个任务指定：
   - `wave`
   - `execution_role`
   - `approval_required`
   - `context_files`
   - `impact_tags`
   - `derived_checks`
   - `risk_triggers`
   - `evidence_required`
   - `parity_evidence_required`（reverse-spec 适用）
4. 根据 spec 中的 `集成触点`、`交互模式` 和共享基础设施约定，派生 `context_files`、`impact_tags`、`derived_checks`
5. 对照 `../../references/risk-triggers.md`，命中高风险触发时升级 `quality_tier`，并强制补审批和专项审查
6. **P0 任务额外要求：为每个任务写出步骤级执行计划**（见下方"步骤级粒度要求"）
7. 更新 `.ai-os/tasks.yaml`
8. 同步 `.ai-os/STATE.md`

## 步骤级粒度要求（P0 强制 / P1 推荐 / P2 可选）

P0 项目的每个任务必须包含步骤级执行计划。每步 2-5 分钟，严格 TDD 顺序：

### 任务结构模板

```yaml
task_id: "T-003"
name: "用户邮箱验证"
wave: 2
execution_role: implementer
files:
  create:
    - "src/validators/email.ts"
  modify:
    - "src/services/user.ts:45-60"
  test:
    - "tests/validators/email.test.ts"
steps:
  - id: "T-003-01"
    action: "写失败测试"
    detail: |
      在 tests/validators/email.test.ts 中：
      ```typescript
      test('拒绝空邮箱', () => {
        expect(validateEmail('')).toEqual({
          valid: false,
          error: 'Email required'
        });
      });
      ```
    verify: "npm test tests/validators/email.test.ts -- 预期 FAIL: validateEmail is not defined"

  - id: "T-003-02"
    action: "最小实现"
    detail: |
      在 src/validators/email.ts 中：
      ```typescript
      export function validateEmail(email: string) {
        if (!email?.trim()) {
          return { valid: false, error: 'Email required' };
        }
        return { valid: true, error: null };
      }
      ```
    verify: "npm test tests/validators/email.test.ts -- 预期 PASS"

  - id: "T-003-03"
    action: "提交"
    detail: "git add src/validators/email.ts tests/validators/email.test.ts && git commit -m 'feat: add email validation with empty check'"
```

### 关键要求

- **精确文件路径**：不写"在相关文件中"，写 `src/validators/email.ts`
- **完整代码**：不写"加入验证逻辑"，写出完整代码
- **精确命令和预期输出**：不写"运行测试"，写 `npm test tests/xxx.test.ts -- 预期 FAIL: xxx`
- **TDD 顺序**：写测试 → 看失败 → 写实现 → 看通过 → 提交
- **每步 2-5 分钟**：如果一步超过 5 分钟，继续拆分

### P1/P2 的简化

- **P1**：推荐步骤级粒度，但允许合并为"写测试+实现"的组合步骤，仍需精确文件路径
- **P2**：只需任务级描述（当前格式），但仍需 `evidence_required`

## 拆分原则

- 设计未锁定的工作不要和实现任务混在一起
- 逻辑确认前不要把大规模实现放进早期 wave
- review / verify / runtime evidence 必须显式占位
- 跨层联动任务必须把入口、契约、映射、运行态影响拆成可验证项，而不是合并成一句"完成模块开发"
- 若 brownfield / change 任务受 request wrapper、DTO / adapter、中间件、路由鉴权或样式基准影响，必须把这些共享约定纳入 `context_files` 或 `derived_checks`

## 交付输出

- `.ai-os/tasks.yaml`
- 更新后的 `.ai-os/STATE.md`

### 示例：根据集成触点派生任务上下文

- 输入：Mission、Design、带 `集成触点` 和 `交互模式` 的 spec
- 输出：带 `context_files`、`impact_tags`、`derived_checks`、`risk_triggers` 的 tasks
- P0 任务额外输出步骤级执行计划

## 禁止事项

- 禁止把"开发整个模块"写成一个任务
- 禁止不写 execution_role 和 approval_required
- 禁止忽略 spec 中的集成触点，导致 `context_files` 和联动检查缺失
- P0 任务禁止只写描述性步骤（如"加入验证"）而不给出具体代码
- P0 任务禁止不写验证命令和预期输出

## 维护信息

- 来源：`/plan` workflow，借鉴 Superpowers writing-plans 的步骤级粒度
- 更新时间：2026-03-24
- 已知限制：本 Skill 负责任务编排，不替代 spec 校验和验收判断
