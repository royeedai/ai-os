const fs = require("fs");
const path = require("path");
const {
  PROJECT_ARTIFACT_FILES,
  getProjectFilePath,
  getProjectRelativePath,
  cleanYamlScalar,
  parseInlineArray,
} = require("./shared");

function readUtf8IfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

function splitMarkdownSections(content) {
  const sections = new Map();
  let currentHeading = "";
  let currentLines = [];

  function flush() {
    if (currentHeading) {
      sections.set(currentHeading, currentLines.join("\n").trim());
    }
  }

  for (const line of content.split(/\r?\n/)) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      currentLines = [];
      continue;
    }
    currentLines.push(line);
  }

  flush();
  return sections;
}

function parseBulletKeyValueSection(sectionContent) {
  const result = {};
  for (const line of sectionContent.split(/\r?\n/)) {
    const match = line.match(/^- \*\*(.+?)\*\*：\s*(.*)$/);
    if (!match) {
      continue;
    }
    result[match[1].trim()] = match[2].trim();
  }
  return result;
}

function parseMarkdownBulletList(sectionContent) {
  const items = [];
  for (const line of sectionContent.split(/\r?\n/)) {
    const match = line.match(/^- (.+)$/);
    if (!match) {
      continue;
    }
    const value = match[1].trim();
    if (value && value !== "[无]") {
      items.push(value);
    }
  }
  return items;
}

