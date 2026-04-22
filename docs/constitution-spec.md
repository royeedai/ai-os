# AI Delivery Constitution Spec v1.0

Status: Stable
Version: 1.0
Last updated: 2026-04-22
Reference implementation: [create-ai-os](https://github.com/royeedai/ai-os)

## 1. 目的

本规范定义一种跨 agent 通用的"AI 项目交付宪法"格式。任何 AI coding agent（Claude Code、Cursor、Codex、Kiro、Windsurf、Bolt 等）读取符合本规范的项目时，都应按统一的行为原则执行交付。

本规范的设计目标：

- 让多个 agent 在同一个项目上产生一致的交付行为
- 让 agent 在项目的任何阶段（初始化、设计、实现、变更、修复、验证、交付、复盘）都能正确定位下一步
- 让 agent 跨 session 恢复时不丢失已确认的基线和待确认项
- 让项目交付的"完成"不再是模型层的 self-verification，而是项目级的多门证据

本规范 **不** 定义：

- 具体的代码生成策略
- 具体的测试框架
- agent 的 harness 或 orchestration 层
- 记忆的底层存储（由 agent / 工具层决定）

## 2. 兼容性

符合本规范的项目必须至少包含：

- 项目根 `AGENTS.md` 文件，遵循 [agents.md](https://agents.md/) 开放标准
- `.ai-os/` 目录，包含至少一个核心工件

符合本规范的 agent 应该：

- 读取并遵守 `AGENTS.md` 中的五条核心要求和行为规则
- 读取 `.ai-os/STATE.md` 作为会话恢复入口
- 在合适的时机更新规定工件

本规范采用 Semver：同一个 major 版本内向后兼容；新增字段默认可选，标记 `required: true` 的字段必须存在。

## 3. 五条核心要求

任何符合本规范的项目，其 `AGENTS.md` 必须声明并执行以下五条：

| 要求 | 含义 |
|---|---|
| R1 目标与用户确认优先 | 任何任务先澄清用户真实目标；模糊时必须停下等确认，不脑补 |
| R2 关键设计与逻辑先锁定 | 关键页面 / 信息架构 / 核心接口 / 状态流转 / 异常路径 未确认前不大规模实现 |
| R3 自适应治理 | 工件深度按风险、需求清晰度、项目模式决定；P0 / P1 / P2 三档 |
| R4 证据化完成 | 四门（设计 / 逻辑 / 实现质量 / 交付质量）；reverse-spec 加 parity-gate |
| R5 可恢复的项目记忆 | 跨 session 必须能从工件恢复方位，不依赖聊天上下文 |

## 4. 工件集（12 组）

核心 6 件 + 扩展 6 组，全部默认安装。

### 核心 6 件

#### 4.1 `AGENTS.md`（根层）

- 位置：项目根
- 必需：required
- 格式：Markdown
- 规模：≤150 行
- 必须包含章节：
  - 五条核心要求
  - 12 组工件职责表
  - 行为规则（按任务类型）
  - 绝对禁止清单
  - 高风险升级规则

#### 4.2 `.ai-os/MISSION.md`

- 必需：required
- 格式：Markdown
- 职责：当前交付线的低频锁定章程
- 必须包含：目标、成功标准、范围、项目模式（greenfield / brownfield / change / reverse-spec）、质量档位（P0/P1/P2）、当前 baseline ID
- 禁止：把待确认项、阶段状态、协作日志塞进 MISSION（那是 STATE.md 和 baseline-log/ 的职责）

#### 4.3 `.ai-os/DESIGN.md`

- 必需：required
- 格式：Markdown
- 职责：关键设计、验收标准、共享层副作用清单、对照参考
- 必须包含：
  - 关键页面 / 信息架构（UI 项目）或 核心接口 / 数据模型（API 项目）
  - 关键流程与状态流转
  - 共享基础设施约定的审计结论（brownfield / change / reverse-spec）
  - 验收标准（acceptance criteria）
  - 对照参考（reverse-spec 必备）

#### 4.4 `.ai-os/STATE.md`

- 必需：required
- 版本控制：**不入版本控制**（每个开发者本地维护）
- 职责：当前方位、已锁定内容、待确认项、确认停点、下一步
- 缺失时：agent 必须能从 MISSION / baseline-log / DESIGN / tasks 重建

#### 4.5 `.ai-os/memory.md`

- 必需：required
- 格式：Markdown，分 `active` 和 `archived` 两个章节
- 职责：稳定决策、项目约定（命名 / 模式 / 分层 / 日志）、跨层契约登记表、坑点、技术债
- 规则：不再有效的条目归档（移至 archived），不删除
- Git 合并策略：union merge（通过 `.gitattributes`）

#### 4.6 `.ai-os/baseline-log/`

- 必需：required
- 格式：目录，每条记录独立文件
- 命名规范：`CR-YYYYMMDD-HHMMSS-<slug>.md`（变更请求）/ `BL-YYYYMMDD-HHMMSS-<slug>.md`（基线升格）
- 禁止：使用全局递增编号（如 `BL-001`），会在多人分支上产生冲突

### 扩展 6 组（默认安装，按场景使用）

#### 4.7 `.ai-os/specs/`

- 职责：大型项目切分 DESIGN 的局部契约
- 场景：brownfield 局部变更 / 多模块独立契约 / 复杂业务规则
- 格式：目录，每个 spec 一个 Markdown 文件
- 建议章节：业务规则 / 交互模式 / 契约基准 / 状态流转 / 边界条件 / shared layer 锚点

#### 4.8 `.ai-os/tasks.yaml`

- 职责：任务拆解、owner、依赖、审批、证据要求
- 格式：YAML
- 每个任务字段：`id`（`TASK-<OWNER>-NNN` 推荐）、`title`、`owner`、`status`、`depends_on`、`acceptance_ref`、`approval_required`、`impact_tags`、`parity_checks`、`similar_impl_refs`、`step_validation`、`evidence`

#### 4.9 `.ai-os/lanes/`

- 职责：同一项目多条并行交付线隔离
- 默认：只创建 `lanes/default/`，普通项目无需理解 lane 概念
- 何时扩展：同仓独立 release train、多团队并行、长期共存的多条主交付线
- 每个 lane 内部：可含自己的 `MISSION.md` / `DESIGN.md` / `STATE.md` / `baseline-log/` / `tasks.yaml` 等副本

#### 4.10 `.ai-os/risk-register.md` + `.ai-os/release-plan.md`

- 职责：high-risk 任务的风险登记、发布计划、回滚条件
- 触发场景：权限变更 / 身份变更 / 不可逆状态流转 / 跨用户数据 / 并发敏感 / 外部副作用
- 与 tasks.yaml 关联：高风险任务必须 `approval_required: true`

#### 4.11 `.ai-os/verification-matrix.yaml`

- 职责：回归断言、稳定 failure mode guard、联动验证命令
- 格式：YAML
- high-risk 项目至少一条真实 `failure_modes` guard；`guards` 指向 acceptance 或 `.ai-os/evals/`

#### 4.12 `.ai-os/design-pack/parity-map.md`

- 职责：reverse-spec 项目的对照工件
- 内容：原始参考（截图 / API / 源码）与本项目实现的字段级对照
- 与 DESIGN.md 关系：DESIGN.md 是"我们决定怎么做"，parity-map 是"与参考的一致性证据"

## 5. 行为规则（按任务类型）

本节规定 agent 在不同任务场景下的停点和交付要求。agent 通过判断当前任务类型来选择行为，不依赖 slash commands。

| 任务类型 | 必须产出 | 停点 | 禁止 |
|---|---|---|---|
| 新项目 / 新模块 / 需求模糊 | MISSION.md、baseline-log 最新记录、待确认项清单 | 等用户确认"可进入下一阶段" | 脑补未明确细节 |
| 关键设计锁定 | DESIGN.md、关键取舍、共享层副作用清单 | 等用户确认方案 | 设计未锁进入实现 |
| 任务拆解 | tasks.yaml、acceptance 对应、共享层 / parity 锚点 | 等用户确认任务和验收 | 合并多个需求到不可验收任务 |
| 实现 | 代码、任务运行态、证据 | 跨多文件或边界不清先只读分析 | 顺手改无关代码 |
| 需求变化 | baseline-log/CR-* 文件、按需更新 MISSION/DESIGN/specs | 等用户确认新基准 | 先改代码后补文档 |
| 修复 bug | 根因、复现、影响范围、计划修改文件清单 | 等用户确认"可执行" | 跨模块边界打补丁 |
| 验证 | 逐项对照结论、异常路径结论、原生静态校验证据 | 失败项整改前先同步 | ReadLints 作为唯一校验 |
| 交付 | 实现清单 / 未纳入 / 验证 / 回滚 / AI vs 人工双清单 | 等用户确认收口 | 外部编排完成 = 交付完成 |
| Session 恢复 | 读 STATE.md + MISSION + 最新 baseline | — | 依赖聊天记录恢复 |

## 6. 证据化完成的四门

| 门 | 通过条件 |
|---|---|
| 设计确认门 | 用户明确确认 DESIGN.md 中的关键决策 |
| 逻辑确认门 | 业务规则、状态流转、关键异常路径在 spec / DESIGN 中锁定并被用户确认 |
| 实现质量门 | 项目原生静态校验通过 + 测试套件无回归 + 证据已归档 |
| 交付质量门 | 已实现 / 未纳入 / 验证 / 回滚 / AI vs 人工双清单完备 |

reverse-spec 项目额外：**对照一致性门**（parity-gate）—— `design-pack/parity-map.md` 中的对照项全部有结论。

## 7. 目录布局

```
<project-root>/
  AGENTS.md                          # 交付宪法（≤150 行）
  .ai-os/
    MISSION.md                       # 目标与成功标准
    DESIGN.md                        # 关键设计与验收
    STATE.md                         # 会话恢复入口（.gitignore）
    memory.md                        # 稳定决策与约定
    baseline-log/                    # 变更与基线记录
    specs/                           # 局部契约
    tasks.yaml                       # 任务与所有者
    lanes/
      default/                       # 默认唯一交付线
    risk-register.md                 # high-risk 风险登记
    release-plan.md                  # 发布计划
    verification-matrix.yaml         # 回归断言
    design-pack/
      parity-map.md                  # reverse-spec 对照
    evals/                           # 项目级失败模式样例（按需）
```

## 8. 与原生工具的共存

| 原生工具 | 共存策略 |
|---|---|
| Claude Code `MEMORY.md` | 由 Claude Code 负责会话级记忆；AI-OS `memory.md` 负责跨 session 稳定决策 |
| Cursor notepads | notepads 作为临时 scratchpad；AI-OS 工件作为真理源 |
| Kiro `.kiro/specs/` + steering | 两套并存时，AI-OS 宪法优先；AI-OS `specs/` 可映射到 Kiro specs |
| GitHub spec-kit | Spec-kit 承担 0→1 立项；AI-OS 承担全生命周期治理 |
| Cursor long-running agents | harness 负责执行；AI-OS 负责停点、门禁、恢复、证据 |

## 9. 参考实现

Reference implementation：[create-ai-os](https://github.com/royeedai/ai-os) (v8.0+)

CLI 只有 3 个命令：

- `install`：把 AGENTS.md + 12 组工件 starter 安装到目标项目
- `doctor`：检查工件完整性和宪法合规
- `upgrade`：从 AI-OS v7 迁移到符合本规范的布局

任何工具都可以作为本规范的替代实现，只要满足第 2 节的兼容性要求。

## 10. 版本演进策略

- 新增工件字段默认 optional，遵循向后兼容
- 修改五条核心要求、工件强制性、行为规则语义是 major 变更
- 每 6-12 个月评估一次规范版本
- 在生态发生重大变化（模型能力跨越新台阶、主流工具引入新能力层）时可提前评估
