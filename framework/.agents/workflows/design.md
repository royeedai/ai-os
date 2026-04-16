---
name: design
description: 锁定关键信息架构、页面、交互、视觉方向和关键流程
---

# /design

当 Mission 已经明确，但关键页面、信息架构、关键交互、视觉方向或关键流程还没锁定时触发。

## 目标

先把"做成什么样"说清，再进入完整开发。

## 必做步骤

1. 读取 `.ai-os/MISSION.md` 和 `.ai-os/STATE.md`
2. 确认 `MISSION.md` 已是最新且已获得用户确认；若需求仍在变更，先转 `/change-request`
3. 对 brownfield / change / reverse-spec 任务，先审计会影响局部实现的共享基础设施约定，如 request wrapper / interceptor、DTO / adapter、中间件、路由 / 鉴权和全局样式变量
4. 若本轮会改 shared layer、通用抽象或跨层 entrypoint，先输出副作用影响清单：受影响模块、接口 / 页面、无字段 / 无上下文 / 无鉴权场景，以及白名单 / 排除清单需求
5. 若本轮会复用共享抽象、共享审计字段、统一包装层或新增 client/server entrypoint，先核对真实 schema / route / wrapper 契约，并找到同仓正常实现对照；若偏离既有模式，先记录理由
6. 确认本轮必须先锁的关键页面 / 关键流程 / 核心接口旅程 / 核心设计决策
7. 生成或更新 `.ai-os/DESIGN.md`：
   - 信息架构
   - 关键页面与交互
   - 关键流程
   - 视觉方向
   - UI 页面结构、信息架构和核心交互流程
   - 技术设计中的架构方案、模块拆分、数据结构、接口规范
   - 共享基础设施约定与局部实现边界
   - shared layer / 通用抽象副作用清单
   - 路由 / 入口契约对照、静态路径 / 动态路径冲突备注、schema / 存储一致性说明
   - 同仓正常实现对照与偏离理由
   - 核心设计决策、备选方案与取舍理由
   - 方案选型依据、核心约束、风险与注意事项
   - 设计确认记录
8. 若设计引入了 `/align` 中未覆盖的新依赖（框架、插件、SDK、基础镜像等），在锁定前对其执行实际可用性验证（包管理器查询、registry API、manifest 检查等），禁止仅凭 AI 训练数据认定版本存在
9. 如果是 `reverse-spec` 模式，生成或更新 `.ai-os/design-pack/parity-map.md`
10. 显式区分"必须用户确认的核心决策"和"AI 可自行处理的非核心细节"
11. 把已锁定内容、待确认项、确认停点写回 `.ai-os/STATE.md`
12. 向用户输出 `DESIGN.md` 核心内容、共享层副作用清单、同仓对照实现、契约 / schema / 路由 parity 结论、选型依据和待确认项，等待明确确认
13. 若关键设计仍未确认，暂停在此，不进入 `/plan` 或 `/build`

## 输出

- `.ai-os/DESIGN.md`
- `.ai-os/design-pack/parity-map.md`（reverse-spec 适用）
- 更新后的 `.ai-os/STATE.md`

## 禁止事项

- 没有关键页面和流程定义，不得声称"可以开始完整开发"
- 禁止把视觉细节未定等同于逻辑可直接开工
- 禁止技术栈、架构、数据结构、页面结构、核心交互等核心决策未经确认就直接写代码
- 禁止 shared layer / 通用抽象改动没有副作用清单就进入 `/build`
- 禁止先复用抽象或路由模式，再回头补做 schema / route / wrapper parity 核对
- 禁止超出已确认的 `MISSION.md` 边界擅自扩展需求或调整目标
- 禁止仅凭 AI 训练数据认定新引入的依赖版本可用，必须通过实际查询 registry 验证
