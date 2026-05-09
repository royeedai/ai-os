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

### PL-008 跨工具真理源混乱

- **场景**：项目同时引入 Spec-Kit、AI-OS、Cursor rules、Kiro steering、OpenSpec 等多套工件，每套都自称"真理源"，导致需求 / 设计 / 变更记录在多处独立漂移
- **AI-OS 必须保证**：每个工件类别只承认一个真理源；其他工具的工件以 reference 形式接入，不再独立维护同语义内容
- **当前覆盖锚点**：`docs/interop/spec-kit-coexistence.md`、`docs/interop/claude-code.md`、`docs/interop/cursor.md`、`docs/interop/kiro.md`、`docs/interop/openspec.md`、`docs/interop/a2a.md`、`AGENTS.md`（绝对禁止 §13）

### PL-009 反复全量加载工件，浪费 session context

- **场景**：agent 在长 session 中没有先读 L1 入口（`STATE.md` / `lane.toml` / `framework.toml`），而是直接全量加载所有 12 工件，导致 token 浪费且行为漂移
- **AI-OS 必须保证**：工件按 L1 / L2 / L3 渐进式加载；除非用户切换阶段，不重复升级层级
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §5）、`docs/artifacts.md`（"加载分层" 章节）、`framework/skills/ai-os-delivery/SKILL.md`、`docs/interop/mcp-resources.md`（resource priority annotations）

### PL-010 任务交付给执行 agent / IDE 后，证据没回流到工件

- **场景**：AI-OS 把任务 handoff 给 Cursor agent / Claude Code / 本地 runner 执行，执行端完成代码后没有把测试输出、原生静态校验、影响清单等证据写回 lane 工件，导致仓库内只看到代码而看不到完成证据
- **AI-OS 必须保证**：`tasks.yaml` 在 done / verified / shipped 之前必须有 `acceptance_refs`、`evidence_required`、handoff `context_refs` / `expected_return` 与 `evidence_produced`
- **当前覆盖锚点**：`AGENTS.md`（行为规则 §交付收口、绝对禁止 §12）、`docs/cli.md`（W076）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/constitution-spec.md`（v1.5）

### PL-011 agent 把推断 / 未观察的信息当事实进入实现或交付

- **场景**：agent 在没有源码、网络抓包、运行截图、原生校验等证据时，把"应该是这样"的推断、"通常这样"的常识、"AI 默认行为"的偏好直接当作 confirmed 进入 tasks 与 verification
- **AI-OS 必须保证**：`tasks.yaml` `fact_state_review` 必须把每条事实标为 `observed` / `confirmed` / `inferred` / `unknown`；`inferred` 必须留 assumptions，`unknown` 必须进入待确认或非目标，closed 任务不得保留未解决 `inferred` / `unknown`
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §1、绝对禁止 §1）、`docs/cli.md`（W077）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/constitution-spec.md`（v1.6）

### PG-001 新问题没有独立登记，重构后覆盖漂移

- **AI-OS 必须保证**：问题先进入台账，再进入实现与测试
- **当前覆盖锚点**：`docs/problem-ledger.md`、`docs/maintainers.md`、`docs/change-evaluation-template.md`

## 历史归档（v7 / v8 legacy anchors）

- v7 workflow、skill、policy、reference 体系
- v8 root-only 默认布局叙事
- 已删除的示例、lane CLI、status / resume / validate / gate / release-check 等旧命令锚点
- 已移除的 `.ai-os/CONVENTIONS.md`、`.ai-os/project.md`、`acceptance.yaml` 直连锚点

这些历史锚点只用于迁移理解，不再视为“当前覆盖”。
