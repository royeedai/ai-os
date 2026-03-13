#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { fail, getProjectFilePath, getProjectRelativePath, formatProjectPath } = require("./shared");
const {
  parseTasksFile,
  readStateFile,
  getReadyTasks,
} = require("./project-state");

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-next [target-dir]

Show the next ready AI-OS tasks based on tasks.yaml and STATE.md.

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
if (!tasks.exists) {
  fail(`${getProjectRelativePath("tasks.yaml")} not found in ${targetDir}`);
}

const readyTasks = getReadyTasks(tasks.tasks);

process.stdout.write(`\nAI-OS Next — ${targetDir}\n\n`);
process.stdout.write(`当前记录的下一步:\n`);
if (state.nextSteps.length === 0) {
  process.stdout.write(`- 未记录\n`);
} else {
  for (const nextStep of state.nextSteps) {
    process.stdout.write(`- ${nextStep}\n`);
  }
}

process.stdout.write(`\n就绪任务:\n`);
if (readyTasks.length === 0) {
  process.stdout.write(`- 当前没有已就绪的 todo 任务\n\n`);
  process.exit(0);
}

for (const task of readyTasks.slice(0, 5)) {
  const riskLabel = task.risk ? ` [risk=${task.risk}]` : "";
  const waveLabel = task.wave !== null ? ` [wave=${task.wave}]` : "";
  process.stdout.write(`- ${task.id}: ${task.title || "未命名任务"}${riskLabel}${waveLabel}\n`);
  if ((task.context_files || []).length > 0) {
    process.stdout.write(`  Context: ${task.context_files.map((relPath) => formatProjectPath(relPath)).join(" / ")}\n`);
  }
  if ((task.definition_of_ready || []).length > 0) {
    process.stdout.write(`  DoR: ${task.definition_of_ready.join(" / ")}\n`);
  }
  if ((task.definition_of_done || []).length > 0) {
    process.stdout.write(`  DoD: ${task.definition_of_done.join(" / ")}\n`);
  }
}

process.stdout.write("\n");
