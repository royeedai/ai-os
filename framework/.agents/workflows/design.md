---
name: design
description: 锁定关键信息架构、页面、交互、视觉方向和关键流程
---

# /design

当 Mission 已经明确，但关键页面、信息架构、关键交互、视觉方向或关键流程还没锁定时触发。

## 目标

先把“做成什么样”说清，再进入完整开发。

## 必做步骤

1. 读取 `.ai-os/MISSION.md` 和 `.ai-os/STATE.md`
2. 确认本轮必须先锁的关键页面 / 关键流程 / 核心接口旅程
3. 生成或更新 `.ai-os/DESIGN.md`：
   - 信息架构
   - 关键页面与交互
   - 关键流程
   - 视觉方向
   - 设计确认记录
4. 如果是 `reverse-spec` 模式，生成或更新 `.ai-os/design-pack/parity-map.md`
5. 把已锁定内容与待确认项写回 `.ai-os/STATE.md`
6. 若关键设计仍未确认，暂停在此，不进入 `/build`

## 输出

- `.ai-os/DESIGN.md`
- `.ai-os/design-pack/parity-map.md`（reverse-spec 适用）
- 更新后的 `.ai-os/STATE.md`

## 禁止事项

- 没有关键页面和流程定义，不得声称“可以开始完整开发”
- 禁止把视觉细节未定等同于逻辑可直接开工
