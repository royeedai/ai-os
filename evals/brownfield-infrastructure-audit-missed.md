# Eval: Brownfield Infrastructure Audit Missed

## 场景

一个 brownfield / change 任务表面上只改某个页面或接口，但仓库里存在全局 request 拦截器、响应拆包、DTO adapter、鉴权中间件或全局样式变量，AI 没有先审计这些共享约定就直接实现。

## 错误交付

- 按局部文件的表层结构假设响应或样式契约
- 忽略 request wrapper / interceptor / adapter 已经做过的转换
- 页面或接口局部看似合理，但接入真实运行链路就失真

## AI-OS 预期行为

- `/design` 和 `/debug` 必须先审计共享基础设施约定，再锁局部契约
- `DESIGN.md` 或 spec 必须留下共享包装层 / 转换层 / 样式基准的记录
- 自审和 verify 必须把共享基础设施影响纳入检查，而不是只看局部实现

## 最低证据

- `DESIGN.md` 中的共享基础设施约定记录
- debug / review 输出中的基础设施审计结论
- verify / review 结果中对 request wrapper、DTO / adapter、样式基准等的核对

## 若需改 framework，优先检查

- `framework/.agents/workflows/design.md`
- `framework/.agents/workflows/debug.md`
- `framework/.agents/skills/systematic-debugging/SKILL.md`
- `framework/.agents/skills/fullstack-dev-checklist/SKILL.md`
