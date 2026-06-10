# CR-20260610-024200-cli-defects-restate-anchor-fixes

- **Type**: change-request (patch / non-breaking — 缺陷修复 + 一致性收口，无新功能)
- **Status**: confirmed
- **Date**: 2026-06-10
- **Summary**: 不引入新功能的缺陷与一致性修复。修 5 处 CLI 缺陷（已移除子命令 `upgrade` 被静默当作目标目录安装、`install` 子命令不识别 `--help`、目标路径为已存在文件时裸异常崩溃、doctor 对「file 工件实为目录」漏报 E022 且后续语义检查 EISDIR 裸崩、`shared.readText` 死导出）；统一反述确认门节号为 DESIGN §10（v10.1.0 CR AC 写 §9，落地模板为 §10，文档全部跟错）；清理 maintainers 最后一处 `upgrade` 残留与 examples/README、spec-kit-coexistence 的「AI-OS v9」去版本化遗漏；greenfield 示例补 DESIGN 层反述示范并修 AC 节号；两个 eval 术语从「设计确认记录」更新为「反述确认门」。零运行时依赖、不新增 CLI / flag / doctor code / 工件类别；2 primary operations、schema `9`、spec v2.2 保持。Released as v10.1.2。
- **Affects**: `bin/create-ai-os.js`, `bin/ai-os-doctor.js`, `bin/shared.js`, `test/install.test.js`, `test/doctor.test.js`, `test/docs.test.js`, `docs/artifacts.md`, `docs/constitution-spec.md`, `docs/problem-ledger.md`, `docs/maintainers.md`, `docs/cli.md`, `docs/interop/spec-kit-coexistence.md`, `examples/README.md`, `examples/greenfield-guided-product.md`, `evals/missing-user-confirmation.md`, `evals/logic-right-but-product-shape-wrong.md`, `CHANGELOG.md`, `VERSION`, `package.json`, `package-lock.json`, `.ai-os/framework.toml`, `.cursor/rules/project-lead.mdc`, `.ai-os/lanes/default/*`
- **Confirmed by**: project owner, 2026-06-10（确认「v10.1.2 一致性与缺陷修复」计划：CLI 缺陷 + §9/§10 统一为 §10 + 去版本化残留 + 示例对齐 + dogfood 收口，patch 发布）

## Trigger

项目负责人要求「不引入新功能情况下，找出问题并制定修复方案」。全仓体检（npm test / eslint / doctor 全绿）后由三路并行审计（bin/ 缺陷、文档漂移、模板与示例一致性）定位出三类问题：CLI 缺陷、v10.1 反述门节号的文档-模板分叉、v10 去版本化与 upgrade 残留。

## Current behavior

- `bin/create-ai-os.js` `main()` 对未知首参直接走 `runInstall(argv)`：`npx create-ai-os upgrade`（旧文档 / 肌肉记忆）会创建 `./upgrade/` 目录并装入整套 AI-OS，零提示。
- `create-ai-os install --help` 报 `unknown option: --help`，与顶层 `--help` 行为不一致。
- install 目标路径指向已存在文件时 `ensureDir` 抛 ENOTDIR 裸异常而非友好报错。
- doctor `checkArtifact` 对 `type === "file"` 只查 size：路径实为目录时不报 E022，且后续 `checkBaselineConsistency` 等语义检查直接 `readFileSync` 该路径，EISDIR 裸崩（修复回归测试首跑时实际复现）。
- `bin/shared.js` 的 `readText` 导出无任何调用方（死代码）。
- v10.1.0 的 CR AC-002 写「`DESIGN.md` §9 改造为反述 + 确认门」，但落地模板把验收标准留在 §9、反述门放在 §10，且未记 `deviation_log`；`docs/artifacts.md` / `docs/constitution-spec.md` / `docs/problem-ledger.md` / `docs/maintainers.md` / `CHANGELOG.md` v10.1.0 条目全部跟着 AC 写 §9，与分发模板分叉。
- `docs/maintainers.md:138` guard 落点仍写「影响所有 install / upgrade」；`maintainers.md` 章节标题「v9 当前真相」、「3 个 CLI 子命令」前置表述、npm 检查项「v9 默认走 npx」，`examples/README.md`「Canonical AI-OS v9」、`docs/interop/spec-kit-coexistence.md` 三处「AI-OS v9」均为去版本化遗漏；`CHANGELOG.md` 头部仍写「tracks recent v9 releases」。
- `examples/greenfield-guided-product.md` 只示范了 MISSION 层反述（CHANGELOG 宣称 "Demonstrated" 偏满），且 AC 节号写「Section 8」（实为 §9）；两个 eval（missing-user-confirmation、logic-right-but-product-shape-wrong）仍用 v10.1 前的「设计确认记录」术语。

