# AI-OS 仓库维护指南

本文件只指导 AI-OS 母仓库自身开发。分发给用户项目的宪法位于根 `AGENTS.md`。

## 产品方向

- AI-OS 的核心不是“更自动写代码”，而是“更稳定把项目做对”
- 任何新改动都要回看是否直接提升：
  - 目标确认
  - 设计锁定
  - 证据化完成
  - 可恢复记忆

## v9 当前真相

- canonical layout：**shared root + `.ai-os/lanes/default/`**
- 根层 `.ai-os/MISSION.md`：共享宿主上下文
- lane `MISSION.md`：当前交付基线
- `doctor`、`upgrade`、README、schema、tests 必须表达同一套默认布局

## 目录结构

- `AGENTS.md`：分发给用户项目的唯一交付宪法
- `.ai-os/`：AI-OS 仓库自身的自托管工件
- `framework/`：模板和 starter
- `bin/`：CLI 源码
- `docs/`：规范、迁移、维护和问题台账
- `examples/`：叙事型示例
- `evals/`：AI-OS 母仓库回归样例
- `test/`：Node.js 测试

## 维护规则

1. 改动 canonical layout 时，必须同步修改：
   - `AGENTS.md`
   - `README.md`
   - `docs/artifacts.md`
   - `docs/constitution-spec.md`
   - `bin/*`
   - `test/*`
2. 任何“当前覆盖锚点”变化，都要同步更新 `docs/problem-ledger.md`
3. 不要让单一 IDE 才能生效的机制进入根层治理
4. root shared 与 lane current 的语义边界不能混写

## 测试方式

```bash
npm test
npm run lint
```

## 当前主示例

- `examples/greenfield-guided-product.md`
- `examples/brownfield-change-journey.md`
- `examples/debug-bounded-fix.md`
- `examples/high-risk-state-change.md`
- `examples/coexist-with-spec-kit.md`
