# Spec: todo-cli

## 1. 模块概述

命令行 Todo 管理工具，支持 add/list/done/delete 四个核心命令。

## 2. 业务规则与目标

- 每个 todo 有唯一 ID（自增整数）
- 新建 todo 默认 `done: false`
- ID 不存在时报错

## 3. 界面 / 接口 / 命令清单

| 命令 | 输入 | 输出 |
|------|------|------|
| `todo add <text>` | 文本内容 | `Added #<id>: <text>` |
| `todo list [--all\|--done\|--pending]` | 过滤选项 | 格式化列表 |
| `todo done <id>` | 数字 ID | `Done #<id>: <text>` |
| `todo delete <id>` | 数字 ID | `Deleted #<id>` |

- **交互模式**：同步 CLI（request/response）
- **推荐模式理由**：单次命令执行，无需流式或长轮询
- **拒绝的交互模式**：streaming、websocket

## 4. 关键流程与状态流转

```
[pending] --done--> [completed]
[any] --delete--> [removed]
```

- **契约基准**：JSON 文件格式 `[{ id, text, done, createdAt }]`
- **字段映射/适配说明**：无中间层，直接读写 JSON
- **集成触点**：文件系统 ~/.todo.json

## 5. 数据与契约

```json
{
  "id": 1,
  "text": "买牛奶",
  "done": false,
  "createdAt": "2026-03-26T10:00:00Z"
}
```

## 6. 边界条件与异常处理

| 场景 | 预期行为 |
|------|----------|
| add 空文本 | 报错：Text is required |
| done 不存在的 ID | 报错：Todo #<id> not found |
| delete 不存在的 ID | 报错：Todo #<id> not found |
| 文件损坏 | 报错提示并建议手动修复 |
| 权限不足 | 报错提示检查文件权限 |

- **异常/空数据证据**：上述 5 个场景均需在 verify 阶段有测试输出

## 7. 验收与证据

- 4 个命令正常执行
- 5 个异常场景有正确错误提示
- JSON 文件读写无数据丢失
