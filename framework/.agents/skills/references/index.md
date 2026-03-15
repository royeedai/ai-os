# Skill 编写参考

如果你要在当前项目里新增或重构自定义 Skill，先看这组文件：

- `skill-spec.md`：Skill 的最小结构、命名和边界要求
- `quality-checklist.md`：发版前的自查清单
- `anti-patterns.md`：最常见的失败写法与修正方式

建议流程：

1. 先按 `skill-spec.md` 写出最小可用版本
2. 再按 `quality-checklist.md` 补齐边界、模板和维护信息
3. 最后运行 `create-ai-os skill-check .agents/skills/<skill-name> --strict`
