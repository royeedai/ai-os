# AI-OS v9.2 URL Reverse-Spec Intake Mission

## 1. 当前交付基线摘要

- **当前交付主题**：URL reverse-spec intake
- **当前交付目标**：为“给定可访问网站 URL，反推需求、截图、交互、接口和后端行为规格”补齐 AI-OS artifact-first 前半段
- **成功标准**：官方文档、lane 模板、skill wrapper、eval、tests 全部表达同一套 URL intake 协议，且不新增 CLI / slash command / runtime dependency
- **项目模式**：change + reverse-spec
- **当前交付档位**：standard
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260502-204346-url-reverse-spec-intake

## 2. 用户与闭环场景

- **目标用户**：需要从现有网站反推需求并让 AI-OS 接管完整开发闭环的 AI coding 用户
- **关键场景**：用户提供 URL → agent 捕获截图、DOM/CSS、交互、Network/API 和后端行为证据 → AI-OS 生成 MISSION / DESIGN / specs / tasks / verification → 实现并对照原站验收
- **当前最小可行闭环**：URL intake 产生可审计 artifact，后续开发仍走现有 AI-OS 设计锁定、任务拆解、实现与验证门
- **明确后续迭代项**：真实浏览器采集脚本、自动视觉 diff、HAR schema、跨工具 MCP capture server

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续使用零依赖 Node.js CLI；URL intake 只扩展文档、模板和 skill wrapper
- **已确认目标运行态 / 部署约束**：默认安装不启动浏览器、crawler、sandbox 或外部服务
- **已确认质量优先级**：证据可审计 > 不脑补后端 > 与现有 reverse-spec parity 对齐 > 操作面最小
- **已确认核心设计决策**：新入口是 AI-OS 工件流程，不是新 CLI 子命令
- **已确认核心逻辑决策**：后端行为只能是浏览器可观察行为规格，必须标注 `observed` / `inferred` / `unknown`

## 4. 范围边界与非目标

### 范围内

- `docs/reverse-spec-url-intake.md`
- lane 模板中的 parity-map、example spec、verification matrix
- `framework/skills/ai-os-delivery/SKILL.md` 触发描述
- URL reverse-spec failure-mode eval
- docs/tests/version/changelog 对齐到 v9.2.0

### 范围外

- 新增 `create-ai-os` CLI 子命令
- 引入 Firecrawl / Playwright / Browser Use runtime dependency
- 自动下载资产、运行浏览器、视觉 diff 服务或沙箱生成器
- 声称能获得目标网站真实后端源码或内部数据库规则

### 非目标

- 把 AI-OS 变成网站克隆器、IDE 插件、crawler 或代码生成器
- 让截图相似度替代接口、状态流转和后端行为证据

## 5. 宿主项目相关上下文

- **本轮依赖的宿主项目事实**：AI-OS 已有 reverse-spec parity gate，但缺少 URL intake 的结构化前置证据协议
- **必须保持的共享基础设施约束**：README、schema、skill wrapper、templates、tests 不得暗示新增 CLI 或运行时依赖
- **与其他 lane 的边界**：当前仓库继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖；真实项目可选择使用当前 agent 可用的浏览器 / crawler 工具
- **稳定风险**：agent 把推断后端规则当成 confirmed AC；模板过度膨胀导致默认安装心智负担增加
- **高风险触发因素**：不涉及用户资产写入、身份权限变更、跨用户数据或外部副作用，不升 high-risk
- **审批点**：用户于 2026-05-02 确认实施 URL Reverse-Spec Intake plan
