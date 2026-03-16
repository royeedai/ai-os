---
name: clone-project
description: 复刻项目完整流程（从素材到逆向分析到标准交付）
---

# 复刻项目流程

当用户说"复刻/仿制一个系统"、"照着 XX 做一个"、"抄一个类似的"时触发此流程。

## 阶段一：素材收集与评估

1. 确认项目目标：复刻哪个系统、还原到什么程度（功能逻辑级 / UI 参考级）
2. 在项目根目录创建 `.ai-os/references/clone-materials/` 目录，按类型建子目录：
   - `screenshots/` — 截图
   - `api/` — API 文档、Swagger、Postman 导出
   - `code-reference/` — 参考源码、仓库快照或关键代码片段
   - `urls.md` — URL 列表
   - `descriptions.md` — 文字描述
3. 如参考源码不直接放入仓库，至少记录仓库路径 / 分支 / commit / 使用说明，写入 `.ai-os/references/clone-materials/code-reference/README.md`
4. 引导用户将素材放入对应目录
5. 明确参考源码的使用边界：是仅用于理解业务逻辑，还是必须兼容部分接口 / 数据结构 / 行为
6. 使用 `reverse-engineer` 的 `references/material-checklist.md` 评估素材覆盖度
7. 如果关键模块素材覆盖度为"低"，**先提醒用户补充，不要强行启动分析**

## 阶段二：逆向分析与项目规划

8. 调用 `reverse-engineer`，对所有素材执行逆向分析
9. 产出模块清单（含优先级和依赖关系）
10. 为每个模块生成 `.spec.md` 草稿（使用 `clone-spec-template.md`），存入 `.ai-os/specs/`
11. 额外生成 `.ai-os/reference-code-map.md`，把当前模块与参考源码中的关键路径、关键函数、接口入口和已确认必须保持一致的行为建立映射
12. 所有产出必须以**当前项目**为主体命名和描述；参考对象只允许出现在"参考来源"一节或 `.ai-os/reference-code-map.md` 中，不得把 `legacy`、"原项目"、"兼容旧系统"、源系统品牌名等带入模块名、页面名、用户文案、验收项，除非用户明确要求迁移或兼容
13. 调用 `project-planner`，选择"复刻/仿制项目" archetype，生成 `.ai-os/project-charter.md`
14. 汇总所有 `[待确认]` 条目，向用户集中确认
15. 用户确认后，调用 `spec-validator` 验证每个 spec 的完整性
16. 调用 `task-orchestrator` 生成 `.ai-os/tasks.yaml`
17. 调用 `acceptance-gate` 生成 `.ai-os/acceptance.yaml`

> **门禁检查点**：阶段二产出（spec + tasks + acceptance）经用户确认后，方可进入阶段三。此时每个模块已具备完整的 spec、任务图和验收条件，不需要再重复创建。

## 阶段三：标准交付（与新项目合流）

18. 按 `.ai-os/tasks.yaml` 顺序，对每个模块走 `/new-module` 的**阶段二（技术设计）起**——跳过阶段零（需求澄清）和阶段一（需求定义），因为 spec、tasks、acceptance 已在本流程阶段二完成
19. 模块实现前，先查看对应 spec 中的"参考锚点"和 `.ai-os/reference-code-map.md`，只按需回查相关旧代码，不要把整套参考仓库默认视为当前实现边界
20. 中途对方补充新截图/API/参考源码时，走 `/change-request` 同步更新 spec、`.ai-os/reference-code-map.md` 和任务
21. 模块完成后走 `/review`
22. 准备交付时走 `/ship`