## Proposed delta

- **CLI 缺陷**：`create-ai-os.js` 增加 `REMOVED_SUBCOMMANDS` 守卫（`upgrade` 命中即 fail 并指向 install）；`runInstall` 识别 `-h/--help`；目标为已存在文件时 `fail()` 友好报错。doctor `checkArtifact` 补 `isFile()` 判断报 E022；新增 `isRegularFile` / `readTextFile` helper，全部语义检查（AGENTS / gitignore / baseline / W071-W078 / W072 / W074）改为只读常规文件，杜绝 EISDIR 崩溃；`shared.readMetadata` 对目录返回 null；删除 `readText` 死导出。
- **节号统一（决策：文档跟模板，统一为 §10）**：模板不动（已随 v10.1.0/v10.1.1 分发，再挪节号会制造第三种状态；反述门作为设计锁定前最后一步放在验收标准之后时序更合理）。`docs/artifacts.md` ×2、`docs/constitution-spec.md` ×2（仅节号笔误修正，不 bump spec）、`docs/problem-ledger.md`、`docs/maintainers.md`、`CHANGELOG.md` v10.1.0 条目（沿 v10.1.1 修 spec 版本号笔误的先例回改）全部 §9 → §10。
- **去版本化与残留**：`maintainers.md` guard 落点去 upgrade、标题与 CLI 数量表述去版本化；`examples/README.md`、`spec-kit-coexistence.md` 去「AI-OS v9」；`CHANGELOG.md` 头部改为「releases from v9.5 onward (current line: v10.x)」。保留能力引入版本标签（v9.4 handoff 等）与 schema 代际引用。
- **示例与 eval**：greenfield Step 2 补 DESIGN §10 反述确认门示范、AC 节号 §8 → §9；两个 eval「设计确认记录」→「反述确认门（§10）确认记录」。
- **回归 guard**：`test/install.test.js` 新增已移除子命令 / install --help / 目标为文件三组测试；`test/doctor.test.js` 新增 file 工件为目录的 E022 测试；`test/docs.test.js` 把「反述确认门」字符串断言强化为节号级断言（模板 §9 = 验收标准、§10 = 反述确认门；docs 不得再锚 §9 且必须正面锚 §10）。
- **拒绝**：不修参数解析顺序、metadata/manifest 无条件覆写、`--force` 孤儿 BL、W002 仅比较 major、手写 YAML 解析器边界（设计取舍，避免 patch 扩面）；不新增任何 CLI / flag / doctor code / 工件类别。

## Affected artifacts

- CLI 源码：`bin/create-ai-os.js`、`bin/ai-os-doctor.js`、`bin/shared.js`（缺陷修复，无产品面扩张）
- 文档：`docs/artifacts.md`、`docs/constitution-spec.md`、`docs/problem-ledger.md`、`docs/maintainers.md`、`docs/cli.md`（补已移除子命令报错与 install --help 说明）、`docs/interop/spec-kit-coexistence.md`、`CHANGELOG.md`
- 示例 / eval：`examples/README.md`、`examples/greenfield-guided-product.md`、`evals/missing-user-confirmation.md`、`evals/logic-right-but-product-shape-wrong.md`
- 测试 / 元数据：`test/install.test.js`、`test/doctor.test.js`、`test/docs.test.js`、`VERSION` / `package.json` / `package-lock.json`（→ 10.1.2）、`.ai-os/framework.toml`（本机）、`.cursor/rules/project-lead.mdc`
- doctor：**不新增 warning code**（E022 为既有 code 的正确触发）
- self-hosted lane dogfood：本 CR、`MISSION.md`、`DESIGN.md`（§10 对齐模板「反述确认门」节名）、`tasks.yaml`、`verification-matrix.yaml`、`lane.toml`、`STATE.md`

## Acceptance delta

