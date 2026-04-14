# 示例：把单次排障沉淀成项目级回归样例

这个示例演示：

1. `/debug`、`/verify`、`/postmortem` 如何区分“一次性偶发问题”和“稳定 failure mode”
2. 一旦确认是稳定 failure mode，如何把最小复现、放行条件和验证方法沉淀到 `.ai-os/evals/` 或 `verification-matrix.yaml`
3. 为什么只把结论记进 `memory.md` 不够，还需要项目级回归工件来防止后续 session 重复踩坑
