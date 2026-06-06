# AI-OS v9.9 Design-Aware Component-First UI Mission

## 1. 当前交付基线摘要

- **当前交付主题**：design-aware component-first UI
- **当前交付目标**：把前端 UI 交付从“必须有设计稿 / 无设计就随意实现”的二分法，升级为 UI source routing：有设计稿按设计目标优先复用组件，无设计稿按项目技术栈、现有依赖和国内团队熟悉度采用组件库优先交付
- **成功标准**：AGENTS、README、artifacts docs、constitution spec、official skill wrapper、lane DESIGN template、verification matrix、problem ledger 和 docs tests 全部表达同一套 UI 来源与组件库选择策略；版本升级到 9.9.0；不新增 CLI、runtime、doctor code 或模板库
- **项目模式**：change + brownfield
- **当前交付档位**：standard
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260606-123822-design-aware-component-first-ui

## 2. 用户与闭环场景

- **目标用户**：使用 AI-OS 开发后台、PC 业务系统、App / H5 / 小程序业务页、老项目 UI 或有设计稿页面的项目负责人和 AI coding 用户
- **关键场景**：用户要求开发前端页面 → AI 先判断 UI 来源（design-led / component-first / existing-style / hybrid）→ 检查项目现有组件库 → 有设计稿时以设计为目标但优先组件实现 → 无设计稿时使用现有或栈匹配组件库 → 验证字段、接口、权限、状态、异常和响应式行为
- **当前最小可行闭环**：通过 AGENTS 规则、DESIGN template、artifacts schema、skill routing、README 心智和 docs tests 固化；不新增执行层
- **明确后续迭代项**：不内置大量页面模板，不新增组件生成器，不把 AI-OS 变成 UI 框架，不硬编码业务页面结构

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：AI-OS 只记录 UI source routing 和组件库选择策略；具体项目仍使用自身 Vue / React / uni-app / Taro / 小程序栈
- **已确认目标运行态 / 部署约束**：AI-OS 仍是治理契约；不安装组件库、不生成运行时代码、不替代项目构建工具
- **已确认质量优先级**：组件复用和维护性 > 手搓视觉；设计稿目标效果 > 组件默认样式；业务逻辑、权限、状态和异常路径 > “页面看起来出来了”
- **已确认核心设计决策**：设计稿定义目标效果，组件库定义优先实现路径；无设计稿的后台 / 业务 UI 默认组件库基线；老项目已有组件库优先
- **已确认核心逻辑决策**：自动选库顺序为已有依赖 > 用户指定 > 项目生态匹配 > 国内团队熟悉度；判断不出技术栈或目标端时才问用户

## 4. 范围边界与非目标

### 范围内

- `AGENTS.md` 增加前端 UI 来源判定原则
- `README.md` 增加 Design-aware component-first UI 心智和默认组件库选择策略
- `docs/artifacts.md` 增加 UI source routing 字段建议
- `docs/constitution-spec.md` 升级到 v2.1 并引用该 UI 规则
- `framework/skills/ai-os-delivery/SKILL.md` 增加前端 UI routing 行为
- `framework/.agents/templates/lane/DESIGN.md` 和 `verification-matrix.yaml` 增加 UI source / component-first 字段和 failure modes
- `docs/problem-ledger.md` 登记 PL-020
- `test/docs.test.js` 增加一致性测试
- version metadata / changelog / self-hosted lane 工件更新

### 范围外

- 新增 CLI 命令、flag、profile、doctor warning、runtime runner、组件库安装器、页面模板库或 UI 代码生成器
- 强制所有项目使用同一个组件库
- 将营销页、品牌页、活动页、强视觉 C 端页面默认视为无需设计确认
- 用组件库开发替代接口、权限、表单校验、状态流转和异常路径确认

### 非目标

- 维护第三方组件库版本矩阵
- 提供 Figma / Pixso / 即时设计解析器
- 给每个组件库写专属代码示例

## 5. 宿主项目相关上下文

- **本轮依赖的宿主项目事实**：AI-OS v9.8 已收敛为 3 primary operations、12 artifact categories、zero runtime deps、AGENTS.md ≤150 lines；本轮必须延续内容瘦身方向
- **必须保持的共享基础设施约束**：`docs/artifacts.md` 仍是字段级 schema 真理源，`docs/constitution-spec.md` 只保留规范级摘要；组件库策略不得进入 doctor NLP soft checks
- **与其他 lane 的边界**：继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖；组件库名称仅作为项目选择策略，不代表 AI-OS 依赖
- **稳定风险**：规则写得过强会把 C 端强视觉页面错误组件化；写得过弱会让后台无设计稿项目继续手搓 UI 或混用组件库
- **高风险触发因素**：不涉及用户资产、权限身份、跨用户数据、不可逆状态流转或外部副作用，不升 high-risk
- **审批点**：用户于 2026-06-06 确认开始落地该规划
