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

### PL-017 长期迭代中 AI 引入回归和技术债指数累积

- **来源**：SWE-CI 基准测试（阿里巴巴+中山大学, 2026-03, arxiv 2603.03823）；行业技术债研究（GitClear 2026）
- **真实问题**：75%+ 的 AI 模型在 233 天 / 71 次提交的长期维护中引入回归（破坏原本通过的测试），技术债呈指数增长。根因是上下文漂移（跨 session 决策丢失）、局部最优（只修当前失败不管已通过测试）和代码模式退化（每 session 引入新模式形成死亡螺旋）。
- **AI-OS 必须保证**：build 阶段有回归基线对比（wave 前快照、wave 后对比），verify 有零回归放行门，memory 有技术债结构化追踪，postmortem 有债务审计步骤，代码约定有显式锚点（CONVENTIONS.md）。
- **当前覆盖锚点**：`/build` 回归基线协议、`/verify` 零回归门、`.ai-os/memory.md` 技术债追踪区、`/postmortem` 债务审计步骤、`.ai-os/CONVENTIONS.md` 模式锚点、`derived-rules.md` 4.6 回归零容忍 / 4.7 最小改动原则
- **每次迭代核对**：不能弱化回归基线对比和零回归门；不能去掉技术债追踪区；不能让 CONVENTIONS.md 退化为可选装饰。

### PL-018 代码模式跨 session 漂移无锚点

- **来源**：SWE-CI 基准测试（2026-03）；BSWEN 上下文漂移分析；DTX Systems 实践指南（2026-02）
- **真实问题**：每个 session 独立决定命名、错误处理、API 调用等代码模式，跨 session 无一致性锚点。Session 1 写 `fetchUser()`，Session 10 写 `getUser()`，代码库逐渐混乱，AI 读到混乱代码后忠实复现混乱，形成不可逆的退化螺旋。
- **AI-OS 必须保证**：项目级代码约定有显式工件（`.ai-os/CONVENTIONS.md`），build 实现时对照检查，verify 做模式一致性检查，postmortem 审查约定是否需要更新。
- **当前覆盖锚点**：`.ai-os/CONVENTIONS.md` 模板、`/build` CONVENTIONS 对照步骤、`/verify` 模式一致性检查、`/postmortem` CONVENTIONS 审查、`/design` 阶段初始化 CONVENTIONS
- **每次迭代核对**：不能把 CONVENTIONS.md 的对照检查从 build 和 verify 中去掉；不能让代码约定退化成只在 design 阶段写一次就再不看的文档。

### PL-019 外部编排（IDE Plan 模式）场景下验证闭环被系统性跳过

- **来源**：2026-03 用户复盘；Cursor Plan 模式下跨前后端多文件改动完成后 `/verify` 和 `/ship` 被完全跳过
- **真实问题**：当任务由 IDE 计划模式或 todo 列表驱动时，AI 把"todo 清零"等同于"交付完成"，跳过项目原生编译/类型检查和交付收口；同时 IDE 内置诊断（ReadLints）被错误等同于项目原生静态校验。
- **AI-OS 必须保证**：不论执行编排方式如何（命令式、plan 模式、todo 列表），build 完成后必须进入 `/verify` 执行项目原生校验，再进入 `/ship` 完成交付；IDE 诊断不可替代项目构建工具链的校验证据。
- **当前覆盖锚点**：`framework/AGENTS.md` Section 6 / Section 8、`/verify` workflow 触发条件、`/build` workflow 出口规则、`acceptance-gate` 证据要求表和自我合理化防御表、`code-review-guard` Step 0
- **每次迭代核对**：不能把"编排完成 = 交付完成"重新引入任何 workflow；不能让 IDE 诊断重新成为唯一校验证据。

### PL-020 brownfield / change 场景把整个存量项目误当成当前 mission

- **来源**：2026-03-31 用户反馈；老项目接入 AI-OS 后新增需求时，AI 容易把整个存量项目重新当成当前 mission
- **真实问题**：在已有项目里做一个新需求、变更或局部重构时，AI 不是围绕“本轮要交付什么”建立基准，而是把整个历史项目重新当成 mission 去对齐，导致范围被放大、问题提问过重、需求基准和宿主项目上下文混在一起，后续 tasks / spec / verify 也容易失焦。
- **AI-OS 必须保证**：在 `brownfield` / `change` 场景下，`MISSION.md` 记录的是“当前这轮交付基准”，不是整个存量项目本身；只保留理解本轮变更所必需的宿主项目上下文，并把范围内 / 范围外严格限定到本轮交付。
- **当前覆盖锚点**：`framework/AGENTS.md`、`/align`、`/change-request`、`framework/.agents/templates/project/MISSION.md`、`README.md`、`docs/artifacts.md`、`docs/getting-started.md`、`examples/change-request-baseline-sync/.ai-os/MISSION.md`、`examples/brownfield-change-journey/.ai-os/MISSION.md`
- **每次迭代核对**：不能让 brownfield / change 任务重新退化成“先重新定义整个项目”；也不能只写当前需求而丢失理解本轮交付所需的宿主项目上下文。

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

