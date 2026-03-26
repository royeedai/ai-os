# AI-OS 问题台账

这是 AI-OS 母仓库唯一的“问题单独登记点”，专门记录两类内容：

- 来自别的项目、真实交付里反复出现的问题
- AI-OS 明确要长期覆盖和解决的问题

## 1. 使用规则

1. 每次用户提出新的真实问题、失败案例或“AI-OS 还应该解决什么”，先补进本文件，再评估它应该进入根层原则、`framework/`、CLI、示例还是明确不纳入。
2. 每次重构、学习进步、规则替换、workflow 调整、模板重写或 CLI 升级，都必须回看相关条目，确认覆盖没有被削弱或遗漏。
3. 如果某个条目的覆盖锚点发生变化，必须同步更新本文件，以及对应的 eval / example / CLI check / test。
4. 本文件记录的是“稳定问题”和“必须保证的结果”，不是临时任务列表；具体实施动作仍落在变更评估、实现文件和测试里。

## 2. 条目格式

每个条目至少包含这些字段：

- **ID**：`PL-xxx` 表示产品问题，`PG-xxx` 表示治理问题
- **来源**：问题来自哪个项目、用户反馈或失败案例
- **真实问题**：实际发生了什么错误交付
- **AI-OS 必须保证**：AI-OS 需要稳定做到什么
- **当前覆盖锚点**：当前由哪些 workflow / artifact / eval / example / CLI / test 承接
- **每次迭代核对**：以后改动时最容易漏掉的点

## 3. 当前问题台账

### PL-001 需求一模糊，AI 就直接开工

- **来源**：现有 README 问题基线；多个真实项目中的常见失败模式
- **真实问题**：需求、成功标准和范围边界还没说清，AI 就直接进入实现，后面频繁返工。
- **AI-OS 必须保证**：先走目标对齐和待确认项暴露，再进入设计或实现。
- **当前覆盖锚点**：`/align`、`.ai-os/MISSION.md`、`evals/missing-user-confirmation.md`、`examples/greenfield-guided-product.md`、`tasks.yaml` 模板的 `measurable_outcome` 和 `edge_cases` 字段、`/plan` workflow 的 `measurable_outcome` / `edge_cases` 禁止事项
- **每次迭代核对**：不能弱化目标确认、范围边界和确认停点；不能去掉任务级可量化完成标准和异常路径要求。

### PL-002 需求补充后，AI 直接改代码，文档和代码脱节

- **来源**：现有 README 问题基线
- **真实问题**：用户新增需求后直接改代码，导致需求基准、spec 和实现分叉。
- **AI-OS 必须保证**：任何需求变化先同步基准，再进入实现。
- **当前覆盖锚点**：`/change-request`、`.ai-os/MISSION.md`、`.ai-os/specs/`、`.ai-os/STATE.md`、`evals/change-request-before-code.md`、`examples/change-request-baseline-sync.md`
- **每次迭代核对**：不能把“先更新基准再改代码”退化成口头提醒。

### PL-003 技术栈或关键方案没对齐，AI 就自己拍板

- **来源**：现有 README 问题基线
- **真实问题**：技术栈、核心方案或关键依赖没有明确确认，AI 先做了不可逆选型。
- **AI-OS 必须保证**：关键设计和关键工程决策先锁定并确认，再进入完整计划或实现。
- **当前覆盖锚点**：`/align`、`/design`、`.ai-os/MISSION.md`、`.ai-os/DESIGN.md`、`evals/design-not-locked-before-build.md`、`evals/missing-user-confirmation.md`
- **每次迭代核对**：不能把关键选型、待确认项和设计确认记录做薄。

### PL-004 界面看起来对了，但关键逻辑经常错

- **来源**：现有 README 问题基线
- **真实问题**：页面和交互看起来像完成了，但核心流程、状态流转或业务规则不对。
- **AI-OS 必须保证**：关键设计和关键逻辑都先锁定，并在验证阶段同时过设计门和逻辑门。
- **当前覆盖锚点**：`/design`、`/plan`、`/verify`、`.ai-os/DESIGN.md`、`.ai-os/specs/`、`.ai-os/acceptance.yaml`、`evals/ui-looks-right-but-logic-wrong.md`、`subagent-executor`（两阶段审查拦截 spec 偏差）、`testing-strategies`（TDD 铁律强制先写测试）、`/build` workflow 的 wave 自审检查点（每 wave 对照 spec 和 measurable_outcome 检查实现）
- **每次迭代核对**：不能只保留视觉或实现检查，丢掉逻辑确认门；不能去掉 wave 级自审检查。

