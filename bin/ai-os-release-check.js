#!/usr/bin/env node

const {
  fail,
  HIGH_RISK_SPECIAL_REVIEWS,
  getProjectFilePath,
  getProjectRelativePath,
  readInstalledMeta,
  parseCliArgs,
  resolveTargetDir,
  resolveProjectLane,
  setDeliveryLaneContext,
  buildLaneScopeNote,
  createReporter,
  VALIDATION_SCHEMAS,
  countTopLevelYamlListEntries,
  listProjectEvalFiles,
  validateFailureModeGuards,
} = require("./shared");
const {
  readUtf8IfExists,
  splitMarkdownSections,
  parseAcceptanceFile,
  parseTasksFile,
  isDeclaredHighRisk,
} = require("./project-state");

const parsed = parseCliArgs(process.argv, { valuedFlags: ["--lane"] });
if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-release-check [target-dir] [--lane <lane-id>]

Run delivery readiness checks against release-plan.md and related artifacts.

Options:
  --lane <lane-id>  Check release readiness for the specified delivery lane
  -h, --help        Show this help message
`);
  process.exit(0);
}

const targetDir = resolveTargetDir(parsed.positional);
const commandTarget = parsed.positional || ".";
const laneResolution = resolveProjectLane(targetDir, {
  laneId: parsed.flags.lane,
  commandPrefix: `ai-os-release-check ${commandTarget}`,
});
if (!laneResolution.ok && laneResolution.code !== "no-delivery-model") {
  fail(laneResolution.message);
}
if (laneResolution.ok) {
  setDeliveryLaneContext(laneResolution.laneId);
}

const releasePlanPath = getProjectFilePath(targetDir, "release-plan.md");
const releasePlan = readUtf8IfExists(releasePlanPath);

if (releasePlan === null) {
  fail(`${getProjectRelativePath("release-plan.md")} not found in ${targetDir}`);
}

const sections = splitMarkdownSections(releasePlan);
const requiredSections = VALIDATION_SCHEMAS.releasePlan;

const reporter = createReporter();
const { report } = reporter;

function hasConcreteChecklistItems(sectionContent) {
  return sectionContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some(
      (line) =>
        /^- /.test(line) &&
        !/^-\s*\[(?:检查项|触发条件)?\]\s*$/.test(line) &&
        !/^-\s*\*\*[^\]]*\*\*：\s*$/.test(line)
    );
}

function hasConcreteNumberedSteps(sectionContent) {
  return sectionContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => /^\d+\.\s+/.test(line) && !/\[步骤\]/.test(line));
}

function sectionIncludesAll(sectionContent, markers) {
  return markers.every((marker) => sectionContent.includes(marker));
}

function versionAtLeast(currentVersion, minimumVersion) {
  const current = String(currentVersion || "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const minimum = String(minimumVersion || "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(current.length, minimum.length);

  for (let index = 0; index < length; index += 1) {
    const left = current[index] || 0;
    const right = minimum[index] || 0;
    if (left > right) return true;
    if (left < right) return false;
  }

  return true;
}

process.stdout.write(`\nAI-OS Release Check — ${targetDir}\n\n`);
if (laneResolution.ok && laneResolution.laneId) {
  process.stdout.write(`Delivery model: ${laneResolution.model} (lane: ${laneResolution.laneId})\n\n`);
  const laneScopeNote = buildLaneScopeNote(laneResolution, {
    commandPrefix: `ai-os-release-check ${commandTarget}`,
  });
  if (laneScopeNote) {
    process.stdout.write(`${laneScopeNote}\n\n`);
  }
} else if (laneResolution.ok && laneResolution.isLegacyFallback) {
  process.stdout.write("Delivery model: legacy single-delivery\n\n");
}

const installedMeta = readInstalledMeta(targetDir);
const enforceEnhancedDeliveryMarkers =
  !installedMeta.exists || versionAtLeast(installedMeta.version, "5.1.1");
const enforceFailureModeGuards =
  !installedMeta.exists || versionAtLeast(installedMeta.version, "6.2.2");

const missingSections = requiredSections.filter((section) => !sections.has(section));
report(
  missingSections.length === 0,
  `${getProjectRelativePath("release-plan.md")} sections complete`,
  { details: missingSections.map((section) => `missing section: ${section}`) }
);

const preflightSection = sections.get("1. 交付前检查") || "";
report(
  hasConcreteChecklistItems(preflightSection),
  "Delivery preflight checklist is specific"
);

const dependencySection = sections.get("2. 变更范围与依赖") || "";
report(
  hasConcreteChecklistItems(dependencySection),
  "Change scope and dependency notes are specific"
);

const releaseStepsSection = sections.get("3. 发布步骤") || "";
report(
  hasConcreteNumberedSteps(releaseStepsSection),
  "Delivery steps are specific"
);

const smokeCheckSection = sections.get("4. 运行态验证") || "";
report(
  hasConcreteChecklistItems(smokeCheckSection),
  "Runtime verification list is specific"
);

const rollbackSection = sections.get("5. 回滚触发条件") || "";
report(
  hasConcreteChecklistItems(rollbackSection),
  "Rollback triggers are specific"
);

const handoffSection = sections.get("6. 交付说明与移交") || "";
report(
  hasConcreteChecklistItems(handoffSection),
  "Delivery handoff notes are specific"
);

if (enforceEnhancedDeliveryMarkers) {
  report(
    sectionIncludesAll(`${releaseStepsSection}\n${handoffSection}`, ["AI 已完成", "需人工执行"]),
    "Release plan explicitly separates AI-completed and manual actions"
  );
  report(
    sectionIncludesAll(`${preflightSection}\n${smokeCheckSection}`, ["静态校验"]),
    "Release plan records static validation evidence"
  );
}

const acceptancePath = getProjectFilePath(targetDir, "acceptance.yaml");
const acceptance = parseAcceptanceFile(acceptancePath);
const acceptanceContent = acceptance.exists ? acceptance.content : null;
report(
  acceptanceContent !== null,
  `${getProjectRelativePath("acceptance.yaml")} exists`
);
if (acceptanceContent !== null) {
  const decision = acceptance.gateStatuses["delivery-readiness"] || "";
  report(
    decision === "passed" || decision === "approved",
    "Delivery readiness gate is passed",
    { details: decision
      ? [`current delivery-readiness status: ${decision}`]
      : ["missing delivery-readiness gate status"] }
  );
  if (enforceEnhancedDeliveryMarkers) {
    report(
      (acceptance.gateEvidence["implementation-quality"] || []).includes("static-validation-check"),
      "Acceptance tracks static-validation-check evidence"
    );
    report(
      (acceptance.gateEvidence["delivery-readiness"] || []).includes("manual-action-note"),
      "Acceptance tracks manual-action-note evidence"
    );
  }
}

const tasksPath = getProjectFilePath(targetDir, "tasks.yaml");
const parsedTasks = parseTasksFile(tasksPath);
report(
  parsedTasks.exists,
  `${getProjectRelativePath("tasks.yaml")} exists`
);
if (parsedTasks.exists) {
  const unfinishedTasks = parsedTasks.tasks.filter((task) => task.status !== "done");
  report(
    unfinishedTasks.length === 0,
    "All tracked tasks are done",
    { details: unfinishedTasks.map((task) => `${task.id}: ${task.status || "unknown"}`) }
  );
  const declaredHighRisk = isDeclaredHighRisk(acceptance, parsedTasks);
  const highRiskCandidateTasks = parsedTasks.tasks.filter(
    (task) => task.risk === "high" || (task.risk_triggers || []).length > 0
  );
  const highRiskWithoutApproval = highRiskCandidateTasks.filter((task) => !task.approval_required);
  report(
    highRiskWithoutApproval.length === 0,
    "High-risk tasks declare approval requirements",
    { details: highRiskWithoutApproval.map((task) => `${task.id}: missing approval_required`) }
  );

  if (declaredHighRisk) {
    const riskRegister = readUtf8IfExists(getProjectFilePath(targetDir, "risk-register.md"));
    const verificationMatrix = readUtf8IfExists(getProjectFilePath(targetDir, "verification-matrix.yaml"));

    report(
      riskRegister !== null,
      `${getProjectRelativePath("risk-register.md")} exists for high-risk delivery`
    );
    report(
      verificationMatrix !== null,
      `${getProjectRelativePath("verification-matrix.yaml")} exists for high-risk delivery`
    );
    if (verificationMatrix !== null && enforceFailureModeGuards) {
      const failureModeGuardCount = countTopLevelYamlListEntries(verificationMatrix, "failure_modes");
      const hasFailureModeSection = verificationMatrix.includes("failure_modes:");
      report(
        hasFailureModeSection && failureModeGuardCount > 0,
        `${getProjectRelativePath("verification-matrix.yaml")} records concrete failure_modes guards for high-risk delivery`,
        {
          details: hasFailureModeSection
            ? ["failure_modes exists but has no concrete entries"]
            : ["missing marker: failure_modes:"],
        }
      );
      if (hasFailureModeSection && failureModeGuardCount > 0 && acceptance.exists) {
        const knownEvidenceNames = [...new Set(Object.values(acceptance.gateEvidence || {}).flat().filter(Boolean))];
        const failureModeGuardValidation = validateFailureModeGuards(verificationMatrix, {
          knownEvidenceNames,
          existingEvalFiles: listProjectEvalFiles(targetDir),
        });
        report(
          failureModeGuardValidation.issues.length === 0,
          `${getProjectRelativePath("verification-matrix.yaml")} failure_modes guards reference acceptance evidence or existing evals for high-risk delivery`,
          { details: failureModeGuardValidation.issues }
        );
      }
    }
    if (acceptance.exists) {
      report(
        acceptance.requiredSpecialReviews.length > 0,
        "High-risk acceptance declares required_special_reviews",
        { details: ["expected security-guard, authorization-boundary-check, concurrency-safety-check"] }
      );
      for (const reviewName of HIGH_RISK_SPECIAL_REVIEWS) {
        report(
          acceptance.requiredSpecialReviews.includes(reviewName),
          `High-risk acceptance includes ${reviewName}`
        );
      }
      report(
        (acceptance.gateEvidence["implementation-quality"] || []).includes("contract-baseline-check"),
        "High-risk acceptance tracks contract-baseline-check evidence"
      );
      report(
        (acceptance.gateEvidence["delivery-readiness"] || []).includes("degraded-path-check"),
        "High-risk acceptance tracks degraded-path-check evidence"
      );
    }
    report(
      sectionIncludesAll(smokeCheckSection, [
        "authorization-boundary-check",
        "concurrency-safety-check",
        "degraded-path-check",
      ]),
      "High-risk runtime verification includes authorization, concurrency, and degraded-path checks"
    );
    report(
      highRiskCandidateTasks.length > 0,
      "High-risk delivery has task-level risk triggers",
      { details: ["add risk_triggers to affected tasks so approval can be scoped correctly"] }
    );
  }
}

process.stdout.write("\n");
if (reporter.hasFailure) {
  process.stdout.write("Result: NOT_READY\n\n");
  process.exit(1);
}

process.stdout.write("Result: READY_FOR_MANUAL_DELIVERY_REVIEW\n\n");