### PG-004 CLI / 框架能力只在单一 IDE 可用，无法稳定投射到已支持环境

- **来源**：2026-03 行业研究；Cursor `.cursor/rules/*.mdc`、Codex `AGENTS.md`、Claude Code `CLAUDE.md` 等各有原生加载方式；2026-04 用户约束确认
- **真实问题**：某些能力只在单一 IDE 或单一 agent 客户端里能生效，但一旦被升格成 CLI 主能力，用户会误以为 Codex CLI、Cursor、Claude Code 等环境都可用，最终导致跨环境行为不一致、文档承诺失真、评估样例无法复现。
- **AI-OS 必须保证**：进入 CLI 或根层治理的能力，必须能被当前已承诺支持的环境稳定承接，或至少提供等价 fallback；做不到就留在适配层 / 示例 / 文档，默认不纳入 CLI 主能力。当前最少要说明 `Codex CLI`、`Cursor`、`Claude Code` 的承接路径；若影响其他已支持环境，也必须一并说明。
- **当前覆盖锚点**：`bin/ai-os-cursor-rules.js`、`bin/create-ai-os.js` 的 IDE 文件生成、`README.md` 的 IDE 兼容性说明、`docs/cli.md`、`test/run.js` 的 IDE integration tests
- **每次迭代核对**：新增 CLI 命令、workflow 路由、门禁或运行时增强时，都要写清各支持环境的加载路径和退化路径；不能把只在某一个 IDE 生效的能力直接挂成 AI-OS CLI 主能力。

### PG-005 多人协作下 Mission 成为高频冲突热点，导致基线漂移和确认记录丢失

- **来源**：2026-04-02 用户反馈；多人协作 / 多 agent 并行开发时，`MISSION.md` 频繁冲突
- **真实问题**：`MISSION.md` 同时承载锁定章程、待确认项、阶段状态和变更日志，导致多人并发时所有高频编辑都集中打到一个共享热点文件；冲突解决时容易覆盖确认记录、丢失变更分析，最终让需求基线漂移。
- **AI-OS 必须保证**：`MISSION.md` 只记录低频、已确认、共享的交付基线；高频协作信息拆到 `baseline-log/` 和 `STATE.md`；多人协作默认采用“串行基线、并行实现”。
- **当前覆盖锚点**：`framework/.agents/templates/project/MISSION.md`、`framework/.agents/templates/project/baseline-log/BL-template.md`、`framework/.agents/workflows/align.md`、`framework/.agents/workflows/change-request.md`、`framework/AGENTS.md`、`bin/ai-os-validate.js`、`bin/ai-os-status.js`、`bin/ai-os-resume.js`、`README.md`、`docs/artifacts.md`
- **每次迭代核对**：不能再把待确认项、阶段状态或需求变更同步记录塞回 `MISSION.md`；不能让 `baseline-log/` 退化成新的需求真理源；不能让多人协作默认再次回到“所有人都直接改 Mission”。

### PL-021 跨切面架构关注点缺少受影响实体双清单

- **来源**：2026-04 用户实战问题；多租户项目中遗漏 tenant_id 导致数据泄露
- **真实问题**：当项目存在跨切面架构关注点（多租户、国际化、RBAC、审计日志等）时，/design 阶段没有产出"受影响实体/表清单"和"明确排除清单"双清单，导致实现阶段遗漏关键实体的隔离或审计字段。
- **AI-OS 必须保证**：涉及跨切面架构关注点时，/design 阶段输出 DESIGN.md 需包含受影响实体清单和明确排除清单；后续 /verify 对照检查。
- **当前覆盖锚点**：`/design`、`database-schema-design` skill（通用 Schema 指南，未提及跨切面分类）
- **每次迭代核对**：不能让跨切面关注点只出现在口头描述中，必须落到设计工件；不能让 database-schema-design 的增强引入特定业务场景硬编码。

### PL-022 构建配置排除规则与引用关系不自洽

- **来源**：2026-04 用户实战问题；.dockerignore 排除了 Dockerfile COPY 需要的文件导致构建失败
- **真实问题**：构建配置中的排除规则（.dockerignore、.gitignore、.npmignore 等）与引用关系（COPY、import、include 等）互相矛盾，排除了又引用的文件导致构建阶段静默失败或文件缺失。
- **AI-OS 必须保证**：构建配置文件之间的排除规则与引用关系必须自洽；code-review-guard 或 fullstack-dev-checklist 应检查此类冲突。
- **当前覆盖锚点**：`code-review-guard` Step 0 B（检查容器化构建文件存在性，但不检查排除/引用自洽性）
- **每次迭代核对**：不能让容器化构建文件的检查退化为仅检查文件是否存在而不检查配置自洽性。

