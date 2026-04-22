#!/usr/bin/env node

/**
 * AI-OS v8 doctor
 *
 * Checks artifact completeness and constitution compliance.
 * Replaces v7's validate / gate / release-check / status.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const {
  PROJECT_STATE_ROOT,
  CORE_FILES,
  CORE_DIRS,
  EXTENSION_FILES,
  EXTENSION_DIRS,
  SESSION_LOCAL_FILES,
  readFrameworkVersion,
  readPackageJson,
  readMetadata,
  getArtifactPaths,
  fail,
  fileExists,
} = require("./shared");

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
  1  At least one error (missing core artifact, constitution violation)
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

function checkMetadata(meta, version) {
  const issues = [];
  if (!meta) {
    issues.push({ level: "error", code: "E001", message: `Missing .ai-os/framework.toml. This does not look like an AI-OS project.` });
    return issues;
  }
  if (!meta.framework_version) {
    issues.push({ level: "warning", code: "W001", message: `framework.toml has no framework_version field.` });
  } else {
    const installedMajor = parseInt(meta.framework_version.split(".")[0], 10);
    const currentMajor = parseInt(version.split(".")[0], 10);
    if (Number.isFinite(installedMajor) && Number.isFinite(currentMajor) && installedMajor < currentMajor) {
      issues.push({
        level: "warning",
        code: "W002",
        message: `Installed framework v${meta.framework_version} is older than current v${version}. Consider running: create-ai-os upgrade .`,
      });
    }
  }
  if (meta.schema_version && meta.schema_version !== "8") {
    issues.push({
      level: "error",
      code: "E002",
      message: `schema_version is "${meta.schema_version}", expected "8". Run: create-ai-os upgrade .`,
    });
  }
  return issues;
}

function checkAgentsMd(paths) {
  const issues = [];
  if (!fileExists(paths.agentsMd)) {
    issues.push({ level: "error", code: "E010", message: `Missing AGENTS.md at project root. This is the delivery constitution.` });
    return issues;
  }
  const content = fs.readFileSync(paths.agentsMd, "utf8");
  const lineCount = content.split(/\r?\n/).length;
  if (lineCount > 200) {
    issues.push({
      level: "warning",
      code: "W010",
      message: `AGENTS.md is ${lineCount} lines (v8 target: ≤150). Consider trimming.`,
    });
  }
  const requiredSections = ["五条核心要求", "绝对禁止"];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      issues.push({
        level: "warning",
        code: "W011",
        message: `AGENTS.md missing expected section marker: "${section}". May be a custom or pre-v8 file.`,
      });
    }
  }
  return issues;
}

function checkArtifact(absPath, { required, type, label, category = "extension" }) {
  const issues = [];
  const exists = fileExists(absPath);
  if (!exists) {
    if (category === "session") {
      issues.push({
        level: "info",
        code: "I020",
        message: `${label} absent. Session-local file; will be (re)created on first session.`,
      });
    } else if (required) {
      issues.push({
        level: "error",
        code: "E020",
        message: `Missing core ${type}: ${label}`,
      });
    } else {
      issues.push({
        level: "warning",
        code: "W020",
        message: `Missing extension ${type}: ${label}`,
      });
    }
    return issues;
  }
  if (type === "file") {
    const stat = fs.statSync(absPath);
    if (stat.size === 0) {
      issues.push({
        level: "warning",
        code: "W021",
        message: `${label} exists but is empty.`,
      });
    }
  } else if (type === "dir") {
    if (!fs.statSync(absPath).isDirectory()) {
      issues.push({
        level: "error",
        code: "E022",
        message: `${label} exists but is not a directory.`,
      });
    }
  }
  return issues;
}

function checkArtifacts(paths) {
  const issues = [];
  const aiOsDir = paths.aiOsDir;
  const rel = (f) => path.posix.join(PROJECT_STATE_ROOT, f);

  for (const f of CORE_FILES) {
    const isSession = SESSION_LOCAL_FILES.includes(f);
    issues.push(...checkArtifact(path.join(aiOsDir, f), {
      required: !isSession,
      type: "file",
      label: rel(f),
      category: isSession ? "session" : "core",
    }));
  }
  for (const d of CORE_DIRS) {
    issues.push(...checkArtifact(path.join(aiOsDir, d), {
      required: true, type: "dir", label: rel(d),
    }));
  }
  for (const f of EXTENSION_FILES) {
    issues.push(...checkArtifact(path.join(aiOsDir, f), {
      required: false, type: "file", label: rel(f),
    }));
  }
  for (const d of EXTENSION_DIRS) {
    issues.push(...checkArtifact(path.join(aiOsDir, d), {
      required: false, type: "dir", label: rel(d),
    }));
  }

  return issues;
}

function checkBaselineLog(paths) {
  const issues = [];
  if (!fileExists(paths.baselineLog)) return issues;
  const entries = fs.readdirSync(paths.baselineLog).filter((n) => n.endsWith(".md"));
  if (entries.length === 0) {
    issues.push({
      level: "warning",
      code: "W030",
      message: `baseline-log/ is empty. Expected at least one baseline record.`,
    });
  }
  for (const entry of entries) {
    const m = /^(CR|BL)-\d{8}-\d{6}-/.test(entry);
    if (!m && entry !== "BL-template.md") {
      issues.push({
        level: "warning",
        code: "W031",
        message: `baseline-log/${entry} does not follow "CR-YYYYMMDD-HHMMSS-<slug>.md" or "BL-YYYYMMDD-HHMMSS-<slug>.md" naming.`,
      });
    }
  }
  return issues;
}

function checkGitignore(targetDir) {
  const issues = [];
  const gitignorePath = path.join(targetDir, ".gitignore");
  if (!fileExists(gitignorePath)) {
    issues.push({
      level: "warning",
      code: "W040",
      message: `.gitignore not found. AI-OS STATE.md should be session-local.`,
    });
    return issues;
  }
  const content = fs.readFileSync(gitignorePath, "utf8");
  const expected = `${PROJECT_STATE_ROOT}/STATE.md`;
  if (!content.includes(expected)) {
    issues.push({
      level: "warning",
      code: "W041",
      message: `.gitignore does not contain "${expected}". STATE.md may be accidentally committed.`,
    });
  }
  return issues;
}

function checkLanes(paths) {
  const issues = [];
  if (!fileExists(paths.lanes)) return issues;
  if (!fs.statSync(paths.lanes).isDirectory()) {
    issues.push({
      level: "error",
      code: "E050",
      message: `.ai-os/lanes exists but is not a directory.`,
    });
    return issues;
  }
  const laneDirs = fs.readdirSync(paths.lanes, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const laneId of laneDirs) {
    const lanePath = path.join(paths.lanes, laneId);
    const laneToml = path.join(lanePath, "lane.toml");
    if (!fileExists(laneToml)) {
      issues.push({
        level: "warning",
        code: "W050",
        message: `Lane "${laneId}" is missing lane.toml. Consider removing or completing it.`,
      });
    }
  }
  return issues;
}

function formatReport(issues) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");
  if (errors.length === 0 && warnings.length === 0 && infos.length === 0) {
    return "All checks passed. AI-OS v8 project looks healthy.\n";
  }
  const lines = [];
  lines.push(`Found ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info:`);
  lines.push("");
  for (const issue of issues) {
    const icon = issue.level === "error" ? "ERROR"
      : issue.level === "warning" ? "WARN "
      : "INFO ";
    lines.push(`  ${icon} [${issue.code}] ${issue.message}`);
  }
  return lines.join("\n") + "\n";
}

function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  const targetDir = path.resolve(opts.target || ".");

  const aiOsDir = path.join(targetDir, PROJECT_STATE_ROOT);
  if (!fileExists(aiOsDir)) {
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
  const paths = getArtifactPaths(targetDir);
  const meta = readMetadata(targetDir);

  const issues = [];
  issues.push(...checkMetadata(meta, version));
  issues.push(...checkAgentsMd(paths));
  issues.push(...checkArtifacts(paths));
  issues.push(...checkBaselineLog(paths));
  issues.push(...checkGitignore(targetDir));
  issues.push(...checkLanes(paths));

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      ok: errors.length === 0 && (!opts.strict || warnings.length === 0),
      version,
      package: `${pkg.name}@${pkg.version}`,
      targetDir,
      installedVersion: meta ? meta.framework_version : null,
      issues,
    }, null, 2) + "\n");
  } else {
    process.stdout.write(`AI-OS doctor for ${targetDir}\n`);
    process.stdout.write(`Framework: ${pkg.name}@${pkg.version}\n`);
    if (meta && meta.framework_version) {
      process.stdout.write(`Installed: v${meta.framework_version}\n`);
    }
    process.stdout.write("\n");
    process.stdout.write(formatReport(issues));
  }

  if (errors.length > 0) process.exit(1);
  if (opts.strict && warnings.length > 0) process.exit(1);
  process.exit(0);
}

main();
