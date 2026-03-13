#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { fail, getProjectFilePath, getProjectRelativePath, resolveProjectPath, formatProjectPath } = require("./shared");
const {
  parseTasksFile,
  readStateFile,
  getCurrentTask,
  getReadyTasks,
  collectResumeFiles,
} = require("./project-state");

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-resume [target-dir]

Print the minimal context pack needed to resume an AI-OS session.

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

const currentTask = tasks.exists ? getCurrentTask(tasks.tasks, state) : null;
const readyTasks = tasks.exists ? getReadyTasks(tasks.tasks).slice(0, 3) : [];
const resumeFiles = collectResumeFiles(state, currentTask).filter((relPath) =>
  fs.existsSync(resolveProjectPath(targetDir, relPath))
);

process.stdout.write(`\nAI-OS Resume — ${targetDir}\n\n`);
process.stdout.write(`恢复位置:\n`);
process.stdout.write(`- 里程碑: ${state.position["里程碑"] || "未记录"}\n`);
process.stdout.write(`- 当前模块: ${state.position["当前模块"] || "未记录"}\n`);
process.stdout.write(`- 当前阶段: ${state.position["当前阶段"] || "未记录"}\n`);
process.stdout.write(`- 当前任务: ${state.position["当前任务"] || "未记录"}\n`);
if (currentTask) {
  process.stdout.write(`- 当前任务 wave: ${currentTask.wave ?? "未记录"}\n`);
  if ((currentTask.context_files || []).length > 0) {
    process.stdout.write(`- context_files: ${currentTask.context_files.map((relPath) => formatProjectPath(relPath)).join(" / ")}\n`);
  }
}

process.stdout.write(`\n优先读取文件:\n`);
for (const file of resumeFiles) {
  process.stdout.write(`- ${formatProjectPath(file)}\n`);
}

process.stdout.write(`\n阻塞项:\n`);
if (state.blockers.length === 0) {
  process.stdout.write(`- 无\n`);
} else {
  for (const blocker of state.blockers) {
    process.stdout.write(`- ${blocker}\n`);
  }
}

process.stdout.write(`\n建议下一步:\n`);
if (state.nextSteps.length > 0) {
  for (const nextStep of state.nextSteps) {
    process.stdout.write(`- ${nextStep}\n`);
  }
} else if (readyTasks.length > 0) {
  for (const task of readyTasks) {
    const waveLabel = task.wave !== null ? ` [wave=${task.wave}]` : "";
    process.stdout.write(`- ${task.id}: ${task.title || "未命名任务"}${waveLabel}\n`);
  }
} else {
  process.stdout.write(`- 先检查 ${getProjectRelativePath("tasks.yaml")} 和 ${getProjectRelativePath("acceptance.yaml")} 是否需要更新\n`);
}

process.stdout.write("\n");
