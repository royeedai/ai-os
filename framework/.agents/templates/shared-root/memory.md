# 项目共享记忆

> 只记录跨 session、跨 lane 仍然稳定有效的事实：已确认决策、长期约束、用户偏好、已知坑点、跨层契约和技术债。
> 当前交付过程中的临时状态不要写在这里，应进入具体 lane 的 `STATE.md`、`baseline-log/` 或 spec。
>
> 每条记录的 `id` 在项目内必须全局唯一、永久不复用；无论 active 或 archived，都保留 `status`、`source`、`owner`、`last_verified`、`supersedes`。使用正常 Git 冲突处理，不自动并集两个版本。
> 新记录取代旧记录时，在新记录的 `supersedes` 引用旧 `id`，并把旧记录标为 `superseded` 后移入 archived。已取代记录仍可追溯，但属于非活动真理，不能与新记录同时生效。

## active

### 1. 设计决策

#### DD-001: [决策标题]

- **id**：DD-001
- **status**：active
- **source**：[用户确认 / baseline-log / 代码或文档路径]
- **owner**：[维护者]
- **last_verified**：[ISO-8601 日期或时间]
- **supersedes**：[]
- **决策**：
- **原因**：
- **影响范围**：

### 2. 工程约束（架构护栏 / 编码契约登记表）

> 本节是本项目的架构护栏 / 编码契约登记表，对应外部常说的「架构规范字典 / style guide」——但 AI-OS 不另建 `.ai-os-rules` 等第二真理源文件，统一返回包装、必须复用的共享抽象、禁止的反模式（如裸 map / 笼统 catch）、依赖策略都登记在此。验证阶段必须逐条对照。

#### EC-001: [约束标题]

- **id**：EC-001
- **status**：active
- **source**：[用户确认 / baseline-log / 代码或文档路径]
- **owner**：[维护者]
- **last_verified**：[ISO-8601 日期或时间]
- **supersedes**：[]
- **类型**：return-contract / must-reuse-abstraction / forbidden-antipattern / dependency-policy / implicit-mechanism / technology-profile / high-risk-state-flow
- **约束**：
- **原因**：
- **影响范围**：

### 3. 用户偏好

#### PF-001: [偏好标题]

- **id**：PF-001
- **status**：active
- **source**：[用户确认 / baseline-log / 代码或文档路径]
- **owner**：[维护者]
- **last_verified**：[ISO-8601 日期或时间]
- **supersedes**：[]
- **偏好**：
- **适用范围**：

### 4. 已知坑点

#### PT-001: [坑点标题]

- **id**：PT-001
- **status**：active
- **source**：[用户确认 / baseline-log / 代码或文档路径]
- **owner**：[维护者]
- **last_verified**：[ISO-8601 日期或时间]
- **supersedes**：[]
- **问题**：
- **根因**：
- **绕行方案**：
- **影响范围**：

### 5. 技术债追踪

#### TD-001: [债务标题]

- **id**：TD-001
- **status**：active
- **source**：[用户确认 / baseline-log / 代码或文档路径]
- **owner**：[维护者]
- **last_verified**：[ISO-8601 日期或时间]
- **supersedes**：[]
- **类型**：pattern-drift / missing-test / architecture-violation / deprecated-dependency / long-lived-maintenance
- **严重度**：high / medium / low
- **影响范围**：
- **消除计划**：
- **维护触发证据**：[drift_signals / refactor_trigger / native_checks；无证据不得登记周期性大重构]

### 6. 跨层契约登记表

#### 6.1 HTTP 状态码 ↔ 业务码 ↔ 客户端行为映射

| id | status | HTTP 状态 | 业务码 | 客户端行为 | source | owner | last_verified | supersedes |
|---|---|---|---|---|---|---|---|---|
| CT-HTTP-001 | active | 200 | success | 正常渲染 | [定义位置] | [维护者] | [ISO-8601] | [] |

#### 6.2 Wire 类型契约

| id | status | 字段 | 类型 | 产出方 | 消费方 | source | owner | last_verified | supersedes | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| CT-WIRE-001 | active | user.id | string | [产出方路径] | [消费方路径] | [定义位置] | [维护者] | [ISO-8601] | [] | 备注（如：禁止改成 number） |

## archived

> 不再生效的条目移到这里，归档而非删除。保留原始 `id` 和全部通用元数据；`status` 使用 `superseded` 或 `archived`，ID 永不复用。
