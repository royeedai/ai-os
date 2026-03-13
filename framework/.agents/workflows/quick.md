---
description: 小任务快速通道（无需完整 spec/tasks/acceptance 三件套）
---

# 快速任务流程

当用户说"快速改一下"、"帮我修个小 bug"、"加个配置"、"改个文案"等小范围任务时触发此流程。

## 何时使用

- 只改 1-3 个文件
- 已有模块上的小 bug、文案、配置、轻量逻辑修补
- 不需要新增 schema / API / 大范围验收口径

## 不该使用

- 需要新增 API、数据库表、外部依赖
- 需求已经扩大，或影响到其他模块契约
- 涉及金额、权限、删除、数据迁移等高风险操作

## 会生成或更新什么

- `.ai-os/tasks.yaml`：追加 quick task 并记录证据
- `.ai-os/verification-matrix.yaml`：作为本次改动验证动作的判断基线（若已存在）
- `.ai-os/STATE.md`：更新进度概览和快速任务记录
- 相关代码文件：完成改动并验证编译/回归

## 适用条件

任务必须**同时满足**以下所有条件才可使用快速通道：

- 改动范围局限在 1-3 个文件
- 不涉及新增数据库表或 API 端点
- 不改变已有模块的接口契约
- 不涉及金额、权限、数据迁移等高风险操作
- 预计 30 分钟内可完成

> **不符合条件时**：转入 `/new-module`（新功能）或 `/change-request`（需求变更）。

## 步骤

1. 确认任务符合快速通道条件（向用户说明判断依据）
2. 在 `.ai-os/tasks.yaml` 中追加一条 quick task：
   ```yaml
   - id: QUICK-NNN
     title: "简要描述"
     type: quick
     status: in-progress
     verification_required: ["build"]
     restart_required: false
     cold_start_required: false
     definition_of_done:
       - "具体完成标准"
     evidence_required:
       - "编译通过"
   ```
3. 读取 `.ai-os/verification-matrix.yaml`，或使用 `create-ai-os affected --dry-run` 判断本次改动需要的验证动作
4. 执行开发
5. 执行编译验证 + 运行相关测试
6. 若命中 `restart` / `cold-start-smoke`，必须补做受影响服务重启和冷启动 Smoke Check，并回填 `restart-log` / `cold-start-log` / `post-restart-smoke-log`
7. 若修改了共享代码（Model、工具函数、中间件、共享组件），**必须做回归检查**
8. 按 `git-workflow` 规范提交代码
9. 更新 `.ai-os/tasks.yaml` 状态为 `done`，附简要证据
10. 更新 `.ai-os/STATE.md` 的进度概览

## 不可跳过的底线

无论多小的任务，以下五项**绝不可跳过**：

1. **编译必须通过**
2. **命中 `verification-matrix.yaml` 的重启 / 冷启动验证必须做**
3. **共享代码的回归检查必须做**
4. **`.ai-os/tasks.yaml` 必须更新**（记录做了什么）
5. **git 提交必须规范**

## 升级条件

执行过程中如果发现以下任一情况，**立即停止快速通道**，转入正式流程：

- 改动范围超出 3 个文件
- 需要新增数据库表或 API 端点
- 影响到其他模块的接口契约
- 引入了新的外部依赖
- 涉及金额计算或权限变更
- 需要跨多个服务协调重启或发布步骤
