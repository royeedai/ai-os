#!/usr/bin/env node

const fs = require("fs");
const {
  fail,
  parseCliArgs,
  resolveTargetDir,
  resolveProjectLane,
  resolveDeliveryPath,
  formatDeliveryPath,
} = require("./shared");
const {
  parseTasksFile,
  ensureStateFile,
  getCurrentTask,
  getReadyTasks,
  collectResumeFiles,
  readMissionFile,
  readBaselineLogFile,
} = require("./project-state");

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-resume [target-dir] [--lane <lane-id>] [--markdown]

Print the minimal context pack needed to resume an AI-OS session.

Options:
  --lane <lane-id>  Read resume context from the specified delivery lane
  --markdown        Output a reusable Markdown context snapshot
  -h, --help        Show this help message
`);
}

const parsed = parseCliArgs(process.argv, {
  booleanFlags: ["--markdown"],
  valuedFlags: ["--lane"],
});
if (parsed.flags.help) {
  printHelp();
  process.exit(0);
}

const markdown = parsed.flags.markdown;
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
const mission = readMissionFile(targetDir, { artifactPathResolver: getArtifactPath });
const baselineLog = readBaselineLogFile(targetDir, { artifactPathResolver: getArtifactPath });

if (!state.exists) {
  fail(`${formatArtifactPath("STATE.md")} missing and could not be rebuilt from project artifacts in ${targetDir}`);
}

const currentTask = tasks.exists ? getCurrentTask(tasks.tasks, state) : null;
const readyTasks = tasks.exists ? getReadyTasks(tasks.tasks).slice(0, 3) : [];
const resumeFiles = collectResumeFiles(state, currentTask).filter((relPath) =>
  fs.existsSync(resolveDeliveryPath(targetDir, relPath, { laneId }))
);

function printDeliveryHeader() {
  if (laneId) {
    process.stdout.write(`Delivery model: ${laneResolution.model} (lane: ${laneId})\n\n`);
  } else if (laneResolution.isLegacyFallback) {
    process.stdout.write("Delivery model: legacy single-delivery\n\n");
  }
}

function getNextStepLines() {
  if (state.nextSteps.length > 0) {
    return state.nextSteps;
  }
  if (readyTasks.length > 0) {
    return readyTasks.map((task) => {
      const waveLabel = task.wave !== null ? ` [wave=${task.wave}]` : "";
      return `${task.id}: ${task.title || "未命名任务"}${waveLabel}`;
    });
  }
  return [`先检查 ${formatArtifactPath("tasks.yaml")}、${formatArtifactPath("DESIGN.md")} 和相关 spec / 验收工件是否需要更新`];
}

function printPlainText() {
  process.stdout.write(`\nAI-OS Resume — ${targetDir}\n\n`);
  printDeliveryHeader();
  if (ensuredState.rebuilt) {
    process.stdout.write(`已从共享工件重建 ${formatArtifactPath("STATE.md")}。\n\n`);
  }
  process.stdout.write("恢复方位:\n");
  process.stdout.write(`- 项目模式: ${state.position["项目模式"] || "未记录"}\n`);
  process.stdout.write(`- 当前阶段: ${state.position["当前阶段"] || "未记录"}\n`);
  process.stdout.write(`- 当前目标: ${state.position["当前目标"] || "未记录"}\n`);
  process.stdout.write(`- 当前任务: ${state.position["当前任务"] || "未记录"}\n`);
  if (currentTask) {
    process.stdout.write(`- 当前任务 wave: ${currentTask.wave ?? "未记录"}\n`);
    process.stdout.write(`- 执行角色: ${currentTask.execution_role || "未记录"}\n`);
    if ((currentTask.context_files || []).length > 0) {
      process.stdout.write(`- context_files: ${currentTask.context_files.map((relPath) => formatArtifactPath(relPath)).join(" / ")}\n`);
    }
  }

  process.stdout.write("\n基线概览:\n");
  process.stdout.write(`- Mission 当前基线 ID: ${mission.currentBaselineId || "未记录"}\n`);
  if (baselineLog.latestConfirmed) {
    process.stdout.write(`- 最新 confirmed 基线: ${baselineLog.latestConfirmed.id}\n`);
    process.stdout.write(`- 基线摘要: ${baselineLog.latestConfirmed.summary || "未记录"}\n`);
  } else if (baselineLog.exists) {
    process.stdout.write("- 最新 confirmed 基线: 未记录\n");
  } else {
    process.stdout.write(`- 基线日志目录: ${formatArtifactPath("baseline-log")}/ 未创建\n`);
  }

  process.stdout.write("\n优先读取文件:\n");
  for (const file of resumeFiles) {
    process.stdout.write(`- ${formatArtifactPath(file)}\n`);
  }

  process.stdout.write("\n阻塞项:\n");
  if (state.blockers.length === 0) {
    process.stdout.write("- 无\n");
  } else {
    for (const blocker of state.blockers) {
      process.stdout.write(`- ${blocker}\n`);
    }
  }

  process.stdout.write("\n建议下一步:\n");
  for (const nextStep of getNextStepLines()) {
    process.stdout.write(`- ${nextStep}\n`);
  }

  process.stdout.write("\n已锁定内容:\n");
  if (state.lockedItems.length === 0) {
    process.stdout.write("- 未记录\n");
  } else {
    for (const item of state.lockedItems) {
      process.stdout.write(`- ${item}\n`);
    }
  }

  process.stdout.write("\n待确认项:\n");
  if (state.pendingQuestions.length === 0) {
    process.stdout.write("- 无\n");
  } else {
    for (const item of state.pendingQuestions) {
      process.stdout.write(`- ${item}\n`);
    }
  }

  process.stdout.write("\n");
}

function printMarkdownSnapshot() {
  process.stdout.write("# AI-OS Context Snapshot\n\n");
  process.stdout.write("## 元数据\n\n");
  process.stdout.write(`- **项目目录**：\`${targetDir}\`\n`);
  process.stdout.write(`- **恢复入口**：\`${formatArtifactPath("STATE.md")}\`\n`);
  process.stdout.write(`- **导出方式**：\`create-ai-os resume ${targetDir} --markdown\`\n`);
  if (laneId) {
    process.stdout.write(`- **当前 lane**：\`${laneId}\`\n`);
    process.stdout.write(`- **交付模型**：\`${laneResolution.model}\`\n`);
  } else if (laneResolution.isLegacyFallback) {
    process.stdout.write("- **交付模型**：`legacy single-delivery`\n");
  }
  process.stdout.write("\n");
  if (ensuredState.rebuilt) {
    process.stdout.write("- **STATE 恢复方式**：从共享工件自动重建\n\n");
  }

  process.stdout.write("## 恢复方位\n\n");
  process.stdout.write(`- **项目模式**：${state.position["项目模式"] || "未记录"}\n`);
  process.stdout.write(`- **当前阶段**：${state.position["当前阶段"] || "未记录"}\n`);
  process.stdout.write(`- **当前目标**：${state.position["当前目标"] || "未记录"}\n`);
  process.stdout.write(`- **当前任务**：${state.position["当前任务"] || "未记录"}\n\n`);

  process.stdout.write("## 基线概览\n\n");
  process.stdout.write(`- **Mission 当前基线 ID**：${mission.currentBaselineId || "未记录"}\n`);
  if (baselineLog.latestConfirmed) {
    process.stdout.write(`- **最新 confirmed 基线**：${baselineLog.latestConfirmed.id}\n`);
    process.stdout.write(`- **基线摘要**：${baselineLog.latestConfirmed.summary || "未记录"}\n`);
    process.stdout.write(`- **影响范围**：${baselineLog.latestConfirmed.affects || "未记录"}\n`);
    process.stdout.write(`- **确认时间**：${baselineLog.latestConfirmed.confirmedAt || "未记录"}\n`);
  } else if (baselineLog.exists) {
    process.stdout.write("- **最新 confirmed 基线**：未记录\n");
  } else {
    process.stdout.write(`- **基线日志目录**：${formatArtifactPath("baseline-log")}/ 未创建\n`);
  }
  process.stdout.write("\n");

  process.stdout.write("## 进度概览\n\n");
  process.stdout.write(`${state.progressOverview || "暂无信息"}\n\n`);

  process.stdout.write("## 当前任务上下文\n\n");
  process.stdout.write(`- **wave**：${currentTask ? (currentTask.wave ?? "未记录") : "未记录"}\n`);
  process.stdout.write(`- **execution_role**：${currentTask ? (currentTask.execution_role || "未记录") : "未记录"}\n`);
  if (currentTask && (currentTask.context_files || []).length > 0) {
    process.stdout.write(`- **context_files**：${currentTask.context_files.map((relPath) => `\`${formatArtifactPath(relPath)}\``).join(" / ")}\n`);
  } else {
    process.stdout.write("- **context_files**：暂无信息\n");
  }
  process.stdout.write("\n## 优先读取文件\n\n");
  for (const file of resumeFiles) {
    process.stdout.write(`- \`${formatArtifactPath(file)}\`\n`);
  }

  process.stdout.write("\n## 最近决策\n\n");
  if (state.recentDecisions.length === 0) {
    process.stdout.write("- 无\n");
  } else {
    for (const decision of state.recentDecisions) {
      process.stdout.write(`- ${decision}\n`);
    }
  }

  process.stdout.write("\n## 阻塞项\n\n");
  if (state.blockers.length === 0) {
    process.stdout.write("- 无\n");
  } else {
    for (const blocker of state.blockers) {
      process.stdout.write(`- ${blocker}\n`);
    }
  }

  process.stdout.write("\n## 建议下一步\n\n");
  for (const nextStep of getNextStepLines()) {
    process.stdout.write(`- ${nextStep}\n`);
  }

  process.stdout.write("\n## 已锁定内容\n\n");
  if (state.lockedItems.length === 0) {
    process.stdout.write("- 未记录\n");
  } else {
    for (const item of state.lockedItems) {
      process.stdout.write(`- ${item}\n`);
    }
  }

  process.stdout.write("\n## 待确认项\n\n");
  if (state.pendingQuestions.length === 0) {
    process.stdout.write("- 无\n");
  } else {
    for (const item of state.pendingQuestions) {
      process.stdout.write(`- ${item}\n`);
    }
  }

  process.stdout.write("\n## 最近偏差 / 回退\n\n");
  if (state.deviations.length === 0) {
    process.stdout.write("- 无\n");
  } else {
    for (const item of state.deviations) {
      process.stdout.write(`- ${item}\n`);
    }
  }

  process.stdout.write("\n## 说明\n\n");
  process.stdout.write("- 这份快照可直接粘贴到新 session 作为恢复上下文\n");
  process.stdout.write(`- 真实项目状态仍以 \`${formatArtifactPath("STATE.md")}\`、\`${formatArtifactPath("MISSION.md")}\`、\`${formatArtifactPath("baseline-log")}/\`、\`${formatArtifactPath("tasks.yaml")}\` 等工件为准\n`);
}

if (markdown) {
  printMarkdownSnapshot();
} else {
  printPlainText();
}
