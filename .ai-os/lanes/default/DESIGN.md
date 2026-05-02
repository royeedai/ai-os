# AI-OS v9.2 URL Reverse-Spec Intake Design

## 1. 设计目标

- **本轮设计目标**：把 URL reverse-spec 的前置采集变成 AI-OS 可审计工件协议
- **需要先锁定的关键页面 / 交互 / 接口**：URL intake 不是 UI 页面；关键接口是 lane artifacts 的字段和 confidence 语义
- **必须用户确认的核心设计决策**：artifact-first，无新增 CLI / slash command / runtime dependency

## 2. 信息架构（UI 项目必填）

- **入口与导航骨架**：README 和 delivery skill 触发 URL reverse-spec intake；详细操作进入 `docs/reverse-spec-url-intake.md`
- **一级 / 二级结构**：文档说明流程，模板承载字段，eval 承载失败模式，tests 固化契约
- **关键信息优先级**：证据来源、confidence、unknowns 必须先于实现任务

## 3. 关键页面与交互（UI 项目必填）

| 页面 / 入口 | 目标 | 关键元素 | 关键操作 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| README reverse-spec row | 让用户发现 URL intake | “Reverse-spec this URL” 行 | 路由 agent 到 artifact flow | yes | confirmed |
| docs/reverse-spec-url-intake.md | 说明采集协议 | preflight / evidence / API / backend behavior | 生成可审计需求 | yes | confirmed |

## 4. 核心接口与数据模型（API 项目必填）

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| API observation record | 记录 Network/API 观察 | `id` `trigger` `method` `url_pattern` `request_shape` `response_shape` `status_codes` `auth_signal` `error_paths` `evidence_source` `confidence` | captured → mapped → verified | yes | confirmed |
| Backend behavior record | 记录可观察后端行为 | `rule_id` `behavior` `observed_from` `positive_cases` `negative_cases` `unknowns` `confidence` `implementation_requirement` | observed/inferred/unknown → AC or assumption or pending | yes | confirmed |
| Confidence model | 防止脑补需求 | `observed` `inferred` `unknown` | observed 可进 AC；inferred 进假设；unknown 进待确认 | yes | confirmed |

## 5. 关键流程

1. 用户给出授权可访问 URL
2. agent 捕获截图、DOM/CSS、资源、交互、Network/API 和异常路径证据
3. agent 写入 `design-pack/parity-map.md` 与 `specs/*.spec.md`
4. AI-OS 将 observed 证据映射到 DESIGN / tasks / verification
5. inferred 和 unknown 不得作为 confirmed AC，必须保留假设或待确认项

## 6. 共享基础设施审计（brownfield / change / reverse-spec 必填）

- **受影响的共享组件**：framework lane templates、ai-os-delivery skill、docs、evals、docs tests、version metadata
- **受影响的接口 / 页面清单**：README、docs/artifacts、docs/constitution-spec、docs/reverse-spec-url-intake、CHANGELOG
- **同仓正常实现对照**：现有 reverse-spec parity map 与 eval `ui-looks-right-but-logic-wrong.md`
- **副作用清单**：默认安装模板更具体；docs tests 增加字段断言；skill 触发范围增加 URL reverse-spec intake

## 7. 对照参考（reverse-spec 必填）

- **原始参考清单**：JCodesMore website cloner skill、Open Lovable Firecrawl intake、PerfectWebClone DOM/CSS extraction pattern
- **字段级 / 行为级对照摘要**：吸收“截图 + DOM/CSS + 行为 + API + 视觉 QA”的证据思想，但只落为 AI-OS 工件协议
- **仍待解决差异**：未内置浏览器采集、HAR 导入、自动视觉 diff、自动 asset download

## 8. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | URL intake 文档存在并覆盖截图、DOM/CSS、交互、Network/API、后端行为 confidence | `npm test` | `test/docs.test.js` |
| AC-002 | REQ-002 | lane 模板包含 capture manifest、API observation、backend behavior、verification guard | `npm test` | `test/docs.test.js` |
| AC-003 | REQ-003 | CLI surface 仍为 3 commands / 1 bin / 4 bin scripts | `npm test` | `test/docs.test.js` |
| AC-004 | REQ-004 | v9.2.0 version、CHANGELOG、README、skill wrapper 对齐 | `npm test` + `npm run lint` | docs/version tests |

## 9. 设计确认记录

- 2026-05-02：项目 owner 确认实施 URL Reverse-Spec Intake plan，选择 AI-OS 工件流程，不新增 CLI，后端行为按可观察证据规格处理
