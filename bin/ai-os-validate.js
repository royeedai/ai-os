#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  HIGH_RISK_SPECIAL_REVIEWS,
  PROJECT_CORE_ARTIFACT_DIRS,
  PROJECT_CORE_ARTIFACT_FILES,
  PROJECT_OPTIONAL_ARTIFACT_DIRS,
  PROJECT_OPTIONAL_ARTIFACT_FILES,
  QUALITY_TIERS,
  listFilesRecursively,
  listProjectEvalFiles,
  getProjectFilePath,
  getProjectRelativePath,
  formatProjectPath,
  parseCliArgs,
  resolveTargetDir,
  resolveProjectLane,
  fail,
  setDeliveryLaneContext,
  createReporter,
  VALIDATION_SCHEMAS,
  countTopLevelYamlListEntries,
  validateFailureModeGuards,
} = require("./shared");
const {
  readUtf8IfExists,
  splitMarkdownSections,
  parseAcceptanceFile,
  parseTasksFile,
  collectDuplicateValues,
  isDeclaredHighRisk,
  readStateFile,
  readMissionFile,
  readBaselineLogFile,
} = require("./project-state");

const BASELINE_LOG_TYPES = new Set(["align", "change-request", "baseline-promotion"]);
const BASELINE_LOG_STATUSES = new Set(["pending_confirmation", "confirmed", "superseded"]);
const BASELINE_RECORD_ID_PATTERN = /^(BL|CR)-[A-Za-z0-9._-]+$/;
const PREFERRED_BASELINE_RECORD_ID_PATTERN = /^(BL|CR)-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TASK_COLLAB_ID_PATTERN = /^TASK-[A-Z0-9]+-\d{3}$/;
const MEMORY_ENTRY_ID_PATTERN = /^###\s+([A-Z]{2}-\d{3})\s*:/gm;
const PROCESS_STYLE_MISSION_GOAL_PATTERNS = [
  { pattern: /先锁/i, label: "含有「先锁…」等流程指令" },
  { pattern: /进入\s*\/?(align|design|plan|build|verify|ship)/i, label: "含有「进入 <阶段名>」" },
  { pattern: /进入下一阶段/i, label: "含有「进入下一阶段」" },
  { pattern: /再进入开发/i, label: "含有「再进入开发」" },
  { pattern: /推进到\s*\/?(align|design|plan|build|verify|ship)/i, label: "含有「推进到 <阶段名>」" },
];

function fileExists(targetDir, relPath) {
  return fs.existsSync(getProjectFilePath(targetDir, relPath));
}

