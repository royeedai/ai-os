# Eval: Reference Code Anchoring

## 场景

用户要复刻或参考一个已有系统，除了产品描述、截图和接口文档，还提供了旧仓库或关键源码，希望 AI 在开发阶段能够对照复杂业务逻辑。

## 常见错误规划

- 只把旧源码当成零散备注，没有进入正式素材清单
- 开发时反复全量扫描参考仓库，没有形成模块级锚点
- 直接把参考源码当成当前项目需求定义，跳过 spec / tasks / acceptance
- 把参考仓库的命名、legacy 包袱、旧接口边界直接带入当前项目

## AI-OS 预期行为

- `/clone-project` 把参考源码视为正式素材类型之一
- `reverse-engineer` 先从参考源码提炼模块边界、关键逻辑锚点和一致性要求，再写入当前项目 spec
- 产出 `.ai-os/reference-code-map.md`，让实现阶段按需回查旧代码，而不是无约束地实时依赖整仓扫描
- 默认围绕当前项目命名和验收；只有用户明确要求兼容时，才把兼容要求写入 spec 和 reference map

## 最低证据

- 素材清单包含参考源码路径 / 仓库 / commit 信息
- 每个需要对照逻辑的模块，在 spec 中都有“参考锚点”或等价结构
- 项目中存在 `.ai-os/reference-code-map.md` 或等价工件，记录模块与参考代码入口的映射
- 输出明确区分“必须保持一致的行为”和“允许改写的行为”

## 若需改 framework，优先检查

- `framework/.agents/workflows/clone-project.md`
- `framework/.agents/skills/reverse-engineer/SKILL.md`
- `framework/.agents/skills/reverse-engineer/references/material-checklist.md`
- `framework/.agents/skills/reverse-engineer/references/clone-spec-template.md`
- `framework/.agents/templates/project/reference-code-map.md`
