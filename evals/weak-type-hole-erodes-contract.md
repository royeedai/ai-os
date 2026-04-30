---
trigger_source: manual
first_baseline_id: ""
---

# Eval: Weak-Type Hole Erodes Contract

## 场景

一个全栈项目里契约承载在"字符串 / Map / 自由对象 / 弱类型字段 / 库的隐式默认值"上：`@RequestBody Map<String,?>` 接收请求体、前端 `axios.get(path)` 用裸字符串动词、前端 `reactive({code, status})` 自由声明 UI 字段、`catch (Exception)` + `BizException(50000, "xxx失败")` 笼统包装、`el-input-number` 默认 `max = MAX_SAFE_INTEGER` 承载 19 位 Snowflake ID、DTO 字段定义后从未被服务层读取、用户 SQL 输入末尾分号没人清洗。

## 错误交付

- 前端发 `{password: "..."}`，后端用 `body.get("newPassword")` 永远返回 `null`，`BCryptPasswordEncoder.encode(null)` 抛 NPE
- 前端 PUT `/{id}/menus`，后端只有 `@PutMapping`，没有 `@GetMapping`，TS 层不校验 method × path 组合存在性，AI 修写入侧时漏掉读取侧
- 前端 reactive 出 `code: "dj"` 字段，后端 DTO 没有 `code`，Jackson 静默丢弃，sys_org 表也没 code 列，"UI 自产字段"挂着无人发现
- `catch (Exception e) { throw new BizException(50000, "数据源配置解析失败"); }` 把"用错 service / 加密串解析失败 / 字段打码"三层错误吞成一条模糊文案，下次 debug 翻倍排查成本
- 用户在 `el-input-number` 粘贴 19 位 ID `1776694447112000000`，控件默认 `max = 9007199254740991` 静默夹断，回传后端 ID 错位
- `ComponentDTO.id: Long` 字段从不被 service 读取（业务走先删后插），却因为类型约束阻断了前端用临时字符串 key 反序列化的请求

## AI-OS 预期行为

- `code-review-guard` Step 1.5 把"弱类型洞扫描"作为硬检查项，命中即视为实现质量门未通过：
  - 禁止 `Map<String, ?>` / `JSONObject` / `dict` / 自由对象作为契约载体（仅透传 / 动态字段 / 第三方回调允许，需注释 + memory.md 技术债登记）
  - 禁止前端裸字符串动词无 method × path × DTO 四元组校验
  - 禁止 `catch (Exception)` + 笼统业务码包装不带 cause、不 log 堆栈
  - DTO 所有字段必须有 service 层使用点或显式保留注释
  - 前端 reactive/ref/state 字段必须能在 DTO/spec/schema 三处之一找到
  - 业务关键字段使用带默认 max/min/精度/格式化的 UI 控件时必须显式覆盖默认值
  - ID 类字段（Long/BIGINT/Snowflake）禁止使用会走 JS Number 的输入控件
  - 用户自由文本字段（SQL/表达式/JSON）必须在 DTO 或 service 入口声明归一化 owner
- `derived-rules.md` 4.4 节追加禁令：禁止弱类型洞作为契约载体
- 项目特定的具体类型选择（用什么类型替代 Map / 用什么控件替代 input-number / 用什么异常基类）留给项目 CONVENTIONS.md，框架只锁定通用反模式禁令

## 最低证据

- `code-review-guard` 验收报告中包含"弱类型洞扫描"逐项结论
- 若存在豁免（如必须用 Map 透传第三方回调），代码注释 + spec + memory.md 技术债条目同时存在
- `.ai-os/CONVENTIONS.md` 中"禁止模式"节明确登记本项目的反模式选择

## 若需改 framework，优先检查

- `framework/.agents/skills/code-review-guard/SKILL.md`（Step 1.5b、Step 0 C）
- `framework/.agents/references/derived-rules.md`（4.4 节追加）
- `framework/.agents/templates/project/CONVENTIONS.md`（禁止模式节）
- `docs/problem-ledger.md`（PL-034）
