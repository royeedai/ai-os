# Design

## 1. 设计目标

在不破坏现有 CRUD 命令的前提下，为 todo-cli 增加最小可用的导出能力。

## 2. 信息架构

- 继续保留单一入口 `todo`
- 新增子命令：`export --format <jsonl|csv> --output <path> [--all|--done|--pending]`

## 3. 关键页面与交互

### 命令结构

```bash
todo export --format jsonl --output report.jsonl
todo export --format csv --output report.csv --done
todo export --format csv --output report.csv --pending
```

### 输出格式

- 命令成功后输出 `Exported <count> todos to <path>`
- 不改变现有 `list` / `add` / `done` / `delete` 的输出格式

## 4. 关键流程

1. 读取 `~/.todo.json`
2. 复用既有过滤语义得到待导出列表
3. 将结果格式化为 `jsonl` 或 `csv`
4. 写入目标文件
5. 输出导出条数与路径

## 5. 视觉方向

纯文本终端输出，成功信息单行显示。

## 6. 设计确认记录

- [x] 新增子命令 `export`
- [x] 支持 `jsonl` / `csv`
- [x] 过滤语义与 `list` 保持一致
- [ ] 最终 help 文案与错误提示待实现完成后再确认

## 7. 差异与待确认项

- CSV 字段顺序固定为 `id,text,done,createdAt`
- 暂不支持自定义分隔符

## 8. 方案选型依据

- **为什么选择当前方案**：直接在现有 CLI 上增加只读子命令，影响面最小
- **备选方案与放弃原因**：导出独立二进制或远端 API 会引入额外运行态，不适合当前 lane
- **与需求基准的对应关系**：覆盖 REQ-REP-001 的最小闭环

## 9. 核心约束

- **必须遵守的技术 / 产品约束**：导出过程只读，不得修改原始 JSON
- **共享基础设施约定**：继续复用 `src/store.js` 作为唯一数据来源
- **共享层 / 通用抽象副作用清单**：受影响模块包括 `bin/todo.js`、`src/commands.js`、未来的 `src/export.js`；需检查 help 文案、参数解析、空数据导出和无权限写文件场景
- **路由 / 入口契约对照**：`bin/todo.js` 为唯一入口，新子命令名不能吞掉既有静态命令
- **Schema / 存储一致性说明**：导出结构来自 `{ id, text, done, createdAt }`，不追加未声明字段
- **同仓正常实现对照**：`src/commands.js` 中既有 list 过滤逻辑作为同仓对照
- **不可越过的范围边界**：不修改存储格式，不引入远端上传
- **依赖前提**：目标导出路径可写

## 10. 风险与注意事项

- **主要风险**：新增命令解析影响既有 CLI 行为；CSV 转义遗漏导致输出不可用
- **注意事项**：共享代码变更后，要在进入 `/verify` 时补看 `default` lane
- **触发升级到 change-request / review 的条件**：若需要改写 `src/store.js`、CLI help 全局格式或输出契约
