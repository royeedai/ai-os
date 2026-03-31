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
  readStateFile,
  getCurrentTask,
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

const state = readStateFile(targetDir);
const tasks = parseTasksFile(getProjectFilePath(targetDir, "tasks.yaml"));

if (!state.exists) {
  fail(`${getProjectRelativePath("STATE.md")} not found in ${targetDir}`);
}

process.stdout.write(`\nAI-OS Status — ${targetDir}\n\n`);
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
