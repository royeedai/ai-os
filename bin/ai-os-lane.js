#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  QUALITY_TIERS,
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
  inspectProjectDeliveryLayout,
  readInstalledMeta,
  resolveTargetDir,
  validateLaneId,
  writeLaneMetadata,
} = require("./shared");

const ACTIONS = new Set(["list", "add", "activate", "archive"]);

function printHelp() {
  process.stdout.write(`Usage:
  create-ai-os lane list [target-dir]
  create-ai-os lane add <lane-id> [target-dir] [--title <title>] [--quality-tier <tier>] [--owner <owner>] [--activate]
  create-ai-os lane activate <lane-id> [target-dir] [--only]
  create-ai-os lane archive <lane-id> [target-dir]

Manage multi-delivery lanes for a lane-based AI-OS project.

Options:
  --title <title>          Human-readable lane title for \`lane add\`
  --quality-tier <tier>    Lane quality tier for \`lane add\` (${QUALITY_TIERS.join(", ")})
  --owner <owner>          Optional owner metadata for \`lane add\`
  --activate               Create the new lane as active instead of draft
  --only                   With \`lane activate\`, move other active lanes back to draft
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
      owner: "",
      activate: false,
      only: false,
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
    if (arg === "--title" || arg === "--quality-tier" || arg === "--owner") {
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

  process.stdout.write("Configured lanes:\n");
  for (const lane of layout.lanes) {
    process.stdout.write(`${formatLaneLine(lane)}\n`);
    process.stdout.write(`  path: ${lane.relativePath}/\n`);
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
    owner: updates.owner !== undefined ? updates.owner : lane.owner,
  });
  writeLaneMetadata(targetDir, lane.id, metadata);
}

const parsed = parseArgs(process.argv);
if (parsed.flags.help || !parsed.action) {
  printHelp();
  process.exit(parsed.action ? 0 : 1);
}
if (!ACTIONS.has(parsed.action)) {
  fail(`unknown lane action: ${parsed.action}`);
}

if (parsed.action === "list" && parsed.flags.activate) {
  fail("--activate only applies to `lane add`");
}
if (parsed.action !== "add" && (parsed.flags.title || parsed.flags["quality-tier"] || parsed.flags.owner)) {
  fail("--title, --quality-tier, and --owner only apply to `lane add`");
}
if (parsed.action !== "activate" && parsed.flags.only) {
  fail("--only only applies to `lane activate`");
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
  const status = parsed.flags.activate
    ? LANE_STATUS_ACTIVE
    : (layout.lanes.length === 0 ? LANE_STATUS_ACTIVE : LANE_STATUS_DRAFT);
  const baselineContext = createInitialBaselineContext({ slug: laneId });
  const laneMetadata = buildLaneMetadata(laneId, {
    title: parsed.flags.title || undefined,
    status,
    baselineId: baselineContext.baselineId,
    qualityTier: qualityTier || "standard",
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
  const wasOnlyActiveLane = layout.lanes.filter((entry) => entry.isActive).length === 1 && lane.isActive;
  if (lane.status !== LANE_STATUS_ARCHIVED) {
    saveLane(targetDir, lane, { status: LANE_STATUS_ARCHIVED });
  }

  layout = inspectProjectDeliveryLayout(targetDir);
  const activeLanes = layout.lanes.filter((entry) => entry.isActive);

  process.stdout.write(`\nArchived lane: ${lane.id}\n`);
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
