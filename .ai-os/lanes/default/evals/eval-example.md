# Eval Example

- **Failure mode**：文档和 install 输出指向不同默认布局
- **Trigger**：README 仍写 root-only，install 已生成 lane-default
- **Expected**：docs tests 失败
- **Observed**：
- **Guard update**：同步更新 docs consistency tests
