# AI-OS v9 默认 Lane 回归 Design

## 1. 设计目标

- **本轮设计目标**：统一 AI-OS 的默认布局真相、升级路径和健康检查规则
- **需要先锁定的关键页面 / 交互 / 接口**：CLI install / doctor / upgrade 的输出路径和文档叙事
- **必须用户确认的核心设计决策**：shared-root + `lanes/default/` 作为唯一 canonical layout

## 2. 核心接口与数据模型

| 接口 / 模型 | 用途 | 关键字段 | 状态流转 | 是否核心决策 | 确认状态 |
|---|---|---|---|---|---|
| `framework.toml` | 记录布局与版本 | `schema_version` `layout_mode` `framework_version` | install / upgrade 更新 | yes | confirmed |
| `managed-files.tsv` | 记录受管路径 | root shared + lane paths | install / upgrade 重写 | yes | confirmed |
| `doctor --json` | 暴露健康状态 | `layout_version` `layout_mode` `issues[]` | doctor 输出 | yes | confirmed |

## 3. 关键流程

1. install 生成根层共享工件和 `.ai-os/lanes/default/`
2. doctor 先判断布局模式，再按 v9 canonical layout 校验
3. upgrade 将 v7 legacy / v8 root-only / v8 hybrid 统一迁移到 v9
4. docs/examples/tests 跟随实际布局同步收口

## 4. 共享基础设施审计

- **受影响的共享组件**：`bin/shared.js`、`create-ai-os.js`、`ai-os-doctor.js`、`ai-os-upgrade.js`
- **受影响的接口 / 页面清单**：README、artifacts schema、constitution spec、maintainers guide、migration guide
- **同仓正常实现对照**：仓库根 `.ai-os/` 自托管实例
- **副作用清单**：安装输出变更、doctor 失败语义变更、upgrade 迁移路径变更、测试断言整体重写

## 5. 验收标准

| AC ID | 需求 ID | 验收描述 | 验证方式 | 证据 |
|---|---|---|---|---|
| AC-001 | REQ-001 | fresh install 生成 shared-root + default lane | `npm test` | install tests |
| AC-002 | REQ-002 | doctor 能识别 canonical / root-only legacy / hybrid drift | `npm test` | doctor tests |
| AC-003 | REQ-003 | upgrade 能将旧布局统一迁移到 v9 | `npm test` | upgrade tests |
| AC-004 | REQ-004 | README、schema、CLI help、实际输出一致 | `npm test` | docs tests |

## 6. 设计确认记录

- 2026-04-22：项目 owner 确认按 v9 major 执行默认 lane 回归
