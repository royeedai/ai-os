#!/usr/bin/env node

/**
 * ai-os-doctor — Check the health of an AI-OS enabled project.
 *
 * Usage:
 *   ai-os-doctor [target-dir]
 *   ai-os-doctor --help
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  PROJECT_CORE_ARTIFACT_DIRS,
  PROJECT_CORE_ARTIFACT_FILES,
  PROJECT_OPTIONAL_ARTIFACT_DIRS,
  PROJECT_OPTIONAL_ARTIFACT_FILES,
  detectInstallProfileName,
  detectFrameworkFootprint,
  getInstallProfile,
  readFrameworkVersion,
  listManagedFiles,
  listSourceManagedFiles,
  readInstalledMeta,
  parseCliArgs,
  resolveTargetDir,
  createReporter,
  resolveProjectLane,
  resolveDeliveryPath,
  formatDeliveryPath,
} = require("./shared");
const {
  readMissionFile,
  readBaselineLogFile,
} = require("./project-state");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const parsed = parseCliArgs(process.argv, {
  booleanFlags: ["--strict"],
  valuedFlags: ["--lane"],
});
if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-doctor [target-dir] [--strict] [--lane <lane-id>]

Check the health of an AI-OS enabled project.

Options:
  --strict          Also validate project-local delivery artifacts
  --lane <lane-id>  Check delivery artifacts for the specified lane
  -h, --help        Show this help message
`);
  process.exit(0);
}

const strict = parsed.flags.strict;
const targetDir = resolveTargetDir(parsed.positional);
const laneResolution = resolveProjectLane(targetDir, { laneId: parsed.flags.lane });
if (!laneResolution.ok && laneResolution.code !== "no-delivery-model") {
  process.stderr.write(`Error: ${laneResolution.message}\n`);
  process.exit(1);
}
const laneId = laneResolution.ok ? laneResolution.laneId : null;
const getArtifactPath = (dir, relPath) => resolveDeliveryPath(dir, relPath, { laneId });
const formatArtifactPath = (relPath) => formatDeliveryPath(relPath, { laneId });

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const reporter = createReporter();
const { report } = reporter;

const frameworkVersion = readFrameworkVersion();
const mission = readMissionFile(targetDir, { artifactPathResolver: getArtifactPath });
const baselineLog = readBaselineLogFile(targetDir, { artifactPathResolver: getArtifactPath });

process.stdout.write(`\nAI-OS Doctor — ${targetDir}\n`);
process.stdout.write(`Source framework version: ${frameworkVersion}\n\n`);
if (laneId) {
  process.stdout.write(`Delivery model: ${laneResolution.model} (lane: ${laneId})\n\n`);
} else if (laneResolution.ok && laneResolution.isLegacyFallback) {
  process.stdout.write("Delivery model: legacy single-delivery\n\n");
}

if (laneResolution.ok && laneResolution.lane) {
  const selectedLane = laneResolution.lane;
  const allLanes = laneResolution.layout && Array.isArray(laneResolution.layout.lanes)
    ? laneResolution.layout.lanes
    : [];
  const activeCount = allLanes.filter((lane) => lane.isActive).length;
  const draftCount = allLanes.filter((lane) => lane.status === "draft").length;
  const archivedCount = allLanes.filter((lane) => lane.status === "archived").length;

  process.stdout.write("Lane metadata:\n");
  process.stdout.write(`- path: ${selectedLane.relativePath}/\n`);
  process.stdout.write(`- status: ${selectedLane.status || "unknown"}\n`);
  process.stdout.write(`- baseline: ${selectedLane.baselineId || "missing"}\n`);
  process.stdout.write(`- quality tier: ${selectedLane.qualityTier || "missing"}\n`);
  process.stdout.write(`- risk tier: ${selectedLane.riskTier || "missing"}${selectedLane.hasExplicitRiskTier ? "" : " (derived from quality tier)"}\n`);
  process.stdout.write(`- owner: ${selectedLane.owner || "missing"}\n`);
  if (selectedLane.status === "archived") {
    process.stdout.write(`- archive outcome: ${selectedLane.archiveOutcome || "missing"}\n`);
    process.stdout.write(`- archived at: ${selectedLane.archivedAt || "missing"}\n`);
    process.stdout.write(`- archive reason: ${selectedLane.archiveReason || "missing"}\n`);
    process.stdout.write(`- memory sync: ${selectedLane.memorySync || "missing"}\n`);
    process.stdout.write(`- conventions sync: ${selectedLane.conventionsSync || "missing"}\n`);
    process.stdout.write(`- problem-ledger sync: ${selectedLane.problemLedgerSync || "missing"}\n`);
  }
  if (allLanes.length > 1) {
    process.stdout.write(`- topology: ${activeCount} active / ${draftCount} draft / ${archivedCount} archived\n`);
  }
  process.stdout.write("\n");
}

// 1. Metadata
const meta = readInstalledMeta(targetDir);
const installedManagedFiles = listManagedFiles(targetDir);
if (meta.exists) {
  report(true, ".ai-os/framework.toml exists");
} else if (installedManagedFiles.length > 0) {
  report(
    false,
    ".ai-os/framework.toml missing; install metadata will be inferred from framework files",
    { warnOnly: true }
  );
} else {
  report(false, ".ai-os/framework.toml exists");
}

if (meta.exists) {
  const versionMatch = meta.version === frameworkVersion;
  report(
    versionMatch,
    `Framework version: ${meta.version}${versionMatch ? "" : ` (source is ${frameworkVersion})`}`,
    { warnOnly: !versionMatch }
  );
}

let installedProfile = null;
try {
  installedProfile = getInstallProfile(detectInstallProfileName(targetDir, { meta }));
  if (installedManagedFiles.length > 0 || meta.exists) {
    process.stdout.write(`Install profile: ${installedProfile.name}${meta.exists ? "" : " (inferred)"}\n`);
  }
} catch (error) {
  report(false, `Unknown install profile in metadata: ${meta.installProfile || error.message}`, {
    warnOnly: true,
  });
}

const frameworkFootprint = detectFrameworkFootprint(targetDir, {
  meta,
  managedFiles: installedManagedFiles,
});
if (installedManagedFiles.length > 0) {
  process.stdout.write(
    `Framework footprint: ${frameworkFootprint}${meta.exists ? "" : " (inferred)"}\n`
  );
}

// 2. AGENTS.md
report(
  fs.existsSync(path.join(targetDir, "AGENTS.md")),
  "AGENTS.md exists"
);

// 3. .agents/skills/
const skillsDir = path.join(targetDir, ".agents", "skills");
const skillsOk = fs.existsSync(skillsDir) &&
  fs.readdirSync(skillsDir).filter((e) => e !== ".DS_Store").length > 0;
report(skillsOk, ".agents/skills/ exists and is not empty");

// 4. .agents/workflows/
const workflowsDir = path.join(targetDir, ".agents", "workflows");
const workflowsOk = fs.existsSync(workflowsDir) &&
  fs.readdirSync(workflowsDir).filter((e) => e !== ".DS_Store").length > 0;
report(workflowsOk, ".agents/workflows/ exists and is not empty");

// 5. Managed files integrity
const sourceManaged = listSourceManagedFiles({ frameworkFootprint });
const missingFiles = [];
for (const rel of sourceManaged) {
  if (!fs.existsSync(path.join(targetDir, rel))) {
    missingFiles.push(rel);
  }
}

if (missingFiles.length === 0) {
  report(
    true,
    `All ${sourceManaged.length} framework-managed files present${frameworkFootprint === "lite" ? " for lite footprint" : ""}`
  );
} else {
  report(false, `${missingFiles.length} framework-managed file(s) missing`, { details: missingFiles });
}

// 6. Project state files (warn only)
process.stdout.write(`\n  Core project state files:\n`);
const coreProjectFiles = [
  ...PROJECT_CORE_ARTIFACT_FILES.map((relPath) => ({
    path: getArtifactPath(targetDir, relPath),
    label: formatArtifactPath(relPath),
  })),
  ...PROJECT_CORE_ARTIFACT_DIRS.map((relPath) => ({
    path: getArtifactPath(targetDir, relPath),
    label: `${formatArtifactPath(relPath)}/`,
    isDir: true,
  })),
];

let projectArtifactsPresent = false;

for (const pf of coreProjectFiles) {
  const fullPath = pf.path;
  const exists = pf.isDir
    ? fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()
    : fs.existsSync(fullPath);
  if (exists) {
    projectArtifactsPresent = true;
    report(true, pf.label);
    continue;
  }
  if (installedProfile && !installedProfile.includeProjectFiles) {
    report(true, `${pf.label} (optional in core profile)`);
    continue;
  }
  report(false, pf.label, { warnOnly: true });
}

const optionalProjectFiles = [
  ...PROJECT_OPTIONAL_ARTIFACT_FILES.map((relPath) => ({
    path: getArtifactPath(targetDir, relPath),
    label: formatArtifactPath(relPath),
  })),
  ...PROJECT_OPTIONAL_ARTIFACT_DIRS.map((relPath) => ({
    path: getArtifactPath(targetDir, relPath),
    label: `${formatArtifactPath(relPath)}/`,
    isDir: true,
  })),
];

const existingOptional = optionalProjectFiles.filter((pf) => {
  if (pf.isDir) {
    return fs.existsSync(pf.path) && fs.statSync(pf.path).isDirectory();
  }
  return fs.existsSync(pf.path);
});

if (existingOptional.length > 0) {
  process.stdout.write(`\n  Optional project state files:\n`);
  for (const pf of existingOptional) {
    report(true, pf.label, { warnOnly: true });
  }
}

if (mission.exists || baselineLog.exists) {
  process.stdout.write(`\n  Baseline summary:\n`);
  process.stdout.write(`  - Mission 当前基线 ID: ${mission.currentBaselineId || "未记录"}\n`);
  if (baselineLog.latestConfirmed) {
    process.stdout.write(`  - Latest confirmed baseline: ${baselineLog.latestConfirmed.id}\n`);
    process.stdout.write(`  - Summary: ${baselineLog.latestConfirmed.summary || "未记录"}\n`);
  } else if (baselineLog.exists) {
    process.stdout.write("  - Latest confirmed baseline: 未记录\n");
  }
}

if (laneResolution.ok && laneResolution.lane) {
  const selectedLane = laneResolution.lane;
  report(selectedLane.metadataExists, `${selectedLane.metadataRelativePath} exists`, {
    warnOnly: !selectedLane.metadataExists,
  });
  report(
    selectedLane.qualityTierValid,
    `Lane quality tier is valid${selectedLane.qualityTier ? `: ${selectedLane.qualityTier}` : ""}`,
    { warnOnly: !selectedLane.qualityTierValid }
  );
  report(
    selectedLane.riskTierValid,
    `Lane risk tier is valid${selectedLane.riskTier ? `: ${selectedLane.riskTier}` : ""}`,
    { warnOnly: !selectedLane.riskTierValid }
  );
  const warnOnMissingOwner = laneResolution.layout && Array.isArray(laneResolution.layout.lanes) && laneResolution.layout.lanes.length > 1;
  report(
    Boolean(selectedLane.owner),
    selectedLane.owner ? `Lane owner recorded: ${selectedLane.owner}` : "Lane owner missing from lane.toml",
    { warnOnly: warnOnMissingOwner || !selectedLane.owner }
  );
  if (selectedLane.status === "archived") {
    report(Boolean(selectedLane.archiveOutcome), "Archived lane records archive outcome", {
      warnOnly: !selectedLane.archiveOutcome,
    });
    report(Boolean(selectedLane.archiveReason), "Archived lane records archive reason", {
      warnOnly: !selectedLane.archiveReason,
    });
    report(Boolean(selectedLane.archivedAt), "Archived lane records archived_at", {
      warnOnly: !selectedLane.archivedAt,
    });
    report(
      selectedLane.memorySyncValid,
      `Archived lane memory sync is valid${selectedLane.memorySync ? `: ${selectedLane.memorySync}` : ""}`,
      { warnOnly: !selectedLane.memorySyncValid || selectedLane.memorySync === "pending" }
    );
    report(
      selectedLane.conventionsSyncValid,
      `Archived lane CONVENTIONS sync is valid${selectedLane.conventionsSync ? `: ${selectedLane.conventionsSync}` : ""}`,
      { warnOnly: !selectedLane.conventionsSyncValid || selectedLane.conventionsSync === "pending" }
    );
    report(
      selectedLane.problemLedgerSyncValid,
      `Archived lane problem-ledger sync is valid${selectedLane.problemLedgerSync ? `: ${selectedLane.problemLedgerSync}` : ""}`,
      { warnOnly: !selectedLane.problemLedgerSyncValid || selectedLane.problemLedgerSync === "pending" }
    );
  }
}

if (strict) {
  process.stdout.write(`\n  Strict validation:\n`);
  const shouldValidateProjectArtifacts =
    !installedProfile || installedProfile.includeProjectFiles || projectArtifactsPresent;

  if (!shouldValidateProjectArtifacts) {
    process.stdout.write("  skipped: project artifacts were not installed by this profile\n");
  } else {
    const validateArgs = [path.join(__dirname, "ai-os-validate.js"), targetDir];
    if (laneId) {
      validateArgs.push("--lane", laneId);
    }
    const validateResult = spawnSync(
      process.execPath,
      validateArgs,
      { stdio: "inherit" }
    );
    if (validateResult.status !== 0) {
      reporter.markFailure();
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

process.stdout.write("\n");
if (reporter.hasFailure) {
  process.stdout.write("Result: UNHEALTHY — some checks failed.\n");
  process.stdout.write("Run `create-ai-os upgrade` to fix framework file issues.\n\n");
  process.exit(1);
} else {
  process.stdout.write("Result: HEALTHY\n\n");
  process.exit(0);
}
