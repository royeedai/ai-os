#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  QUALITY_TIERS,
  RISK_TIERS,
  ARCHIVE_OUTCOMES,
  LANE_SYNC_STATUSES,
  DEFAULT_LANE_ID,
  DELIVERY_MODEL_NONE,
  DELIVERY_MODEL_LEGACY,
  DELIVERY_MODEL_MIXED,
  LANE_STATUS_ACTIVE,
  LANE_STATUS_DRAFT,
  LANE_STATUS_ARCHIVED,
  createInitialBaselineContext,
  buildLaneMetadata,
  createLaneProjectFiles,
  fail,
  getLaneFilePath,
  inspectProjectDeliveryLayout,
  readInstalledMeta,
  resolveTargetDir,
  validateLaneId,
  writeLaneMetadata,
} = require("./shared");
const {
  parseAcceptanceFile,
  parseTasksFile,
  summarizeTasks,
} = require("./project-state");

const ACTIONS = new Set(["list", "add", "activate", "archive"]);

function printHelp() {
  process.stdout.write(`Usage:
  create-ai-os lane list [target-dir]
  create-ai-os lane add <lane-id> [target-dir] [--title <title>] [--quality-tier <tier>] [--risk-tier <tier>] [--owner <owner>] [--activate]
  create-ai-os lane activate <lane-id> [target-dir] [--only]
  create-ai-os lane archive <lane-id> [target-dir] --outcome <outcome> --reason <reason> [--memory-sync <status>] [--conventions-sync <status>] [--problem-ledger-sync <status>] [--force]

Manage multi-delivery lanes for a lane-based AI-OS project.

Options:
  --title <title>          Human-readable lane title for \`lane add\`
  --quality-tier <tier>    Lane quality tier for \`lane add\` (${QUALITY_TIERS.join(", ")})
  --risk-tier <tier>       Lane risk tier for \`lane add\` (${RISK_TIERS.join(", ")})
  --owner <owner>          Optional owner metadata for \`lane add\`
  --activate               Create the new lane as active instead of draft
  --only                   With \`lane activate\`, move other active lanes back to draft
  --outcome <outcome>      Archive outcome for \`lane archive\` (${ARCHIVE_OUTCOMES.join(", ")})
  --reason <reason>        Required archive reason for \`lane archive\`
  --memory-sync <status>   Shared memory sync status for \`lane archive\` (${LANE_SYNC_STATUSES.join(", ")})
  --conventions-sync <status>
                           Shared CONVENTIONS sync status for \`lane archive\` (${LANE_SYNC_STATUSES.join(", ")})
  --problem-ledger-sync <status>
                           AI-OS problem-ledger sync status for \`lane archive\` (${LANE_SYNC_STATUSES.join(", ")})
  --force                  Archive even when closure checks are still pending
  -h, --help               Show this help message
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    action: "",
    laneId: "",
    targetArg: "",
    flags: {
      title: "",
      "quality-tier": "",
      "risk-tier": "",
      owner: "",
      outcome: "",
      reason: "",
      "memory-sync": "",
      "conventions-sync": "",
      "problem-ledger-sync": "",
      activate: false,
      only: false,
      force: false,
      help: false,
    },
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      result.flags.help = true;
      continue;
    }
    if (!result.action) {
      result.action = arg;
      continue;
    }
    if (arg === "--activate") {
      result.flags.activate = true;
      continue;
    }
    if (arg === "--only") {
      result.flags.only = true;
      continue;
    }
    if (arg === "--force") {
      result.flags.force = true;
      continue;
    }
    if (
      arg === "--title" ||
      arg === "--quality-tier" ||
      arg === "--risk-tier" ||
      arg === "--owner" ||
      arg === "--outcome" ||
      arg === "--reason" ||
      arg === "--memory-sync" ||
      arg === "--conventions-sync" ||
      arg === "--problem-ledger-sync"
    ) {
      if (i + 1 >= args.length) {
        fail(`${arg} requires a value`);
      }
      result.flags[arg.replace(/^--/, "")] = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      fail(`unknown option: ${arg}`);
    }
    if (result.action !== "list" && !result.laneId) {
      result.laneId = arg;
      continue;
    }
    if (!result.targetArg) {
      result.targetArg = arg;
      continue;
    }
    fail(`unexpected argument: ${arg}`);
  }

  return result;
}

function ensureAiOsProject(targetDir, layout) {
  const installedMeta = readInstalledMeta(targetDir);
  const hasManagedFramework = fs.existsSync(path.join(targetDir, "AGENTS.md")) || installedMeta.exists;
  if (!hasManagedFramework && !layout.projectRootExists) {
    fail(`target directory is not an AI-OS project: ${targetDir}`);
  }
}

function requireLaneReadyLayout(targetDir, layout) {
  ensureAiOsProject(targetDir, layout);
  if (layout.model === DELIVERY_MODEL_LEGACY) {
    fail("Legacy single-delivery project does not support lane lifecycle commands.\nRun `create-ai-os upgrade . --to-lanes` first.");
  }
  if (layout.model === DELIVERY_MODEL_MIXED) {
    fail("Project contains mixed legacy and lane delivery artifacts.\nRun `create-ai-os upgrade . --to-lanes --preflight` and resolve the mixed layout first.");
  }
}

function formatLaneLine(lane) {
  const label = lane.title && lane.title !== lane.id ? `${lane.id} (${lane.title})` : lane.id;
  const meta = [`status=${lane.status || "unknown"}`];
  if (lane.baselineId) {
    meta.push(`baseline=${lane.baselineId}`);
  }
  if (lane.qualityTier) {
    meta.push(`quality=${lane.qualityTier}`);
  }
  if (lane.riskTier) {
    meta.push(`risk=${lane.hasExplicitRiskTier ? lane.riskTier : `${lane.riskTier} (derived)`}`);
  }
  if (lane.archiveOutcome) {
    meta.push(`outcome=${lane.archiveOutcome}`);
  }
  if (lane.owner) {
    meta.push(`owner=${lane.owner}`);
  }
  return `- ${label} [${meta.join(", ")}]`;
}

function printAutoSelection(layout) {
  const activeLanes = layout.lanes.filter((lane) => lane.isActive);
  if (activeLanes.length === 1) {
    process.stdout.write(`Auto-selection: ${activeLanes[0].id}\n`);
    return;
  }
  if (activeLanes.length > 1) {
    process.stdout.write(`Auto-selection: blocked (multiple active lanes: ${activeLanes.map((lane) => lane.id).join(", ")})\n`);
    return;
  }
  process.stdout.write("Auto-selection: blocked (no active lane)\n");
}

function printLaneList(targetDir, layout) {
  process.stdout.write(`\nAI-OS Lanes — ${targetDir}\n\n`);

  if (layout.model === DELIVERY_MODEL_LEGACY) {
    process.stdout.write("Delivery model: legacy single-delivery\n");
    process.stdout.write("Lane lifecycle commands become available after `create-ai-os upgrade . --to-lanes`.\n\n");
    return;
  }

  if (layout.model === DELIVERY_MODEL_MIXED) {
    process.stdout.write("Delivery model: mixed\n");
    process.stdout.write("Resolve the mixed legacy/lane layout before mutating lanes.\n\n");
  } else if (layout.model === DELIVERY_MODEL_NONE) {
    process.stdout.write("Delivery model: no lanes configured yet\n\n");
  } else {
    process.stdout.write("Delivery model: lanes\n");
    printAutoSelection(layout);
    process.stdout.write("\n");
  }

  if (layout.lanes.length === 0) {
    process.stdout.write(`No lanes configured.\nUse \`create-ai-os lane add ${DEFAULT_LANE_ID} ${targetDir}\` to create the first lane.\n`);
    return;
  }

  const activeCount = layout.lanes.filter((lane) => lane.status === LANE_STATUS_ACTIVE).length;
  const draftCount = layout.lanes.filter((lane) => lane.status === LANE_STATUS_DRAFT).length;
  const archivedCount = layout.lanes.filter((lane) => lane.status === LANE_STATUS_ARCHIVED).length;
  process.stdout.write(`Topology: ${activeCount} active, ${draftCount} draft, ${archivedCount} archived\n\n`);

  process.stdout.write("Configured lanes:\n");
  for (const lane of layout.lanes) {
    process.stdout.write(`${formatLaneLine(lane)}\n`);
    process.stdout.write(`  path: ${lane.relativePath}/\n`);
  }

  const lanesMissingOwner = layout.lanes.filter((lane) => !lane.owner);
  const lanesUsingDerivedRisk = layout.lanes.filter((lane) => !lane.hasExplicitRiskTier);
  const lanesWithInvalidRisk = layout.lanes.filter((lane) => !lane.riskTierValid);
  const lanesWithInvalidQuality = layout.lanes.filter((lane) => !lane.qualityTierValid);
  const archivedLanesWithPendingClosure = layout.lanes.filter((lane) => lane.closurePending);

  if (
    lanesMissingOwner.length > 0 ||
    lanesUsingDerivedRisk.length > 0 ||
    lanesWithInvalidRisk.length > 0 ||
    lanesWithInvalidQuality.length > 0 ||
    archivedLanesWithPendingClosure.length > 0
  ) {
    process.stdout.write("\nMetadata notes:\n");
    if (lanesMissingOwner.length > 0) {
      process.stdout.write(`- owner missing: ${lanesMissingOwner.map((lane) => lane.id).join(", ")}\n`);
    }
    if (lanesUsingDerivedRisk.length > 0) {
      process.stdout.write(`- risk tier derived from quality tier: ${lanesUsingDerivedRisk.map((lane) => lane.id).join(", ")}\n`);
    }
    if (lanesWithInvalidRisk.length > 0) {
      process.stdout.write(`- invalid risk tier value: ${lanesWithInvalidRisk.map((lane) => lane.id).join(", ")}\n`);
    }
    if (lanesWithInvalidQuality.length > 0) {
      process.stdout.write(`- invalid quality tier value: ${lanesWithInvalidQuality.map((lane) => lane.id).join(", ")}\n`);
    }
    if (archivedLanesWithPendingClosure.length > 0) {
      process.stdout.write(`- archive follow-up pending: ${archivedLanesWithPendingClosure.map((lane) => lane.id).join(", ")}\n`);
    }
  }

  if (layout.model === DELIVERY_MODEL_MIXED) {
    process.stdout.write("\nRun `create-ai-os upgrade . --to-lanes --preflight` before using `lane add/activate/archive`.\n");
  }
}

