# CR-20260608-153000-restate-confirm-arch-guardrail

- **Type**: change-request (minor / non-breaking — behavior + artifact enrichment)
- **Status**: confirmed
- **Date**: 2026-06-08
- **Summary**: 评估一份外部「把 ai-os 打造为 AI 编码平台」的建议后，用 `PROJECT_PURPOSE.md` §5 四问 + 不扩张红线过滤，**只吸收两条纯行为规则 / 工件强化**：(1) 实现前「双向对齐 + 反述确认」门；(2) 把外部说的「架构规范字典 / style guide / `.ai-os-rules`」明确定位为 `.ai-os/memory.md` §2 工程约束职责并强化。明确拒绝 contract→codegen 自动填充、越界拦截 / AST linter、项目指纹索引器、强制单测生成、`.ai-os-rules` 新文件、独立 PRD 工件、UI 沙箱 / 实时预览。零运行时、不新增 CLI / doctor code / 工件类别。Released as v10.1.0。
- **Affects**: `AGENTS.md`, `framework/.agents/templates/lane/MISSION.md`, `framework/.agents/templates/lane/DESIGN.md`, `framework/.agents/templates/shared-root/memory.md`, `docs/artifacts.md`, `docs/constitution-spec.md`, `docs/interop/standards-map.md`, `docs/problem-ledger.md`, `examples/greenfield-guided-product.md`, `test/docs.test.js`, `VERSION`, `package.json`, `package-lock.json`, `CHANGELOG.md`, `.ai-os/lanes/default/MISSION.md`, `.ai-os/lanes/default/lane.toml`, `.ai-os/framework.toml`, `.cursor/rules/project-lead.mdc`
- **Confirmed by**: project owner, 2026-06-08（确认采用「推荐集」：反述确认 + 架构护栏定位到 memory §2 强化 + DESIGN 契约先行点名，一次性走完整框架 minor 迭代）

## Trigger

外部建议从「工程落地 + 商业交付」视角，建议把 ai-os 做成契约驱动生成 / 防呆反问引擎 / 老代码护栏 / 单兵流水线 + 三个 MVP（需求结构化表单、`.ai-os-rules` 架构规范字典、多端 UI 沙箱）的 AI 编码平台。其内核哲学（用系统设计框住 AI 行为、降低模糊场景出错率）与 ai-os 初心同源，但具体形态多为 runtime / codegen / IDE 产品功能，撞「不做执行层」红线。

## Current behavior

- 目标确认优先（`AGENTS.md` §1）、关键设计先锁定（§2）已覆盖「先契约后实现」哲学，但**没有显式的「进入实现 / 锁定前，AI 结构化反述理解并请用户确认」动作**——全库无「反述 / 双向对齐」措辞，最接近的只有 greenfield 示例里一句 confirm。
- 架构约束散落在 `memory.md` §2 工程约束 + §6 跨层契约登记表 + `evals/weak-type-hole-erodes-contract.md`，但**没有点名它就是外部常说的「架构规范字典 / style guide」的家**，验证阶段对照也未显式锚定。
- `DESIGN.md` §4 已是接口 / 数据模型 / 状态机契约，但未点名「契约先行」语义。

## Proposed delta

- **吸收 1（反述确认门）**：`AGENTS.md` §1 增 1 条 bullet（进入设计锁定 / 实现前必须结构化反述目标 / 核心主流程 / 状态流转 / 关键异常路径，经用户确认后才推进）；行为规则「新项目 / 需求模糊」「验证阶段」原地强化。`MISSION.md` §2 增「核心主流程（步骤化反述）」「关键异常 / 边界分支」字段 + 待确认声明。`DESIGN.md` §9 改造为「反述 + 确认门」。`examples/greenfield-guided-product.md` 扩展反述确认步骤。
- **吸收 2（架构护栏定位）**：`memory.md` §2 引言点名「架构护栏 / 编码契约登记表」，`EC-*` 增「类型」字段（return-contract / must-reuse-abstraction / forbidden-antipattern / dependency-policy）并注明验证阶段逐条对照；`AGENTS.md` 验证阶段行为规则补「对照 memory 架构护栏」。
- **契约先行点名**：`DESIGN.md` §4 标注「契约层，确认状态 pending 不得进入大规模实现」。
- **文档同步**：`docs/artifacts.md` 点名 DESIGN §4 契约层 / memory §2 架构护栏 + 新增「反述确认 / 双向对齐门」小节；`docs/constitution-spec.md` bump v2.2（§5 停点表 / §6 确认门点明反述确认）；`docs/interop/standards-map.md` 工具共存表补「外部 style guide / rules 文件 → memory §2」映射。
- **拒绝（不进入实现）**：contract→codegen 自动填充、越界拦截 / AST linter / 编译期打回、项目指纹索引器、强制单测生成 80%、`.ai-os-rules` 新配置文件、独立 PRD 工件、多端 UI 沙箱 / 实时预览。

