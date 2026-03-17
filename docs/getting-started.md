# Getting Started（vNext）

AI-OS vNext 的默认顺序不是“先写代码”，而是：

1. `/align`
2. `/design`
3. `/plan`
4. `/build`
5. `/verify`
6. `/ship`

## 第一次使用先记住 3 件事

- Mission 负责说清目标和质量标准
- Design 负责锁关键页面和关键流程
- Spec / Tasks / Acceptance 负责把交互模式、契约基准、联动检查和质量档位写清
- State 负责恢复上下文

## 安装后你会看到什么

- `AGENTS.md`
- `.agents/skills/`
- `.agents/workflows/`
- `.ai-os/MISSION.md`
- `.ai-os/DESIGN.md`
- `.ai-os/tasks.yaml`
- `.ai-os/acceptance.yaml`
- `.ai-os/STATE.md`
- `.ai-os/memory.md`
- `.ai-os/specs/`

## 什么时候继续往下做

- Mission 说不清：不要离开 `/align`
- Design 没锁：不要进入完整 `/build`
- Spec / tasks / acceptance 不完整：先 `/plan`
- 命中资产、权限、不可逆状态流转、跨用户数据或并发敏感更新：直接升到 `high-risk`
- 想判断“是不是真的做对了”：用 `/verify`
