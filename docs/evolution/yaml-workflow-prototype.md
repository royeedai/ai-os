# AI-OS YAML 工作流引擎原型设计

## 1. 设计目标

将 AI-OS 从"规则分发器"（分发 markdown，依赖 AI 自觉遵守）演进为"规则 + 工作流引擎"（markdown 提供上下文，YAML 定义可执行门禁，CLI 强制校验）。

核心原则：
- **双层架构**：YAML 定义机器可执行的门禁和过渡条件；Markdown 继续提供 AI 上下文和详细指导
- **渐进增强**：YAML 层是增量添加，不破坏现有 markdown 工作流
- **零依赖**：仍然只用 Node.js 内置模块解析 YAML（复用现有 shared.js 的 YAML 工具）
- **确定性校验**：门禁由 CLI 程序化检查，不依赖 AI 判断

## 2. YAML 工作流定义格式

### 2.1 文件位置

```
framework/.agents/workflows/
  align.md          # 现有 markdown（AI 上下文，保留）
  align.yaml        # 新增 YAML（机器可执行门禁）
  design.md
  design.yaml
  ...
  pipeline.yaml     # 全局流水线定义（阶段顺序、过渡规则）
```

### 2.2 pipeline.yaml — 全局流水线

```yaml
version: "1"
name: ai-os-pipeline
description: AI-OS 交付流水线的阶段顺序和过渡规则

phases:
  - id: align
    name: 目标对齐
    workflow: align.yaml
    entry: always
    
  - id: design
    name: 设计锁定
    workflow: design.yaml
    requires:
      phases_completed: [align]

  - id: plan
    name: 任务拆解
    workflow: plan.yaml
    requires:
      phases_completed: [align, design]

  - id: build
    name: 实现
    workflow: build.yaml
    requires:
      phases_completed: [align, design, plan]

  - id: verify
    name: 验证
    workflow: verify.yaml
    requires:
      phases_completed: [build]

  - id: ship
    name: 交付
    workflow: ship.yaml
    requires:
      phases_completed: [verify]

shortcuts:
  p1:
    description: P1 变更快速路径
    phases: [change-request, plan, build, verify]
  p2:
    description: P2 轻量修复
    phases: [debug]
```

### 2.3 单阶段工作流 YAML — 以 align.yaml 为例

```yaml
version: "1"
phase: align
name: 目标对齐
description: 澄清目标、用户、范围、项目模式、质量标准和待确认项

# 入口条件：CLI 在进入此阶段前程序化检查
entry_gates: []

# 出口门禁：CLI 在离开此阶段前程序化检查
exit_gates:
  - id: mission-exists
    check: file_exists
    path: MISSION.md
    severity: error
    message: "MISSION.md 不存在，无法进入下一阶段"

  - id: mission-has-goal
    check: section_not_empty
    path: MISSION.md
    section: "交付基线摘要"
    field: "当前交付目标"
    severity: error
    message: "当前交付目标未定义"

  - id: mission-has-success-criteria
    check: section_not_empty
    path: MISSION.md
    section: "交付基线摘要"
    field: "成功标准"
    severity: error
    message: "成功标准未定义"

  - id: mission-has-scope
    check: section_not_empty
    path: MISSION.md
    section: "范围边界与非目标"
    severity: warning
    message: "范围边界未定义（建议补充）"

  - id: baseline-log-exists
    check: dir_not_empty
    path: baseline-log
    severity: error
    message: "baseline-log/ 为空，至少需要一条基线记录"

  - id: state-updated
    check: file_exists
    path: STATE.md
    severity: error
    message: "STATE.md 不存在"

  - id: state-phase-is-align
    check: state_field_matches
    field: "当前阶段"
    expected: align
    severity: warning
    message: "STATE.md 当前阶段不是 align"

# 产出物清单
artifacts:
  required:
    - MISSION.md
    - baseline-log/
    - STATE.md
  optional: []

# 下一阶段
transitions:
  default: design
  alternatives:
    - target: change-request
      condition: "需求变更时"
```

### 2.4 design.yaml 示例

```yaml
version: "1"
phase: design
name: 设计锁定

entry_gates:
  - id: align-completed
    check: phase_completed
    phase: align
    severity: error
    message: "align 阶段未完成，不能进入 design"

  - id: mission-confirmed
    check: state_field_matches
    field: "最新需求基准状态"
    expected: confirmed
    severity: error
    message: "需求基准未确认，不能进入 design"

exit_gates:
  - id: design-exists
    check: file_exists
    path: DESIGN.md
    severity: error
    message: "DESIGN.md 不存在"

  - id: design-has-ia
    check: section_exists
    path: DESIGN.md
    section: "信息架构"
    severity: warning
    message: "信息架构部分缺失"

  - id: design-has-key-flows
    check: section_exists
    path: DESIGN.md
    section: "关键流程"
    severity: warning
    message: "关键流程部分缺失"

artifacts:
  required:
    - DESIGN.md
  optional:
    - design-pack/parity-map.md

transitions:
  default: plan
```