function dirExists(targetDir, relPath) {
  const fullPath = getProjectFilePath(targetDir, relPath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

function markdownHasSections(content, sectionNames) {
  const sections = splitMarkdownSections(content);
  const missing = [];

  for (const sectionName of sectionNames) {
    if (Array.isArray(sectionName)) {
      const hasAny = sectionName.some((candidate) => sections.has(candidate));
      if (!hasAny) {
        missing.push(sectionName.join(" / "));
      }
      continue;
    }

    if (!sections.has(sectionName)) {
      missing.push(sectionName);
    }
  }

  return missing;
}

function missingMarkers(content, markers) {
  const missing = [];
  for (const marker of markers) {
    if (!content.includes(marker)) {
      missing.push(marker);
    }
  }
  return missing;
}

function collectTaskSpecInputs(tasks) {
  const specInputs = new Set();

  for (const task of tasks) {
    for (const input of task.inputs || []) {
      if (/^specs\/.+\.spec\.md$/.test(input)) {
        specInputs.add(input);
      }
    }
  }

  return [...specInputs].sort();
}

function collectMemoryEntryIds(content) {
  const ids = [];
  for (const match of content.matchAll(MEMORY_ENTRY_ID_PATTERN)) {
    ids.push(match[1]);
  }
  return ids;
}

function listSpecFiles(targetDir) {
  const specsDir = getProjectFilePath(targetDir, "specs");
  if (!dirExists(targetDir, "specs")) {
    return [];
  }

  return listFilesRecursively(specsDir)
    .map((absolutePath) => path.relative(specsDir, absolutePath).replace(/\\/g, "/"))
    .filter((relPath) => relPath.endsWith(".spec.md"))
    .sort()
    .map((fileName) => path.posix.join("specs", fileName));
}

const parsed = parseCliArgs(process.argv, { valuedFlags: ["--lane"] });
if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-validate [target-dir] [--lane <lane-id>]

Validate the project-local delivery artifacts used by AI-OS.

Options:
  --lane <lane-id>  Validate the specified delivery lane
  -h, --help        Show this help message
`);
  process.exit(0);
}

const targetDir = resolveTargetDir(parsed.positional);
const laneResolution = resolveProjectLane(targetDir, { laneId: parsed.flags.lane });
if (!laneResolution.ok && laneResolution.code !== "no-delivery-model") {
  fail(laneResolution.message);
}
if (laneResolution.ok) {
  setDeliveryLaneContext(laneResolution.laneId);
}

const reporter = createReporter();
const { report } = reporter;

process.stdout.write(`\nAI-OS Validate — ${targetDir}\n\n`);
if (laneResolution.ok && laneResolution.laneId) {
  process.stdout.write(`Delivery model: ${laneResolution.model} (lane: ${laneResolution.laneId})\n\n`);
} else if (laneResolution.ok && laneResolution.isLegacyFallback) {
  process.stdout.write("Delivery model: legacy single-delivery\n\n");
}

const missionInfo = readMissionFile(targetDir);
const baselineInfo = readBaselineLogFile(targetDir);
const legacyMissionCompat = missionInfo.isLegacy || !missionInfo.currentBaselineId || !baselineInfo.exists;

for (const relPath of PROJECT_CORE_ARTIFACT_FILES) {
  report(fileExists(targetDir, relPath), `${getProjectRelativePath(relPath)} exists`);
}

for (const relPath of PROJECT_CORE_ARTIFACT_DIRS) {
  if (relPath === "baseline-log") {
    const baselineDirExists = dirExists(targetDir, relPath);
    report(
      baselineDirExists,
      `${getProjectRelativePath(relPath)}/ exists`,
      baselineInfo.format === "legacy-file" || missionInfo.isLegacy
        ? {
            warnOnly: true,
            details:
              baselineInfo.format === "legacy-file"
                ? [
                    `legacy file still present: ${getProjectRelativePath("baseline-log.md")}`,
                    "migrate to per-record files under .ai-os/baseline-log/",
                  ]
                : ["legacy project should migrate to per-record files under .ai-os/baseline-log/"],
          }
        : undefined
    );
    continue;
  }

  report(dirExists(targetDir, relPath), `${getProjectRelativePath(relPath)}/ exists`);
}

if (missionInfo.exists) {
  const missingThinSections = markdownHasSections(missionInfo.content, VALIDATION_SCHEMAS.mission);
  const missingLegacySections = markdownHasSections(missionInfo.content, VALIDATION_SCHEMAS.missionLegacy);
  const thinMissionReady = missingThinSections.length === 0;
  const legacyMissionReady = missingLegacySections.length === 0;

  if (thinMissionReady) {
    report(true, `${getProjectRelativePath("MISSION.md")} sections complete`);
  } else if (legacyMissionReady) {
    report(false, `${getProjectRelativePath("MISSION.md")} uses legacy hotspot-heavy structure`, {
      warnOnly: true,
      details: [
        "migrate Mission to the thin baseline charter layout",
        "move pending questions, phase status, and change log records into STATE.md / baseline-log/",
      ],
    });
  } else {
    report(
      false,
      `${getProjectRelativePath("MISSION.md")} sections complete`,
      { details: missingThinSections.map((section) => `missing section: ${section}`) }
    );
  }

  report(Boolean(missionInfo.currentBaselineId), `${getProjectRelativePath("MISSION.md")} declares 当前基线 ID`, {
    warnOnly: legacyMissionCompat,
  });

  const legacyHotspots = VALIDATION_SCHEMAS.missionLegacyHotspots.filter((marker) =>
    missionInfo.content.includes(marker)
  );
  report(
    legacyHotspots.length === 0,
    `${getProjectRelativePath("MISSION.md")} avoids dynamic coordination fields`,
    {
      warnOnly: true,
      details: legacyHotspots.map((marker) => `legacy hotspot still present: ${marker}`),
    }
  );

  const currentDeliveryGoal = missionInfo.summaryFields["当前交付目标"] || "";
  const processStyleGoalWarnings = PROCESS_STYLE_MISSION_GOAL_PATTERNS
    .filter((entry) => entry.pattern.test(currentDeliveryGoal))
    .map((entry) => `matched process-style wording: ${entry.label}`);
  report(
    processStyleGoalWarnings.length === 0,
    `${getProjectRelativePath("MISSION.md")} 当前交付目标 focuses on delivery outcome, not workflow step`,
    {
      warnOnly: true,
      details: processStyleGoalWarnings.length > 0
        ? [
            `current goal: ${currentDeliveryGoal || "[blank]"}`,
            ...processStyleGoalWarnings,
            "rewrite the goal to describe who receives what result, not which workflow comes next",
          ]
        : [],
    }
  );
}

if (baselineInfo.exists) {
  if (baselineInfo.format === "directory") {
    const expectedFields = VALIDATION_SCHEMAS.baselineRecordFields;
    report(
      baselineInfo.entries.length > 0,
      `${getProjectRelativePath("baseline-log")}/ includes at least one baseline record`
    );
    report(
      baselineInfo.entries.every((entry) => BASELINE_RECORD_ID_PATTERN.test(entry.id)),
      `${getProjectRelativePath("baseline-log")}/ uses supported record filenames`,
      {
        details: baselineInfo.entries
          .filter((entry) => !BASELINE_RECORD_ID_PATTERN.test(entry.id))
          .map((entry) => `unsupported record filename: ${path.basename(entry.path)}`),
      }
    );
    report(
      baselineInfo.entries.every((entry) => PREFERRED_BASELINE_RECORD_ID_PATTERN.test(entry.id)),
      `${getProjectRelativePath("baseline-log")}/ uses timestamp + slug record filenames`,
      {
        warnOnly: true,
        details: baselineInfo.entries
          .filter((entry) => !PREFERRED_BASELINE_RECORD_ID_PATTERN.test(entry.id))
          .map((entry) => `${path.basename(entry.path)} should migrate to BL/CR-YYYYMMDD-HHMMSS-slug.md`),
      }
    );
    report(
      baselineInfo.entries.every((entry) =>
        expectedFields.every((field) => entry.content.includes(`**${field}**`))
      ),
      `${getProjectRelativePath("baseline-log")}/ records include required fields`,
      {
        details: baselineInfo.entries.flatMap((entry) =>
          expectedFields
            .filter((field) => !entry.content.includes(`**${field}**`))
            .map((field) => `${path.basename(entry.path)} missing field: ${field}`)
        ),
      }
    );
    report(
      baselineInfo.entries.every((entry) => BASELINE_LOG_TYPES.has(entry.type)),
      `${getProjectRelativePath("baseline-log")}/ uses supported Type values`,
      {
        details: baselineInfo.entries
          .filter((entry) => !BASELINE_LOG_TYPES.has(entry.type))
          .map((entry) => `unsupported type in ${entry.id || "[missing id]"}: ${entry.type || "[blank]"}`),
      }
    );
    report(
      baselineInfo.entries.every((entry) => BASELINE_LOG_STATUSES.has(entry.status)),
      `${getProjectRelativePath("baseline-log")}/ uses supported Status values`,
      {
        details: baselineInfo.entries
          .filter((entry) => !BASELINE_LOG_STATUSES.has(entry.status))
          .map((entry) => `unsupported status in ${entry.id || "[missing id]"}: ${entry.status || "[blank]"}`),
      }
    );
    report(
      baselineInfo.entries.every((entry) => {
        if (entry.id.startsWith("CR-")) {
          return entry.type === "change-request";
        }
        if (entry.id.startsWith("BL-")) {
          return entry.type === "align" || entry.type === "baseline-promotion";
        }
        return true;
      }),
      `${getProjectRelativePath("baseline-log")}/ filenames align with record types`,
      {
        details: baselineInfo.entries
          .filter((entry) => {
            if (entry.id.startsWith("CR-")) {
              return entry.type !== "change-request";
            }
            if (entry.id.startsWith("BL-")) {
              return entry.type !== "align" && entry.type !== "baseline-promotion";
            }
            return false;
          })
          .map((entry) => `${path.basename(entry.path)} has incompatible Type: ${entry.type || "[blank]"}`),
      }
    );
  } else if (baselineInfo.format === "legacy-file") {
    report(
      false,
      `${getProjectRelativePath("baseline-log.md")} still uses legacy single-file log`,
      {
        warnOnly: true,
        details: ["migrate to per-record files under .ai-os/baseline-log/"],
      }
    );
    report(
      baselineInfo.entries.length > 0,
      `${getProjectRelativePath("baseline-log.md")} includes at least one baseline entry`
    );
    report(
      baselineInfo.entries.every((entry) => BASELINE_LOG_TYPES.has(entry.type)),
      `${getProjectRelativePath("baseline-log.md")} uses supported Type values`,
      {
        details: baselineInfo.entries
          .filter((entry) => !BASELINE_LOG_TYPES.has(entry.type))
          .map((entry) => `unsupported type in ${entry.id || "[missing id]"}: ${entry.type || "[blank]"}`),
      }
    );
    report(
      baselineInfo.entries.every((entry) => BASELINE_LOG_STATUSES.has(entry.status)),
      `${getProjectRelativePath("baseline-log.md")} uses supported Status values`,
      {
        details: baselineInfo.entries
          .filter((entry) => !BASELINE_LOG_STATUSES.has(entry.status))
          .map((entry) => `unsupported status in ${entry.id || "[missing id]"}: ${entry.status || "[blank]"}`),
      }
    );
  }
  if (missionInfo.currentBaselineId && baselineInfo.latestConfirmed) {
    report(
      baselineInfo.latestConfirmed.id === missionInfo.currentBaselineId,
      `${getProjectRelativePath(
        baselineInfo.format === "directory" ? "baseline-log" : "baseline-log.md"
      )}${baselineInfo.format === "directory" ? "/" : ""} latest confirmed entry matches Mission 当前基线 ID`,
      {
        details: [
          `Mission 当前基线 ID: ${missionInfo.currentBaselineId}`,
          `baseline-log latest confirmed: ${baselineInfo.latestConfirmed.id}`,
        ],
      }
    );
  }
}

const design = readUtf8IfExists(getProjectFilePath(targetDir, "DESIGN.md"));
if (design !== null) {
  const missingSections = markdownHasSections(design, VALIDATION_SCHEMAS.design);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("DESIGN.md")} sections complete`,
    { details: missingSections.map((section) => `missing section: ${section}`) }
  );
}

