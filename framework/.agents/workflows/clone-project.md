---
description: 复刻项目完整流程（从素材到逆向分析到标准交付）
---

# 复刻项目流程

当用户说"复刻/仿制一个系统"、"照着 XX 做一个"、"抄一个类似的"时触发此流程。

## 阶段一：素材收集与评估

1. 确认项目目标：复刻哪个系统、还原到什么程度（功能逻辑级 / UI 参考级）
2. 在项目根目录创建 `.ai-os/references/clone-materials/` 目录，按类型建子目录：
   - `screenshots/` — 截图
   - `api/` — API 文档、Swagger、Postman 导出
   - `urls.md` — URL 列表
   - `descriptions.md` — 文字描述
3. 引导用户将素材放入对应目录
4. 使用 `reverse-engineer` 的 `references/material-checklist.md` 评估素材覆盖度
5. 如果关键模块素材覆盖度为"低"，**先提醒用户补充，不要强行启动分析**

## 阶段二：逆向分析与项目规划

6. 调用 `reverse-engineer`，对所有素材执行逆向分析
7. 产出模块清单（含优先级和依赖关系）
8. 为每个模块生成 `.spec.md` 草稿（使用 `clone-spec-template.md`），存入 `.ai-os/specs/`
9. 调用 `project-planner`，选择"复刻/仿制项目" archetype，生成 `.ai-os/project-charter.md`
10. 汇总所有 `[待确认]` 条目，向用户集中确认
11. 用户确认后，调用 `spec-validator` 验证每个 spec 的完整性
12. 调用 `task-orchestrator` 生成 `.ai-os/tasks.yaml`
13. 调用 `acceptance-gate` 生成 `.ai-os/acceptance.yaml`

> **门禁检查点**：阶段二产出（spec + tasks + acceptance）经用户确认后，方可进入阶段三。此时每个模块已具备完整的 spec、任务图和验收条件，不需要再重复创建。

## 阶段三：标准交付（与新项目合流）

14. 按 `.ai-os/tasks.yaml` 顺序，对每个模块走 `/new-module` 的**阶段二（技术设计）起**——跳过阶段零（需求澄清）和阶段一（需求定义），因为 spec、tasks、acceptance 已在本流程阶段二完成
15. 中途对方补充新截图/API 时，走 `/change-request` 同步更新 spec 和任务
16. 模块完成后走 `/review`
17. 准备交付时走 `/ship`
