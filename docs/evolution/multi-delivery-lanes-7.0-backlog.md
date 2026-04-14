# AI-OS 7.0.0 Lanes 实施 Backlog

日期：2026-04-14

## 1. 版本目标

`7.0.0` 的目标不是一次性做完团队协同全部能力，而是把 AI-OS 从“根层单当前交付模型”升级成“lane 级交付实体模型”。

本版本只解决 4 件事：

1. 新项目可以按 `共享项目 + lanes/default` 初始化
2. 旧项目可以机械迁移到 `lanes/default`
3. 核心 CLI 能在 lane 作用域内稳定读取和校验工件
4. legacy 单交付结构在过渡期内仍然可读、可验、可升级

## 2. 发布出口条件

只有同时满足这些条件，`7.0.0` 才算可发：

1. `create-ai-os` 对新项目安装出的默认结构是 lane 版，而不是根层单例版
2. `status` / `resume` / `doctor` / `validate` / `gate` / `release-check` 都支持 `--lane`
3. 多 active lane 时，未传 `--lane` 不会偷偷选一个 lane，而是明确报错
4. legacy 单交付项目在未迁移时，CLI 仍可只读运行
5. `upgrade --to-lanes` 能把 legacy 项目迁到 `.ai-os/lanes/default/`
6. 至少有一组 new install、legacy fallback、migration、multi-lane ambiguity 的回归测试

## 3. 推荐实施顺序

不要按“哪个命令最显眼”开工，要按依赖顺序推进：

1. 先统一路径模型和 lane 解析入口
2. 再落模板和安装结构
3. 再改读路径型 CLI
4. 再改校验和门禁型 CLI
5. 再做迁移命令
6. 最后补 examples / evals / docs / tests 收口

## 4. Workstreams

### L70-01 路径模型与 lane 解析基座

- **目标**：在 `bin/shared.js` 建立统一的项目形态识别和 lane 路径解析能力，避免每个命令各自拼路径。
- **主要改动点**：
  - 识别 `legacy single-delivery` 与 `lanes` 两种项目形态
  - 列出 lane 清单、active lane、archived lane
  - 解析 `--lane`、默认 lane、无默认 lane 报错
  - 暴露 lane 级工件路径 helpers
- **主要文件**：
  - `bin/shared.js`
  - `test/shared.test.js`
  - `test/unit-shared.test.js`
- **依赖**：无，必须最先完成
- **完成标准**：
  - 任意命令都可复用同一套 lane resolution 逻辑
  - 多 lane 未指定时返回确定性错误，而不是隐式猜测
  - legacy 项目可被明确识别为 fallback 模式

### L70-02 新工件拓扑与模板重构

- **目标**：把可分发结构从根层单例工件改成 `共享根层 + lanes/default`。
- **主要改动点**：
  - 新增 `.ai-os/project.md`
  - 调整 framework 模板，把 `MISSION.md`、`tasks.yaml`、`acceptance.yaml`、`release-plan.md`、`risk-register.md`、`verification-matrix.yaml` 下沉到 `lanes/default/`
  - 定义 `lane.toml` 最小字段
  - 清理模板里的“根层唯一当前交付”默认叙事
- **主要文件**：
  - `framework/.agents/templates/project/`
  - `framework/AGENTS.md`
  - `README.md`
  - `test/install.test.js`
  - `test/docs.test.js`
- **依赖**：`L70-01`
- **完成标准**：
  - 新安装项目不再生成根层单例交付工件
  - `lanes/default/lane.toml` 存在且字段最小闭环成立
  - 文档示例不再暗示根层只有一个当前交付

### L70-03 安装入口与 plan 输出改造

- **目标**：让 `create-ai-os`、`plan`、安装清单输出理解新拓扑。
- **主要改动点**：
  - `create-ai-os` 安装逻辑切到 lane 版模板
  - `plan` 输出中显示共享工件与 lane 工件
  - 若用户显式要求 legacy 模式，应明确拒绝或标记为兼容路径，而不是默默保留
- **主要文件**：
  - `bin/create-ai-os.js`
  - `bin/ai-os-plan.js`
  - `bin/shared.js`
  - `test/install.test.js`
  - `test/e2e.test.js`
- **依赖**：`L70-01`、`L70-02`
- **完成标准**：
  - 安装和 plan 输出一致反映 `lanes/default`
  - 新老项目的安装/预览结果可区分且可解释

### L70-04 读路径型 CLI lane 化

- **目标**：先把只读恢复类命令切到 lane 模型，确保恢复上下文不再混淆。
- **覆盖命令**：
  - `ai-os-status`
  - `ai-os-next`
  - `ai-os-resume`
  - `ai-os-doctor`
- **主要改动点**：
  - 增加 `--lane`
  - 多 lane 未指定时报错并列出候选
  - legacy 项目自动 fallback
  - 输出中明确当前 lane 身份，而不是只说“当前项目”
- **主要文件**：
  - `bin/ai-os-status.js`
  - `bin/ai-os-next.js`
  - `bin/ai-os-resume.js`
  - `bin/ai-os-doctor.js`
  - `test/e2e.test.js`
  - `test/team.test.js`
