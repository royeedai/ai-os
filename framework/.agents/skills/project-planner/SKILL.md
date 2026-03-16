---
name: project-planner
description: >
  当任务仍处于 align 阶段、目标或范围还不清楚时，使用本 Skill 把模糊目标收敛为 Mission，明确项目模式、质量标准、范围和待确认项。
---

# 项目规划器（vNext）

本 Skill 服务 `/align`，核心不是“拆很多模块”，而是先把项目做对。

## 使用时机

- 用户说“做一个项目”
- 需求还很模糊
- 这是 reverse-spec / brownfield / change，需要先判断模式
- 你还不能清楚复述用户目标和成功标准

## 使用方式

1. 判断项目模式：`greenfield` / `reverse-spec` / `brownfield` / `change`
2. 收敛用户目标、成功标准、目标用户、关键场景
3. 明确质量优先级和当前交付档位
4. 明确范围内 / 范围外内容
5. 记录已有输入和待确认项
6. 生成或更新 `.ai-os/MISSION.md`
7. 生成或更新 `.ai-os/STATE.md`

## 输出要求

- Mission 必须可复述
- 必须明确当前阶段不是直接编码
- 待确认项必须显式写出，不得静默脑补

## 交付输出

- `.ai-os/MISSION.md`
- `.ai-os/STATE.md`

### 示例：从模糊想法进入 Mission

- 输入：一句话想法、部分截图、零散说明
- 输出：可复述的 Mission 和待确认项列表

## 禁止事项

- 禁止只因为用户很着急就跳过目标确认
- 禁止把局部改动误升成全项目重规划

## 维护信息

- 来源：`/align` workflow
- 更新时间：2026-03-16
- 已知限制：本 Skill 负责目标收敛，不替代 design / plan / build
