# Changelog

## 6.0.0

### Breaking
- `MISSION.md` 重构为“低频、已确认、共享的交付基线章程”，不再承载阶段计划、待确认项、澄清问题和需求变更同步记录
- 新增 `.ai-os/baseline-log/` 作为共享基线记录目录；每条记录单独成 `CR-YYYYMMDD-HHMMSS-slug.md` / `BL-YYYYMMDD-HHMMSS-slug.md` 文件，团队协作默认改为“串行基线、并行实现”
- `tasks.yaml` 与 `acceptance.yaml` 顶层新增 `baseline_id`，用于校验任务 / 验收是否仍对齐当前确认基线

### CLI / 模板
- `create-ai-os` 新脚手架会创建真实时间戳命名的初始 baseline record（如 `baseline-log/BL-20260402-153045-initial-baseline.md`），`memory.md` 保留 `.gitattributes merge=union`，`tasks.yaml` 移除 `merge=union` 改为正常合并（避免并发编辑被静默拼接）
- `validate` 支持薄 Mission 结构、`baseline-log/` 记录结构校验、`baseline_id` 一致性校验，并对旧版 Mission 结构和旧版 `baseline-log.md` 给出迁移 warning
- `doctor`、`status`、`resume` 新增当前确认基线和最新 confirmed baseline 展示
- `status`、`next`、`resume` 在 `STATE.md` 缺失时自动从共享工件（MISSION / DESIGN / tasks / acceptance / baseline-log）重建最小状态

### 测试
- 测试覆盖从 296 项提升到 526 项（+230）
- 新增测试：薄 Mission 结构校验、baseline-log 目录结构与记录校验、baseline_id 三方一致性、向后兼容（旧 Mission / 旧单文件 log / 旧序号命名）、process-style goal 警告、git merge 策略清理、STATE.md 自动重建、示例工件全量 validate

### 内容增强
- 更新 `framework/AGENTS.md`、`/align`、`/change-request`、`project-planner` 等规则，把 Mission 明确为锁定章程而非协作日志
- 更新 README、artifacts/workflows/getting-started 文档，补充多人协作下的 baseline-sync 约定
- 问题台账新增 PG-005：多人协作下 Mission 冲突热点治理

## 5.5.0

### 新功能
- `--lite` 安装模式：只安装核心 workflow（align/design/build/verify/debug）、必要 skill（acceptance-gate/memory-manager）和全部模板，token 成本从 ~99K 降到 ~32K（减少 68%）
- `cursor-rules` 子命令：将已安装框架转换为 `.cursor/rules/*.mdc`，AGENTS.md 生成为 `alwaysApply: true`，workflow/skill 按需加载
- `token-budget --lite`：对比完整安装与 lite 安装的 token 占用

### 内容增强
- README 新增「为什么需要 AI-OS」章节：引用 2026 年行业数据（AI 代码 bug 率 1.7x、45% 安全漏洞、信任度降至 60%）和运行时护栏工具差异化对比
- 问题台账新增 PG-002（token 预算治理）、PG-003（advisory 规则可被忽略）、PG-004（IDE 格式兼容性）
- 4 个新示例骨架：high-risk-state-change（含 risk-register）、debug-bounded-fix、change-request-baseline-sync、degraded-path-verification（含 acceptance.yaml）
- CLI 文档补充 Lite 模式、Cursor Rules、Token Budget 章节

### 测试
- 测试覆盖从 247 项提升到 296 项（+49）
- 新增测试：lite 安装正确性、cursor-rules 生成、新 example 骨架、problem-ledger 条目、README 内容、shared.js 导出

## 5.4.0

- 补齐 3 个示例骨架的缺失工件文件（greenfield 补 DESIGN/tasks/acceptance，brownfield 补 MISSION，reverse-spec 补 MISSION/acceptance）
- 创建 CHANGELOG.md
- 移除全部文档和框架文件中的"vNext"临时标记，统一为正式版本命名
- 新增 eval 内容结构校验（test/run.js 自动检查每个 eval 的 5 个必备章节）
- 新增 GitHub Issue Template、PR Template 和 CONTRIBUTING.md
- 补充 docs/cli.md 中 upgrade 命令的冲突处理说明
- 测试覆盖从 189 项提升到 213 项