### PL-023 构建或启动前环境前置检查缺失

- **来源**：2026-04 用户实战问题；dev server 运行时执行 next build 导致端口/文件锁冲突
- **真实问题**：AI agent 不像人类开发者那样天然感知终端里还跑着什么，在 dev server 运行时执行构建命令、在端口被占用时启动新服务，导致构建失败或启动失败。
- **AI-OS 必须保证**：执行构建或启动命令前，确认无冲突的运行时进程占用构建资源（端口、文件锁、缓存目录等）；发现冲突时先停止冲突进程或使用独立目录。
- **当前覆盖锚点**：`code-review-guard` Step 0 B（环境编排文件检查）、`fullstack-dev-checklist`（runtime-config 联动矩阵）
- **每次迭代核对**：不能让环境前置检查只停留在文件是否存在层面，应关注运行时进程状态。

### PL-024 多目标环境验证只覆盖主环境

- **来源**：2026-04 用户实战问题；项目声明支持移动端但 /verify 只测了桌面端
- **真实问题**：当 MISSION/DESIGN 声明支持多目标环境（桌面+移动、多浏览器、多 OS、多架构）时，AI 只在主环境（通常是桌面端）下验证就宣称全部通过，移动端、其他浏览器或其他 OS 的体验和功能未被验证。
- **AI-OS 必须保证**：/verify 必须逐目标环境验证，不能只在一种环境下通过就宣称全部完成；至少应列出每个声明的目标环境的验证结论。
- **当前覆盖锚点**：`/verify`（检查关键用户任务是否真实可达但未按目标环境分类）、`acceptance-gate`、`fullstack-dev-checklist`
- **每次迭代核对**：不能让 /verify 默认只验证一种环境；不能让多端验证退化为可选项。

### PL-025 大版本依赖升级缺少 Migration Guide 审查

- **来源**：2026-04 用户实战问题；AI 直接改版本号导致配置项和 API 签名静默不兼容
- **真实问题**：当 tasks 或 change-request 包含核心依赖的大版本升级（major version bump）时，AI 直接改版本号进入实现，不查阅官方 Migration Guide / Breaking Changes / Release Notes，遗漏配置项变更、API 签名变化和行为差异，导致编译通过但运行时行为不符预期。
- **AI-OS 必须保证**：大版本依赖升级前必须先查阅官方 Migration Guide，识别配置项变更、API 签名变化和行为差异，再进入实现。
- **当前覆盖锚点**：`/change-request`（要求影响分析但未显式要求查阅 Migration Guide）、`change-impact-analyzer`（检查维度不含上游破坏性变更）
- **每次迭代核对**：不能让影响分析只关注内部工件，忽略上游依赖的破坏性变更。

### PL-026 容器化构建验证未纳入 verify 证据

- **来源**：2026-04 用户实战问题；源码编译通过但 Docker 镜像无法构建
- **真实问题**：当项目的目标交付物包含容器镜像时，/verify 的项目原生静态校验只覆盖了源码级编译（tsc、mvn compile 等），不包含容器构建（docker build / docker compose build），导致代码编译通过但 Docker 镜像构建失败在 /ship 阶段才暴露。
- **AI-OS 必须保证**：当项目的目标交付物包含容器镜像时，/verify 的校验证据必须包含容器构建结果，而非仅限于源码级编译。
- **当前覆盖锚点**：`/verify`（项目原生静态校验示例仅列源码级工具）、`code-review-guard` Step 0 B（检查 Dockerfile 存在但不验证构建通过）
- **每次迭代核对**：不能让项目原生静态校验的示例列表永远只包含编译命令；不能让容器构建验证退化为可选项。

### PL-027 reverse-spec 对标粒度不足

- **来源**：2026-04 用户实战问题；reverse-spec 项目对标停留在模块级别，未区分子类型
- **真实问题**：reverse-spec 项目在 /align 和 /design 阶段做功能对标时，只停留在模块级描述（如支持查询控件），不深入到子功能/子类型/变体粒度（如查询控件有哪几种：文本输入、日期范围、下拉、多选），导致 parity-map 粒度不够，实现阶段遗漏关键变体。
- **AI-OS 必须保证**：reverse-spec 项目对标时，功能枚举必须深入到子功能/子类型/变体粒度，parity-map 中必须保持一致的条目应逐变体列出。
- **当前覆盖锚点**：`reverse-engineer` skill（第 2 步要求抓取信息架构、关键页面、关键交互但未要求子类型粒度）、`parity-map` 模板
- **每次迭代核对**：不能让对标粒度退化为模块级描述；不能让 parity-map 的必须保持一致条目只列大类。

