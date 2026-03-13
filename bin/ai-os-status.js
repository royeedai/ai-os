#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { fail, getProjectFilePath } = require("./shared");
const {
  parseTasksFile,
  summarizeTasks,
  readStateFile,
  getCurrentTask,
} = require("./project-state");

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-status [target-dir]

Show the current AI-OS delivery position for a project.

Options:
  -h, --help  Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg.startsWith("-")) {
    fail(`unknown option: ${arg}`);
  }
  if (targetArg) {
    fail(`unexpected argument: ${arg}`);
  }
  targetArg = arg;
}

const targetDir = path.resolve(targetArg || ".");
if (!fs.existsSync(targetDir)) {
  fail(`target directory does not exist: ${targetDir}`);
}

const state = readStateFile(targetDir);
const tasks = parseTasksFile(getProjectFilePath(targetDir, "tasks.yaml"));

if (!state.exists) {
  fail(`${getProjectRelativePath("STATE.md")} not found in ${targetDir}`);
}

process.stdout.write(`\nAI-OS Status — ${targetDir}\n\n`);
process.stdout.write(`当前位置:\n`);
for (const label of ["里程碑", "当前模块", "当前阶段", "当前任务", "交付等级"]) {
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
