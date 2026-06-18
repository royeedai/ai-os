# 发布计划

## 发布策略

- **策略**：manual
- **目标环境**：GitHub repo（npx 主路径）+ 可选 npm package
- **回滚负责人**：maintainer

## 发布步骤

1. 更新 VERSION、package.json、package-lock.json、CHANGELOG
2. 跑 `npm test`
3. 跑 `npm run lint`
4. 跑 `node bin/create-ai-os.js doctor . --json --strict`
5. 复核 README、schema、CLI help、实际安装输出和自托管 lane 一致
6. 推送提交到 `main`，再打 git tag 并 `git push origin <tag>`

## 回滚条件

- install / doctor 任一核心路径失败
- local doctor vendoring 或 `doctor --strict` 回归
- AGENTS / skill 的确认停点语义导致普通对话误触发治理或高风险动作绕过审批
- VERSION / package.json / package-lock 版本再次不一致

## 回滚步骤

1. 从 git history 回退本次 patch 涉及的 docs / skill / tests / version metadata / self-hosted lane 文件
2. 保留已发布历史 baseline-log，必要时追加新的 CR 说明回退原因
