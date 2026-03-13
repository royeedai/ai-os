---
name: performance-optimization
description: >
  应用性能优化指南。改善页面加载速度、减小打包体积、优化数据库查询或解决性能瓶颈时使用。
  涵盖前端优化、懒加载、缓存、代码分割、性能分析。
  本 Skill 适用于任何技术栈。
---

# 性能优化指南

## 使用时机
- **页面加载慢**：Lighthouse 分数低
- **渲染卡顿**：用户交互延迟
- **打包体积大**：下载时间长
- **查询慢**：数据库瓶颈

## 操作步骤

### 第一步：测量性能

**先测量，后优化。不要猜测瓶颈在哪里。**

```bash
# Lighthouse CLI
npm install -g lighthouse
lighthouse https://example.com --view
```

### 第二步：前端优化

**防止不必要的重渲染**：
- 使用 `React.memo`、`useMemo`、`useCallback`（React）
- 使用 `computed`、`v-memo`（Vue）

**懒加载与代码分割**：
- 路由级代码分割：按页面拆分
- 组件级懒加载：重型组件按需加载

**减小打包体积**：
- Tree Shaking：移除未使用的代码
- 按需导入：`import debounce from 'lodash/debounce'` 而非 `import _ from 'lodash'`
- 动态导入：用户触发时再加载

### 第三步：图片优化

- 使用 WebP 格式
- 图片懒加载（`loading="lazy"`）
- 设置明确的宽高，防止 CLS 布局偏移
- 关键大图使用 `priority` 优先加载

### 第四步：数据库查询优化

**修复 N+1 查询**：
```sql
-- ❌ 糟糕：N+1 查询
SELECT * FROM posts;  -- 1 次
-- 循环中逐个查询
SELECT * FROM users WHERE id = ?;  -- N 次

-- ✅ 推荐：1 次查询
SELECT posts.*, users.username
FROM posts
JOIN users ON posts.author_id = users.id;
```

**添加索引**：
```sql
-- 诊断慢查询
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

-- 添加索引
CREATE INDEX idx_users_email ON users(email);

-- 复合索引
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

**缓存策略**（Redis）：
1. 先查缓存
2. 缓存未命中则查数据库
3. 查询结果写入缓存（设置过期时间）

## 性能优化检查清单

```markdown
## 前端
- [ ] 防止不必要的重渲染
- [ ] 路由级代码分割
- [ ] 图片优化（WebP、懒加载）
- [ ] 分析并减小打包体积

## 后端
- [ ] 消除 N+1 查询
- [ ] 添加数据库索引
- [ ] Redis 缓存热点数据
- [ ] API 响应压缩（gzip）

## 指标目标
- [ ] Lighthouse 分数 90+
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
```

## 约束规则

### 必须遵守
1. **先测量**：分析数据，不要猜测
2. **逐步优化**：一次优化一个点
3. **持续监控**：跟踪性能变化

### 禁止事项
1. **过早优化**：没有瓶颈不要优化
2. **牺牲可读性**：不要为了性能让代码变得复杂

## 最佳实践

1. **80/20 法则**：20% 的努力带来 80% 的提升
2. **以用户为中心**：关注真实用户体验
3. **自动化**：CI 中加入性能回归测试
