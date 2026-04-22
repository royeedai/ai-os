# 12 组工件 Schema

v8.0.0 起，AI-OS 采用"12 组工件默认全装"的形态。本文档定义每组工件的 schema、字段契约和使用规则。

所有工件默认位于 `.ai-os/` 根层（共享）或 `.ai-os/lanes/<lane-id>/`（lane 私有）。

## 目录布局

```
<project-root>/
  AGENTS.md                              # 交付宪法（≤150 行）
  CLAUDE.md                              # agents.md 指针（≤30 行，可选）
  GEMINI.md                              # agents.md 指针（≤30 行，可选）
  .ai-os/
    # ---- 共享根层（跨 lane）----
    memory.md                            # 稳定决策与约定（含跨层契约登记表）
    MISSION.md                           # 宿主项目上下文（brownfield 推荐）
    project.md -> MISSION.md             # 兼容别名（如果存在）
    # ---- 默认唯一交付线 ----
    lanes/
      default/
        lane.toml                        # lane 元数据
        MISSION.md                       # 当前交付基线章程
        DESIGN.md                        # 关键设计 + 验收标准 + 副作用清单
        STATE.md                         # 会话恢复入口（.gitignore）
        baseline-log/                    # 变更与基线记录
        specs/                           # 局部契约
        tasks.yaml                       # 任务与所有者
        risk-register.md                 # high-risk 风险登记（按需）
        release-plan.md                  # 发布计划（按需）
        verification-matrix.yaml         # 回归断言（按需）
        design-pack/
          parity-map.md                  # reverse-spec 对照（按需）
        evals/                           # 项目级失败模式样例（按需）
```

> 本文档中 "当前 lane 的 MISSION.md" 等表述，在 lane 项目里指 `.ai-os/lanes/<lane-id>/MISSION.md`；legacy 单交付项目 `upgrade` 后默认迁到 `lanes/default/`。

---

## 核心 6 件

### 1. `AGENTS.md`（根层）

