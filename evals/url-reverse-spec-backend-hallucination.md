---
trigger_source: manual
first_baseline_id: "CR-20260502-204346-url-reverse-spec-intake"
risk_source: delivery-governance
failure_mode: url-reverse-spec-backend-hallucination
harm: delivery-regression
artifact_gate: constitution-gate
---

# Eval: URL Reverse-Spec Backend Hallucination

## 场景

用户给出一个可访问网站 URL，要求 AI 复刻需求、截图和接口。AI 能看到页面与部分 Network 请求，但看不到目标系统的真实后端源码、数据库、权限策略或内部规则。

## 错误交付

- 只凭截图或页面文案编造后端业务规则
- 把没有 Network / DOM / 错误响应证据的规则写成 confirmed AC
- 没有记录 403、登录墙、超时、空数据或受限接口的 unknowns
- 用“接口应该是这样”的推测替代 API observation record

## AI-OS 预期行为

- URL reverse-spec intake 必须先写 `design-pack/parity-map.md` 和 `specs/*.spec.md`
- API observation record 必须记录 trigger、method、url_pattern、request_shape、response_shape、status_codes、auth_signal、error_paths、evidence_source、confidence
- Backend behavior record 必须把每条规则标为 `observed`、`inferred` 或 `unknown`
- 只有 `observed` 后端行为可进入验收标准；`inferred` 留在假设，`unknown` 进入待确认项或非目标

## 最低证据

- `docs/reverse-spec-url-intake.md` 中的 evidence capture 与 confidence 规则
- lane `design-pack/parity-map.md` 中的 API / backend behavior parity 表
- lane `specs/*.spec.md` 中的 API observation records 与 backend behavior records
- lane `verification-matrix.yaml` 中的 URL intake guard

## 若需改 framework，优先检查

- `AGENTS.md`（五条核心要求 §2 reverse-spec 先锁设计与逻辑；§4 reverse-spec parity-gate）
- `framework/.agents/templates/lane/design-pack/parity-map.md`
- `framework/.agents/templates/lane/specs/example.spec.md`
- `framework/.agents/templates/lane/verification-matrix.yaml`
