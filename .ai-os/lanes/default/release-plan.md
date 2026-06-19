# 发布计划

## 发布策略

- **策略**：git-release
- **目标环境**：本地工作树 → origin/main → annotated tag `v10.5.1`
- **回滚负责人**：maintainer

## 发布真相

- 用户本轮要求：全面审核本次修改和 AI-OS 全文，确认无问题后提交、推送、发新版本
- 本轮发布版本：v10.5.1 patch release
- 本轮包含：version bump、CHANGELOG、docs pins、commit、push origin/main、annotated tag、tag push
- 本轮不包含：npm publish、自动 release 平台、runtime、doctor warning、新 CLI、新 artifact category

## 发布步骤

1. `git fetch --tags origin` 并确认 `main` 与 `origin/main` 对齐
2. 全面审核本次 diff 与 AI-OS 核心全文
3. 更新 VERSION、package.json、package-lock.json、docs pins、CHANGELOG、self-hosted lane
4. 跑 `npm test`
5. 跑 `npm run lint`
6. 跑 `node bin/create-ai-os.js doctor . --json --strict`
7. 跑 `git diff --check`
8. 复核没有新增 CLI / runtime / doctor warning / adapter implementation / artifact category / release automation
9. `git add -A`、`git diff --cached --check`、commit
10. `git push origin main`
11. `git tag -a v10.5.1 -m "v10.5.1"` 并 `git push origin v10.5.1`

## 回滚条件

- docs 或模板把 field feedback 写成 Codex 专属硬依赖
- docs 或测试暗示本轮新增 CLI / runtime / doctor warning / artifact category
- eval frontmatter 或 docs tests 失败
- strict doctor 发现 lane artifact 不一致
- version metadata / docs pins / CHANGELOG 不一致
- push 或 tag 被远端拒绝

## 回滚步骤

1. push 前：从 git diff 回退本次 docs / skill / templates / evals / tests / version metadata / self-hosted lane 文件
2. push 后 tag 前：追加修复 commit 并重新验证，不强推 main
3. tag push 后：按 maintainer release policy 处理后续 patch；不删除公开 tag，除非 maintainer 显式决定