function parseTasksFile(tasksPath) {
  const content = readUtf8IfExists(tasksPath);
  if (content === null) {
    return { exists: false, tasks: [] };
  }

  const tasks = [];
  const lines = content.split(/\r?\n/);
  let inTasksSection = false;
  let currentTask = null;
  let currentListKey = null;

  function flushCurrentTask() {
    if (currentTask) {
      tasks.push(currentTask);
      currentTask = null;
      currentListKey = null;
    }
  }

  for (const line of lines) {
    if (/^tasks:\s*$/.test(line)) {
      inTasksSection = true;
      continue;
    }

    if (inTasksSection && /^[A-Za-z_][A-Za-z0-9_]*:\s*/.test(line)) {
      flushCurrentTask();
      inTasksSection = false;
      continue;
    }

    if (!inTasksSection) {
      continue;
    }

    const taskStartMatch = line.match(/^\s*-\s+id:\s*(.+)$/);
    if (taskStartMatch) {
      flushCurrentTask();
      currentTask = {
        id: cleanYamlScalar(taskStartMatch[1]),
        title: "",
        status: "unknown",
        owner: "",
        risk: "",
        milestone: "",
        parent: "",
        wave: null,
        depends_on: [],
        inputs: [],
        context_files: [],
        outputs: [],
        definition_of_ready: [],
        definition_of_done: [],
        evidence_required: [],
        affected_components: [],
        verification_required: [],
        blockers: [],
        notes: "",
        restart_required: false,
        cold_start_required: false,
      };
      continue;
    }

    if (!currentTask) {
      continue;
    }

    const keyValueMatch = line.match(/^\s+([A-Za-z_]+):\s*(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const value = keyValueMatch[2];

      if (
        [
          "depends_on",
          "inputs",
          "context_files",
          "outputs",
          "definition_of_ready",
          "definition_of_done",
          "evidence_required",
          "affected_components",
          "verification_required",
          "blockers",
        ].includes(key)
      ) {
        currentListKey = key;
        currentTask[key] = value ? parseInlineArray(value) : [];
        continue;
      }

      currentListKey = null;

      if (["title", "status", "owner", "risk", "milestone", "parent", "notes"].includes(key)) {
        currentTask[key] = cleanYamlScalar(value);
      } else if (key === "wave") {
        const parsedValue = Number.parseInt(cleanYamlScalar(value), 10);
        currentTask.wave = Number.isNaN(parsedValue) ? null : parsedValue;
      } else if (["restart_required", "cold_start_required"].includes(key)) {
        currentTask[key] = cleanYamlScalar(value).toLowerCase() === "true";
      }
      continue;
    }

    const listItemMatch = line.match(/^\s*-\s+(.+)$/);
    if (currentListKey && listItemMatch) {
      currentTask[currentListKey].push(cleanYamlScalar(listItemMatch[1]));
    }
  }

  flushCurrentTask();

  return {
    exists: true,
    tasks,
  };
}

function summarizeTasks(tasks) {
  const counts = {
    todo: 0,
    inProgress: 0,
    done: 0,
    blocked: 0,
    other: 0,
  };

  for (const task of tasks) {
    const status = (task.status || "").toLowerCase();
    if (status === "todo") {
      counts.todo += 1;
    } else if (status === "in-progress" || status === "in_progress") {
      counts.inProgress += 1;
    } else if (status === "done") {
      counts.done += 1;
    } else if (status === "blocked") {
      counts.blocked += 1;
    } else {
      counts.other += 1;
    }
  }

  return counts;
}

function taskStatusCategory(task) {
  const status = (task.status || "").toLowerCase();
  if (status === "todo") {
    return "todo";
  }
  if (status === "in-progress" || status === "in_progress") {
    return "inProgress";
  }
  if (status === "done") {
    return "done";
  }
  if (status === "blocked") {
    return "blocked";
  }
  return "other";
}

function indexTasksById(tasks) {
  const index = new Map();
  for (const task of tasks) {
    index.set(task.id, task);
  }
  return index;
}

function areDependenciesDone(task, tasksById) {
  for (const dependencyId of task.depends_on || []) {
    const dependency = tasksById.get(dependencyId);
    if (!dependency || taskStatusCategory(dependency) !== "done") {
      return false;
    }
  }
  return true;
}

function hasBlockingFlags(task) {
  return (task.blockers || []).some((blocker) => blocker && blocker !== "[]");
}

function earliestReadyWave(tasks) {
  const candidateWaves = tasks
    .map((task) => task.wave)
    .filter((wave) => Number.isInteger(wave))
    .sort((a, b) => a - b);

  return candidateWaves.length > 0 ? candidateWaves[0] : null;
}

function getReadyTasks(tasks) {
  const tasksById = indexTasksById(tasks);
  const candidateTasks = tasks.filter(
    (task) =>
      taskStatusCategory(task) === "todo" &&
      areDependenciesDone(task, tasksById) &&
      !hasBlockingFlags(task)
  );

  const nextWave = earliestReadyWave(candidateTasks);
  if (nextWave === null) {
    return candidateTasks;
  }

  return candidateTasks.filter((task) => task.wave === null || task.wave === nextWave);
}

function getCurrentTask(tasks, state) {
  const currentTaskLabel = state.position["当前任务"] || "";
  if (!currentTaskLabel) {
    return null;
  }

  const currentTaskId = currentTaskLabel.split(/\s+/)[0];
  return tasks.find((task) => task.id === currentTaskId) || null;
}

function collectResumeFiles(state, currentTask) {
  const files = ["STATE.md"];

  if (currentTask) {
    for (const relPath of [...(currentTask.context_files || []), ...(currentTask.inputs || [])]) {
      if (!files.includes(relPath)) {
        files.push(relPath);
      }
    }
  }

  for (const defaultFile of ["memory.md", "acceptance.yaml", "tasks.yaml"]) {
    if (!files.includes(defaultFile)) {
      files.push(defaultFile);
    }
  }

  return files;
}

function readStateFile(targetDir) {
  const statePath = getProjectFilePath(targetDir, "STATE.md");
  const content = readUtf8IfExists(statePath);
  if (content === null) {
    return {
      exists: false,
      path: statePath,
      position: {},
      blockers: [],
      nextSteps: [],
      recentDecisions: [],
    };
  }

  const sections = splitMarkdownSections(content);
  return {
    exists: true,
    path: statePath,
    position: parseBulletKeyValueSection(sections.get("当前位置") || ""),
    blockers: parseMarkdownBulletList(sections.get("阻塞项") || ""),
    nextSteps: parseMarkdownBulletList(sections.get("下一步") || ""),
    recentDecisions: parseMarkdownBulletList(sections.get("最近决策") || ""),
    progressOverview: sections.get("进度概览") || "",
  };
}

module.exports = {
  PROJECT_ARTIFACT_FILES,
  readUtf8IfExists,
  splitMarkdownSections,
  parseMarkdownBulletList,
  parseBulletKeyValueSection,
  parseTasksFile,
  summarizeTasks,
  taskStatusCategory,
  getReadyTasks,
  getCurrentTask,
  collectResumeFiles,
  readStateFile,
  getProjectFilePath,
  getProjectRelativePath,
};
