# 项目状态

## 当前方位

- **阶段**：/verify
- **当前确认停点**：等待 degraded-path 验证结果

## 进度概览

- [x] /align
- [x] /design
- [x] /plan
- [x] /build
- [ ] /verify 进行中

## 已锁定内容

- 回调验签使用 HMAC-SHA256
- 订单状态流转：pending → paid / failed / timeout
- 幂等处理：基于回调 ID 去重

## 待确认项

- degraded-path 验证尚未完成：
  - 空 body 回调
  - 验签失败
  - 重复回调
  - 订单已关单时收到成功回调
  - 网关超时

## 最近偏差 / 回退

（无）

## 下一步

完成 degraded-path 全路径验证

## 最小阅读集

- `.ai-os/MISSION.md`
- `.ai-os/STATE.md`
- `.ai-os/acceptance.yaml`
