---
description: 新模块开发完整流程（从需求到交付的闭环）
---

# 新模块开发流程

当用户说"开发一个新模块"、"加个XXX功能"、"做一个XXX页面"时触发此流程。

## 阶段一：需求定义

1. 在 `specs/` 目录下创建 `[模块名].spec.md`，使用 `spec-validator` 的 `references/spec-template.md` 作为模板
2. 调用 `spec-validator` 验证 spec 完整性（8 个章节 + 5 类常见遗漏）
3. 使用 `task-orchestrator` 基于 spec 生成 `tasks.yaml` 中的任务拆解、依赖、DoR/DoD、Evidence Pack
4. 使用 `acceptance-gate` 为当前模块生成或更新验收条件，确认本模块“如何算完成”
5. 将 spec 和任务拆解展示给用户确认，**用户确认前不进入下一阶段**

## 阶段二：技术设计

6. 按 `database-schema-design` 设计数据库表结构
7. 按 `api-design` 设计 RESTful API 接口规范
8. 检查 `fullstack-dev-checklist` 维度零的项目脚手架完整性
9. 若当前模块超出既有项目边界或引入新子系统，回退触发 `project-planner` 更新项目章程与范围

## 阶段三：编码实现

10. 后端开发：Model → Repository → Service → Handler
11. 前端开发：页面组件 → API 封装 → 路由注册 → 导航菜单
12. 核心逻辑处加溯源注释：`// 对应 .spec: FR-XXX`
// turbo
13. 每完成一个子模块执行编译验证，确认无错误
14. 任务状态同步回写到 `tasks.yaml`，不得只在聊天里口头更新
15. 按 `git-workflow` 规范提交代码

## 阶段四：测试

16. 按 `testing-strategies` 编写核心路径的测试用例
// turbo
17. 执行测试用例并确认全部通过
18. 准备 Evidence Pack：构建结果、测试结果、关键接口样例、截图、迁移说明

## 阶段五：审查与交付

19. 调用 `code-review-guard` 执行完整结构化自审，**向用户输出验收报告**
20. 调用 `acceptance-gate` 检查当前模块是否满足 DoD 和 Evidence Pack
21. 若涉及敏感操作（金额/权限/删除），追加调用 `security-guard`
22. 若架构复杂，追加调用 `architecture-reviewer`
23. 修复所有必须项后，更新 `tasks.yaml` / `acceptance.yaml`，再标记模块为已完成