function validateQualityTier(value) {
  if (!value) {
    return "";
  }
  if (!QUALITY_TIERS.includes(value)) {
    fail(`unknown quality tier: ${value}\nExpected one of: ${QUALITY_TIERS.join(", ")}`);
  }
  return value;
}

function validateRiskTier(value) {
  if (!value) {
    return "";
  }
  if (!RISK_TIERS.includes(value)) {
    fail(`unknown risk tier: ${value}\nExpected one of: ${RISK_TIERS.join(", ")}`);
  }
  return value;
}

function validateArchiveOutcome(value) {
  if (!value) {
    return "";
  }
  if (!ARCHIVE_OUTCOMES.includes(value)) {
    fail(`unknown archive outcome: ${value}\nExpected one of: ${ARCHIVE_OUTCOMES.join(", ")}`);
  }
  return value;
}

function validateSyncStatus(flagName, value) {
  if (!value) {
    return "";
  }
  if (!LANE_SYNC_STATUSES.includes(value)) {
    fail(`unknown ${flagName} status: ${value}\nExpected one of: ${LANE_SYNC_STATUSES.join(", ")}`);
  }
  return value;
}

function isGatePassed(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "passed" || normalized === "approved" || normalized === "waived" || normalized === "not_applicable";
}

function readLaneClosureInputs(targetDir, laneId) {
  const tasks = parseTasksFile(getLaneFilePath(targetDir, laneId, "tasks.yaml"));
  const acceptance = parseAcceptanceFile(getLaneFilePath(targetDir, laneId, "acceptance.yaml"));
  return {
    tasks,
    acceptance,
    taskSummary: summarizeTasks(tasks.tasks || []),
    releasePlanExists: fs.existsSync(getLaneFilePath(targetDir, laneId, "release-plan.md")),
  };
}

