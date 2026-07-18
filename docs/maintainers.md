# AI-OS 仓库维护指南

下游宪法模板位于 `framework/.agents/templates/root/AGENTS.md`；根 `AGENTS.md` 只是本仓库
维护 guard。

## 当前真相

- v11 默认只安装 `AGENTS.md` managed block，重装只更新该 block。
- 不创建 `.ai-os/`，也不提供 lane、baseline、tasks、memory、STATE、doctor、运行时、IDE
  pointer 或 skill wrapper。
- 发现 `.ai-os/` 时必须在写入前停止并提示人工整合；禁止自动删除、移动或推断内容。
- v10.5.1 是已发布 pin；11.0.0 在发布前始终是 Unreleased。

## 准则与验证

只保留目标优先、读取事实、关键确认、范围控制、原生验证和如实交付等跨项目规则。原生
agent 负责 plan、debug、TDD、任务和会话记忆；不要引入影子工件，也不提交逐任务 plan、
spec、流程或会话文档。

安装改动需覆盖：创建 block、保留 block 外内容、重装替换 block、`.ai-os/` 安全停止。

```bash
npm test
npm run lint
git diff --check
```

发布前核对模板、README、changelog 和版本一致；真实 tag 建立前所有公开安装命令仍 pin
`v10.5.1`。
