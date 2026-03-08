---
name: testing-strategies
description: >
  软件质量保障的测试策略指南。规划测试覆盖率、实施测试金字塔或搭建测试基础设施时使用。
  涵盖单元测试、集成测试、E2E 测试、TDD 及测试最佳实践。
  本 Skill 适用于任何技术栈。
---

# 测试策略指南

## 使用时机
- **新项目**：制定测试策略
- **质量问题**：Bug 频出
- **重构前**：先建安全网
- **CI/CD 搭建**：自动化测试

## 操作步骤

### 第一步：理解测试金字塔

```
       /\
      /E2E\          ← 少量（慢、成本高）
     /______\
    /        \
   / 集成测试  \    ← 适量
  /____________\
 /              \
/    单元测试    \  ← 大量（快、成本低）
/________________\
```

**比例建议**：
- 单元测试：70%
- 集成测试：20%
- E2E 测试：10%

### 第二步：单元测试策略

**Given-When-Then 模式**：
```typescript
describe('calculateDiscount', () => {
  it('订单超过100元应打9折', () => {
    // Given：准备数据
    const order = { total: 150, customerId: '123' };

    // When：执行操作
    const discount = calculateDiscount(order);

    // Then：验证结果
    expect(discount).toBe(15);
  });

  it('订单不足100元不打折', () => {
    const order = { total: 50, customerId: '123' };
    const discount = calculateDiscount(order);
    expect(discount).toBe(0);
  });

  it('无效订单应抛出错误', () => {
    const order = { total: -10, customerId: '123' };
    expect(() => calculateDiscount(order)).toThrow('Invalid order');
  });
});
```

**Mock 策略**：
```typescript
// Mock 外部依赖
jest.mock('../services/emailService');
import { sendEmail } from '../services/emailService';

describe('UserService', () => {
  it('注册时应发送欢迎邮件', async () => {
    const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;
    mockSendEmail.mockResolvedValueOnce(true);

    await userService.register({ email: 'test@example.com', password: 'pass' });

    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Welcome!',
      body: expect.any(String)
    });
  });
});
```

### 第三步：集成测试

**API 接口测试**：
```typescript
describe('POST /api/users', () => {
  beforeEach(async () => {
    await db.user.deleteMany();  // 清空数据库
  });

  it('有效数据应成功创建用户', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!'
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: 'test@example.com',
      username: 'testuser'
    });

    // 验证数据确实已保存到数据库
    const user = await db.user.findUnique({ where: { email: 'test@example.com' } });
    expect(user).toBeTruthy();
  });

  it('重复邮箱应返回冲突错误', async () => {
    await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', username: 'user1', password: 'Pass123!' });

    const response = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', username: 'user2', password: 'Pass123!' });

    expect(response.status).toBe(409);
  });
});
```

### 第四步：E2E 测试（Playwright）

```typescript
import { test, expect } from '@playwright/test';

test.describe('用户注册流程', () => {
  test('应完成完整的注册过程', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=注册');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=欢迎')).toBeVisible();
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });
});
```

### 第五步：TDD（测试驱动开发）

**红-绿-重构 循环**：
1. **红**：编写一个会失败的测试
2. **绿**：用最少的代码让测试通过
3. **重构**：优化代码，保持测试通过

## 约束规则

### 必须遵守
1. **测试隔离**：每个测试独立运行
2. **快速反馈**：单元测试应快速完成（<1 分钟）
3. **确定性**：相同输入 → 相同结果

### 禁止事项
1. **测试间依赖**：不要让测试 A 依赖测试 B
2. **使用生产数据库**：不要在测试中使用真实数据库
3. **Sleep/Timeout**：避免基于时间的测试

## 最佳实践

1. **AAA 模式**：Arrange（准备）- Act（执行）- Assert（断言）
2. **测试命名**：清晰描述测试意图
3. **边界用例**：边界值、null、空值
4. **正常路径 + 异常路径**：覆盖成功和失败场景
