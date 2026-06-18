# 风险登记

| 风险 ID | 描述 | 影响范围 | 触发条件 | 规避措施 | 监测入口 | 审批结论 |
|---|---|---|---|---|---|---|
| R-001 | 边界策略被误读成放开运行面 | README、artifacts、skill、maintainers | 只强调可以扩展，未强调 evidence gate 和 forbidden surfaces | 明确 Kernel / Controlled Extension / Adapter / Forbidden 四层 | docs tests + strict doctor | n/a |
| R-002 | 边界策略被误读成永久冻结 | public docs、maintainer docs | 继续写成“永不新增 doctor / CLI / artifact” | 改为“默认不新增；如新增必须通过 boundary review” | docs assertions | n/a |
| R-003 | controlled extension 缺证据就进入核心 | doctor、CLI、artifact schema | 新增能力无 CR、PL/eval/test 或原生验证 | 新增 Boundary Decision Checklist | maintainer checklist + docs tests | n/a |
| R-004 | 版本元数据再次漂移 | 发布元数据 | VERSION / package.json bump 后 lockfile 或 docs pin 未同步 | 版本断言覆盖 package-lock、docs pins、install / doctor / shared tests | docs/install/doctor/shared tests | n/a |
