---
name: project-planner
description: >
  当任务仍处于 align 阶段、目标或范围还不清楚时，使用本 Skill 把模糊目标收敛为薄 Mission 基线章程，明确项目模式、质量标准、关键选型、范围和待确认项。
---

# 项目规划器

本 Skill 服务 `/align`，核心不是“拆很多模块”，而是先把项目做对。

## 使用时机

- 用户说“做一个项目”
- 需求还很模糊
- 这是 reverse-spec / brownfield / change，需要先判断模式
- 你还不能清楚复述用户目标和成功标准

## 使用方式

1. 判断项目模式：`greenfield` / `reverse-spec` / `brownfield` / `change`
2. 收敛用户目标、成功标准、目标用户、关键场景
3. 用 `../../references/risk-triggers.md` 中的硬触发规则判断当前交付档位；命中任一类时直接升级为 `high-risk`
4. 明确关键技术栈、目标运行态和关键工程选型，区分已确认与待确认
5. 明确范围内 / 范围外内容
6. 记录已有输入、待确认项和高风险触发因素
7. 生成或更新 `.ai-os/MISSION.md`，只保留低频、已确认、共享的交付基线
8. 新增或更新 `.ai-os/baseline-log/` 中的基线记录文件
9. 生成或更新 `.ai-os/STATE.md`

## 输出要求

- Mission 必须可复述
- 必须明确当前阶段不是直接编码
- 关键技术栈和关键选型若影响交付结果，必须显式记录确认状态
- 命中硬触发高风险档时，不能仍写成标准档
- 待确认项必须显式写出，不得静默脑补

## 交付输出

- `.ai-os/MISSION.md`
- `.ai-os/baseline-log/`
- `.ai-os/STATE.md`

### 示例：从模糊想法进入 Mission

- 输入：一句话想法、部分截图、零散说明
- 输出：可复述的 Mission、最新 baseline 记录和待确认项列表

## 禁止事项

- 禁止只因为用户很着急就跳过目标确认
- 禁止替用户默认拍板关键技术栈和不可逆方案
- 禁止把局部改动误升成全项目重规划

## 维护信息

- 来源：`/align` workflow
- 更新时间：2026-03-17
- 已知限制：本 Skill 负责目标收敛，不替代 design / plan / build
