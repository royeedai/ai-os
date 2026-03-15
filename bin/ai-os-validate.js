#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  fail,
  PROJECT_ARTIFACT_DIRS,
  PROJECT_ARTIFACT_FILES,
  listFilesRecursively,
  getProjectFilePath,
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

Validate the project-local delivery artifacts used by AI-OS.

Checks:
  - .ai-os/project-charter.md / risk-register.md / tasks.yaml / acceptance.yaml
  - .ai-os/release-plan.md / memory.md / STATE.md / verification-matrix.yaml / specs/ / evals/
  - key section completeness and cross-file references

Options:
  -h, --help  Show this help message
`);
}

function fileExists(targetDir, relPath) {
  return fs.existsSync(resolveProjectPath(targetDir, relPath));
}

function dirExists(targetDir, relPath) {
  const fullPath = resolveProjectPath(targetDir, relPath);
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

function extractAcceptanceSpecPath(content) {
  const match = content.match(/^\s*spec:\s*["']?(.+?)["']?\s*$/m);
  return match ? match[1].trim() : "";
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

const requiredFiles = PROJECT_ARTIFACT_FILES;

for (const relPath of requiredFiles) {
  report(fileExists(targetDir, relPath), `${getProjectRelativePath(relPath)} exists`);
}

for (const relPath of PROJECT_ARTIFACT_DIRS) {
  report(dirExists(targetDir, relPath), `${getProjectRelativePath(relPath)}/ exists`);
}

const projectCharter = readUtf8IfExists(getProjectFilePath(targetDir, "project-charter.md"));
if (projectCharter !== null) {
  const missingSections = markdownHasSections(projectCharter, VALIDATION_SCHEMAS.projectCharter);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("project-charter.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const riskRegister = readUtf8IfExists(getProjectFilePath(targetDir, "risk-register.md"));
if (riskRegister !== null) {
  report(
    VALIDATION_SCHEMAS.riskRegisterTablePattern.test(riskRegister),
    `${getProjectRelativePath("risk-register.md")} includes risk table`
  );
}

const tasksPath = getProjectFilePath(targetDir, "tasks.yaml");
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

const acceptanceContent = readUtf8IfExists(getProjectFilePath(targetDir, "acceptance.yaml"));
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

  const acceptanceSpec = extractAcceptanceSpecPath(acceptanceContent);
  report(Boolean(acceptanceSpec), `${getProjectRelativePath("acceptance.yaml")} references a spec`);
  if (acceptanceSpec) {
    report(
      fileExists(targetDir, acceptanceSpec),
      `acceptance spec exists: ${formatProjectPath(acceptanceSpec)}`
    );
  }
}

const taskSpecInputs = collectTaskSpecInputs(parsedTasks.tasks);
report(taskSpecInputs.length > 0, `${getProjectRelativePath("tasks.yaml")} references at least one spec input`);
for (const specPath of taskSpecInputs) {
  report(fileExists(targetDir, specPath), `task input spec exists: ${formatProjectPath(specPath)}`);
}

const releasePlan = readUtf8IfExists(getProjectFilePath(targetDir, "release-plan.md"));
if (releasePlan !== null) {
  const missingSections = markdownHasSections(releasePlan, VALIDATION_SCHEMAS.releasePlan);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("release-plan.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const verificationMatrix = readUtf8IfExists(getProjectFilePath(targetDir, "verification-matrix.yaml"));
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

const memoryContent = readUtf8IfExists(getProjectFilePath(targetDir, "memory.md"));
if (memoryContent !== null) {
  const missingSections = markdownHasSections(memoryContent, VALIDATION_SCHEMAS.memory);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("memory.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const stateContent = readUtf8IfExists(getProjectFilePath(targetDir, "STATE.md"));
if (stateContent !== null) {
  const missingSections = markdownHasSections(stateContent, VALIDATION_SCHEMAS.state);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath("STATE.md")} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

const evalFiles = listEvalFiles(targetDir);
report(evalFiles.length > 0, `${getProjectRelativePath("evals")}/ includes at least one eval case`);
for (const evalFile of evalFiles) {
  const content = readUtf8IfExists(getProjectFilePath(targetDir, evalFile)) || "";
  const hasMetadata =
    content.includes("- **ID**：") &&
    content.includes("- **场景名称**：") &&
    content.includes("- **触发语句**：") &&
    content.includes("- **项目类型**：");
  const missingSections = markdownHasSections(content, [
    "期望行为",
    "常见失败模式",
    "评分标准",
  ]);

  report(hasMetadata, `${getProjectRelativePath(evalFile)} metadata complete`);
  report(
    missingSections.length === 0,
    `${getProjectRelativePath(evalFile)} sections complete`,
    false,
    missingSections.map((section) => `missing section: ${section}`)
  );
}

process.stdout.write("\n");
if (hasFailure) {
  process.stdout.write(`Result: INVALID`);
  if (warningCount > 0) {
    process.stdout.write(` (${warningCount} warning${warningCount === 1 ? "" : "s"})`);
  }
  process.stdout.write(".\n\n");
  process.exit(1);
}

process.stdout.write(`Result: VALID`);
if (warningCount > 0) {
  process.stdout.write(` (${warningCount} warning${warningCount === 1 ? "" : "s"})`);
}
process.stdout.write(".\n\n");
