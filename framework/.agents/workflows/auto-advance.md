---
name: auto-advance
description: 自动推进模式（在用户授权后按 tasks.yaml 依赖图和 wave 顺序自动执行）
---

# 自动推进流程

当用户说"自动往下做"、"按任务图继续"、"auto"、"帮我把剩下的做完"时触发此模式。

## 何时使用

- `tasks.yaml` 已经确认，且任务依赖关系清晰
- 用户明确授权连续推进，而不是只做一步
- 项目需要按 wave 批次自动执行和周期性自检

## 不该使用

- `.ai-os/tasks.yaml`、`.ai-os/acceptance.yaml`、`.ai-os/STATE.md` 任一缺失
- 当前阶段仍在需求澄清或 spec 未确认
- 任务包含高风险写操作且尚未拿到人工确认

## 会生成或更新什么

- `.ai-os/tasks.yaml`：推进任务状态、补充证据
- `.ai-os/verification-matrix.yaml`：作为变更感知验证的基线输入
- `.ai-os/STATE.md`：同步当前位置、最近决策、下一步
- 代码与测试文件：完成实现、编译与回归验证
- 模块完成后触发 `/review` 与 `acceptance-gate`

## 前提条件

以下条件**全部满足**才可进入自动推进：

- `.ai-os/tasks.yaml` 已定义且经用户确认
- `.ai-os/acceptance.yaml` 已定义
- `.ai-os/STATE.md` 存在且当前位置清晰
- 用户**明确授权**自动推进（不可自行假设）

## 执行循环

按 `.ai-os/tasks.yaml` 中的 wave 顺序，对每个 `status: todo` 且 `depends_on` 全部完成的任务：

1. **前置检查**：
   - 读取 `.ai-os/STATE.md` 确认全局方位
   - 检查该任务的 Definition of Ready 是否满足
   - 读取该任务的 `context_files`
   - 读取 `.ai-os/memory.md` 获取长期约束
   - 读取 `.ai-os/verification-matrix.yaml`，确认当前任务的 `verification_required`
2. **执行任务**：
   - 编码实现
   - 编译验证
   - 若任务声明了 `verification_required` / `restart_required` / `cold_start_required`，执行对应动作并记录证据
   - 核心逻辑处加溯源注释 `// 对应 .spec: FR-XXX`
3. **后置更新**：
   - 更新 `.ai-os/tasks.yaml` 状态和证据
   - 更新 `.ai-os/STATE.md` 的当前位置和进度
   - 按 `git-workflow` 规范提交代码
4. **同 wave 并行**：同一 wave 内的任务可使用 subagent/Task 工具并行执行

### 自检关卡

每完成 **3 个任务**（或每个 wave 完成后），暂停做一次小型自审：

- [ ] 项目级编译是否通过
- [ ] 命中 `verification_required` 的任务是否完成了 restart / cold-start smoke
- [ ] 已完成任务是否存在回归（特别是共享代码变更时）
- [ ] 实现是否偏离 spec
- [ ] 是否有新发现需要记录到 `.ai-os/STATE.md` 或 `.ai-os/memory.md`

自检通过 → 继续下一个就绪任务。
自检发现问题 → 立即停止自动推进，向用户报告。

## 暂停条件

遇到以下任一情况，**立即暂停**自动推进并通知用户：

| 条件 | 处理 |
|------|------|
| 任务 `risk: high` | 暂停，请求用户确认后继续 |
| 遇到 blocker | 暂停，报告阻塞原因和建议 |
| 自检发现回归 | 暂停，报告回归内容 |
| 缺少 restart / cold-start 证据 | 暂停，报告缺失动作 |
| 任务执行失败（编译不过 / 测试失败） | 暂停，报告失败原因 |
| 当前模块所有任务完成 | 暂停，触发 `/review` |
| 当前里程碑所有任务完成 | 暂停，触发 `acceptance-gate` |
| 用户随时说"停" | 立即暂停 |

## 模块完成后

当一个模块的所有任务完成后：

1. 自动触发 `code-review-guard` 输出验收报告（含 UAT 脚本）
2. 自动触发 `acceptance-gate` 检查 DoD 和 Evidence Pack
3. 暂停自动推进，等待用户确认验收结果
4. 用户确认后，进入下一个模块（若有）或触发重规划检查

## 恢复机制

如果自动推进因任何原因中断（暂停、异常、session 超时）：

1. 确认 `.ai-os/STATE.md` 记录了最后完成的任务
2. 确认 `.ai-os/tasks.yaml` 中已完成任务的状态已更新
3. 用户再次说"继续"或"auto"时，从 `.ai-os/STATE.md` 恢复位置继续
