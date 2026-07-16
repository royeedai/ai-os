# Changelog

版本号遵守 [Semantic Versioning](https://semver.org/)：

- **patch** (x.y.z)：bugfix、文案修正、文档补全、测试与治理收口
- **minor** (x.y.0)：新增 skill / workflow / CLI 命令、非破坏性增强
- **major** (x.0.0)：破坏性变更（工件格式、CLI 接口、安装行为不向后兼容）

This file tracks releases from v11.0.0 onward. For v5.x – v10.x history, see [CHANGELOG-archive.md](CHANGELOG-archive.md).

---

## 11.0.0 (Unreleased)

**Major, breaking**. AI-OS 收敛为「核心默认工件 + 按需扩展工件」：默认安装只包含核心交付环（宪法 + shared root + lane 的 `lane.toml` / `MISSION` / `DESIGN` / `STATE` / `baseline-log/` / `tasks.yaml`），其余工件（`risk-register.md`、`release-plan.md`、`verification-matrix.yaml`、`specs/`、`design-pack/`、`evals/`）改为按需创建，schema 保留在 `docs/artifacts.md`。宪法、doctor、docs、evals、examples 与测试同步强化确定性 readiness、迁移安全和证据约束；设计锁定、baseline/CR 变更记录、memory 回流与 session 恢复等 kernel 语义继续保留。

### Changed

- layout schema 升为 **v11**（`LAYOUT_VERSION = "11"`）；稳定的
  `.ai-os/framework.toml`、`.ai-os/managed-files.tsv` 与 vendored doctor
  runtime 一起提交，framework-owned 文件由 source hash 绑定。
- 安装器改为 ownership-aware 的完整预检、同目录 staging、原子提交与
  rollback 流程；普通重装和 `--force` 都保留 project/session truth，并
  对 v10 → v11 提供基于真实发布模板 hash 的有界迁移。
- `tasks.yaml` schema 升为 **version 5**：approval、evidence、
  delivery-state、dependency、acceptance 与 change-scope 使用一个精确的
  canonical YAML 合约。
- doctor 同时输出结构健康 `layout_ok` 与交付就绪 `delivery_ready`，并对
  每个 active lane 确定性检查 baseline 生命周期、tier、task/AC、human
  approval、evidence、Git ancestry/dirty state、影响范围及所需按需工件。
- `STATE.md` 明确为可重建导航，不覆盖 committed lane truth；缺失为信息，
  mirror 漂移为独立 warning。
- 已存在的 risk、release、verification、spec、parity-map 与 eval 按需工件
  使用本地确定性 schema 检查；未触发的按需工件仍不由安装器默认创建。
- 分发宪法、官方 skill、README、CLI 文档、examples 与 11 个 eval oracle
  同步 lane 选择、authority、governance trigger 和无遥测边界。

### Removed

- 安装项目中的旧 `.ai-os/bin/shared.js` 在其 bytes 命中 v10 compatibility
  manifest 时安全移除，由只读 `doctor-shared.js` 替代。
- 默认安装继续不包含 risk、release、verification、spec、design-pack 与
  eval 工件；这些工件只在跨项目成立的 trigger 命中后创建。
- AI-OS 源码仓库自身不创建或维护 `.ai-os/` lane 状态。

### Tests

- `npm test`
- `npm run test:coverage`（lines 94%、branches 72%、functions 98%）
- `npm run lint`
- `git diff --check`
- `npm pack --dry-run --json`
- `npm audit` 与 `npm audit --omit=dev`

### Migration

- 当前 v11 仍是未发布候选；所有面向用户的公共安装命令继续固定到真实发布版
  `npx --yes github:royeedai/ai-os#v10.5.1 .`，直到单独授权 tag/release。
- v11 发布后，同一安装入口会识别 v10.0.0 至 v10.5.1 的 canonical
  metadata、模板和 managed block，执行 v10 → v11 迁移；baseline/CR
  history、custom tasks、lane truth、IDE pointers 与已创建按需工件保持
  byte-identical。
- 自定义 `AGENTS.md`、未知 framework bytes、修改过的 AI-OS team-config
  block 或不一致 migration context 会在任何 transaction write 前给出路径级
  conflict，需要人工合并而不是猜测覆盖。
