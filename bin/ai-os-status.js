#!/usr/bin/env node

const {
  getProjectFilePath,
  getProjectRelativePath,
  parseCliArgs,
  resolveTargetDir,
  fail,
} = require("./shared");
const {
  parseTasksFile,
  summarizeTasks,
  ensureStateFile,
  getCurrentTask,
  readMissionFile,
  readBaselineLogFile,
} = require("./project-state");

const parsed = parseCliArgs(process.argv);
if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-status [target-dir]

Show the current AI-OS delivery position for a project.

Options:
  -h, --help  Show this help message
`);
  process.exit(0);
}

const targetDir = resolveTargetDir(parsed.positional);

const ensuredState = ensureStateFile(targetDir);
const state = ensuredState.state;
const tasks = parseTasksFile(getProjectFilePath(targetDir, "tasks.yaml"));
const mission = readMissionFile(targetDir);
const baselineLog = readBaselineLogFile(targetDir);

if (!state.exists) {
  fail(`${getProjectRelativePath("STATE.md")} missing and could not be rebuilt from project artifacts in ${targetDir}`);
}

process.stdout.write(`\nAI-OS Status — ${targetDir}\n\n`);
if (ensuredState.rebuilt) {
  process.stdout.write(`已从共享工件重建 ${getProjectRelativePath("STATE.md")}。\n\n`);
}
process.stdout.write(`当前方位:\n`);
for (const label of ["项目模式", "当前阶段", "当前目标", "当前任务", "当前交付档位", "当前质量焦点"]) {
  process.stdout.write(`- ${label}: ${state.position[label] || "未记录"}\n`);
}

if (tasks.exists) {
  const summary = summarizeTasks(tasks.tasks);
  process.stdout.write(`\n任务概览:\n`);
  process.stdout.write(`- todo: ${summary.todo}\n`);
  process.stdout.write(`- in-progress: ${summary.inProgress}\n`);
  process.stdout.write(`- done: ${summary.done}\n`);
  process.stdout.write(`- blocked: ${summary.blocked}\n`);

  const currentTask = getCurrentTask(tasks.tasks, state);
  if (currentTask) {
    process.stdout.write(`\n当前任务详情:\n`);
    process.stdout.write(`- ${currentTask.id}: ${currentTask.title || "未命名任务"}\n`);
    process.stdout.write(`- risk: ${currentTask.risk || "unknown"}\n`);
    process.stdout.write(`- milestone: ${currentTask.milestone || "未记录"}\n`);
    process.stdout.write(`- wave: ${currentTask.wave ?? "未记录"}\n`);
    process.stdout.write(`- role: ${currentTask.execution_role || "未记录"}\n`);
    process.stdout.write(`- approval: ${currentTask.approval_required || "未记录"}\n`);
  }
}

process.stdout.write(`\n基线概览:\n`);
process.stdout.write(`- Mission 当前基线 ID: ${mission.currentBaselineId || "未记录"}\n`);
if (baselineLog.latestConfirmed) {
  process.stdout.write(`- 最新 confirmed 基线: ${baselineLog.latestConfirmed.id}\n`);
  process.stdout.write(`- 基线摘要: ${baselineLog.latestConfirmed.summary || "未记录"}\n`);
  process.stdout.write(`- 影响范围: ${baselineLog.latestConfirmed.affects || "未记录"}\n`);
  process.stdout.write(`- 确认时间: ${baselineLog.latestConfirmed.confirmedAt || "未记录"}\n`);
} else if (baselineLog.exists) {
  process.stdout.write(`- 最新 confirmed 基线: 未记录\n`);
} else {
  process.stdout.write(`- 基线日志目录: ${getProjectRelativePath("baseline-log")}/ 未创建\n`);
}

process.stdout.write(`\n已锁定内容:\n`);
if (state.lockedItems.length === 0) {
  process.stdout.write(`- 未记录\n`);
} else {
  for (const item of state.lockedItems) {
    process.stdout.write(`- ${item}\n`);
  }
}

process.stdout.write(`\n待确认项:\n`);
if (state.pendingQuestions.length === 0) {
  process.stdout.write(`- 无\n`);
} else {
  for (const item of state.pendingQuestions) {
    process.stdout.write(`- ${item}\n`);
  }
}

process.stdout.write(`\n最近偏差 / 回退:\n`);
if (state.deviations.length === 0) {
  process.stdout.write(`- 无\n`);
} else {
  for (const item of state.deviations) {
    process.stdout.write(`- ${item}\n`);
  }
}

process.stdout.write(`\n阻塞项:\n`);
if (state.blockers.length === 0) {
  process.stdout.write(`- 无\n`);
} else {
  for (const blocker of state.blockers) {
    process.stdout.write(`- ${blocker}\n`);
  }
}

process.stdout.write(`\n下一步:\n`);
if (state.nextSteps.length === 0) {
  process.stdout.write(`- 未记录\n`);
} else {
  for (const nextStep of state.nextSteps) {
    process.stdout.write(`- ${nextStep}\n`);
  }
}

process.stdout.write("\n");
