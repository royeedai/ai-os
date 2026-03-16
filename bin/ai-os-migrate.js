#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  fail,
  ensureDir,
  copyFileWithMode,
  getProjectFilePath,
  getProjectRelativePath,
  getExistingProjectFilePath,
  getProjectTemplatePath,
} = require("./shared");

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-migrate [target-dir] [--dry-run]

Migrate legacy .ai-os artifacts to the AI-OS vNext layout.

Changes:
  - project-charter.md -> MISSION.md
  - reference-code-map.md -> design-pack/parity-map.md
  - create DESIGN.md if missing
  - create migration-notes.md with manual follow-ups

Options:
  --dry-run   Preview changes without writing files
  -h, --help  Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let dryRun = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--dry-run") {
    dryRun = true;
    continue;
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

const projectRoot = getProjectFilePath(targetDir);
const legacyMissionPath = getProjectFilePath(targetDir, "project-charter.md");
const missionPath = getProjectFilePath(targetDir, "MISSION.md");
const legacyParityPath = getProjectFilePath(targetDir, "reference-code-map.md");
const parityPath = getProjectFilePath(targetDir, "design-pack/parity-map.md");
const designPath = getProjectFilePath(targetDir, "DESIGN.md");
const notesPath = getProjectFilePath(targetDir, "migration-notes.md");

if (!fs.existsSync(projectRoot)) {
  fail(`${getProjectRelativePath()} not found in ${targetDir}`);
}

const actions = [];
const followUps = [];

function queue(action) {
  actions.push(action);
}

if (fs.existsSync(legacyMissionPath) && !fs.existsSync(missionPath)) {
  queue({
    label: `${getProjectRelativePath("project-charter.md")} -> ${getProjectRelativePath("MISSION.md")}`,
    apply() {
      copyFileWithMode(legacyMissionPath, missionPath);
    },
  });
  followUps.push("补充 MISSION.md 的项目模式、质量标准、阶段计划和待确认项。");
}

if (fs.existsSync(legacyParityPath) && !fs.existsSync(parityPath)) {
  queue({
    label: `${getProjectRelativePath("reference-code-map.md")} -> ${getProjectRelativePath("design-pack/parity-map.md")}`,
    apply() {
      ensureDir(path.dirname(parityPath));
      copyFileWithMode(legacyParityPath, parityPath);
    },
  });
  followUps.push("检查 parity-map.md，把“必须保持一致”和“允许改写”的行为重新标记清楚。");
}

if (!fs.existsSync(designPath)) {
  queue({
    label: `create ${getProjectRelativePath("DESIGN.md")}`,
    apply() {
      copyFileWithMode(getProjectTemplatePath("DESIGN.md"), designPath);
    },
  });
  followUps.push("补充 DESIGN.md 的信息架构、关键页面、关键流程和设计确认记录。");
}

queue({
  label: `write ${getProjectRelativePath("migration-notes.md")}`,
  apply() {
    const lines = [
      "# AI-OS vNext Migration Notes",
      "",
      "## 自动迁移动作",
      "",
      ...actions.map((action) => `- ${action.label}`),
      "",
      "## 需要人工补齐",
      "",
      ...(followUps.length > 0 ? followUps.map((line) => `- ${line}`) : ["- 无"]),
      "",
      "## 备注",
      "",
      "- 未能可靠自动推断的内容统一留给人工确认。",
      "- 迁移后建议依次运行 `create-ai-os validate`、`create-ai-os status`、`create-ai-os resume`。",
      "",
    ];
    fs.writeFileSync(notesPath, lines.join("\n"), "utf8");
  },
});

process.stdout.write(`\nAI-OS Migrate — ${targetDir}\n\n`);
if (actions.length === 1 && followUps.length === 0) {
  process.stdout.write(`No legacy artifacts detected. Nothing to migrate.\n\n`);
  process.exit(0);
}

for (const action of actions) {
  process.stdout.write(`- ${dryRun ? "[dry-run] " : ""}${action.label}\n`);
  if (!dryRun) {
    action.apply();
  }
}

process.stdout.write(`\n`);
if (dryRun) {
  process.stdout.write("Result: DRY_RUN_COMPLETE\n\n");
} else {
  process.stdout.write("Result: MIGRATION_COMPLETE\n\n");
}
