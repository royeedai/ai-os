# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)：

- **patch** (x.y.z)：bugfix、文案修正、文档补全、测试与治理收口
- **minor** (x.y.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

---

## 7.4.0 (2026-04-22)

### Added

- `ai-os-validate` 对 7.3.0 新增的 4 条规则补 CLI 确定性兜底（全部 WARNING，不 block，保持渐进兼容）：`.ai-os/CONVENTIONS.md` 跨层契约登记表五节存在性（PL-033）、spec 第 3 节 `input_mode` 列存在性（PL-035）、spec 5.5 节 User Journey 闭环契约存在性（PL-035）、spec 声明真实 journey 时 `tasks.yaml` 必须含 `[E2E-SMOKE]` 任务（PL-035）
- `test/validate.test.js` 新增 16 项断言覆盖以上四类 CLI 校验的正反场景；`npm test` 从 1086 → 1102 项断言全绿
- `docs/interop/spec-kit-coexistence.md` + `examples/coexist-with-spec-kit.md`：说明 AI-OS 与 GitHub Spec-Kit 两种共存模式（Spec-Kit 主导 + AI-OS 治理 / AI-OS 自包含），以及工件映射和禁忌反模式
- `docs/problems.md`：把 README 里冗长的"常见问题 → AI-OS 做法"长表下沉到单独文档；README 首屏改为"一句话定位 + 安装命令 + 差异化简表"，安装命令从第 100+ 行前移到第 5-13 行

### Changed

- `framework/.agents/skills/code-review-guard/SKILL.md` 重写：从 300 行压缩到 254 行（-15.3%），token 从 7464 → 6075（-18.6%），全部反模式语义 1:1 保留。Step 1.5b 弱类型洞扫描改为 8 行表格化；Step 0 B/C 合并，Step 2/3 按模块类型整合为单一表格；lite 模式总 token 从 78345 → 77466 净减少
- `framework/.agents/references/derived-rules.md` 追加 PL-034 弱类型洞 8 类反模式表格（在 4.4 节）、PL-035 E2E-SMOKE 失败即视为 journey 未通过的显式禁令与 CLI 兜底说明（在 2.4 节）
- `examples/quickstart-todo-cli/`、`examples/multi-lane-team-workspace/`（3 lane）同步到 7.3.0 模板标准：CONVENTIONS 补跨层契约登记表五节、spec 第 3 节补 `input_mode` 列、spec 补 5.5 节（CLI 单栈显式声明"暂无跨栈 journey"）
- `bin/shared.js` 新增 `VALIDATION_SCHEMAS.conventionsCrossLayerRegistry` / `specUserJourneySection` / `specInputModeColumn` / `tasksE2eSmokeMarker` 四个常量，供 validate 和未来 gate 校验复用
- `docs/maintainers.md` 主示例清单追加 `examples/coexist-with-spec-kit.md`
- `docs/problem-ledger.md` PL-033 ~ PL-036 的"当前覆盖锚点"字段追加 `bin/ai-os-validate.js` 对应校验项

## 7.3.0 (2026-04-22)

### Added

- 4 个新 root eval：`evals/implicit-cross-layer-contract-undocumented.md`、`evals/weak-type-hole-erodes-contract.md`、`evals/e2e-journey-broken-by-single-point-pass.md`、`evals/cross-module-same-defect-not-escalated.md`，把三轮全栈复盘里 15+ 条建议按 4 个稳定根因压缩成回归基线
- `docs/problem-ledger.md` 新增 PL-033 ~ PL-036 四条条目，分别覆盖：隐式跨层契约缺乏显式登记表 / 弱类型洞导致契约擦除 / 单点接口合格 ≠ 端到端 user journey 闭环 / 跨模块同型缺陷只修单点没升级为全仓扫描

### Changed

- `framework/.agents/templates/project/CONVENTIONS.md`：新增"跨层契约登记表"专章（5 个强制子节）：HTTP 状态码 ↔ 业务码 ↔ 客户端行为映射、Wire 类型契约、名单型常量反向真理源、敏感数据 service 方法语义档位、中间件/查询引擎方言契约
- `framework/.agents/skills/code-review-guard/SKILL.md`：Step 1.5 新增"弱类型洞扫描"子检查项（Map 契约 / 笼统 catch / DTO 字段使用者 / UI 自产字段 / 控件默认行为 / 输入归一化 owner 六类反模式）；Step 0 新增 C 节"横切基础设施 bean 全仓审计"
- `framework/.agents/templates/project/specs/example.spec.md`：第 3 节"界面/接口/命令清单"表格新增 `input_mode` 列；新增第 5.5 节 User Journey 闭环契约
- `framework/.agents/templates/project/tasks.yaml`：新增 E2E-SMOKE wave 任务示例（验收标准为本地启动栈走完用户实际路径）
- `framework/.agents/skills/systematic-debugging/SKILL.md`：第二阶段（模式分析）新增 Step 5"跨模块同型缺陷扫描"，命中即升级为 P1/P0 全仓扫描
- `framework/.agents/skills/database-schema-design/SKILL.md`：第四步增补"列容量必须对照业务负载估算"，禁止 `VARCHAR(200/500)` 作为默认
- `framework/.agents/workflows/plan.md`、`design.md`、`verify.md`、`debug.md` 同步补齐：跨层契约登记表前置核对、input_mode 声明、E2E-SMOKE 任务拆分、跨模块同型缺陷升级触发条件
- `framework/.agents/references/derived-rules.md` 新增 2.4（端到端 journey 必须独立任务承担）、4.8（跨层契约必须在 CONVENTIONS.md 显式登记）、4.9（同型缺陷必须升级）三节；4.4 节追加禁止弱类型洞作为契约载体
- 整合策略采用根因压缩，不在 framework 里硬编码项目特定决策（不写"必须 Long→String"、"必须用 el-select"），项目特定锁定留给项目自己在 CONVENTIONS.md 登记

## 7.2.2 (2026-04-17)

### Changed

- `lane activate` 现在会把已归档 lane 视为重新打开的交付线，并清掉旧的 archive outcome / sync 元数据，避免 lane 被重新激活后仍携带过期的归档状态
- framework 宪法、CLAUDE.md / GEMINI.md 生成逻辑与 `project-state` 的恢复提示已清理旧的根层单交付路径，统一改成 lane-aware 叙事，并保留 legacy 项目的退化说明
- README、CLI 文档和安装回归测试同步补齐了“重新打开 archived lane”与“session init 先判定当前 lane”的说明

## 7.2.1 (2026-04-16)

### Added

- `evals/lane-archive-without-shared-reflux.md`：为 lane 归档只改状态、未回流共享记忆的失误补了 root eval
- `examples/lane-archive-shared-memory-reflux.md`：补了一份 lane 收口与 shared memory reflux 的最小示例说明
- `examples/multi-lane-team-workspace/`：新增 canonical 团队协作示例，展示 `1 active + 1 draft + 1 archived` 拓扑，以及 archived lane 的 memory / CONVENTIONS reflux

### Changed

- `create-ai-os lane archive` 现在会稳定保留已归档 lane 的既有 `archived_at` / sync metadata，避免重复收口时把归档元数据误写回 `pending`
- `status` / `doctor` / `lane list` 对 archived lane 的收口结果与 reflux 状态有了更清晰的可见性；lane 关闭不再只是一个 `status = "archived"` 字段
- framework 的 `/ship`、`/postmortem` 与团队协作文档同步补齐了 lane 收口规则：归档前先把稳定结论回流到共享 `memory.md` / `CONVENTIONS.md`
- README、CLI、Artifacts、maintainers、problem-ledger、7.2 backlog 与回归测试同步收口，`7.2` 团队协同增强阶段的出口条件现已完整闭合

## 7.2.0 (2026-04-16)

### Added

- `docs/evolution/multi-delivery-lanes-7.2-backlog.md`：正式把 `7.2` 团队协同增强拆成 lane 元数据与可见性、lane 收口与记忆回流、多 lane canonical example 三个 workstream，避免后续推进继续依赖会话记忆

### Changed

- lane 元数据从最小身份信息提升到团队协同可见信息：`lane.toml` 与 `buildLaneMetadata` 现在稳定承载 `quality_tier`、`risk_tier`、`owner`，其中 `risk_tier` 在未显式声明时会由 `quality_tier` 推导
- `create-ai-os lane add` 新增 `--risk-tier`，`lane list` 会显示 topology、quality / risk / owner，并标出缺失 owner、使用推导 risk tier 或 metadata 非法的 lane
- `status` / `doctor` 现在会输出当前 lane 的 metadata 摘要与并行拓扑，帮助团队确认自己正在操作哪条 lane，而不是只看到“当前项目”
- README、CLI、Artifacts、canonical quickstart example、问题台账和回归测试同步改成 `7.2` 的 lane metadata / topology 叙事

## 7.1.5 (2026-04-16)

### Changed

- AI-OS 新增了三类从真实复杂项目复盘抽象出的交付护栏：shared layer / 通用抽象副作用审计、schema / route / wrapper parity 先于复用、以及代码状态 / 数据状态 / 运行状态三分诊断
- `design` / `plan` / `build` / `debug` / `verify` workflow、根层宪法与工件模板同步补齐了这些要求，并把同仓正常实现对照与 step validation 前移到了执行阶段
- `ai-os-validate` 现在会对 spec / tasks / acceptance 中缺失的 shared-layer / parity / step-validation 锚点给出 warning；canonical quickstart 示例也已升级到零 warning 新基线
- 新增 `shared-layer-side-effect-audit-missed`、`parity-before-reuse-skipped`、`fix-complete-but-data-runtime-not-recovered` 三个 root eval，避免这轮规则在后续重写中回退

## 7.1.4 (2026-04-16)

### Changed

- framework 分发工作流把 `/build`、`/ship` 也补齐到 lane 进入规则：实现和交付前都必须先确认当前 lane，不再默认沿用根层单当前交付语义
- `/build` 与 `/ship` 现在明确要求：命中共享代码 / 契约 / 基础设施时，要记录其他受影响 lane，并在验证或收口时说明哪些 lane 已覆盖、哪些仍待补回归
- README、CLI、`docs/workflows.md`、问题台账和安装回归测试同步补齐这组 lane-sensitive workflow 说明

## 7.1.3 (2026-04-16)

### Changed

- `ai-os-validate`、`create-ai-os gate`、`ai-os-release-check` 在存在 Git 基线时，会结合当前 worktree 改动路径给出更高置信度的 lane 候选：命中共享根层工件、其他 lane 工件，或 `.ai-os/` 之外的仓库文件时，会优先提示最可能需要补跑的 lane
- `bin/shared.js` 新增 lane worktree impact 启发式，lane 选择错误和 lane scope 提示现在都会复用这组信号，而不是只做静态“其他 active lane”提醒
- README、CLI 文档、问题台账和回归测试同步补齐了这组 git-backed lane candidate 提示

## 7.1.2 (2026-04-16)

### Changed

- `ai-os-validate`、`create-ai-os gate`、`ai-os-release-check` 的 lane 解析失败文案改成命令感知：会直接列出可复制的 `--lane` 重跑命令，以及 `lane list` / `lane activate --only` / `lane add` 的修复路径
- 多 lane 项目里显式指定 lane 运行 `validate` / `gate` / `release-check` 时，会额外提示“本次只覆盖当前 lane”，并在选到 draft lane 时提醒先核对 active lane
- README、CLI 文档、问题台账和回归测试同步补齐 lane-aware 修复建议叙事

## 7.1.1 (2026-04-16)

### Changed

- framework 分发工作流补齐了 lane 进入规则：`/align`、`/change-request`、`/verify` 和 workflow index 现在会先判断“继续当前 lane 还是先新建并行 lane”
- README、CLI 文档和治理台账同步明确：lane 敏感 workflow 进入前先确认 lane，不要把并行交付揉进同一条 lane
- 安装回归测试新增对 lane 进入规则和 lane-scoped verify 指引的断言

## 7.1.0 (2026-04-16)

### Added

- 新增 `create-ai-os lane` 生命周期子命令，支持 `list` / `add` / `activate` / `archive`
- `lane add` 现在可以在 lane 项目里创建新交付线，也可以在 `core` 安装但尚未创建 starter 工件的项目里直接落第一条 lane
- `lane activate --only` 会把其他 active lane 回退为 `draft`，用于恢复单 lane 自动选择

### Changed

- README、CLI 文档、问题台账和维护文档同步补齐了 lane lifecycle 的用户叙事与治理锚点
- 回归测试新增 lane lifecycle 命令覆盖，并将 create-ai-os 主帮助文案纳入断言

## 7.0.2 (2026-04-15)

### Changed

- 多 active lane 或 lane 选择错误时，lane-aware CLI 现在会统一列出候选 lane、推荐 `--lane` 示例，并提示如何恢复自动选择
- `docs/cli.md` 与 README 同步补充了多 lane 歧义时的修复指引
- 回归测试补齐了 multiple-active / unknown-lane / no-active-lane 三类 lane 选择引导场景

## 7.0.1 (2026-04-15)

### Changed

- framework 分发工作流与宪法文案补齐 lane 语义：`/align`、`/change-request`、`/resume`、`/verify`、`/ship` 与 workflow index 现在明确说明 lane 项目默认操作当前 lane，而不是根层单当前交付
- 新安装项目的回归测试新增对 lane 语义文案的断言，防止用户侧工作流重新退回根层单例叙事
- 维护与变更日志文档中的版本纪律改为通用 semver 表述，不再停留在 `6.x` 文案

---

## 7.0.0 (2026-04-15)

### Breaking Changes

- `project` profile 新安装默认采用“共享根层 + .ai-os/lanes/default/”布局，不再把 Mission / Design / Tasks / Acceptance / State 直接创建在 `.ai-os/` 根层
- `.ai-os/project.md` 与 `.ai-os/lanes/<lane-id>/lane.toml` 成为 lane 模型下的新基础工件；共享项目上下文与当前交付线工件正式分离
- `quick` 模式升级到完整 starter 工件的推荐方式改为重新运行 `create-ai-os <target> --profile project`，不再写成 `upgrade --profile project`

### Added

- `ai-os-upgrade --to-lanes`：支持把 legacy 单交付项目的根层 Mission / Design / Tasks / Acceptance / State / baseline-log / specs 机械迁移到 `.ai-os/lanes/default/`
- `project` starter 模板新增共享项目章程 `[project.md]` 与 lane 元数据模板 `lane.toml`
- `validate`、`gate`、`release-check`、`doctor` 全部支持 `--lane`，lane 项目和 legacy 项目都能按同一语义工作
- `lab` 的 high-risk 场景现在会在 lane 路径下补齐 `risk-register.md`、`release-plan.md`、`verification-matrix.yaml`

### Changed

- 默认安装、plan 输出、团队协作忽略规则和 STATE 恢复逻辑全面对齐 lane 布局
- README、CLI、Artifacts、Getting Started 和 framework 说明改为以 lane 默认布局为主叙事，同时保留 legacy 兼容说明
- 回归包补齐 legacy->lane 迁移、mixed layout preflight、lite / lab / real-project lane 路径等场景

## 6.2.6 (2026-04-14)

### Added

- `ai-os-gate` 的 verify 阶段现在会对 `failure_modes[].guards` 的坏引用给出 warning

### Changed

- `/verify` 的 YAML gate 从“只看 `failure_modes` 是否存在”扩展到“同时检查 guard 引用是否对齐 acceptance evidence / 现有 eval”

## 6.2.5 (2026-04-14)

### Added

- `ai-os-validate` 现在会检查 `failure_modes[].guards` 是否引用 `acceptance.yaml` 已声明 evidence 或现有 `.ai-os/evals/*.md`
- 高风险示例补充了被 `verification-matrix.yaml` 引用的 failure-mode eval 样例

### Changed

- `ai-os-release-check` 在 high-risk 交付里会拦截 `failure_modes[].guards` 的坏引用和空 guard
- `verification-matrix.yaml` 模板与文档同步明确：`guards` 应指向 acceptance evidence 或现有 eval

## 6.2.4 (2026-04-14)

### Added

- `ai-os-validate` 现在会区分 `failure_modes:` 缺失和空列表，并对空列表给出确定性 warning
- `ai-os-gate` 新增顶级 YAML 列表条目检查，用于 verify 阶段识别空 `failure_modes`

### Changed

- `ai-os-release-check` 对 high-risk 交付不再接受空 `failure_modes:`，必须保留至少一条真实 guard
- `verification-matrix.yaml` 模板和文档同步明确：high-risk 交付不能只保留空 `failure_modes`

## 6.2.3 (2026-04-14)

### Added

- `ai-os-gate` 现在会对已有 `verification-matrix.yaml` 缺少 `failure_modes:` 给出 verify 阶段 warning

### Fixed

- 修复 `ai-os-gate` 读取 `tasks.yaml` / `acceptance.yaml` 的路径错误，避免 build / verify 门禁误判
- `ai-os-release-check` 在 high-risk 交付里正式要求 `verification-matrix.yaml` 记录 `failure_modes:` guard

## 6.2.2 (2026-04-14)

### Added

- `ai-os-validate` 现在会检查项目级 `.ai-os/evals/*.md` 是否具备标准 eval 结构
- `verification-matrix.yaml` 模板新增 `failure_modes:` 槽位，用于沉淀稳定 failure mode 的最小复现和 guard

### Changed

- `ai-os-validate` 对缺少 `failure_modes:` 的 `verification-matrix.yaml` 给出确定性 warning，而不是只检查 `impact_rules`
- 高风险示例的 `verification-matrix.yaml` 同步补上 failure mode guard 样例

## 6.2.1 (2026-04-14)

### Added

- PL-028（复杂任务先只读分析再编辑）和 PL-029（稳定 failure mode 要沉淀成回归证据）登记到问题台账
- 新增 `evals/read-only-analysis-before-edit.md`
- 新增 `examples/failure-mode-eval-closure.md`

### Changed

- `framework/AGENTS.md`、`/build`、`/debug`、`/verify` 明确要求复杂任务先做只读分析，并要求把稳定 failure mode 同步到 `evals/` / `verification-matrix.yaml`
- 维护与工件文档补充“trace -> eval”闭环要求，避免只修当前一次、不沉淀回归证据

## 6.1.0 (2026-04-09)

### Added

- `create-ai-os gate` 命令：读取 YAML 工作流定义中的门禁规则，对项目工件做确定性检查（file_exists / field_not_placeholder / section_not_empty / file_min_lines / dir_not_empty / tasks_all_completed / acceptance_all_passed / phase_completed / state_field_matches / yaml_has_entries），支持 `--entry` / `--exit` / `--all` / `--json`
- YAML 工作流门禁定义：`pipeline.yaml` + 6 个阶段 `.yaml`（align / design / plan / build / verify / ship），与现有 Markdown 工作流并行
- `--quick` 安装模式：极简安装（AGENTS.md + 主路径工作流 + YAML 门禁 + MISSION.md + STATE.md），5 步引导，适合首次接触或小项目
- `quick` 安装 profile（manifests/install-profiles.json）
- 演进研究文档：Spec-Kit 对比分析、YAML 工作流原型设计、极简入口层设计、定位与叙事草案（docs/evolution/）

### Changed

- `LITE_INCLUDES` 扩展覆盖所有 YAML 门禁文件，lite 模式也可使用 gate 检查
- README 新增 `--quick` 安装入口和 `gate` 命令说明

---

## 6.0.0 (2026-04-02)

### Breaking Changes

- `MISSION.md` 改为薄基线章程：移除阶段计划、需求变更同步记录等高频协作内容
- 新增 `baseline-log/` 目录，取代原 `baseline-log.md` 单文件记录，每条基线/变更请求一个独立文件（`BL-YYYYMMDD-HHMMSS-slug.md` / `CR-YYYYMMDD-HHMMSS-slug.md`）
- `tasks.yaml` 升级到 version 3，新增 `owner`、`baseline_id` 字段，移除顶级 `mission` 字段
- `acceptance.yaml` 新增 `baseline_id`、`baseline_source` 字段
- 安装时自动生成 `.gitignore`（排除 `STATE.md` 等 session 文件）和 `.gitattributes`（`memory.md` 使用 `merge=union`）

### Added

- `CONVENTIONS.md` 模板：锁定项目级代码约定（命名、代码模式、禁止模式），防止跨 session 模式漂移
- 团队协作配置：`--no-team-config` 可跳过 `.gitignore` / `.gitattributes` 生成
- PG-005（Mission 多人冲突热点）登记到问题台账，覆盖锚点已落地
- PL-020（brownfield 场景把整个存量项目误当成当前 mission）登记到问题台账
- `baseline_id` 一致性校验：`validate` 检查 Mission / tasks / acceptance 三处 baseline_id 是否一致

### Changed

- 旧版 `baseline-log.md` 单文件和 `BL-001` 式短 ID 仍可通过校验（带 WARNING）
- `upgrade` 自动清理 `.gitattributes` 中过时的 `tasks.yaml merge=union` 条目
- IDE 兼容性说明新增 Codex CLI / Cursor / Claude Code 的承接路径要求

---

## 5.7.0 (2026-03-31)

### Added

- PL-019（外部编排场景验证闭环被跳过）登记并落地
- `acceptance-gate` 新增证据要求表和自我合理化防御表
- `code-review-guard` Step 0 强制项目原生校验

### Changed

- `verify` workflow 触发条件扩展到外部编排完成后
- `build` workflow 出口规则：完成后必须进入 `/verify`

---

## 5.6.0 (2026-03-30)

### Added

- 团队协作测试用例（`.gitignore` / `.gitattributes` helpers）
- README 团队协作章节

---

## 5.5.1 (2026-03-30)

### Added

- `appendGitignoreEntries` / `appendGitattributesEntries` 幂等写入
- 团队协作指引文档

---

## 5.5.0 (2026-03-26)

### Added

- `--lite` 安装模式：只安装核心 workflow 和 skill，减少 token 占用
- `ai-os-cursor-rules` 子命令：生成 / 清理 Cursor IDE 衍生文件
- `ai-os-token-budget` 子命令：估算框架 token 体量，支持 `--source` 和 `--lite` 对比
- `CLAUDE.md` / `GEMINI.md` IDE 入口文件自动生成
- Quickstart 示例（`examples/quickstart-todo-cli/`）

### Changed

- 文档、示例、eval 全面补齐

---

## 5.4.0 (2026-03-25)

### Changed

- 示例、文档、命名和测试覆盖整体打磨

---

## 5.3.0 (2026-03-25)

### Added

- `tasks.yaml` 新增 `measurable_outcome` 和 `edge_cases` 字段
- `/plan` workflow 禁止 `edge_cases` 为空

---

## 5.1.2 (2026-03-19)

### Fixed

- Skill 文档中的引用路径修正
- CLI 多脚本参数解析增强

### Added

- 交付检查增强：基础设施和配置缺口检测
- PL-015（brownfield 忽略共享基础设施约定）、PL-016（可配置被误解）登记

---

## 5.0.0 (2026-03-17)

### Breaking Changes

- 移除所有 legacy v1 兼容（`new-project`、`new-module`、`quick` 等旧 workflow）
- 强制 v2-only workflows

### Added

- `/review` workflow
- `/postmortem` workflow
- `ai-os-lab` 多场景实验沙箱
- 问题台账覆盖检查
- 跨层交付守卫和风险升级
- PL-013（局部改动不默认全仓扫描）、PL-014（产品形态检查）登记

### Changed

- 确认门和可用性门重新校准
- 项目模板收紧
