# AI-OS 仓库维护指南

本文件只指导 AI-OS 母仓库自身开发。分发给用户项目的宪法位于根 `AGENTS.md`。

## 产品方向

- AI-OS 的核心不是“更自动写代码”，而是“更稳定把项目做对”
- 任何新改动都要回看是否直接提升：
  - 目标确认
  - 设计锁定
  - 证据化完成
  - 可恢复记忆

## 当前真相

- canonical layout：**shared root + `.ai-os/lanes/default/`**
- 根层 `.ai-os/MISSION.md`：共享宿主上下文
- lane `MISSION.md`：当前交付基线
- `doctor`、README、schema、tests 必须表达同一套默认布局

## Release 能力对照

| Minor | 主题 | 关键工件 / 检查 |
|---|---|---|
| v9.0 | Default lane reset | shared root + `lanes/default/`；upgrade 路径覆盖 v7 legacy / v8 root-only / v8 hybrid |
| v9.1 | Open standards alignment | `agentskills.io` SKILL 包装、`aios://` MCP URI、CLAUDE/GEMINI ≤10 行 stub、doctor W070-W072 |
| v9.2 | URL reverse-spec intake | `docs/reverse-spec-url-intake.md`、`design-pack/parity-map.md`、API observation records |
| v9.3 | External learning fusion | `specs/bugfix.spec.md`、URL evidence package matrix、MCP resource annotation、eval taxonomy frontmatter |
| v9.4 | Agent handoff + evidence loop | `tasks.yaml` `handoff_to` / `context_refs` / `expected_return` / `evidence_produced` / `deviation_log`、W076 |
| v9.5 | Hallucination guard | `tasks.yaml` `fact_state_review`（`observed` / `confirmed` / `inferred` / `unknown`）、W077 |
| v9.5.1 | Activation Gate | AI-OS 工件治理只在 delivery-affecting work 启用；普通对话不读写 lane 工件 |
| v9.6 | Long-horizon agent reliability loop | `agent_run_review`、doctor W078（warning）；interop 映射 v9.8 起并入 `standards-map.md` |
| v9.7 | Framework feedback loop | CR `## Preventability review`、lane 关闭 retrospective baseline-log |
| v9.7.1 | Developer-level memory interop（patch） | 四层记忆模型、PL-013（并入 standards-map） |
| v9.7.2 | Consistency cleanup（patch） | problem-ledger 编号修复、文档路径与 doctor 范围对齐 |
| v9.7.3 | CLI defect fixes（patch） | 8 个 CLI 缺陷修复（数据安全、W010 阈值、approval_required schema 等） |
| v9.8 | Content slimming（GPT-5.5 / Opus 4.8 世代） | interop 收敛、spec 去重、移除 W073/W075/W079 软检查、叙事更新 |
| v9.9 | Design-aware component-first UI | 有设计稿按设计目标优先复用组件；无设计稿的后台 / PC / 移动业务 UI 默认组件库交付 |
| v10.0.0 | Drop upgrade + legacy migration（major） | 移除 upgrade 命令与 v7/v8 迁移机制，CLI 收敛为 install + doctor |
| v10.1.0 | Restate-confirm gate + architecture guardrail（minor） | AGENTS §1 反述确认门、lane MISSION §2 / DESIGN §10 反述字段、memory §2 架构护栏登记表、spec v2.2；吸收外部建议但守红线，不新增 CLI / doctor code / 工件类别 |
| v10.1.1 | Consistency optimization（patch） | 修 mcp-resources 操作数 / CHANGELOG spec 版本号、补齐 v10.0.0 去版本化遗漏（doctor 输出 / 注释 / README）、dogfood lane 工件回正到当前交付 + mcp-resources 回归 guard；无新增 CLI / doctor code / 工件类别 |
| v10.1.2 | CLI defect fixes + restate-anchor unification（patch） | 修已移除子命令静默误装 / install --help / 目标为文件崩溃 / doctor 类型漏检与 EISDIR 崩溃 / 死导出；反述门锚点统一 DESIGN §10 并落节号级断言；清理 upgrade 与去版本化残留；greenfield 补设计层反述示范；无新增 CLI / doctor code / 工件类别 |
| v10.2.0 | Product Design optional bridge（minor） | `design_input` 记录 Product Design / Figma / URL / screenshot / existing-code / manual brief；Product Design 能力可完整用作设计证据，但不是插件硬依赖 |
| v10.3.0 | Zero-network local doctor（minor） | install 把 doctor 入口 vendored 到目标项目 `.ai-os/bin/`（入 git），日常 / hook / CI 走 `node .ai-os/bin/ai-os-doctor.js .` 本地零外部请求；团队 clone 无 framework.toml 时按 committed VERSION 降级 E001；install / skills 命令 pin release tag；无新增 CLI / doctor code / 工件类别 |
| v10.3.1 | Codex suitability + release metadata consistency（patch） | Activation Gate / bugfix stops 对明确授权的 Codex 前台执行请求不再二次反问；doctor guard 文案区分 host hook 与 Codex local / CI guard；补 package-lock 版本一致性检查 |
| v10.4.0 | Long-lived AI Project Maintenance Loop（minor） | 长期 AI 项目按 drift evidence 触发维护 CR / scoped refactor task；`tasks.yaml` 可选 `maintenance_review`；verification matrix 增长期维护 guard；不新增 CLI / runtime / doctor warning / 工件类别 |
| v10.5.0 | Boundary Evolution Policy（minor） | Kernel / Controlled Extension / Adapter / Forbidden 边界分类；future doctor / CLI / adapter / artifact-category changes require CR evidence, tests, and boundary review；本轮不新增产品 surface |

