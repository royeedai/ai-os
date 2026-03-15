# AI-OS 开发规则

本文件只用于指导 AI-OS CLI 工具自身的开发。分发给用户项目的交付宪法位于 `framework/AGENTS.md`。

## 产品方向对齐

- 仓库根目录下的 `PROJECT_PURPOSE.md` 是 AI-OS 核心要求的主定义位置
- AI-OS 的高层要求只认 6 条：`目标对齐`、`通用性优先`、`项目事实边界`、`闭环与证据优先`、`复杂度预算`、`结构化演进`
- 当用户提出产品想法、README 改造、workflow 调整、模板变更、定位变化时，先判断它是否直接提升这 6 条中的某一条
- 如果一个需求不能稳定映射到这 6 条核心要求之一，默认不进入根层治理，也不应直接升级为框架规则

## 如何判断是否该改 AI-OS

每次评估 AI-OS 本身的改动，先回答这 4 个问题：

1. 这是 AI-OS 的通用交付问题，还是某个项目、行业、团队的使用问题？
2. 它是否直接提升六条核心要求中的至少一条？
3. 它最合适的承接位置是 `framework/`、项目工件、README/示例，还是明确不纳入？
4. 如果进入 `framework/`，应新增，还是应合并、重写、抽象提升或替换现有结构？

默认要求如下：

- 不要把用户每次提出的问题都直接编码成 AI-OS 框架规则
- 即使决定进入 `framework/`，也不要默认以“新增一条”的方式处理，应优先合并、重写、抽象或替换
- 框架级改动必须显式考虑复杂度预算；如果新增能力明显增加理解成本，需要说明为什么值得
- 框架级改动应尽量附带证据来源：重复问题、实验观察、失败案例，或新增/更新测试与 eval
- 新增或重构原则时，要同步检查并清理相关旧规则、旧文案、旧模板和旧测试，不能只做叠加

## 根层文档分工

- `PROJECT_PURPOSE.md`：定义 AI-OS 的最终目的、6 条核心要求、筛选法和派生规则映射
- `AGENTS.md`：定义开发 AI-OS 时如何判断“该不该改、该改到哪里”
- `docs/maintainers.md`：定义维护者视角下的简版治理方法和清理要求
- `docs/change-evaluation-template.md`：定义评估单次 AI-OS 变更建议的最小模板

## 项目概述

AI-OS 是一个零依赖的 Node.js CLI 工具，通过 `npx` 将 `framework/` 下的规则、skills、workflows 安装到用户项目中。

## 目录结构约定

- `framework/` — 可分发产品内容（`AGENTS.md` + `.agents/`），安装到用户项目
- `bin/` — CLI 源码，纯 Node.js 内置模块，零外部依赖
- `evals/` — AI-OS 母仓库的回归评估样例，用来约束 framework 演化方向
- `examples/` — 示例项目
- `docs/` — 内部设计文档

## 编码规范

- 仅使用 Node.js 内置模块（`fs`、`path`、`crypto`、`child_process` 等），禁止引入 npm 依赖
- 所有 CLI 脚本放在 `bin/` 下，公共逻辑放在 `bin/shared.js`
- `PACKAGE_ROOT` 指向仓库根目录（读 `VERSION`、`package.json` 等）
- `FRAMEWORK_ROOT` 指向 `framework/` 子目录（读可分发内容）
- 新增 CLI 命令需同步更新 `package.json` 的 `bin` 字段和 `README.md`

## 变更流程

- 改动 `framework/` 下的内容（宪法、skills、workflows、模板）时，需更新 `VERSION` 文件
- 不需要 `project-charter`、`.spec.md`、`tasks.yaml`、`acceptance.yaml` 等重型流程
- 提交信息使用语义化格式：`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`

## 测试方式

```bash
# 运行完整集成测试
npm test

# 手动在临时目录中测试安装
node bin/create-ai-os.js /tmp/test-project --with-project-files

# 验证健康检查
node bin/ai-os-doctor.js /tmp/test-project

# 验证差异检测
node bin/ai-os-diff.js /tmp/test-project

# 验证升级
node bin/ai-os-upgrade.js /tmp/test-project

# 版本同步检查
node bin/release.js --check
```
