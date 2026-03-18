# AI-OS 问题台账（vNext）

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
- **当前覆盖锚点**：`/align`、`.ai-os/MISSION.md`、`evals/missing-user-confirmation.md`、`examples/greenfield-guided-product.md`
- **每次迭代核对**：不能弱化目标确认、范围边界和确认停点。

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

### PL-004 页面做出来了，但逻辑经常错

- **来源**：现有 README 问题基线
- **真实问题**：页面和交互看起来像完成了，但核心流程、状态流转或业务规则不对。
- **AI-OS 必须保证**：关键设计和关键逻辑都先锁定，并在验证阶段同时过设计门和逻辑门。
- **当前覆盖锚点**：`/design`、`/plan`、`/verify`、`.ai-os/DESIGN.md`、`.ai-os/specs/`、`.ai-os/acceptance.yaml`、`evals/ui-looks-right-but-logic-wrong.md`、`evals/logic-right-but-product-shape-wrong.md`
- **每次迭代核对**：不能只保留视觉或实现检查，丢掉逻辑确认门。

### PL-005 bug 修复时顺手乱改，改 A 坏 B

- **来源**：现有 README 问题基线
- **真实问题**：本来是单点修复，结果顺手重构或扩散修改，引入新的回归。
- **AI-OS 必须保证**：debug 先定界、再修复、再做影响范围回归。
- **当前覆盖锚点**：`/debug`、`.ai-os/tasks.yaml`、`.ai-os/STATE.md`、`evals/debug-overreach-regression.md`、`examples/debug-bounded-fix.md`
- **每次迭代核对**：不能去掉边界说明、影响范围和回归结论。

### PL-006 界面上像有功能，但其实不能真用

- **来源**：现有 README 问题基线
- **真实问题**：能力只有入口、占位态或演示态，用户却被误导成“已经可用”。
- **AI-OS 必须保证**：验证必须拦截“看起来有”但没有真实可用性的伪完成。
- **当前覆盖锚点**：`/verify`、`.ai-os/specs/`、`.ai-os/acceptance.yaml`、`evals/feature-visible-but-unusable.md`
- **每次迭代核对**：不能把占位能力、未验证能力包装成已交付能力。

### PL-007 代码跑了，但离可交付还很远

- **来源**：现有 README 问题基线
- **真实问题**：实现能运行，但没有完整证据、交付说明、回滚条件和发布准备。
- **AI-OS 必须保证**：完成必须同时满足设计、逻辑、实现质量和交付质量。
- **当前覆盖锚点**：`/verify`、`/ship`、`.ai-os/acceptance.yaml`、`.ai-os/release-plan.md`、`evals/fallback-evidence-used-as-delivery.md`
- **每次迭代核对**：不能把“能跑”重新当成“可交付”。

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
- **当前覆盖锚点**：`degraded-path-check`、`.ai-os/acceptance.yaml`、`.ai-os/verification-matrix.yaml`、`evals/happy-path-passed-but-null-path-broken.md`、`examples/degraded-path-verification.md`
- **每次迭代核对**：不能去掉异常路径、空数据和回归验证要求。

### PL-012 一换 session，AI 就忘了做到哪

- **来源**：现有 README 问题基线
- **真实问题**：会话切换后项目目标、当前阶段、确认停点和下一步无法稳定恢复。
- **AI-OS 必须保证**：项目状态和稳定记忆可恢复，而不是只靠聊天上下文。
- **当前覆盖锚点**：`.ai-os/STATE.md`、`.ai-os/memory.md`、`create-ai-os status`、`create-ai-os resume`、`PROJECT_PURPOSE.md`
- **每次迭代核对**：不能削弱状态恢复入口、最小阅读集和稳定记忆边界。

### PG-001 新问题没有单独记录，重构时容易把覆盖做丢

- **来源**：2026-03-18 用户反馈
- **真实问题**：来自别的项目的真实问题和 AI-OS 要解决的问题没有集中登记，重构、学习进步或规则替换后很难逐条回看是否还被覆盖。
- **AI-OS 必须保证**：新增问题先登记到本台账；每次重构、学习迭代和覆盖重写，都要在变更评估里写清回看的条目和覆盖结果。
- **当前覆盖锚点**：`docs/problem-ledger.md`、`AGENTS.md`、`docs/change-evaluation-template.md`、`docs/maintainers.md`、`evals/problem-ledger-coverage-regression.md`、`test/run.js`
- **每次迭代核对**：只要动到 workflow、模板、README、eval 或根层治理文档，就要同步检查受影响条目。