function buildArchiveChecks(targetDir, lane, archiveMetadata) {
  const closureInputs = readLaneClosureInputs(targetDir, lane.id);
  const gateStatuses = closureInputs.acceptance.gateStatuses || {};
  const pendingReasons = [];
  const checklistLines = [
    "Archive checklist:",
    `- tasks: done=${closureInputs.taskSummary.done}, in-progress=${closureInputs.taskSummary.inProgress}, todo=${closureInputs.taskSummary.todo}, blocked=${closureInputs.taskSummary.blocked}`,
    `- delivery gate: ${gateStatuses["delivery-readiness"] || "[missing]"}`,
    `- release-plan.md: ${closureInputs.releasePlanExists ? "present" : "missing"}`,
    `- memory sync: ${archiveMetadata.memorySync}`,
    `- conventions sync: ${archiveMetadata.conventionsSync}`,
    `- problem-ledger sync: ${archiveMetadata.problemLedgerSync}`,
  ];

  if (archiveMetadata.outcome === "shipped") {
    if (closureInputs.taskSummary.todo > 0 || closureInputs.taskSummary.inProgress > 0 || closureInputs.taskSummary.blocked > 0) {
      pendingReasons.push("shipped lane still has unfinished tasks");
    }
    if (!isGatePassed(gateStatuses["delivery-readiness"])) {
      pendingReasons.push("delivery-readiness gate is not passed");
    }
    if (!closureInputs.releasePlanExists) {
      pendingReasons.push("release-plan.md missing for shipped lane");
    }
  }

  if (archiveMetadata.memorySync === "pending") {
    pendingReasons.push("memory sync still pending");
  }
  if (archiveMetadata.conventionsSync === "pending") {
    pendingReasons.push("CONVENTIONS sync still pending");
  }
  if (archiveMetadata.problemLedgerSync === "pending") {
    pendingReasons.push("problem-ledger sync still pending");
  }

  return {
    closureInputs,
    checklistLines,
    pendingReasons,
  };
}

