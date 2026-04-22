# AI-OS Shared Mission

## 1. 宿主项目身份

- **项目 / 系统**：AI-OS
- **产品定位**：跨 agent、全生命周期、最小操作面的 AI 项目交付宪法与参考实现
- **主要使用者**：个人开发者、小团队、需要稳定交付而不是只要代码生成速度的 AI coding 用户
- **长期成功标准**：让不同 agent 在同一项目上遵守一致的目标确认、设计锁定、证据化完成和可恢复记忆规则

## 2. 长期边界

- **必须保持的产品边界**：AI-OS 不做 IDE、本地编排器、代码生成器，也不做特定模型的专有 workflow 系统
- **必须保持的工程边界**：CLI 维持零运行时依赖，规范和参考实现必须能跨 agent 使用
- **明确不纳入 AI-OS 的能力**：专有 slash command 体系、单一 IDE 才能生效的核心治理能力、与宪法无关的执行层自动化

## 3. 跨 Lane 共享约束

- **共享基础设施约束**：根层 `AGENTS.md`、`.ai-os/MISSION.md`、`.ai-os/memory.md`、CLI 和 docs 必须表达同一套 canonical layout
- **共享文档 / 规范真理源**：`AGENTS.md`、`docs/artifacts.md`、`docs/constitution-spec.md`、CLI help、安装结果
- **跨 lane 冲突处理原则**：稳定结论回流根层 `memory.md`，当前交付细节保留在具体 lane

## 4. 当前默认 Lane

- **默认 lane**：`default`
- **当前交付基线入口**：`.ai-os/lanes/default/MISSION.md`
- **当前会话恢复入口**：`.ai-os/lanes/default/STATE.md`
