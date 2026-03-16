#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  fail,
  getExistingProjectFilePath,
  getProjectRelativePath,
  SYM_OK,
  SYM_FAIL,
  VALIDATION_SCHEMAS,
} = require("./shared");
const { readUtf8IfExists, splitMarkdownSections, parseTasksFile } = require("./project-state");

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-release-check [target-dir]

Run delivery readiness checks against release-plan.md and related artifacts.

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

const releasePlanPath = getExistingProjectFilePath(targetDir, "release-plan.md");
const releasePlan = readUtf8IfExists(releasePlanPath);

if (releasePlan === null) {
  fail(`${getProjectRelativePath("release-plan.md")} not found in ${targetDir}`);
}

const sections = splitMarkdownSections(releasePlan);
const requiredSections = VALIDATION_SCHEMAS.releasePlan;

let hasFailure = false;

function report(ok, label, details = []) {
  if (ok) {
    process.stdout.write(`  ${SYM_OK}  ${label}\n`);
  } else {
    hasFailure = true;
    process.stdout.write(`  ${SYM_FAIL}  ${label}\n`);
  }

  for (const detail of details) {
    process.stdout.write(`       - ${detail}\n`);
  }
}

function hasConcreteChecklistItems(sectionContent) {
  return sectionContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some(
      (line) =>
        /^- /.test(line) &&
        !/^\-\s*\[(?:检查项|触发条件)?\]\s*$/.test(line) &&
        !/^\-\s*\*\*[^\]]*\*\*：\s*$/.test(line)
    );
}

function hasConcreteNumberedSteps(sectionContent) {
  return sectionContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => /^\d+\.\s+/.test(line) && !/\[步骤\]/.test(line));
}

process.stdout.write(`\nAI-OS Release Check — ${targetDir}\n\n`);

const missingSections = requiredSections.filter((section) => !sections.has(section));
report(
  missingSections.length === 0,
  `${getProjectRelativePath("release-plan.md")} sections complete`,
  missingSections.map((section) => `missing section: ${section}`)
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

const acceptancePath = getExistingProjectFilePath(targetDir, "acceptance.yaml");
const acceptanceContent = readUtf8IfExists(acceptancePath);
report(
  acceptanceContent !== null,
  `${getProjectRelativePath("acceptance.yaml")} exists`
);
if (acceptanceContent !== null) {
  const deliveryGateMatch = acceptanceContent.match(
    /- id:\s*delivery-readiness[\s\S]*?status:\s*(.+?)\s*(?:\n|$)/
  );
  const decision = deliveryGateMatch ? deliveryGateMatch[1].trim() : "";
  report(
    decision === "passed" || decision === "approved",
    "Delivery readiness gate is passed",
    decision
      ? [`current delivery-readiness status: ${decision}`]
      : ["missing delivery-readiness gate status"]
  );
}

const tasksPath = getExistingProjectFilePath(targetDir, "tasks.yaml");
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
    unfinishedTasks.map((task) => `${task.id}: ${task.status || "unknown"}`)
  );
  const highRiskWithoutApproval = parsedTasks.tasks.filter(
    (task) => task.risk === "high" && !task.approval_required
  );
  report(
    highRiskWithoutApproval.length === 0,
    "High-risk tasks declare approval requirements",
    highRiskWithoutApproval.map((task) => `${task.id}: missing approval_required`)
  );
}

process.stdout.write("\n");
if (hasFailure) {
  process.stdout.write("Result: NOT_READY\n\n");
  process.exit(1);
}

process.stdout.write("Result: READY_FOR_MANUAL_DELIVERY_REVIEW\n\n");
