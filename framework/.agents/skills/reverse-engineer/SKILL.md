---
name: reverse-engineer
description: >
  在 reverse-spec 模式下，把截图、API、参考源码和口述收敛为 Design、Spec 和 Parity Map。
---

# 逆向规格器

本 Skill 服务 `/design` 和 `/plan`，目标不是“照抄”，而是先把要保真的东西说清。

## 使用时机

- 用户提供截图、URL、API 文档、参考源码
- 任务目标是对标、复刻、仿制或参考实现
- 需要把素材变成结构化设计和规格

## 必做步骤

1. 盘点素材覆盖度，识别缺口
2. 从截图 / 页面抓取信息架构、关键页面、关键交互
3. 从 API / 数据样例提取 contracts、状态流转和边界条件
4. 从参考源码提取“必须一致”和“允许改写”的行为
5. 更新 `.ai-os/DESIGN.md`
6. 更新 `.ai-os/design-pack/parity-map.md`
7. 把仍不确定的内容标为 `[待确认]`

## 产出

- 关键页面和关键流程设计
- parity map
- 可进入 `/plan` 的输入，而不是直接跳实现

## 交付输出

- `.ai-os/DESIGN.md`
- `.ai-os/design-pack/parity-map.md`
- 待确认项清单

## 禁止事项

- 禁止素材不足时假装规格完整
- 禁止把参考对象自动当成兼容目标
- 禁止只做 UI 对照，不做逻辑对照

## 维护信息

- 来源：`/design`、`/plan` workflow
- 更新时间：2026-03-16
- 已知限制：素材不足时只能暴露不确定性，不能替用户拍板
