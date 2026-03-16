---
name: acceptance-gate
description: >
  当需要定义或更新验收门禁时，使用本 Skill 管理设计确认门、逻辑确认门、实现质量门、交付质量门和 parity-gate。
---

# 验收门管理器（vNext）

## 使用时机

- `/plan` 生成 acceptance
- `/verify` 更新门禁状态
- `/ship` 前检查是否真的可以交付

## 使用方式

1. 生成或更新 `.ai-os/acceptance.yaml`
2. 确保存在以下门禁：
   - `design-confirmation`
   - `logic-confirmation`
   - `implementation-quality`
   - `delivery-readiness`
   - `parity-gate`（reverse-spec 适用）
3. 为每个门禁绑定检查项和证据
4. 发现门未通过时，禁止宣称完成

## 质量判断原则

- 页面像但逻辑错：不通过
- 逻辑对但体验和 IA 明显偏：不通过
- fallback 结果充当正式交付：不通过

## 交付输出

- `.ai-os/acceptance.yaml`
- 当前门禁状态更新结果

### 示例：verify 阶段更新门禁

- 输入：Mission、Design、Spec、实现结果和验证证据
- 输出：更新后的 acceptance 门禁状态

## 禁止事项

- 禁止只凭“代码写完了”把交付门设为 passed

## 维护信息

- 来源：`/plan`、`/verify`、`/ship` workflow
- 更新时间：2026-03-16
- 已知限制：门禁通过不等于自动代表用户最终满意，仍需结合用户确认
