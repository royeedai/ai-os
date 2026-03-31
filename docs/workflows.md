# Workflows

AI-OS 以阶段式 workflow 为主，并补充兼容性的专项入口：`/change-request`、`/debug`、`/review` 和 `/postmortem`。

## Phase Workflows

| workflow | 用途 |
|------|------|
| `/align` | 澄清目标、用户、模式、质量标准和待确认项 |
| `/design` | 锁定关键页面、IA、视觉方向和关键流程 |
| `/plan` | 生成交互模式、契约基准、tasks、acceptance 和证据计划 |
| `/build` | 按 wave、impact_tags 和角色分工实现 |
| `/verify` | 验证设计、逻辑、工程、degraded-path 和运行态质量 |
| `/ship` | 做交付、发布、回滚和移交 |

## Specialized Workflows

| workflow | 用途 |
|------|------|
| `/change-request` | 任何需求补充、范围调整、验收变化前先更新需求基准 |
| `/debug` | 单点 bug、样式 / 文案 / 配置微调先定界、再修复、再回归 |
| `/review` | 对方案、实现或交付做多维度结构化审查 |
| `/postmortem` | 对项目或里程碑做复盘，并把稳定经验同步进 `memory.md` |

## Continue

| workflow | 用途 |
|------|------|
| `/status` | 看当前方位和确认停点 |
| `/next` | 看最值得执行的就绪任务 |
| `/resume` | 恢复最小阅读集与最新基准状态 |
| `/auto-advance` | 在门禁通过且用户授权后自动推进 |

## 使用原则

- 新项目、新模块、模糊需求先走 `/align`
- brownfield / change 下，先锁当前这轮交付基准，不要把整个存量项目重新当成 mission
- 关键设计未锁时停在 `/design`
- 需求变化先走 `/change-request`，禁止直接按聊天指令改代码
- 单点修复先走 `/debug`，禁止越界顺手改
- `/build` 只能在用户确认了 Mission / Design / Plan 对应停点后进入
