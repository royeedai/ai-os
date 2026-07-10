# 贡献指南

感谢你对 AI-OS 的关注。

## 开发环境

- Node.js 18+
- 零外部依赖，只使用 Node.js 内置模块

## 快速开始

```bash
git clone https://github.com/royeedai/ai-os.git
cd ai-os
npm test
```

## 目录结构

- `framework/` — 可分发产品内容，安装到用户项目
- `bin/` — CLI 源码
- `test/` — 测试
- `evals/` — 回归评估样例
- `examples/` — 示例
- `docs/` — 内部文档

## 提交前检查

1. 运行 `npm test` 确认所有测试通过
2. 如果修改了 `framework/` 下的内容，更新 `VERSION` 和 `package.json` 版本号
3. 如果新增了 eval 或 example，同步更新 `docs/maintainers.md`

## 变更评估

每次改动 AI-OS 本身前，先回答这 4 个问题：

1. 它是在提升"更稳定把项目做对"，还是只让某个动作更自动？
2. 它提升的是目标确认、设计锁定、逻辑锁定、证据完成，还是项目恢复能力？
3. 它更适合进入 `framework/`、CLI、示例 / 文档，还是不纳入？
4. 它是在减少错误交付，还是只是在叠加新概念？

默认答案是"不纳入"（见 [PROJECT_PURPOSE.md](PROJECT_PURPOSE.md) 的新需求筛选法）。

## 编码规范

- 仅使用 Node.js 内置模块，禁止引入 npm 依赖
- CLI 脚本放在 `bin/` 下；安装逻辑集中在 `bin/installer.js`，可分发的只读 doctor 辅助逻辑集中在 `bin/doctor-shared.js`
- 不添加只是描述代码行为的注释
