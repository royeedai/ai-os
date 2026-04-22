# Spec: todo-cli import cleanup

## 1. 模块概述

在导入命令中加入稳定的 normalize 阶段，统一清洗 BOM、空行和重复文本。

## 2. 业务规则与目标

- 导入前必须先 trim / 去 BOM / 去空行 / 去重
- normalize 完成前不得写入共享 store
- 新 ID 继续使用共享自增规则

## 3. 界面 / 接口 / 命令清单

| 命令 | 输入 | 输出 | input_mode |
|------|------|------|------------|
| `todo import <file>` | 文件路径 | `Imported <count> todos (...)` | `manual_text`（文件路径） |
| `todo import <file> --replace` | 文件路径、replace 选项 | 同上 | `manual_text` + `static_preset`（`--replace` 固定 flag） |

- **交互模式**：同步 CLI（request/response）
- **推荐模式理由**：本地一次性批处理
- **拒绝的交互模式**：streaming、websocket

## 4. 关键流程与状态流转

```text
read input -> parse lines -> normalize -> assign ids -> persist
```

- **契约基准**：写入结果仍为 `[{ id, text, done, createdAt }]`
- **字段映射/适配说明**：normalize 只处理文本，不新增额外业务字段
- **集成触点**：文件系统、`src/store.js`

## 5. 数据与契约

- **契约基准**：JSON 文件格式 `[{ id, text, done, createdAt }]`
- **输入**：文件路径、可选 `--replace`
- **输出**：导入摘要
- **关键字段 / 状态枚举**：`replace` 为布尔开关
- **字段映射/适配说明**：导入文本映射成 `text` 字段，`done` 默认 `false`
- **共享层 / 包装层副作用审计**：命中共享 store 和命令入口；需检查空行、BOM、重复文本和 replace 模式
- **集成触点**：Node.js `fs`、共享 store
- **路由 / 入口契约对照**：导入命令名称不变，只补内部 normalize 阶段
- **静态路径 / 动态路径冲突备注**：本例无 HTTP 路由
- **Schema / 存储一致性说明**：写入结构必须与 shared store 契约一致
- **同仓正常实现对照**：`default` lane 的 CRUD 写入逻辑是同仓对照
- **持久化 / 外部依赖**：本地文件，无远端依赖
- **受影响模块 / 文件边界**：导入模块、`src/store.js`、共享 memory / CONVENTIONS

## 5.5 User Journey 闭环契约

> 本 lane 为 CLI 单栈批处理 lane，无前后端跨栈 journey。显式声明"暂无跨栈 journey"以满足 spec 模板的 5.5 节要求。

- 暂无跨栈 journey：`todo import` 在单次进程内完成，无多接口串联、无前后端字段映射。

## 6. 边界条件与异常处理

| 场景 | 预期行为 |
|------|----------|
| BOM 开头文件 | 自动清理 BOM 后继续导入 |
| 仅空行输入 | 成功导入 0 条并提示 |
| 重复文本 | 去重后只写入 1 条 |
| 文件不存在 | 报错提示检查路径 |

- **异常/空数据证据**：上述 4 个场景需在 verify 阶段有 smoke 或测试输出

## 7. 验收与证据

- normalize 规则全部生效
- 导入结果不污染共享 store
- lane 收口前共享 `memory.md` / `CONVENTIONS.md` 已更新
- **最小验证步骤**：每次修改导入链路后，先跑 `node --check` 和一次导入 smoke，再继续下一处改动
