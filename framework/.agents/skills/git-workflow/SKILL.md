---
name: git-workflow
description: >
  Git 工作流管理。提交代码、管理分支、合并、解决冲突时使用。
  涵盖提交规范、分支策略、Worktree 隔离开发、团队协作最佳实践。
---

# Git 工作流

## 使用时机
- 编写提交信息
- 管理分支
- 合并代码
- 解决冲突
- 团队协作
- Git 最佳实践
- `/build` 前需要创建隔离工作空间

## 操作步骤

### 第一步：分支管理

**创建功能分支**：
```bash
git checkout -b feature/功能名称
```

**命名规范**：
- `feature/描述`：新功能
- `bugfix/描述`：Bug 修复
- `hotfix/描述`：紧急修复
- `refactor/描述`：代码重构
- `docs/描述`：文档更新

### 第二步：暂存变更

```bash
# 暂存指定文件
git add file1.py file2.js

# 暂存所有变更
git add .

# 交互式暂存
git add -p
```

### 第三步：提交

**提交信息规范**：
```bash
git commit -m "type(scope): 简短描述

详细说明修改了什么以及为什么修改。

- 变更 1
- 变更 2

Fixes #123"
```

**提交类型**：
- `feat`：新功能
- `fix`：Bug 修复
- `docs`：文档
- `style`：格式调整，无逻辑变更
- `refactor`：代码重构
- `test`：添加测试
- `chore`：维护工作

**示例**：
```bash
git commit -m "feat(auth): 添加 JWT 认证

- 实现 JWT Token 生成
- 添加 Token 验证中间件
- 更新用户模型增加 refresh token

Closes #42"
```

### 第四步：推送

```bash
# 推送到远程
git push origin feature/功能名称

# 安全强制推送
git push origin feature/功能名称 --force-with-lease

# 设置上游并推送
git push -u origin feature/功能名称
```

### 第五步：拉取和同步

```bash
# 拉取最新代码
git pull origin main

# 使用 rebase 拉取（更干净的历史）
git pull --rebase origin main

# 仅获取不合并
git fetch origin
```

### 第六步：合并

**合并功能分支**：
```bash
git checkout main
git merge --no-ff feature/功能名称  # 创建合并提交
```

**Rebase 替代合并**：
```bash
git checkout feature/功能名称
git rebase main
git rebase --continue  # 解决冲突后继续
```

### 第七步：解决冲突

```bash
# 查看冲突文件
git status

# 冲突标记：
<<<<<<< HEAD
当前分支代码
=======
传入分支代码
>>>>>>> feature-branch

# 解决后
git add <已解决的文件>
git commit
```

### 第八步：清理

```bash
# 删除本地分支
git branch -d feature/功能名称

# 删除远程分支
git push origin --delete feature/功能名称

# 清理过期引用
git fetch --prune
```

## Worktree 隔离开发

在 `/build` 阶段开始前，推荐使用 git worktree 创建隔离工作空间，避免在主分支上直接开发。

### 何时使用 Worktree

- P0 项目的 `/build` 阶段（推荐）
- 多个功能并行开发
- 需要保持主分支干净以便随时切换任务

### 创建 Worktree

#### 第一步：确定 Worktree 目录

按优先级检查：
```bash
ls -d .worktrees 2>/dev/null     # 优先（隐藏目录）
ls -d worktrees 2>/dev/null      # 备选
```

如果都不存在，创建 `.worktrees/` 并确认 `.gitignore` 包含它：
```bash
mkdir -p .worktrees
echo ".worktrees/" >> .gitignore
git add .gitignore && git commit -m "chore: ignore worktrees directory"
```

#### 第二步：确保 Worktree 目录被 Git 忽略

```bash
git check-ignore -q .worktrees 2>/dev/null
```

如果未被忽略，必须先加入 `.gitignore` 并提交，防止 worktree 内容意外入库。

#### 第三步：创建 Worktree 和分支

```bash
git worktree add .worktrees/feature-name -b feature/feature-name
cd .worktrees/feature-name
```

#### 第四步：运行项目 Setup

自动检测并运行：
```bash
# Node.js
[ -f package.json ] && npm install

# Python
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f pyproject.toml ] && poetry install

# Rust
[ -f Cargo.toml ] && cargo build

# Go
[ -f go.mod ] && go mod download
```

