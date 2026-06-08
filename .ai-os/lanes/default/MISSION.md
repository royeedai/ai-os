# AI-OS v10.1 Restate-Confirm + Architecture Guardrail Mission

## 1. 当前交付基线摘要

- **当前交付主题**：double-loop alignment（反述确认）+ architecture guardrail 定位
- **当前交付目标**：从外部「AI 编码平台」建议中，只吸收两条与模型能力正交、零运行时的强化——实现前「双向对齐 + 反述确认」门，以及把「架构规范字典 / style guide」明确定位到 `.ai-os/memory.md` §2 并强化；其余 runtime / codegen / sandbox 类建议按红线拒绝
- **成功标准**：`AGENTS.md` 新增反述确认门且 ≤150 行；MISSION/DESIGN/memory 模板承载新 schema；docs（artifacts / constitution-spec v2.2 / standards-map）同步；problem-ledger 在 PL-001/016/017 补锚点不新增编号；examples 仍 8 个；version 升 10.1.0；不新增 CLI / doctor code / 工件类别；npm test + lint + doctor self-check 全绿
- **项目模式**：change + brownfield（改 AI-OS 自身）
- **当前质量档位（quality_tier，真理源见 lane.toml）**：standard
- **当前风险档位（risk_tier，真理源见 lane.toml）**：medium
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260608-153000-restate-confirm-arch-guardrail

## 2. 用户与闭环场景

- **目标用户**：用 AI-OS 在 frontier 模型（GPT-5.5 / Opus 4.8 世代）上做交付的个人开发者与团队，痛点是「模型很快、模糊目标被放大成错误实现」
- **关键场景**：需求 / 设计未锁时，agent 先结构化反述理解 → 用户一键确认或校正 → 再进入实现；维护既有系统时，架构护栏 / 编码契约登记在 memory §2，验证阶段逐条对照
- **核心主流程（步骤化反述）**：
  1. agent 填 lane `MISSION.md` 摘要
  2. agent 结构化反述目标 / 核心主流程 / 状态流转 / 关键异常路径（本节即范例）
  3. 用户确认或校正 → 锁定后进 `DESIGN.md`（§4 契约先行）
  4. 实现 → 验证阶段对照 memory §2 架构护栏
- **关键异常 / 边界分支**：用户不确认 → 回到 MISSION 修正，不进实现；外部建议命中红线 → 拒绝并只抽取可落为行为 / 工件的内核
- **当前最小可行闭环**：反述确认门（AGENTS + 模板 + example）+ 架构护栏定位（memory §2 + docs）一次性落地为 v10.1.0
- **明确后续迭代项**：不新增 CLI / flag / profile / runtime / codegen / sandbox / 第二真理源文件

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续零依赖 Node.js CLI；本轮只改行为规则 + 工件文案 + 测试 + 版本
- **已确认目标运行态 / 部署约束**：AI-OS 仍是治理契约，不执行、不生成代码、不索引、不拦截编译
- **已确认质量优先级**：守初心（不扩张红线）> 吸收外部建议；行为门 + 工件契约 > runtime / 平台功能
- **已确认核心设计决策**：反述确认是行为门，落 AGENTS.md §1 + 模板 + example，**不进 doctor**；架构护栏落 memory §2，**不新建 `.ai-os-rules`**
- **已确认核心逻辑决策**：不新增 PL 编号（强化 PL-001/016/017）；不新增第 9 个 example；constitution-spec bump v2.2（强化已有确认门，非新门类）

## 4. 范围边界与非目标

### 范围内

- `AGENTS.md` 反述确认门 + 验证对照护栏（克制行数）
- lane `MISSION.md` / `DESIGN.md` / shared-root `memory.md` 模板强化
- `docs/artifacts.md` / `docs/constitution-spec.md`（v2.2）/ `docs/interop/standards-map.md` 同步
- `docs/problem-ledger.md` 补锚点、`examples/greenfield-guided-product.md` 扩展
- `test/docs.test.js` 断言、version 元数据、CHANGELOG、project-lead 规则

### 范围外

- 新增 CLI 命令 / flag / profile / 配置字段 / schema 版本 / doctor warning code
- contract→codegen 自动填充、越界拦截 / AST linter、项目指纹索引器、强制单测生成
- `.ai-os-rules` 新配置文件、独立 PRD 工件、多端 UI 沙箱 / 实时预览

### 非目标

- 把外部建议里的平台 / runtime / 产品形态纳入 AI-OS
- 把具体模型 / IDE / 第三方工具名写进 framework 通用规则

## 5. 宿主项目相关上下文（按需引用根层 Mission）

- **本轮依赖的宿主项目事实**：AI-OS 已有 Activation Gate、五条核心要求、12 组工件、L1/L2/L3 渐进加载、Framework Feedback Loop 与「不做执行层」边界
- **必须保持的共享基础设施约束**：AGENTS.md ≤150 行；constitution-spec ≤160 行；interop docs ≤200 行；2 primary product operations；zero runtime deps；canonical layout schema `9`
- **与其他 lane 的边界**：继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖；外部建议仅作设计参考
- **稳定风险**：反述确认写得太重会变成模型已覆盖的软检查 → 只锁「必须结构化反述 + 等确认」的行为契约，不规定字数 / 格式细节；架构护栏若被误读成新建文件会破坏单一真理源 → 文档显式点名「就是 memory §2，不另建文件」
- **高风险触发因素**：不涉及用户资产、身份权限、跨用户数据或外部副作用，不升 high-risk
- **审批点**：项目负责人于 2026-06-08 确认采用「推荐集」并授权落地 v10.1.0