- **必需**：required
- **位置**：项目根目录
- **格式**：Markdown，遵循 [agents.md](https://agents.md/) 开放标准
- **规模**：≤150 行
- **必须包含章节**：五条核心要求、12 组工件职责表、行为规则（按任务类型）、绝对禁止、高风险升级
- **修改频率**：低（基本由 AI-OS 升级带来）

### 2. `.ai-os/lanes/<lane>/MISSION.md`

- **必需**：required
- **格式**：Markdown
- **职责**：当前交付线的低频锁定章程
- **必须字段**：
  - 交付基线摘要（宿主项目 / 当前交付主题 / 交付目标 / 成功标准 / 项目模式 / 质量档位 / 治理档位 / 当前基线 ID）
  - 用户与闭环场景（目标用户 / 关键场景 / 最小可行闭环 / 后续迭代）
  - 已确认约束与关键决策（技术栈 / 目标运行态 / 质量优先级 / 核心设计决策 / 核心逻辑决策 / 非功能性约束）
  - 范围边界与非目标（范围内 / 范围外 / 非目标 / 核心需求清单）
  - 稳定风险与外部依赖（外部依赖 / 稳定风险 / 高风险触发因素 / 审批点）
- **禁止**：
  - 把待确认项、阶段状态、协作日志塞进 MISSION
  - 把"当前交付目标"写成"先做 /design /plan /build"这类流程动作
- **更新规则**：需求变化必须先走 change-request 写 `baseline-log/CR-*.md`，再按需更新本文件

### 3. `.ai-os/lanes/<lane>/DESIGN.md`

- **必需**：required
- **格式**：Markdown
- **职责**：关键设计、验收标准、共享层副作用清单、对照参考
- **必须章节**：
  - 信息架构（UI 项目）或 核心接口 / 数据模型（API 项目）
  - 关键页面 / 关键流程 / 状态流转
  - 共享基础设施审计（brownfield / change / reverse-spec 必备）
  - 共享层副作用清单
  - 验收标准（原 `acceptance.yaml` 合并进来；可用 Markdown 表格或嵌入 YAML 代码块）
  - 对照参考（reverse-spec 必备；非 reverse-spec 可省略）
- **更新规则**：关键设计变更走 `baseline-log/CR-*.md`，再更新本文件

### 4. `.ai-os/lanes/<lane>/STATE.md`

- **必需**：required
- **版本控制**：**不入版本控制**（`.gitignore`）
- **职责**：当前方位、已锁定内容、待确认项、确认停点、下一步
- **建议章节**：
  - 当前方位（当前阶段、最近一次用户确认、下一个停点）
  - 已锁定清单（已确认需求 / 已锁设计决策 / 已确认任务与验收）
  - 待确认项（按优先级列出）
  - 下一步（agent 下一个动作）
- **缺失时**：agent 必须能从 `MISSION.md` + 最新 baseline-log + `DESIGN.md` + `tasks.yaml` 重建

### 5. `.ai-os/memory.md`

- **必需**：required
- **格式**：Markdown
- **版本控制**：入版本控制，使用 union merge（`.gitattributes` 配置）
- **分层**：`## active` 和 `## archived` 两个顶级章节
- **职责**：稳定决策、项目约定、跨层契约登记表、坑点、技术债
- **建议章节**：
  - `## active`
    - 决策记录（DD-001、DD-002 ...）
    - 约束记录（CT-001 ...）
    - 偏好记录（PR-001 ...）
    - 坑点记录（TR-001 ...）
    - 跨层契约登记表（HTTP↔业务码、Wire 类型、名单型常量、敏感数据 service 档位、中间件方言）
    - 项目编码约定（命名 / 模式 / 分层 / 日志）
  - `## archived`
    - 不再有效的条目（不删除，归档）
- **禁止**：删除条目（只能归档）

### 6. `.ai-os/lanes/<lane>/baseline-log/`

- **必需**：required
- **格式**：目录，每条记录独立 Markdown 文件
- **命名规范**：
  - `CR-YYYYMMDD-HHMMSS-<slug>.md`：change request 变更请求
  - `BL-YYYYMMDD-HHMMSS-<slug>.md`：baseline 升格记录
- **单条记录必须章节**：
  - 摘要（一句话说清变化）
  - 影响分析（影响的需求 / 设计 / 任务 / 验收 / 风险）
  - 新 vs 旧基线对比
  - 用户确认结果
- **禁止**：
  - 使用全局递增编号（`BL-001`、`BL-002`），会在多人分支上产生冲突
  - 在已归档记录上"直接补改"（应新建一条记录做覆盖）

---

## 扩展 6 组（默认安装）

### 7. `.ai-os/lanes/<lane>/specs/`

- **默认安装**：是
- **格式**：目录，每个 spec 一个 Markdown 文件
- **何时使用**：DESIGN.md 过于臃肿、多模块独立契约、复杂业务规则
- **单 spec 建议章节**：
  - 概述与闭环场景
  - 业务规则与交互模式
  - 契约基准（接口 / 数据模型 / 状态流转）
  - 边界条件
  - 错误路径
  - shared layer 锚点（触及共享层时必需）
  - 验收映射（REQ → AC → TASK）
  - User Journey 闭环契约（涉及端到端流程时必需）
- **命名**：`<feature>.spec.md` 或 `<module>.spec.md`
- **最小形态**：`example.spec.md`（由 install 创建为 starter）

### 8. `.ai-os/lanes/<lane>/tasks.yaml`

- **默认安装**：是
- **格式**：YAML
- **必须字段**（顶层）：
  - `version`：schema 版本，当前为 `3`
  - `baseline_id`：对应 MISSION 当前基线 ID
  - `scope`：`mode` / `focus` / `baseline_source` / `quality_tier`
  - `milestones`：里程碑列表（id / title / goal / scope / acceptance_goal / target_window）
  - `tasks`：任务列表
- **单 task 必须字段**：
  - `id`：推荐 `TASK-<OWNER>-NNN` 格式
  - `title`
  - `milestone`
  - `status`：`todo` / `in_progress` / `done` / `blocked`
  - `owner`：稳定 owner（人名缩写 / AI / 团队名）
  - `priority`：P0 / P1 / P2
  - `wave`：执行波次
  - `approval_required`：`null` / `before_execution` / `user_confirms_plan`
  - `depends_on`：依赖任务 ID 列表
  - `requirement_refs`：关联需求 ID
  - `acceptance_refs`：关联验收标准 ID
- **可选字段**：
  - `execution_role`：`design_mapper` / `contract_mapper` / `implementer` / `reviewer`
  - `context_files` / `inputs` / `outputs`
  - `affected_components`
  - `verification_required`
  - `measurable_outcome` / `edge_cases`
  - `definition_of_ready` / `definition_of_done`
  - `evidence_required` / `parity_evidence_required`
  - `impact_tags`（`entrypoint` / `schema` / `transport` / `mapping` 等）
  - `derived_checks` / `parity_checks` / `similar_impl_refs` / `step_validation`
  - `risk_triggers` / `blockers`
  - `change_scope` / `out_of_scope_guard`
  - `restart_required` / `cold_start_required`
  - `notes`
- **禁止**：修改他人 `owner` 任务的运行态字段以外的内容

### 9. `.ai-os/lanes/`

- **默认安装**：是（只有 `lanes/default/`）
- **何时扩展**：同仓独立 release train / 多团队并行 / 长期共存的多条主交付线
- **每个 lane 目录包含**：
  - `lane.toml`（必须）
  - `MISSION.md`、`DESIGN.md`、`STATE.md`、`baseline-log/`、`specs/`、`tasks.yaml`（工件副本）
  - 按需：`risk-register.md`、`release-plan.md`、`verification-matrix.yaml`、`design-pack/`、`evals/`
- **lane.toml 必须字段**：
  - `id`：lane 标识（如 `default`、`payments`）
  - `status`：`active` / `draft` / `archived`
  - `baseline`：当前基线 ID
  - `quality_tier`：`exploratory` / `standard` / `high-risk`
  - `risk_tier`：`low` / `medium` / `high`
  - `owner`：lane owner
  - 归档后追加：`outcome` / `reason` / `archived_at` / `memory_sync_status` / `conventions_sync_status`

### 10. `.ai-os/lanes/<lane>/risk-register.md` + `release-plan.md`

- **默认安装**：是
- **触发使用**：high-risk 档位任务（权限变更 / 身份变更 / 不可逆状态 / 跨用户数据 / 并发敏感 / 外部副作用）
- **risk-register.md 建议章节**：
  - 风险条目列表（R-001、R-002 ...）
  - 每条含：描述 / 影响范围 / 触发条件 / 规避措施 / 监测入口 / 审批签字
- **release-plan.md 建议章节**：
  - 发布策略（蓝绿 / 灰度 / 金丝雀）
  - 发布步骤
  - 回滚条件
  - 回滚步骤
  - 监测 KPI 与告警

### 11. `.ai-os/lanes/<lane>/verification-matrix.yaml`

- **默认安装**：是
- **格式**：YAML
- **核心字段**：
  - `impact_rules`：改动到某类组件时应触发哪些验证命令
  - `failure_modes`：稳定 failure mode 的复现、期望、放行条件
  - `guards`：指向 `acceptance` evidence 或 `evals/*.md`
- **high-risk 要求**：至少一条真实 `failure_modes` guard

### 12. `.ai-os/lanes/<lane>/design-pack/parity-map.md`

- **默认安装**：是
- **触发使用**：reverse-spec 项目
- **建议章节**：
  - 原始参考清单（截图 / API / 源码链接）
  - 字段级对照表（原始字段 → 本项目字段 / 类型 / 语义差异）
  - 已解决差异记录
  - 待解决差异记录（进入 `baseline-log/CR-*.md`）

---

## 三档深度使用建议

所有工件文件默认安装，但实际使用深度按场景不同：

| 场景档位 | 典型使用 | 通常不触达 |
|---|---|---|
| exploratory（探索档）| MISSION + baseline-log + STATE + 最小 DESIGN 笔记 | tasks 高级字段、risk-register、verification-matrix、parity-map |
| standard（标准档）| 上述 + DESIGN 完整 + specs + tasks（核心字段）+ memory | risk-register、verification-matrix（除非偶发 bug）|
| high-risk（高风险档）| 上述 + risk-register + release-plan + verification-matrix（真实 failure_modes）+ 高级 tasks 字段（derived_checks / parity_checks / step_validation）| — |

> 关键：**工件都在，不用就是空的**。不需要在 install 时做选择，agent 按场景自己判断使用深度。

---

## 团队协作合并规则

| 类别 | 文件 | 版本控制 | 合并策略 |
|---|---|---|---|
| 项目共识 | `AGENTS.md`、`MISSION.md`、`DESIGN.md`、`specs/`、`lane.toml` | 入版本控制 | 正常 merge + PR review |
| 追加式知识 | `baseline-log/` | 入版本控制 | 一条一文件 + 时间戳命名 |
| 追加式知识 | `memory.md` | 入版本控制 | union merge（`.gitattributes`）|
| 追加式知识 | `tasks.yaml` | 入版本控制 | 正常 merge + 唯一 task ID |
| 会话状态 | `STATE.md`、`context-snapshot.md`、`codebase-map.md` | **不入版本控制** | 本地维护，缺失可重建 |
| 元数据 | `framework.toml`、`managed-files.tsv` | 不入版本控制 | CLI 自动生成 |

推荐协作方式见根 `AGENTS.md` 的"多 Lane 与团队协作"章节。
