#!/usr/bin/env node

/**
 * AI-OS Gate — programmatic phase gate checks
 *
 * Reads YAML workflow definitions (.yaml alongside existing .md workflows)
 * and validates entry/exit gates for each delivery phase.
 *
 * Usage:
 *   create-ai-os gate [target-dir]              Show gate status for current phase
 *   create-ai-os gate <phase> [target-dir]      Check exit gates for <phase>
 *   create-ai-os gate <phase> --entry           Check entry gates for <phase>
 *   create-ai-os gate --all                     Check all phases
 *   create-ai-os gate --json                    JSON output
 */

const fs = require("fs");
const path = require("path");
const {
  FRAMEWORK_ROOT,
  SYM_OK,
  SYM_FAIL,
  SYM_WARN,
  C_RESET,
  C_RED,
  C_GREEN,
  C_YELLOW,
  C_CYAN,
  C_DIM,
  parseCliArgs,
  resolveTargetDir,
  getProjectFilePath,
  countTopLevelYamlListEntries,
  listProjectEvalFiles,
  validateFailureModeGuards,
} = require("./shared");
const {
  parseTasksFile,
  parseAcceptanceFile,
  readStateFile,
} = require("./project-state");

const PHASES = ["align", "design", "plan", "build", "verify", "ship"];

// ---------------------------------------------------------------------------
// Tiny YAML parser (handles the simple subset used in workflow .yaml files)
// ---------------------------------------------------------------------------