## Affected artifacts

- 宪法 / 模板：`AGENTS.md`、lane `MISSION.md` / `DESIGN.md`、shared-root `memory.md`
- 文档：`docs/artifacts.md`、`docs/constitution-spec.md`（v2.2）、`docs/interop/standards-map.md`、`docs/problem-ledger.md`（PL-001 / PL-016 / PL-017 补锚点，不新增编号）
- 示例：`examples/greenfield-guided-product.md`（不新增第 9 个 example）
- doctor：**不新增 warning code**（反述确认是行为门、不可确定性机检；强加会变软检查、违背 v9.8+ 收敛方向）
- 测试 / 元数据：`test/docs.test.js`、`VERSION` / `package.json` / `package-lock.json`（→10.1.0）、`.ai-os/framework.toml`（本机）、`CHANGELOG.md`、`.cursor/rules/project-lead.mdc`
- self-hosted lane dogfood：本 CR、lane `MISSION.md`、`lane.toml`

## Acceptance delta

- AC-001：`AGENTS.md` §1 含反述确认门，行为规则提及结构化反述与 memory 架构护栏对照；文件 ≤150 行。
- AC-002：`MISSION.md` §2 含「核心主流程」「关键异常 / 边界分支」反述字段；`DESIGN.md` §4 点名契约层、§9 为反述 + 确认门。
- AC-003：`memory.md` §2 点名架构护栏 / 编码契约登记表，`EC-*` 含「类型」字段。
- AC-004：`docs/artifacts.md` 含「反述确认 / 双向对齐门」小节并点名 DESIGN §4 / memory §2；`constitution-spec.md` 为 v2.2 且 ≤160 行；`standards-map.md` 含 style guide → memory §2 映射且 ≤200 行。
- AC-005：`problem-ledger.md` 在 PL-001 / PL-016 / PL-017 补锚点，无新增 PL 编号；examples 仍为 8 个。
- AC-006：version 10.1.0 同步（VERSION / package.json / package-lock / framework.toml）；CHANGELOG 10.1.0 条目完整。
- AC-007：`npm test`、`npm run lint`、`node bin/ai-os-doctor.js .` 全部 0 错 0 警。

## Close/archive condition

- `npm test` 全部通过（断言数较 10.0.0 的 894 项有增加）。
- `npm run lint` 零警告；`node bin/ai-os-doctor.js .` 返回 0 错 0 警。
- VERSION / package.json / package-lock / `.ai-os/framework.toml` 升到 10.1.0。
- 变更提交并 push 到 `main`；待 push 后打 tag `v10.1.0`（叠在尚未 push 的 v10.0.0 之上，发布时先理清 v10.0.0 状态）。

## Rollback path

- 本轮纯行为规则 + 工件文案增强，无运行时 / schema / CLI 改动；从 git history 还原相关文件即可回退，不影响任何已安装项目的工件结构（canonical layout schema 仍为 `9`）。

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: ai-os 早有「目标与用户确认优先」原则，但缺一个**显式的、可被示例和模板承载的「反述确认」动作**——agent 在第一次 session 容易把「填完 MISSION 就问一句 confirm」当作对齐，而不是结构化反述「目标 / 主流程 / 状态流转 / 异常路径」让用户校正。这正是 PL-001 想拦的「需求一模糊就开工」在 frontier 模型时代的残留缺口（模型越强越按字面放大模糊目标）。架构护栏定位则是 PL-016/017 的承接点未被点名，用户不知道「架构规范字典」应落在 memory §2。
- **Maps to**: PL-001（需求模糊就开工 — 反述确认门强化）、PL-016（隐式跨层契约未登记）、PL-017（弱类型洞擦除契约 — 架构护栏登记 + 验证对照）。无新增编号。
- **Suggested guard**: 反述确认门落在 `AGENTS.md` §1（最高优先级落点）+ MISSION/DESIGN 模板 schema + greenfield example，不进 doctor（行为门不可确定性机检）。架构护栏靠 memory §2 模板字段 + 验证阶段对照承载，**坚决不新建 `.ai-os-rules`**（撞 PL-008 第二真理源红线）。后续若外部再提「平台 / runtime / codegen / sandbox」类建议，默认按红线拒绝，只抽取可落为行为规则 / 工件契约的内核。
