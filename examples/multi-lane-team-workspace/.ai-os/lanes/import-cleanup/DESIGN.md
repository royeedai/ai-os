# Design

## 1. 设计目标

把导入命令中的“脏数据清洗”从临时补丁升级为稳定规则。

## 2. 信息架构

- 在既有导入命令中加入 normalize 阶段
- 不新增新的用户命令面

## 3. 关键页面与交互

### 命令结构

```bash
todo import ./todos.txt
todo import ./todos.txt --replace
```

### 输出格式

```text
Imported 12 todos (2 blank lines removed, 1 duplicate removed)
```

## 4. 关键流程

1. 读取原始导入文本
2. 解析输入行
3. 执行 normalize：trim、去 BOM、去空行、去重
4. 分配新 ID 并写入共享 store
5. 输出导入摘要

## 5. 视觉方向

纯文本终端输出，强调清洗结果摘要。

## 6. 设计确认记录

- [x] 导入链路拆成 parse -> normalize -> persist
- [x] 清洗规则固定为去 BOM、空行、重复项
- [x] 清洗结论需回流到 shared memory / CONVENTIONS

## 7. 差异与待确认项

- [无待确认项]

## 8. 方案选型依据

- **为什么选择当前方案**：把导入问题收敛成稳定模式，避免未来 lane 重复踩坑
- **备选方案与放弃原因**：在命令入口做零散 if/else 补丁，难以复用和验证
- **与需求基准的对应关系**：覆盖 REQ-IMP-001

## 9. 核心约束

- **必须遵守的技术 / 产品约束**：normalize 完成前不得写入 store
- **共享基础设施约定**：共享 store 契约不变
- **共享层 / 通用抽象副作用清单**：受影响模块包括导入命令、store 写入、memory / conventions；需检查空行、BOM、重复文本和 replace 模式
- **路由 / 入口契约对照**：导入命令名不变，只补链路内部阶段
- **Schema / 存储一致性说明**：写入结果仍保持 `{ id, text, done, createdAt }`
- **同仓正常实现对照**：`default` lane 的 store 写入逻辑是同仓对照
- **不可越过的范围边界**：不扩展到导出、云同步或 UI
- **依赖前提**：导入源文件可读

## 10. 风险与注意事项

- **主要风险**：绕开 normalize 直接落盘；导入清洗结论不回流导致后续 lane 再次踩坑
- **注意事项**：本 lane 收口前必须同步共享 `memory.md` / `CONVENTIONS.md`
- **触发升级到 change-request / review 的条件**：需要改写 shared store 契约或新增远端导入源
