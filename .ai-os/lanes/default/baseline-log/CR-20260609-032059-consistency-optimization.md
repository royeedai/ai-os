# CR-20260609-032059-consistency-optimization

- **Type**: change-request (patch / non-breaking — 一致性优化，无功能变更)
- **Status**: confirmed
- **Date**: 2026-06-09
- **Summary**: 不做新功能的一致性优化。修两处确凿的活文档事实错误（`docs/interop/mcp-resources.md` 仍写 3 operations + `upgrade`，与同文件自相矛盾；`CHANGELOG.md` v10.1.0 条目把 spec 写成 v2.1 实为 v2.2），补齐 v10.0.0 去版本化遗漏的 user-facing「AI-OS v9」措辞（doctor 输出 / 注释 / README），并把停滞在 v9.9 的 dogfood lane 工件（DESIGN / tasks / verification-matrix）重新同步到当前交付。零运行时、不新增 CLI / doctor code / 工件类别 / flag；2 primary operations、canonical layout schema `9`、spec 仍 v2.2 不变。Released as v10.1.1。
- **Affects**: `docs/interop/mcp-resources.md`, `CHANGELOG.md`, `bin/ai-os-doctor.js`, `bin/shared.js`, `README.md`, `docs/maintainers.md`, `test/docs.test.js`, `test/doctor.test.js`, `test/shared.test.js`, `test/install.test.js`, `VERSION`, `package.json`, `package-lock.json`, `.ai-os/framework.toml`, `.cursor/rules/project-lead.mdc`, `.ai-os/lanes/default/MISSION.md`, `.ai-os/lanes/default/DESIGN.md`, `.ai-os/lanes/default/tasks.yaml`, `.ai-os/lanes/default/verification-matrix.yaml`, `.ai-os/lanes/default/STATE.md`, `.ai-os/lanes/default/lane.toml`
- **Confirmed by**: project owner, 2026-06-09（确认 tier3：修事实错误 + 去版本化遗漏 v9 措辞 + 重新同步 dogfood lane，并按 patch 发布 v10.1.1）

## Trigger

项目负责人要求「本次不做新功能，优化下不合理、错误、重复等」。全仓审计（npm test / eslint / doctor + 文档交叉核对）后定位到三类问题：活文档事实错误、去版本化遗漏、dogfood lane 工件版本漂移。

## Current behavior

- `docs/interop/mcp-resources.md` 第 7 行写「three primary product operations (`install` / `doctor` / `upgrade`)」——`upgrade` 已在 v10.0.0 删除，且与同文件第 127 行的「2 primary product operations」自相矛盾。
- `CHANGELOG.md` v10.1.0 条目第 25、30 行写 constitution-spec「bumped to **v2.1**」，但实际 spec 头部、spec changelog、`docs/maintainers.md` 与测试均为 **v2.2**（v2.1 是 v9.9 的版本，属 off-by-one 笔误）。
- v10.0.0 的 CR 要求 de-version user-facing「AI-OS v9」措辞（schema 保持 9），但有遗漏：`bin/ai-os-doctor.js` 用户可见输出仍说「AI-OS v9 project looks healthy」、W010「v9 target: <=150」，`README.md` 仍说「no slash commands in v9」，`bin/` 顶部注释仍写「AI-OS v9」。
- dogfood lane `MISSION.md` 已是 v10.1.0，但同 lane 的 `DESIGN.md`（标题 / 正文仍「v9.9 Design-Aware UI」）、`tasks.yaml`（`baseline_id` + 全部任务仍 v9.9）、`verification-matrix.yaml`（failure_modes 全是 `FM-V990-*`、「同步到 9.9.0」）停滞在 v9.9，与 MISSION.md / baseline-log 的 v10.1.0 不一致。

## Proposed delta

- **修事实错误**：`mcp-resources.md` 第 7 行改为「two primary product operations (`install` / `doctor`)」；`CHANGELOG.md` v10.1.0 条目两处 `v2.1` → `v2.2`。
- **去版本化**：`bin/ai-os-doctor.js` 报告「AI-OS project looks healthy」、W010「(target: <=150)」、文件头注释「AI-OS doctor」；`bin/shared.js` 头注释「AI-OS CLI shared utilities」；`README.md`「There are no slash commands.」。**不动** schema 代际引用（`docs/cli.md`「v9 canonical layout」、`docs/artifacts.md`「v9 起」、doctor W011「pre-v9 file」、`bin/shared.js` 内部 `(v9)` 注释）与 `# AI-OS v9 managed` 段头（受 `test/shared.test.js` 断言且用于 .gitignore/.gitattributes 幂等）。
- **重新同步 dogfood lane**：把 `MISSION.md` / `DESIGN.md` / `tasks.yaml` / `verification-matrix.yaml` / `lane.toml` / `STATE.md` 推进到本轮 v10.1.1 优化交付，`baseline_id` 指向本 CR；v9.9 / v10.0.0 / v10.1.0 历史仍由各自 baseline-log CR 永久保留。
- **回归 guard**：`test/docs.test.js` 新增断言锁住 mcp-resources 的 2-operation 修复（含「不再出现 upgrade」）。
- **拒绝**：不借机新增任何功能、CLI、flag、doctor warning code、工件类别或 spec 内容契约变更。

