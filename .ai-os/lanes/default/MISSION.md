# AI-OS v10.1.1 Consistency Optimization Mission

## 1. 当前交付基线摘要

- **当前交付主题**：不做新功能的一致性优化（修活文档事实错误 + 去版本化遗漏 + dogfood lane 回正）
- **当前交付目标**：修两处确凿活文档错误（mcp-resources 操作数 / upgrade、CHANGELOG v10.1.0 spec 版本号）；补齐 v10.0.0 去版本化遗漏的 user-facing「AI-OS v9」措辞；把停滞在 v9.9 的 dogfood lane 工件重新同步到本轮交付；加一条 mcp-resources 回归 guard；按 patch 发布 v10.1.1
- **成功标准**：上述错误全部修复且无新引入矛盾；user-facing 输出 / 注释不再含读作框架版本的 v9；dogfood lane DESIGN / tasks / verification-matrix / MISSION / lane.toml 内部一致并指向本 CR；不新增 CLI / flag / doctor code / 工件类别 / spec 内容契约；2 operations、零依赖、AGENTS ≤150 行、schema `9`、spec v2.2 保持；npm test + lint + doctor self-check 全绿；version 同步到 10.1.1
- **项目模式**：change + brownfield（改 AI-OS 自身）
- **当前质量档位（quality_tier，真理源见 lane.toml）**：standard
- **当前风险档位（risk_tier，真理源见 lane.toml）**：medium
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260609-032059-consistency-optimization

## 2. 用户与闭环场景

- **目标用户**：AI-OS 项目负责人与维护 agent，痛点是「跨版本迭代后边缘文档 / 发布叙事 / dogfood lane 留下局部漂移」
- **关键场景**：负责人要求做一次「不加功能、只修不合理 / 错误 / 重复」的清理；agent 先全仓审计列出问题分档，确认范围后逐项修复并按 patch 收口
- **核心主流程（步骤化反述）**：
  1. 全仓审计（npm test / eslint / doctor + 文档交叉核对）列出错误 / 漂移 / 矛盾
  2. 按「确凿错误 / 自维护漂移 / 判断类」分档，与负责人确认范围（tier3 + patch 发布）
  3. 修事实错误 → 去版本化 → 重新同步 dogfood lane → 版本与测试收口
  4. npm test + lint + doctor 全绿后提交、打 tag、push
- **关键异常 / 边界分支**：若某「v9」实为 schema 代际引用 → 保留不改；若去版本化会破坏测试断言或 .gitignore 幂等（`# AI-OS v9 managed` 段头）→ 保留不改；若修复会扩张产品面 → 拒绝
- **当前最小可行闭环**：一次 patch（v10.1.1）内完成全部一致性修复 + 回归 guard + 发布收口
- **明确后续迭代项**：更深的全仓重复内容审计如有需要另起一轮；不在本轮新增任何功能

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续零依赖 Node.js CLI；本轮只改文案 / 注释 / 测试断言 / dogfood 工件 / 版本元数据
- **已确认目标运行态 / 部署约束**：AI-OS 仍是治理契约，不执行、不生成代码、不索引、不拦截编译
- **已确认质量优先级**：守不扩张红线 > 顺手加东西；机械可回归的修复（mcp guard）> 仅靠人工核对
- **已确认核心设计决策**：作为 patch 发布（bugfix / 文案修正 / 治理收口语义）；spec 内容契约不变仍 v2.2，仅修 CHANGELOG 笔误；dogfood lane 推进到 v10.1.1，历史由各 baseline-log CR 保留
- **已确认核心逻辑决策**：去版本化只动真正读作框架版本的 user-facing 字样，保留 schema 代际引用与受测试 / 幂等约束的段头

## 4. 范围边界与非目标

### 范围内

- 修 `docs/interop/mcp-resources.md` 操作数 / upgrade、`CHANGELOG.md` v10.1.0 spec 版本号
- 去版本化 `bin/ai-os-doctor.js` / `bin/shared.js` user-facing 输出与文件头注释、`README.md:101`
- 重新同步 dogfood lane `MISSION.md` / `DESIGN.md` / `tasks.yaml` / `verification-matrix.yaml` / `lane.toml` / `STATE.md`
- `test/docs.test.js` 加 mcp guard + 版本断言；版本元数据 → 10.1.1；`CHANGELOG.md` / `docs/maintainers.md` / `.cursor/rules/project-lead.mdc` 同步

### 范围外

- 新增 CLI 命令 / flag / profile / 配置字段 / schema 版本 / doctor warning code / 工件类别
- spec 内容契约变更（仅修 CHANGELOG 笔误，spec 仍 v2.2）
- 改动 schema 代际「v9」合理引用或 `# AI-OS v9 managed` 段头

### 非目标

- 借一致性清理之名引入任何新功能或扩张产品面
- 把具体模型 / IDE / 第三方工具名写进 framework 通用规则

## 5. 宿主项目相关上下文（按需引用根层 Mission）

- **本轮依赖的宿主项目事实**：v10.0.0 已把 CLI 收敛为 2 operations 并要求去版本化「AI-OS v9」；v10.1.0 已 bump spec 至 v2.2；canonical layout schema 保持 `9`
- **必须保持的共享基础设施约束**：AGENTS.md ≤150 行；constitution-spec ≤160 行且仍 v2.2；interop docs ≤200 行；2 primary product operations；zero runtime deps；canonical layout schema `9`
- **与其他 lane 的边界**：继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖
- **稳定风险**：去版本化误改 schema 代际引用或 `# AI-OS v9 managed` 段头 → 破坏语义或 .gitignore 幂等；缓解：逐处判定是否读作框架版本，改前核对测试断言。dogfood lane 回正被误解成重写历史 → 缓解：历史由 baseline-log CR 永久保留，只推进 live 工件
- **高风险触发因素**：不涉及用户资产、身份权限、跨用户数据或外部副作用，不升 high-risk
- **审批点**：项目负责人于 2026-06-09 确认 tier3 范围 + patch 发布 v10.1.1
