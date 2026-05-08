# 发布计划

## 发布策略

- **策略**：manual
- **目标环境**：GitHub repo（npx 主路径）+ 可选 npm package
- **回滚负责人**：maintainer

## 发布步骤

1. 更新 VERSION、package.json、CHANGELOG
2. 跑 `npm test`
3. 安装 devDependencies 后跑 `npm run lint`
4. 复核 README、schema、CLI help、实际安装输出一致
5. 推送提交到 `main`，再打 git tag 并 `git push origin <tag>`

## 回滚条件

- doctor / upgrade / install 任一核心路径失败
- root-only legacy 用户无法迁移到 v9 canonical layout
- v9.5 hallucination guard 误把现存任务全部判定为非法事实状态

## 回滚步骤

1. 回退到 v9.4.0 tag（最近已发布稳定 minor）
2. 取消 v9.5 发布说明
