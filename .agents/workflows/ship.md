---
description: 发布与交付流程（发布前检查、回滚准备、Smoke Check）
---

# 发布与交付流程

当用户说"准备上线"、"可以发布了吗"、"交付给用户"时触发此流程。

## 步骤

1. 调用 `release-manager` 检查发布输入是否完整
2. 确认构建、测试、迁移、配置、环境变量、密钥、Feature Flag、兼容性已准备完毕
3. 调用 `acceptance-gate` 确认项目或模块满足 Definition of Done
4. 生成或更新 `.ai-os-project/release-plan.md`，写明受影响服务、重启顺序、发布步骤、Smoke Check、回滚方案、负责人
5. 使用 `create-ai-os release-check` 或同等检查方式验证 `.ai-os-project/release-plan.md` 已具备最小发布输入
6. 对高风险变更明确人工审批点，特别是涉及多服务重启、迁移、冷启动 smoke 的步骤
7. 发布后按顺序执行重启与 Smoke Check，并记录结果
8. 若出现问题，立即转入 `/incident`
