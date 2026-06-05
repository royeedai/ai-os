# AI-OS 仓库维护指南

本文件只指导 AI-OS 母仓库自身开发。分发给用户项目的宪法位于根 `AGENTS.md`。

## 产品方向

- AI-OS 的核心不是“更自动写代码”，而是“更稳定把项目做对”
- 任何新改动都要回看是否直接提升：
  - 目标确认
  - 设计锁定
  - 证据化完成
  - 可恢复记忆

## v9 当前真相

- canonical layout：**shared root + `.ai-os/lanes/default/`**
- 根层 `.ai-os/MISSION.md`：共享宿主上下文
- lane `MISSION.md`：当前交付基线
- `doctor`、`upgrade`、README、schema、tests 必须表达同一套默认布局

## v9 minor release 能力对照

| Minor | 主题 | 关键工件 / 检查 |
|---|---|---|
| v9.0 | Default lane reset | shared root + `lanes/default/`；upgrade 路径覆盖 v7 legacy / v8 root-only / v8 hybrid |
| v9.1 | Open standards alignment | `agentskills.io` SKILL 包装、`aios://` MCP URI、CLAUDE/GEMINI ≤10 行 stub、doctor W070-W072 |
| v9.2 | URL reverse-spec intake | `docs/reverse-spec-url-intake.md`、`design-pack/parity-map.md`、API observation records |
| v9.3 | External learning fusion | `specs/bugfix.spec.md`、URL evidence package matrix、MCP resource annotation、eval taxonomy frontmatter |
| v9.4 | Agent handoff + evidence loop | `tasks.yaml` `handoff_to` / `context_refs` / `expected_return` / `evidence_produced` / `deviation_log`、W076 |
| v9.5 | Hallucination guard | `tasks.yaml` `fact_state_review`（`observed` / `confirmed` / `inferred` / `unknown`）、W077 |
| v9.5.1 | Activation Gate | AI-OS 工件治理只在 delivery-affecting work 启用；普通对话不读写 lane 工件 |
| v9.6 | Long-horizon agent reliability loop | `agent_run_review`、`docs/interop/standards-map.md`、doctor W078（warning） |
| v9.7 | Framework feedback loop | CR `## Preventability review`、lane 关闭 retrospective baseline-log |
| v9.7.1 | Developer-level memory interop（patch） | 四层记忆模型、PL-013（并入 standards-map） |
| v9.8 | Content slimming（GPT-5.5 / Opus 4.8 世代） | interop 收敛、spec 去重、移除 W073/W075/W079 软检查、叙事更新 |

每个 minor 都保持：零运行时依赖、3 个 CLI 子命令、`AGENTS.md` ≤150 行、向后兼容（W070-W078 warning-only，可由 `doctor --strict` 升级为 error）。

## 发布前检查清单（公开口径）

任何 minor / patch / major 上 GitHub `main` 前必须依次通过。仓库自身的更详细负责人清单见仓库内 `.cursor/rules/project-lead.mdc`（仅本仓库维护者本地使用）。

- [ ] `npm test` 全绿
- [ ] `npm run lint` 0 错 0 警
- [ ] VERSION 与 package.json 一致并已升级（按 SemVer 选 patch / minor / major）
- [ ] `AGENTS.md` ≤150 行
- [ ] README、`docs/cli.md`、`docs/artifacts.md` 与本次改动同步
- [ ] `docs/constitution-spec.md` 在改动影响 spec 兼容性时已 bump
- [ ] `CHANGELOG.md` 已新增本版本条目并写明 Added / Changed / Tests / Migration
- [ ] `docs/problem-ledger.md` 已为本次新规则补登 PL-* 或 PG-*
- [ ] `git status` 干净
- [ ] minor / major 发布在 push 完成后执行 `git tag -a vX.Y.Z -m "..."` 并 `git push origin vX.Y.Z`
- [ ] 评估是否需要 npm publish（v9 默认走 npx-from-GitHub 主路径，npm 可选）

## 目录结构

- `AGENTS.md`：分发给用户项目的唯一交付宪法
- `.ai-os/`：AI-OS 仓库自身的自托管工件
- `framework/`：模板和 starter
- `bin/`：CLI 源码
- `docs/`：规范、迁移、维护和问题台账
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
2. lane 工件模板新增字段（次选，影响所有 install / upgrade）
3. doctor 新增 warning / info（再次，强制 / 提示力度可控）
4. docs / examples 补充示例（最后，仅在前三种不合适时使用）

任何升格都必须同步：`docs/problem-ledger.md` 新增 PL-* / PG-*、`docs/constitution-spec.md` 视影响 bump 版本、对应 minor 的 CHANGELOG。
