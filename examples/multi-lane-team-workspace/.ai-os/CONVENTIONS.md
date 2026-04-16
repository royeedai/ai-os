# 代码约定

> 本文件记录 multi-lane todo-cli workspace 的共享代码基准。

## 命名约定

- **函数命名模式**：动词开头的 camelCase，如 `loadTodos`、`exportTodos`、`normalizeImportedTodos`
- **变量 / 常量命名**：局部变量 camelCase，常量 UPPER_SNAKE_CASE
- **文件 / 目录命名**：CLI 入口和模块使用短横线或语义文件名

## 代码模式

- **数据获取**：所有文件读写集中在 store 层
- **批处理链路**：导入 / 导出命令统一采用 `parse -> normalize -> persist` 三段式，不在命令入口混合处理
- **错误处理**：命令层把文件、参数和批处理错误转成可读提示
- **状态管理**：不引入全局状态，命令执行时现读现写

## 导入与分层

- **允许的导入方向**：命令层 -> store / import / export 层
- **禁止的跨层依赖**：store 层不反向依赖命令层
- **共享契约**：所有 lane 共享同一 JSON 数据结构 `{ id, text, done, createdAt }`

## 日志约定

- **日志框架**：不单独引入日志框架
- **日志级别使用**：CLI 错误直接输出到 stderr
- **必须包含的上下文**：失败命令、目标 Todo ID 或文件路径

## 禁止模式

- 不在命令层直接操作 JSON 文件
- 不吞掉文件权限或格式错误
- 不在批处理命令里绕开 normalize 阶段直接落盘
