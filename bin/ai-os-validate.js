#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  fail,
  PROJECT_CORE_ARTIFACT_DIRS,
  PROJECT_CORE_ARTIFACT_FILES,
  PROJECT_OPTIONAL_ARTIFACT_DIRS,
  PROJECT_OPTIONAL_ARTIFACT_FILES,
  listFilesRecursively,
  getProjectFilePath,
  getExistingProjectFilePath,
  getProjectRelativePath,
  resolveProjectPath,
  formatProjectPath,
  SYM_OK,
  SYM_FAIL,
  SYM_WARN,
  VALIDATION_SCHEMAS,
} = require("./shared");
const {
  readUtf8IfExists,
  splitMarkdownSections,
  parseTasksFile,
} = require("./project-state");

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-validate [target-dir]

Validate the project-local delivery artifacts used by AI-OS vNext.

Checks:
  - required core artifacts: .ai-os/MISSION.md / DESIGN.md / tasks.yaml / acceptance.yaml / STATE.md / memory.md / specs/
  - optional artifacts are validated only when present: risk-register.md / release-plan.md / verification-matrix.yaml / design-pack/ / evals/
  - key section completeness and phase-gate readiness

Options:
  -h, --help  Show this help message
`);
}

function fileExists(targetDir, relPath) {
  return fs.existsSync(getExistingProjectFilePath(targetDir, relPath));
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

function extractAcceptanceGateStatus(content, gateId) {
  const lines = content.split(/\r?\n/);
  let inGate = false;

  for (const line of lines) {
    const idMatch = line.match(/^\s*- id:\s*(.+)$/);
    if (idMatch) {
      inGate = idMatch[1].trim() === gateId;
      continue;
    }
    if (!inGate) {
      continue;
    }
    const statusMatch = line.match(/^\s+status:\s*(.+)$/);
    if (statusMatch) {
      return statusMatch[1].trim();
    }
  }

  return "";
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

let hasFailure = false;
let warningCount = 0;

function report(ok, label, warnOnly = false, details = []) {
  if (ok) {
    process.stdout.write(`  ${SYM_OK}  ${label}\n`);
    return;
  }

  if (warnOnly) {
    warningCount += 1;
    process.stdout.write(`  ${SYM_WARN}  ${label}\n`);
  } else {
    hasFailure = true;
    process.stdout.write(`  ${SYM_FAIL}  ${label}\n`);
  }

  for (const detail of details) {
    process.stdout.write(`       - ${detail}\n`);
  }
}

process.stdout.write(`\nAI-OS Validate — ${targetDir}\n\n`);

for (const relPath of PROJECT_CORE_ARTIFACT_FILES) {
  report(fileExists(targetDir, relPath), `${getProjectRelativePath(relPath)} exists`);
}

for (const relPath of PROJECT_CORE_ARTIFACT_DIRS) {
  report(dirExists(targetDir, relPath), `${getProjectRelativePath(relPath)}/ exists`);
}

const mission = readUtf8IfExists(getExistingProjectFilePath(targetDir, "MISSION.md"));
if (mission !== null) {
  const missingSections = markdownHasSections(mission, VALIDATION_SCHEMAS.mission);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("MISSION.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const design = readUtf8IfExists(getExistingProjectFilePath(targetDir, "DESIGN.md"));
if (design !== null) {
  const missingSections = markdownHasSections(design, VALIDATION_SCHEMAS.design);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("DESIGN.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const riskRegister = readUtf8IfExists(getExistingProjectFilePath(targetDir, "risk-register.md"));
if (riskRegister !== null) {
  report(
    VALIDATION_SCHEMAS.riskRegisterTablePattern.test(riskRegister),
    `${getProjectRelativePath("risk-register.md")} includes risk table`
  );
}

const memory = readUtf8IfExists(getExistingProjectFilePath(targetDir, "memory.md"));
if (memory !== null) {
  const missingSections = markdownHasSections(memory, VALIDATION_SCHEMAS.memory);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("memory.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const tasksPath = getExistingProjectFilePath(targetDir, "tasks.yaml");
const tasksContent = readUtf8IfExists(tasksPath);
const parsedTasks = parseTasksFile(tasksPath);
if (tasksContent !== null) {
  const missingTaskMarkers = [];
  for (const marker of VALIDATION_SCHEMAS.tasksMarkers) {
    if (!tasksContent.includes(marker)) {
      missingTaskMarkers.push(marker);
    }
  }

  report(
    missingTaskMarkers.length === 0,
    `${getProjectRelativePath("tasks.yaml")} structure complete`,
    false,
    missingTaskMarkers.map((marker) => `missing marker: ${marker}`)
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
}

const specFiles = listSpecFiles(targetDir);
report(specFiles.length > 0, `${getProjectRelativePath("specs")}/ includes at least one .spec.md`);

for (const specFile of specFiles) {
  const content = readUtf8IfExists(getProjectFilePath(targetDir, specFile));
  const missingSections = markdownHasSections(content || "", VALIDATION_SCHEMAS.spec);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath(specFile)} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const acceptanceContent = readUtf8IfExists(getExistingProjectFilePath(targetDir, "acceptance.yaml"));
if (acceptanceContent !== null) {
  const missingMarkers = [];
  for (const marker of VALIDATION_SCHEMAS.acceptanceMarkers) {
    if (!acceptanceContent.includes(marker)) {
      missingMarkers.push(marker);
    }
  }
  report(
    missingMarkers.length === 0,
    `${getProjectRelativePath("acceptance.yaml")} structure complete`,
    false,
    missingMarkers.map((marker) => `missing marker: ${marker}`)
  );

  const designGate = extractAcceptanceGateStatus(acceptanceContent, "design-confirmation");
  const logicGate = extractAcceptanceGateStatus(acceptanceContent, "logic-confirmation");
  const implementationGate = extractAcceptanceGateStatus(acceptanceContent, "implementation-quality");
  const deliveryGate = extractAcceptanceGateStatus(acceptanceContent, "delivery-readiness");

  report(Boolean(designGate), "acceptance includes design gate status");
  report(Boolean(logicGate), "acceptance includes logic gate status");
  report(Boolean(implementationGate), "acceptance includes implementation gate status");
  report(Boolean(deliveryGate), "acceptance includes delivery gate status");
  report(
    designGate === "passed" || designGate === "approved",
    "design confirmation gate is locked before full delivery",
    true,
    designGate ? [`current design gate status: ${designGate}`] : ["missing design-confirmation status"]
  );
  report(
    logicGate === "passed" || logicGate === "approved",
    "logic confirmation gate is locked before full delivery",
    true,
    logicGate ? [`current logic gate status: ${logicGate}`] : ["missing logic-confirmation status"]
  );
}

const taskSpecInputs = collectTaskSpecInputs(parsedTasks.tasks);
report(taskSpecInputs.length > 0, `${getProjectRelativePath("tasks.yaml")} references at least one spec input`);
for (const specInput of taskSpecInputs) {
  report(
    fileExists(targetDir, specInput),
    `task spec exists: ${formatProjectPath(specInput)}`
  );
}

const verificationMatrix = readUtf8IfExists(getExistingProjectFilePath(targetDir, "verification-matrix.yaml"));
if (verificationMatrix !== null) {
  const missingMarkers = [];
  for (const marker of VALIDATION_SCHEMAS.verificationMatrixMarkers) {
    if (!verificationMatrix.includes(marker)) {
      missingMarkers.push(marker);
    }
  }
  report(
    missingMarkers.length === 0,
    `${getProjectRelativePath("verification-matrix.yaml")} structure complete`,
    false,
    missingMarkers.map((marker) => `missing marker: ${marker}`)
  );
}

const stateContent = readUtf8IfExists(getExistingProjectFilePath(targetDir, "STATE.md"));
if (stateContent !== null) {
  const missingSections = markdownHasSections(stateContent, VALIDATION_SCHEMAS.state);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("STATE.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const designPackDir = getProjectFilePath(targetDir, "design-pack");
if (fs.existsSync(designPackDir) && fs.statSync(designPackDir).isDirectory()) {
  const parityMapPath = path.join(designPackDir, "parity-map.md");
  report(
    fs.existsSync(parityMapPath),
    `${getProjectRelativePath("design-pack/parity-map.md")} exists when design-pack is present`,
    true
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
if (hasFailure) {
  process.stdout.write(`Result: INVALID${warningCount > 0 ? ` (${warningCount} warning(s))` : ""}\n\n`);
  process.exit(1);
}

process.stdout.write(`Result: VALID${warningCount > 0 ? ` WITH ${warningCount} WARNING(S)` : ""}\n\n`);
