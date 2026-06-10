# AI-OS v10.1.2 CLI Defects & Restate-Anchor Fixes Mission

## 1. 当前交付基线摘要

- **当前交付主题**：不引入新功能的缺陷修复 + 一致性收口（CLI 缺陷 ×5、反述门节号文档-模板分叉、去版本化与 upgrade 残留、示例与 eval 对齐）
- **当前交付目标**：修复已移除子命令静默误装、install --help、目标为文件崩溃、doctor 类型漏检与 EISDIR 崩溃、死导出；文档反述门锚点统一为 DESIGN §10 并落节号级回归断言；清理 maintainers / examples / spec-kit-coexistence / CHANGELOG 头部的版本化残留；greenfield 补 DESIGN 层反述示范；dogfood lane 推进到本轮；按 patch 发布 v10.1.2
- **成功标准**：`create-ai-os upgrade` 报错不再创建目录；`install --help` 可用；目标为文件时友好报错；file 工件为目录时 doctor 报 E022 且不崩溃；五份文档反述门锚点 = §10 且被测试锁定；活文档无 upgrade / 读作框架版本的 v9 残留；npm test + lint + doctor self-check 全绿；不新增 CLI / flag / doctor code / 工件类别
- **项目模式**：change + brownfield（改 AI-OS 自身）
- **当前质量档位（quality_tier，真理源见 lane.toml）**：standard
- **当前风险档位（risk_tier，真理源见 lane.toml）**：medium
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260610-024200-cli-defects-restate-anchor-fixes

## 2. 用户与闭环场景

- **目标用户**：AI-OS 项目负责人与维护 agent，痛点是「体检全绿的仓库里仍藏着 CLI 误用路径与 spec-落地分叉」
- **关键场景**：负责人要求「不引入新功能，找问题、定修复方案」；agent 三路并行审计（bin/ 缺陷、文档漂移、模板与示例一致性）后按计划修复并 patch 收口
- **核心主流程（步骤化反述）**：
  1. 全仓体检（test / lint / doctor / 版本一致性）确认基础面，三路审计定位问题
  2. 制定修复方案并经负责人确认（CLI 缺陷 + §10 统一 + 去版本化 + 示例对齐 + dogfood 收口）
  3. 修 CLI 缺陷并补回归测试 → 文档节号统一 + 节号断言 → 残留清理 → 示例 / eval 对齐
  4. dogfood lane 推进（CR + Preventability review + DESIGN §10 节名对齐）
  5. 版本收口 10.1.2，npm test + lint + doctor 全绿后提交、打 tag、push
- **关键异常 / 边界分支**：修复中暴露更深缺陷（doctor EISDIR 崩溃）→ 纳入同一缺陷修复范畴统一加固；「中」级 bin 问题属设计取舍（参数顺序、metadata 覆写、W002 major 比较等）→ 明确不修，记录在 CR 拒绝项；节号统一若改模板会再次漂移已安装项目 → 决策文档跟模板（§10）
- **当前最小可行闭环**：一次 patch（v10.1.2）内完成全部缺陷修复 + 回归 guard + 发布收口
- **明确后续迭代项**：被拒绝的「中」级 CLI 设计取舍如有真实用户问题再单独评估；不在本轮新增任何功能

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续零依赖 Node.js CLI；本轮改 bin 防御性守卫 + 文档 / 示例 / 测试 / dogfood 工件
- **已确认目标运行态 / 部署约束**：AI-OS 仍是治理契约，不执行、不生成代码、不索引、不拦截编译
- **已确认质量优先级**：缺陷修复必须配机械回归 guard > 仅靠人工核对；守不扩张红线 > 顺手加东西
- **已确认核心设计决策**：反述门节号统一方向 = 文档跟模板（§10），模板不动（已分发两个版本，挪节号制造第三种状态；反述门放设计文档最后一节时序合理）；CHANGELOG v10.1.0 条目笔误回改沿 v10.1.1 先例；作为 patch 发布
- **已确认核心逻辑决策**：已移除子命令用显式守卫清单（`REMOVED_SUBCOMMANDS`）报错，不改「未知首参 = 目标目录」的默认路由语义；doctor 语义检查统一「只读常规文件」，E022 由 checkArtifact 单点报告

## 4. 范围边界与非目标

### 范围内

- `bin/create-ai-os.js` / `bin/ai-os-doctor.js` / `bin/shared.js` 缺陷修复与防御加固
- `docs/artifacts.md` / `constitution-spec.md` / `problem-ledger.md` / `maintainers.md` / `CHANGELOG.md` 反述门锚点 §9 → §10
- `maintainers.md` upgrade 残留与版本化表述、`examples/README.md` / `spec-kit-coexistence.md` 去版本化、CHANGELOG 头部
- `examples/greenfield-guided-product.md` DESIGN §10 反述示范 + AC 节号、两个 eval 术语
- `test/install.test.js` / `doctor.test.js` / `docs.test.js` 回归 guard；`docs/cli.md` 行为说明
- dogfood lane 全套推进；版本元数据 → 10.1.2；`.cursor/rules/project-lead.mdc` 同步

### 范围外

- 新增 CLI 命令 / flag / profile / doctor warning code / 工件类别 / schema 版本
- spec 内容契约变更（节号为笔误修正，spec 仍 v2.2）
- 参数解析顺序、metadata/manifest 覆写策略、`--force` 孤儿 BL、W002 major 比较、手写 YAML 解析器边界（明确不修的设计取舍）

### 非目标

- 借缺陷修复之名扩张产品面或重构 CLI 参数体系
- 回改历史 CR 正文（v10.1.0 CR 的 AC 偏离由本轮 CR 的 Preventability review 记录，不篡改历史）

## 5. 宿主项目相关上下文（按需引用根层 Mission）

- **本轮依赖的宿主项目事实**：v10.0.0 已移除 upgrade（CLI = install + doctor）；v10.1.0 反述门落地模板为 DESIGN §10（AC 写 §9 未记 deviation）；v10.1.1 已建立「回改近期 CHANGELOG 条目笔误」先例；canonical layout schema 保持 `9`
- **必须保持的共享基础设施约束**：AGENTS.md ≤150 行；constitution-spec ≤160 行且仍 v2.2；2 primary product operations；zero runtime deps；canonical layout schema `9`；`# AI-OS v9 managed` 段头不动（.gitignore/.gitattributes 幂等）
- **与其他 lane 的边界**：继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖
- **稳定风险**：节号统一漏改某处文档造成新分叉 → 缓解：docs.test.js 节号级断言（禁止 §9 锚点 + 正面断言 §10）；CLI 守卫误伤合法目录名 → 缓解：守卫仅精确匹配已移除子命令清单（当前仅 `upgrade`），`create-ai-os my-project` 语义不变
- **高风险触发因素**：不涉及用户资产、身份权限、跨用户数据或外部副作用，不升 high-risk
- **审批点**：项目负责人于 2026-06-10 确认「v10.1.2 一致性与缺陷修复」计划并批准执行
