# Spec: todo-cli

## 1. 模块概述

命令行 Todo 管理工具，支持 add/list/done/delete 四个核心命令。

## 2. 业务规则与目标

- 每个 todo 有唯一 ID（自增整数）
- 新建 todo 默认 `done: false`
- ID 不存在时报错

## 3. 界面 / 接口 / 命令清单

| 命令 | 输入 | 输出 | input_mode |
|------|------|------|------------|
| `todo add <text>` | 文本内容 | `Added #<id>: <text>` | `manual_text` |
| `todo list [--all\|--done\|--pending]` | 过滤选项 | 格式化列表 | `static_preset`（固定 flag） |
| `todo done <id>` | 数字 ID | `Done #<id>: <text>` | `manual_number`（本地自增小整数，无 Long 精度风险） |
| `todo delete <id>` | 数字 ID | `Deleted #<id>` | `manual_number`（同上） |

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

- **契约基准**：JSON 文件格式 `[{ id, text, done, createdAt }]`
- **输入**：CLI 参数 `add <text>`、`list [--all|--done|--pending]`、`done <id>`、`delete <id>`
- **输出**：格式化终端输出或错误提示
- **关键字段 / 状态枚举**：`id` 为自增整数；`done` 为 `true / false`
- **字段映射/适配说明**：无中间 DTO / adapter，命令层直接读写 JSON 结构
- **共享层 / 包装层副作用审计**：本例无统一 wrapper / interceptor / BaseEntity；若后续引入统一存储抽象，需检查命令输出与 JSON 契约是否被间接改变
- **集成触点**：Node.js `fs`、`os.homedir()`、`~/.todo.json`
- **路由 / 入口契约对照**：`bin/todo.js` 提供唯一命令入口；子命令名称必须与 CLI help 和命令表一致
- **静态路径 / 动态路径冲突备注**：本例无 HTTP 路由；CLI 子命令使用固定静态命令名，禁止引入会吞掉固定命令的通配命令解析
- **Schema / 存储一致性说明**：持久化结构必须与 `DESIGN.md` 中确认的数据格式一致，不得额外写入未声明字段
- **同仓正常实现对照**：`src/store.js` 的读写逻辑与 `src/commands.js` 的命令映射是本例的同仓正常实现
- **持久化 / 外部依赖**：本地 JSON 文件，无远端依赖
- **受影响模块 / 文件边界**：`src/store.js`、`src/commands.js`、`bin/todo.js`

## 5.5 User Journey 闭环契约

> 本例为 CLI 单栈项目，无"前端 UI 消费后端接口"的端到端链路。显式声明"暂无跨栈 journey"以满足 spec 模板的 5.5 节要求。

- 暂无跨栈 journey：所有命令在单次进程内完成，无多接口串联、无前后端字段映射。
- 后续如果引入 HTTP 或前端，必须把本节从"暂无"升级为真实 journey 表，并为每条 journey 补一个 `[E2E-SMOKE]` 任务。

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
- **最小验证步骤**：每次修改 `src/store.js` 或 `src/commands.js` 后，先跑 `node --check` 和一个最小 CLI smoke，再继续下一处改动
