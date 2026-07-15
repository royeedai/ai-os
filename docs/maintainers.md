# AI-OS 仓库维护指南

本文件只指导 AI-OS 母仓库自身开发。分发给用户项目的宪法模板位于 `framework/.agents/templates/root/AGENTS.md`；仓库根 `AGENTS.md` 只是本源码仓库维护 guard。

## 产品方向

- AI-OS 的核心不是"更自动写代码"，而是"更稳定把项目做对"
- 任何新改动都要回看是否直接提升：目标确认、设计锁定、证据化完成、可恢复记忆

## 当前真相

- canonical layout：**shared root + `.ai-os/lanes/default/`**（layout v11）
- 默认安装只含核心工件；risk-register / release-plan / verification-matrix / specs / design-pack / evals 是按需工件，由 agent 在触发条件命中时创建
- 根层 `.ai-os/MISSION.md`：共享宿主上下文；lane `MISSION.md`：当前交付基线
- `doctor`、README、schema、tests 必须表达同一套默认布局
- doctor semantic warnings 当前为 W070 / W071 / W072；CLI 收敛为 2 个操作（install + doctor）

## 发布前检查清单

任何 patch / minor / major 都必须有 tag，并在 GitHub `main` 发布前依次通过：

- [ ] `npm test` 全绿
- [ ] `npm run test:coverage` 达到仓库阈值
- [ ] `npm run lint` 0 错 0 警
- [ ] `git diff --check` 无空白错误
- [ ] `npm pack --dry-run` 的 package contents 符合 allowlist；再执行 `npm pack` 与 tarball installation smoke
- [ ] 分发宪法模板 `framework/.agents/templates/root/AGENTS.md` ≤150 行
- [ ] README、`docs/cli.md`、`docs/artifacts.md` 与本次改动同步
- [ ] `CHANGELOG.md` 已新增本版本条目并写明 Added / Changed / Tests / Migration
- [ ] VERSION / package.json / package-lock.json / CHANGELOG / candidate tag 完全一致
- [ ] README / docs / RELEASED_VERSION 在发布转换前后都只指向真实存在的发布 ref
- [ ] supported-platform CI / tarball smoke 全部通过，包含受支持 Node 与 Ubuntu、Windows、macOS 路径检查
- [ ] production audit 无已知漏洞；完整 development audit 已记录结果与处置
- [ ] release commit / annotated tag trust 已按仓库信任策略签名或完成等价验证
- [ ] GitHub Release / exact tag / checksum / package contents 互相一致并附带可复核证据
- [ ] pinned-ref installation smoke 使用最终候选 ref 成功安装并运行本地 doctor
- [ ] push tag 和 GitHub Release 后完成 remote readback，核对远端 commit、tag、Release、checksum 与安装结果
- [ ] `git status` 干净；未执行的发布动作保持 blocker，不能提前更新公开安装 pin

## 目录结构

- `framework/.agents/templates/root/AGENTS.md`：分发给用户项目的唯一交付宪法
- `.ai-os/`：只由下游项目安装后生成和维护；AI-OS 源码仓库自身不提交
- `framework/`：模板和 starter
- `bin/`：CLI 源码
- `docs/`：规范与维护文档
- `examples/`：叙事型示例
- `evals/`：AI-OS 母仓库回归样例
- `test/`：Node.js 测试

## 维护规则

1. 改动 canonical layout 时，必须同步修改：宪法模板、`README.md`、`docs/artifacts.md`、`bin/*`、`test/*`
2. 不要让单一 IDE 才能生效的机制进入根层治理
3. root shared 与 lane current 的语义边界不能混写
4. 实战反馈先判断是 delivery-truth / evidence-classification 问题，还是确实需要产品 surface；默认用现有工件表达

## 边界决策

任何新增 AI-OS 产品 surface 前先分类：

- **Kernel**（默认稳定）：Activation Gate、核心工件、`AGENTS.md`、lane 恢复、`memory.md`、项目原生验证、local doctor、无遥测、无默认外部服务
- **Controlled Extension**：doctor warning（必须是确定性结构检查）、CLI 子命令（只有 install / doctor 无法覆盖高频核心操作时）、schema 字段；必须有真实 failure mode、CR、验收、tests
- **Adapter**：hooks、CI、MCP resources、IDE 指引、skills wrapper；必须可选、薄封装、可删除
- **Forbidden**：内置 agent runner、重构调度器、模型路由器、自动发版平台、长期后台服务、遥测收集、IDE 专属硬依赖

## 测试方式

```bash
npm test
npm run lint
```

## 远端仓库治理

`.github/branch-protection.json` 是 `main` 保护的 reviewed desired state。它要求九个稳定阻断检查、最新代码的一次审批、code-owner review、解决全部对话、线性历史，并禁止 force push 与删除；`Node 26 canary` 明确不进入阻断列表。Actions 仓库策略还必须启用 `sha_pinning_required=true`。

应用设置前先读取并保存当前 protection、rulesets、Actions permissions、security settings 与 `framework-feedback` label；将 desired-state 文件随 PR review 和 CI 通过后，才调用 GitHub API 更新。更新后必须立即 remote readback，并精确核对 protection contexts/booleans、Actions SHA pinning、vulnerability alerts、automated security fixes、private vulnerability reporting 与 label。CodeQL 由 committed advanced workflow 提供，不同时开启 default setup。

若 GitHub API 因稳定的 plan/permission 限制返回 403/404，记录 sanitized status/body 和确切不可用能力；网络错误、未认证、模糊响应或普通值不匹配都不是“已配置”。本地文件只声明 desired state，不得把尚未成功 readback 的远端设置写成完成。

## 当前主示例

- `examples/greenfield-guided-product.md`
- `examples/brownfield-change-journey.md`
- `examples/debug-bounded-fix.md`

## Framework feedback 复盘

AI-OS 的迭代输入来自"用户在第一次开发后提出的修改中，哪些本可在 AI-OS 第一次 session 就拦掉"。反馈链不依赖任何 telemetry，来自已安装项目的本地工件、显式 issue、docs tests、evals 与 maintainer 定期复盘。

1. 下游项目每条 CR 关闭前补 `## Preventability review`（schema 见 `framework/.agents/templates/lane/baseline-log/BL-template.md`）
2. lane 关闭前补 `BL-*-retrospective.md` 聚合本 lane 内所有 Preventability review
3. 用户可通过 `.github/ISSUE_TEMPLATE/preventable-modification.md` 提交反馈（标签 `framework-feedback`）
4. 同一 root cause 被观察到 ≥3 次 → 按 trigger 提升为 eval oracle；单次偶发不升格

Guard 落点优先级（从最稳到最重）：

1. 宪法模板行为规则补一行（首选，零工件成本，跨 IDE 生效）
2. lane 工件模板 / 按需工件 schema（影响所有新 install）
3. evals（把真实 failure mode 固化为可回归样例）
4. docs / examples 补充示例
5. doctor 新增 warning（只有确定性结构检查才允许）
