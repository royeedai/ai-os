# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)：

- **patch** (x.y.z)：bugfix、文案修正、文档补全、测试与治理收口
- **minor** (x.y.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

This file tracks releases from v11.0.0 onward. For v5.x – v10.x history, see [CHANGELOG-archive.md](CHANGELOG-archive.md).

---

## 11.0.0 (Unreleased)

**Major, breaking**. AI-OS 收敛为「核心默认工件 + 按需扩展工件」：默认安装只包含核心交付环（宪法 + shared root + lane 的 `lane.toml` / `MISSION` / `DESIGN` / `STATE` / `baseline-log/` / `tasks.yaml`），其余工件（`risk-register.md`、`release-plan.md`、`verification-matrix.yaml`、`specs/`、`design-pack/`、`evals/`）改为按需创建，schema 保留在 `docs/artifacts.md`。宪法、doctor、docs、evals、examples 与测试同步瘦身；设计锁定、证据化完成、baseline/CR 变更记录、memory 回流、session 恢复等 kernel 语义全部保留。

### Changed

- 分发宪法模板 `framework/.agents/templates/root/AGENTS.md` 精简（125 → ~100 行）：「12 组工件」改为「核心工件 + 按需工件」两段，绝对禁止 13 条合并为 8 条，删除密码 / 默认凭证等业务特定规则，多 Lane 与渐进加载章节压缩。
- `tasks.yaml` 模板精简（version 4）：保留 `id` / `title` / `milestone` / `status` / `owner` / `priority` / `approval_required` / `depends_on` / `acceptance_refs` / `evidence_required` / `evidence_produced` / `change_scope`；删除结构化 `agent_run_review` / `fact_state_review` / `maintenance_review` / `handoff_to` / `context_refs` / `expected_return` / `impact_tags` 字段（其语义仍由宪法行为规则承载）。
- layout schema 升为 **v10**（`LAYOUT_VERSION = "10"`）；`.gitignore` / `.gitattributes` 受管段落标题去掉版本号。
- doctor 收敛为结构检查 + 两个语义警告：**W070**（baseline ID 与 baseline-log 不一致）、**W071**（task 缺 owner）。
- `docs/` 收敛为 5 个文件：`artifacts.md`（核心 + 按需工件 schema）、`getting-started.md`、`cli.md`、`maintainers.md`、`interop.md`（原 `docs/interop/` 6 个文件合并）。
- `evals/` 收敛为 10 个最核心失败模式；`examples/` 收敛为 3 个场景（greenfield / brownfield-change / debug-bounded-fix）。
- README、PROJECT_PURPOSE、官方 skill wrapper 同步新布局与新宪法。

### Removed

- 默认 lane 模板中的 `risk-register.md`、`release-plan.md`、`verification-matrix.yaml`、`specs/`、`design-pack/`、`evals/`（改为按需工件）。
- doctor 语义警告 W072（AC 覆盖）、W074（high-risk 三件套）、W076（handoff 证据环）、W077（fact_state_review）、W078（agent_run_review）及其 tasks.yaml 深度解析代码。
- `docs/constitution-spec.md`、`docs/problem-ledger.md`、`docs/codex-aios-field-feedback.md`、`docs/reverse-spec-url-intake.md`、`docs/change-evaluation-template.md`、`docs/interop/`（合并为 `docs/interop.md`）。
- AI-OS 仓库自身不再提交 `.ai-os/` lane 状态（延续 Unreleased 中的维护边界调整）。

### Tests

- `npm test`（install / doctor / shared / docs 四个测试文件同步新布局与新警告集）
- `npm run lint`

### Migration

- 已安装项目：使用固定发布版 `npx --yes github:royeedai/ai-os#v10.5.1 .` 安装宪法、模板与 vendored doctor。旧的 `risk-register.md` / `release-plan.md` / `verification-matrix.yaml` / `specs/` / `design-pack/` / `evals/` 不会被删除，作为已创建的按需工件继续有效；doctor 不再对它们做结构检查。
- 旧 `framework.toml`（schema v9）会触发 E002，按提示重装即可。
- 依赖 W072 / W074 / W076 / W077 / W078 的 CI `--strict` 门禁需移除对应预期；对应语义由宪法行为规则承载。
