# AI-OS v9.3 External Learning Fusion Mission

## 1. 当前交付基线摘要

- **当前交付主题**：external learning fusion
- **当前交付目标**：把外部 spec-driven、MCP resource、浏览器证据包和 eval taxonomy 的可靠实践融合进 AI-OS，同时保持零运行时依赖和最小 CLI surface
- **成功标准**：CR delta lifecycle、bugfix spec route、URL evidence package matrix、MCP annotations、eval taxonomy、doctor semantic warnings 和产品 surface 口径全部进入 docs/templates/tests
- **项目模式**：change + brownfield
- **当前交付档位**：standard
- **当前治理档位**：P1
- **当前基线 ID**：CR-20260502-210628-external-learning-fusion

## 2. 用户与闭环场景

- **目标用户**：需要让 AI coding agent 在长期项目中更可靠交付的个人开发者和小团队
- **关键场景**：用户提出变更 / bugfix / URL reverse-spec / 高风险任务 → agent 用 lane 工件明确 delta、证据、风险和验收映射 → doctor 在 `--strict` 下捕捉跨工件漂移
- **当前最小可行闭环**：不新增命令或 runtime；通过文档、模板和 doctor 检查把可靠性前移到工件契约
- **明确后续迭代项**：可选 MCP server 实现、真实浏览器 evidence adapter、eval runner 仍保持范围外

## 3. 已确认约束与关键决策

- **已确认技术栈与关键选型**：继续使用零依赖 Node.js CLI；可靠性增强优先进入 templates、docs、doctor 和 tests
- **已确认目标运行态 / 部署约束**：默认安装不启动浏览器、crawler、MCP server、hooks、sandbox 或外部服务
- **已确认质量优先级**：机械检查 > 文档叙事；工件交叉引用 > agent 记忆；证据可审计 > 工具专有能力
- **已确认核心设计决策**：保持 `AGENTS.md` 极简，把新增约束放进 lane 工件和 `doctor --strict`
- **已确认核心逻辑决策**：CR、AC、high-risk、URL evidence 和 eval taxonomy 必须能被测试覆盖

## 4. 范围边界与非目标

### 范围内

- `bin/ai-os-doctor.js` 新增语义 warning
- lane 模板中的 CR delta、bugfix spec、verification、parity/evidence 字段
- URL reverse-spec evidence package matrix
- MCP resources annotation vNext 文档
- eval taxonomy frontmatter 和 docs tests
- docs/tests/version/changelog 对齐到 v9.3.0
- release polish：统一 install 默认入口 / 显式 alias、open-standard skill wrapper、MCP illustrative snippet 的公开口径

### 范围外

- 新增 CLI 命令、slash command、IDE hook、Spec Kit command 或 Kiro hook
- 引入 Firecrawl / Playwright / Chrome DevTools / MCP SDK 运行时依赖
- 默认启动 browser、crawler、visual diff、sandbox、MCP server 或 eval runner
- 升级到 v9.4、改变安装布局、改变 CLI 行为或新增运行时能力

### 非目标

- 把 AI-OS 变成 spec executor、代码生成器、浏览器采集器或任务编排器
- 扩大 `AGENTS.md` 成长篇操作手册

## 5. 宿主项目相关上下文

- **本轮依赖的宿主项目事实**：AI-OS 已有 v9 canonical layout、v9.2 URL intake、W070-W075 doctor checks、eval frontmatter
- **必须保持的共享基础设施约束**：README、schema、skill wrapper、templates、tests、CLI help 必须表达同一套最小 surface
- **与其他 lane 的边界**：当前仓库继续使用 `default` lane

## 6. 稳定风险与外部依赖

- **外部依赖**：无新增运行时依赖；外部研究只转化为工具无关契约
- **稳定风险**：doctor warnings 过严导致旧项目噪声；模板字段过多导致用户心智负担增加；公开文案把 install alias、skill wrapper 或 MCP snippet 误读为新增 product surface
- **高风险触发因素**：不涉及用户资产写入、身份权限变更、跨用户数据或外部副作用，不升 high-risk
- **审批点**：用户于 2026-05-02 确认实施外部学习融合路线图
