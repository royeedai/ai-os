const fs = require("fs");
const path = require("path");
const {
  PROJECT_ARTIFACT_FILES,
  getProjectFilePath,
  getProjectRelativePath,
  cleanYamlScalar,
  parseInlineArray,
} = require("./shared");

const TASK_LIST_KEYS = [
  "depends_on",
  "inputs",
  "context_files",
  "outputs",
  "definition_of_ready",
  "definition_of_done",
  "evidence_required",
  "parity_evidence_required",
  "affected_components",
  "verification_required",
  "impact_tags",
  "derived_checks",
  "risk_triggers",
  "blockers",
  "measurable_outcome",
  "edge_cases",
  "requirement_refs",
  "acceptance_refs",
  "acceptance_criteria",
  "change_scope",
  "out_of_scope_guard",
];

const TASK_SCALAR_KEYS = [
  "title",
  "status",
  "owner",
  "risk",
  "milestone",
  "parent",
  "notes",
  "execution_role",
  "approval_required",
];

const STATE_POSITION_ALIASES = {
  项目模式: ["项目模式"],
  当前阶段: ["当前阶段", "阶段"],
  当前治理档位: ["当前治理档位", "治理档位"],
  当前目标: ["当前目标"],
  当前任务: ["当前任务"],
  当前交付档位: ["当前交付档位"],
  当前质量焦点: ["当前质量焦点"],
  当前确认停点: ["当前确认停点"],
  "当前基线 ID": ["当前基线 ID"],
  最新需求基准状态: ["最新需求基准状态"],
  最近一次用户确认: ["最近一次用户确认"],
};

const DEFAULT_STATE_MINIMAL_READ_SET = [
  "MISSION.md",
  "baseline-log",
  "DESIGN.md",
  "memory.md",
  "acceptance.yaml",
  "tasks.yaml",
];

const PHASE_SEQUENCE = ["align", "design", "plan", "build", "verify", "ship"];

function getArtifactPathResolver(options = {}) {
  return options.artifactPathResolver || getProjectFilePath;
}

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
    const match = line.match(/^- \*\*(.+?)\*\*[:：]\s*(.*)$/);
    if (!match) {
      continue;
    }
    result[match[1].trim()] = match[2].trim();
  }
  return result;
}

function normalizeMarkdownListValue(value) {
  const normalized = String(value || "").trim();
  if (
    !normalized ||
    normalized === "[无]" ||
    normalized === "无" ||
    normalized === "(无)" ||
    normalized === "（无）"
  ) {
    return "";
  }
  return normalized;
}

function parseMarkdownBulletList(sectionContent) {
  const bulletItems = [];
  const fallbackItems = [];

  for (const line of sectionContent.split(/\r?\n/)) {
    const bulletMatch = line.match(/^- (.+)$/);
    if (bulletMatch) {
      const value = normalizeMarkdownListValue(bulletMatch[1]);
      if (value) {
        bulletItems.push(value);
      }
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("|") || trimmed.startsWith(">") || /^#{1,6}\s/.test(trimmed)) {
      continue;
    }

    const value = normalizeMarkdownListValue(trimmed);
    if (value) {
      fallbackItems.push(value);
    }
  }

  return bulletItems.length > 0 ? bulletItems : fallbackItems;
}

function collectDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values || []) {
    if (!value) {
      continue;
    }
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...duplicates].sort();
}

function createEmptyTask(taskId = "") {
  return {
    id: taskId,
    title: "",
    status: "unknown",
    owner: "",
    risk: "",
    milestone: "",
    parent: "",
    wave: null,
    execution_role: "",
    approval_required: "",
    depends_on: [],
    inputs: [],
    context_files: [],
    outputs: [],
    definition_of_ready: [],
    definition_of_done: [],
    evidence_required: [],
    parity_evidence_required: [],
    affected_components: [],
    verification_required: [],
    impact_tags: [],
    derived_checks: [],
    risk_triggers: [],
    blockers: [],
    measurable_outcome: [],
    edge_cases: [],
    requirement_refs: [],
    acceptance_refs: [],
    acceptance_criteria: [],
    change_scope: [],
    out_of_scope_guard: [],
    notes: "",
    restart_required: false,
    cold_start_required: false,
  };
}

