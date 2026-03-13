#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const {
  fail,
  formatProjectPath,
  getProjectFilePath,
  getProjectRelativePath,
  isProjectArtifactPath,
  cleanYamlScalar,
  parseInlineArray,
} = require("./shared");

const MATRIX_FILE = "verification-matrix.yaml";
const ACTION_ORDER = new Map([
  ["validate", 10],
  ["verify", 20],
  ["build", 30],
  ["restart", 40],
  ["cold-start-smoke", 50],
]);

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-affected [target-dir] [--staged | --base <ref>] [--dry-run] [--execute] [--json]

Plan or execute verification actions from the current code changes.

Options:
  --staged      Use staged changes only
  --base <ref>  Diff against a git base ref, e.g. origin/main
  --dry-run     Print the planned actions without executing them (default)
  --execute     Execute the planned actions in order
  --json        Print a JSON report instead of human-readable output
  -h, --help    Show this help message
`);
}

function parseVerificationMatrix(matrixPath) {
  if (!fs.existsSync(matrixPath)) {
    return { exists: false, path: matrixPath, version: "", commands: {}, rules: [] };
  }

  const content = fs.readFileSync(matrixPath, "utf8");
  const lines = content.split(/\r?\n/);
  const result = {
    exists: true,
    path: matrixPath,
    version: "",
    commands: {},
    rules: [],
  };

  let section = "";
  let currentRule = null;
  let currentListKey = null;

  function flushCurrentRule() {
    if (currentRule) {
      result.rules.push(currentRule);
      currentRule = null;
      currentListKey = null;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "    ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const versionMatch = line.match(/^version:\s*(.+)$/);
    if (versionMatch) {
      flushCurrentRule();
      section = "";
      result.version = cleanYamlScalar(versionMatch[1]);
      continue;
    }

    if (/^commands:\s*$/.test(line)) {
      flushCurrentRule();
      section = "commands";
      currentListKey = null;
      continue;
    }

    if (/^rules:\s*$/.test(line)) {
      flushCurrentRule();
      section = "rules";
      currentListKey = null;
      continue;
    }

    if (section === "commands") {
      const commandMatch = line.match(/^  ([A-Za-z0-9_-]+):\s*(.+)$/);
      if (commandMatch) {
        result.commands[commandMatch[1]] = cleanYamlScalar(commandMatch[2]);
      }
      continue;
    }

    if (section !== "rules") {
      continue;
    }

    const ruleStartMatch = line.match(/^  - id:\s*(.+)$/);
    if (ruleStartMatch) {
      flushCurrentRule();
      currentRule = {
        id: cleanYamlScalar(ruleStartMatch[1]),
        paths: [],
        affected_components: [],
        actions: [],
        notes: "",
      };
      continue;
    }

    if (!currentRule) {
      continue;
    }

    const keyValueMatch = line.match(/^    ([A-Za-z_]+):\s*(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1];
      const value = keyValueMatch[2];
      if (["paths", "affected_components", "actions"].includes(key)) {
        currentListKey = key;
        currentRule[key] = value ? parseInlineArray(value) : [];
        continue;
      }

      currentListKey = null;
      if (key === "notes") {
        currentRule.notes = cleanYamlScalar(value);
      }
      continue;
    }

    const listItemMatch = line.match(/^      -\s+(.+)$/);
    if (currentListKey && listItemMatch) {
      currentRule[currentListKey].push(cleanYamlScalar(listItemMatch[1]));
    }
  }

  flushCurrentRule();
  return result;
}

function escapeRegex(text) {
  return text.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(globPattern) {
  const pattern = globPattern.replace(/\\/g, "/");
  let regexBody = "";

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const nextChar = pattern[i + 1];

    if (char === "*") {
      if (nextChar === "*") {
        regexBody += ".*";
        i += 1;
      } else {
        regexBody += "[^/]*";
      }
      continue;
    }

    if (char === "?") {
      regexBody += "[^/]";
      continue;
    }

    regexBody += escapeRegex(char);
  }

  return new RegExp(`^${regexBody}$`);
}

function matchesAnyGlob(filePath, globs) {
  return globs.some((globPattern) => globToRegExp(globPattern).test(filePath));
}

function execGit(targetDir, args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd: targetDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    }).trim();
  } catch (error) {
    if (options.allowFailure) {
      return "";
    }
    const stderr = error.stderr ? String(error.stderr).trim() : "";
    fail(stderr || `git command failed: git ${args.join(" ")}`);
  }
}

function splitLines(output) {
  if (!output) {
    return [];
  }
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getChangedFiles(targetDir, options) {
  if (options.base) {
    return splitLines(execGit(targetDir, ["diff", "--name-only", `${options.base}...HEAD`]));
  }

  if (options.staged) {
    return splitLines(execGit(targetDir, ["diff", "--name-only", "--cached"]));
  }

  const stagedFiles = splitLines(execGit(targetDir, ["diff", "--name-only", "--cached"], { allowFailure: true }));
  const unstagedFiles = splitLines(execGit(targetDir, ["diff", "--name-only"], { allowFailure: true }));
  const untrackedFiles = splitLines(
    execGit(targetDir, ["ls-files", "--others", "--exclude-standard"], { allowFailure: true })
  );

  return [...new Set([...stagedFiles, ...unstagedFiles, ...untrackedFiles])].sort();
}

function normalizeChangedFiles(targetDir, gitRoot, changedFiles) {
  const normalized = [];

  for (const filePath of changedFiles) {
    const absolutePath = path.resolve(gitRoot, filePath);
    const relativeToTarget = path.relative(targetDir, absolutePath).replace(/\\/g, "/");
    if (!relativeToTarget || relativeToTarget.startsWith("..")) {
      continue;
    }
    normalized.push(relativeToTarget);
  }

  return [...new Set(normalized)].sort();
}

function collectImplicitActions(changedFiles) {
  const matchedFiles = changedFiles.filter(
    (filePath) =>
      filePath === "AGENTS.md" ||
      filePath.startsWith(".agents/") ||
      isProjectArtifactPath(filePath)
  );

  if (matchedFiles.length === 0) {
    return [];
  }

  return [
    {
      id: "framework-artifacts",
      matched_files: matchedFiles,
      affected_components: ["framework"],
      actions: ["validate"],
      notes: "Framework or project artifacts changed",
      implicit: true,
    },
  ];
}

function collectRuleMatches(changedFiles, matrix) {
  const matches = [];
  for (const rule of matrix.rules) {
    const matchedFiles = changedFiles.filter((filePath) => matchesAnyGlob(filePath, rule.paths || []));
    if (matchedFiles.length === 0) {
      continue;
    }
    matches.push({
      id: rule.id,
      matched_files: matchedFiles,
      affected_components: [...new Set(rule.affected_components || [])],
      actions: [...new Set(rule.actions || [])],
      notes: rule.notes || "",
      implicit: false,
    });
  }
  return matches;
}

function actionPhase(actionId) {
  if (actionId.startsWith("cold-start-smoke")) {
    return "cold-start-smoke";
  }
  if (actionId.startsWith("restart")) {
    return "restart";
  }
  if (ACTION_ORDER.has(actionId)) {
    return actionId;
  }
  return "custom";
}

function actionPriority(actionId) {
  const phase = actionPhase(actionId);
  return ACTION_ORDER.get(phase) || 60;
}

function resolveActionCommand(actionId, matrix, targetDir) {
  if (matrix.commands[actionId]) {
    return {
      type: "shell",
      command: matrix.commands[actionId],
      label: matrix.commands[actionId],
    };
  }

  if (actionId === "validate") {
    return {
      type: "builtin",
      label: "create-ai-os doctor . --strict",
      run() {
        return spawnSync(
          process.execPath,
          [path.join(__dirname, "create-ai-os.js"), "doctor", targetDir, "--strict"],
          { stdio: "inherit" }
        );
      },
    };
  }

  return null;
}

function buildActionPlan(targetDir, changedFiles, matrix, matchedRules) {
  const aggregated = new Map();

  for (const rule of matchedRules) {
    for (const actionId of rule.actions || []) {
      if (!aggregated.has(actionId)) {
        aggregated.set(actionId, {
          id: actionId,
          phase: actionPhase(actionId),
          affected_components: new Set(),
          source_rules: [],
          matched_files: new Set(),
        });
      }
      const entry = aggregated.get(actionId);
      for (const componentId of rule.affected_components || []) {
        entry.affected_components.add(componentId);
      }
      entry.source_rules.push(rule.id);
      for (const filePath of rule.matched_files || []) {
        entry.matched_files.add(filePath);
      }
    }
  }

  return [...aggregated.values()]
    .map((entry) => {
      const commandInfo = resolveActionCommand(entry.id, matrix, targetDir);
      return {
        id: entry.id,
        phase: entry.phase,
        affected_components: [...entry.affected_components].sort(),
        source_rules: [...new Set(entry.source_rules)],
        matched_files: [...entry.matched_files].sort(),
        configured: Boolean(commandInfo),
        command: commandInfo ? commandInfo.label : "",
        executor: commandInfo,
      };
    })
    .sort((left, right) => {
      const priorityDelta = actionPriority(left.id) - actionPriority(right.id);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return left.id.localeCompare(right.id);
    });
}

function createReport(targetDir, changedFiles, matrix, matchedRules, actionPlan) {
  return {
    target_dir: targetDir,
    verification_matrix: {
      exists: matrix.exists,
      path: formatProjectPath(path.relative(targetDir, matrix.path || getProjectFilePath(targetDir, MATRIX_FILE))),
      version: matrix.version || "",
      rule_count: matrix.rules ? matrix.rules.length : 0,
    },
    changed_files: changedFiles,
    matched_rules: matchedRules,
    planned_actions: actionPlan.map((action) => ({
      id: action.id,
      phase: action.phase,
      affected_components: action.affected_components,
      source_rules: action.source_rules,
      matched_files: action.matched_files,
      configured: action.configured,
      command: action.command,
    })),
  };
}

function printHumanReport(report) {
  process.stdout.write(`\nAI-OS Affected — ${report.target_dir}\n\n`);
  process.stdout.write(`Verification matrix: ${report.verification_matrix.path}`);
  if (report.verification_matrix.exists) {
    const versionSuffix = report.verification_matrix.version ? ` (version ${report.verification_matrix.version})` : "";
    process.stdout.write(`${versionSuffix}\n`);
  } else {
    process.stdout.write(" (missing)\n");
  }

  process.stdout.write("\nChanged files:\n");
  if (report.changed_files.length === 0) {
    process.stdout.write("  - none\n");
  } else {
    for (const filePath of report.changed_files) {
      process.stdout.write(`  - ${filePath}\n`);
    }
  }

  process.stdout.write("\nMatched rules:\n");
  if (report.matched_rules.length === 0) {
    process.stdout.write("  - none\n");
  } else {
    for (const rule of report.matched_rules) {
      const implicitLabel = rule.implicit ? " [implicit]" : "";
      const components = rule.affected_components.length > 0 ? ` components=${rule.affected_components.join(",")}` : "";
      process.stdout.write(`  - ${rule.id}${implicitLabel}${components}\n`);
      for (const filePath of rule.matched_files) {
        process.stdout.write(`      ${filePath}\n`);
      }
    }
  }

  process.stdout.write("\nPlanned actions:\n");
  if (report.planned_actions.length === 0) {
    process.stdout.write("  - none\n");
  } else {
    for (const action of report.planned_actions) {
      const commandSuffix = action.command ? ` -> ${action.command}` : " -> missing command";
      process.stdout.write(`  - ${action.id} (${action.phase})${commandSuffix}\n`);
    }
  }

  process.stdout.write("\n");
}

function runActionPlan(targetDir, actionPlan) {
  const missingCommands = actionPlan.filter((action) => !action.executor);
  if (missingCommands.length > 0) {
    fail(
      [
        "cannot execute affected plan because some actions have no configured command:",
        ...missingCommands.map((action) => `- ${action.id}`),
        `update ${getProjectRelativePath(MATRIX_FILE)} or remove the unmatched actions`,
      ].join("\n")
    );
  }

  for (const action of actionPlan) {
    process.stdout.write(`\n==> ${action.id}\n`);
    let result;

    if (action.executor.type === "builtin") {
      result = action.executor.run();
    } else {
      result = spawnSync(action.executor.command, {
        cwd: targetDir,
        shell: true,
        stdio: "inherit",
      });
    }

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
}

const args = process.argv.slice(2);
let targetArg = "";
let staged = false;
let base = "";
let execute = false;
let json = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--staged") {
    staged = true;
    continue;
  }
  if (arg === "--base") {
    if (i + 1 >= args.length) {
      fail("--base requires a value");
    }
    base = args[i + 1];
    i += 1;
    continue;
  }
  if (arg === "--execute") {
    execute = true;
    continue;
  }
  if (arg === "--dry-run") {
    continue;
  }
  if (arg === "--json") {
    json = true;
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

if (staged && base) {
  fail("--staged and --base cannot be used together");
}

const targetDir = path.resolve(targetArg || ".");
if (!fs.existsSync(targetDir)) {
  fail(`target directory does not exist: ${targetDir}`);
}

const gitRoot = execGit(targetDir, ["rev-parse", "--show-toplevel"]);

const matrix = parseVerificationMatrix(getProjectFilePath(targetDir, MATRIX_FILE));
if (!matrix.exists) {
  fail(`${getProjectRelativePath(MATRIX_FILE)} not found in ${targetDir}`);
}

const changedFiles = normalizeChangedFiles(targetDir, gitRoot, getChangedFiles(targetDir, { staged, base }));
const matchedRules = [...collectImplicitActions(changedFiles), ...collectRuleMatches(changedFiles, matrix)];
const actionPlan = buildActionPlan(targetDir, changedFiles, matrix, matchedRules);
const report = createReport(targetDir, changedFiles, matrix, matchedRules, actionPlan);

if (json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  printHumanReport(report);
}

if (execute) {
  runActionPlan(targetDir, actionPlan);
}