## Affected artifacts

- 文档：`docs/interop/mcp-resources.md`、`CHANGELOG.md`、`README.md`、`docs/maintainers.md`（版本矩阵补 v10.1.1 行）
- CLI 源码：`bin/ai-os-doctor.js`、`bin/shared.js`（仅 user-facing 措辞 / 注释，无逻辑变更）
- 测试 / 元数据：`test/docs.test.js`（mcp guard + 版本断言）、`test/doctor.test.js`、`test/shared.test.js`、`test/install.test.js`（版本断言 → 10.1.1）、`VERSION` / `package.json` / `package-lock.json`（→ 10.1.1）、`.ai-os/framework.toml`（本机）、`.cursor/rules/project-lead.mdc`
- doctor：**不新增 warning code**
- self-hosted lane dogfood：本 CR、`MISSION.md`、`DESIGN.md`、`tasks.yaml`、`verification-matrix.yaml`、`lane.toml`、`STATE.md`

## Acceptance delta

- AC-001：`mcp-resources.md` 写「two primary product operations (`install` / `doctor`)」且不再出现 `upgrade`；`CHANGELOG.md` v10.1.0 条目 spec 为 v2.2，与 spec 头部 / maintainers / 测试一致。
- AC-002：`bin/ai-os-doctor.js` 与 `bin/shared.js` 的 user-facing 输出 / 文件头注释不再含读作框架版本的「v9」；schema 代际引用与 `# AI-OS v9 managed` 段头保留不动。
- AC-003：dogfood lane `DESIGN.md` / `tasks.yaml` / `verification-matrix.yaml` / `MISSION.md` / `lane.toml` 同步到 v10.1.1，`baseline_id` 全部指向本 CR，内部一致。
- AC-004：`test/docs.test.js` 含锁住 mcp-resources 2-operation 修复的断言。
- AC-005：`VERSION` / `package.json` / `package-lock.json` / `.ai-os/framework.toml` = 10.1.1；`CHANGELOG.md` 含完整 10.1.1 条目；`docs/maintainers.md` 含 v10.1.1 行；`.cursor/rules/project-lead.mdc` 版本 / tag / spec / 测试计数同步。
- AC-006：无新增 CLI / flag / doctor code / 工件类别；2 primary operations、零运行时依赖、`AGENTS.md` ≤150 行、canonical layout schema `9`、constitution-spec 仍 v2.2 全部保持。
- AC-007：`npm test`、`npm run lint`、`node bin/ai-os-doctor.js .` 全部 0 错 0 警。

## Close/archive condition

- `npm test` 全部通过（断言数较 10.1.0 的 979 项略增，因新增 mcp guard）。
- `npm run lint` 零警告；`node bin/ai-os-doctor.js .` 返回 0 错 0 警。
- `VERSION` / `package.json` / `package-lock.json` / `.ai-os/framework.toml` 升到 10.1.1。
- 变更提交并 push 到 `main`，打 tag `v10.1.1` 并 push。

## Rollback path

- 本轮纯文案 / 注释 / 测试断言 / dogfood 工件改动，无运行时 / schema / CLI 接口变更；从 git history 还原相关文件即可回退，不影响任何已安装项目的工件结构（canonical layout schema 仍为 `9`）。

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: 三类问题都源于「多文件同步」在跨版本迭代中漏了局部更新——(1) v10.0.0 删 `upgrade` 时漏改 interop 边缘文档与 doctor 用户输出；(2) v10.1.0 写 CHANGELOG 时复制了上一版的 spec 版本号；(3) v10.0.0 / v10.1.0 推进 MISSION / docs / 模板时，dogfood lane 的 DESIGN / tasks / verification-matrix 未一起回正。这正是 PT-001 / PL-001「文档真相与安装真相分叉」的同根表现：缺一个「每次跨版本改动后对边缘文档 + dogfood lane + 发布叙事做一次一致性回扫」的机械习惯。
- **Maps to**: PL-001（文档真相分叉 — 本轮加 mcp-resources guard 防回归）、`docs/maintainers.md` 维护规则 §「canonical 变更必须多文件同步」。无新增 PL 编号。
- **Suggested guard**: 新增 `test/docs.test.js` 对 mcp-resources operation 数量的断言（机械锁住第一类错误）。其余两类（发布叙事版本号、dogfood lane 回正）继续靠 `docs/maintainers.md` 的发布前一致性回扫清单 + maintainer `git grep` 承载，不引入新的 doctor code（避免软检查反弹，守 v9.8+ 收敛方向）。后续每次 minor/major 发布前，按 project-lead 规则的「发布检查清单」逐项核对 docs/interop、CHANGELOG 版本锚点与 dogfood lane 工件是否与当前版本一致。