const riskRegister = readUtf8IfExists(getProjectFilePath(targetDir, "risk-register.md"));
if (riskRegister !== null) {
  report(
    VALIDATION_SCHEMAS.riskRegisterTablePattern.test(riskRegister),
    `${getProjectRelativePath("risk-register.md")} includes risk table`
  );
}

const memory = readUtf8IfExists(getProjectFilePath(targetDir, "memory.md"));
if (memory !== null) {
  const missingSections = markdownHasSections(memory, VALIDATION_SCHEMAS.memory);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("memory.md")} sections complete`,
    { details: missingSections.map((section) => `missing section: ${section}`) }
  );
  const duplicateMemoryIds = collectDuplicateValues(collectMemoryEntryIds(memory));
  report(
    duplicateMemoryIds.length === 0,
    `${getProjectRelativePath("memory.md")} uses unique decision IDs`,
    {
      details: duplicateMemoryIds.map((id) => `duplicate memory entry id: ${id}`),
    }
  );
}

const tasksPath = getProjectFilePath(targetDir, "tasks.yaml");
const tasksContent = readUtf8IfExists(tasksPath);
const parsedTasks = parseTasksFile(tasksPath);
if (tasksContent !== null) {
  const missingTaskMarkers = missingMarkers(tasksContent, VALIDATION_SCHEMAS.tasksMarkers);
  const missingTaskTransitionMarkers = missingMarkers(
    tasksContent,
    VALIDATION_SCHEMAS.tasksTransitionalMarkers
  );

  report(
    missingTaskMarkers.length === 0,
    `${getProjectRelativePath("tasks.yaml")} structure complete`,
    { details: missingTaskMarkers.map((marker) => `missing marker: ${marker}`) }
  );
  report(
    missingTaskTransitionMarkers.length === 0,
    `${getProjectRelativePath("tasks.yaml")} includes linkage/risk metadata`,
    { warnOnly: true, details: missingTaskTransitionMarkers.map((marker) => `missing marker: ${marker}`) }
  );
  report(parsedTasks.tasks.length > 0, `${getProjectRelativePath("tasks.yaml")} includes at least one task`);
  report(Boolean(parsedTasks.baselineId), `${getProjectRelativePath("tasks.yaml")} declares baseline_id`, {
    warnOnly: legacyMissionCompat,
  });
  report(
    !parsedTasks.hasMissionField,
    `${getProjectRelativePath("tasks.yaml")} omits deprecated top-level mission field`,
    {
      warnOnly: true,
      details: parsedTasks.hasMissionField
        ? [
            `deprecated mission field value: ${parsedTasks.mission || "[blank]"}`,
            "remove the top-level mission field; Mission linkage should be inferred from MISSION.md + baseline_id",
          ]
        : [],
    }
  );
  report(
    parsedTasks.duplicateMilestoneIds.length === 0,
    `${getProjectRelativePath("tasks.yaml")} uses unique milestone ids`,
    {
      details: parsedTasks.duplicateMilestoneIds.map((id) => `duplicate milestone id: ${id}`),
    }
  );
  report(
    parsedTasks.duplicateTaskIds.length === 0,
    `${getProjectRelativePath("tasks.yaml")} uses unique task ids`,
    {
      details: parsedTasks.duplicateTaskIds.map((id) => `duplicate task id: ${id}`),
    }
  );
  report(
    parsedTasks.duplicateTaskFields.length === 0,
    `${getProjectRelativePath("tasks.yaml")} avoids duplicate keys inside a task`,
    {
      details: parsedTasks.duplicateTaskFields.map(
        (entry) => `${entry.taskId} repeats field: ${entry.key}`
      ),
    }
  );
  report(
    parsedTasks.duplicateTaskListItems.length === 0,
    `${getProjectRelativePath("tasks.yaml")} avoids duplicate list items inside a task`,
    {
      warnOnly: true,
      details: parsedTasks.duplicateTaskListItems.map(
        (entry) => `${entry.taskId} repeats ${entry.key}: ${entry.value}`
      ),
    }
  );
  report(
    parsedTasks.missingDependencyRefs.length === 0,
    `${getProjectRelativePath("tasks.yaml")} dependency graph references existing tasks`,
    {
      details: parsedTasks.missingDependencyRefs.map(
        (entry) => `${entry.taskId} depends_on missing task: ${entry.dependencyId}`
      ),
    }
  );
  report(
    parsedTasks.tasks.some((task) => task.wave !== null),
    `${getProjectRelativePath("tasks.yaml")} includes wave metadata`
  );
  report(
    parsedTasks.tasks.some((task) => Boolean(task.execution_role)),
    `${getProjectRelativePath("tasks.yaml")} includes execution roles`
  );
  report(
    parsedTasks.tasks.some((task) => Boolean(task.approval_required)),
    `${getProjectRelativePath("tasks.yaml")} includes approval requirements`
  );
  report(
    parsedTasks.tasks.every((task) => Boolean(task.owner)),
    `${getProjectRelativePath("tasks.yaml")} declares owner for every task`,
    {
      warnOnly: true,
      details: parsedTasks.tasks
        .filter((task) => !task.owner)
        .map((task) => `${task.id || "[missing-task-id]"} missing owner`),
    }
  );
  report(
    parsedTasks.tasks.every((task) => TASK_COLLAB_ID_PATTERN.test(task.id || "")),
    `${getProjectRelativePath("tasks.yaml")} uses collaboration-safe task IDs`,
    {
      warnOnly: true,
      details: parsedTasks.tasks
        .filter((task) => !TASK_COLLAB_ID_PATTERN.test(task.id || ""))
        .map((task) => `${task.id || "[missing-task-id]"} should use TASK-<OWNER>-NNN`),
    }
  );
  report(
    parsedTasks.tasks.some((task) => (task.context_files || []).length > 0),
    `${getProjectRelativePath("tasks.yaml")} includes context_files`
  );
  report(
    parsedTasks.tasks.some((task) => (task.impact_tags || []).length > 0),
    `${getProjectRelativePath("tasks.yaml")} includes impact_tags`,
    { warnOnly: true }
  );
  report(
    parsedTasks.tasks.some((task) => (task.derived_checks || []).length > 0),
    `${getProjectRelativePath("tasks.yaml")} includes derived_checks`,
    { warnOnly: true }
  );
  report(
    parsedTasks.tasks.every((task) => Array.isArray(task.risk_triggers)),
    `${getProjectRelativePath("tasks.yaml")} includes risk_triggers`,
    { warnOnly: true }
  );
  report(
    parsedTasks.tasks.some((task) => (task.measurable_outcome || []).length > 0),
    `${getProjectRelativePath("tasks.yaml")} includes measurable_outcome`,
    { warnOnly: true }
  );
  report(
    parsedTasks.tasks.some((task) => (task.edge_cases || []).length > 0),
    `${getProjectRelativePath("tasks.yaml")} includes edge_cases`,
    { warnOnly: true }
  );
  if (parsedTasks.qualityTier) {
    report(
      QUALITY_TIERS.includes(parsedTasks.qualityTier),
      `${getProjectRelativePath("tasks.yaml")} quality_tier is supported`,
      { details: [`current quality_tier: ${parsedTasks.qualityTier}`] }
    );
  }
  if (missionInfo.currentBaselineId && parsedTasks.baselineId) {
    report(
      parsedTasks.baselineId === missionInfo.currentBaselineId,
      `${getProjectRelativePath("tasks.yaml")} baseline_id matches Mission 当前基线 ID`,
      {
        warnOnly: legacyMissionCompat,
        details: [
          `tasks baseline_id: ${parsedTasks.baselineId}`,
          `Mission 当前基线 ID: ${missionInfo.currentBaselineId}`,
        ],
      }
    );
  }
}

const specFiles = listSpecFiles(targetDir);
report(specFiles.length > 0, `${getProjectRelativePath("specs")}/ includes at least one .spec.md`);

for (const specFile of specFiles) {
  const content = readUtf8IfExists(getProjectFilePath(targetDir, specFile));
  const missingSections = markdownHasSections(content || "", VALIDATION_SCHEMAS.spec);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath(specFile)} sections complete`,
    { details: missingSections.map((section) => `missing section: ${section}`) }
  );
  const missingSpecMarkers = missingMarkers(content || "", VALIDATION_SCHEMAS.specMarkers);
  report(
    missingSpecMarkers.length === 0,
    `${getProjectRelativePath(specFile)} includes interaction mode / contract baseline markers`,
    { warnOnly: true, details: missingSpecMarkers.map((marker) => `missing marker: ${marker}`) }
  );
}

