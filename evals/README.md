# AI-OS Root Evals

这里存放 AI-OS 母仓库的根层回归评估样例。

它们不是分发到用户项目里的 `.ai-os/evals/`，而是用来约束 AI-OS 自身演化方向的维护者样例：

- 判断某个新需求是否真的应该进入 `framework/`
- 判断 workflow / skill 是否又回退成“所有模块一条重流程”
- 判断复刻 / 参考开发是否再次把参考对象误写成兼容目标

## 什么时候要补 eval

出现以下情况时，优先补或更新这里的 eval，而不是继续新增高层原则：

- 同类误判在不同项目里重复出现
- 某次规则调整来自真实项目实验或失败案例
- 某个 workflow / skill 很容易重新退化成默认重流程
- 需要为“这条规则为什么存在”保留长期证据

## 怎么使用

每个 eval 都回答 5 件事：

1. 场景输入是什么
2. 错误规划会长什么样
3. AI-OS 应该如何处理
4. 最少需要什么证据或工件
5. 如果改 framework，应优先改哪里

## 当前基线样例

- `minimum-sufficient-flow.md`
- `shared-foundation-first.md`
- `reference-project-boundary.md`
