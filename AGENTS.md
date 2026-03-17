# AI-OS 开发规则（vNext）

本文件只用于指导 AI-OS CLI 工具自身的开发。分发给用户项目的交付宪法位于 `framework/AGENTS.md`。

## 产品方向对齐

- 仓库根目录下的 `PROJECT_PURPOSE.md` 是 AI-OS 核心要求的主定义位置
- AI-OS 根层只认 5 条核心要求：`目标与用户确认优先`、`关键设计与逻辑先锁定`、`自适应治理`、`证据化完成`、`可恢复的项目记忆`
- 当用户提出产品想法、README 改造、workflow 调整、模板变更、定位变化时，先判断它是否直接提升这 5 条中的至少一条
- 如果一个需求不能稳定映射到这 5 条核心要求之一，默认不进入根层治理

## 如何判断是否该改 AI-OS

每次评估 AI-OS 本身的改动，先回答这 4 个问题：

1. 它是在提升“更快写代码”，还是在提升“更稳定把项目做对”？
2. 它直接改善的是目标确认、设计锁定、逻辑锁定、证据完成，还是项目恢复能力？
3. 它最适合进入 `framework/`、CLI、README/示例，还是明确不纳入？
4. 它是在减少错误交付，还是只是在叠加新概念？

默认要求如下：

- 不要把每次用户提到的技巧都直接变成框架规则
- 即使决定进入 `framework/`，也优先做重写、合并、替换，而不是继续平铺新增
- 框架级改动必须解释它如何改善质量结果，而不是只解释它如何增加流程控制
- 根层改动优先配套 eval、示例或 CLI 校验，避免只改文案
- 新结构落地时要同步清理旧规则、旧命名、旧模板和旧测试

## 根层文档分工

- `PROJECT_PURPOSE.md`：定义 AI-OS 的最终目的、5 条核心要求和筛选法
- `AGENTS.md`：定义开发 AI-OS 时如何判断“该不该改、该改到哪里”
- `docs/maintainers.md`：维护者视角下的简版治理方法和清理要求
- `docs/change-evaluation-template.md`：评估一次 AI-OS 变更建议的最小模板

## 项目概述

AI-OS 是一个零依赖的 Node.js CLI 工具，通过 `npx` 将 `framework/` 下的规则、skills、workflows 和模板安装到用户项目中。

## 目录结构约定

- `framework/` — 可分发产品内容（`AGENTS.md` + `.agents/`），安装到用户项目
- `bin/` — CLI 源码，纯 Node.js 内置模块，零外部依赖
- `evals/` — AI-OS 母仓库的回归评估样例
- `examples/` — 示例项目和使用方式
- `docs/` — 内部设计文档

## 编码规范

- 仅使用 Node.js 内置模块，禁止引入 npm 依赖
- 所有 CLI 脚本放在 `bin/` 下，公共逻辑放在 `bin/shared.js`
- `PACKAGE_ROOT` 指向仓库根目录
- `FRAMEWORK_ROOT` 指向 `framework/` 子目录
- 新增 CLI 命令需同步更新 `package.json` 的 `bin` 字段和 `README.md`

## 变更流程

- 改动 `framework/` 下的内容时，需更新 `VERSION`
- 改动根层原则、workflow 主叙事、核心工件命名时，视为 major 级变化，应同步补变更说明和旧结构清理范围
- 不需要重型流程，但需要确保 README、docs、examples、evals、tests 一起跟上

## 测试方式

```bash
npm test
node bin/create-ai-os.js /tmp/test-project --with-project-files
node bin/ai-os-doctor.js /tmp/test-project
node bin/ai-os-validate.js /tmp/test-project
node bin/ai-os-upgrade.js /tmp/test-project
node bin/ai-os-release-check.js /tmp/test-project
```
