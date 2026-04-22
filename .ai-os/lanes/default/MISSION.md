# AI-OS v9 默认 Lane 回归 Mission

## 1. 当前交付基线摘要

- **当前交付主题**：AI-OS v9 默认 lane 回归
- **当前交付目标**：把 AI-OS 从 v8 的 root-only / lane-default 叙事分叉状态，重整为 shared-root + `.ai-os/lanes/default/` 的单一 canonical layout
- **成功标准**：安装、doctor、upgrade、AGENTS、README、schema、examples、tests 指向同一默认布局
- **项目模式**：change
- **当前交付档位**：standard
- **当前治理档位**：P0
- **当前基线 ID**：CR-20260422-203000-v9-default-lane-reset

## 2. 用户与闭环场景

- **目标用户**：AI-OS 仓库维护者与使用 AI-OS 的 agent 用户
- **关键场景**：安装新项目、升级旧布局、多人协作恢复当前 lane、doctor 检测布局漂移
- **当前最小可行闭环**：安装输出、规范文档、健康检查、升级迁移、回归测试全部围绕 v9 canonical layout 运转
- **明确后续迭代项**：legacy project 模板最终清理、更多迁移边缘案例覆盖

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续使用零依赖 Node.js CLI
- **已确认目标运行态 / 部署约束**：通过 npx 或本地 node 运行
- **已确认质量优先级**：契约一致性 > 迁移可恢复性 > 文档简洁 > 低改动量
- **已确认核心设计决策**：根层 `MISSION.md` 只做共享宿主上下文，当前交付基线进入 lane `MISSION.md`
- **已确认核心逻辑决策**：root-only v8 布局在 v9 中视为 legacy，需要 upgrade

## 4. 范围边界与非目标

### 范围内

- v9 canonical layout、templates、install、doctor、upgrade、docs、examples、tests、self-hosted `.ai-os`

### 范围外

- 新增 CLI 子命令
- 新增 workflow / skill 系统

### 非目标

- 重做 AI-OS 的产品定位
- 引入运行时依赖或特定 IDE 专有机制

## 5. 宿主项目相关上下文

- **本轮依赖的宿主项目事实**：AI-OS 仓库本身是参考实现，必须先自洽再对外分发
- **必须保持的共享基础设施约束**：README、schema、CLI help、doctor、upgrade 不得再出现两套默认布局
- **与其他 lane 的边界**：当前仓库仅启用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：本地 Node.js、npm devDependencies（lint）
- **稳定风险**：upgrade 对 legacy 布局兼容不完整会直接影响现有用户迁移
- **高风险触发因素**：无用户资产类变更，不升 high-risk
- **审批点**：默认 lane canonical layout 已由项目 owner 确认
