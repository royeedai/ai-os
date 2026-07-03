# AI-OS 仓库维护规则

本仓库是 AI-OS 的安装器、模板和文档源码仓库，不是一个安装后的 AI-OS 项目。

## 核心边界

- 不在本仓库创建、恢复或维护 `.ai-os/`、lane、baseline-log、tasks、risk / release 工件。
- 不把根 `AGENTS.md` 当作分发给下游项目的交付宪法；分发宪法源在 `framework/.agents/templates/root/AGENTS.md`。
- 不用 `node bin/create-ai-os.js doctor .` 或 `node .ai-os/bin/ai-os-doctor.js .` 作为本仓库自身验收。
- 本仓库维护只改源码、模板、文档、测试、示例、eval、发布元数据和包配置。

## 修改原则

- 用户明确要求实现或修复时，先读相关源码和测试，再做最小必要改动。
- 改安装行为时同步更新 `bin/`、`framework/.agents/templates/`、README / docs、tests。
- 改分发宪法时只改 `framework/.agents/templates/root/AGENTS.md`，并确保安装出的用户项目 `AGENTS.md` 仍通过测试。
- 不新增 CLI、doctor warning、runtime、adapter 或工件类别，除非需求明确要求并同步补测试和文档。
- 不把某个具体业务项目的规则写进 AI-OS 通用模板；只能沉淀跨项目成立的交付治理规则。

## 验证

- 常规收口：`npm test`、`npm run lint`、`git diff --check`。
- 安装兼容性由测试里的临时项目覆盖；确认安装后仍生成 `AGENTS.md` 和完整 `.ai-os/lanes/default/`。
- 交付说明拆分代码状态、数据状态、运行状态；如未运行某项检查，必须明说。
