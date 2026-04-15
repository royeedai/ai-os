#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  assert, run, tmpDir, cleanup, listLaneBaselineRecords,
  extractMissionBaselineId, section,
} = require("./helpers");
const { getLaneFilePath } = require("../bin/shared");

section("real-project: greenfield full lifecycle");
{
  const dir = tmpDir();

  // 1. Install with project profile (simulating: npx create-ai-os my-app --profile project)
  const installResult = run("create-ai-os.js", [dir, "--profile", "project"]);
  assert(installResult.status === 0, "greenfield: install succeeds");
  assert(fs.existsSync(getLaneFilePath(dir, "default", "MISSION.md")), "greenfield: MISSION created");
  assert(fs.existsSync(getLaneFilePath(dir, "default", "DESIGN.md")), "greenfield: DESIGN created");

  // 2. Fill in MISSION (simulating: user fills after /align)
  extractMissionBaselineId(
    fs.readFileSync(getLaneFilePath(dir, "default", "MISSION.md"), "utf8")
  );
  const missionPath = getLaneFilePath(dir, "default", "MISSION.md");
  fs.writeFileSync(
    missionPath,
    fs.readFileSync(missionPath, "utf8")
      .replace(/\[待填写\]/g, "已确认")
      .replace(/\[待确认\]/g, "已确认")
      .replace(/\[宿主项目名\]/, "todo-app")
      .replace(/\[一句话描述当前交付主题\]/, "构建 CLI todo 管理工具"),
    "utf8"
  );

  // 3. Doctor should pass
  const doctorResult = run("ai-os-doctor.js", [dir, "--strict"]);
  assert(doctorResult.status === 0, "greenfield: doctor passes after install");

  // 4. Validate should pass (fresh project with warnings about pending gates)
  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "greenfield: validate passes on fresh project");

  // 5. Fill tasks as done
  const tasksPath = getLaneFilePath(dir, "default", "tasks.yaml");
  fs.writeFileSync(
    tasksPath,
    fs.readFileSync(tasksPath, "utf8").replace(/status: todo/g, "status: done"),
    "utf8"
  );

  // 6. Pass acceptance gates
  const acceptancePath = getLaneFilePath(dir, "default", "acceptance.yaml");
  fs.writeFileSync(
    acceptancePath,
    fs.readFileSync(acceptancePath, "utf8").replace(/status: pending/g, "status: passed"),
    "utf8"
  );

  // 7. Status should report progress
  const statusResult = run("ai-os-status.js", [dir]);
  assert(statusResult.status === 0, "greenfield: status works after progress");

  // 8. Resume should provide context
  const resumeResult = run("ai-os-resume.js", [dir, "--markdown"]);
  assert(resumeResult.status === 0, "greenfield: resume works");
  assert(resumeResult.stdout.includes("MISSION"), "greenfield: resume references MISSION");

  // 9. Release check (needs release plan)
  fs.writeFileSync(
    getLaneFilePath(dir, "default", "release-plan.md"),
    `# Release Plan\n\n## 1. 交付前检查\n\n- Mission、Design、Spec、Acceptance 已同步\n- 静态校验证据已记录（npm run build）\n\n## 2. 变更范围与依赖\n\n- 新建 CLI 工具\n\n## 3. 发布步骤\n\n1. [AI 已完成] 代码实现和测试\n2. [需人工执行] npm publish\n\n## 4. 运行态验证\n\n- 静态校验证据已记录\n- 目标运行态证据已记录\n\n## 5. 回滚触发条件\n\n- CLI 无法启动\n\n## 6. 交付说明与移交\n\n- AI 已完成：全部代码和测试\n- 需人工执行：发布到 npm\n`,
    "utf8"
  );
  const releaseResult = run("ai-os-release-check.js", [dir]);
  assert(releaseResult.status === 0, "greenfield: release-check passes for complete delivery");

  // 10. Upgrade should work cleanly
  const upgradeResult = run("ai-os-upgrade.js", [dir, "--preflight"]);
  assert(upgradeResult.status === 0, "greenfield: upgrade preflight passes");

  cleanup(dir);
}

