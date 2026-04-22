# AI-OS 问题台账

本文件记录 AI-OS 必须持续覆盖的稳定问题，以及它们在当前版本中的真实承接点。

## 当前覆盖

### PL-001 需求一模糊，AI 就直接开工

- **AI-OS 必须保证**：先澄清目标、成功标准和范围边界，再进入设计或实现
- **当前覆盖锚点**：`AGENTS.md`、`.ai-os/lanes/default/MISSION.md`、`examples/greenfield-guided-product.md`

### PL-002 需求变化后，代码和基线脱节

- **AI-OS 必须保证**：任何需求变化先写 lane `baseline-log/CR-*.md`
- **当前覆盖锚点**：`AGENTS.md`、`docs/artifacts.md`、`.ai-os/lanes/default/baseline-log/`

### PL-003 关键设计没锁就进入实现

- **AI-OS 必须保证**：设计锁定先于大规模实现
- **当前覆盖锚点**：`AGENTS.md`、`.ai-os/lanes/default/DESIGN.md`、`examples/brownfield-change-journey.md`

### PL-004 bug 修复越界，修 A 坏 B

- **AI-OS 必须保证**：先定界，再修复，再验证影响范围
- **当前覆盖锚点**：`AGENTS.md`、`examples/debug-bounded-fix.md`、`.ai-os/lanes/default/tasks.yaml`

### PL-005 完成声明没有项目级证据

- **AI-OS 必须保证**：至少一项项目原生静态校验证据 + 回归结论 + 交付双清单
- **当前覆盖锚点**：`AGENTS.md`、`docs/cli.md`、`.ai-os/lanes/default/verification-matrix.yaml`

### PL-006 session 切换后丢失当前交付上下文

- **AI-OS 必须保证**：从 lane `STATE.md` 恢复当前方位，从 root `MISSION.md` 恢复共享上下文
- **当前覆盖锚点**：`AGENTS.md`、`docs/getting-started.md`、`.ai-os/lanes/default/STATE.md`

### PL-007 默认布局真相分叉

- **AI-OS 必须保证**：install、doctor、upgrade、README、schema、tests 只表达一套 canonical layout
- **当前覆盖锚点**：`README.md`、`docs/artifacts.md`、`docs/constitution-spec.md`、`bin/create-ai-os.js`、`bin/ai-os-doctor.js`、`bin/ai-os-upgrade.js`、`test/docs.test.js`

### PG-001 新问题没有独立登记，重构后覆盖漂移

- **AI-OS 必须保证**：问题先进入台账，再进入实现与测试
- **当前覆盖锚点**：`docs/problem-ledger.md`、`docs/maintainers.md`、`docs/change-evaluation-template.md`

## 历史归档（v7 / v8 legacy anchors）

- v7 workflow、skill、policy、reference 体系
- v8 root-only 默认布局叙事
- 已删除的示例、lane CLI、status / resume / validate / gate / release-check 等旧命令锚点
- 已移除的 `.ai-os/CONVENTIONS.md`、`.ai-os/project.md`、`acceptance.yaml` 直连锚点

这些历史锚点只用于迁移理解，不再视为“当前覆盖”。