function parseWorkflowYaml(content) {
  if (!content) return null;
  const lines = content.split("\n");
  const result = { exit_gates: [], entry_gates: [], artifacts: {}, transitions: {} };
  let currentList = null;
  let currentObj = null;

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const topMatch = trimmed.match(/^(\w[\w_]*):\s*(.*)/);
    if (topMatch && !trimmed.startsWith("  ")) {
      const key = topMatch[1];
      const val = topMatch[2].replace(/^['"]|['"]$/g, "").trim();
      if (val && key !== "exit_gates" && key !== "entry_gates" &&
          key !== "artifacts" && key !== "transitions") {
        result[key] = val;
      }
      if (key === "exit_gates" || key === "entry_gates") {
        currentList = result[key];
        currentObj = null;
      } else {
        currentList = null;
        currentObj = null;
      }
      continue;
    }

    if (currentList !== null) {
      const itemStart = trimmed.match(/^\s+-\s+id:\s*(.+)/);
      if (itemStart) {
        currentObj = { id: itemStart[1].trim() };
        currentList.push(currentObj);
        continue;
      }
      if (currentObj) {
        const kv = trimmed.match(/^\s+(\w[\w_]*):\s*(.*)/);
        if (kv) {
          let val = kv[2].replace(/^['"]|['"]$/g, "").trim();
          if (val === "true") val = true;
          else if (val === "false") val = false;
          else if (/^\d+$/.test(val)) val = parseInt(val, 10);
          currentObj[kv[1]] = val;
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Gate check implementations
// ---------------------------------------------------------------------------

function runGateCheck(gate, targetDir) {
  const check = gate.check;
  const projPath = (rel) => getProjectFilePath(targetDir, rel);

  switch (check) {
    case "file_exists": {
      const fp = projPath(gate.path);
      return fs.existsSync(fp);
    }

    case "dir_not_empty": {
      const dp = projPath(gate.path);
      if (!fs.existsSync(dp) || !fs.statSync(dp).isDirectory()) return false;
      const entries = fs.readdirSync(dp).filter(e => !e.startsWith("."));
      return entries.length > 0;
    }

    case "file_min_lines": {
      const fp = projPath(gate.path);
      if (!fs.existsSync(fp)) return false;
      const content = fs.readFileSync(fp, "utf8");
      const lines = content.split("\n").filter(l => l.trim().length > 0);
      return lines.length >= (gate.min_lines || 1);
    }

    case "section_not_empty": {
      const fp = projPath(gate.path);
      if (!fs.existsSync(fp)) return false;
      const content = fs.readFileSync(fp, "utf8");
      const sectionName = gate.section;
      const regex = new RegExp(`^#+\\s+.*${escapeRegex(sectionName)}`, "im");
      return regex.test(content);
    }

    case "field_not_placeholder": {
      const fp = projPath(gate.path);
      if (!fs.existsSync(fp)) return false;
      const content = fs.readFileSync(fp, "utf8");
      const field = gate.field;
      const regex = new RegExp(`\\*\\*${escapeRegex(field)}\\*\\*[：:]\\s*(.+)`, "m");
      const match = content.match(regex);
      if (!match) return false;
      const val = match[1].trim();
      return val.length > 0 && !val.startsWith("[") && val !== "—" && val !== "-";
    }

    case "state_field_matches": {
      if (!fs.existsSync(projPath("STATE.md"))) return false;
      const state = readStateFile(targetDir);
      if (!state || !state.position) return false;
      const key = gate.field;
      const expected = String(gate.expected);
      const actual = state.position[key];
      return actual && String(actual).trim() === expected;
    }

    case "tasks_all_completed": {
      const parsedTasks = parseTasksFile(projPath("tasks.yaml"));
      if (!parsedTasks.exists || parsedTasks.tasks.length === 0) return false;
      return parsedTasks.tasks.every(t => t.status === "done" || t.status === "cancelled");
    }

    case "acceptance_all_passed": {
      const parsedAcceptance = parseAcceptanceFile(projPath("acceptance.yaml"));
      const gateStatuses = Object.values(parsedAcceptance.gateStatuses || {});
      if (!parsedAcceptance.exists || gateStatuses.length === 0) return false;
      return gateStatuses.every(status => status === "passed" || status === "waived" || status === "approved" || status === "not_applicable");
    }

    case "file_contains": {
      const fp = projPath(gate.path);
      if (!fs.existsSync(fp)) {
        return gate.if_exists_only ? true : false;
      }
      const content = fs.readFileSync(fp, "utf8");
      return content.includes(String(gate.contains || ""));
    }

    case "yaml_top_level_list_has_entries": {
      const fp = projPath(gate.path);
      if (!fs.existsSync(fp)) {
        return gate.if_exists_only ? true : false;
      }
      const content = fs.readFileSync(fp, "utf8");
      return countTopLevelYamlListEntries(content, gate.key || gate.field) > 0;
    }

    case "failure_mode_guards_valid": {
      const fp = projPath(gate.path);
      if (!fs.existsSync(fp)) {
        return gate.if_exists_only ? true : false;
      }
      const content = fs.readFileSync(fp, "utf8");
      if (countTopLevelYamlListEntries(content, "failure_modes") === 0) {
        return true;
      }
      const acceptancePath = projPath(gate.acceptance_path || "acceptance.yaml");
      const parsedAcceptance = parseAcceptanceFile(acceptancePath);
      if (!parsedAcceptance.exists) {
        return false;
      }
      const knownEvidenceNames = [...new Set(Object.values(parsedAcceptance.gateEvidence || {}).flat().filter(Boolean))];
      const validation = validateFailureModeGuards(content, {
        knownEvidenceNames,
        existingEvalFiles: listProjectEvalFiles(targetDir),
      });
      return validation.issues.length === 0;
    }

    case "yaml_has_entries": {
      const fp = projPath(gate.path);
      if (!fs.existsSync(fp)) return false;
      const content = fs.readFileSync(fp, "utf8");
      return content.split("\n").some(l => /^\s*-\s+\w/.test(l) || /^\s+id:/.test(l));
    }

    case "phase_completed": {
      const phaseYaml = loadPhaseYaml(gate.phase);
      if (!phaseYaml) return true;
      const exitGates = phaseYaml.exit_gates || [];
      return exitGates
        .filter(g => g.severity === "error")
        .every(g => runGateCheck(g, targetDir));
    }

    default:
      return true;
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Load workflow YAML
// ---------------------------------------------------------------------------

function loadPhaseYaml(phase) {
  const yamlPath = path.join(FRAMEWORK_ROOT, ".agents", "workflows", `${phase}.yaml`);
  if (!fs.existsSync(yamlPath)) return null;
  const content = fs.readFileSync(yamlPath, "utf8");
  return parseWorkflowYaml(content);
}

// ---------------------------------------------------------------------------
// Detect current phase from STATE.md
// ---------------------------------------------------------------------------

function detectCurrentPhase(targetDir) {
  const state = readStateFile(targetDir);
  if (state && state.position && state.position["当前阶段"]) {
    const phase = state.position["当前阶段"].trim().toLowerCase();
    if (PHASES.includes(phase)) return phase;
  }
  for (const phase of PHASES) {
    const yaml = loadPhaseYaml(phase);
    if (!yaml) continue;
    const exitGates = (yaml.exit_gates || []).filter(g => g.severity === "error");
    const allPassed = exitGates.every(g => runGateCheck(g, targetDir));
    if (!allPassed) return phase;
  }
  return "ship";
}

// ---------------------------------------------------------------------------
// Run gate checks for a phase
// ---------------------------------------------------------------------------

function runPhaseGates(phase, direction, targetDir) {
  const yaml = loadPhaseYaml(phase);
  if (!yaml) {
    return { phase, direction, gates: [], available: false };
  }

  const gateList = direction === "entry"
    ? (yaml.entry_gates || [])
    : (yaml.exit_gates || []);

  const results = gateList.map(gate => {
    const passed = runGateCheck(gate, targetDir);
    return {
      id: gate.id,
      severity: gate.severity || "error",
      message: gate.message || gate.id,
      passed,
    };
  });

  return { phase, direction, gates: results, available: true };
}

// ---------------------------------------------------------------------------
// Print results
// ---------------------------------------------------------------------------

function printGateResults(result, jsonMode) {
  if (jsonMode) return;

  const { phase, direction, gates, available } = result;
  if (!available) {
    process.stdout.write(`\n${C_DIM}Phase ${phase}: no YAML gate definition found${C_RESET}\n`);
    return;
  }

  const dirLabel = direction === "entry" ? "Entry" : "Exit";
  const nextPhase = direction === "exit"
    ? PHASES[PHASES.indexOf(phase) + 1] || "done"
    : phase;
  const header = direction === "exit"
    ? `${phase} ${C_DIM}→${C_RESET} ${nextPhase}`
    : `→ ${phase}`;

  process.stdout.write(`\n${C_CYAN}AI-OS Gate Check: ${header}${C_RESET}\n`);
  process.stdout.write(`${"━".repeat(48)}\n\n`);
  process.stdout.write(`${dirLabel} gates:\n`);

  if (gates.length === 0) {
    process.stdout.write(`  ${C_DIM}(no gates defined)${C_RESET}\n`);
  }

  for (const g of gates) {
    const sym = g.passed ? SYM_OK : (g.severity === "warning" ? SYM_WARN : SYM_FAIL);
    const color = g.passed ? C_GREEN : (g.severity === "warning" ? C_YELLOW : C_RED);
    const id = g.id.padEnd(28);
    process.stdout.write(`  ${sym}  ${color}${id}${C_RESET} ${g.message}\n`);
  }

  const errors = gates.filter(g => !g.passed && g.severity === "error");
  const warnings = gates.filter(g => !g.passed && g.severity === "warning");

  process.stdout.write("\n");
  if (errors.length === 0 && warnings.length === 0) {
    process.stdout.write(`${C_GREEN}Result: PASSED${C_RESET}\n`);
  } else if (errors.length === 0) {
    process.stdout.write(`${C_YELLOW}Result: PASSED with ${warnings.length} warning(s)${C_RESET}\n`);
  } else {
    process.stdout.write(`${C_RED}Result: BLOCKED (${errors.length} error(s), ${warnings.length} warning(s))${C_RESET}\n`);
    process.stdout.write(`Fix the error(s) before proceeding.\n`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Gate accepts: gate [phase] [target-dir] --entry --exit --all --json
// Since parseCliArgs only supports one positional, we pre-extract
// the phase name if present and strip it from argv before parsing.
const rawArgs = process.argv.slice(2);
let phaseArg = "";
const filteredArgv = [process.argv[0], process.argv[1]];
let phaseConsumed = false;
for (const arg of rawArgs) {
  if (!phaseConsumed && PHASES.includes(arg)) {
    phaseArg = arg;
    phaseConsumed = true;
  } else {
    filteredArgv.push(arg);
  }
}

const parsed = parseCliArgs(filteredArgv, {
  booleanFlags: ["--entry", "--exit", "--all", "--json"],
});

if (parsed.flags.help) {
  process.stdout.write(`Usage:
  create-ai-os gate [target-dir]              Show gate status for current phase
  create-ai-os gate <phase> [target-dir]      Check exit gates for <phase>
  create-ai-os gate <phase> --entry           Check entry gates for <phase>
  create-ai-os gate --all [target-dir]        Check all phases
  create-ai-os gate --json                    JSON output

Phases: ${PHASES.join(", ")}
`);
  process.exit(0);
}

const flags = parsed.flags;
let targetArg = parsed.positional || "";

const targetDir = resolveTargetDir(targetArg || ".");
const jsonMode = !!flags.json;
const allResults = [];

if (flags.all) {
  for (const phase of PHASES) {
    const entryResult = runPhaseGates(phase, "entry", targetDir);
    const exitResult = runPhaseGates(phase, "exit", targetDir);
    printGateResults(entryResult, jsonMode);
    printGateResults(exitResult, jsonMode);
    allResults.push(entryResult, exitResult);
  }
} else {
  const phase = phaseArg || detectCurrentPhase(targetDir);
  const direction = flags.entry ? "entry" : "exit";
  const result = runPhaseGates(phase, direction, targetDir);
  printGateResults(result, jsonMode);
  allResults.push(result);
}

if (jsonMode) {
  process.stdout.write(JSON.stringify(allResults, null, 2) + "\n");
}

const hasBlocker = allResults.some(r =>
  r.gates.some(g => !g.passed && g.severity === "error")
);
process.exit(hasBlocker ? 1 : 0);