const acceptancePath = getProjectFilePath(targetDir, "acceptance.yaml");
const acceptanceContent = readUtf8IfExists(acceptancePath);
const parsedAcceptance = parseAcceptanceFile(acceptancePath);
if (acceptanceContent !== null) {
  const missingAcceptanceMarkers = missingMarkers(
    acceptanceContent,
    VALIDATION_SCHEMAS.acceptanceMarkers
  );
  const missingAcceptanceTransitionMarkers = missingMarkers(
    acceptanceContent,
    VALIDATION_SCHEMAS.acceptanceMarkersTransitional
  );
  report(
    missingAcceptanceMarkers.length === 0,
    `${getProjectRelativePath("acceptance.yaml")} structure complete`,
    { details: missingAcceptanceMarkers.map((marker) => `missing marker: ${marker}`) }
  );
  report(Boolean(parsedAcceptance.baselineId), `${getProjectRelativePath("acceptance.yaml")} declares baseline_id`, {
    warnOnly: legacyMissionCompat,
  });
  report(
    missingAcceptanceTransitionMarkers.length === 0,
    `${getProjectRelativePath("acceptance.yaml")} includes contract/degraded-path markers`,
    { warnOnly: true, details: missingAcceptanceTransitionMarkers.map((marker) => `missing marker: ${marker}`) }
  );

  const designGate = parsedAcceptance.gateStatuses["design-confirmation"] || "";
  const logicGate = parsedAcceptance.gateStatuses["logic-confirmation"] || "";
  const implementationGate = parsedAcceptance.gateStatuses["implementation-quality"] || "";
  const deliveryGate = parsedAcceptance.gateStatuses["delivery-readiness"] || "";

  report(Boolean(designGate), "acceptance includes design gate status");
  report(Boolean(logicGate), "acceptance includes logic gate status");
  report(Boolean(implementationGate), "acceptance includes implementation gate status");
  report(Boolean(deliveryGate), "acceptance includes delivery gate status");
  report(
    Boolean(parsedAcceptance.qualityTier),
    `${getProjectRelativePath("acceptance.yaml")} declares quality_tier`,
    { warnOnly: true }
  );
  if (parsedAcceptance.qualityTier) {
    report(
      QUALITY_TIERS.includes(parsedAcceptance.qualityTier),
      `${getProjectRelativePath("acceptance.yaml")} quality_tier is supported`,
      { details: [`current quality_tier: ${parsedAcceptance.qualityTier}`] }
    );
  }
  if (missionInfo.currentBaselineId && parsedAcceptance.baselineId) {
    report(
      parsedAcceptance.baselineId === missionInfo.currentBaselineId,
      `${getProjectRelativePath("acceptance.yaml")} baseline_id matches Mission 当前基线 ID`,
      {
        warnOnly: legacyMissionCompat,
        details: [
          `acceptance baseline_id: ${parsedAcceptance.baselineId}`,
          `Mission 当前基线 ID: ${missionInfo.currentBaselineId}`,
        ],
      }
    );
  }
  report(
    designGate === "passed" || designGate === "approved",
    "design confirmation gate is locked before full delivery",
    { warnOnly: true, details: designGate ? [`current design gate status: ${designGate}`] : ["missing design-confirmation status"] }
  );
  report(
    logicGate === "passed" || logicGate === "approved",
    "logic confirmation gate is locked before full delivery",
    { warnOnly: true, details: logicGate ? [`current logic gate status: ${logicGate}`] : ["missing logic-confirmation status"] }
  );
}

