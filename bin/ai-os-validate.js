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
  getProjectFilePath,
  getProjectRelativePath,
  formatProjectPath,
  parseCliArgs,
  resolveTargetDir,
  createReporter,
  VALIDATION_SCHEMAS,
} = require("./shared");
const {
  readUtf8IfExists,
  splitMarkdownSections,
  parseAcceptanceFile,
  parseTasksFile,
  isDeclaredHighRisk,
} = require("./project-state");

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

function listEvalFiles(targetDir) {
  const evalsDir = getProjectFilePath(targetDir, "evals");
  if (!dirExists(targetDir, "evals")) {
    return [];
  }

  return listFilesRecursively(evalsDir)
    .map((absolutePath) => path.relative(evalsDir, absolutePath).replace(/\\/g, "/"))
    .filter((relPath) => {
      const baseName = path.basename(relPath);
      return !relPath.endsWith(".DS_Store") && baseName !== "README.md";
    })
    .map((relPath) => path.posix.join("evals", relPath))
    .sort();
}

const parsed = parseCliArgs(process.argv);
if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-validate [target-dir]

Validate the project-local delivery artifacts used by AI-OS.

Options:
  -h, --help  Show this help message
`);
  process.exit(0);
}

const targetDir = resolveTargetDir(parsed.positional);

const reporter = createReporter();
const { report } = reporter;

process.stdout.write(`\nAI-OS Validate — ${targetDir}\n\n`);

for (const relPath of PROJECT_CORE_ARTIFACT_FILES) {
  report(fileExists(targetDir, relPath), `${getProjectRelativePath(relPath)} exists`);
}

for (const relPath of PROJECT_CORE_ARTIFACT_DIRS) {
  report(dirExists(targetDir, relPath), `${getProjectRelativePath(relPath)}/ exists`);
}

const mission = readUtf8IfExists(getProjectFilePath(targetDir, "MISSION.md"));
if (mission !== null) {
  const missingSections = markdownHasSections(mission, VALIDATION_SCHEMAS.mission);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("MISSION.md")} sections complete`,
    { details: missingSections.map((section) => `missing section: ${section}`) }
  );
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

const stateContent = readUtf8IfExists(getProjectFilePath(targetDir, "STATE.md"));
if (stateContent !== null) {
  const missingSections = markdownHasSections(stateContent, VALIDATION_SCHEMAS.state);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("STATE.md")} sections complete`,
    { details: missingSections.map((section) => `missing section: ${section}`) }
  );
}

const verificationMatrixContent = readUtf8IfExists(getProjectFilePath(targetDir, "verification-matrix.yaml"));
if (verificationMatrixContent !== null) {
  const missingVerificationMarkers = missingMarkers(
    verificationMatrixContent,
    VALIDATION_SCHEMAS.verificationMatrixMarkers
  );
  report(
    missingVerificationMarkers.length === 0,
    `${getProjectRelativePath("verification-matrix.yaml")} includes impact_rules`,
    { warnOnly: true, details: missingVerificationMarkers.map((marker) => `missing marker: ${marker}`) }
  );
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

const evalFiles = listEvalFiles(targetDir);
if (evalFiles.length > 0) {
  report(true, `${getProjectRelativePath("evals")}/ includes ${evalFiles.length} file(s)`);
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
