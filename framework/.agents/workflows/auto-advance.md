---
name: auto-advance
description: 在设计门和逻辑门通过后按任务波次自动推进
---

# /auto-advance

## 前置条件

- `.ai-os/tasks.yaml` 存在
- `.ai-os/acceptance.yaml` 存在
- 设计确认门已通过
- 逻辑确认门已通过
- 用户已明确授权自动推进

## 执行规则

- 按 wave 顺序推进
- 命中 `approval_required` 立即暂停
- 每完成一批任务都要回写 `STATE.md`
- 发现设计偏差、逻辑冲突或证据缺失时立即停下
