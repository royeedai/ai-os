# AI-OS v10.1.1 Consistency Optimization Design

## 1. 设计目标

- **本轮设计目标**：在不新增任何功能的前提下，消除跨版本迭代后残留的活文档事实错误、user-facing 版本号漂移与 dogfood lane 工件漂移，使仓库内部表述自洽
- **需要先锁定的关键决策**：哪些「v9」是合理的 schema 代际引用（保留）、哪些是读作框架版本的遗漏（去版本化）；dogfood lane 推进到 v10.1.1 而非重写历史；作为 patch 发布
- **必须用户确认的核心设计决策**：tier3 范围（事实错误 + 去版本化 + lane 回正）+ patch 发布 v10.1.1；不借机扩张产品面

## 2. 信息架构

- 不适用（N/A）：本轮非 UI / 非信息架构交付，是文档与工件一致性优化

## 3. 关键页面与交互

- 不适用（N/A）：无 UI 页面

## 4. 核心接口与数据模型（契约层）

- 不适用（N/A）：无新增接口 / 数据模型 / 状态机；CLI 行为、doctor warning code、工件 schema 全部不变。本轮只改 user-facing 文案、代码注释与 dogfood 工件文本

## 5. 关键流程

1. 全仓审计（npm test / eslint / doctor + 文档交叉核对）列出错误 / 漂移 / 矛盾并分档
2. 与负责人确认范围（tier3 + patch 发布 v10.1.1）
3. 修两处确凿活文档事实错误（mcp-resources、CHANGELOG spec 版本）
4. 去版本化 user-facing「AI-OS v9」遗漏（doctor 输出 / 注释 / README），保留 schema 代际引用与受约束段头
5. 重新同步 dogfood lane（MISSION / DESIGN / tasks / verification-matrix / lane.toml / STATE）到 v10.1.1
6. 版本与测试收口（10.1.1、mcp guard、CHANGELOG / maintainers / project-lead），npm test + lint + doctor 全绿后提交、打 tag、push

## 6. 共享基础设施审计（brownfield / change 必填）

- **受影响的共享组件**：interop 文档（mcp-resources）、CHANGELOG、CLI 源码 user-facing 措辞（doctor / shared）、README、maintainers 版本矩阵、docs 测试、版本元数据、dogfood lane 工件
- **受影响的接口 / 行为清单**：无——CLI 行为、doctor 退出码与 warning code、工件 schema 全部不变；仅 user-facing 文本与 dogfood 工件文本变化
- **同仓正常实现对照**：v9.7.2 曾做过一次 repository-wide consistency cleanup（patch），本轮沿用同一「只修一致性、不动契约」的方式
- **副作用清单**：AGENTS.md 仍 ≤150 行；constitution-spec 仍 v2.2 且 ≤160 行；不扩大 doctor warning range；不引入第三方依赖；`# AI-OS v9 managed` 段头不动以保 .gitignore/.gitattributes 幂等

## 7. UI Source Routing

- 不适用（N/A）：非前端 UI 项目

## 8. 对照参考（reverse-spec 必填）

- 不适用（N/A）：非 URL reverse-spec 交付；对照源为仓库自身的真理源文件（spec 头部、VERSION、doctor 实际输出）与历史 CR

## 9. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | mcp-resources 写 two primary product operations 且不再出现 upgrade；CHANGELOG v10.1.0 spec 为 v2.2 与 spec 头部一致 | `npm test` + 人工核对 | `test/docs.test.js` / `docs/interop/mcp-resources.md` / `CHANGELOG.md` |
| AC-002 | REQ-002 | doctor 输出与 bin 文件头注释及 README 不再含读作框架版本的 v9；schema 代际引用与 AI-OS v9 managed 段头保留 | `npm test` + 人工核对 | `bin/ai-os-doctor.js` / `bin/shared.js` / `README.md` |
| AC-003 | REQ-003 | dogfood lane DESIGN tasks verification-matrix MISSION lane.toml 同步到 v10.1.1 且 baseline id 一致 | `node bin/ai-os-doctor.js .` | 本 lane 工件 + W070 一致性 |
| AC-004 | REQ-004 | test docs 含锁住 mcp-resources 两操作修复的回归断言 | `npm test` | `test/docs.test.js` |
| AC-005 | REQ-005 | 版本元数据与发布叙事同步到 10.1.1 含 CHANGELOG maintainers project-lead | `npm test` + 人工核对 | `VERSION` / `package.json` / `package-lock.json` / `CHANGELOG.md` / `docs/maintainers.md` |
| AC-006 | REQ-006 | 无新增 CLI flag doctor code 工件类别 保持两操作零依赖 AGENTS 150 行 schema 9 spec v2.2 | `npm test` + `npm run lint` | product surface tests |
| AC-007 | REQ-007 | 原生验证收口 npm test 与 lint 与 strict doctor 全部通过 | `npm test` + `npm run lint` + `doctor --strict` | 验证日志 + doctor 输出 |

## 10. 设计确认记录

- 2026-06-09：项目负责人确认「本次不做新功能，优化下不合理、错误、重复等」，并在范围确认中选择 tier3（事实错误 + 去版本化 + dogfood lane 回正）+ patch 发布 v10.1.1
