## 变更摘要

简要描述这次 PR 做了什么，以及不做什么。

## Regression reference

- Issue / eval / failure-mode reference：
- 是否新增或修改行为 oracle：是 / 否
- 现有覆盖是否变弱：是 / 否；若是，请解释并取得明确 review

## 关联核心要求

- [ ] 目标与用户确认优先
- [ ] 关键设计与逻辑先锁定
- [ ] 自适应治理
- [ ] 证据化完成
- [ ] 可恢复的项目记忆

## 收口状态

- Code state：
- Data state：
- Runtime state：
- 未执行检查 / blocker：

## 检查清单

- [ ] `npm test` 通过
- [ ] `npm run test:coverage` 通过
- [ ] `npm run lint` 通过
- [ ] `git diff --check` 通过
- [ ] 如果改了分发内容，已执行 package contents / tarball install smoke
- [ ] 如果改了 `framework/`，已更新 `VERSION` 与相关文档、测试
- [ ] 如果新增 eval / example，已同步 inventory 与契约测试
- [ ] 如果改了 workflow / 模板 / skill，已回看关联 Issue / eval / failure mode