### PL-028 复杂任务把探索和编辑混在一起，边查边写

- **来源**：2026-04 agentic development 主流实践（只读分析 / plan-first）与项目负责人评估
- **真实问题**：跨多文件、影响边界不清或共享基础设施尚未确认的任务里，AI 直接从第一眼看到的文件开始改，靠代码编辑来“探索”问题，导致目标文件、共享约定和验证入口在实现过程中才逐步暴露，最终出现返工、越界改动或后置升级。
- **AI-OS 必须保证**：复杂或高不确定任务在首次写入前先做一轮只读分析，锁定目标文件、共享约定、验证入口、暂停点和预期影响范围；分析未收敛前不得边查边写。
- **当前覆盖锚点**：`framework/AGENTS.md`、`framework/.agents/workflows/AGENTS.md`、`framework/.agents/workflows/build.md`、`framework/.agents/workflows/debug.md`、`evals/read-only-analysis-before-edit.md`
- **每次迭代核对**：不能把“局部改动不默认全仓扫描”误解成“看到局部文件就能直接开改”；也不能让复杂任务重新退化成用代码编辑替代分析。

### PL-029 稳定失败模式只修当前一次，没有沉淀成回归证据

- **来源**：2026-04 agentic development 主流实践（trace 先定位、eval 固化回归）与项目负责人评估
- **真实问题**：debug / verify 虽然定位到了可复现的失败路径或高频回归入口，但修复只停留在当前会话和当前改动，没有把最小复现、放行条件和验证方法沉淀成项目级工件，后续 session 或新成员又重复踩到同类问题。
- **AI-OS 必须保证**：当 debug / verify / postmortem 暴露出稳定 failure mode、关键 tricky path 或高频回归入口时，必须把最小复现和放行条件同步到 `.ai-os/evals/`、`.ai-os/verification-matrix.yaml` 或等价工件，而不是只记在聊天记录或 memory 里。
- **当前覆盖锚点**：`framework/AGENTS.md`、`framework/.agents/workflows/AGENTS.md`、`framework/.agents/workflows/debug.md`、`framework/.agents/workflows/verify.md`、`framework/.agents/templates/project/verification-matrix.yaml`、`bin/ai-os-validate.js`、`bin/ai-os-release-check.js`、`docs/artifacts.md`、`README.md`、`examples/failure-mode-eval-closure.md`
- **每次迭代核对**：不能把稳定 failure mode 的沉淀退化成“记到 memory 就算完”；也不能把一次性偶发噪音误升格成长期回归工件。

### PG-006 单工作区只有一个当前基线，无法承载多人多迭代并行

- **来源**：2026-04-14 用户反馈；团队多人多迭代同时进行时，`MISSION.md` 的 `当前基线 ID`、`tasks.yaml` 和 `acceptance.yaml` 在合并后会争夺同一个“当前交付”语义
- **真实问题**：现有 `.ai-os/` 根层工件默认只有一个当前交付上下文：`MISSION.md` 只允许一个 `当前基线 ID`，`tasks.yaml` / `acceptance.yaml` / `release-plan.md` / `risk-register.md` / `verification-matrix.yaml` 也都默认服务同一轮交付。多人团队若在同一工作区同时推进多个迭代或多条交付线，即使 Git 文本冲突可手工解决，合并后仍会出现“谁才是当前基线、当前阶段、当前任务和当前验收”的语义冲突。
- **AI-OS 必须保证**：要么明确把产品边界定义为“单工作区 / 单分支只承载一条当前交付基线”，并给出确定性限制与协作指引；要么在未来版本把交付工件升级成 lane / delivery 级隔离模型，让多个并行迭代在同一宿主项目里各自拥有独立的 Mission / Spec / Tasks / Acceptance / Release 工件。
- **当前覆盖锚点**：`framework/.agents/templates/project/MISSION.md` 的单 `当前基线 ID` 结构、`framework/AGENTS.md` 与 `README.md` 中“串行基线、并行实现”的协作规则、`bin/ai-os-validate.js` 对 Mission / tasks / acceptance 单 baseline_id 一致性的校验、`docs/evolution/multi-delivery-lanes-proposal.md`、`examples/quickstart-todo-cli/` 的 `shared root + lanes/default` canonical example
- **每次迭代核对**：不能把 Git 冲突缓解误当成多迭代并行已经被支持；不能在未重构工件拓扑前暗示 AI-OS 已支持“单工作区多当前基线”；若进入 lane 模型，必须同步清理单当前交付的默认假设和相关 CLI 校验。
