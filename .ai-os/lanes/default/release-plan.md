# 发布计划

## 发布策略

- **策略**：git-release
- **目标环境**：本地工作树 → origin/main；按 minor release checklist 推送 `v10.5.0` tag；npm 发布不在本轮自动执行范围内
- **回滚负责人**：maintainer

## 发布步骤

1. 更新 self-hosted lane、AGENTS、README、docs、skill、tests
2. 更新 VERSION、package.json、package-lock.json、CHANGELOG、docs pins
3. 跑 `npm test`
4. 跑 `npm run lint`
5. 跑 `node bin/create-ai-os.js doctor . --json --strict`
6. 复核没有新增 CLI / runtime / doctor warning / adapter implementation / artifact category
7. `git add -A`、`git diff --cached --check`、commit
8. `git push origin main`
9. `git tag -a v10.5.0 -m "v10.5.0"` 并 `git push origin v10.5.0`

## 回滚条件

- install / doctor 任一核心路径失败
- docs 把 boundary evolution 写成无限扩张或永久冻结
- Boundary Decision Checklist 没有覆盖 doctor / CLI / adapter / artifact category
- docs 或 tests 出现新的 product surface 扩张
- VERSION / package.json / package-lock / docs pin 版本不一致
- push 或 tag 被远端拒绝

## 回滚步骤

1. 从 git diff 回退本次 docs / skill / tests / version metadata / self-hosted lane 文件
2. 保留已创建的 CR，必要时追加新的 CR 说明回退原因
3. 若已发布 tag，需要单独按 maintainer release policy 处理
