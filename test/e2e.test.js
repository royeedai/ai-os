#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, run, tmpDir, cleanup, section } = require("./helpers");

section("e2e delivery failure scenarios");

// Scenario 1: "Looks done but tasks still todo"
// All gates claimed passed, but tasks haven't been executed — a classic vibe-code claim.
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const acceptancePath = path.join(dir, ".ai-os", "acceptance.yaml");
  fs.writeFileSync(
    acceptancePath,
    fs.readFileSync(acceptancePath, "utf8")
      .replace(/status: pending/g, "status: passed"),
    "utf8"
  );
  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "scenario/looks-done: validate structurally passes when gates claimed passed");
  const releaseResult = run("ai-os-release-check.js", [dir]);
  assert(releaseResult.status === 1, "scenario/looks-done: release-check blocks when tasks still todo despite gates passed");
  cleanup(dir);
}

// Scenario 2: "Quality tier escalation mismatch"
// tasks.yaml declares high-risk but acceptance still says standard — governance gap.
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8")
      .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
      .replace('risk: medium', 'risk: high')
      .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"'),
    "utf8"
  );
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "scenario/tier-mismatch: validate blocks tasks=high-risk but missing high-risk artifacts");
  cleanup(dir);
}

// Scenario 3: "Broken traceability — tasks reference nonexistent spec"
// tasks.yaml 'inputs' references specs/payment.spec.md but only example.spec.md exists.
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = path.join(dir, ".ai-os", "tasks.yaml");
  const tasksContent = fs.readFileSync(tasksPath, "utf8");
  const patchedTasks = tasksContent.includes("inputs:")
    ? tasksContent.replace(
        /inputs:\s*\n(\s+- "[^"]+"\n)+/,
        'inputs:\n      - "specs/payment.spec.md"\n'
      )
    : tasksContent.replace(
        'context_files:\n      - "specs/example.spec.md"',
        'context_files:\n      - "specs/example.spec.md"\n    inputs:\n      - "specs/payment.spec.md"'
      );
  fs.writeFileSync(tasksPath, patchedTasks, "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(
    result.stdout.includes("payment.spec.md"),
    "scenario/broken-traceability: validate flags reference to nonexistent spec in inputs"
  );
  cleanup(dir);
}

// Scenario 4: "STATE.md gutted — session recovery impossible"
// STATE.md exists but is empty, meaning no recovery context.
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(path.join(dir, ".ai-os", "STATE.md"), "# State\n\nEmpty.\n", "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "scenario/gutted-state: validate rejects STATE.md with missing sections");
  cleanup(dir);
}

// Scenario 5: "memory.md gutted — project knowledge lost"
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(path.join(dir, ".ai-os", "memory.md"), "# Memory\n\n(blank)\n", "utf8");
  const result = run("ai-os-validate.js", [dir]);
  assert(result.status === 1, "scenario/gutted-memory: validate rejects memory.md with missing sections");
  cleanup(dir);
}

// Scenario 6: "release-plan without human-action split"
// release-plan.md exists but doesn't distinguish AI已完成 vs 需人工执行.
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8")
      .replace(/status: todo/g, "status: done"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "acceptance.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "acceptance.yaml"), "utf8")
      .replace(/status: pending/g, "status: passed"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "release-plan.md"),
    `# Release Plan\n\n## 1. 交付前检查\n\n- 完成\n\n## 2. 变更范围与依赖\n\n- API 变更\n\n## 3. 发布步骤\n\n1. 部署\n2. 验证\n\n## 4. 运行态验证\n\n- 通过\n\n## 5. 回滚触发条件\n\n- 错误率上升\n\n## 6. 交付说明与移交\n\n- 已完成\n`,
    "utf8"
  );
  const result = run("ai-os-release-check.js", [dir]);
  assert(
    result.status === 1 || result.stdout.includes("manual-action") || result.stdout.includes("静态校验"),
    "scenario/no-human-split: release-check warns or blocks release plan missing AI已完成/需人工执行 markers"
  );
  cleanup(dir);
}

// Scenario 7: "Full valid standard delivery — happy path"
// Tasks done + gates passed → validate passes. Standard projects don't require release-plan.
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8")
      .replace(/status: todo/g, "status: done"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "acceptance.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "acceptance.yaml"), "utf8")
      .replace(/status: pending/g, "status: passed"),
    "utf8"
  );
  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "scenario/valid-delivery: validate passes for complete standard delivery");
  const releaseResult = run("ai-os-release-check.js", [dir]);
  assert(releaseResult.status === 1, "scenario/valid-delivery: release-check requires release-plan.md even for standard");
  cleanup(dir);
}

// Scenario 8: "Standard delivery with release plan — full happy path"
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8")
      .replace(/status: todo/g, "status: done"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "acceptance.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "acceptance.yaml"), "utf8")
      .replace(/status: pending/g, "status: passed"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "release-plan.md"),
    `# Release Plan\n\n## 1. 交付前检查\n\n- Mission、Design、Spec、Acceptance 已同步\n- 静态校验证据已记录（npm run build）\n\n## 2. 变更范围与依赖\n\n- 覆盖示例接口\n\n## 3. 发布步骤\n\n1. [AI 已完成] 代码实现和测试\n2. [需人工执行] 部署到生产环境\n\n## 4. 运行态验证\n\n- 静态校验证据已记录\n- 目标运行态证据已记录\n\n## 5. 回滚触发条件\n\n- 错误率上升\n\n## 6. 交付说明与移交\n\n- AI 已完成：代码实现和测试\n- 需人工执行：生产部署\n`,
    "utf8"
  );
  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "scenario/full-happy-path: validate passes");
  const releaseResult = run("ai-os-release-check.js", [dir]);
  assert(releaseResult.status === 0, "scenario/full-happy-path: release-check passes with proper release plan");
  cleanup(dir);
}
