# AI-OS 想拦截的真实问题

> 这些问题来自真实项目失败模式。每一条都登记在 [docs/problem-ledger.md](problem-ledger.md)，并有 workflow / skill / eval / CLI 校验承接。
> 如果你想看 AI-OS 对哪些问题提供稳定覆盖，从这里开始。

## 2026 年的 AI 编程现实

AI 编码工具已经普及（92% 的美国开发者日常使用），但质量危机正在加深：

- AI 生成代码的 bug 率是人类代码的 **1.7 倍**（CodeRabbit 2026）
- **45%** 的 AI 生成代码含安全漏洞
- 开发者对 AI 代码的信任度从 77% 降至 **60%**
- 技术债积累速度是传统方式的 **3 倍**
- 开发者自以为快了 20%，实际上复杂任务 **慢了 19%**（METR 研究）

核心问题不是 AI 写不出代码，而是 AI 不知道什么时候该停下来确认、什么才算真正完成。

## AI-OS 的差异化位置

市场上已有运行时护栏工具（如 AgentSteer、Caliper、Ouro Loop），它们在代码层拦截错误动作。AI-OS 做的是更上游的事：

| 层面 | 运行时护栏工具 | Spec-Kit | AI-OS |
|------|--------------|---------|-------|
| 拦截层 | 代码生成后 | 0-1 立项时 | 需求对齐前 + 全生命周期 |
| 关注点 | 代码安全、工具调用 | spec → tasks → implement | 交付质量、目标正确性、跨 session 记忆 |
| 覆盖范围 | 单次 agent turn | 立项到实现 | 全项目生命周期（含变更、debug、复盘） |
| 记忆 | 无跨会话记忆 | 无跨会话记忆 | STATE.md + memory.md + baseline-log |
| 治理深度 | 规则匹配 | 原则驱动 | 自适应分级（P0/P1/P2）+ CLI 确定性校验 |

AI-OS 不替代这些工具，而是在它们之上提供交付层治理：先确保目标对、设计锁、逻辑通，再让代码护栏去拦实现错误。和 Spec-Kit 的共存方式见 [docs/interop/spec-kit-coexistence.md](interop/spec-kit-coexistence.md)。

## AI-OS 稳定拦截的真实问题

| 常见问题 | AI-OS 的做法 |
|------|------|
| 需求一模糊，AI 就直接开工 | 先走 `/align`，先锁当前交付基线章程 |
| 需求补充后，AI 直接改代码，文档和代码脱节 | 先走 `/change-request`，更新 `MISSION.md` / spec 再执行 |
| 技术栈或关键方案没对齐，AI 就自己拍板 | 在 `/align` 和 `/design` 里把关键选型、确认状态和待确认项写清 |
| 页面做出来了，但逻辑经常错 | 先锁 Design 和关键逻辑，再进入 build |
| bug 修复时顺手乱改，改 A 坏 B | 先走 `/debug`，锁定边界、影响范围和回归计划 |
| 界面上像有功能，但其实不能真用 | 用 spec / verify / acceptance 拦截"假入口、占位态、未验证能力" |
| 代码跑了，但离可交付还很远 | 用 acceptance 的 4 个质量门拦截伪完成 |
| 天然流式 / 长耗时场景被错建成同步接口 | 在 `/plan` 先锁 `interaction_mode`，避免后置重构 |
| 跨层字段或配置改动总是漏联动 | 用 `contract baseline`、`impact_tags`、`impact_rules` 补联动检查 |
| brownfield 任务里藏着全局拆包 / DTO / 样式约定，AI 却只看局部文件就开改 | 在 `/design`、`/debug` 和 review 里先做共享基础设施审计，再锁局部契约 |
| 改了共享层或通用抽象后，别的模块才开始连锁出错 | 在 `/design`、`/plan`、`/build` 里先写副作用影响清单，再进入实现 |
| AI 先复用 BaseEntity / wrapper / 路由模式，后面才发现 schema 或 controller 契约不匹配 | 先做 schema / route / wrapper parity 和同仓对照实现，再允许复用抽象 |
| 代码改对了，但数据状态和运行状态还没恢复 | 在 `/debug`、`/verify`、`/ship` 里显式拆成代码状态 / 数据状态 / 运行状态 |
| 老项目开始做新需求时，AI 把整个项目重新当成 mission | 在 brownfield / change 中，`MISSION.md` 只定义本轮交付基准 |
| 多人并行时 Mission 总冲突，确认记录和变更日志互相覆盖 | 把 `MISSION.md` 变薄成低频章程，把高频变更挪到 `baseline-log/` 和 `STATE.md` |
| 用户说"系统可设置"，AI 却没确认到底谁来操作、在哪里操作 | 在 `/align` 和 `/change-request` 里轻量追问配置闭环 |
| 资产 / 权限 / 状态流转类需求没被自动升级 | 用硬触发高风险档和专项审查拦截 |
| happy path 通过，但空值 / 异常一碰就碎 | 用 `degraded-path-check` 拦截只测正常流程的伪完成 |
| 交付还需要 SQL / 重启 / 静态校验，AI 却写成"已经全部完成" | 在 `/verify` 和 `/ship` 里显式区分 `AI 已完成` / `需人工执行`，并要求静态校验证据 |
| 一换 session，AI 就忘了做到哪 | 用 `STATE.md` 做恢复入口 |
| 跨层隐式契约（HTTP↔业务码、Long wire 类型、多租户白名单）靠口头约定，不同 session 各自脑补 | `CONVENTIONS.md` 跨层契约登记表五节 + `/verify` 对照 + `ai-os-validate` CLI 兜底 |
| AI 用 `Map<String,?>` / 裸字符串动词 / `catch(Exception)` 笼统包装让契约静默漂移 | `code-review-guard` Step 1.5b 硬检查 8 类弱类型洞反模式 |
| 前后端接口各自"单点看起来对"，但端到端 user journey 没人打通 | spec 5.5 节 User Journey 闭环契约 + tasks.yaml `[E2E-SMOKE]` 独立任务 + `ai-os-validate` CLI 兜底 |
| 跨模块同型缺陷只修单点，下次 session 又踩同一个坑 | `systematic-debugging` 第二阶段 Step 5 同型扫描 + 1 次即升级 P1、连续 2 次升级 P0 |

这些问题的单独台账、覆盖锚点和后续迭代核对入口统一维护在 [docs/problem-ledger.md](problem-ledger.md)。