const declaredHighRisk = isDeclaredHighRisk(parsedAcceptance, parsedTasks);

if (declaredHighRisk) {
  report(
    fileExists(targetDir, "risk-register.md"),
    `${getProjectRelativePath("risk-register.md")} exists for high-risk delivery`
  );
  report(
    fileExists(targetDir, "release-plan.md"),
    `${getProjectRelativePath("release-plan.md")} exists for high-risk delivery`
  );
  report(
    fileExists(targetDir, "verification-matrix.yaml"),
    `${getProjectRelativePath("verification-matrix.yaml")} exists for high-risk delivery`
  );
  report(
    parsedAcceptance.requiredSpecialReviews.length > 0,
    "high-risk acceptance declares required_special_reviews",
    { details: ["expected security-guard, authorization-boundary-check, concurrency-safety-check"] }
  );
  for (const reviewName of HIGH_RISK_SPECIAL_REVIEWS) {
    report(
      parsedAcceptance.requiredSpecialReviews.includes(reviewName),
      `high-risk acceptance includes ${reviewName}`
    );
  }
}

const taskSpecInputs = collectTaskSpecInputs(parsedTasks.tasks);
report(taskSpecInputs.length > 0, `${getProjectRelativePath("tasks.yaml")} references at least one spec input`);
for (const specInput of taskSpecInputs) {
  report(
    fileExists(targetDir, specInput),
    `task spec exists: ${formatProjectPath(specInput)}`
  );
}

