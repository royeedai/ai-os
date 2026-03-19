# 示例：brownfield 任务先审共享基础设施

这个示例演示：

1. 为什么局部页面 / 接口改动也要先查 request wrapper、拦截器、DTO / adapter、鉴权或样式基准
2. `DESIGN.md` 或 debug 结论如何记录共享基础设施约定，避免按表层结构误判
3. `/verify` 和自审如何把共享基础设施影响纳入最终结论