### PL-005 bug 修复时顺手乱改，改 A 坏 B

- **来源**：现有 README 问题基线
- **真实问题**：本来是单点修复，结果顺手重构或扩散修改，引入新的回归。
- **AI-OS 必须保证**：debug 先定界、再修复、再做影响范围回归。
- **当前覆盖锚点**：`/debug`（含最小方案确认防护和 TDD 修 Bug 要求）、`.ai-os/tasks.yaml`、`.ai-os/STATE.md`、`evals/debug-overreach-regression.md`、`examples/debug-bounded-fix.md`、`/build` workflow 的 wave 自审检查点（检查越界改动和跨 wave 影响）
- **每次迭代核对**：不能去掉边界说明、影响范围和回归结论；不能去掉 wave 级范围守卫检查。

### PL-006 界面上像有功能，但其实不能真用

- **来源**：现有 README 问题基线
- **真实问题**：能力只有入口、占位态或演示态，用户却被误导成“已经可用”。
- **AI-OS 必须保证**：验证必须拦截“看起来有”但没有真实可用性的伪完成。
- **当前覆盖锚点**：`/verify`、`.ai-os/specs/`、`.ai-os/acceptance.yaml`、`evals/feature-visible-but-unusable.md`
- **每次迭代核对**：不能把占位能力、未验证能力包装成已交付能力。

### PL-007 代码跑了，但离可交付还很远

- **来源**：现有 README 问题基线；2026-03-16 本地会话关于 fallback 证据与目标运行态区分
- **真实问题**：实现能运行，但没有完整证据、交付说明、回滚条件、静态校验证据，或仍需人工执行 SQL / 重启 / 补数却被写成“已完成交付”。
- **AI-OS 必须保证**：完成必须同时满足设计、逻辑、实现质量和交付质量，并显式区分 `AI 已完成` 与 `需人工执行`。
- **当前覆盖锚点**：`/verify`、`/ship`、`acceptance-gate`（含验证铁律、5 步验证门和禁止措辞清单）、`.ai-os/release-plan.md`、`bin/ai-os-release-check.js`、`evals/fallback-evidence-used-as-delivery.md`
- **每次迭代核对**：不能把“能跑”重新当成“可交付”，不能把 dev fallback 证据当成 target runtime 证据，也不能把待人工执行动作和缺少静态校验的状态写成已完成。

### PL-008 天然流式 / 长耗时场景被错建成同步接口

- **来源**：现有 README 问题基线
- **真实问题**：交互模式选错，后面不得不做代价很高的重构。
- **AI-OS 必须保证**：在 `/plan` 前锁定 `interaction_mode`，并说明为什么选这个模式。
- **当前覆盖锚点**：`/plan`、`.ai-os/specs/*.spec.md` 中的 `交互模式`、`evals/interaction-mode-misclassified.md`、`examples/interaction-mode-chat.md`
- **每次迭代核对**：不能去掉交互模式判断、拒绝模式和理由说明。

### PL-009 跨层字段或配置改动总是漏联动

- **来源**：现有 README 问题基线
- **真实问题**：字段、契约或配置变动只改了一层，其他触点、校验或映射没同步。
- **AI-OS 必须保证**：计划和验证阶段有显式联动检查，而不是靠经验补漏。
- **当前覆盖锚点**：`contract baseline`、`impact_tags`、`impact_rules`、`.ai-os/tasks.yaml`、`.ai-os/verification-matrix.yaml`、`evals/cross-layer-change-missed-linkage.md`、`examples/cross-layer-schema-change.md`
- **每次迭代核对**：不能弱化字段映射、集成触点和联动检查。

### PL-010 资产 / 权限 / 状态流转类需求没被自动升级

- **来源**：现有 README 问题基线
- **真实问题**：高风险改动被当普通改动处理，没有审批点、风险登记和专项审查。
- **AI-OS 必须保证**：命中高风险触发条件时自动升级治理档位，并补风险与发布工件。
- **当前覆盖锚点**：高风险档规则、`.ai-os/risk-register.md`、`.ai-os/release-plan.md`、`required_special_reviews`、`evals/sensitive-flow-not-escalated.md`、`examples/high-risk-state-change.md`
- **每次迭代核对**：不能把高风险判定和审批要求弱化成可选项。

### PL-011 happy path 通过，但空值 / 异常一碰就碎

