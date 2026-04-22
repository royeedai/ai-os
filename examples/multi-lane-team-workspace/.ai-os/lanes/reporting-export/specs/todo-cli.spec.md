# Spec: todo-cli export

## 1. 模块概述

为 todo-cli 增加导出命令，支持生成 JSONL / CSV 快照。

## 2. 业务规则与目标

- 导出过程只读，不修改原始 todo 数据
- 过滤语义与 `list` 保持一致
- CSV 字段顺序固定为 `id,text,done,createdAt`

## 3. 界面 / 接口 / 命令清单

| 命令 | 输入 | 输出 | input_mode |
|------|------|------|------------|
| `todo export --format jsonl --output <path> [--all\|--done\|--pending]` | 格式、输出路径、过滤选项 | `Exported <count> todos to <path>` | `static_preset`（`--format` 枚举） + `manual_text`（`--output` 路径） |
| `todo export --format csv --output <path> [--all\|--done\|--pending]` | 同上 | `Exported <count> todos to <path>` | 同上 |

- **交互模式**：同步 CLI（request/response）
- **推荐模式理由**：导出是一次性本地命令
- **拒绝的交互模式**：streaming、websocket

## 4. 关键流程与状态流转

```text
read todos -> filter -> serialize -> write file -> print summary
```

- **契约基准**：输入结构 `[{ id, text, done, createdAt }]`，输出为 JSONL / CSV 文件
- **字段映射/适配说明**：无中间 DTO；CSV 仅做字段重排和转义
- **集成触点**：文件系统、`src/store.js`

## 5. 数据与契约

- **契约基准**：JSON 文件格式 `[{ id, text, done, createdAt }]`
- **输入**：`--format`、`--output`、`--all|--done|--pending`
- **输出**：导出文件和终端提示
- **关键字段 / 状态枚举**：`format` 只允许 `jsonl` / `csv`
- **字段映射/适配说明**：CSV 字段顺序固定，不新增字段
- **共享层 / 包装层副作用审计**：命中共享入口 `bin/todo.js` 和 `src/commands.js`；需检查 help、参数解析、空数据导出和文件权限场景
- **集成触点**：Node.js `fs`、导出目标路径
- **路由 / 入口契约对照**：`export` 作为静态子命令追加到 `bin/todo.js`，不能误吞既有命令
- **静态路径 / 动态路径冲突备注**：本例无 HTTP 路由；子命令名必须保持静态匹配
- **Schema / 存储一致性说明**：导出读取的源结构必须与 shared store 契约一致
- **同仓正常实现对照**：`list` 的过滤逻辑是 export lane 的同仓对照
- **持久化 / 外部依赖**：本地文件，无远端依赖
- **受影响模块 / 文件边界**：`bin/todo.js`、`src/commands.js`、未来的 `src/export.js`

## 5.5 User Journey 闭环契约

> 本 lane 为 CLI 单栈导出 lane，无前后端跨栈 journey。显式声明"暂无跨栈 journey"以满足 spec 模板的 5.5 节要求。

- 暂无跨栈 journey：`todo export` 一次性完成，无前端 UI / 外部接口串联。

## 6. 边界条件与异常处理

| 场景 | 预期行为 |
|------|----------|
| 未传 `--output` | 报错：Output path is required |
| 未知 format | 报错：Unsupported export format |
| 空列表导出 | 成功生成空文件并提示导出 0 条 |
| 目标目录不可写 | 报错提示检查文件权限 |

- **异常/空数据证据**：上述 4 个场景需在 verify 阶段有 smoke 或测试输出

## 7. 验收与证据

- 导出命令可生成 JSONL / CSV 文件
- 导出过程不修改原始 JSON 数据
- 最少需要一条共享入口副作用验证
- **最小验证步骤**：每次修改 `bin/todo.js` 或 `src/commands.js` 后，先跑 `node --check` 和一次导出 smoke，再继续下一处改动
