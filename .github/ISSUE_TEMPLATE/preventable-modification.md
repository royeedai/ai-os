---
name: Preventable Modification Feedback
about: 反馈一次 AI-OS 第一次开发后本可避免的修改，帮助后续版本收紧框架
title: "[Preventable] "
labels: framework-feedback
---

> 本模板用于反馈"你在用 AI-OS 开发完成后提出的修改中，本来 AI-OS 在第一次 session 就该让 AI 拦下"的情形。AI-OS 不收集任何遥测，所有反馈纯人工 + 公开。请只粘贴可公开的内容。

## 项目背景

- AI-OS 版本：
- 项目类型（greenfield / brownfield / reverse-spec / change）：
- 当前 lane 治理档位（G0 / G1 / G2）：

## 修改简述

一两句话描述：你后来提出的是什么修改？

## Preventability review（粘贴自你仓库 CR 文件）

直接粘贴该次 CR `baseline-log/CR-*.md` 中 `## Preventability review` 段落原文，例如：

```markdown
- Preventable: yes
- If yes, root cause: AI-OS 第一次 session 没让我确认核心交互的异常路径
- Maps to: unmapped
- Suggested guard: AGENTS.md 行为规则补一句"关键交互的异常路径未确认前不进入实现"
```

## 期望 AI-OS 第一次怎么做

你希望 AI-OS 第一次帮你开发时，AI 应该问什么、停在哪、产出什么工件，从而避免这次返工？

## 补充上下文（可选）

- 链接到你公开仓库的 CR 文件（如有）：
- 相关 baseline-log / retrospective：
- 你判断这是个例还是稳定 failure mode 的依据：
