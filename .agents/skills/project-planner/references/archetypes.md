# 项目 Archetype 选择参考

## 1. 全栈业务系统 / SaaS 后台

- 重点：页面、API、数据库、权限、CRUD 流程、发布回滚
- 默认组合：`spec-validator` + `fullstack-dev-checklist` + `code-review-guard`

## 2. 面向用户的 Web 产品

- 重点：核心旅程、埋点、性能、SEO、响应式、内容质量
- 默认组合：`spec-validator` + `fullstack-dev-checklist` + `performance-optimization`

## 3. API / 服务端项目

- 重点：契约、稳定性、错误码、负载、回滚、观测性
- 默认组合：`api-design` + `testing-strategies` + `release-manager`

## 4. AI Agent / Workflow 应用

- 重点：工具权限、上下文、memory、evals、回退路径、人工审批
- 默认组合：`project-planner` + `task-orchestrator` + `agent-evals-guard` + `memory-manager`

## 5. 数据处理 / ETL / 定时报表

- 重点：数据契约、幂等、补数、调度、失败重试、结果校验
- 默认组合：`testing-strategies` + `release-manager` + `change-impact-analyzer`

## 6. CLI / SDK / 开发工具

- 重点：命令契约、兼容性、安装体验、文档、版本策略
- 默认组合：`testing-strategies` + `code-review-guard` + `release-manager`

## 7. 轻量移动端 / H5

- 重点：终端兼容、网络弱场景、交互反馈、发布节奏
- 默认组合：`spec-validator` + `fullstack-dev-checklist` + `release-manager`

## 8. 复刻 / 仿制项目

- 重点：功能逻辑还原、素材逆向分析、范围控制、信息置信度管理
- 默认组合：`reverse-engineer` + `spec-validator` + `fullstack-dev-checklist`
- 特殊约束：
  - 必须声明还原度要求（功能逻辑级 / UI 参考级）
  - 必须声明与原型的计划差异（哪些功能不做、哪些替换）
  - 每个 spec 条目必须标记信息来源置信度（`[确认]` / `[推断]` / `[待确认]`）
  - 素材覆盖度低的模块不得直接进入开发