- AC-001：`create-ai-os upgrade` 报错退出且不创建目录；`install --help` / `install -h` 打印帮助；目标为已存在文件时友好报错且不触碰该文件。
- AC-002：file 工件实为目录时 doctor 报 E022 退出 1，全链路语义检查不再 EISDIR 崩溃；`readText` 死导出删除。
- AC-003：`artifacts.md` / `constitution-spec.md` / `problem-ledger.md` / `maintainers.md` / `CHANGELOG.md` 反述门锚点统一为 DESIGN §10；`test/docs.test.js` 含节号级断言（§9 = 验收标准、§10 = 反述确认门、docs 禁止再锚 §9）。
- AC-004：`maintainers.md` 无 install / upgrade 残留且标题与 CLI 数量表述去版本化；`examples/README.md` / `spec-kit-coexistence.md` 无读作框架版本的「AI-OS v9」；`CHANGELOG.md` 头部覆盖 v10.x。
- AC-005：greenfield 含 DESIGN §10 反述确认门示范且 AC 节号为 Section 9；两个 eval 使用「反述确认门（§10）」术语。
- AC-006：dogfood lane `MISSION.md` / `DESIGN.md` / `tasks.yaml` / `verification-matrix.yaml` / `lane.toml` 同步到 v10.1.2 并指向本 CR，`DESIGN.md` §10 节名对齐模板。
- AC-007：`VERSION` / `package.json` / `package-lock.json` / `.ai-os/framework.toml` = 10.1.2；`CHANGELOG.md` 含 10.1.2 条目；`docs/cli.md` / `docs/maintainers.md` / `.cursor/rules/project-lead.mdc` 同步；npm test / lint / doctor self-check 全绿；无新增 CLI / flag / doctor code / 工件类别。

## Close/archive condition

- `npm test` 全部通过（断言数较 10.1.1 的 984 增加，因新增 CLI 回归与节号断言）。
- `npm run lint` 零警告；`node bin/ai-os-doctor.js .` 0 错 0 警。
- 版本元数据升到 10.1.2，提交并 push 到 `main`，打 tag `v10.1.2` 并 push。

## Rollback path

- CLI 改动为纯防御性缺陷修复（新增守卫与类型检查，无接口 / schema / 退出码语义变更）；文档与示例为文本修正。从 git history 还原相关文件即可回退，不影响已安装项目的工件结构（canonical layout schema 仍为 `9`）。

## Preventability review

- **Preventable**: partial
- **If yes, root cause**: 两个独立根因。(1) **CR AC 与落地偏离未记 deviation**：v10.1.0 CR AC-002 写「DESIGN §9 改造为反述门」，实现时把反述门放到 §10（验收标准留 §9）却没有在 `deviation_log` 留痕，也没回改 AC 或文档，导致 5 份文档全部沿用 AC 的 §9 错误锚点——这恰是 W076 / `deviation_log` 治理对象在框架自身维护上的踩坑；当时测试只断言「反述确认门」字符串存在而非节号，guard 粒度不足以拦截。(2) **移除产品面时未守住入口**：v10.0.0 删除 `upgrade` 子命令时只删了实现，没有为旧入口加误用守卫，叠加 CLI「未知首参 = 目标目录」的默认路由，形成静默误装路径；同根的「类型不匹配路径」（file 工件实为目录）在 doctor 中也长期缺守卫，直到本轮回归测试首跑才暴露 EISDIR 崩溃。
- **Maps to**: PL-001（文档真相分叉——本轮第 ≥2 次命中「多文件同步遗漏」同根，已按规则落机械 guard）；`AGENTS.md` 行为规则「偏离走 deviation_log」；`docs/maintainers.md` §「canonical 变更必须多文件同步」。无新增 PL 编号（CLI 误用守卫属一次性缺陷修复，未见第二根因实例）。
- **Suggested guard**: 已落地——`test/docs.test.js` 节号级断言（锁文档-模板锚点一致）；`test/install.test.js` 已移除子命令守卫断言（锁旧入口误用）；`test/doctor.test.js` E022 类型断言（锁类型不匹配崩溃）。维护惯例增补：今后 major 移除任何 CLI 入口时，必须同步在 `REMOVED_SUBCOMMANDS` 留守卫并配测试；CR 落地与 AC 不一致时，要么改实现、要么当场回改 AC + 文档并记 `deviation_log`，不允许静默分叉。
