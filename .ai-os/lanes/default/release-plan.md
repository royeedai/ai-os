# 发布计划

## 发布策略

- **策略**：manual
- **目标环境**：GitHub repo + npm package
- **回滚负责人**：maintainer

## 发布步骤

1. 更新 VERSION、package.json、CHANGELOG
2. 跑 `npm test`
3. 安装 devDependencies 后跑 `npm run lint`
4. 复核 README、schema、CLI help、实际安装输出一致

## 回滚条件

- doctor / upgrade / install 任一核心路径失败
- root-only legacy 用户无法迁移到 v9 canonical layout

## 回滚步骤

1. 回退到 v8.0.0 tag
2. 取消 v9 发布说明
