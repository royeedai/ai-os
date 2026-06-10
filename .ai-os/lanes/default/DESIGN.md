# AI-OS v10.1.2 CLI Defects & Restate-Anchor Fixes Design

## 1. 设计目标

- **本轮设计目标**：在不新增任何功能的前提下，修复 CLI 真实缺陷（含静默误装与崩溃路径）、消除 v10.1.0 反述门节号的文档-模板分叉、清理去版本化残留，并为每类问题落机械回归 guard
- **需要先锁定的关键决策**：反述门节号统一方向（改文档还是改模板）；已移除子命令的守卫方式；doctor 类型加固的报告口径（复用 E022 还是新增 code）；哪些「中」级 bin 问题明确不修
- **必须用户确认的核心设计决策**：整体修复方案（CLI 缺陷 + §10 统一 + 去版本化 + 示例对齐 + dogfood 收口）+ patch 发布 v10.1.2

## 2. 信息架构

- 不适用（N/A）：本轮非 UI 交付

## 3. 关键页面与交互

- 不适用（N/A）：无 UI 页面

## 4. 核心接口与数据模型（契约层）

- **CLI 入口契约（防御性收紧，无语义变更）**：`REMOVED_SUBCOMMANDS = { upgrade }` 在子命令路由前精确匹配并 `fail()`；未知首参仍按目标目录处理（`create-ai-os my-project` 不受影响）。`runInstall` 识别 `-h/--help`；目标路径存在且非目录时 `fail()`。退出码语义不变（0 成功 / 1 错误）
- **doctor 检查契约**：`checkArtifact` 对 `type === "file"` 增加 `isFile()` 判断，类型不匹配复用既有 E022（不新增 code）；新增内部 helper `isRegularFile` / `readTextFile`，全部语义检查只读常规文件，类型错误由 checkArtifact 单点报告、语义检查静默跳过
- **shared 契约**：`readMetadata` 对目录路径返回 null；删除 `readText` 死导出（无调用方，非破坏）

## 5. 关键流程

1. 三路并行审计（bin/ 缺陷、文档漂移、模板与示例一致性）→ 汇总分级
2. CLI 缺陷修复 + 回归测试（首跑暴露 doctor EISDIR 深层崩溃 → 扩入同类加固）
3. 文档反述门锚点 §9 → §10（artifacts / spec / ledger / maintainers / CHANGELOG）+ docs.test 节号断言
4. 去版本化残留清理 → greenfield / eval 对齐 → dogfood lane 推进 → 版本收口 10.1.2

## 6. 共享基础设施审计（brownfield / change 必填）

- **受影响的共享组件**：CLI 三个源文件、三个测试文件、五份文档、两个示例文件、两个 eval、CHANGELOG、版本元数据、dogfood lane 工件
- **受影响的接口 / 行为清单**：新增行为仅两项且均为「错误路径变友好」——已移除子命令从静默误装变为报错；目标为文件从裸异常变为友好报错。`install --help` 从报错变为打印帮助。doctor 对类型错误路径从崩溃 / 漏检变为 E022。其余 CLI 行为、退出码、warning code 范围、工件 schema 全部不变
- **同仓正常实现对照**：守卫与报错走既有 `fail()`；E022 复用既有 code 与文案风格；测试沿用既有 helpers（runInstall / runDoctor / tmpDir）
- **副作用清单**：AGENTS.md 不动（121 行）；framework/ 模板不动（节号统一方向 = 文档跟模板）；spec 仍 v2.2（节号属笔误修正）；`# AI-OS v9 managed` 段头不动；schema 仍 `9`

## 7. UI Source Routing

- 不适用（N/A）：非前端 UI 项目

## 8. 对照参考（reverse-spec 必填）

- 不适用（N/A）：对照源为仓库自身真理源（分发模板 `framework/.agents/templates/lane/DESIGN.md` §10、VERSION、v10.1.0 CR 原文）

## 9. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | `create-ai-os upgrade` 报错退出且不创建目录；`install --help` / `-h` 打印帮助；目标为已存在文件时友好报错且不触碰该文件 | 自动化 | `test/install.test.js` 三组新 section |
| AC-002 | REQ-001 | file 工件实为目录时 doctor 报 E022 退出 1，语义检查全链路不 EISDIR 崩溃；`readText` 死导出删除 | 自动化 | `test/doctor.test.js` E022 section + `npm run lint` |
| AC-003 | REQ-002 | 五份文档反述门锚点统一 DESIGN §10；docs.test 含节号级断言（§9 = 验收标准、§10 = 反述门、禁止再锚 §9） | 自动化 | `test/docs.test.js` 节号断言 |
| AC-004 | REQ-003 | maintainers 无 upgrade 残留且表述去版本化；examples/README、spec-kit-coexistence 无「AI-OS v9」；CHANGELOG 头部覆盖 v10.x | `npm test` + 人工核对 | `rg "AI-OS v9"` 仅剩能力引入标签 |
| AC-005 | REQ-004 | greenfield 含 DESIGN §10 反述示范且 AC 节号 = Section 9；两个 eval 用「反述确认门（§10）」术语 | `npm test` + 人工核对 | `examples/greenfield-guided-product.md` / 两个 eval |
| AC-006 | REQ-005 | dogfood lane 工件同步到 v10.1.2 并指向本 CR；DESIGN §10 节名对齐模板 | `node bin/ai-os-doctor.js .` | 本 lane 工件 + W070 一致性 |
| AC-007 | REQ-006 | 版本元数据 = 10.1.2；CHANGELOG 含 10.1.2 条目；cli.md / maintainers / project-lead 同步；npm test + lint + doctor 全绿；无产品面扩张 | `npm test` + `npm run lint` + doctor | 验证日志 + product surface tests |

## 10. 反述确认门（设计锁定前必经）

> 进入大规模实现前，agent 先反述对关键设计的理解，用户确认或校正后才锁定（见 `AGENTS.md` §1 反述确认）。

- **agent 反述的关键设计理解**：目标 = 不加功能修三类问题（CLI 缺陷 / §9-§10 分叉 / 去版本化残留）；关键决策 = 文档统一到 §10 而非改模板（已分发版本不再挪节号）、已移除子命令显式守卫清单、E022 复用不新增 code、五项「中」级 bin 问题明确不修；异常路径 = 修复中暴露的 doctor EISDIR 崩溃纳入同类加固
- **用户确认 / 校正**：项目负责人确认「v10.1.2 一致性与缺陷修复」计划全部六个 todo（含 §10 统一方向与 patch 发布），无校正项
- **确认日期**：2026-06-10
