---
name: project-planner
description: >
  将"做一个新项目"的口语化需求转成项目章程、范围边界、项目类型、里程碑、模块清单和风险清单。
  当需求已经超出单模块开发，或用户要求规划完整项目、路线图、交付边界时必须使用。
---

# 项目规划器

本 Skill 用于把模糊项目需求收敛成可交付的项目章程，避免 AI 在项目开始时就范围失控。

## 使用时机

- 用户说“做一个新项目”
- 需求已经超出单模块开发
- 需要先明确项目范围、里程碑、模块拆分和风险
- 需要把口语化想法收敛成 `.ai-os/project-charter.md`

## 使用方式

1. 判断当前需求是否已经属于“项目级”而不是“单模块级”
2. 读取 `references/archetypes.md`，选择最接近的项目 archetype
3. 若项目存在用户可见界面，按 `.agents/references/derived-rules.md` 的“目标市场适配”规则确认目标市场、主要使用地区和体验参考方向
4. 为项目中的每个核心模块声明：
   - 模块类型：`页面类` / `API 类` / `数据处理类` / `工具类`
   - 默认交付等级：`L1` / `L2` / `L3`
5. 若项目存在明显的共享基础能力依赖结构，按 `.agents/references/derived-rules.md` 的“共享基础能力优先”规则，先规划基础能力层与首条业务闭环
6. 使用项目章程模板生成 `.ai-os/project-charter.md`
7. 使用风险清单模板生成 `.ai-os/risk-register.md`
8. 初始化 `.ai-os/STATE.md`（使用 `.agents/templates/project/STATE.md`）
9. 输出初版里程碑、模块清单、依赖、交付等级和审批点
10. 对后续模块转交给 `spec-validator` / `task-orchestrator`

## 必须产出的内容

- 项目目标与成功指标
- 范围内 / 范围外内容
- 目标用户和关键使用场景
- 目标市场 / 主要使用地区
- 体验 / 视觉参考方向（现有设计系统、品牌规范或默认交互风格）
- 项目 archetype
- 每个核心模块的模块类型和默认交付等级
- 初版里程碑和模块拆分
- 基础能力层与业务模块的依赖关系（如适用）
- 第一阶段的首条可运行业务闭环（如适用）
- 非功能需求（性能、安全、稳定性、成本、适配范围 / 支持环境）
- 外部依赖、风险、人工审批点

## 约束

- 不要把“项目规划”写成大而空的愿景文档，必须能落到模块和里程碑
- 不要在范围边界不清时直接进入编码
- 不要默认所有项目都套 CRUD 模板，必须先选 archetype，再确定模块类型
- 不要把所有模块都默认设为 L2；应按风险和交付目标选择最低足够的交付等级
- 对于复刻/参考驱动项目，按 `.agents/references/derived-rules.md` 的“参考来源命名边界”规则处理命名和描述
- 对于用户可见界面，按 `.agents/references/derived-rules.md` 的“目标市场适配”规则处理市场与体验方向
- 对于存在共享基础能力依赖的项目，按 `.agents/references/derived-rules.md` 的“共享基础能力优先”规则处理阶段目标与依赖顺序

## 交付输出

```text
.ai-os/project-charter.md
.ai-os/risk-register.md
.ai-os/STATE.md
模块清单（含模块类型和交付等级）
下一步推荐的 workflow
```

## 模板引用

- 项目章程：读取 `.agents/templates/project/project-charter.md` 作为模板生成 `.ai-os/project-charter.md`
- 风险清单：读取 `.agents/templates/project/risk-register.md` 作为模板生成 `.ai-os/risk-register.md`

## 维护信息

- 来源：`framework/AGENTS.md`、`.agents/references/derived-rules.md`、`references/archetypes.md`、`.agents/templates/project/`
- 更新时间：2026-03-15
- 已知限制：本 Skill 负责项目级规划，不替代模块级 spec、任务拆分和验收工作
