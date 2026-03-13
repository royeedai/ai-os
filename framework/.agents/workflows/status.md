---
description: 查看项目当前位置、任务概览、阻塞项和下一步
---

# 项目状态流程

当用户说"现在做到哪了"、"看下当前状态"、"status"时触发。

## 何时使用

- 新 session 刚恢复上下文
- 需要快速了解当前里程碑、模块、阶段和任务进度
- 自动推进前想先确认全局方位

## 不该使用

- 用户明确要求直接继续做任务，且 `STATE.md` 已经足够清楚
- 当前目标是检查代码质量或发布准备

## 会读取什么

- `.ai-os-project/STATE.md`
- `.ai-os-project/tasks.yaml`
- 必要时 `.ai-os-project/acceptance.yaml`

## 输出要求

1. 总结 `.ai-os-project/STATE.md` 中的当前位置
2. 汇总 `.ai-os-project/tasks.yaml` 的任务状态分布
3. 列出阻塞项和当前记录的下一步
4. 若 `.ai-os-project/STATE.md` 缺失或过旧，明确指出需要先补全
