# Skill 编写规范

本文件定义 AI-OS 项目中一个“可交付 Skill”至少应满足什么要求。

目标不是把每个 Skill 都写成大文档，而是让它：

- 可判定触发
- 可执行
- 不乱触发
- 可维护

## 1. 目录与命名

- 一个 Skill 应位于 `.agents/skills/<skill-name>/`
- 入口文件必须是 `SKILL.md`
- `skill-name` 应使用小写字母、数字和连字符，并以字母开头
- 目录名应与 frontmatter 中的 `name` 一致

## 2. Frontmatter

`SKILL.md` 必须以 YAML frontmatter 开头：

```yaml
---
name: my-skill
description: "这个 Skill 做什么；当遇到什么任务时应该使用。"
---
```

要求：

- `name` 必须稳定、可复用，不要带空格和中文标点
- `description` 不能只写“帮助处理 X”
- `description` 应同时说明“做什么 + 何时使用”

好的描述示例：

- `验证 .spec 文件完整性；当创建或审阅模块 spec 时使用`
- `发布前检查交付条件；当模块准备上线或交付时使用`

差的描述示例：

- `帮助做代码审查`
- `和 API 相关`

## 3. 基线要求

所有 Skill 至少应满足以下基线：

1. 有明确 frontmatter
2. 有明确的触发条件或使用时机
3. 有明确的执行步骤、操作方式或检查流程
4. 有边界、约束、禁止事项，避免误触发和过度承诺

如果一个 Skill 连“什么时候用、怎么做、什么不做”都说不清，就不应该进入主库。

## 4. 生产级增强

当 Skill 进入高频复用或承担关键交付环节时，建议补齐以下内容：

- 输出模板、报告模板或交付格式
- `references/` 里的长文档、模板或案例
- `references/index.md` 导航入口
- 维护信息：来源、更新时间、已知限制

这部分是 `skill-check --strict` 重点检查的内容。

## 5. 推荐结构

AI-OS 不强制所有 Skill 使用完全相同的标题，但建议覆盖这些语义区块：

1. `使用时机` / `触发条件`
2. `使用方式` / `操作步骤` / `流程`
3. `约束` / `禁止事项` / `适用边界`
4. `模板引用` / `交付输出` / `报告模板`
5. `维护信息`

一个最小骨架示例：

```markdown
---
name: my-skill
description: "做什么；当什么任务出现时使用。"
---

# My Skill

## 使用时机

- 触发条件 1
- 触发条件 2

## 使用方式

1. 第一步
2. 第二步
3. 第三步

## 约束

- 不适用场景
- 缺少哪些输入时必须先问清楚

## 模板引用

- 输出模板或报告格式

## 维护信息

- 来源：
- 更新时间：
- 已知限制：
```

## 6. `references/`

满足以下任一条件时，建议把长内容拆到 `references/`：

- `SKILL.md` 已经很长，难以扫描
- 领域知识、模板、案例明显增多
- 存在多个专项文档、排障指南或参考表

建议结构：

```text
my-skill/
├── SKILL.md
└── references/
    ├── index.md
    ├── examples.md
    └── troubleshooting.md
```

原则：

- `SKILL.md` 负责触发、执行、边界
- `references/` 负责深度内容、模板、案例、长参考

## 7. `scripts/` 与 `assets/`

- `scripts/` 只放明确、最小、可复用的辅助脚本
- `assets/` 只放模板、静态资源或示例配置
- 不要为了“看起来完整”而机械增加空目录

## 8. 反模式边界

- 不要把大段文档直接贴进 `SKILL.md`
- 不要只有理念，没有步骤
- 不要只有“可做什么”，没有“什么情况下不要用”
- 不要把项目特例包装成通用 Skill

更多例子见 `anti-patterns.md`

## 9. 校验方式

基础检查：

```bash
create-ai-os skill-check .agents/skills/<skill-name>
```

严格检查：

```bash
create-ai-os skill-check .agents/skills/<skill-name> --strict
```

`--strict` 适合在准备合并、发布或把 Skill 作为模板复用前执行。
