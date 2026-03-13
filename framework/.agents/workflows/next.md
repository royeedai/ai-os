---
name: next
description: 基于 tasks.yaml 依赖图推断当前最值得执行的就绪任务
---

# 下一步流程

当用户说"下一步做什么"、"next"、"还有什么可以继续"时触发。

## 何时使用

- 任务图已经存在，希望快速找出 ready task
- 自动推进前人工确认执行顺序
- 当前任务完成后，需要决定接下来做哪一项

## 不该使用

- 仍处于需求澄清阶段，尚未形成 `.ai-os/tasks.yaml`
- 当前存在 blocker，需要先解决阻塞而不是继续挑选任务

## 会读取什么

- `.ai-os/STATE.md`
- `.ai-os/tasks.yaml`

## 输出要求

1. 先展示 `.ai-os/STATE.md` 中记录的"下一步"
2. 再列出 `status: todo` 且依赖满足、wave 合法的 ready task
3. 对 `risk: high` 的任务标注需要人工确认
4. 若没有就绪任务，提示检查 blocker、依赖或验收门禁
