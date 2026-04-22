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

### 2. `.ai-os/MISSION.md`

- **职责**：共享宿主项目上下文、长期边界、跨 lane 约束
- **禁止**：把当前这轮交付基线、阶段状态、待确认项写进这里

### 3. `.ai-os/memory.md`

- **职责**：共享稳定决策、长期约定、跨层契约、坑点、技术债
- **版本控制**：入版本控制，使用 union merge

### 4. `.ai-os/framework.toml`

- **职责**：记录 schema 版本、layout 版本、layout 模式、framework 版本

### 5. `.ai-os/managed-files.tsv`

- **职责**：记录 AI-OS 受管文件路径

### 6. `.ai-os/lanes/`

- **职责**：承载默认和额外 lane
- **默认**：始终至少有 `lanes/default/`

## 默认 Lane 工件

### 7. `.ai-os/lanes/default/lane.toml`

- **职责**：lane 元数据
- **关键字段**：`id` `title` `status` `baseline_id` `quality_tier` `risk_tier`

### 8. `.ai-os/lanes/default/MISSION.md`

- **职责**：当前交付目标、成功标准、范围、基线 ID
- **说明**：这是当前 lane 的唯一交付基线真理源

### 9. `.ai-os/lanes/default/DESIGN.md`

- **职责**：关键设计、共享基础设施审计、验收标准、对照参考

### 10. `.ai-os/lanes/default/STATE.md`

- **职责**：当前方位、待确认项、下一步
- **版本控制**：不入版本控制

### 11. `.ai-os/lanes/default/baseline-log/` + `specs/` + `tasks.yaml`

- **`baseline-log/`**：变更请求与基线升格记录
- **`specs/`**：大型项目切分 DESIGN 的局部契约
- **`tasks.yaml`**：任务、owner、依赖、approval、证据要求

### 12. `.ai-os/lanes/default/risk-register.md` + `release-plan.md` + `verification-matrix.yaml` + `design-pack/parity-map.md` + `evals/`

- **risk-register / release-plan**：high-risk 风险与发布计划
- **verification-matrix**：回归 guard 和 failure mode
- **design-pack/parity-map**：reverse-spec 对照
- **evals/**：项目级失败模式样例

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