#### 第五步：验证基线测试

```bash
npm test  # 或项目对应的测试命令
```

如果测试失败：报告失败并询问是否继续。
如果测试通过：报告就绪状态。

### 完成后收尾

实现完成、测试通过后，提供 4 个选项：

1. **合并到基础分支**：`git checkout main && git merge feature/name && git branch -d feature/name`
2. **推送并创建 PR**：`git push -u origin feature/name && gh pr create`
3. **保持分支不动**：不清理 worktree
4. **放弃本次工作**：确认后删除分支和 worktree

选择 1、2、4 后清理 worktree：
```bash
git worktree remove .worktrees/feature-name
```

### 快速参考

| 场景 | 操作 |
|------|------|
| `.worktrees/` 已存在 | 使用它（验证已忽略） |
| 目录未被忽略 | 加入 .gitignore 并提交 |
| 基线测试失败 | 报告失败，等用户决定 |
| 完成后选择 merge | 合并 + 删分支 + 清 worktree |
| 完成后选择 PR | push + create PR |
| 完成后选择保持 | 不动 |
| 完成后选择放弃 | 需二次确认后删除 |

## 高级工作流

### 交互式 Rebase

```bash
# 整理最近 3 个提交
git rebase -i HEAD~3

# 编辑器中的命令：
# pick：保留提交
# reword：修改提交信息
# squash：与前一个合并
# fixup：与前一个合并（丢弃信息）
# drop：删除提交
```

### 暂存工作（Stash）

```bash
git stash                          # 暂存当前修改
git stash save "功能 X 的半成品"     # 带描述暂存
git stash list                     # 列出暂存
git stash pop                      # 应用并删除最近的暂存
git stash apply stash@{2}          # 应用指定暂存
```

### Cherry-pick

```bash
git cherry-pick <commit-hash>      # 应用指定提交
git cherry-pick -n <commit-hash>   # 应用但不自动提交
```

## 最佳实践

1. **频繁提交**：小而专注的提交
2. **有意义的信息**：说明做了什么和为什么
3. **推前先拉**：保持代码最新
4. **提交前检查**：确认提交的内容
5. **使用分支**：不要直接提交到 main
6. **保持历史干净**：Rebase 功能分支
7. **推前测试**：本地运行测试
8. **分支命名清晰**：便于理解
9. **删除已合并分支**：保持仓库整洁
10. **使用 .gitignore**：不提交生成的文件

## 常用操作

### 撤销上次提交（保留修改）
```bash
git reset --soft HEAD~1
```

### 修改上次提交
```bash
git commit --amend -m "新的提交信息"
git add 遗漏的文件.txt
git commit --amend --no-edit
```

### 查看历史
```bash
git log --oneline              # 单行显示
git log --oneline --graph --all  # 图形显示
git log -5                     # 最近 5 条
git log --author="作者名"       # 按作者筛选
```

## 故障排除

### 提交到了错误的分支
```bash
git branch feature/正确分支     # 从当前状态创建正确分支
git reset --hard HEAD~1        # 重置当前分支
git checkout feature/正确分支   # 切换到正确分支
```

### 撤销合并
```bash
git reset --hard HEAD~1                  # 未推送时
git revert -m 1 <merge-commit-hash>      # 已推送时
```

### 恢复已删除的分支
```bash
git reflog                                # 查找丢失的提交
git checkout -b recovered-branch <hash>   # 从丢失的提交创建分支
```

## 约束

- 不要在未理解当前分支状态时直接执行破坏性命令
- 不要把团队协作策略和个人仓库习惯混为一谈
- 本 Skill 负责 Git 工作流建议，不替代仓库的受保护分支和审查策略

## 模板引用

- 输出物：推荐分支策略、提交信息、合并方式、冲突处理步骤

### 示例：功能分支提交流程

- 输入：一组已完成改动，准备提交并发起合并
- 输出：分支命名、提交信息、推送与合并建议
- 约束：若仓库存在受保护分支策略，应优先遵循仓库规则

## 维护信息

- 来源：Git 官方工作流、语义化提交约定、常见团队协作实践，借鉴 Superpowers using-git-worktrees
- 更新时间：2026-03-24
- 已知限制：本 Skill 不覆盖所有托管平台的分支保护配置细节
