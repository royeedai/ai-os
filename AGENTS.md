# AI-OS 开发规则

本文件仅用于指导 AI-OS CLI 工具自身的开发。分发给用户项目的"项目交付操作系统宪法"位于 `framework/AGENTS.md`。

## 项目概述

AI-OS 是一个零依赖的 Node.js CLI 工具，通过 `npx` 将 `framework/` 下的规则、Skills、Workflows 安装到用户项目中。

## 目录结构约定

- `framework/` — 可分发产品内容（AGENTS.md + .agents/），安装到用户项目
- `bin/` — CLI 源码，纯 Node.js 内置模块，零外部依赖
- `evals/` — 框架回归评估用例
- `examples/` — 示例项目
- `docs/` — 内部设计文档

## 编码规范

- 仅使用 Node.js 内置模块（fs, path, crypto, child_process 等），禁止引入 npm 依赖
- 所有 CLI 脚本放在 `bin/` 下，公共逻辑放在 `bin/shared.js`
- `PACKAGE_ROOT` 指向仓库根目录（读 VERSION、package.json 等）
- `FRAMEWORK_ROOT` 指向 `framework/` 子目录（读可分发内容）
- 新增 CLI 命令需同步更新 `package.json` 的 `bin` 字段和 `README.md`

## 变更流程

- 改动 `framework/` 下的内容（宪法、Skills、Workflows、模板）时，需更新 `VERSION` 文件
- 不需要 project-charter、.spec.md、tasks.yaml、acceptance.yaml 等重型流程
- 提交信息使用语义化格式：`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`

## 测试方式

```bash
# 运行完整集成测试（43 个用例，覆盖 init / doctor / diff / upgrade / validate / status / next / resume）
npm test

# 手动在临时目录中测试安装
node bin/create-ai-os.js /tmp/test-project --with-project-files

# 验证健康检查
node bin/ai-os-doctor.js /tmp/test-project

# 验证差异检测
node bin/ai-os-diff.js /tmp/test-project

# 验证升级
node bin/ai-os-upgrade.js /tmp/test-project

# 版本同步检查
node bin/release.js --check
```
