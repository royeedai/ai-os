# 12 组工件 Schema

v9 起，AI-OS 只有一套 canonical layout：**共享根层 + `.ai-os/lanes/default/` 默认交付线**。

## 目录布局

```text
<project-root>/
  AGENTS.md
  .ai-os/
    MISSION.md
    memory.md
    framework.toml
    managed-files.tsv
    lanes/
      default/
        lane.toml
        MISSION.md
        DESIGN.md
        STATE.md
        baseline-log/
        specs/
        tasks.yaml
        risk-register.md
        release-plan.md
        verification-matrix.yaml
        design-pack/
          parity-map.md
        evals/
```

## 根层共享工件

### 1. `AGENTS.md`

- **位置**：项目根
- **职责**：交付宪法
- **必需**：required
- **加载层级**：L2

### 2. `.ai-os/MISSION.md`

- **职责**：共享宿主项目上下文、长期边界、跨 lane 约束
- **禁止**：把当前这轮交付基线、阶段状态、待确认项写进这里
- **加载层级**：L2

### 3. `.ai-os/memory.md`

- **职责**：共享稳定决策、长期约定、跨层契约、坑点、技术债
- **版本控制**：入版本控制，使用 union merge
- **加载层级**：L2

### 4. `.ai-os/framework.toml`

- **职责**：记录 schema 版本、layout 版本、layout 模式、framework 版本
- **加载层级**：L1

### 5. `.ai-os/managed-files.tsv`

- **职责**：记录 AI-OS 受管文件路径
- **加载层级**：L3

### 6. `.ai-os/lanes/`

- **职责**：承载默认和额外 lane
- **默认**：始终至少有 `lanes/default/`
- **加载层级**：L1（目录入口）

## 默认 Lane 工件

### 7. `.ai-os/lanes/default/lane.toml`

- **职责**：lane 元数据
- **关键字段**：`id` `title` `status` `baseline_id` `quality_tier` `risk_tier`
- **加载层级**：L1

### 8. `.ai-os/lanes/default/MISSION.md`

- **职责**：当前交付目标、成功标准、范围、基线 ID
- **说明**：这是当前 lane 的唯一交付基线真理源
- **加载层级**：L2

### 9. `.ai-os/lanes/default/DESIGN.md`

- **职责**：关键设计、共享基础设施审计、验收标准、对照参考
- **加载层级**：L2

### 10. `.ai-os/lanes/default/STATE.md`

- **职责**：当前方位、待确认项、下一步
- **版本控制**：不入版本控制
- **加载层级**：L1（session 恢复入口）

### 11. `.ai-os/lanes/default/baseline-log/` + `specs/` + `tasks.yaml`

- **`baseline-log/`**：变更请求与基线升格记录（**L3**）
- **`specs/`**：大型项目切分 DESIGN 的局部契约（**L3**）
- **`tasks.yaml`**：任务、owner、依赖、approval、证据要求（**L2**）

### 12. `.ai-os/lanes/default/risk-register.md` + `release-plan.md` + `verification-matrix.yaml` + `design-pack/parity-map.md` + `evals/`

- **risk-register / release-plan**：high-risk 风险与发布计划（**L2**）
- **verification-matrix**：回归 guard 和 failure mode（**L2**）
- **design-pack/parity-map**：reverse-spec 对照（**L3**）
- **evals/**：项目级失败模式样例（**L3**）

## 关键语义约束

- 根层 `.ai-os/MISSION.md` 是**共享宿主上下文**
- lane `MISSION.md` 是**当前交付基线**
- `STATE.md` 只允许存在于 lane 内
- `memory.md` 只保留根层一份
- `baseline-log/`、`specs/`、`tasks.yaml`、`risk-register.md`、`release-plan.md`、`verification-matrix.yaml`、`design-pack/`、`evals/` 默认都属于当前 lane

## 命名规范

- `CR-YYYYMMDD-HHMMSS-<slug>.md`
- `BL-YYYYMMDD-HHMMSS-<slug>.md`

禁止使用全局递增编号如 `BL-001`。

## 加载分层（progressive disclosure）

工件按 L1 → L2 → L3 渐进式加载，让 agent 在长 session 下减少重复全量读盘。Agent 应只在用户切换阶段时才升级层级。

### L1 — 入口元数据

会话恢复或第一次进入仓库时优先读：

- `.ai-os/lanes/default/STATE.md`：当前方位
- `.ai-os/lanes/default/lane.toml`：lane 元数据与 `baseline_id`
- `.ai-os/framework.toml`：layout 与 schema 版本
- `.ai-os/lanes/`：lane 列表

### L2 — 核心文档

进入对齐 / 设计 / 验证阶段时升级：

- 根 `AGENTS.md` / `MISSION.md` / `memory.md`
- lane `MISSION.md` / `DESIGN.md` / `tasks.yaml`
- lane `verification-matrix.yaml` / `risk-register.md` / `release-plan.md`

### L3 — 详细资源

仅在引用对应 ID / 路径时按需读：

- lane `baseline-log/CR-*.md` / `BL-*.md`
- lane `specs/*.spec.md`
- lane `design-pack/parity-map.md`
- lane `evals/*.md`
- 根 `managed-files.tsv`

### 加载顺序约定

1. 任意会话开始：先读 L1 全部 → 决定是否需要 L2
2. 用户进入"对齐 / 设计 / 验证 / 修 bug"等阶段：升级到 L2
3. 用户引用具体 baseline ID / spec 路径 / failure mode：仅按需读对应 L3
4. 长 session 持续推进时不重复升级；只有阶段切换才重新评估
