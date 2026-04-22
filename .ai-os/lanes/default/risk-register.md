# 风险登记

| 风险 ID | 描述 | 影响范围 | 触发条件 | 规避措施 | 监测入口 | 审批结论 |
|---|---|---|---|---|---|---|
| R-001 | v8 legacy 布局迁移不完整 | 现有用户升级路径 | root-only / hybrid 样例失败 | 用测试覆盖 v7 -> v9、v8 root-only -> v9、v8 hybrid -> v9 | upgrade tests | n/a |
