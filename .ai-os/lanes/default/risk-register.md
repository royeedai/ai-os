# 风险登记

| 风险 ID | 描述 | 影响范围 | 触发条件 | 规避措施 | 监测入口 | 审批结论 |
|---|---|---|---|---|---|---|
| R-001 | 确认停点写得过松，削弱模糊需求 / 高风险审批 | AGENTS、skill、spec | 明确请求直进 L1 被误读成任何任务都可跳过确认 | 文案限定为已授权且范围清楚；高风险、越界、范围不清仍停等 | `test/docs.test.js` + manual docs review | n/a |
| R-002 | doctor guard 文案继续误导 Codex hook 能力 | README、interop docs | 把 portable command 写成所有 host 都有 pre-tool hook | 明确强制性取决于 hook / pre-commit / CI 接入面 | README / Claude interop review | n/a |
| R-003 | release metadata 再次漏同步 package-lock | 发布元数据 | VERSION / package.json bump 后 package-lock 未改 | `test/docs.test.js` 增加 package-lock parity | docs test | n/a |
| R-004 | 发布到 GitHub main / tag 是外部副作用 | GitHub repo、npx-from-GitHub 用户 | 未复验就 push 或 tag 错版本 | 发布前重跑 npm test / lint / strict doctor，提交后推 main，再推 v10.3.1 tag | release task evidence + git status | approved by user 2026-06-18 |
