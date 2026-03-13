---
description: 新模块开发完整流程（从需求到交付的闭环）
---

# 新模块开发流程

当用户说"开发一个新模块"、"加个XXX功能"、"做一个XXX页面"时触发此流程。

## 阶段零：需求澄清（Discuss）

> 在写 spec 之前，先理解用户到底想要什么。跳过本阶段可能导致 spec 大幅返工。
> **条件入口**：如果从 `/clone-project` 阶段三进入，spec 已在复刻流程中完成，**跳过阶段零和阶段一**，直接进入阶段二。

1. 分析用户需求所属的模块类型（页面类 / API 类 / 数据处理类 / 工具类）
2. 根据模块类型，向用户提出结构化的澄清问题：
   - **页面类**：布局风格、信息密度、交互偏好（弹窗 vs 跳转）、空状态处理、移动端适配需求
   - **API 类**：响应格式偏好、错误策略（统一码 vs HTTP 码）、版本策略、限流需求
   - **数据处理类**：数据源、执行频率、容错策略、输出格式与目标
   - **工具类**：命令风格、输出格式、配置方式、安装体验
3. 将用户回答整理为 `.ai-os-project/specs/[模块名].context.md`，包含：
   - 用户明确表达的偏好（标记为 `[用户决定]`）
   - AI 推荐的默认选择（标记为 `[AI 默认]`，附理由）
   - 仍然存在的开放问题（标记为 `[待确认]`）
4. 若用户说"你来决定"或"按你觉得好的来" → 记录 AI 的默认选择和理由，全部标记为 `[AI 默认]`
5. 后续 spec 编写和任务拆解**必须引用 context 中的决策**

> **跳过条件**：如果用户提供的需求已经非常具体（明确了交互方式、数据结构、技术选型），可以跳过本阶段，但需在 spec 中标注"需求来源：用户直接定义"。

## 阶段一：需求定义

1. 在 `.ai-os-project/specs/` 目录下创建 `[模块名].spec.md`，使用 `.agents/templates/project/specs/example.spec.md` 作为项目内参考模板
2. spec 编写时**必须引用** `.ai-os-project/specs/[模块名].context.md` 中的决策（若存在）
3. 调用 `spec-validator` 验证 spec 完整性（8 个章节 + 5 类常见遗漏）
4. 使用 `task-orchestrator` 基于 spec 生成 `tasks.yaml` 中的任务拆解、依赖、DoR/DoD、Evidence Pack
5. 基于 `.ai-os-project/verification-matrix.yaml` 为当前模块声明 `affected_components`、`verification_required`、`restart_required`、`cold_start_required`
6. 使用 `acceptance-gate` 为当前模块生成或更新验收条件，确认本模块"如何算完成"
7. 将 spec 和任务拆解展示给用户确认，**用户确认前不进入下一阶段**

> **门禁检查点**：进入阶段二前，必须同时具备：① 经 `spec-validator` 验证的 `.spec.md`；② `.ai-os-project/tasks.yaml` 中的任务拆解；③ `.ai-os-project/acceptance.yaml` 中的验收条件。三者缺一不可。

## 阶段二：技术设计

8. 按 `database-schema-design` 设计数据库表结构
9. 按 `api-design` 设计 RESTful API 接口规范
10. 检查 `fullstack-dev-checklist` 维度零的项目脚手架完整性
11. 若当前模块超出既有项目边界或引入新子系统，回退触发 `project-planner` 更新项目章程与范围

## 阶段三：编码实现

12. 按 `.ai-os-project/tasks.yaml` 中的 wave 顺序执行任务（同一 wave 内可并行）
13. 每个任务执行前，先读取 `.ai-os-project/STATE.md` 恢复方位，再读取任务的 `context_files`
14. 后端开发：Model → Repository → Service → Handler
15. 前端开发：页面组件 → API 封装 → 路由注册 → 导航菜单
16. 核心逻辑处加溯源注释：`// 对应 .spec: FR-XXX`
17. 每完成一个子模块执行编译验证，命中 `verification_required` / `restart_required` / `cold_start_required` 时同步执行对应动作
18. 任务状态同步回写到 `.ai-os-project/tasks.yaml` 和 `.ai-os-project/STATE.md`，不得只在聊天里口头更新
19. 按 `git-workflow` 规范提交代码

## 阶段四：测试

20. 按 `testing-strategies` 编写核心路径的测试用例
21. 执行测试用例并确认全部通过
22. 准备 Evidence Pack：构建结果、测试结果、关键接口样例、截图、迁移说明、restart-log、cold-start-log、post-restart-smoke-log

## 阶段五：审查与交付

23. 调用 `code-review-guard` 执行完整结构化自审，**向用户输出验收报告**（含 UAT 脚本）
24. 调用 `acceptance-gate` 检查当前模块是否满足 DoD 和 Evidence Pack
25. 若涉及敏感操作（金额/权限/删除），追加调用 `security-guard`
26. 若架构复杂，追加调用 `architecture-reviewer`
27. 修复所有必须项后，更新 `.ai-os-project/tasks.yaml` / `.ai-os-project/acceptance.yaml` / `.ai-os-project/STATE.md`，再标记模块为已完成

## 阶段六：重规划检查（Reassess）

> 在进入下一个模块前，评估本模块开发中发现的新信息。

28. 回顾本模块开发中发现的新信息：技术约束变化、接口契约偏差、工作量估算偏差、新增/已消除的风险
29. 评估这些新信息是否影响后续模块的计划
30. 若影响显著 → 触发 `change-impact-analyzer`，更新 `.ai-os-project/tasks.yaml`、`.ai-os-project/project-charter.md`、`.ai-os-project/risk-register.md`、`.ai-os-project/verification-matrix.yaml`
31. 若无影响 → 记录到 `.ai-os-project/STATE.md` 的"最近决策"中，继续推进
32. 更新 `.ai-os-project/risk-register.md`（新增/关闭风险项）
