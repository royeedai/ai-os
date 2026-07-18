# AI-OS

AI-OS 是跨 agent 的轻量交付宪法，只维护项目 `AGENTS.md` 中的一个 managed block。

## 安装

当前已发布版本为 **v10.5.1**，它仍安装旧版完整结构；以下命令保留为真实发布 pin：

```bash
npx --yes github:royeedai/ai-os#v10.5.1 my-project
npx --yes github:royeedai/ai-os#v10.5.1 .
```

v11 尚未发布；维护者可在工作树运行
`node bin/create-ai-os.js /path/to/consumer-project` 验证，目标不得指向本源码仓库。安装或重装
只创建或刷新 `AI-OS:BEGIN` / `AI-OS:END` block，保留已有 `AGENTS.md` 的所有 block 外内容。

v11 不创建 `.ai-os/`、lane、baseline、tasks、memory、STATE、doctor、IDE pointer 或 skill
wrapper。发现 v10 `.ai-os/` 时安装会停止，不会自动合并、移动或删除。请先把仍有效的目标、
设计、任务和证据人工整合到项目已有 README、ADR、issue、设计文档、代码或测试；确认后
自行归档或删除旧目录，再安装 v11。

宪法要求 agent 优先用户目标和仓库事实，仅在关键歧义、高风险、不可逆或越界时确认；关键
设计、接口、状态、权限和异常路径未确认前不大规模实现；使用项目原生验证并如实报告代码、
数据和运行状态。它不要求生成 plan、spec、task、memory 或流程台账。

| 项目 | v11 默认值 |
| --- | --- |
| 新增项目文件 | 仅 `AGENTS.md` 或其 managed block |
| CLI 操作 | 安装 / 重装 |
| 运行时与 doctor | 无 |
| 强制流程、lane 与项目工件 | 无 |

## 开发验证

```bash
npm test
npm run lint
git diff --check
```

本仓库是源码仓库。下游宪法源为
[`framework/.agents/templates/root/AGENTS.md`](framework/.agents/templates/root/AGENTS.md)；
根 [`AGENTS.md`](AGENTS.md) 仅约束本仓库维护。参见
[`PROJECT_PURPOSE.md`](PROJECT_PURPOSE.md)、[`CONTRIBUTING.md`](CONTRIBUTING.md) 和
[`docs/maintainers.md`](docs/maintainers.md)。

## License

MIT