### 2.5 build.yaml 示例（含回归门禁）

```yaml
version: "1"
phase: build
name: 实现

entry_gates:
  - id: design-completed
    check: phase_completed
    phase: design
    severity: error
    message: "design 阶段未完成"

  - id: plan-completed
    check: phase_completed
    phase: plan
    severity: error
    message: "plan 阶段未完成"

  - id: tasks-exist
    check: file_exists
    path: tasks.yaml
    severity: error
    message: "tasks.yaml 不存在"

  - id: acceptance-exists
    check: file_exists
    path: acceptance.yaml
    severity: error
    message: "acceptance.yaml 不存在"

exit_gates:
  - id: all-tasks-done
    check: tasks_all_completed
    severity: error
    message: "仍有未完成的任务"

  - id: state-updated
    check: state_field_matches
    field: "当前阶段"
    expected: build
    severity: warning
    message: "STATE.md 阶段未更新"

artifacts:
  required:
    - tasks.yaml
    - acceptance.yaml
    - STATE.md

transitions:
  default: verify
```

## 3. Gate Check 类型定义

CLI 可以实现的确定性检查类型：

| check 类型 | 说明 | 参数 |
|---|---|---|
| `file_exists` | 文件存在 | `path` |
| `dir_not_empty` | 目录存在且非空 | `path` |
| `section_exists` | Markdown 文件含指定章节 | `path`, `section` |
| `section_not_empty` | Markdown 章节下指定字段非空 | `path`, `section`, `field` |
| `state_field_matches` | STATE.md 中字段值匹配 | `field`, `expected` |
| `phase_completed` | 指定阶段的出口门禁全部通过 | `phase` |
| `tasks_all_completed` | tasks.yaml 中所有任务 status 为 done | — |
| `acceptance_all_passed` | acceptance.yaml 中所有项 status 为 passed | — |
| `yaml_field_exists` | YAML 文件中指定字段存在 | `path`, `field` |
| `yaml_field_not_empty` | YAML 文件中指定字段非空 | `path`, `field` |

## 4. CLI 集成方案

### 4.1 新命令：`create-ai-os gate <phase>`

```
create-ai-os gate align          # 检查 align 的出口门禁
create-ai-os gate design --entry # 检查 design 的入口门禁
create-ai-os gate build --exit   # 检查 build 的出口门禁
create-ai-os gate --all          # 检查整个流水线的当前状态
create-ai-os gate --json         # JSON 输出，方便 CI/CD 集成
```

### 4.2 与现有命令的关系

- `doctor`：检查框架安装健康度 → 保持不变
- `validate`：检查工件结构合规性 → 保持不变
- `gate`（新）：检查工作流门禁 → 回答"能不能进入下一阶段"
- `status`：显示当前方位 → 集成 gate 结果（显示哪些门禁已过/未过）

### 4.3 输出格式

```
$ create-ai-os gate align

AI-OS Gate Check: align → design
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Exit gates:
  ✓ mission-exists         MISSION.md 存在
  ✓ mission-has-goal       当前交付目标已定义
  ✗ mission-has-success    成功标准未定义
  ✓ baseline-log-exists    baseline-log/ 非空
  ✓ state-updated          STATE.md 存在
  ⚠ state-phase-is-align   STATE.md 当前阶段不是 align

Result: BLOCKED (1 error, 1 warning)
Fix the error(s) before proceeding to design.
```

## 5. 实现路径

### Phase 1（当前实现）
- 定义 pipeline.yaml 和各阶段 .yaml 文件
- 实现 `ai-os-gate.js` CLI 命令
- 集成到 `create-ai-os gate` 子命令

### Phase 2（后续）
- 让 `status` 命令显示门禁状态
- 让 workflow markdown 引用 YAML 门禁定义
- 支持自定义门禁（用户项目可以在 .ai-os/ 下覆盖门禁）

### Phase 3（远期）
- GitHub Actions 集成（在 PR 上自动运行 gate check）
- 可共享的工作流模块（社区 workflow registry）
- 运行时 hook（在 AI agent 操作时触发门禁检查）

## 6. 与 Archon 的对比

| 维度 | Archon | AI-OS YAML 方案 |
|---|---|---|
| 工作流定义 | YAML DAG（节点、依赖、循环） | YAML pipeline（阶段、门禁、过渡） |
| 执行模型 | CLI 引擎程序化执行每个节点 | CLI 检查门禁，AI agent 执行阶段内容 |
| 隔离 | 每个工作流独立 git worktree | 复用项目工作目录 |
| AI 角色 | 填充每个节点的智能部分 | 执行整个阶段，CLI 只做门禁 |
| 复杂度 | 高（完整编排引擎） | 低（增量增强现有 CLI） |

AI-OS 不需要变成 Archon——不需要一个完整的 DAG 编排引擎。AI-OS 需要的是在关键过渡点有确定性校验，这通过 YAML 门禁 + CLI gate 命令就能实现。
