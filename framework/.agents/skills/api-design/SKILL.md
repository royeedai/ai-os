---
name: api-design
description: >
  RESTful 和 GraphQL API 设计指南。创建新 API、重构现有接口或编写 API 文档时使用。
  涵盖 OpenAPI、REST、GraphQL、版本管理。
  本 Skill 适用于任何技术栈。
---

# API 设计指南

## 使用时机
- 设计新的 REST API
- 创建 GraphQL Schema
- 重构 API 接口
- 编写 API 文档
- API 版本管理策略
- 定义数据模型和关系

## 操作步骤

### 第一步：明确 API 需求
- 识别资源和实体
- 定义实体间的关系
- 确定操作类型（CRUD、自定义动作）
- 规划认证/授权方案
- 考虑分页、筛选、排序

### 第二步：设计 REST API

**资源命名**：
- 使用名词而非动词：`/users` 而不是 `/getUsers`
- 使用复数名称：`/users/{id}`
- 逻辑嵌套资源：`/users/{id}/posts`
- 保持 URL 简短直观

**HTTP 方法**：
- `GET`：查询资源（幂等）
- `POST`：创建新资源
- `PUT`：替换整个资源
- `PATCH`：部分更新
- `DELETE`：删除资源（幂等）

**响应状态码**：
- `200 OK`：成功并返回数据
- `201 Created`：资源创建成功
- `204 No Content`：成功但无返回体
- `400 Bad Request`：请求参数错误
- `401 Unauthorized`：未认证
- `403 Forbidden`：无权限
- `404 Not Found`：资源不存在
- `409 Conflict`：资源冲突
- `422 Unprocessable Entity`：校验失败
- `500 Internal Server Error`：服务器错误

**REST 接口示例**：
```
GET    /api/v1/users           # 用户列表
GET    /api/v1/users/{id}      # 获取用户
POST   /api/v1/users           # 创建用户
PUT    /api/v1/users/{id}      # 更新用户
PATCH  /api/v1/users/{id}      # 部分更新
DELETE /api/v1/users/{id}      # 删除用户
```

### 第三步：请求/响应格式

**请求示例**：
```json
POST /api/v1/users
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "admin"
}
```

**响应示例**：
```json
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/v1/users/123

{
  "id": 123,
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "admin",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### 第四步：错误处理

**错误响应格式**：
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "输入参数无效",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  }
}
```

### 第五步：分页

**查询参数**：
```
GET /api/v1/users?page=2&limit=20&sort=-created_at&filter=role:admin
```

**分页响应**：
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### 第六步：认证

**常用方案**：
- JWT（JSON Web Tokens）
- OAuth 2.0
- API Keys
- Session 会话

**JWT 示例**：
```
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 第七步：版本管理

**URL 版本管理**（推荐）：
```
/api/v1/users
/api/v2/users
```

**Header 版本管理**：
```
GET /api/users
Accept: application/vnd.api+json; version=1
```

### 第八步：文档

创建 OpenAPI 3.0 规范：

```yaml
openapi: 3.0.0
info:
  title: 用户管理 API
  version: 1.0.0
  description: 用户管理接口
servers:
  - url: https://api.example.com/v1
paths:
  /users:
    get:
      summary: 获取用户列表
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: 成功响应
    post:
      summary: 创建用户
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreate'
      responses:
        '201':
          description: 用户创建成功
```

## 最佳实践

1. **一致性**：命名、结构、模式保持一致
2. **版本管理**：从一开始就对 API 进行版本管理
3. **安全**：实现认证和授权
4. **校验**：服务端校验所有输入
5. **限流**：防止 API 被滥用
6. **缓存**：使用 ETag 和 Cache-Control 头
7. **CORS**：为 Web 客户端正确配置
8. **文档**：文档与代码保持同步
9. **测试**：全面测试所有接口
10. **监控**：记录请求日志并跟踪性能

## 约束

- 不要把所有接口都设计成同一种 CRUD 模板，先对齐资源和业务边界
- 不要忽略鉴权、错误处理、分页和版本策略
- 本 Skill 负责接口设计，不替代模块验收和发布检查

## 模板引用

- 输出物：API 契约草稿、请求 / 响应示例、错误响应格式、版本策略说明

### 示例：REST API 契约草稿

- 输入：资源模型、操作需求、鉴权要求
- 输出：资源路径、请求体、响应体、状态码、错误格式
- 约束：字段和枚举应与 `.spec.md` 保持一致

## 维护信息

- 来源：OpenAPI 3.0、REST/GraphQL 通用实践、AI-OS 模块 spec 约束
- 更新时间：2026-03-15
- 已知限制：本 Skill 提供设计基线，不直接生成具体框架代码或网关配置

## 常用模式

**筛选**：
```
GET /api/v1/users?role=admin&status=active
```

**排序**：
```
GET /api/v1/users?sort=-created_at,name
```

**字段选择**：
```
GET /api/v1/users?fields=id,name,email
```

**批量操作**：
```
POST /api/v1/users/batch
{
  "operations": [
    {"action": "create", "data": {...}},
    {"action": "update", "id": 123, "data": {...}}
  ]
}
```

## GraphQL 替代方案

当 REST 不适合时，考虑 GraphQL：

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  createdAt: DateTime!
}

type Query {
  users(page: Int, limit: Int): [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```
