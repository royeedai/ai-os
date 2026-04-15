#!/usr/bin/env node

/**
 * ai-os-upgrade — Upgrade a project's framework files to the latest AI-OS source.
 *
 * Usage:
 *   ai-os-upgrade [target-dir] [--force] [--dry-run] [--preflight] [--to-lanes]
 *   ai-os-upgrade --help
 */

const fs = require("fs");
const path = require("path");
const {
  FRAMEWORK_ROOT,
  PROJECT_MANAGED_FILES_MANIFEST,
  DEFAULT_LANE_ID,
  DELIVERY_MODEL_LEGACY,
  DELIVERY_MODEL_LANES,
  DELIVERY_MODEL_MIXED,
  detectInstallProfileName,
  detectFrameworkFootprint,
  readFrameworkVersion,
  readInstalledMeta,
  copyFileWithMode,
  getProjectTemplatePath,
  listManagedFiles,
  inspectProjectDeliveryLayout,
  listLegacyDeliveryArtifactEntries,
  getLaneFilePath,
  getLaneRelativePath,
  getLaneMetadataPath,
  getProjectFilePath,
  getProjectRelativePath,
  serializeSimpleToml,
  writeMetadata,
  writeManagedFilesManifest,
  appendGitignoreEntries,
  appendGitattributesEntries,
  generateIdeFiles,
  ensureDir,
  fail,
} = require("./shared");
const { computeDiff } = require("./ai-os-diff");
const {
  readMissionFile,
  readBaselineLogFile,
  parseTasksFile,
  parseAcceptanceFile,
} = require("./project-state");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-upgrade [target-dir] [--force] [--dry-run] [--preflight] [--to-lanes]

Upgrade a project's framework files to the latest AI-OS source.

Options:
  --force      Skip conflict check and overwrite all framework files
  --dry-run    Show what would be done without making changes
  --preflight  Check whether upgrade can proceed safely
  --to-lanes   Migrate legacy single-delivery project artifacts into .ai-os/lanes/default/
  -h, --help   Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let force = false;
