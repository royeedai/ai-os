---
name: find-skills
description: >
  帮助用户从 skills.sh 开放生态中发现和安装 AI 智能体 Skills。
  当用户问"怎么做 X"、"有没有 X 的 Skill"或想扩展 AI 能力时使用。
---

# 搜索和安装 Skills

本 Skill 帮助你从 skills.sh 开放生态中发现和安装新的 Skills。

## 使用时机

当用户：
- 问"怎么做 X"，而 X 可能有现成的 Skill
- 说"找一个 X 的 Skill"
- 问"你能做 X 吗"，而 X 是一个专业能力
- 想搜索工具、模板或工作流
- 希望在某个领域获得帮助（设计、测试、部署等）

## Skills CLI 是什么？

Skills CLI（`npx skills`）是开放 AI 智能体 Skills 生态的包管理器。

**常用命令**：
- `npx skills find [关键词]` — 搜索 Skills
- `npx skills add <包名>` — 安装 Skill
- `npx skills check` — 检查更新
- `npx skills update` — 更新所有已安装 Skills

**浏览 Skills**：https://skills.sh/

## 搜索流程

### 第一步：理解需求

识别：
1. 领域（如 React、测试、设计、部署）
2. 具体任务（如写测试、创建动画、审查代码）
3. 是否足够通用，可能有现成 Skill

### 第二步：搜索

```bash
npx skills find [关键词]
```

示例：
- 用户问"怎么优化 React 性能"→ `npx skills find react performance`
- 用户问"帮我做 Code Review"→ `npx skills find code review`
- 用户问"需要做 changelog"→ `npx skills find changelog`

### 第三步：展示结果

找到相关 Skills 后，向用户展示：
1. Skill 名称和功能
2. 安装命令
3. 了解更多的链接

### 第四步：安装

如果用户想安装：

```bash
npx skills add <owner/repo@skill> -y
```

## 常用 Skill 分类

| 分类 | 搜索关键词 |
|------|-----------|
| Web 开发 | react, nextjs, typescript, css, tailwind |
| 测试 | testing, jest, playwright, e2e |
| DevOps | deploy, docker, kubernetes, ci-cd |
| 文档 | docs, readme, changelog, api-docs |
| 代码质量 | review, lint, refactor, best-practices |
| 设计 | ui, ux, design-system, accessibility |
| 效率工具 | workflow, automation, git |

## 搜索技巧

1. **使用具体关键词**："react testing" 比 "testing" 更精准
2. **尝试同义词**："deploy" 没找到试试 "deployment" 或 "ci-cd"
3. **查看热门来源**：`vercel-labs/agent-skills`、`obra/superpowers`

## 没找到时

如果没有相关 Skills：
1. 告知用户没有找到
2. 提供直接帮助
3. 建议用户创建自己的 Skill：`npx skills init my-skill`