section("real-project: brownfield change request lifecycle");
{
  const dir = tmpDir();

  // 1. Install with core profile (brownfield - only framework, no project templates)
  const installResult = run("create-ai-os.js", [dir]);
  assert(installResult.status === 0, "brownfield: core install succeeds");

  // 2. Upgrade to project profile (simulating: user decides to use full project tracking)
  const upgradeToProject = run("create-ai-os.js", [dir, "--profile", "project"]);
  assert(upgradeToProject.status === 0, "brownfield: upgrade to project profile succeeds");
  assert(fs.existsSync(getLaneFilePath(dir, "default", "MISSION.md")), "brownfield: MISSION now exists");

  // 3. Fill in MISSION as brownfield/change
  const missionPath = getLaneFilePath(dir, "default", "MISSION.md");
  fs.writeFileSync(
    missionPath,
    fs.readFileSync(missionPath, "utf8")
      .replace(/\[待填写\]/g, "已确认")
      .replace(/\[待确认\]/g, "已确认")
      .replace(/\[宿主项目名\]/, "legacy-crm")
      .replace(/\[一句话描述当前交付主题\]/, "新增客户导出功能")
      .replace("greenfield", "brownfield"),
    "utf8"
  );

  // 4. Validate should pass
  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "brownfield: validate passes");

  // 5. Simulate a change request by adding a new baseline record
  const baselineDir = getLaneFilePath(dir, "default", "baseline-log");
  const crFileName = "CR-20260402-120000-add-filter.md";
  fs.writeFileSync(
    path.join(baselineDir, crFileName),
    `# CR-20260402-120000-add-filter\n\n- **Type**: change-request\n- **Status**: confirmed\n- **Summary**: 增加按日期筛选的导出过滤器\n- **Affects**: MISSION.md, tasks.yaml\n- **Confirmed At**: 2026-04-02\n`,
    "utf8"
  );

  // 6. Baseline records should now include the CR
  const records = listLaneBaselineRecords(dir, "default");
  assert(records.length >= 2, "brownfield: has initial + change-request baselines");
  assert(records.some((r) => r.startsWith("CR-")), "brownfield: has a change-request record");

  // 7. Diff should still be clean for framework files
  const diffResult = run("ai-os-diff.js", [dir]);
  assert(diffResult.status === 0, "brownfield: diff exits 0");

  cleanup(dir);
}

section("real-project: lite mode full lifecycle");
{
  const dir = tmpDir();

  // 1. Install with lite mode
  const installResult = run("create-ai-os.js", [dir, "--profile", "project", "--lite"]);
  assert(installResult.status === 0, "lite-project: install succeeds");
  assert(fs.existsSync(getLaneFilePath(dir, "default", "MISSION.md")), "lite-project: MISSION created");
  assert(fs.existsSync(path.join(dir, ".agents", "workflows", "align.md")), "lite-project: align workflow present");
  assert(fs.existsSync(path.join(dir, ".agents", "skills", "project-planner", "SKILL.md")), "lite-project: project-planner present");

  // 2. Doctor should pass
  const doctorResult = run("ai-os-doctor.js", [dir]);
  assert(doctorResult.status === 0, "lite-project: doctor passes");
  assert(doctorResult.stdout.includes("lite"), "lite-project: doctor reports lite");

  // 3. Validate should pass
  const validateResult = run("ai-os-validate.js", [dir]);
  assert(validateResult.status === 0, "lite-project: validate passes");

  // 4. Status works
  const statusResult = run("ai-os-status.js", [dir]);
  assert(statusResult.status === 0, "lite-project: status works");

  // 5. Token budget reflects lite
  const tokenResult = run("ai-os-token-budget.js", [dir]);
  assert(tokenResult.status === 0, "lite-project: token-budget works");

  // 6. Upgrade preflight
  const preflightResult = run("ai-os-upgrade.js", [dir, "--preflight"]);
  assert(preflightResult.status === 0, "lite-project: upgrade preflight passes");

  // 7. Diff clean
  const diffResult = run("ai-os-diff.js", [dir]);
  assert(diffResult.status === 0, "lite-project: diff clean");
  assert(diffResult.stdout.includes("0 missing"), "lite-project: no missing files");

  cleanup(dir);
}

section("real-project: lab multi-scenario validation");
{
  const labRoot = tmpDir();
  const labResult = run("ai-os-lab.js", [labRoot, "--scenarios", "greenfield,brownfield,high-risk"]);
  assert(labResult.status === 0, "lab: runs all three scenarios");
  assert(fs.existsSync(path.join(labRoot, "lab-report.md")), "lab: report generated");

  // Validate each scenario project
  for (const scenario of ["greenfield", "brownfield", "high-risk"]) {
    const scenarioDir = path.join(labRoot, scenario);
    assert(fs.existsSync(getLaneFilePath(scenarioDir, "default", "MISSION.md")), `lab/${scenario}: MISSION exists`);
    const validateResult = run("ai-os-validate.js", [scenarioDir]);
    assert(validateResult.status === 0, `lab/${scenario}: validate passes`);
  }

  const report = fs.readFileSync(path.join(labRoot, "lab-report.md"), "utf8");
  assert(report.includes("greenfield"), "lab: report covers greenfield");
  assert(report.includes("brownfield"), "lab: report covers brownfield");
  assert(report.includes("high-risk"), "lab: report covers high-risk");

  cleanup(labRoot);
}