function parseTasksFile(tasksPath) {
  const content = readUtf8IfExists(tasksPath);
  if (content === null) {
    return {
      exists: false,
      mission: "",
      hasMissionField: false,
      baselineId: "",
      qualityTier: "",
      tasks: [],
      milestoneIds: [],
      duplicateMilestoneIds: [],
      duplicateTaskIds: [],
      duplicateTaskFields: [],
      duplicateTaskListItems: [],
      missingDependencyRefs: [],
    };
  }

  const tasks = [];
  const milestoneIds = [];
  const duplicateTaskFields = [];
  const duplicateTaskListItems = [];
  const lines = content.split(/\r?\n/);

  let inScope = false;
  let inMilestonesSection = false;
  let inTasksSection = false;
  let currentTask = null;
  let currentListKey = null;
  let currentTaskSeenKeys = new Set();
  let mission = "";
  let hasMissionField = false;
  let baselineId = "";
  let qualityTier = "";

  function flushCurrentTask() {
    if (!currentTask) {
      return;
    }

    for (const key of TASK_LIST_KEYS) {
      const duplicates = collectDuplicateValues(currentTask[key]);
      for (const duplicate of duplicates) {
        duplicateTaskListItems.push({
          taskId: currentTask.id || "[missing-task-id]",
          key,
          value: duplicate,
        });
      }
    }

    tasks.push(currentTask);
    currentTask = null;
    currentListKey = null;
    currentTaskSeenKeys = new Set();
  }

  for (const line of lines) {
    const missionMatch = line.match(/^mission:\s*(.+)$/);
    if (missionMatch) {
      mission = cleanYamlScalar(missionMatch[1]);
      hasMissionField = true;
      continue;
    }

    const baselineMatch = line.match(/^baseline_id:\s*(.+)$/);
    if (baselineMatch) {
      baselineId = cleanYamlScalar(baselineMatch[1]);
      continue;
    }

    const topLevelTierMatch = line.match(/^quality_tier:\s*(.+)$/);
    if (topLevelTierMatch) {
      qualityTier = cleanYamlScalar(topLevelTierMatch[1]);
      continue;
    }

    if (/^scope:\s*$/.test(line)) {
      inScope = true;
      inMilestonesSection = false;
      continue;
    }

    if (inScope) {
      const tierMatch = line.match(/^\s+quality_tier:\s*(.+)$/);
      if (tierMatch) {
        qualityTier = cleanYamlScalar(tierMatch[1]);
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*:\s*/.test(line)) {
        inScope = false;
      }
    }

    if (/^milestones:\s*$/.test(line)) {
      inMilestonesSection = true;
      inTasksSection = false;
      continue;
    }

    if (inMilestonesSection) {
      if (/^tasks:\s*$/.test(line)) {
        inMilestonesSection = false;
        inTasksSection = true;
        continue;
      }

      if (/^[A-Za-z_][A-Za-z0-9_]*:\s*/.test(line)) {
        inMilestonesSection = false;
      } else {
        const milestoneStartMatch = line.match(/^\s*-\s+id:\s*(.+)$/);
        if (milestoneStartMatch) {
          milestoneIds.push(cleanYamlScalar(milestoneStartMatch[1]));
        }
        continue;
      }
    }

    if (/^tasks:\s*$/.test(line)) {
      inTasksSection = true;
      inScope = false;
      inMilestonesSection = false;
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
      currentTask = createEmptyTask(cleanYamlScalar(taskStartMatch[1]));
      currentTaskSeenKeys = new Set(["id"]);
      continue;
    }

    if (!currentTask) {
      continue;
    }

    const keyValueMatch = line.match(/^\s+([A-Za-z_]+):\s*(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const value = keyValueMatch[2];

      if (currentTaskSeenKeys.has(key)) {
        duplicateTaskFields.push({
          taskId: currentTask.id || "[missing-task-id]",
          key,
        });
      } else {
        currentTaskSeenKeys.add(key);
      }

      if (TASK_LIST_KEYS.includes(key)) {
        currentListKey = key;
        currentTask[key] = value ? parseInlineArray(value) : [];
        continue;
      }

      currentListKey = null;

      if (TASK_SCALAR_KEYS.includes(key)) {
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

  const duplicateMilestoneIds = collectDuplicateValues(milestoneIds);
  const duplicateTaskIds = collectDuplicateValues(tasks.map((task) => task.id));
  const taskIds = new Set(tasks.map((task) => task.id).filter(Boolean));
  const missingDependencyRefs = [];

  for (const task of tasks) {
    for (const dependencyId of task.depends_on || []) {
      if (!taskIds.has(dependencyId)) {
        missingDependencyRefs.push({
          taskId: task.id || "[missing-task-id]",
          dependencyId,
        });
      }
    }
  }

  return {
    exists: true,
    mission,
    hasMissionField,
    baselineId,
    qualityTier,
    tasks,
    milestoneIds,
    duplicateMilestoneIds,
    duplicateTaskIds,
    duplicateTaskFields,
    duplicateTaskListItems,
    missingDependencyRefs,
  };
}

function parseAcceptanceFile(acceptancePath) {
  const content = readUtf8IfExists(acceptancePath);
  if (content === null) {
    return {
      exists: false,
      baselineId: "",
      qualityTier: "",
      requiredSpecialReviews: [],
      gateStatuses: {},
      gateEvidence: {},
      content: "",
    };
  }

  const lines = content.split(/\r?\n/);
  let inScope = false;
  let inRequiredSpecialReviews = false;
  let inGates = false;
  let currentGateId = "";
  let currentGateListKey = "";

  const result = {
    exists: true,
    baselineId: "",
    qualityTier: "",
    requiredSpecialReviews: [],
    gateStatuses: {},
    gateEvidence: {},
    content,
  };

  for (const line of lines) {
    const baselineMatch = line.match(/^baseline_id:\s*(.+)$/);
    if (baselineMatch) {
      result.baselineId = cleanYamlScalar(baselineMatch[1]);
      continue;
    }

    const topLevelTierMatch = line.match(/^quality_tier:\s*(.+)$/);
    if (topLevelTierMatch) {
      result.qualityTier = cleanYamlScalar(topLevelTierMatch[1]);
      continue;
    }

    if (/^scope:\s*$/.test(line)) {
      inScope = true;
      inRequiredSpecialReviews = false;
      inGates = false;
      currentGateId = "";
      currentGateListKey = "";
      continue;
    }

    const requiredMatch = line.match(/^required_special_reviews:\s*(.*)$/);
    if (requiredMatch) {
      inScope = false;
      inRequiredSpecialReviews = true;
      inGates = false;
      currentGateId = "";
      currentGateListKey = "";
      result.requiredSpecialReviews = requiredMatch[1]
        ? parseInlineArray(requiredMatch[1])
        : [];
      continue;
    }

    if (/^gates:\s*$/.test(line)) {
      inScope = false;
      inRequiredSpecialReviews = false;
      inGates = true;
      currentGateId = "";
      currentGateListKey = "";
      continue;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*:\s*/.test(line) && !/^required_special_reviews:\s*/.test(line)) {
      inScope = false;
      inRequiredSpecialReviews = false;
      if (!/^gates:\s*$/.test(line)) {
        currentGateId = "";
        currentGateListKey = "";
      }
    }

    if (inScope) {
      const tierMatch = line.match(/^\s+quality_tier:\s*(.+)$/);
      if (tierMatch) {
        result.qualityTier = cleanYamlScalar(tierMatch[1]);
      }
      continue;
    }

    if (inRequiredSpecialReviews) {
      const listItemMatch = line.match(/^\s*-\s+(.+)$/);
      if (listItemMatch) {
        result.requiredSpecialReviews.push(cleanYamlScalar(listItemMatch[1]));
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*:\s*/.test(line) || /^gates:\s*$/.test(line)) {
        inRequiredSpecialReviews = false;
      } else {
        continue;
      }
    }

    if (!inGates) {
      continue;
    }

    const gateStartMatch = line.match(/^\s*-\s+id:\s*(.+)$/);
    if (gateStartMatch) {
      currentGateId = cleanYamlScalar(gateStartMatch[1]);
      currentGateListKey = "";
      result.gateStatuses[currentGateId] = "";
      result.gateEvidence[currentGateId] = [];
      continue;
    }

    if (!currentGateId) {
      continue;
    }

    const statusMatch = line.match(/^\s+status:\s*(.+)$/);
    if (statusMatch) {
      result.gateStatuses[currentGateId] = cleanYamlScalar(statusMatch[1]);
      currentGateListKey = "";
      continue;
    }

    const evidenceMatch = line.match(/^\s+evidence:\s*(.*)$/);
    if (evidenceMatch) {
      currentGateListKey = "evidence";
      result.gateEvidence[currentGateId] = evidenceMatch[1]
        ? parseInlineArray(evidenceMatch[1])
        : [];
      continue;
    }

    const listItemMatch = line.match(/^\s*-\s+(.+)$/);
    if (currentGateListKey === "evidence" && listItemMatch) {
      result.gateEvidence[currentGateId].push(cleanYamlScalar(listItemMatch[1]));
    }
  }

  result.requiredSpecialReviews = [...new Set(result.requiredSpecialReviews.filter(Boolean))];
  return result;
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

function normalizeStateReadSetEntry(value) {
  let normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  normalized = normalized.replace(/`/g, "");
  normalized = normalized.replace(/\s+[—-]\s+.*$/, "");
  normalized = normalized.replace(/[（(][^()（）]*[）)]$/, "");
  normalized = normalized.trim();

  if (normalized.startsWith(".ai-os/")) {
    normalized = normalized.slice(".ai-os/".length);
  } else if (normalized === ".ai-os") {
    return "";
  }

  return normalized.replace(/\/$/, "");
}

function normalizeStatePosition(rawPosition) {
  const position = {};
  const deprecatedPositionKeys = [];

  for (const [canonicalKey, aliases] of Object.entries(STATE_POSITION_ALIASES)) {
    for (const alias of aliases) {
      const value = normalizeMarkdownListValue(rawPosition[alias]);
      if (!value) {
        continue;
      }
      position[canonicalKey] = value;
      if (alias !== canonicalKey) {
        deprecatedPositionKeys.push(alias);
      }
      break;
    }
  }

  return {
    position,
    deprecatedPositionKeys: [...new Set(deprecatedPositionKeys)].sort(),
  };
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

  for (const preferredFile of state.minimalReadSet || []) {
    const normalized = normalizeStateReadSetEntry(preferredFile);
    if (normalized && !files.includes(normalized)) {
      files.push(normalized);
    }
  }

  if (currentTask) {
    for (const relPath of [...(currentTask.context_files || []), ...(currentTask.inputs || [])]) {
      const normalized = normalizeStateReadSetEntry(relPath);
      if (normalized && !files.includes(normalized)) {
        files.push(normalized);
      }
    }
  }

  for (const defaultFile of DEFAULT_STATE_MINIMAL_READ_SET) {
    if (!files.includes(defaultFile)) {
      files.push(defaultFile);
    }
  }

  return files;
}

function readStateFile(targetDir, options = {}) {
  const getArtifactPath = getArtifactPathResolver(options);
  const statePath = getArtifactPath(targetDir, "STATE.md");
  const content = readUtf8IfExists(statePath);
  if (content === null) {
    return {
      exists: false,
      path: statePath,
      rawPosition: {},
      position: {},
      deprecatedPositionKeys: [],
      blockers: [],
      nextSteps: [],
      recentDecisions: [],
      lockedItems: [],
      pendingQuestions: [],
      deviations: [],
      minimalReadSet: [],
      progressOverview: "",
      content: "",
    };
  }

  const sections = splitMarkdownSections(content);
  const rawPosition = parseBulletKeyValueSection(sections.get("当前方位") || sections.get("当前位置") || "");
  const normalizedPosition = normalizeStatePosition(rawPosition);

  return {
    exists: true,
    path: statePath,
    rawPosition,
    position: normalizedPosition.position,
    deprecatedPositionKeys: normalizedPosition.deprecatedPositionKeys,
    blockers: parseMarkdownBulletList(sections.get("阻塞项") || ""),
    nextSteps: parseMarkdownBulletList(sections.get("下一步") || ""),
    recentDecisions: parseMarkdownBulletList(sections.get("最近决策") || ""),
    lockedItems: parseMarkdownBulletList(sections.get("已锁定内容") || ""),
    pendingQuestions: parseMarkdownBulletList(sections.get("待确认项") || ""),
    deviations: parseMarkdownBulletList(sections.get("最近偏差 / 回退") || ""),
    minimalReadSet: parseMarkdownBulletList(sections.get("最小阅读集") || "")
      .map((entry) => normalizeStateReadSetEntry(entry))
      .filter(Boolean),
    progressOverview: sections.get("进度概览") || "",
    content,
  };
}

function isDeclaredHighRisk(parsedAcceptance, parsedTasks) {
  return (
    (parsedAcceptance.exists && parsedAcceptance.qualityTier === "high-risk") ||
    parsedTasks.qualityTier === "high-risk"
  );
}

function readMissionFile(targetDir, options = {}) {
  const getArtifactPath = getArtifactPathResolver(options);
  const missionPath = getArtifactPath(targetDir, "MISSION.md");
  const content = readUtf8IfExists(missionPath);
  if (content === null) {
    return {
      exists: false,
      path: missionPath,
      currentBaselineId: "",
      summaryFields: {},
      decisionFields: {},
      isLegacy: false,
      content: "",
    };
  }

  const sections = splitMarkdownSections(content);
  const summarySection =
    sections.get("1. 交付基线摘要") ||
    sections.get("1. 宿主项目与当前交付定义") ||
    sections.get("1. 当前交付定义") ||
    sections.get("1. 任务定义") ||
    "";
  const summaryFields = parseBulletKeyValueSection(summarySection);
  const decisionFields = parseBulletKeyValueSection(sections.get("3. 已确认约束与关键决策") || "");

  return {
    exists: true,
    path: missionPath,
    currentBaselineId: summaryFields["当前基线 ID"] || "",
    summaryFields,
    decisionFields,
    isLegacy: sections.has("5. 阶段计划") || sections.has("6. 已知输入与待确认项"),
    content,
  };
}

function parseMarkdownTable(content) {
  const rows = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || !line.endsWith("|")) {
      continue;
    }

    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    if (cells.every((cell) => /^[-:]+$/.test(cell))) {
      continue;
    }

    rows.push(cells);
  }
  return rows;
}

function compareBaselineEntries(a, b) {
  const keyA = `${a.confirmedAt || ""}\u0000${a.id || ""}`;
  const keyB = `${b.confirmedAt || ""}\u0000${b.id || ""}`;
  return keyA.localeCompare(keyB);
}

function readBaselineRecordFile(filePath) {
  const content = readUtf8IfExists(filePath) || "";
  const fields = parseBulletKeyValueSection(content);
  return {
    id: path.basename(filePath, ".md"),
    type: fields["Type"] || "",
    status: fields["Status"] || "",
    summary: fields["Summary"] || "",
    affects: fields["Affects"] || "",
    confirmedAt: fields["Confirmed At"] || "",
    path: filePath,
    content,
  };
}

function readBaselineLogFile(targetDir, options = {}) {
  const getArtifactPath = getArtifactPathResolver(options);
  const baselineDirPath = getArtifactPath(targetDir, "baseline-log");
  if (fs.existsSync(baselineDirPath) && fs.statSync(baselineDirPath).isDirectory()) {
    const entries = fs.readdirSync(baselineDirPath)
      .filter((name) => name.endsWith(".md") && name !== ".DS_Store")
      .sort()
      .map((name) => readBaselineRecordFile(path.join(baselineDirPath, name)));
    const confirmedEntries = entries
      .filter((entry) => entry.status === "confirmed")
      .sort(compareBaselineEntries);

    return {
      exists: true,
      path: baselineDirPath,
      format: "directory",
      entries,
      latestConfirmed: confirmedEntries.length > 0 ? confirmedEntries[confirmedEntries.length - 1] : null,
      legacyHeaders: [],
      legacyContent: "",
      legacyFilePath: getArtifactPath(targetDir, "baseline-log.md"),
    };
  }

  const legacyPath = getArtifactPath(targetDir, "baseline-log.md");
  const content = readUtf8IfExists(legacyPath);
  if (content === null) {
    return {
      exists: false,
      path: baselineDirPath,
      format: "missing",
      entries: [],
      latestConfirmed: null,
      legacyHeaders: [],
      legacyContent: "",
      legacyFilePath: legacyPath,
    };
  }

  const tableRows = parseMarkdownTable(content);
  const headers = tableRows[0] || [];
  const entries = [];
  for (const row of tableRows.slice(1)) {
    if (row.length < 6) {
      continue;
    }
    entries.push({
      id: row[0],
      type: row[1],
      status: row[2],
      summary: row[3],
      affects: row[4],
      confirmedAt: row[5],
      path: legacyPath,
      content,
    });
  }

  const confirmedEntries = entries
    .filter((entry) => entry.status === "confirmed")
    .sort(compareBaselineEntries);

  return {
    exists: true,
    path: legacyPath,
    format: "legacy-file",
    entries,
    latestConfirmed: confirmedEntries.length > 0 ? confirmedEntries[confirmedEntries.length - 1] : null,
    legacyHeaders: headers,
    legacyContent: content,
    legacyFilePath: legacyPath,
  };
}

function collectMissionLockedItems(missionInfo) {
  const lockedItems = [];
  const candidateFields = [
    "已确认核心设计决策",
    "已确认核心逻辑决策",
    "必须保持的宿主项目约束",
    "已确认技术栈与关键选型",
  ];

  for (const fieldName of candidateFields) {
    const value = normalizeMarkdownListValue(missionInfo.decisionFields[fieldName]);
    if (value && value !== "无") {
      lockedItems.push(`${fieldName}：${value}`);
    }
  }

  return lockedItems;
}

function isGatePassed(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "passed" || normalized === "approved";
}

function inferCurrentPhase(parsedTasks, parsedAcceptance, missionInfo, designExists) {
  const tasks = parsedTasks.tasks || [];
  const summary = summarizeTasks(tasks);
  const gateStatuses = parsedAcceptance.gateStatuses || {};
  const deliveryReady =
    isGatePassed(gateStatuses["design-confirmation"]) &&
    isGatePassed(gateStatuses["logic-confirmation"]) &&
    isGatePassed(gateStatuses["implementation-quality"]) &&
    isGatePassed(gateStatuses["delivery-readiness"]);

  if (tasks.length > 0 && summary.done === tasks.length && deliveryReady) {
    return "ship";
  }
  if (
    isGatePassed(gateStatuses["implementation-quality"]) ||
    isGatePassed(gateStatuses["delivery-readiness"])
  ) {
    return "verify";
  }
  if (tasks.length > 0) {
    if (summary.done > 0 || summary.inProgress > 0 || summary.blocked > 0) {
      return "build";
    }
    return "plan";
  }
  if (designExists) {
    return "design";
  }
  if (missionInfo.exists) {
    return "align";
  }
  return "";
}

function buildProgressOverview(currentPhase) {
  const phaseIndex = PHASE_SEQUENCE.indexOf(currentPhase);
  return [
    "| 阶段 | 状态 | 说明 |",
    "|------|------|------|",
    ...PHASE_SEQUENCE.map((phase, index) => {
      let status = "pending";
      if (phaseIndex !== -1) {
        if (currentPhase === "ship") {
          status = "done";
        } else if (index < phaseIndex) {
          status = "done";
        } else if (index === phaseIndex) {
          status = "in_progress";
        }
      }
      return `| ${phase} | ${status} | |`;
    }),
  ].join("\n");
}

function inferConfirmationCheckpoint(currentPhase, currentTask) {
  if (currentPhase === "align") {
    return "等待用户确认需求基准";
  }
  if (currentPhase === "design") {
    return "等待用户确认设计与关键流程";
  }
  if (currentPhase === "plan") {
    return "等待用户确认任务拆解与验收标准";
  }
  if (currentPhase === "build" && currentTask && currentTask.approval_required) {
    return `等待 ${currentTask.approval_required} 后执行 ${currentTask.id}`;
  }
  if (currentPhase === "verify") {
    return "等待验证结论与交付确认";
  }
  if (currentPhase === "ship") {
    return "无";
  }
  return "未记录";
}

function inferBaselineStatus(missionInfo, baselineInfo) {
  if (!missionInfo.currentBaselineId) {
    return "draft";
  }
  if (baselineInfo.latestConfirmed && baselineInfo.latestConfirmed.id === missionInfo.currentBaselineId) {
    return "confirmed";
  }
  return "pending_confirmation";
}

function deriveNextSteps(currentPhase, currentTask, readyTasks) {
  if (currentTask && taskStatusCategory(currentTask) === "inProgress") {
    return [`${currentTask.id}: ${currentTask.title || "继续当前任务"}`];
  }
  if (readyTasks.length > 0) {
    return readyTasks.slice(0, 3).map((task) => `${task.id}: ${task.title || "未命名任务"}`);
  }
  if (currentPhase === "align") {
    return ["补齐需求边界与待确认项，等待用户确认后进入 /design"];
  }
  if (currentPhase === "design") {
    return ["锁定关键页面与关键流程，等待用户确认后进入 /plan"];
  }
  if (currentPhase === "plan") {
    return ["补齐 spec、tasks 和 acceptance 后等待用户确认"];
  }
  if (currentPhase === "verify") {
    return ["执行项目原生校验并补齐设计、逻辑、运行态证据"];
  }
  if (currentPhase === "ship") {
    return ["如需新变更，先走 /change-request"];
  }
  return ["先检查 .ai-os/tasks.yaml、.ai-os/DESIGN.md 和相关 spec / 验收工件是否需要更新"];
}

function collectTaskBlockers(tasks) {
  const blockers = [];
  for (const task of tasks || []) {
    if (taskStatusCategory(task) !== "blocked" && !hasBlockingFlags(task)) {
      continue;
    }
    if ((task.blockers || []).length > 0) {
      for (const blocker of task.blockers) {
        const normalized = normalizeMarkdownListValue(blocker);
        if (normalized) {
          blockers.push(`${task.id}: ${normalized}`);
        }
      }
      continue;
    }
    blockers.push(`${task.id}: blocked`);
  }
  return blockers;
}

function renderStateFile(data) {
  const positionOrder = [
    "项目模式",
    "当前阶段",
    "当前治理档位",
    "当前目标",
    "当前任务",
    "当前交付档位",
    "当前质量焦点",
    "当前确认停点",
    "当前基线 ID",
    "最新需求基准状态",
    "最近一次用户确认",
  ];

  const positionLines = positionOrder.map(
    (key) => `- **${key}**：${data.position[key] || "未记录"}`
  );

  const renderList = (items, emptyLabel = "[无]") =>
    (items && items.length > 0 ? items : [emptyLabel]).map((item) => `- ${item}`).join("\n");

  return `# 项目状态

> **Session-local 文件**：本文件自动从共享工件重建后即可继续本地维护，不入版本控制。
> 本文件是恢复上下文的第一入口。若被删除，\`/status\`、\`/next\`、\`/resume\` 会从 Mission / Design / Tasks / Acceptance / baseline-log 重建。

## 当前方位

${positionLines.join("\n")}

## 进度概览

${data.progressOverview}

## 已锁定内容

${renderList(data.lockedItems)}

## 待确认项

${renderList(data.pendingQuestions)}

## 最近偏差 / 回退

${renderList(data.deviations)}

## 下一步

${renderList(data.nextSteps, "[下一步]")}

## 最小阅读集

${renderList(data.minimalReadSet)}
`;
}

function buildStateFromArtifacts(targetDir, options = {}) {
  const getArtifactPath = getArtifactPathResolver(options);
  const missionInfo = readMissionFile(targetDir, options);
  const parsedTasks = parseTasksFile(getArtifactPath(targetDir, "tasks.yaml"));
  const parsedAcceptance = parseAcceptanceFile(getArtifactPath(targetDir, "acceptance.yaml"));
  const baselineInfo = readBaselineLogFile(targetDir, options);
  const designExists = fs.existsSync(getArtifactPath(targetDir, "DESIGN.md"));

  if (!missionInfo.exists && !parsedTasks.exists && !parsedAcceptance.exists && !designExists && !baselineInfo.exists) {
    return null;
  }

  const currentPhase = inferCurrentPhase(parsedTasks, parsedAcceptance, missionInfo, designExists) || "align";
  const tasks = parsedTasks.tasks || [];
  const inProgressTask = tasks.find((task) => taskStatusCategory(task) === "inProgress") || null;
  const readyTasks = getReadyTasks(tasks);
  const currentTask = inProgressTask || readyTasks[0] || null;
  const latestBaselineStatus = inferBaselineStatus(missionInfo, baselineInfo);

  const state = {
    position: {
      项目模式: missionInfo.summaryFields["项目模式"] || "未记录",
      当前阶段: currentPhase,
      当前治理档位: missionInfo.summaryFields["当前治理档位"] || "未记录",
      当前目标:
        missionInfo.summaryFields["当前交付目标"] ||
        missionInfo.summaryFields["当前交付主题"] ||
        "未记录",
      当前任务: currentTask ? `${currentTask.id} ${currentTask.title || ""}`.trim() : "未记录",
      当前交付档位: missionInfo.summaryFields["当前交付档位"] || "未记录",
      当前质量焦点:
        missionInfo.decisionFields["已确认质量优先级"] ||
        "未记录",
      当前确认停点: inferConfirmationCheckpoint(currentPhase, currentTask),
      "当前基线 ID": missionInfo.currentBaselineId || "未记录",
      最新需求基准状态: latestBaselineStatus,
      最近一次用户确认:
        (baselineInfo.latestConfirmed && baselineInfo.latestConfirmed.confirmedAt) ||
        "未记录",
    },
    progressOverview: buildProgressOverview(currentPhase),
    lockedItems: collectMissionLockedItems(missionInfo),
    pendingQuestions: [],
    deviations: ["STATE 从项目工件重建（首次 session 或团队协作切换）"],
    nextSteps: deriveNextSteps(currentPhase, currentTask, readyTasks),
    minimalReadSet: collectResumeFiles(
      { minimalReadSet: DEFAULT_STATE_MINIMAL_READ_SET },
      currentTask
    ).filter((item) => item !== "STATE.md"),
    blockers: collectTaskBlockers(tasks),
    recentDecisions:
      baselineInfo.latestConfirmed && baselineInfo.latestConfirmed.summary
        ? [`${baselineInfo.latestConfirmed.id}: ${baselineInfo.latestConfirmed.summary}`]
        : [],
  };

  return state;
}

function ensureStateFile(targetDir, options = {}) {
  const getArtifactPath = getArtifactPathResolver(options);
  const existingState = readStateFile(targetDir, options);
  if (existingState.exists) {
    return {
      state: existingState,
      rebuilt: false,
    };
  }

  const rebuiltState = buildStateFromArtifacts(targetDir, options);
  if (!rebuiltState) {
    return {
      state: existingState,
      rebuilt: false,
    };
  }

  const statePath = getArtifactPath(targetDir, "STATE.md");
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, renderStateFile(rebuiltState), "utf8");

  return {
    state: readStateFile(targetDir, options),
    rebuilt: true,
  };
}

module.exports = {
  PROJECT_ARTIFACT_FILES,
  readUtf8IfExists,
  splitMarkdownSections,
  parseMarkdownBulletList,
  parseBulletKeyValueSection,
  parseTasksFile,
  parseAcceptanceFile,
  isDeclaredHighRisk,
  summarizeTasks,
  taskStatusCategory,
  getReadyTasks,
  getCurrentTask,
  collectResumeFiles,
  readStateFile,
  ensureStateFile,
  collectDuplicateValues,
  readMissionFile,
  readBaselineLogFile,
  getProjectFilePath,
  getProjectRelativePath,
};