## 5.3.0

- 任务模板新增 `measurable_outcome` 和 `edge_cases` 字段，强制任务级可量化完成标准和异常路径前置定义
- `/plan` workflow 禁止 `measurable_outcome` 和 `edge_cases` 为空
- `/build` workflow 新增 wave 级自审检查点（对照 spec、measurable_outcome、越界改动）
- 测试覆盖从 170+ 提升到 189 项

## 5.1.2

- 修复 vNext 重构后的断引用、死导入和缺失测试覆盖
- 修正多个 SKILL.md 中的 reference 路径
- 统一全部 CLI 脚本的参数解析逻辑
- 新增 build 执行层强化机制

## 5.0.0

**Breaking: 完整切换到 vNext 架构，不再兼容 v2 工件格式。**

### 架构重构
- 工件目录从 `.ai-os/` 统一管理，模板从 `framework/.agents/templates/project/` 分发
- 宪法 `framework/AGENTS.md` 重写为 8 条核心管控规则 + 5 条根层原则
- Workflow 重写为阶段式主路径（align -> design -> plan -> build -> verify -> ship）+ 专项入口（change-request / debug / review / postmortem）+ 续跑入口（status / next / resume / auto-advance）
- 模板重写：MISSION.md / DESIGN.md / STATE.md / memory.md / tasks.yaml v3 / acceptance.yaml v2 / specs / verification-matrix.yaml / release-plan.md / risk-register.md

### 新增能力
- `lab` 命令：批量创建多种项目类型沙盒（greenfield / reverse-spec / brownfield / debug / high-risk / degraded-path），自动跑 doctor / validate / status / next 并输出 lab-report.md
- `release-check` 命令：基于 release-plan.md + acceptance / tasks 的发布就绪检查，高风险档强查授权 / 并发 / degraded-path 证据
- `skill-check` 命令：校验自定义 Skill 目录的 SKILL.md 结构
- `status` / `next` / `resume` 命令：项目状态查看、就绪任务列表、跨 session 恢复
- 问题台账 `docs/problem-ledger.md`：16 条产品问题 + 1 条治理问题，每条绑定覆盖锚点
- 变更评估模板 `docs/change-evaluation-template.md`
- 15 个场景 eval + 1 个台账回归 eval
- 11 个示例 + 3 个骨架示例

### 治理增强
- 高风险档自动升级：命中资产 / 权限 / 不可逆状态流转 / 跨用户数据时强制补 risk-register / release-plan / 专项审查
- 分级流程（P0 / P1 / P2）适配
- 交付区分 `AI 已完成` / `需人工执行`
- 静态校验证据要求（compile / type-check / build）
- degraded-path-check 拦截只测 happy path 的伪完成
- brownfield / change 任务先审计共享基础设施约定
- "可配置"类术语强制追问操作闭环

### 删除
- 移除所有 v2 遗留 workflow 和兼容层
- 移除旧版 project-type 模板

## 2.6.0

- 版本升级和文档更新

## 2.5.0

- 增强测试和安装流程
- 重构 README 和引导脚本

## 2.4.0

- 新增变更感知验证支持
- 增强遗留项目集成
- 引入全面的 AI 项目交付指南和技能

## 2.3.1

- 文档修复和更新

## 2.0.0

- 升级为 AGENTS.md + SKILL.md 开放标准
- 支持 Antigravity / Cursor / Codex 三工具兼容
- 新增 doctor / diff / upgrade CLI 命令
- 引入 reverse-engineer skill 和 clone-project workflow
- 重构 `create-ai-os` 子命令调度

## 1.0.0

- 初始版本：通过 `npx` 从 git 安装 AI-OS 框架到目标项目
