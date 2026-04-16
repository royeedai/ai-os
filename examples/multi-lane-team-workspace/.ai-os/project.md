# 项目章程

> 本文件记录 todo-cli 宿主项目的共享事实，不属于单条交付线。
> 当前示例采用一个 active lane、一个 draft lane 和一个 archived lane 展示团队协作拓扑。

## 项目身份

- **项目名称**：todo-cli
- **项目类型**：CLI 工具
- **仓库地址**：示例仓库（无远端）
- **主要语言与框架**：Node.js，无外部依赖

## 共享技术约束

- **运行态 / 部署环境**：本地命令行
- **核心依赖与版本锁定**：Node.js LTS，JSON 文件读写
- **API / 数据协议约束**：Todo 数据持久化为本地 JSON 数组
- **安全与合规要求**：仅本地单用户使用，不处理敏感云端数据

## 共享质量基线

- **代码规范**：参见 `CONVENTIONS.md`
- **测试策略**：以命令级回归、最小 smoke 和异常路径验证为主
- **CI / CD 管道**：示例未接入远程 CI
- **发布节奏**：按 lane 独立收口；共享代码变更需要补看受影响 lane

## 团队与协作

- **项目负责人**：AI-OS multi-lane team example
- **活跃交付线**：`default`
- **并行拓扑**：`default` (active), `reporting-export` (draft), `import-cleanup` (archived)
- **跨 lane 协调规则**：所有 lane 共享 `src/store.js` 和 CLI 命令入口契约；已归档 lane 的稳定结论必须先回流到共享 `memory.md` / `CONVENTIONS.md`
