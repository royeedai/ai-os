#!/usr/bin/env node

const {
  parseCliArgs,
  resolveTargetDir,
  resolveProjectLane,
  resolveDeliveryPath,
  formatDeliveryPath,
  fail,
} = require("./shared");
const {
  parseTasksFile,
  ensureStateFile,
  getReadyTasks,
} = require("./project-state");

const parsed = parseCliArgs(process.argv, { valuedFlags: ["--lane"] });
if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-next [target-dir] [--lane <lane-id>]

Show the next ready AI-OS tasks based on tasks.yaml and STATE.md.

Options:
  --lane <lane-id>  Read next tasks from the specified delivery lane
  -h, --help  Show this help message
`);
  process.exit(0);
}

const targetDir = resolveTargetDir(parsed.positional);
const laneResolution = resolveProjectLane(targetDir, { laneId: parsed.flags.lane });
if (!laneResolution.ok) {
  fail(laneResolution.message);
}

const laneId = laneResolution.laneId;
const getArtifactPath = (dir, relPath) => resolveDeliveryPath(dir, relPath, { laneId });
const formatArtifactPath = (relPath) => formatDeliveryPath(relPath, { laneId });

const ensuredState = ensureStateFile(targetDir, { artifactPathResolver: getArtifactPath });
const state = ensuredState.state;
const tasks = parseTasksFile(getArtifactPath(targetDir, "tasks.yaml"));

if (!state.exists) {
  fail(`${formatArtifactPath("STATE.md")} missing and could not be rebuilt from project artifacts in ${targetDir}`);
}
if (!tasks.exists) {
  fail(`${formatArtifactPath("tasks.yaml")} not found in ${targetDir}`);
}

const readyTasks = getReadyTasks(tasks.tasks);

process.stdout.write(`\nAI-OS Next — ${targetDir}\n\n`);
if (laneId) {
  process.stdout.write(`Delivery model: ${laneResolution.model} (lane: ${laneId})\n\n`);
} else if (laneResolution.isLegacyFallback) {
  process.stdout.write(`Delivery model: legacy single-delivery\n\n`);
}
if (ensuredState.rebuilt) {
  process.stdout.write(`已从共享工件重建 ${formatArtifactPath("STATE.md")}。\n\n`);
}
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
  const roleLabel = task.execution_role ? ` [role=${task.execution_role}]` : "";
  process.stdout.write(`- ${task.id}: ${task.title || "未命名任务"}${riskLabel}${waveLabel}${roleLabel}\n`);
  if ((task.context_files || []).length > 0) {
    process.stdout.write(`  Context: ${task.context_files.map((relPath) => formatArtifactPath(relPath)).join(" / ")}\n`);
  }
  if ((task.definition_of_ready || []).length > 0) {
    process.stdout.write(`  DoR: ${task.definition_of_ready.join(" / ")}\n`);
  }
  if ((task.definition_of_done || []).length > 0) {
    process.stdout.write(`  DoD: ${task.definition_of_done.join(" / ")}\n`);
  }
}

process.stdout.write("\n");