let dryRun = false;
let preflight = false;
let toLanes = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--force") {
    force = true;
    continue;
  }
  if (arg === "--dry-run") {
    dryRun = true;
    continue;
  }
  if (arg === "--preflight") {
    preflight = true;
    continue;
  }
  if (arg === "--to-lanes") {
    toLanes = true;
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

// ---------------------------------------------------------------------------
// Pre-flight
// ---------------------------------------------------------------------------

const meta = readInstalledMeta(targetDir);
const installedManagedFiles = listManagedFiles(targetDir);
if (!meta.exists && installedManagedFiles.length === 0) {
  fail(
    `No ${getProjectRelativePath("framework.toml")} found in ${targetDir}.\n` +
    `Initialize the project first:\n` +
    `  npx --yes github:royeedai/ai-os ${targetDir === process.cwd() ? "." : targetDir}`
  );
}
if (meta.exists && meta.mode === "submodule") {
  fail(
    [
      "ai-os-upgrade does not manage submodule installations.",
      "Update the framework by moving the submodule pointer instead.",
    ].join("\n")
  );
}

const frameworkVersion = readFrameworkVersion();
const installProfileName = detectInstallProfileName(targetDir, { meta });
const frameworkFootprint = detectFrameworkFootprint(targetDir, {
  meta,
  managedFiles: installedManagedFiles,
});
const metadataManifestPath = getProjectFilePath(targetDir, PROJECT_MANAGED_FILES_MANIFEST);
const needsLocalMetadataRefresh =
  !meta.exists ||
  !fs.existsSync(metadataManifestPath) ||
  !meta.installProfile ||
  !meta.frameworkFootprint;

// ---------------------------------------------------------------------------
// Compute diff
// ---------------------------------------------------------------------------

const diff = computeDiff(targetDir);
const lanePlan = toLanes ? buildLegacyToLanesPlan(targetDir) : null;

const frameworkChangeCount = diff.modified.length + diff.outdated.length + diff.missing.length;
const laneChangeCount = lanePlan && !lanePlan.noop ? lanePlan.createdCount + lanePlan.moveCount : 0;
const totalChanges = frameworkChangeCount + laneChangeCount;

function printTeamConfigSummary(gitignoreAdded, gitattrsAdded) {
  if (!gitignoreAdded && !gitattrsAdded) {
    return;
  }
  process.stdout.write("Team collaboration config:\n");
  if (gitignoreAdded) {
    process.stdout.write("  + .gitignore: added AI-OS session file entries (STATE.md etc. are now local-only)\n");
  }
  if (gitattrsAdded) {
    process.stdout.write("  + .gitattributes: aligned merge strategies (kept memory.md merge=union, removed tasks.yaml merge=union)\n");
  }
  process.stdout.write("  Use --no-team-config on next init to opt out.\n\n");
}

function deriveLaneMetadataFromLegacy(targetDir) {
  const missionInfo = readMissionFile(targetDir);
  const baselineInfo = readBaselineLogFile(targetDir);
  const tasksInfo = parseTasksFile(getProjectFilePath(targetDir, "tasks.yaml"));
  const acceptanceInfo = parseAcceptanceFile(getProjectFilePath(targetDir, "acceptance.yaml"));

  const baselineId =
    missionInfo.currentBaselineId ||
    tasksInfo.baselineId ||
    acceptanceInfo.baselineId ||
    (baselineInfo.latestConfirmed && baselineInfo.latestConfirmed.id) ||
    "";
  const title = missionInfo.summaryFields["当前交付主题"] || "默认交付线";
  const qualityTier = acceptanceInfo.qualityTier || tasksInfo.qualityTier || "standard";

  return {
    id: DEFAULT_LANE_ID,
    title,
    status: "active",
    baseline_id: baselineId,
    quality_tier: qualityTier,
  };
}

function buildLegacyToLanesPlan(targetDir) {
  const layout = inspectProjectDeliveryLayout(targetDir);
  const laneId = DEFAULT_LANE_ID;

  if (layout.model === DELIVERY_MODEL_LANES) {
    return {
      requested: true,
      ok: true,
      noop: true,
      code: "already-lane-based",
      message: "Project already uses lane-based delivery artifacts.",
      layout,
      laneId,
      creates: [],
      moves: [],
      conflicts: [],
      laneMetadata: null,
      createdCount: 0,
      moveCount: 0,
    };
  }

  if (layout.model === DELIVERY_MODEL_MIXED) {
    return {
      requested: true,
      ok: false,
      noop: false,
      code: "mixed-layout",
      message: "Project contains both legacy root delivery artifacts and .ai-os/lanes/. Clean up the mixed layout before migrating.",
      layout,
      laneId,
      creates: [],
      moves: [],
      conflicts: [],
      laneMetadata: null,
      createdCount: 0,
      moveCount: 0,
    };
  }

  if (layout.model !== DELIVERY_MODEL_LEGACY) {
    return {
      requested: true,
      ok: false,
      noop: false,
      code: "no-legacy-delivery",
      message: "No legacy single-delivery project artifacts found to migrate. Use create-ai-os --profile project to initialize lane-based starter files.",
      layout,
      laneId,
      creates: [],
      moves: [],
      conflicts: [],
      laneMetadata: null,
      createdCount: 0,
      moveCount: 0,
    };
  }

  const creates = [];
  const conflicts = [];
  const moves = listLegacyDeliveryArtifactEntries(targetDir).map((entry) => {
    const toAbsolutePath = getLaneFilePath(targetDir, laneId, entry.relPath);
    const move = {
      kind: entry.kind,
      fromRelPath: entry.relativePath,
      fromAbsolutePath: entry.absolutePath,
      toRelPath: getLaneRelativePath(laneId, entry.relPath),
      toAbsolutePath,
    };
    if (fs.existsSync(toAbsolutePath)) {
      conflicts.push({
        relPath: move.toRelPath,
        absolutePath: toAbsolutePath,
        reason: "target already exists",
      });
    }
    return move;
  });

  const projectMdPath = getProjectFilePath(targetDir, "project.md");
  if (!fs.existsSync(projectMdPath)) {
    creates.push({
      kind: "file",
      relPath: getProjectRelativePath("project.md"),
      absolutePath: projectMdPath,
      templateRelPath: "project.md",
    });
  }

  const laneMetadataPath = getLaneMetadataPath(targetDir, laneId);
  if (fs.existsSync(laneMetadataPath)) {
    conflicts.push({
      relPath: getLaneRelativePath(laneId, "lane.toml"),
      absolutePath: laneMetadataPath,
      reason: "target already exists",
    });
  } else {
    creates.push({
      kind: "file",
      relPath: getLaneRelativePath(laneId, "lane.toml"),
      absolutePath: laneMetadataPath,
      templateRelPath: "lane.toml",
    });
  }

  return {
    requested: true,
    ok: conflicts.length === 0,
    noop: false,
    code: conflicts.length === 0 ? "migration-planned" : "migration-conflicts",
    message: conflicts.length === 0
      ? `Legacy delivery artifacts will be migrated into ${getLaneRelativePath(laneId)}.`
      : "Lane migration is blocked by existing target files.",
    layout,
    laneId,
    creates,
    moves,
    conflicts,
    laneMetadata: deriveLaneMetadataFromLegacy(targetDir),
    createdCount: creates.length,
    moveCount: moves.length,
  };
}

function printLegacyToLanesPlan(plan) {
  process.stdout.write("Legacy-to-lanes migration:\n");
  if (!plan) {
    process.stdout.write("  - not requested\n");
    return;
  }

  process.stdout.write(`  - status: ${plan.code}\n`);
  process.stdout.write(`  - ${plan.message}\n`);

  if (plan.moves.length > 0) {
    process.stdout.write(`  - move ${plan.moves.length} path(s):\n`);
    for (const move of plan.moves) {
      process.stdout.write(`    > ${move.fromRelPath} -> ${move.toRelPath}\n`);
    }
  }

  if (plan.creates.length > 0) {
    process.stdout.write(`  - create ${plan.creates.length} file(s):\n`);
    for (const entry of plan.creates) {
      process.stdout.write(`    + ${entry.relPath}\n`);
    }
  }

  if (plan.conflicts.length > 0) {
    process.stdout.write(`  - conflicts (${plan.conflicts.length}):\n`);
    for (const conflict of plan.conflicts) {
      process.stdout.write(`    ! ${conflict.relPath} (${conflict.reason})\n`);
    }
  }

  if (plan.laneMetadata) {
    process.stdout.write(
      `  - lane metadata: baseline_id=${plan.laneMetadata.baseline_id || "[missing]"}, quality_tier=${plan.laneMetadata.quality_tier}\n`
    );
  }
}

function executeLegacyToLanesMigration(plan) {
  if (!plan || plan.noop || !plan.ok) {
    return;
  }

  ensureDir(getLaneFilePath(targetDir, plan.laneId));

  for (const entry of plan.creates) {
    ensureDir(path.dirname(entry.absolutePath));
    if (entry.templateRelPath === "project.md") {
      copyFileWithMode(getProjectTemplatePath("project.md"), entry.absolutePath);
      continue;
    }
    if (entry.templateRelPath === "lane.toml") {
      fs.writeFileSync(entry.absolutePath, serializeSimpleToml(plan.laneMetadata), "utf8");
    }
  }

  const sortedMoves = [...plan.moves].sort((left, right) => {
    if (left.kind === right.kind) {
      return left.fromRelPath.localeCompare(right.fromRelPath);
    }
    return left.kind === "dir" ? -1 : 1;
  });

  for (const move of sortedMoves) {
    ensureDir(path.dirname(move.toAbsolutePath));
    fs.renameSync(move.fromAbsolutePath, move.toAbsolutePath);
  }
}

if (totalChanges === 0) {
  if (lanePlan && !lanePlan.ok) {
    process.stdout.write(`\nAlready up to date (v${frameworkVersion}).\n\n`);
    printLegacyToLanesPlan(lanePlan);
    process.stdout.write("\n");
    if (preflight) {
      process.stdout.write(`Preflight result: BLOCKED — ${lanePlan.message}.\n\n`);
      process.exit(1);
    }
    if (dryRun) {
      process.stdout.write(`\n--dry-run: no changes were made.\n\n`);
      process.exit(0);
    }
    fail(lanePlan.message);
  }

  let metadataRefreshed = false;
  if (!preflight && !dryRun && needsLocalMetadataRefresh) {
    writeMetadata(targetDir, {
      installProfile: installProfileName,
      frameworkFootprint,
    });
    writeManagedFilesManifest(targetDir, { frameworkFootprint });
    metadataRefreshed = true;
  }

  let gitignoreAdded = false;
  let gitattrsAdded = false;
  if (!preflight && !dryRun) {
    gitignoreAdded = appendGitignoreEntries(targetDir, { logger() {} });
    gitattrsAdded = appendGitattributesEntries(targetDir, { logger() {} });
  }

  process.stdout.write(
    metadataRefreshed
      ? `\nAlready up to date (v${frameworkVersion}). Refreshed local install metadata.\n\n`
      : `\nAlready up to date (v${frameworkVersion}).\n\n`
  );
  if (lanePlan && lanePlan.noop) {
    process.stdout.write("Lane migration: project already uses lane-based delivery artifacts.\n\n");
  }
  printTeamConfigSummary(gitignoreAdded, gitattrsAdded);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Show plan
// ---------------------------------------------------------------------------

process.stdout.write(`\nAI-OS upgrade: v${diff.targetVersion} → v${diff.sourceVersion}\n\n`);

if (diff.modified.length > 0) {
  process.stdout.write(`  Conflicts detected (${diff.modified.length}):\n`);
  for (const f of diff.modified) {
    process.stdout.write(`    ! ${f}\n`);
  }
  process.stdout.write(`  These files differ from the source and will only be overwritten with --force.\n`);
}

if (diff.outdated.length > 0) {
  process.stdout.write(`  Safe framework updates (${diff.outdated.length}):\n`);
  for (const f of diff.outdated) {
    process.stdout.write(`    ~ ${f}\n`);
  }
}

if (diff.missing.length > 0) {
  process.stdout.write(`  Files to create (${diff.missing.length}):\n`);
  for (const f of diff.missing) {
    process.stdout.write(`    + ${f}\n`);
  }
}

if (diff.extra.length > 0) {
  process.stdout.write(`  Extra files kept as-is (${diff.extra.length}):\n`);
  for (const f of diff.extra) {
    process.stdout.write(`    · ${f}\n`);
  }
}

if (lanePlan) {
  process.stdout.write("\n");
  printLegacyToLanesPlan(lanePlan);
}

if (preflight) {
  process.stdout.write("\n");
  if (diff.modified.length > 0 || (lanePlan && !lanePlan.ok)) {
    const reasons = [];
    if (diff.modified.length > 0) {
      reasons.push("framework-managed conflicts require --force");
    }
    if (lanePlan && !lanePlan.ok) {
      reasons.push(lanePlan.message);
    }
    process.stdout.write(`Preflight result: BLOCKED — ${reasons.join("; ")}.\n\n`);
    process.exit(1);
  }
  process.stdout.write(
    lanePlan && !lanePlan.noop
      ? "Preflight result: SAFE_TO_UPGRADE_AND_MIGRATE\n\n"
      : "Preflight result: SAFE_TO_UPGRADE\n\n"
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Dry-run exit
// ---------------------------------------------------------------------------

if (dryRun) {
  process.stdout.write(`\n--dry-run: no changes were made.\n\n`);
  process.exit(0);
}

if (lanePlan && !lanePlan.ok) {
  fail(lanePlan.message);
}

if (diff.modified.length > 0 && !force) {
  fail(
    [
      "Upgrade blocked by modified framework-managed files.",
      "Review the conflict list above.",
      "Use --dry-run to preview again, or rerun with --force to overwrite conflicts."
    ].join("\n")
  );
}

// ---------------------------------------------------------------------------
// Execute upgrade
// ---------------------------------------------------------------------------

const filesToWrite = force
  ? [...diff.modified, ...diff.outdated, ...diff.missing]
  : [...diff.outdated, ...diff.missing];

for (const rel of filesToWrite) {
  const src = path.join(FRAMEWORK_ROOT, rel);
  const dst = path.join(targetDir, rel);
  copyFileWithMode(src, dst);
}

if (lanePlan && !lanePlan.noop) {
  executeLegacyToLanesMigration(lanePlan);
}

writeMetadata(targetDir, {
  installProfile: installProfileName,
  frameworkFootprint,
});
writeManagedFilesManifest(targetDir, { frameworkFootprint });

generateIdeFiles(targetDir);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

process.stdout.write(`
Upgrade complete.

  Previous version: ${diff.targetVersion}
  Current version:  ${frameworkVersion}
  Target project:   ${targetDir}
  Updated files:    ${(force ? diff.modified.length : 0) + diff.outdated.length}
  Created files:    ${diff.missing.length}
`);

if (lanePlan && !lanePlan.noop) {
  process.stdout.write(`  Lane migration:  moved ${lanePlan.moveCount}, created ${lanePlan.createdCount}\n`);
}

if (diff.extra.length > 0) {
  process.stdout.write(`  Extra files:     ${diff.extra.length} (kept)\n`);
}

process.stdout.write("\n");

if (lanePlan && !lanePlan.noop) {
  process.stdout.write(
    `Legacy delivery artifacts now live under ${getLaneRelativePath(lanePlan.laneId)}/.\n` +
    `Review ${getProjectRelativePath("project.md")} and fill shared cross-lane project context if needed.\n\n`
  );
}

const gitignoreAdded = appendGitignoreEntries(targetDir, { logger() {} });
const gitattrsAdded = appendGitattributesEntries(targetDir, { logger() {} });
printTeamConfigSummary(gitignoreAdded, gitattrsAdded);