function getLane(layout, laneId) {
  const normalizedLaneId = validateLaneId(laneId);
  const lane = layout.lanes.find((entry) => entry.id === normalizedLaneId);
  if (!lane) {
    fail(`unknown lane: ${normalizedLaneId}`);
  }
  return lane;
}

function saveLane(targetDir, lane, updates = {}) {
  const metadata = buildLaneMetadata(lane.id, {
    title: updates.title !== undefined ? updates.title : (lane.values.title || lane.title || lane.id),
    status: updates.status !== undefined ? updates.status : lane.status,
    baselineId: updates.baselineId !== undefined ? updates.baselineId : (lane.baselineId || ""),
    qualityTier: updates.qualityTier !== undefined ? updates.qualityTier : (lane.qualityTier || "standard"),
    riskTier: updates.riskTier !== undefined ? updates.riskTier : lane.riskTier,
    owner: updates.owner !== undefined ? updates.owner : lane.owner,
    archiveOutcome: updates.archiveOutcome !== undefined ? updates.archiveOutcome : lane.archiveOutcome,
    archiveReason: updates.archiveReason !== undefined ? updates.archiveReason : lane.archiveReason,
    archivedAt: updates.archivedAt !== undefined ? updates.archivedAt : lane.archivedAt,
    memorySync: updates.memorySync !== undefined ? updates.memorySync : lane.memorySync,
    conventionsSync: updates.conventionsSync !== undefined ? updates.conventionsSync : lane.conventionsSync,
    problemLedgerSync: updates.problemLedgerSync !== undefined ? updates.problemLedgerSync : lane.problemLedgerSync,
  });
  writeLaneMetadata(targetDir, lane.id, metadata);
}

const parsed = parseArgs(process.argv);
if (parsed.flags.help) {
  printHelp();
  process.exit(0);
}
if (!parsed.action) {
  printHelp();
  process.exit(1);
}
if (!ACTIONS.has(parsed.action)) {
  fail(`unknown lane action: ${parsed.action}`);
}

if (parsed.action === "list" && parsed.flags.activate) {
  fail("--activate only applies to `lane add`");
}
if (
  parsed.action !== "add" &&
  (parsed.flags.title || parsed.flags["quality-tier"] || parsed.flags["risk-tier"] || parsed.flags.owner)
) {
  fail("--title, --quality-tier, --risk-tier, and --owner only apply to `lane add`");
}
if (parsed.action !== "activate" && parsed.flags.only) {
  fail("--only only applies to `lane activate`");
}
if (
  parsed.action !== "archive" &&
  (
    parsed.flags.outcome ||
    parsed.flags.reason ||
    parsed.flags["memory-sync"] ||
    parsed.flags["conventions-sync"] ||
    parsed.flags["problem-ledger-sync"] ||
    parsed.flags.force
  )
) {
  fail("--outcome, --reason, --memory-sync, --conventions-sync, --problem-ledger-sync, and --force only apply to `lane archive`");
}
if (parsed.action !== "list" && !parsed.laneId) {
  fail(`lane id is required for \`lane ${parsed.action}\``);
}

const targetDir = resolveTargetDir(parsed.targetArg);
let layout = inspectProjectDeliveryLayout(targetDir);

if (parsed.action === "list") {
  ensureAiOsProject(targetDir, layout);
  printLaneList(targetDir, layout);
  process.stdout.write("\n");
  process.exit(0);
}

requireLaneReadyLayout(targetDir, layout);

