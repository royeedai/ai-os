# Eval: Configurable Meant Operable Gap

## 场景

用户说“这个项系统可设置 / 可配置 / 可维护”，AI 没有追问操作闭环，就默认按自己的理解做成静态配置、后端可配或前端 CRUD。

## 错误交付

- 用户以为会有运营入口，结果只落了数据库记录或配置文件
- AI 误把“可设置”当成纯技术实现，不确认谁来操作、在哪里操作
- 范围和验收口径在 build 之后才暴露偏差

## AI-OS 预期行为

- `/align` 和 `/change-request` 遇到“配置 / 设置 / 选项”必须轻量追问操作闭环
- `MISSION.md` 必须把结论写进澄清问题清单或范围说明
- 未完成这一步前，不能把“可配置”直接等价成某一种实现方式

## 最低证据

- `MISSION.md` 中关于配置闭环的澄清记录
- align / change-request 输出里的轻量追问
- plan / build 产物与已确认闭环一致

## 若需改 framework，优先检查

- `framework/.agents/workflows/align.md`
- `framework/.agents/workflows/change-request.md`
- `framework/.agents/templates/project/MISSION.md`
