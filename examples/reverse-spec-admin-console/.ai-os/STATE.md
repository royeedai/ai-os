# 项目状态

## 当前方位

- **项目模式**：reverse-spec
- **当前阶段**：plan
- **当前治理档位**：P0
- **当前目标**：锁定列表页、详情页和编辑流程的对照规则与实现边界
- **当前任务**：TASK-AI-001
- **当前交付档位**：standard
- **当前质量焦点**：对照一致、关键交互闭环、差异显式记录
- **当前确认停点**：等待详情页布局和编辑回流行为确认
- **最新需求基准状态**：confirmed
- **最近一次用户确认**：2026-03-16

## 进度概览

| 阶段 | 状态 | 说明 |
|------|------|------|
| align | done | reverse-spec 交付边界已确认 |
| design | done | 关键页面结构和 parity map 已锁定 |
| plan | in_progress | spec、tasks 和 acceptance 已建立，待补详情确认 |
| build | blocked | 等待详情布局确认 |
| verify | blocked | 等待实现完成 |
| ship | blocked | 等待对照证据齐备 |

## 已锁定内容

- 列表页必须保留筛选区、表格和详情跳转
- 详情页与编辑流程必须回到列表并保留筛选上下文
- 允许的差异仅限文案本地化和视觉细节

## 待确认项

- 详情页左右布局还是上下布局
- 编辑成功后是否保留当前位置与筛选条件

## 最近偏差 / 回退

- 已把“看起来像”拆成 parity-map、spec 和 acceptance 三处对照约束，避免只靠截图印象开发

## 下一步

完成详情页布局确认后，冻结 `/plan` 产物并进入 `/build`

## 最小阅读集

- MISSION.md
- baseline-log
- DESIGN.md
- CONVENTIONS.md
- tasks.yaml
- acceptance.yaml
- design-pack/parity-map.md
- specs/admin-list.spec.md
