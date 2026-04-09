# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)：

- **patch** (6.0.x)：bugfix、文案修正、文档补全
- **minor** (6.x.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

---

## 6.1.0 (2026-04-09)

### Added

- `create-ai-os gate` 命令：读取 YAML 工作流定义中的门禁规则，对项目工件做确定性检查（file_exists / field_not_placeholder / section_not_empty / file_min_lines / dir_not_empty / tasks_all_completed / acceptance_all_passed / phase_completed / state_field_matches / yaml_has_entries），支持 `--entry` / `--exit` / `--all` / `--json`
- YAML 工作流门禁定义：`pipeline.yaml` + 6 个阶段 `.yaml`（align / design / plan / build / verify / ship），与现有 Markdown 工作流并行
- `--quick` 安装模式：极简安装（AGENTS.md + 主路径工作流 + YAML 门禁 + MISSION.md + STATE.md），5 步引导，适合首次接触或小项目
- `quick` 安装 profile（manifests/install-profiles.json）
- 演进研究文档：Spec-Kit 对比分析、YAML 工作流原型设计、极简入口层设计、定位与叙事草案（docs/evolution/）

### Changed

- `LITE_INCLUDES` 扩展覆盖所有 YAML 门禁文件，lite 模式也可使用 gate 检查
- README 新增 `--quick` 安装入口和 `gate` 命令说明

---

## 6.0.0 (2026-04-02)

### Breaking Changes

- `MISSION.md` 改为薄基线章程：移除阶段计划、需求变更同步记录等高频协作内容
- 新增 `baseline-log/` 目录，取代原 `baseline-log.md` 单文件记录，每条基线/变更请求一个独立文件（`BL-YYYYMMDD-HHMMSS-slug.md` / `CR-YYYYMMDD-HHMMSS-slug.md`）
- `tasks.yaml` 升级到 version 3，新增 `owner`、`baseline_id` 字段，移除顶级 `mission` 字段
- `acceptance.yaml` 新增 `baseline_id`、`baseline_source` 字段
- 安装时自动生成 `.gitignore`（排除 `STATE.md` 等 session 文件）和 `.gitattributes`（`memory.md` 使用 `merge=union`）

### Added

- `CONVENTIONS.md` 模板：锁定项目级代码约定（命名、代码模式、禁止模式），防止跨 session 模式漂移
- 团队协作配置：`--no-team-config` 可跳过 `.gitignore` / `.gitattributes` 生成
- PG-005（Mission 多人冲突热点）登记到问题台账，覆盖锚点已落地
- PL-020（brownfield 场景把整个存量项目误当成当前 mission）登记到问题台账
- `baseline_id` 一致性校验：`validate` 检查 Mission / tasks / acceptance 三处 baseline_id 是否一致

### Changed

- 旧版 `baseline-log.md` 单文件和 `BL-001` 式短 ID 仍可通过校验（带 WARNING）
- `upgrade` 自动清理 `.gitattributes` 中过时的 `tasks.yaml merge=union` 条目
- IDE 兼容性说明新增 Codex CLI / Cursor / Claude Code 的承接路径要求

---

## 5.7.0 (2026-03-31)

### Added

- PL-019（外部编排场景验证闭环被跳过）登记并落地
- `acceptance-gate` 新增证据要求表和自我合理化防御表
- `code-review-guard` Step 0 强制项目原生校验

### Changed

- `verify` workflow 触发条件扩展到外部编排完成后
- `build` workflow 出口规则：完成后必须进入 `/verify`

---

## 5.6.0 (2026-03-30)

### Added

- 团队协作测试用例（`.gitignore` / `.gitattributes` helpers）
- README 团队协作章节

---

## 5.5.1 (2026-03-30)

### Added

- `appendGitignoreEntries` / `appendGitattributesEntries` 幂等写入
- 团队协作指引文档

---

## 5.5.0 (2026-03-26)

### Added

- `--lite` 安装模式：只安装核心 workflow 和 skill，减少 token 占用
- `ai-os-cursor-rules` 子命令：生成 / 清理 Cursor IDE 衍生文件
- `ai-os-token-budget` 子命令：估算框架 token 体量，支持 `--source` 和 `--lite` 对比
- `CLAUDE.md` / `GEMINI.md` IDE 入口文件自动生成
- Quickstart 示例（`examples/quickstart-todo-cli/`）

### Changed

- 文档、示例、eval 全面补齐

---

## 5.4.0 (2026-03-25)

### Changed

- 示例、文档、命名和测试覆盖整体打磨

---

## 5.3.0 (2026-03-25)

### Added

- `tasks.yaml` 新增 `measurable_outcome` 和 `edge_cases` 字段
- `/plan` workflow 禁止 `edge_cases` 为空

---

## 5.1.2 (2026-03-19)

### Fixed

- Skill 文档中的引用路径修正
- CLI 多脚本参数解析增强

### Added

- 交付检查增强：基础设施和配置缺口检测
- PL-015（brownfield 忽略共享基础设施约定）、PL-016（可配置被误解）登记

---

## 5.0.0 (2026-03-17)

### Breaking Changes

- 移除所有 legacy v1 兼容（`new-project`、`new-module`、`quick` 等旧 workflow）
- 强制 v2-only workflows

### Added

- `/review` workflow
- `/postmortem` workflow
- `ai-os-lab` 多场景实验沙箱
- 问题台账覆盖检查
- 跨层交付守卫和风险升级
- PL-013（局部改动不默认全仓扫描）、PL-014（产品形态检查）登记

### Changed

- 确认门和可用性门重新校准
- 项目模板收紧
