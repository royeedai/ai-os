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
| v9.3 | External learning fusion | `specs/bugfix.spec.md`、URL evidence package matrix、MCP resource annotation、eval taxonomy frontmatter、W073-W075 |
| v9.4 | Agent handoff + evidence loop | `tasks.yaml` `handoff_to` / `context_refs` / `expected_return` / `evidence_produced` / `deviation_log`、W076 |
| v9.5 | Hallucination guard | `tasks.yaml` `fact_state_review`（`observed` / `confirmed` / `inferred` / `unknown`）、W077 |

每个 minor 都保持：零运行时依赖、3 个 CLI 子命令、`AGENTS.md` ≤150 行、向后兼容（warning-only，可由 `doctor --strict` 升级为 error）。

## 发布前检查清单（公开口径）

任何 minor / patch / major 上 GitHub `main` 前必须依次通过。仓库自身的更详细负责人清单见 `/Users/dai/.cursor/rules/project-lead.mdc`（仅本仓库维护者使用）。

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