- **来源**：现有 README 问题基线
- **真实问题**：正常流程能走通，但异常、空数据、部分失败或拒绝场景缺少验证。
- **AI-OS 必须保证**：验证必须覆盖 degraded path，而不是只测 happy path。
- **当前覆盖锚点**：`degraded-path-check`、`.ai-os/acceptance.yaml`、`.ai-os/verification-matrix.yaml`、`evals/happy-path-passed-but-null-path-broken.md`、`examples/degraded-path-verification.md`、`tasks.yaml` 模板的 `edge_cases` 字段（任务级异常路径前置定义）、`/plan` workflow 禁止 `edge_cases` 为空
- **每次迭代核对**：不能去掉异常路径、空数据和回归验证要求；不能去掉任务级 edge_cases 字段要求。

### PL-012 一换 session，AI 就忘了做到哪

- **来源**：现有 README 问题基线
- **真实问题**：会话切换后项目目标、当前阶段、确认停点和下一步无法稳定恢复。
- **AI-OS 必须保证**：项目状态和稳定记忆可恢复，而不是只靠聊天上下文。
- **当前覆盖锚点**：`.ai-os/STATE.md`、`.ai-os/memory.md`、`create-ai-os status`、`create-ai-os resume`、`PROJECT_PURPOSE.md`、`memory-manager` skill 的分层归档策略和 session 恢复优先级、`/postmortem` workflow 的记忆归档步骤
- **每次迭代核对**：不能削弱状态恢复入口、最小阅读集和稳定记忆边界；不能去掉 memory 分层策略和归档区。

### PL-013 用户已经点明局部改动，AI 却默认扩散成全仓分析

- **来源**：2026-03-16 `Clarify quick path for targeted mods` 提交；2026-03-16 本地会话关于局部能力不要自动升级到 `/map-codebase`
- **真实问题**：用户明明只要求一个局部修改或新增局部能力，AI 却先做全仓扫描、全流程分析，既拖慢节奏，也把范围判断做偏。
- **AI-OS 必须保证**：对明确点名的局部改动先定点理解；只有当模块位置、现有模式或影响边界不清时，才升级到更重的全局分析。
- **当前覆盖锚点**：`PROJECT_PURPOSE.md` 中“局部改动不默认全仓扫描”、`framework/AGENTS.md`、`examples/brownfield-change-journey.md`
- **每次迭代核对**：不能把局部改动、brownfield 变更和 debug 任务重新拉回“一上来先全仓分析”的旧路。

### PL-014 逻辑是对的，但产品形态 / 信息架构还是错的

- **来源**：`evals/logic-right-but-product-shape-wrong.md`；2026-03-16 本地会话关于企业后台 benchmark、信息架构和“最小可运行 / 可验收”分层
- **真实问题**：接口、状态和逻辑都能跑通，但页面结构、信息架构、关键交互或产品组织方式仍然偏离已确认设计，最终做成 demo 感或错误产品形态。
- **AI-OS 必须保证**：设计确认门和产品形态检查不能被代码、接口和测试通过替代；必要时明确区分“最小可运行”和“可验收”。
- **当前覆盖锚点**：`/design`、`/verify`、`.ai-os/DESIGN.md`、`.ai-os/acceptance.yaml`、`evals/logic-right-but-product-shape-wrong.md`
- **每次迭代核对**：不能把页面结构、信息架构和关键交互的检查退化成“接口对了就算通过”。

### PL-015 brownfield / change 任务忽略共享基础设施约定

- **来源**：2026-03-19 用户复盘；AiChat.vue 下拉框为空，根因是全局 request 拦截器已做响应拆包，但实现仍按局部 `res.code === 200` 假设写逻辑
- **真实问题**：AI 只看局部页面、接口或样式文件就开始改动，忽略共享拦截器、DTO / adapter、中间件、路由鉴权或全局样式变量等基础设施约定，导致契约判断和 UI 实现从一开始就偏了。
- **AI-OS 必须保证**：在 `/design`、`/debug` 和跨层 review 前，先审计会影响局部实现的共享基础设施约定，再锁定契约基准、字段映射和 UI 假设。
- **当前覆盖锚点**：`/design`、`/debug`、`framework/.agents/skills/systematic-debugging/SKILL.md`、`framework/.agents/skills/fullstack-dev-checklist/SKILL.md`、`.ai-os/DESIGN.md`、`evals/brownfield-infrastructure-audit-missed.md`、`examples/brownfield-infrastructure-audit.md`
- **每次迭代核对**：不能只保留“集成触点”而丢掉共享包装层 / 转换层 / 样式基准的审计要求，也不能让 brownfield 任务重新退化成“看见局部文件就直接开改”。

