# 数据库设计检查清单（详细版）

本文件是 `fullstack-dev-checklist` Skill 的补充参考，提供数据库设计时的详细检查规范。

---

## 表设计通用规范

### 每张表必须包含
```sql
-- 基础字段
id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- 软删除（需要时）
deleted_at  DATETIME NULL DEFAULT NULL
```

### Go GORM Model 基础结构
```go
type BaseModel struct {
    ID        uint           `gorm:"primaryKey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}
```

---

## 字段类型选择

| 数据类型 | MySQL 类型 | Go 类型 | 注意事项 |
|---------|-----------|--------|---------|
| 主键 | `BIGINT UNSIGNED` | `uint` | 自增 |
| 名称/标题 | `VARCHAR(255)` | `string` | 设合理长度 |
| 短描述 | `VARCHAR(500)` | `string` | |
| 长文本 | `TEXT` | `string` | 如商品详情 |
| 金额/价格 | `DECIMAL(10,2)` | `float64` 或自定义 | **绝不用 FLOAT** |
| 状态/类型 | `TINYINT` | `int8` | 配合常量定义 |
| 布尔标志 | `TINYINT(1)` | `bool` | |
| 外键 | `BIGINT UNSIGNED` | `uint` | 与关联表主键类型一致 |
| 图片URL | `VARCHAR(500)` | `string` | |
| 多图片 | `JSON` 或 `TEXT` | `string` (JSON) | 存 JSON 数组 |
| 排序权重 | `INT DEFAULT 0` | `int` | 值越大越靠前 |
| 手机号 | `VARCHAR(20)` | `string` | 不用数字类型 |

---

## 索引设计

### 必须添加索引的场景
1. **外键字段**：所有 `xxx_id` 字段
2. **状态字段**：经常用于筛选的 `status` 等字段
3. **唯一约束**：如用户表的 `openid`、`phone`
4. **排序字段**：如 `sort_order`、`created_at`
5. **联合查询**：经常一起查询的字段建联合索引

### GORM 索引写法
```go
type Product struct {
    BaseModel
    Name       string `gorm:"type:varchar(255);not null;index" json:"name"`
    CategoryID uint   `gorm:"index" json:"category_id"`
    Status     int8   `gorm:"type:tinyint;default:1;index" json:"status"`
    SortOrder  int    `gorm:"type:int;default:0;index" json:"sort_order"`
    
    // 唯一索引
    Code string `gorm:"type:varchar(50);uniqueIndex" json:"code"`
    
    // 联合索引
    // gorm:"index:idx_category_status"
}
```

---

## 关联关系设计

### 一对多（如：分类 → 商品）
```go
// Category
type Category struct {
    BaseModel
    Name     string    `json:"name"`
    Products []Product `json:"products,omitempty"` // 一对多
}

// Product
type Product struct {
    BaseModel
    CategoryID uint     `gorm:"index" json:"category_id"`
    Category   Category `json:"category,omitempty"` // 属于某分类
}
```

**检查项：**
- [ ] 外键字段已添加索引
- [ ] 删除主记录时的策略明确（限制删除 / 级联删除 / 置空）
- [ ] 查询时按需预加载（`Preload`），避免 N+1 问题

### 多对多（如：订单 ↔ 商品）
```go
// 使用中间表
type OrderItem struct {
    BaseModel
    OrderID   uint    `gorm:"index" json:"order_id"`
    ProductID uint    `gorm:"index" json:"product_id"`
    Quantity  int     `json:"quantity"`
    Price     float64 `gorm:"type:decimal(10,2)" json:"price"` // 下单时价格快照
    
    Product Product `json:"product,omitempty"`
}
```

**检查项：**
- [ ] 中间表有独立主键
- [ ] 中间表的外键字段都有索引
- [ ] 业务快照字段保存（如订单中的商品价格）

---

## 数据完整性检查

- [ ] 金额计算在后端完成，不信任前端传入的金额
- [ ] 订单创建时快照商品价格（后续改价不影响已有订单）
- [ ] 库存变更使用数据库事务 + 行锁，防止超卖
- [ ] 关键操作（扣减库存、创建订单）在事务中完成
- [ ] 状态变更有前置条件校验（如只有"待支付"状态才能取消）