const stateInfo = readStateFile(targetDir);
const stateContent = stateInfo.content;
if (stateContent !== null) {
  const missingSections = markdownHasSections(stateContent, VALIDATION_SCHEMAS.state);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("STATE.md")} sections complete`,
    { details: missingSections.map((section) => `missing section: ${section}`) }
  );
  const missingStatePositionFields = VALIDATION_SCHEMAS.statePositionFields.filter(
    (fieldName) => !stateInfo.position[fieldName]
  );
  report(
    missingStatePositionFields.length === 0,
    `${getProjectRelativePath("STATE.md")} declares canonical current-position fields`,
    {
      warnOnly: true,
      details: missingStatePositionFields.map((fieldName) => `missing current-position field: ${fieldName}`),
    }
  );
  report(
    stateInfo.deprecatedPositionKeys.length === 0,
    `${getProjectRelativePath("STATE.md")} avoids deprecated current-position keys`,
    {
      warnOnly: true,
      details: stateInfo.deprecatedPositionKeys.map((fieldName) => `deprecated field still used: ${fieldName}`),
    }
  );
}

const conventionsContent = readUtf8IfExists(getProjectFilePath(targetDir, "CONVENTIONS.md"));
const qualityTier = parsedTasks.qualityTier || parsedAcceptance.qualityTier || "";
const isStandardOrHigher = qualityTier === "standard" || qualityTier === "high-risk" || declaredHighRisk;
if (conventionsContent === null && isStandardOrHigher) {
  report(false, `${getProjectRelativePath("CONVENTIONS.md")} exists for standard/high-risk delivery`, { warnOnly: true });
} else if (conventionsContent !== null) {
  const conventionsSections = markdownHasSections(conventionsContent, [
    ["命名约定", "Naming"],
    ["代码模式", "Code Patterns", "Patterns"],
  ]);
  report(
    conventionsSections.length === 0,
    `${getProjectRelativePath("CONVENTIONS.md")} sections complete`,
    { warnOnly: true, details: conventionsSections.map((section) => `missing section: ${section}`) }
  );
}

if (stateContent !== null && stateContent.includes("测试基线") && !stateContent.includes("当前回归数")) {
  report(false, `${getProjectRelativePath("STATE.md")} has test baseline but missing regression count`, { warnOnly: true });
}

const verificationMatrixContent = readUtf8IfExists(getProjectFilePath(targetDir, "verification-matrix.yaml"));
if (verificationMatrixContent !== null) {
  const verificationMatrixCoreMarkers = VALIDATION_SCHEMAS.verificationMatrixMarkers
    .filter((marker) => marker !== "failure_modes:");
  const missingVerificationMarkers = missingMarkers(
    verificationMatrixContent,
    verificationMatrixCoreMarkers
  );
  report(
    missingVerificationMarkers.length === 0,
    `${getProjectRelativePath("verification-matrix.yaml")} includes commands/rules/impact_rules`,
    { warnOnly: true, details: missingVerificationMarkers.map((marker) => `missing marker: ${marker}`) }
  );

  const failureModeGuardCount = countTopLevelYamlListEntries(verificationMatrixContent, "failure_modes");
  const hasFailureModeSection = verificationMatrixContent.includes("failure_modes:");
  report(
    hasFailureModeSection && failureModeGuardCount > 0,
    `${getProjectRelativePath("verification-matrix.yaml")} records concrete failure_modes guards`,
    {
      warnOnly: true,
      details: hasFailureModeSection
        ? ["failure_modes exists but has no concrete entries"]
        : ["missing marker: failure_modes:"],
    }
  );

  if (hasFailureModeSection && failureModeGuardCount > 0 && parsedAcceptance.exists) {
    const knownEvidenceNames = [...new Set(Object.values(parsedAcceptance.gateEvidence || {}).flat().filter(Boolean))];
    const failureModeGuardValidation = validateFailureModeGuards(verificationMatrixContent, {
      knownEvidenceNames,
      existingEvalFiles: listProjectEvalFiles(targetDir),
    });
    report(
      failureModeGuardValidation.issues.length === 0,
      `${getProjectRelativePath("verification-matrix.yaml")} failure_modes guards reference acceptance evidence or existing evals`,
      {
        warnOnly: true,
        details: failureModeGuardValidation.issues,
      }
    );
  }
}

const releasePlanContent = readUtf8IfExists(getProjectFilePath(targetDir, "release-plan.md"));
if (releasePlanContent !== null) {
  const missingReleasePlanMarkers = missingMarkers(
    releasePlanContent,
    VALIDATION_SCHEMAS.releasePlanMarkersTransitional
  );
  report(
    missingReleasePlanMarkers.length === 0,
    `${getProjectRelativePath("release-plan.md")} includes manual-action/static-validation markers`,
    { warnOnly: true, details: missingReleasePlanMarkers.map((marker) => `missing marker: ${marker}`) }
  );
}

const designPackDir = getProjectFilePath(targetDir, "design-pack");
if (fs.existsSync(designPackDir) && fs.statSync(designPackDir).isDirectory()) {
  const parityMapPath = path.join(designPackDir, "parity-map.md");
  report(
    fs.existsSync(parityMapPath),
    `${getProjectRelativePath("design-pack/parity-map.md")} exists when design-pack is present`,
    { warnOnly: true }
  );
}

const evalFiles = listProjectEvalFiles(targetDir);
if (evalFiles.length > 0) {
  report(true, `${getProjectRelativePath("evals")}/ includes ${evalFiles.length} file(s)`);

  for (const relPath of evalFiles) {
    if (!relPath.endsWith(".md")) {
      continue;
    }

    const evalContent = readUtf8IfExists(getProjectFilePath(targetDir, relPath)) || "";
    const missingEvalSections = markdownHasSections(evalContent, VALIDATION_SCHEMAS.eval);
    report(
      missingEvalSections.length === 0,
      `${getProjectRelativePath(relPath)} sections complete`,
      { warnOnly: true, details: missingEvalSections.map((section) => `missing section: ${section}`) }
    );
  }
}

for (const relPath of PROJECT_OPTIONAL_ARTIFACT_FILES) {
  const artifactPath = getProjectFilePath(targetDir, relPath);
  if (fs.existsSync(artifactPath)) {
    report(true, `${getProjectRelativePath(relPath)} exists`);
  }
}

for (const relPath of PROJECT_OPTIONAL_ARTIFACT_DIRS) {
  const artifactPath = getProjectFilePath(targetDir, relPath);
  if (fs.existsSync(artifactPath) && fs.statSync(artifactPath).isDirectory()) {
    report(true, `${getProjectRelativePath(relPath)}/ exists`);
  }
}

process.stdout.write("\n");
if (reporter.hasFailure) {
  process.stdout.write(`Result: INVALID${reporter.warningCount > 0 ? ` (${reporter.warningCount} warning(s))` : ""}\n\n`);
  process.exit(1);
}

process.stdout.write(`Result: VALID${reporter.warningCount > 0 ? ` WITH ${reporter.warningCount} WARNING(S)` : ""}\n\n`);