if (parsed.action === "add") {
  const laneId = validateLaneId(parsed.laneId);
  if (layout.lanes.some((lane) => lane.id === laneId)) {
    fail(`lane already exists: ${laneId}`);
  }

  const qualityTier = validateQualityTier(parsed.flags["quality-tier"]);
  const riskTier = validateRiskTier(parsed.flags["risk-tier"]);
  const status = parsed.flags.activate
    ? LANE_STATUS_ACTIVE
    : (layout.lanes.length === 0 ? LANE_STATUS_ACTIVE : LANE_STATUS_DRAFT);
  const baselineContext = createInitialBaselineContext({ slug: laneId });
  const laneMetadata = buildLaneMetadata(laneId, {
    title: parsed.flags.title || undefined,
    status,
    baselineId: baselineContext.baselineId,
    qualityTier: qualityTier || "standard",
    riskTier,
    owner: parsed.flags.owner || undefined,
  });

  createLaneProjectFiles(targetDir, {
    laneId,
    baselineContext,
    laneMetadata,
    logger() {},
  });

  layout = inspectProjectDeliveryLayout(targetDir);
  const createdLane = getLane(layout, laneId);

  process.stdout.write(`\nCreated lane: ${laneId}\n`);
  process.stdout.write(`Status: ${createdLane.status}\n`);
  process.stdout.write(`Path: ${createdLane.relativePath}/\n`);
  process.stdout.write(`Baseline: ${createdLane.baselineId || "[missing]"}\n`);
  process.stdout.write(`Quality tier: ${createdLane.qualityTier || "[missing]"}\n`);
  process.stdout.write(`Risk tier: ${createdLane.riskTier || "[missing]"}\n`);
  process.stdout.write(`Owner: ${createdLane.owner || "[missing]"}\n`);

  const activeLanes = layout.lanes.filter((lane) => lane.isActive);
  if (activeLanes.length > 1) {
    process.stdout.write(`Active lanes now: ${activeLanes.map((lane) => lane.id).join(", ")}\n`);
    process.stdout.write(`Use \`create-ai-os status ${targetDir} --lane ${laneId}\` to work inside the new lane.\n`);
    process.stdout.write(`Run \`create-ai-os lane activate ${laneId} ${targetDir} --only\` later if you want to restore single-lane auto-selection.\n`);
  } else if (createdLane.isActive) {
    process.stdout.write(`Auto-selection now resolves to: ${laneId}\n`);
  } else {
    process.stdout.write(`Activate it later with \`create-ai-os lane activate ${laneId} ${targetDir}\`.\n`);
  }

  process.stdout.write("\n");
  process.exit(0);
}

if (layout.lanes.length === 0) {
  fail("no lanes are configured yet");
}

const lane = getLane(layout, parsed.laneId);

if (parsed.action === "activate") {
  let changed = false;
  const reopeningArchivedLane = lane.status === LANE_STATUS_ARCHIVED;

  if (!lane.isActive) {
    saveLane(targetDir, lane, { status: LANE_STATUS_ACTIVE });
    changed = true;
  }

  if (parsed.flags.only) {
    for (const otherLane of layout.lanes) {
      if (otherLane.id === lane.id || !otherLane.isActive) {
        continue;
      }
      saveLane(targetDir, otherLane, { status: LANE_STATUS_DRAFT });
      changed = true;
    }
  }

  layout = inspectProjectDeliveryLayout(targetDir);
  const activeLanes = layout.lanes.filter((entry) => entry.isActive);

  process.stdout.write(`\n${changed ? "Updated" : "Kept"} lane: ${lane.id}\n`);
  process.stdout.write(`Status: active\n`);
  if (parsed.flags.only) {
    process.stdout.write("Other active lanes were moved back to draft.\n");
  }
  if (reopeningArchivedLane) {
    process.stdout.write("Archived closure metadata was cleared while reopening the lane.\n");
  }
  if (activeLanes.length === 1) {
    process.stdout.write(`Auto-selection now resolves to: ${activeLanes[0].id}\n`);
  } else {
    process.stdout.write(`Active lanes now: ${activeLanes.map((entry) => entry.id).join(", ")}\n`);
    process.stdout.write(`Use \`create-ai-os status ${targetDir} --lane ${lane.id}\` for deterministic lane-scoped reads.\n`);
  }
  process.stdout.write("\n");
  process.exit(0);
}

