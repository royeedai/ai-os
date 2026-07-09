#!/usr/bin/env node

/**
 * AI-OS doctor
 *
 * Checks artifact completeness, layout health, and constitution compliance.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const {
  PROJECT_STATE_ROOT,
  LAYOUT_MODE_DEFAULT,
  LAYOUT_VERSION,
  SESSION_LOCAL_FILES,
  readFrameworkVersion,
  readPackageJson,
  readMetadata,
  getArtifactPaths,
  fail,
  fileExists,
  isDirectory,
  parseMissionBaselineId,
} = require("./shared");

const SEMANTIC_WARNING_CODES = ["W070", "W071"];

function printHelp() {
  process.stdout.write(`create-ai-os doctor — Check artifact completeness

Usage:
  create-ai-os doctor [target-dir]

Options:
  --json            Output JSON for CI integration
  --strict          Exit non-zero on warnings (not just errors)
  -h, --help        Show this help

Exit codes:
  0  All checks passed (no errors; warnings allowed unless --strict)
  1  At least one error (missing core artifact, layout drift, constitution violation)
  2  Target is not an AI-OS project (no .ai-os/ found)
`);
}

function parseArgs(argv) {
  const opts = { target: "", json: false, strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { printHelp(); process.exit(0); }
    if (arg === "--json") { opts.json = true; continue; }
    if (arg === "--strict") { opts.strict = true; continue; }
    if (arg.startsWith("-")) fail(`unknown option: ${arg}`);
    if (opts.target) fail(`unexpected argument: ${arg}`);
    opts.target = arg;
  }
  return opts;
}

function issue(level, code, message) {
  return { level, code, message };
}

// `fileExists` is true for directories too. Semantic checks must read only
// regular files: a path of the wrong type is reported once by checkArtifact
// (E022) and silently skipped here instead of crashing with EISDIR.
function isRegularFile(absPath) {
  try {
    return fs.statSync(absPath).isFile();
  } catch {
    return false;
  }
}

function checkMetadata(meta, version) {
  const issues = [];
  if (!meta) {
    issues.push(issue("error", "E001", "Missing .ai-os/framework.toml. This does not look like an AI-OS project."));
    return issues;
  }
  if (!meta.framework_version) {
    issues.push(issue("warning", "W001", "framework.toml has no framework_version field."));
  } else {
    const installedMajor = parseInt(meta.framework_version.split(".")[0], 10);
    const currentMajor = parseInt(version.split(".")[0], 10);
    if (Number.isFinite(installedMajor) && Number.isFinite(currentMajor) && installedMajor < currentMajor) {
      issues.push(issue("warning", "W002", `Installed framework v${meta.framework_version} is older than current v${version}. Reinstall with: create-ai-os install . --force`));
    }
  }
  if (meta.schema_version && meta.schema_version !== LAYOUT_VERSION) {
    issues.push(issue("error", "E002", `schema_version is "${meta.schema_version}", expected "${LAYOUT_VERSION}". Reinstall with: create-ai-os install . --force`));
  }
  return issues;
}

function checkAgentsMd(paths) {
  const issues = [];
  if (!isRegularFile(paths.agentsMd)) {
    issues.push(issue("error", "E010", "Missing AGENTS.md at project root. This is the delivery constitution."));
    return issues;
  }
  const content = fs.readFileSync(paths.agentsMd, "utf8");
  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > 150) {
    issues.push(issue("warning", "W010", `AGENTS.md is ${lineCount} lines (target: <=150). Consider trimming.`));
  }
  const requiredSections = ["五条核心要求", "绝对禁止"];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      issues.push(issue("warning", "W011", `AGENTS.md missing expected section marker: "${section}". May be a custom or pre-v9 file.`));
    }
  }
  return issues;
}

function checkArtifact(absPath, { required, type, label, category = "extension" }) {
  const issues = [];
  if (!fileExists(absPath)) {
    if (category === "session") {
      issues.push(issue("info", "I020", `${label} absent. Session-local file; will be (re)created on first session.`));
    } else if (required) {
      issues.push(issue("error", "E020", `Missing core ${type}: ${label}`));
    } else {
      issues.push(issue("warning", "W020", `Missing extension ${type}: ${label}`));
    }
    return issues;
  }
  if (type === "file") {
    const stat = fs.statSync(absPath);
    if (!stat.isFile()) {
      issues.push(issue("error", "E022", `${label} exists but is not a file.`));
    } else if (stat.size === 0) {
      issues.push(issue("warning", "W021", `${label} exists but is empty.`));
    }
  } else if (!isDirectory(absPath)) {
    issues.push(issue("error", "E022", `${label} exists but is not a directory.`));
  }
  return issues;
}

function checkSharedRoot(paths) {
  const issues = [];
  issues.push(...checkArtifact(paths.sharedMission, {
    required: true,
    type: "file",
    label: `${PROJECT_STATE_ROOT}/MISSION.md`,
    category: "core",
  }));
  issues.push(...checkArtifact(paths.sharedMemory, {
    required: true,
    type: "file",
    label: `${PROJECT_STATE_ROOT}/memory.md`,
    category: "core",
  }));
  issues.push(...checkArtifact(paths.defaultLane, {
    required: true,
    type: "dir",
    label: `${PROJECT_STATE_ROOT}/lanes/default`,
    category: "core",
  }));
  return issues;
}

function checkDefaultLane(paths) {
  const issues = [];
  const prefix = `${PROJECT_STATE_ROOT}/lanes/default`;
  issues.push(...checkArtifact(paths.laneToml, {
    required: true,
    type: "file",
    label: `${prefix}/lane.toml`,
    category: "core",
  }));
  issues.push(...checkArtifact(paths.laneMission, {
    required: true,
    type: "file",
    label: `${prefix}/MISSION.md`,
    category: "core",
  }));
  issues.push(...checkArtifact(paths.laneDesign, {
    required: true,
    type: "file",
    label: `${prefix}/DESIGN.md`,
    category: "core",
  }));
  issues.push(...checkArtifact(paths.laneState, {
    required: false,
    type: "file",
    label: `${prefix}/STATE.md`,
    category: SESSION_LOCAL_FILES.includes("STATE.md") ? "session" : "core",
  }));
  issues.push(...checkArtifact(paths.laneBaselineLog, {
    required: true,
    type: "dir",
    label: `${prefix}/baseline-log`,
    category: "core",
  }));
  issues.push(...checkArtifact(paths.laneTasks, {
    required: false,
    type: "file",
    label: `${prefix}/tasks.yaml`,
  }));
  return issues;
}

function checkBaselineLog(absPath, labelPrefix) {
  const issues = [];
  if (!isDirectory(absPath)) return issues;
  const entries = fs.readdirSync(absPath).filter((name) => name.endsWith(".md"));
  if (entries.length === 0) {
    issues.push(issue("warning", "W030", `${labelPrefix} is empty. Expected at least one baseline record.`));
  }
  for (const entry of entries) {
    if (!/^(CR|BL)-\d{8}-\d{6}-/.test(entry)) {
      issues.push(issue("warning", "W031", `${labelPrefix}/${entry} does not follow "CR-YYYYMMDD-HHMMSS-<slug>.md" or "BL-YYYYMMDD-HHMMSS-<slug>.md" naming.`));
    }
  }
  return issues;
}

function checkGitignore(targetDir) {
  const issues = [];
  const gitignorePath = path.join(targetDir, ".gitignore");
  if (!isRegularFile(gitignorePath)) {
    issues.push(issue("warning", "W040", ".gitignore not found. AI-OS lane STATE.md should be session-local."));
    return issues;
  }
  const content = fs.readFileSync(gitignorePath, "utf8");
  const expected = [
    `${PROJECT_STATE_ROOT}/lanes/*/STATE.md`,
    `${PROJECT_STATE_ROOT}/framework.toml`,
    `${PROJECT_STATE_ROOT}/managed-files.tsv`,
  ];
  for (const item of expected) {
    if (!content.includes(item)) {
      issues.push(issue("warning", "W041", `.gitignore does not contain "${item}". Managed files may be accidentally committed.`));
    }
  }
  return issues;
}

function checkLanes(paths) {
  const issues = [];
  if (!fileExists(paths.lanes)) return issues;
  if (!isDirectory(paths.lanes)) {
    issues.push(issue("error", "E050", ".ai-os/lanes exists but is not a directory."));
    return issues;
  }
  const laneDirs = fs.readdirSync(paths.lanes, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (!laneDirs.includes("default")) {
    issues.push(issue("error", "E051", 'Missing required default lane at ".ai-os/lanes/default".'));
  }
  for (const laneId of laneDirs) {
    const laneToml = path.join(paths.lanes, laneId, "lane.toml");
    if (!fileExists(laneToml)) {
      issues.push(issue("warning", "W050", `Lane "${laneId}" is missing lane.toml. Consider removing or completing it.`));
    }
  }
  return issues;
}

// W070: lane MISSION.md 的 "当前基线 ID" 必须能在 baseline-log/ 找到对应文件
function checkBaselineConsistency(paths) {
  const issues = [];
  if (!isRegularFile(paths.laneMission) || !isDirectory(paths.laneBaselineLog)) return issues;
  const missionContent = fs.readFileSync(paths.laneMission, "utf8");
  const baselineId = parseMissionBaselineId(missionContent);
  if (!baselineId) return issues;
  const expectedFile = path.join(paths.laneBaselineLog, `${baselineId}.md`);
  if (!fileExists(expectedFile)) {
    issues.push(issue("warning", "W070",
      `lane MISSION.md references 当前基线 ID "${baselineId}" but ${PROJECT_STATE_ROOT}/lanes/default/baseline-log/${baselineId}.md does not exist.`));
  }
  return issues;
}

function normalizeTaskScalar(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function collectTopLevelTasks(tasksContent) {
  const lines = tasksContent.split(/\r?\n/);
  const tasks = [];
  let inTasks = false;
  let currentTask = null;
  let currentTaskIndent = -1;
  let currentField = null;
  let currentFieldIndent = -1;

  const closeTask = () => {
    if (currentTask) tasks.push(currentTask);
    currentTask = null;
    currentTaskIndent = -1;
    currentField = null;
    currentFieldIndent = -1;
  };

  for (const line of lines) {
    const topLevel = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*$/);
    if (topLevel) {
      closeTask();
      inTasks = topLevel[1] === "tasks";
      continue;
    }
    if (!inTasks) continue;
    const idMatch = line.match(/^(\s+)-\s*id:\s*(.+?)\s*$/);
    if (idMatch) {
      closeTask();
      currentTask = {
        id: normalizeTaskScalar(idMatch[2]),
        fields: { id: [idMatch[2].trim()] },
      };
      currentTaskIndent = idMatch[1].length;
      continue;
    }

    if (!currentTask) continue;
    if (/^\s*$/.test(line) || line.trim().startsWith("#")) continue;

    const indent = (line.match(/^(\s*)/) || ["", ""])[1].length;
    if (indent <= currentTaskIndent) {
      closeTask();
      continue;
    }

    const fieldMatch = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (fieldMatch && fieldMatch[1].length > currentTaskIndent) {
      currentField = fieldMatch[2];
      currentFieldIndent = fieldMatch[1].length;
      if (!currentTask.fields[currentField]) currentTask.fields[currentField] = [];
      if (fieldMatch[3].trim()) currentTask.fields[currentField].push(fieldMatch[3].trim());
      continue;
    }

    if (currentField && indent > currentFieldIndent) {
      currentTask.fields[currentField].push(line.trim());
    }
  }
  closeTask();
  return tasks;
}

function hasMeaningfulTaskValue(value) {
  const normalized = normalizeTaskScalar(value).replace(/^-\s*/, "").trim();
  if (!normalized || normalized === "[]" || normalized === "{}") return false;
  if (/^(none|null|n\/a)$/i.test(normalized)) return false;
  return !normalized.includes("[") && !normalized.includes("]");
}

function hasMeaningfulTaskField(task, field) {
  const values = task.fields[field] || [];
  return values.some((value) => hasMeaningfulTaskValue(value));
}

// W071: tasks.yaml 中每个 task（仅在 tasks: 顶级块下）必须有 owner 字段
function checkTaskOwners(paths) {
  const issues = [];
  if (!isRegularFile(paths.laneTasks)) return issues;
  const tasksContent = fs.readFileSync(paths.laneTasks, "utf8");
  const tasksWithoutOwner = [];
  for (const task of collectTopLevelTasks(tasksContent)) {
    if (!hasMeaningfulTaskField(task, "owner")) {
      tasksWithoutOwner.push(task.id);
    }
  }
  if (tasksWithoutOwner.length > 0) {
    issues.push(issue("warning", "W071",
      `tasks.yaml has ${tasksWithoutOwner.length} task(s) without an owner field: ${tasksWithoutOwner.join(", ")}`));
  }
  return issues;
}

function formatReport(issues) {
  const errors = issues.filter((item) => item.level === "error");
  const warnings = issues.filter((item) => item.level === "warning");
  const infos = issues.filter((item) => item.level === "info");
  if (errors.length === 0 && warnings.length === 0 && infos.length === 0) {
    return "All checks passed. AI-OS project looks healthy.\n";
  }
  const lines = [];
  lines.push(`Found ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info:`);
  lines.push("");
  for (const item of issues) {
    const label = item.level === "error" ? "ERROR" : item.level === "warning" ? "WARN " : "INFO ";
    lines.push(`  ${label} [${item.code}] ${item.message}`);
  }
  return lines.join("\n") + "\n";
}

function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  const targetDir = path.resolve(opts.target || ".");

  if (!fileExists(path.join(targetDir, PROJECT_STATE_ROOT))) {
    if (opts.json) {
      process.stdout.write(JSON.stringify({ ok: false, reason: "not-an-ai-os-project", targetDir }, null, 2) + "\n");
    } else {
      process.stderr.write(`Not an AI-OS project: ${targetDir} has no .ai-os/ directory.\n`);
      process.stderr.write(`Run: create-ai-os install ${targetDir}\n`);
    }
    process.exit(2);
  }

  const version = readFrameworkVersion();
  const pkg = readPackageJson();
  let meta = readMetadata(targetDir);
  // Embedded local doctor (.ai-os/bin/ai-os-doctor.js): framework.toml is
  // gitignored, so a team / CI clone that never ran install has none. The local
  // doctor is itself committed proof of an AI-OS install, so fall back to the
  // committed .ai-os/bin/VERSION as the installed framework version instead of
  // failing E001. The dev / npx package keeps strict E001 (a real "is this an
  // AI-OS project?" check).
  const embedded = path.basename(path.dirname(__dirname)) === PROJECT_STATE_ROOT;
  if (!meta && embedded && version !== "0.0.0") {
    meta = { framework_version: version };
  }
  const paths = getArtifactPaths(targetDir);
  const layoutMode = meta && meta.layout_mode ? meta.layout_mode : LAYOUT_MODE_DEFAULT;

  const issues = [];
  issues.push(...checkMetadata(meta, version));
  issues.push(...checkAgentsMd(paths));
  issues.push(...checkSharedRoot(paths));
  issues.push(...checkDefaultLane(paths));
  issues.push(...checkBaselineLog(paths.laneBaselineLog, ".ai-os/lanes/default/baseline-log"));
  issues.push(...checkLanes(paths));
  issues.push(...checkBaselineConsistency(paths));
  issues.push(...checkTaskOwners(paths));
  issues.push(...checkGitignore(targetDir));

  const errors = issues.filter((item) => item.level === "error");
  const warnings = issues.filter((item) => item.level === "warning");

  const semanticWarnings = issues.filter((item) => SEMANTIC_WARNING_CODES.includes(item.code));

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      ok: errors.length === 0 && (!opts.strict || warnings.length === 0),
      version,
      package: `${pkg.name}@${pkg.version}`,
      targetDir,
      installedVersion: meta ? meta.framework_version : null,
      layout_version: meta && meta.layout_version ? meta.layout_version : LAYOUT_VERSION,
      layout_mode: layoutMode,
      issues,
      semantic_warnings: semanticWarnings,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(`AI-OS doctor for ${targetDir}\n`);
    process.stdout.write(`Framework: ${pkg.name}@${pkg.version}\n`);
    if (meta && meta.framework_version) {
      process.stdout.write(`Installed: v${meta.framework_version}\n`);
    }
    process.stdout.write(`Layout: ${layoutMode}\n\n`);
    process.stdout.write(formatReport(issues));
  }

  if (errors.length > 0) process.exit(1);
  if (opts.strict && warnings.length > 0) process.exit(1);
  process.exit(0);
}

main();
