---
name: change-request
description: 在需求补充、范围调整和验收变化前先同步需求基准并等待确认
---

# /change-request

当用户提出新需求、补充要求、删减范围、改变验收标准，或任何可能让既有 `MISSION.md` / `specs` 失效的内容时触发。

> 路径说明：lane 布局下，下文提到的 `MISSION.md`、`DESIGN.md`、`tasks.yaml`、`acceptance.yaml`、`STATE.md`、`baseline-log/`、`specs/` 默认位于当前 lane 的 `.ai-os/lanes/<lane-id>/`；legacy 单交付项目仍位于 `.ai-os/` 根层。

## 目标

先完成“变更分析 -> baseline-log 记录 -> 基准更新 -> 影响说明 -> 用户确认”，再进入后续设计、计划、实现或验证。
在已有项目里，这里更新的是“当前 lane 的交付基准”，不是把整个存量项目重新定义一遍。

## 必做步骤

1. 先判断本次变更属于当前 lane，还是应该新建并行 lane：
   - 若变更延续当前 lane 的交付目标，继续在当前 lane 更新基准
   - 若它代表新的并行交付主题、独立 release train，或不应与当前 Mission / Tasks / Acceptance 共用基线，先执行 `create-ai-os lane add <lane-id> .`，再在新 lane 中走 `/change-request`
   - 若项目里有多个 active lane 但当前 lane 不明确，先执行 `create-ai-os lane list .`
2. 读取 `.ai-os/MISSION.md`、`.ai-os/baseline-log/`、`.ai-os/STATE.md`、相关 `specs/`、`DESIGN.md` 和当前任务状态
3. 判断本次变更属于：
   - `P0`：新模块 / 大范围重构 / 核心方案变化
   - `P1`：已有模块的小功能新增或非核心变更
   - `P2`：其实是单点 bug 或轻量修复，应转 `/debug`
4. 先完成变更影响分析，明确变更对现有需求范围、设计方案、任务清单、验收标准、已完成实现的影响
5. 若变更文本出现“配置 / 设置 / 选项”，轻量追问一次操作闭环：它是静态预置、后台可配，还是需要用户 / 运营入口
6. 在影响分析完成后，先向 `.ai-os/baseline-log/` 新增一条 `CR-YYYYMMDD-HHMMSS-slug.md` 记录，使用 `change-request / pending_confirmation` 状态说明变更摘要、影响范围和待确认状态
7. 用户确认前，只把待确认项和分析结论写入 `STATE.md` 与相关 spec 草案，不把未确认内容写进 `MISSION.md`
8. 用户确认后，再新增一条 `BL-YYYYMMDD-HHMMSS-slug.md` 记录，使用 `baseline-promotion / confirmed` 状态；只有当当前 lane 的交付目标 / 成功标准 / 范围边界 / 非目标真的变化时才更新 `MISSION.md`，其余细化只更新 spec / DESIGN / tasks / acceptance
9. 必要时同步更新 `DESIGN.md`、相关 spec、`tasks.yaml`、`acceptance.yaml`、`STATE.md`；`brownfield` / `change` 下只补充理解当前 lane 变更所需的宿主项目上下文，并把范围边界严格限定在本轮变更
10. 向用户输出：
   - 本次变更内容
   - 整合后的最新核心需求摘要
   - 受影响的模块 / 文件 / 流程 / 验收项
   - 潜在风险、返工点和推荐路径
11. 等待用户明确回复“确认变更，可执行”
12. 根据影响范围路由到 `/design`、`/plan`、`/build` 或 `/verify`

## 输出

- 更新后的需求基准工件
- `.ai-os/baseline-log/` 中新增的变更 / 升格记录
- 变更影响说明
- 推荐的下一步 workflow

## 禁止事项

- 禁止先改代码，后补需求基准
- 禁止未完成影响分析就直接修改需求文档
- 禁止把新的并行交付主题硬塞进当前 lane，导致一条 lane 同时承载两套交付目标
- 禁止把未确认内容提前写进 `MISSION.md`
- 禁止只记录增量需求而不输出整合后的最新基准
- 禁止未分析影响范围就直接进入 `/build`
- 禁止把核心需求变化伪装成“实现细节”
