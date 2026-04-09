# AI-OS 定位与叙事演进草案

## 1. 当前叙事分析

### 现状

当前 README 核心叙事是：

> AI-OS 是一套给 AI 开发助手使用的**项目交付操作系统**。
> 它的目标不是让 AI 更自动写代码，而是让 AI 更稳定地引导你把项目做对。
> AI-OS 让 AI 按"高质量交付"工作，而不只是按"代码生成"工作。

### 优点
- 方向正确：全生命周期交付治理
- 差异化明确：不是代码生成，是交付质量
- 问题驱动：从真实痛点出发

### 问题
- "操作系统"隐喻太重，暗示一个全面运行时，增加心理负担
- 叙事偏防御性（"我们不是X，而是Y"），缺少正面的一句话定位
- 没有与行业主流概念（harness、spec-driven、deterministic）建立共鸣
- 首屏太长才到安装命令（第 100+ 行）

## 2. 行业叙事趋势对照

| 项目 | 一句话定位 | 核心概念 |
|---|---|---|
| Archon | "Make AI coding deterministic and repeatable" | Workflow engine, harness |
| Spec-Kit | "Build high-quality software faster" | Spec-driven development |
| GitHub Agentic Workflows | "Continuous AI alongside CI/CD" | Intent-driven automation |
| SufficientDaikon/Archon | "Your AI agents are winging it. Archon makes them disciplined." | Agent discipline |

共同特征：
- 简短、正面、行动导向
- 关键词：deterministic、repeatable、disciplined、high-quality
- 不需要解释"不是什么"

## 3. 建议的新叙事方案

### 方案 A：保留"AI-OS"名称，更新叙事

```
# AI-OS

Make AI project delivery deterministic, verifiable, and recoverable.

AI-OS is a delivery harness for AI coding agents. It turns vibe coding into 
disciplined engineering — with phase gates, evidence-based completion, and 
cross-session memory.
```

核心概念重组：
- "Delivery harness" 替代 "项目交付操作系统"
- "Deterministic, verifiable, recoverable" 提炼三个核心价值
- "Phase gates" 对应新的 YAML 门禁系统
- "Evidence-based completion" 保留差异化能力
- "Cross-session memory" 保留独特价值

### 方案 B：双语叙事（中文为主，英文标语）

```
# AI-OS

> Make AI project delivery deterministic, verifiable, and recoverable.

AI-OS 是一套给 AI 编码代理使用的交付线束（delivery harness）。

它把 vibe coding 变成有纪律的工程实践——通过阶段门禁、证据化完成和跨会话记忆。
```

### 方案 C：最锐利版本

```
# AI-OS

Your AI agents ship slop. AI-OS makes them ship quality.

5 phase gates. 4 quality doors. 1 recoverable memory.
```

## 4. 核心叙事元素建议

### 4.1 一句话定位（任选）

- "The delivery harness for AI coding agents"
- "Make AI project delivery deterministic"
- "Phase gates + evidence + memory for AI coding"

### 4.2 三句话说明

1. AI 编码工具让你写代码很快，但交付质量不稳定——需求没说清就开工、设计没锁就编码、验证没做就宣称完成。
2. AI-OS 在你的项目中安装一套阶段门禁（align → design → plan → build → verify → ship），每个阶段有可执行的前置条件检查，AI agent 不满足条件就不能推进。
3. 加上跨会话可恢复的项目记忆（STATE.md + memory.md），AI 换了 session 也知道项目做到了哪里。

### 4.3 快速上手（Quick Start 前置）

```bash
# 5 分钟上手
npx create-ai-os my-project --quick

# 检查门禁
npx create-ai-os gate align
```

### 4.4 差异化表（简化版）

| | Vibe Coding | Spec-Kit | Archon | AI-OS |
|---|---|---|---|---|
| 需求对齐 | 无 | /specify | 无 | /align + 门禁 |
| 设计锁定 | 无 | /plan | 无 | /design + 门禁 |
| 可执行门禁 | 无 | 无 | YAML 引擎 | YAML + CLI |
| 证据化完成 | 无 | 无 | 无 | 四门验证 |
| 跨 session 恢复 | 无 | 无 | 无 | STATE + memory |
| 变更管理 | 无 | 无 | 无 | /change-request |

## 5. README 结构建议

```
1. 一句话定位 + 安装命令（首屏 5 行内）
2. Quick Start（5 步，15 行）
3. 它解决什么问题（精简到 5 个最痛的问题）
4. 与 vibe coding / Spec-Kit / Archon 的差异（简表）
5. 完整工作流参考
6. CLI 参考
7. IDE 兼容性
8. 链接到详细文档
```

关键改变：安装命令从第 100+ 行提前到第 5 行。

## 6. 需要用户确认的决策

1. 是否保留"AI-OS"名称？还是考虑更贴近行业的名称？
2. 选择哪个叙事方案（A/B/C）？
3. README 首页是否以英文为主？（考虑到 GitHub 受众）
4. 是否在首屏突出 `--quick` 安装而非完整安装？
