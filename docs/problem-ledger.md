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
- **当前覆盖锚点**：`docs/interop/spec-kit-coexistence.md`、`docs/interop/claude-code.md`、`docs/interop/cursor.md`、`docs/interop/kiro.md`、`docs/interop/openspec.md`、`docs/interop/a2a.md`、`docs/interop/memory-tool.md`、`docs/interop/bmad.md`、`AGENTS.md`（绝对禁止 §13）

### PL-009 反复全量加载工件，浪费 session context

- **场景**：agent 在长 session 中没有先读 L1 入口（`STATE.md` / `lane.toml` / `framework.toml`），而是直接全量加载所有 12 工件，导致 token 浪费且行为漂移
- **AI-OS 必须保证**：工件按 L1 / L2 / L3 渐进式加载；除非用户切换阶段，不重复升级层级
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §5）、`docs/artifacts.md`（"加载分层" 章节）、`framework/skills/ai-os-delivery/SKILL.md`、`docs/interop/mcp-resources.md`（resource priority annotations）、`docs/interop/memory-tool.md`（just-in-time retrieval mapping）

### PL-010 任务交付给执行 agent / IDE 后，证据没回流到工件

- **场景**：AI-OS 把任务 handoff 给 Cursor agent / Claude Code / 本地 runner 执行，执行端完成代码后没有把测试输出、原生静态校验、影响清单等证据写回 lane 工件，导致仓库内只看到代码而看不到完成证据
- **AI-OS 必须保证**：`tasks.yaml` 在 done / verified / shipped 之前必须有 `acceptance_refs`、`evidence_required`、handoff `context_refs` / `expected_return` 与 `evidence_produced`
- **当前覆盖锚点**：`AGENTS.md`（行为规则 §交付收口、绝对禁止 §12）、`docs/cli.md`（W076）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/constitution-spec.md`（v1.5）

### PL-011 agent 把推断 / 未观察的信息当事实进入实现或交付

- **场景**：agent 在没有源码、网络抓包、运行截图、原生校验等证据时，把"应该是这样"的推断、"通常这样"的常识、"AI 默认行为"的偏好直接当作 confirmed 进入 tasks 与 verification
- **AI-OS 必须保证**：`tasks.yaml` `fact_state_review` 必须把每条事实标为 `observed` / `confirmed` / `inferred` / `unknown`；`inferred` 必须留 assumptions，`unknown` 必须进入待确认或非目标，closed 任务不得保留未解决 `inferred` / `unknown`
- **当前覆盖锚点**：`AGENTS.md`（五条核心要求 §1、绝对禁止 §1）、`docs/cli.md`（W077）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/constitution-spec.md`（v1.6）

### PL-010 非交付对话误触发治理

- **场景**：用户只是想先聊需求、解释代码、比较方案、问工具用法、运行临时命令或处理非仓库任务，但 agent 因仓库存在 `.ai-os/` 自动进入 debug / plan / verification，读取 lane 工件甚至写入 `MISSION.md` / `DESIGN.md` / `tasks.yaml`
- **AI-OS 必须保证**：先经过 Activation Gate；只有 delivery-affecting work 才启用 AI-OS artifact governance，普通对话不得读写 lane 工件
- **当前覆盖锚点**：`AGENTS.md`（启用门槛）、`README.md`（How agents use AI-OS）、`framework/skills/ai-os-delivery/SKILL.md`、`docs/artifacts.md`、`docs/constitution-spec.md`、`examples/non-delivery-discussion.md`、`test/docs.test.js`

### PL-011 长时程 / 后台 agent 交付回收不可审查