### PL-016 “可配置 / 可设置”被误解成单纯后端支持

- **来源**：2026-03-19 用户复盘；用户期望前端可交互设置，但 AI 把“系统可设置”理解成后端逻辑支持数据库记录
- **真实问题**：需求里出现“配置 / 设置 / 选项”时，AI 没有确认操作闭环，就默认按自己的理解落成静态配置、后端可配或 UI CRUD，导致范围判断偏差。
- **AI-OS 必须保证**：在 `/align` 和 `/change-request` 遇到这类术语时，轻量追问一次“是静态预置、后台可配，还是需要用户 / 运营入口”，并把结论写进 `MISSION.md` 的澄清或范围说明。
- **当前覆盖锚点**：`/align`、`/change-request`、`.ai-os/MISSION.md`、`evals/configurable-meant-operable-gap.md`、`examples/config-closure-clarification.md`
- **每次迭代核对**：不能把这类术语重新当成无需确认的默认词，也不能把“轻量追问”偷偷升级成一刀切的 UI CRUD 强制要求。

### PG-001 新问题没有单独记录，重构时容易把覆盖做丢

- **来源**：2026-03-18 用户反馈
- **真实问题**：来自别的项目的真实问题和 AI-OS 要解决的问题没有集中登记，重构、学习进步或规则替换后很难逐条回看是否还被覆盖。
- **AI-OS 必须保证**：新增问题先登记到本台账；每次重构、学习迭代和覆盖重写，都要在变更评估里写清回看的条目和覆盖结果。
- **当前覆盖锚点**：`docs/problem-ledger.md`、`AGENTS.md`、`docs/change-evaluation-template.md`、`docs/maintainers.md`、`evals/problem-ledger-coverage-regression.md`、`test/run.js`
- **每次迭代核对**：只要动到 workflow、模板、README、eval 或根层治理文档，就要同步检查受影响条目。

### PG-002 框架 token 成本占用过高，挤压业务上下文空间

- **来源**：2026-03 行业研究；AGENTS.md 标准最小化原则（Gloaguen 等人 2026）
- **真实问题**：AI-OS 完整框架（19 个 skill + 15 个 workflow + 模板）一次性注入上下文窗口时，token 占用过高，挤压了项目本身的代码和业务上下文空间，尤其在 128K 窗口的模型上影响 agent 表现。
- **AI-OS 必须保证**：提供按场景动态加载的机制和 `--lite` 最小安装选项；token-budget 命令可估算框架成本；不必要的规则不应被注入上下文。
- **当前覆盖锚点**：`bin/ai-os-token-budget.js`、`create-ai-os --lite`、`PROJECT_PURPOSE.md`
- **每次迭代核对**：不能把新增 skill 或 workflow 视为零成本；每次新增框架内容时需关注 token 预算变化。

### PG-003 框架规则只是建议性的，AI 可以在上下文压力下忽略

- **来源**：2026-03 行业研究；DTX Systems 实践指南关于 enforcement beyond config
- **真实问题**：写在 AGENTS.md 和 markdown 中的规则是 advisory 的，LLM 在上下文压力、长会话或复杂指令下可能忽略关键规则，导致护栏形同虚设。
- **AI-OS 必须保证**：关键门禁（如"没有 DESIGN.md 不能进 build"）在 CLI 层面有确定性校验（validate/doctor）；未来探索运行时 hook 执行层。
- **当前覆盖锚点**：`bin/ai-os-validate.js`、`bin/ai-os-doctor.js`、`test/run.js` 的 eval-driven guardrail tests
- **每次迭代核对**：不能假设 markdown 规则会被 100% 遵守；核心禁止项应尽可能有 CLI 校验支撑。

### PG-004 框架只兼容 AGENTS.md 格式，不适配主流 IDE 原生规则系统

- **来源**：2026-03 行业研究；Cursor .cursor/rules/*.mdc、Codex AGENTS.md、Windsurf 等各有原生格式
- **真实问题**：用户使用 Cursor 时，AGENTS.md 优先级低于 .cursor/rules/*.mdc；框架规则可能不被优先加载，或用户不知道如何让 IDE 识别 AI-OS 规则。
- **AI-OS 必须保证**：提供 `cursor-rules` 子命令，将框架文件转换为 .cursor/rules/*.mdc 格式；未来按需支持其他 IDE 格式。
- **当前覆盖锚点**：`bin/ai-os-cursor-rules.js`、`create-ai-os cursor-rules`
- **每次迭代核对**：新增 workflow 或 skill 时需确保 cursor-rules 转换器能正确处理。
