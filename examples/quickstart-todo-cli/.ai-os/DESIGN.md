# Design

## 1. 设计目标

用最少代码实现可靠的本地 Todo CLI。

## 2. 信息架构

- 单一入口 `todo` 命令
- 子命令：`add <text>`, `list [--all|--done|--pending]`, `done <id>`, `delete <id>`

## 3. 关键页面与交互

### 命令结构

```
todo add "买牛奶"          → 添加任务，输出 ID
todo list                  → 列出待办任务
todo list --all            → 列出全部任务
todo done 3                → 标记 #3 为完成
todo delete 3              → 删除 #3
```

### 输出格式

```
  #1 [ ] 买牛奶
  #2 [x] 写周报
  #3 [ ] 修 bug
```

## 4. 关键流程

1. 读取 ~/.todo.json（不存在则创建空数组）
2. 执行命令操作
3. 写回 ~/.todo.json
4. 输出结果

## 5. 视觉方向

纯文本终端输出，`[x]` 表示完成，`[ ]` 表示待办。

## 6. 设计确认记录

- [x] 命令结构已确认
- [x] 数据格式已确认：`{ id, text, done, createdAt }`
- [x] 存储路径已确认：`~/.todo.json`

## 7. 差异与待确认项

（无待确认项）
