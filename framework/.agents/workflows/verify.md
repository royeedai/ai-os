---
name: verify
description: 验证设计一致性、逻辑正确性、工程质量和运行态证据
---

# /verify

当实现已完成一轮，准备判断“是不是做对了、是不是真的能用”时触发。

## 目标

把质量拆成 4 个必须过门：

1. 设计确认门
2. 逻辑确认门
3. 实现质量门
4. 交付质量门

`reverse-spec` 项目额外检查 `parity-gate`。

## 必做步骤

1. 读取 `.ai-os/acceptance.yaml`
2. 对照 `.ai-os/MISSION.md`、`.ai-os/DESIGN.md`、specs 和当前实现
3. 检查：
   - 页面 / IA / 交互是否符合 Design
   - 逻辑契约、状态流转、异常处理是否正确
   - 关键用户任务 / 操作员任务 / 系统任务是否真实可达、可执行、可完成，而不是静态占位
   - 测试、review、回归、运行态证据是否齐全
   - 未实现、未验证或仅 demo / placeholder 的能力是否被误写成完成
   - fallback 证据是否被误当成正式交付证据
4. 更新 `.ai-os/acceptance.yaml`
5. 更新 `.ai-os/STATE.md`

## 输出

- 更新后的 `.ai-os/acceptance.yaml`
- review / parity / runtime 证据摘要

## 禁止事项

- 禁止只看代码通过就判定完成
- 禁止页面看起来像但逻辑错仍然放行
- 禁止逻辑正确但设计和信息架构明显跑偏仍然放行
- 禁止存在假入口、占位流程或未验证能力仍然放行
