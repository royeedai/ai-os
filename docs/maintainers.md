# AI-OS 仓库维护指南

本文件只用于指导 AI-OS 这个仓库自身的开发。分发给用户项目的交付宪法位于根 `AGENTS.md`。

## 产品方向对齐

- `PROJECT_PURPOSE.md` 是 AI-OS 核心要求的主定义位置
- AI-OS 根层只认 5 条核心要求：目标与用户确认优先、关键设计与逻辑先锁定、自适应治理、证据化完成、可恢复的项目记忆
- 当用户提出产品想法、README 改造、模板变更、定位变化时，先判断它是否直接提升这 5 条中的至少一条
- 如果一个需求不能稳定映射到这 5 条核心要求之一，默认不进入根层治理

## 如何判断是否该改 AI-OS

每次评估 AI-OS 本身的改动，先回答这 4 个问题：

1. 它是在提升"更快写代码"，还是在提升"更稳定把项目做对"？
2. 它直接改善的是目标确认、设计锁定、逻辑锁定、证据完成，还是项目恢复能力？
3. 它最适合进入 `framework/`、CLI、README / 示例、`docs/`，还是明确不纳入？
4. 它是在减少错误交付，还是只是在叠加新概念？

默认要求：

- 不要把每次用户提到的技巧都直接变成框架规则
- 来自别的项目的真实问题、失败案例，以及 trace / debug / verify / postmortem 暴露出的稳定失败模式，先登记到 `docs/problem-ledger.md`，再评估应该进入哪里
- 每次重构、学习进步、模板 / CLI / README 调整时，都要回看相关问题台账条目，确认覆盖没有丢失
- 边界不清、跨多文件或影响面不明的改动，先做只读分析和覆盖审计，再决定改到 `framework/`、CLI 还是文档
- CLI 级能力只有在当前已承诺支持的环境都能稳定承接，或至少有明确的等价退化路径时，才进入根层或 CLI
- 即使决定进入 `framework/`，也优先做重写、合并、替换，而不是继续平铺新增
- 框架级改动必须解释它如何改善质量结果，而不是只解释它如何增加流程控制
- 新结构落地时要同步清理旧规则、旧命名、旧模板和旧测试

## 维护时补做四件事

1. 新出现的真实问题先登记到 `docs/problem-ledger.md`
2. 每次重构、学习进步或规则替换，在变更评估里写清本次回看了哪些问题条目、覆盖是否变弱
3. 边界不清、跨多文件或影响面不明的改动，先做只读覆盖审计，再进入 framework / CLI / docs 的改写
4. trace / debug / verify / postmortem 暴露出的稳定 failure mode，不要只停在聊天记录里，要固化到 eval / example / CLI check 或项目工件

## 项目概述

AI-OS 是一个零依赖的 Node.js CLI 工具，通过 `npx` 将交付宪法和工件模板安装到用户项目中。

## 目录结构约定

- `AGENTS.md` — 根层唯一的 AI 交付宪法（被 CLI 安装到用户项目）
- `framework/` — 工件模板与 starter 内容
- `bin/` — CLI 源码，纯 Node.js 内置模块，零外部依赖
- `docs/` — 内部文档：宪法规范、迁移指南、维护者指南、问题台账
- `evals/` — AI-OS 母仓库的回归评估样例
- `examples/` — 示例项目和使用方式
- `manifests/` — CLI 用到的内部清单

## 编码规范

- 仅使用 Node.js 内置模块，禁止引入 npm 依赖
- 所有 CLI 脚本放在 `bin/` 下，公共逻辑放在 `bin/shared.js`
- `PACKAGE_ROOT` 指向仓库根目录
- `FRAMEWORK_ROOT` 指向 `framework/` 子目录
- 新增 CLI 命令需同步更新 `package.json` 的 `bin` 字段、`README.md` 和 `docs/cli.md`

## 变更流程

- 改动 `framework/` 下的内容或根 `AGENTS.md` 时，需更新 `VERSION` 和 `package.json`
- 改动五条核心要求、工件集、CLI 主入口时，视为 major 级变化，应同步补变更说明和旧结构清理范围
- README、`docs/`、examples、evals、tests 必须一起跟上

## 测试方式

```bash
npm test

# 预览安装范围
node bin/create-ai-os.js --help

# 手动在临时目录中测试安装
node bin/create-ai-os.js /tmp/test-project

# 验证健康检查
node bin/ai-os-doctor.js /tmp/test-project

# 验证 v7 → v8 迁移
node bin/ai-os-upgrade.js /tmp/test-project
```

## 当前主示例

- `examples/quickstart-todo-cli/`（canonical lane 示例，展示 `shared root + lanes/default`）
- `examples/multi-lane-team-workspace/`（canonical 团队协作 lane 示例，展示 active / draft / archived 拓扑与 shared memory reflux）
- `examples/coexist-with-spec-kit.md`（AI-OS × GitHub Spec-Kit 共存）
- `examples/greenfield-guided-product.md`
- `examples/brownfield-change-journey.md`
- `examples/debug-bounded-fix.md`
- `examples/high-risk-state-change.md`

## 版本纪律

- **patch** (x.y.z)：bugfix、文案修正、文档补全、测试与治理收口
- **minor** (x.y.0)：新增工件模板字段、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

发版前：

1. 同步更新 `VERSION` 和 `package.json` 的 `version`
2. 在 `CHANGELOG.md` 顶部补充变更记录
3. 运行 `npm test` 确认全绿
4. 运行 `npx eslint bin/` 零报错零警告

## 治理问题台账（概要）

- PG-001: 新问题没有单独记录，重构时容易把覆盖做丢 → `docs/problem-ledger.md` 统一登记
- PG-002: 框架 token 成本占用过高 → v8 极简操作面重构，AGENTS.md ≤150 行
- PG-003: 框架规则只是建议性的 → CLI doctor 做确定性校验
- PG-004: CLI / 框架能力只在单一 IDE 可用 → AGENTS.md 作为 agents.md 开放标准跨工具通用

完整台账见 `docs/problem-ledger.md`。
