# 项目记忆

> 分层策略：active 条目优先加载，archived 条目按需查阅。

## 元数据

- **最后更新**：2026-04-16
- **活跃条目数**：6
- **归档条目数**：0

## 1. 设计决策

### DD-001: 继续使用 JSON 文件存储
- **决策**：继续使用本地 JSON 文件而非引入 SQLite
- **原因**：todo-cli 仍以零依赖和本地可运行闭环为核心约束
- **影响范围**：存储层、spec、README
- **确认来源**：default lane Mission / Design
- **活跃度**：active
- **日期**：2026-03-16

### DD-002: CLI 输出与批处理契约保持稳定
- **决策**：导出与导入功能都必须复用现有 CLI 过滤语义，不能改写主线 list 输出格式
- **原因**：`default` 与 `reporting-export` / `import-cleanup` 都共享同一命令入口和用户心智
- **影响范围**：commands、spec、verify
- **确认来源**：shared project charter
- **活跃度**：active
- **日期**：2026-04-16

## 2. 逻辑与契约决策

### CD-001: 文件不存在时自动初始化
- **决策**：文件不存在时自动创建空数组，不报错
- **原因**：降低首次使用门槛，保持 CLI 闭环
- **影响范围**：store.js、spec、验证路径
- **确认来源**：default lane Verify
- **活跃度**：active
- **日期**：2026-03-16

### CD-002: 导入清洗先去 BOM、空行和重复项
- **决策**：`import-cleanup` lane 归档前确认，导入流程统一执行 trim、BOM 清理、空行过滤和重复文本去重
- **原因**：导入问题属于稳定 failure mode，不能继续留在已归档 lane 的私有工件里
- **影响范围**：导入流程、批处理 smoke、异常路径验证
- **确认来源**：import-cleanup lane postmortem
- **活跃度**：active
- **日期**：2026-04-16

## 3. 工程约束

### EC-001: 保持零外部依赖
- **约束**：实现不得引入 npm 依赖
- **原因**：示例要保持最小可运行闭环
- **影响范围**：package.json、实现方式、文档
- **确认来源**：shared project charter
- **活跃度**：active
- **日期**：2026-03-16

### EC-002: 批处理命令统一走 parse -> normalize -> persist
- **约束**：导入 / 导出相关逻辑必须显式分成 parse、normalize、persist 三段，不得在命令入口内联混写
- **原因**：这是 `import-cleanup` lane 收口后回流出的稳定代码模式
- **影响范围**：未来 import/export 扩展、review、CONVENTIONS
- **确认来源**：import-cleanup lane postmortem
- **活跃度**：active
- **日期**：2026-04-16

## 4. 用户偏好

- [无]

## 5. 已知坑点

### KP-001: 导出与导入都不能绕开共享 store 契约
- **坑点**：如果直接在命令层操作 JSON，会导致 `default`、`reporting-export`、`import-cleanup` 三条 lane 对数据结构的假设漂移
- **应对**：统一通过 `src/store.js` 读取基础数据，再做 lane 特有逻辑
- **活跃度**：active
- **日期**：2026-04-16

## 6. 技术债追踪

- [无]

## 归档区

- [无归档条目]
