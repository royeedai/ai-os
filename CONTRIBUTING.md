# 贡献指南

本仓库维护轻量宪法模板和安装器，不是安装后的 AI-OS 项目。

## 开发环境

- Node.js 22.13+
- 仅使用 Node.js 内置模块；不新增运行时依赖

## 改动原则

- 先读相关源码和测试，再做最小必要改动。
- 改安装行为时同步更新 `bin/`、分发模板、README、文档和测试。
- v11 只维护 `AGENTS.md` managed block；不得重新引入 `.ai-os/`、lane、baseline、tasks、
  memory、STATE、doctor、IDE pointer 或 skill wrapper。
- 不把业务项目规则写入通用宪法，也不要求下游生成逐任务 plan、spec 或流程文档。
- 稳定项目事实属于项目已有 README、ADR、issue、设计文档、代码、配置和测试。

## 提交前检查

```bash
npm test
npm run lint
git diff --check
```

发布内容还须核对 `VERSION`、`package.json`、`CHANGELOG.md` 与 tag；v11 发布前公开 pin 必须
保持 `v10.5.1`。