Kernel 默认保持零运行时依赖、`AGENTS.md` ≤150 行、向后兼容。当前 doctor semantic warnings 为 W070-W078，可由 `doctor --strict` 升级为 error。CLI 子命令在 v9.x 为 3 个，v10.0.0 起收敛为 2 个（install + doctor）；未来扩展必须先过 Boundary Decision Checklist。

## 发布前检查清单（公开口径）

任何 minor / patch / major 上 GitHub `main` 前必须依次通过。仓库自身的更详细负责人清单见仓库内 `.cursor/rules/project-lead.mdc`（仅本仓库维护者本地使用）。

- [ ] `npm test` 全绿
- [ ] `npm run lint` 0 错 0 警
- [ ] VERSION、package.json 与 package-lock.json 根版本一致并已升级（按 SemVer 选 patch / minor / major）
- [ ] `AGENTS.md` ≤150 行
- [ ] README、`docs/cli.md`、`docs/artifacts.md` 与本次改动同步
- [ ] `docs/constitution-spec.md` 在改动影响 spec 兼容性时已 bump
- [ ] `CHANGELOG.md` 已新增本版本条目并写明 Added / Changed / Tests / Migration
- [ ] `docs/problem-ledger.md` 已为本次新规则补登 PL-* / PG-*，或在 CR 中记录不补登原因
- [ ] `git status` 干净
- [ ] minor / major 发布在 push 完成后执行 `git tag -a vX.Y.Z -m "..."` 并 `git push origin vX.Y.Z`
- [ ] 评估是否需要 npm publish（默认走 npx-from-GitHub 主路径，npm 可选）

## 目录结构

- `AGENTS.md`：分发给用户项目的唯一交付宪法
- `.ai-os/`：AI-OS 仓库自身的自托管工件
- `framework/`：模板和 starter
- `bin/`：CLI 源码
- `docs/`：规范、维护和问题台账
- `examples/`：叙事型示例
- `evals/`：AI-OS 母仓库回归样例
- `test/`：Node.js 测试

## 维护规则

1. 改动 canonical layout 时，必须同步修改：
   - `AGENTS.md`
   - `README.md`
   - `docs/artifacts.md`
   - `docs/constitution-spec.md`
   - `bin/*`
   - `test/*`
2. 任何“当前覆盖锚点”变化，都要同步更新 `docs/problem-ledger.md`
3. 不要让单一 IDE 才能生效的机制进入根层治理
4. root shared 与 lane current 的语义边界不能混写

## Boundary Decision Checklist

任何新增 AI-OS 产品 surface 前先分类：

