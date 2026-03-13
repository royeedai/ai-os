---
name: project-planner
description: >
  将"做一个新项目"的口语化需求转成项目章程、范围边界、项目类型、里程碑、模块清单和风险清单。
  当需求已经超出单模块开发，或用户要求规划完整项目、路线图、交付边界时必须使用。
---

# 项目规划器

本 Skill 用于把模糊项目需求收敛成可交付的项目章程，避免 AI 在项目开始时就范围失控。

## 使用方式

1. 判断当前需求是否已经属于"项目级"而不是"单模块级"
2. 读取 `references/archetypes.md`，选择最接近的项目 archetype
3. 根据 archetype 推荐交付等级（L1 探索 / L2 标准 / L3 高风险），用户可调整
4. 使用下方项目章程模板生成 `.ai-os/project-charter.md`
5. 使用下方风险清单模板生成 `.ai-os/risk-register.md`
6. 初始化 `.ai-os/STATE.md`（使用 `.agents/templates/project/STATE.md`）
7. 输出初版里程碑、模块清单、依赖和审批点
8. 对每个模块转交给 `spec-validator` / `task-orchestrator`

## 必须产出的内容

- 项目目标与成功指标
- 范围内 / 范围外内容
- 目标用户和关键使用场景
- 非功能需求（性能、安全、稳定性、成本、兼容性）
- 初版里程碑和模块拆分
- 外部依赖、风险、人工审批点
- 交付等级（L1 / L2 / L3）

## 约束

- 不要把"项目规划"写成大而空的愿景文档，必须能落到模块和里程碑
- 不要在范围边界不清时直接进入编码
- 不要默认所有项目都套 CRUD 模板，必须先选 archetype

## 交付输出

```text
.ai-os/project-charter.md
.ai-os/risk-register.md
.ai-os/STATE.md
模块清单
交付等级
下一步推荐的 workflow
```

---

## 模板引用

- 项目章程：读取 `.agents/templates/project/project-charter.md` 作为模板生成 `.ai-os/project-charter.md`
- 风险清单：读取 `.agents/templates/project/risk-register.md` 作为模板生成 `.ai-os/risk-register.md`