if (parsed.action === "archive") {
  const archiveOutcome = validateArchiveOutcome(parsed.flags.outcome);
  const archiveReason = String(parsed.flags.reason || "").trim();
  const memorySync = validateSyncStatus("memory-sync", parsed.flags["memory-sync"]) ||
    (lane.status === LANE_STATUS_ARCHIVED ? (lane.memorySync || "pending") : "pending");
  const conventionsSync = validateSyncStatus("conventions-sync", parsed.flags["conventions-sync"]) ||
    (lane.status === LANE_STATUS_ARCHIVED ? (lane.conventionsSync || "pending") : "pending");
  const problemLedgerSync = validateSyncStatus("problem-ledger-sync", parsed.flags["problem-ledger-sync"]) ||
    (lane.status === LANE_STATUS_ARCHIVED ? (lane.problemLedgerSync || "pending") : "pending");
  const archivedAt = lane.status === LANE_STATUS_ARCHIVED && lane.archivedAt
    ? lane.archivedAt
    : new Date().toISOString().slice(0, 10);

  if (!archiveOutcome) {
    fail("`lane archive` requires --outcome <shipped|superseded|abandoned>");
  }
  if (!archiveReason) {
    fail("`lane archive` requires --reason <reason>");
  }

  const archiveChecks = buildArchiveChecks(targetDir, lane, {
    outcome: archiveOutcome,
    memorySync,
    conventionsSync,
    problemLedgerSync,
  });

  if (archiveChecks.pendingReasons.length > 0 && !parsed.flags.force) {
    process.stderr.write(`Archive checks blocked for lane: ${lane.id}\n`);
    process.stderr.write(`${archiveChecks.checklistLines.join("\n")}\n`);
    process.stderr.write("Pending items:\n");
    for (const reason of archiveChecks.pendingReasons) {
      process.stderr.write(`- ${reason}\n`);
    }
    process.stderr.write("Decide whether each stable conclusion should flow back to `.ai-os/memory.md`, `.ai-os/CONVENTIONS.md`, and, for AI-OS maintainer work, `docs/problem-ledger.md`.\n");
    process.stderr.write("Re-run with explicit sync decisions, or add `--force` if you intentionally want to archive with pending follow-up.\n");
    process.exit(1);
  }

  const wasOnlyActiveLane = layout.lanes.filter((entry) => entry.isActive).length === 1 && lane.isActive;
  if (lane.status !== LANE_STATUS_ARCHIVED) {
    saveLane(targetDir, lane, {
      status: LANE_STATUS_ARCHIVED,
      archiveOutcome,
      archiveReason,
      archivedAt,
      memorySync,
      conventionsSync,
      problemLedgerSync,
    });
  } else {
    saveLane(targetDir, lane, {
      archiveOutcome,
      archiveReason,
      archivedAt,
      memorySync,
      conventionsSync,
      problemLedgerSync,
    });
  }

  layout = inspectProjectDeliveryLayout(targetDir);
  const activeLanes = layout.lanes.filter((entry) => entry.isActive);
  const archivedLane = getLane(layout, lane.id);

  process.stdout.write(`\nArchived lane: ${lane.id}\n`);
  process.stdout.write(`Outcome: ${archivedLane.archiveOutcome || "[missing]"}\n`);
  process.stdout.write(`Archived at: ${archivedLane.archivedAt || "[missing]"}\n`);
  process.stdout.write(`Reason: ${archivedLane.archiveReason || "[missing]"}\n`);
  process.stdout.write(`Memory sync: ${archivedLane.memorySync || "[missing]"}\n`);
  process.stdout.write(`CONVENTIONS sync: ${archivedLane.conventionsSync || "[missing]"}\n`);
  process.stdout.write(`Problem-ledger sync: ${archivedLane.problemLedgerSync || "[missing]"}\n`);
  process.stdout.write(`${archiveChecks.checklistLines.join("\n")}\n`);
  if (archiveChecks.pendingReasons.length > 0) {
    process.stdout.write("Pending closure follow-up:\n");
    for (const reason of archiveChecks.pendingReasons) {
      process.stdout.write(`- ${reason}\n`);
    }
  }
  if (activeLanes.length === 0) {
    process.stdout.write("No active lane remains.\n");
    if (wasOnlyActiveLane) {
      process.stdout.write(`Restore auto-selection with \`create-ai-os lane activate ${lane.id} ${targetDir}\` or activate another lane.\n`);
    }
  } else if (activeLanes.length === 1) {
    process.stdout.write(`Auto-selection now resolves to: ${activeLanes[0].id}\n`);
  } else {
    process.stdout.write(`Active lanes now: ${activeLanes.map((entry) => entry.id).join(", ")}\n`);
  }
  process.stdout.write("\n");
  process.exit(0);
}
