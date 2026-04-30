#!/usr/bin/env node

/**
 * AI-OS v9 doctor
 *
 * Checks artifact completeness, layout health, and constitution compliance.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const {
  PROJECT_STATE_ROOT,
  LAYOUT_MODE_DEFAULT,
  LAYOUT_MODE_ROOT_ONLY,
  LAYOUT_MODE_HYBRID,
  LAYOUT_MODE_UNKNOWN,
  LAYOUT_VERSION,
  SESSION_LOCAL_FILES,
  readFrameworkVersion,
  readPackageJson,
  readMetadata,
  getArtifactPaths,
  detectLayout,
  fail,
  fileExists,
  isDirectory,
  parseMissionBaselineId,
} = require("./shared");

const SEMANTIC_WARNING_CODES = ["W070", "W071", "W072"];

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
      issues.push(issue("warning", "W002", `Installed framework v${meta.framework_version} is older than current v${version}. Consider running: create-ai-os upgrade .`));
    }
  }
  if (meta.schema_version && meta.schema_version !== LAYOUT_VERSION) {
    issues.push(issue("error", "E002", `schema_version is "${meta.schema_version}", expected "${LAYOUT_VERSION}". Run: create-ai-os upgrade .`));
  }
  return issues;
}

function checkAgentsMd(paths) {
  const issues = [];
  if (!fileExists(paths.agentsMd)) {
    issues.push(issue("error", "E010", "Missing AGENTS.md at project root. This is the delivery constitution."));
    return issues;
  }
  const content = fs.readFileSync(paths.agentsMd, "utf8");
  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > 200) {
    issues.push(issue("warning", "W010", `AGENTS.md is ${lineCount} lines (v9 target: <=150). Consider trimming.`));
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
    if (stat.size === 0) {
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
  issues.push(...checkArtifact(paths.laneSpecs, {
    required: false,
    type: "dir",
    label: `${prefix}/specs`,
  }));
  issues.push(...checkArtifact(paths.laneTasks, {
    required: false,
    type: "file",
    label: `${prefix}/tasks.yaml`,
  }));
  issues.push(...checkArtifact(paths.laneRiskRegister, {
    required: false,
    type: "file",
    label: `${prefix}/risk-register.md`,
  }));
  issues.push(...checkArtifact(paths.laneReleasePlan, {
    required: false,
    type: "file",
    label: `${prefix}/release-plan.md`,
  }));
  issues.push(...checkArtifact(paths.laneVerificationMatrix, {
    required: false,
    type: "file",
    label: `${prefix}/verification-matrix.yaml`,
  }));
  issues.push(...checkArtifact(paths.laneDesignPack, {
    required: false,
    type: "dir",
    label: `${prefix}/design-pack`,
  }));
  issues.push(...checkArtifact(paths.laneEvals, {
    required: false,
    type: "dir",
    label: `${prefix}/evals`,
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
  if (!fileExists(gitignorePath)) {
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

function checkSemanticConsistency(paths) {
  const issues = [];

  // W070: lane MISSION.md 的 "当前基线 ID" 必须能在 baseline-log/ 找到对应文件
  if (fileExists(paths.laneMission) && isDirectory(paths.laneBaselineLog)) {
    const missionContent = fs.readFileSync(paths.laneMission, "utf8");
    const baselineId = parseMissionBaselineId(missionContent);
    if (baselineId) {
      const expectedFile = path.join(paths.laneBaselineLog, `${baselineId}.md`);
      if (!fileExists(expectedFile)) {
        issues.push(issue("warning", "W070",
          `lane MISSION.md references baseline_id "${baselineId}" but ${PROJECT_STATE_ROOT}/lanes/default/baseline-log/${baselineId}.md does not exist.`));
      }
    }
  }

  // W071: tasks.yaml 中每个 task（仅在 tasks: 顶级块下）必须有 owner 字段
  if (fileExists(paths.laneTasks)) {
    const tasksContent = fs.readFileSync(paths.laneTasks, "utf8");
    const lines = tasksContent.split(/\r?\n/);
    const tasksWithoutOwner = [];
    let inTasks = false;
    let currentTaskId = null;
    let currentTaskHasOwner = false;
    let currentTaskIndent = -1;
    const closeTask = () => {
      if (currentTaskId && !currentTaskHasOwner) tasksWithoutOwner.push(currentTaskId);
      currentTaskId = null;
      currentTaskHasOwner = false;
      currentTaskIndent = -1;
    };
    for (const line of lines) {
      const topLevel = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*$/);
      if (topLevel) {
        closeTask();
        inTasks = topLevel[1] === "tasks";
        continue;
      }
      if (!inTasks) continue;
      const idMatch = line.match(/^(\s+)-\s*id:\s*(\S+)/);
      if (idMatch) {
        closeTask();
        currentTaskId = idMatch[2];
        currentTaskIndent = idMatch[1].length;
        continue;
      }
      if (currentTaskId !== null) {
        const ownerMatch = line.match(/^(\s+)owner:\s*(\S+)/);
        if (ownerMatch && ownerMatch[1].length > currentTaskIndent) {
          currentTaskHasOwner = true;
        }
      }
    }
    closeTask();
    if (tasksWithoutOwner.length > 0) {
      issues.push(issue("warning", "W071",
        `tasks.yaml has ${tasksWithoutOwner.length} task(s) without an owner field: ${tasksWithoutOwner.join(", ")}`));
    }
  }

  // W072: lane DESIGN.md 已填的 AC 必须至少有一项被 verification-matrix.yaml 引用
  if (fileExists(paths.laneDesign) && fileExists(paths.laneVerificationMatrix)) {
    const designContent = fs.readFileSync(paths.laneDesign, "utf8");
    const matrixContent = fs.readFileSync(paths.laneVerificationMatrix, "utf8");
    const acIds = [];
    for (const line of designContent.split(/\r?\n/)) {
      if (!line.startsWith("|")) continue;
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 3) continue;
      if (!/^AC-\d+/.test(cells[0])) continue;
      const desc = cells[2] || "";
      if (!desc || desc.includes("[")) continue; // skip placeholder / template rows
      acIds.push(cells[0]);
    }
    if (acIds.length > 0) {
      const referenced = acIds.filter((id) => matrixContent.includes(id));
      if (referenced.length === 0) {
        issues.push(issue("warning", "W072",
          `verification-matrix.yaml does not reference any of the ${acIds.length} non-placeholder acceptance criteria from DESIGN.md (${acIds.join(", ")}).`));
      }
    }
  }

  return issues;
}

function checkLayout(layoutMode) {
  const issues = [];
  if (layoutMode === LAYOUT_MODE_ROOT_ONLY) {
    issues.push(issue("error", "E060", 'Detected legacy root-only layout. Run "create-ai-os upgrade ." to migrate to v9 canonical layout.'));
  } else if (layoutMode === LAYOUT_MODE_HYBRID) {
    issues.push(issue("error", "E061", "Detected layout drift: root-level lane artifacts and .ai-os/lanes/default/ both exist. Run create-ai-os upgrade . to normalize."));
  } else if (layoutMode === LAYOUT_MODE_UNKNOWN) {
    issues.push(issue("warning", "W060", "Unable to determine the current AI-OS layout mode."));
  }
  return issues;
}

function formatReport(issues) {
  const errors = issues.filter((item) => item.level === "error");
  const warnings = issues.filter((item) => item.level === "warning");
  const infos = issues.filter((item) => item.level === "info");
  if (errors.length === 0 && warnings.length === 0 && infos.length === 0) {
    return "All checks passed. AI-OS v9 project looks healthy.\n";
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
      process.stderr.write(`Run: create-ai-os ${targetDir}\n`);
    }
    process.exit(2);
  }

  const version = readFrameworkVersion();
  const pkg = readPackageJson();
  const meta = readMetadata(targetDir);
  const paths = getArtifactPaths(targetDir);
  const layoutMode = detectLayout(targetDir);

  const issues = [];
  issues.push(...checkMetadata(meta, version));
  issues.push(...checkAgentsMd(paths));
  issues.push(...checkLayout(layoutMode));
  if (layoutMode === LAYOUT_MODE_DEFAULT || layoutMode === LAYOUT_MODE_HYBRID) {
    issues.push(...checkSharedRoot(paths));
    issues.push(...checkDefaultLane(paths));
    issues.push(...checkBaselineLog(paths.laneBaselineLog, ".ai-os/lanes/default/baseline-log"));
    issues.push(...checkLanes(paths));
    issues.push(...checkSemanticConsistency(paths));
  } else if (layoutMode === LAYOUT_MODE_ROOT_ONLY) {
    if (fileExists(paths.rootBaselineLog)) {
      issues.push(...checkBaselineLog(paths.rootBaselineLog, ".ai-os/baseline-log"));
    }
  }
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