- **Kernel**：Activation Gate、12 组工件、`AGENTS.md`、lane 恢复、`memory.md`、项目原生验证、local doctor、无遥测、无默认外部服务。Kernel 改动必须按 minor / major 走完整 CR、docs、tests。
- **Controlled Extension**：doctor warning、CLI 子命令、schema 字段、release check。必须有真实 failure mode 或高频维护需求、CR、验收、项目原生验证、docs tests，必要时补 `verification-matrix.yaml` guard 或 `evals/`。
- **Adapter**：hooks、CI、MCP resources、IDE 指引、cloud-agent 映射、skills wrapper。必须可选、薄封装、可删除，不得成为核心运行时或唯一生效路径。
- **Forbidden**：内置 agent runner、重构调度器、模型路由器、自动发版平台、长期后台服务、遥测收集、IDE 专属硬依赖。

具体准入：

- 新 doctor warning：必须是确定性结构检查，不能依赖 LLM 判断语义；需测试覆盖 `--strict` 行为。
- 新 CLI 子命令：只有 install / doctor 无法覆盖高频核心操作时才允许；不得引入长期服务或外部依赖。
- 新 adapter：只做文档、模板、skill 或薄脚本；无该外部工具时 AI-OS 仍完整可用。
- 新工件类别：默认禁止；只有现有 12 类无法表达多个真实案例，且迁移 / 兼容成本被 CR 明确评估后才可讨论。

## 测试方式

```bash
npm test
npm run lint
```

## 当前主示例

- `examples/greenfield-guided-product.md`
- `examples/brownfield-change-journey.md`
- `examples/debug-bounded-fix.md`
- `examples/high-risk-state-change.md`
- `examples/coexist-with-spec-kit.md`
- `examples/multi-tool-coexistence.md`
- `examples/non-delivery-discussion.md`
- `examples/background-agent-handoff.md`

## Framework feedback 复盘

AI-OS 的迭代输入来自"用户在第一次开发后提出的修改中，哪些本可在 AI-OS 第一次 session 就拦掉"。v9.7 起这条反馈链不依赖任何 telemetry，全靠本地工件 + git + 定期复盘：

### 反馈数据进入工件

1. 每条 CR 关闭前由 AI 或用户补 `## Preventability review`（schema 见 `framework/.agents/templates/lane/baseline-log/BL-template.md` 与 `docs/artifacts.md`）。
2. lane `status` 切到 `closed` 前补一条 `BL-YYYYMMDD-HHMMSS-retrospective.md`，聚合本 lane 内所有 `Preventability review`。
3. v9.8+ 起不再用 doctor 提示 Preventability review 遗漏；靠模板 schema + maintainer `git grep` 复盘。

### dogfooding 通道（主路径）

每个 minor 发布前，maintainer 在 AI-OS 仓库自身的 lane 内执行：

```bash
git grep -n "Preventable: yes\|Preventable: partial" .ai-os/lanes/
git grep -n "Maps to: unmapped" .ai-os/lanes/
```

列出未归并条目，按下文"归并判断"决定是否升格为 `PL-*` / `PG-*`。

### 第三方通道（可选）

用户可通过 `.github/ISSUE_TEMPLATE/preventable-modification.md` 提交反馈，门槛仅是粘贴自己仓库内的 `## Preventability review` 段落。AI-OS maintainer 在 issue 标签 `framework-feedback` 下定期梳理。

### 归并判断

- 同一 root cause 在 dogfooding + 第三方通道合计出现 ≥2 次 → 新增 `PL-*` 或 `PG-*` 到 `docs/problem-ledger.md`，并在下一个 minor 落 guard。
- 单次偶发 → 留在 baseline-log 内不升格，避免误把个别项目特性写进框架。

### Guard 落点优先级

从最稳到最重：

1. AGENTS.md 行为规则补一行（首选，零工件成本，跨 IDE 直接生效）
2. lane 工件模板新增字段（次选，影响所有新 install）
3. doctor 新增 warning / info（再次，强制 / 提示力度可控）
4. docs / examples 补充示例（最后，仅在前三种不合适时使用）

任何升格都必须同步：`docs/problem-ledger.md` 新增 PL-* / PG-*、`docs/constitution-spec.md` 视影响 bump 版本、对应 minor 的 CHANGELOG。
