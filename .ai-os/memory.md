# AI-OS 共享记忆

## active

### 1. 设计决策

#### DD-001: v9 采用 shared-root + default lane 作为唯一 canonical layout

- **决策**：根层只承载共享宿主上下文和共享记忆，当前交付工件全部进入 `.ai-os/lanes/default/`
- **原因**：修复 v8 中 README / schema / CLI / 测试对默认布局表达不一致的问题
- **影响范围**：AGENTS、templates、install、doctor、upgrade、docs、examples、tests
- **确认来源**：2026-04-22 用户确认执行 v9 计划
- **日期**：2026-04-22

### 2. 工程约束

#### EC-001: 核心治理能力必须能在已承诺环境稳定承接

- **约束**：进入根层治理和 CLI 的能力不能依赖单一 IDE 的专有加载机制
- **原因**：AI-OS 的定位是跨 agent 宪法，不是某个 IDE 的私有插件
- **影响范围**：CLI、README、docs、examples
- **确认来源**：PROJECT_PURPOSE.md + docs/maintainers.md
- **日期**：2026-04-22

### 3. 已知坑点

#### PT-001: 文档真相与安装真相分叉会直接降低交付质量

- **问题**：同一版本里同时存在 root-only 和 default-lane 两套默认布局叙事
- **根因**：重构后规范、实现、测试、维护文档未一起回正
- **绕行方案**：任何 major 布局变更必须同时改 AGENTS、schema、CLI、upgrade、tests
- **影响范围**：交付一致性、doctor 可信度、用户心智模型
- **日期**：2026-04-22

### 4. 技术债追踪

#### TD-001: legacy project 模板仍保留用于迁移辅助

- **类型**：architecture-violation
- **严重度**：low
- **影响范围**：framework templates、upgrade 兼容逻辑
- **消除计划**：后续在确认不再需要 v8 root-only 兼容后清理 project legacy 模板
- **日期**：2026-04-22

## archived

> 不再生效的条目移到这里，归档而非删除。