- **场景**：agent 把任务交给后台、云端、外部 PR agent 或并行 subagent 后，只拿到一句“完成了”或一个 diff；缺 branch / PR / session refs、写入范围、测试证据、人工审查和 unresolved risks 记录，导致无法判断是否可接受
- **AI-OS 必须保证**：长时程 agent work 不进入执行层编排，但必须通过 `agent_run_review` 记录 run refs、write scope、progress checkpoints、return packet、human review status，并由 doctor W078 检查关闭前证据
- **当前覆盖锚点**：`docs/artifacts.md`（Long-Horizon Agent Reliability Loop）、`docs/constitution-spec.md`（v1.8）、`framework/.agents/templates/lane/tasks.yaml`、`framework/.agents/templates/lane/verification-matrix.yaml`、`docs/interop/long-horizon-agents.md`、`examples/background-agent-handoff.md`、`bin/ai-os-doctor.js`、`test/doctor.test.js`、`test/docs.test.js`

### PL-012 AI-OS 第一次开发未拦住本可避免的修改

- **场景**：用户用 AI-OS 完成首轮交付后，又提出一批修改；这些修改的根因其实是 AI-OS 第一次 session 没问的问题、没锁的设计或没让用户确认的范围——本可在第一次就拦掉，却让框架进入了下一轮返工
- **AI-OS 必须保证**：CR `baseline-log/CR-*.md` 提供 `## Preventability review` 段落（`Preventable` / `If yes, root cause` / `Maps to` / `Suggested guard`），lane 关闭前补一条 `BL-*-retrospective*.md` 聚合本 lane 所有 Preventability findings；AI-OS maintainer 通过 dogfooding `git grep` 与 GitHub `framework-feedback` issue 定期归并到本台账，并按 guard 落点优先级（AGENTS.md > 工件模板 > doctor > docs）在下一个 minor 收紧
- **当前覆盖锚点**：`AGENTS.md`（行为规则 §需求变化、§交付收口）、`framework/.agents/templates/lane/baseline-log/BL-template.md`、`docs/artifacts.md`、`docs/constitution-spec.md`（v1.9）、`docs/cli.md`（W079a / W079b）、`docs/maintainers.md`（Framework feedback 复盘章节）、`.github/ISSUE_TEMPLATE/preventable-modification.md`

### PL-013 开发者级与项目级记忆混写，污染项目共享层或丢失个人偏好

- **场景**：用户把"我个人的编码 / 沟通偏好"（语言、工具链、风格、激进度）commit 进 `.ai-os/memory.md`，让所有 contributor 背个人习惯；或反过来把"这个项目的稳定决策 / 跨层契约"写进 agent shell 的 home 级 global rules（Cursor user rules、Claude Code 全局 CLAUDE.md、Codex 全局 instructions），导致换电脑或换人后项目真相丢失
- **AI-OS 必须保证**：开发者级记忆（第 4 层，按本机 OS 用户 / home 目录识别）属于各 agent shell 的 global rules，AI-OS 不自造第二真理源、不引入 identity / 登录态 / 云端；项目级记忆（第 2/3 层）留在 `.ai-os/`，冲突时项目工件赢；跨机同步个人偏好走 dotfiles 而非 AI-OS
- **当前覆盖锚点**：`docs/interop/developer-memory.md`、`docs/interop/memory-tool.md`、`docs/interop/cursor.md`、`docs/interop/claude-code.md`、`PROJECT_PURPOSE.md`（§3.5）、`AGENTS.md`（绝对禁止 §10、§13）

### PG-001 新问题没有独立登记，重构后覆盖漂移

- **AI-OS 必须保证**：问题先进入台账，再进入实现与测试
- **当前覆盖锚点**：`docs/problem-ledger.md`、`docs/maintainers.md`、`docs/change-evaluation-template.md`

## 历史归档（v7 / v8 legacy anchors）

- v7 workflow、skill、policy、reference 体系
- v8 root-only 默认布局叙事
- 已删除的示例、lane CLI、status / resume / validate / gate / release-check 等旧命令锚点
- 已移除的 `.ai-os/CONVENTIONS.md`、`.ai-os/project.md`、`acceptance.yaml` 直连锚点

这些历史锚点只用于迁移理解，不再视为“当前覆盖”。