- **依赖**：`L70-01`、`L70-02`、`L70-03`
- **完成标准**：
  - 多 lane 项目恢复上下文不会串 lane
  - 所有输出都能看出当前作用域是哪个 lane

### L70-05 校验与门禁 CLI lane 化

- **目标**：把最关键的质量门从根层单例模型迁到 lane 作用域。
- **覆盖命令**：
  - `ai-os-validate`
  - `ai-os-gate`
  - `ai-os-release-check`
- **主要改动点**：
  - baseline 一致性检查改为 lane 内一致性
  - `failure_modes`、`guards`、acceptance evidence 改为 lane 内解析
  - `gate verify` / `release-check` 的错误信息显示 lane 名称
  - 多 lane 未指定时不再给出误导性全局结果
- **主要文件**：
  - `bin/ai-os-validate.js`
  - `bin/ai-os-gate.js`
  - `bin/ai-os-release-check.js`
  - `bin/shared.js`
  - `test/validate.test.js`
  - `test/gate.test.js`
  - `test/real-project-validation.test.js`
- **依赖**：`L70-01`、`L70-02`
- **完成标准**：
  - lane 内工件不再依赖根层单 baseline 假设
  - `high-risk` release-check 在指定 lane 上可独立放行或阻塞

### L70-06 Upgrade 迁移与兼容路径

- **目标**：提供从 legacy 单交付结构到 `lanes/default` 的机械迁移能力。
- **主要改动点**：
  - `ai-os-upgrade --to-lanes`
  - preflight 检查：已有 `lanes/`、根层脏状态、目标文件冲突
  - 迁移输出：哪些文件移动，哪些文件重命名，哪些文件保持共享根层
  - legacy 只读兼容期与迁移后结构并存策略
- **主要文件**：
  - `bin/ai-os-upgrade.js`
  - `bin/ai-os-diff.js`
  - `bin/shared.js`
  - `test/upgrade.test.js`
  - `test/e2e.test.js`
- **依赖**：`L70-01`、`L70-02`、`L70-05`
- **完成标准**：
  - 迁移结果可重复执行、可审阅、可回滚
  - 迁移前后关键校验结果保持一致，只是作用域变为 `default` lane

### L70-07 Workflow、示例与文档收口

- **目标**：避免只改 CLI，不改用户心智。
- **主要改动点**：
  - workflow 文档里的“当前交付”统一改成“当前 lane”
  - README 增加 lane 模型说明、legacy fallback 说明、迁移命令说明
  - 至少新增一个 lane 结构 example
  - 补一个 migration example / eval
- **主要文件**：
  - `framework/.agents/workflows/`
  - `README.md`
  - `examples/`
  - `evals/`
  - `test/examples.test.js`
  - `test/docs.test.js`
- **依赖**：`L70-02`、`L70-04`、`L70-05`、`L70-06`
- **完成标准**：
  - 文档不再把根层单当前交付当成默认事实
  - 至少有一份 example 能完整展示 `lanes/default`

### L70-08 7.0.0 发版回归包

- **目标**：把 `7.0.0` 的结构升级固化成回归包，而不是靠人工记忆。
- **回归面**：
  - new install lane 结构
  - legacy fallback
  - multi-lane ambiguity
  - `--lane` 定位
  - `upgrade --to-lanes`
  - release-check / validate / gate lane 作用域
- **主要文件**：
  - `test/install.test.js`
  - `test/upgrade.test.js`
  - `test/validate.test.js`
  - `test/gate.test.js`
  - `test/team.test.js`
  - `test/e2e.test.js`
- **依赖**：前面所有 workstream
- **完成标准**：
  - 没有“只在 README 里支持 lanes”的假实现
  - 回归测试至少覆盖新装、旧装、多 lane 歧义三类路径

## 5. 建议切分成 3 个实现阶段

### Stage A: 基座与模板

- `L70-01`
- `L70-02`
- `L70-03`

出口：新项目结构和 lane 解析稳定，可开始切 CLI。

### Stage B: CLI lane 化

- `L70-04`
- `L70-05`

出口：读路径与门禁路径都能按 lane 作用域工作。

### Stage C: 迁移与收口

- `L70-06`
- `L70-07`
- `L70-08`

出口：旧项目可升级，文档和回归包闭环，具备发 `7.0.0` 的条件。

## 6. 不建议现在就做的事

以下内容放到 `7.1+`，不要提前塞进 `7.0.0`：

- 自动判断跨 lane 依赖和回归矩阵
- lane owner / 审批 / SLA 的复杂治理
- lane 关闭后的共享记忆自动抽取
- lane 与 Git 分支、项目管理工具的强绑定

## 7. 建议的起手顺序

如果现在直接进入实现，我建议从这 3 个任务开始：

1. `L70-01`：先把 `shared.js` 里的 lane 解析基座做出来
2. `L70-02`：同步落 `lanes/default` 模板，避免后面 CLI 改了却没有真实结构可跑
3. `L70-04`：先切 `status/resume/doctor`，用只读命令验证路径模型没偏

原因很简单：这三步最能早点暴露模型错误，且返工成本最低。
