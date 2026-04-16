/**
 * AI-OS CLI — shared utilities
 *
 * Common helpers used by create-ai-os, plan, doctor, diff, and upgrade commands.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const FRAMEWORK_ROOT = path.join(PACKAGE_ROOT, "framework");
const INSTALL_PROFILES_MANIFEST = path.join(PACKAGE_ROOT, "manifests", "install-profiles.json");
const MANAGED_ROOTS = ["AGENTS.md", ".agents"];
const PROJECT_STATE_ROOT = ".ai-os";
const PROJECT_METADATA_FILE = "framework.toml";
const PROJECT_MANAGED_FILES_MANIFEST = "managed-files.tsv";
const PROJECT_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "project");
const LANE_TEMPLATE_ROOT = path.join(FRAMEWORK_ROOT, ".agents", "templates", "lane");
const BASELINE_LOG_TEMPLATE_FILE = path.posix.join("baseline-log", "BL-template.md");
const INITIAL_BASELINE_SLUG = "initial-baseline";
const LANES_DIR = "lanes";
const LANE_METADATA_FILE = "lane.toml";
const DEFAULT_LANE_ID = "default";
const LANE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const LANE_STATUS_ACTIVE = "active";
const LANE_STATUS_DRAFT = "draft";
const LANE_STATUS_ARCHIVED = "archived";
const LANE_STATUSES = [LANE_STATUS_ACTIVE, LANE_STATUS_DRAFT, LANE_STATUS_ARCHIVED];
const TEMPLATE_TOKEN_INITIAL_BASELINE_ID = "{{INITIAL_BASELINE_ID}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_FILE = "{{INITIAL_BASELINE_FILE}}";
const TEMPLATE_TOKEN_INITIAL_BASELINE_DATE = "{{INITIAL_BASELINE_DATE}}";
let CURRENT_DELIVERY_LANE_ID = "";

const DELIVERY_MODEL_NONE = "none";
const DELIVERY_MODEL_LEGACY = "legacy";
const DELIVERY_MODEL_LANES = "lanes";
const DELIVERY_MODEL_MIXED = "mixed";

const PROJECT_CORE_ARTIFACT_FILES = [
  "MISSION.md",
  "DESIGN.md",
  "CONVENTIONS.md",
  "tasks.yaml",
  "acceptance.yaml",
  "STATE.md",
  "memory.md",
];
const PROJECT_OPTIONAL_ARTIFACT_FILES = [
  "risk-register.md",
  "release-plan.md",
  "verification-matrix.yaml",
];
const PROJECT_CORE_ARTIFACT_DIRS = ["baseline-log", "specs"];
const PROJECT_OPTIONAL_ARTIFACT_DIRS = ["design-pack", "evals"];
const PROJECT_ARTIFACT_FILES = [
  ...PROJECT_CORE_ARTIFACT_FILES,
  ...PROJECT_OPTIONAL_ARTIFACT_FILES,
];
const PROJECT_ARTIFACT_DIRS = [
  ...PROJECT_CORE_ARTIFACT_DIRS,
  ...PROJECT_OPTIONAL_ARTIFACT_DIRS,
];
const LEGACY_DELIVERY_ARTIFACT_FILES = [
  "MISSION.md",
  "DESIGN.md",
  "tasks.yaml",
  "acceptance.yaml",
  "STATE.md",
  "baseline-log.md",
  "risk-register.md",
  "release-plan.md",
  "verification-matrix.yaml",
];
const LEGACY_DELIVERY_ARTIFACT_DIRS = [
  "baseline-log",
  "specs",
  "design-pack",
  "evals",
];
const LANE_CORE_ARTIFACT_FILES = [
  "MISSION.md",
  "DESIGN.md",
  "tasks.yaml",
  "acceptance.yaml",
  "STATE.md",
];
const LANE_OPTIONAL_ARTIFACT_FILES = [
  "risk-register.md",
  "release-plan.md",
  "verification-matrix.yaml",
];
const LANE_CORE_ARTIFACT_DIRS = ["baseline-log", "specs"];
const LANE_OPTIONAL_ARTIFACT_DIRS = ["design-pack", "evals"];
const LANE_ARTIFACT_FILES = [
  ...LANE_CORE_ARTIFACT_FILES,
  ...LANE_OPTIONAL_ARTIFACT_FILES,
];
const LANE_ARTIFACT_DIRS = [
  ...LANE_CORE_ARTIFACT_DIRS,
  ...LANE_OPTIONAL_ARTIFACT_DIRS,
];
const LITE_INCLUDES = [
  "AGENTS.md",
  // workflows: all phases + key specialized/continue
  ".agents/workflows/AGENTS.md",
  ".agents/workflows/align.md",
  ".agents/workflows/design.md",
  ".agents/workflows/plan.md",
  ".agents/workflows/build.md",
  ".agents/workflows/verify.md",
  ".agents/workflows/ship.md",
  ".agents/workflows/debug.md",
  ".agents/workflows/change-request.md",
  ".agents/workflows/resume.md",
  ".agents/workflows/status.md",
  // YAML gate definitions
  ".agents/workflows/pipeline.yaml",
  ".agents/workflows/align.yaml",
  ".agents/workflows/design.yaml",
  ".agents/workflows/plan.yaml",
  ".agents/workflows/build.yaml",
  ".agents/workflows/verify.yaml",
  ".agents/workflows/ship.yaml",
  // skills: only those referenced by workflows
  ".agents/skills/AGENTS.md",
  ".agents/skills/project-planner/SKILL.md",
  ".agents/skills/acceptance-gate/SKILL.md",
  ".agents/skills/memory-manager/SKILL.md",
  ".agents/skills/spec-validator/SKILL.md",
  ".agents/skills/task-orchestrator/SKILL.md",
  ".agents/skills/code-review-guard/SKILL.md",
  ".agents/skills/fullstack-dev-checklist/SKILL.md",
  ".agents/skills/testing-strategies/SKILL.md",
  ".agents/skills/release-manager/SKILL.md",
  ".agents/skills/subagent-executor/SKILL.md",
  ".agents/skills/reverse-engineer/SKILL.md",
  // references and policies
  ".agents/references/derived-rules.md",
  ".agents/references/risk-triggers.md",
  ".agents/policies/approval-policy.md",
];
const LITE_DIR_PREFIXES = [
  ".agents/templates/",
];

const QUICK_INCLUDES = [
  "AGENTS.md",
  ".agents/workflows/AGENTS.md",
  ".agents/workflows/align.md",
  ".agents/workflows/design.md",
  ".agents/workflows/plan.md",
  ".agents/workflows/build.md",
  ".agents/workflows/verify.md",
  ".agents/workflows/pipeline.yaml",
  ".agents/workflows/align.yaml",
  ".agents/workflows/design.yaml",
  ".agents/workflows/plan.yaml",
  ".agents/workflows/build.yaml",
  ".agents/workflows/verify.yaml",
  ".agents/workflows/ship.yaml",
];
const QUICK_PROJECT_FILES = [
  "MISSION.md",
  "STATE.md",
];
const QUICK_PROJECT_DIRS = [
  "baseline-log",
];

// ---------------------------------------------------------------------------
// Lane-based project layout: shared root vs lane-scoped files
// ---------------------------------------------------------------------------

// Files installed to .ai-os/ root (shared across all lanes)
const PROJECT_SHARED_FILES = [
  "project.md",
  "CONVENTIONS.md",
  "memory.md",
];

// Files installed into .ai-os/lanes/<id>/ (per-lane delivery artifacts)
const LANE_DELIVERY_FILES = [...LANE_CORE_ARTIFACT_FILES];
const LANE_DELIVERY_DIRS = [...LANE_CORE_ARTIFACT_DIRS];

const QUALITY_TIERS = ["exploratory", "standard", "high-risk"];
const RISK_TIERS = ["low", "medium", "high"];
const IMPACT_TAGS = [
  "entrypoint",
  "transport",
  "gateway",
  "auth",
  "schema",
  "mapping",
  "storage",
  "runtime-config",
  "external-dependency",
  "state-transition",
  "async-processing",
];
const HIGH_RISK_SPECIAL_REVIEWS = [
  "security-guard",
  "authorization-boundary-check",
  "concurrency-safety-check",
];

// ---------------------------------------------------------------------------
// Team collaboration: .gitignore / .gitattributes entries
// ---------------------------------------------------------------------------

const GITIGNORE_MARKER = "# AI-OS session & metadata";
const GITIGNORE_ENTRIES = [
  `${GITIGNORE_MARKER}`,
  `${PROJECT_STATE_ROOT}/STATE.md`,
  `${PROJECT_STATE_ROOT}/context-snapshot.md`,
  `${PROJECT_STATE_ROOT}/codebase-map.md`,
  `${PROJECT_STATE_ROOT}/${LANES_DIR}/*/STATE.md`,
  `${PROJECT_STATE_ROOT}/${LANES_DIR}/*/context-snapshot.md`,
  `${PROJECT_STATE_ROOT}/${LANES_DIR}/*/codebase-map.md`,
  `${PROJECT_STATE_ROOT}/${PROJECT_METADATA_FILE}`,
  `${PROJECT_STATE_ROOT}/${PROJECT_MANAGED_FILES_MANIFEST}`,
  "# IDE integration files (CLAUDE.md, GEMINI.md, .cursor/) are team-shareable — do NOT gitignore them",
];

const GITATTRIBUTES_MARKER = "# AI-OS merge strategies";
const GITATTRIBUTES_ENTRIES = [
  `${GITATTRIBUTES_MARKER}`,
  `${PROJECT_STATE_ROOT}/memory.md merge=union`,
];
const OBSOLETE_GITATTRIBUTES_ENTRIES = [
  `${PROJECT_STATE_ROOT}/tasks.yaml merge=union`,
];

/**
 * Append AI-OS entries to .gitignore if not already present.
 * Idempotent — skips if the marker comment is found.
 */
function appendGitignoreEntries(targetDir, options = {}) {
  const { logger = defaultLogger } = options;
  const gitignorePath = path.join(targetDir, ".gitignore");

  let existing = "";
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, "utf8");
    if (existing.includes(GITIGNORE_MARKER)) {
      logger("skip .gitignore (AI-OS entries already present)");
      return false;
    }
  }

  const separator = existing && !existing.endsWith("\n") ? "\n\n" : existing ? "\n" : "";
  fs.writeFileSync(
    gitignorePath,
    existing + separator + GITIGNORE_ENTRIES.join("\n") + "\n",
    "utf8"
  );
  logger("appended AI-OS session entries to .gitignore");
  return true;
}

/**
 * Align AI-OS merge strategy entries in .gitattributes.
 * Adds missing current entries, removes obsolete ones, and inserts the marker
 * block when absent.  Idempotent — skips when all entries are already aligned.
 */
function appendGitattributesEntries(targetDir, options = {}) {
  const { logger = defaultLogger } = options;
  const gitattrsPath = path.join(targetDir, ".gitattributes");

  let existing = "";
  if (fs.existsSync(gitattrsPath)) {
    existing = fs.readFileSync(gitattrsPath, "utf8");
  }

  let nextContent = existing;
  let changed = false;

  for (const obsoleteEntry of OBSOLETE_GITATTRIBUTES_ENTRIES) {
    const obsoletePattern = new RegExp(`^${escapeRegExp(obsoleteEntry)}\\r?\\n?`, "gm");
    if (obsoletePattern.test(nextContent)) {
      nextContent = nextContent.replace(obsoletePattern, "");
      changed = true;
    }
  }

  if (nextContent.includes(GITATTRIBUTES_MARKER)) {
    for (const entry of GITATTRIBUTES_ENTRIES.slice(1)) {
      if (!nextContent.includes(entry)) {
        nextContent = nextContent.replace(
          GITATTRIBUTES_MARKER,
          `${GITATTRIBUTES_MARKER}\n${entry}`
        );
        changed = true;
      }
    }
  } else {
    const separator = nextContent && !nextContent.endsWith("\n") ? "\n\n" : nextContent ? "\n" : "";
    nextContent += separator + GITATTRIBUTES_ENTRIES.join("\n") + "\n";
    changed = true;
  }

  if (!changed) {
    logger("skip .gitattributes (AI-OS entries already aligned)");
    return false;
  }

  if (nextContent && !nextContent.endsWith("\n")) {
    nextContent += "\n";
  }
  fs.writeFileSync(gitattrsPath, nextContent, "utf8");
  logger("aligned AI-OS merge strategies in .gitattributes");
  return true;
}

// ---------------------------------------------------------------------------
// Read metadata from the AI-OS source (mother repo)
// ---------------------------------------------------------------------------

function readFrameworkVersion() {
  const versionPath = path.join(PACKAGE_ROOT, "VERSION");
  if (!fs.existsSync(versionPath)) {
    fail(`VERSION file not found at ${versionPath}`);
  }
  return fs.readFileSync(versionPath, "utf8").trim();
}

function readPackageJson() {
  const pkgPath = path.join(PACKAGE_ROOT, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fail(`package.json not found at ${pkgPath}`);
  }
  return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
}

function readInstallProfiles() {
  return JSON.parse(fs.readFileSync(INSTALL_PROFILES_MANIFEST, "utf8"));
}

function getDefaultInstallProfileName() {
  const manifest = readInstallProfiles();
  return manifest.defaultProfile || "core";
}

function getInstallProfile(profileName) {
  const manifest = readInstallProfiles();
  const resolvedName = profileName || manifest.defaultProfile || "core";
  const profile = manifest.profiles && manifest.profiles[resolvedName];

  if (!profile) {
    const knownProfiles = Object.keys(manifest.profiles || {}).sort();
    throw new Error(
      `unknown install profile: ${resolvedName}` +
      (knownProfiles.length > 0 ? ` (expected one of: ${knownProfiles.join(", ")})` : "")
    );
  }

  return {
    name: resolvedName,
    description: profile.description || "",
    includeProjectFiles: Boolean(profile.includeProjectFiles),
  };
}

function detectInstallProfileName(targetDir, options = {}) {
  const meta = options.meta || readInstalledMeta(targetDir);
  if (meta.installProfile) {
    return meta.installProfile;
  }

  const hasProjectArtifacts = [
    ...PROJECT_ARTIFACT_FILES.map((relPath) => getProjectFilePath(targetDir, relPath)),
    ...PROJECT_ARTIFACT_DIRS.map((relPath) => getProjectFilePath(targetDir, relPath)),
    getProjectFilePath(targetDir, path.join("specs", "example.spec.md")),
  ].some((absolutePath) => fs.existsSync(absolutePath));

  return hasProjectArtifacts ? "project" : getDefaultInstallProfileName();
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

/**
 * Compute SHA-256 hex digest of a file.
 */
function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Recursively list all files under `rootDir`, returning sorted absolute paths.
 * Skips `.DS_Store`.
 */
function listFilesRecursively(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".DS_Store") continue;
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        results.push(absolutePath);
      }
    }
  }

  walk(rootDir);
  return results.sort();
}

/**
 * List all framework-managed file paths (relative to `baseDir`).
 * Returns sorted array of relative paths like "AGENTS.md", ".agents/skills/foo/SKILL.md".
 */
function listManagedFiles(baseDir) {
  const relativePaths = [];
  for (const rootRel of MANAGED_ROOTS) {
    const srcRoot = path.join(baseDir, rootRel);
    if (!fs.existsSync(srcRoot)) continue;
    if (fs.statSync(srcRoot).isFile()) {
      relativePaths.push(rootRel);
      continue;
    }
    const files = listFilesRecursively(srcRoot);
    for (const absFile of files) {
      relativePaths.push(path.relative(baseDir, absFile));
    }
  }
  return relativePaths.sort();
}

function normalizeFrameworkFootprint(value) {
  return value === "lite" ? "lite" : "full";
}

function detectFrameworkFootprint(targetDir, options = {}) {
  const meta = options.meta || readInstalledMeta(targetDir);
  const managedFiles = options.managedFiles || listManagedFiles(targetDir);
  const sourceManaged = new Set(listManagedFiles(FRAMEWORK_ROOT));
  const installedSourceManaged = managedFiles.filter((relPath) => sourceManaged.has(relPath));

  if (installedSourceManaged.some((relPath) => !isLiteIncluded(relPath))) {
    return "full";
  }

  if (meta.frameworkFootprint) {
    return normalizeFrameworkFootprint(meta.frameworkFootprint);
  }

  if (installedSourceManaged.length > 0) {
    return "lite";
  }

  return "full";
}

function listSourceManagedFiles(options = {}) {
  const frameworkFootprint = normalizeFrameworkFootprint(options.frameworkFootprint);
  return listManagedFiles(FRAMEWORK_ROOT)
    .filter((relPath) => frameworkFootprint !== "lite" || isLiteIncluded(relPath));
}

function getProjectRoot(targetDir) {
  return path.join(targetDir, PROJECT_STATE_ROOT);
}

function getProjectLanesRoot(targetDir) {
  return getProjectFilePath(targetDir, LANES_DIR);
}

function normalizeRelativePath(relPath = "") {
  return relPath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function normalizeLaneId(laneId = "") {
  return String(laneId || "").trim();
}

function normalizeLaneStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || "active";
}

function normalizeQualityTier(value) {
  const normalized = String(value || "").trim();
  return QUALITY_TIERS.includes(normalized) ? normalized : "standard";
}

function deriveRiskTierFromQualityTier(qualityTier = "") {
  const normalizedQualityTier = normalizeQualityTier(qualityTier);
  if (normalizedQualityTier === "exploratory") {
    return "low";
  }
  if (normalizedQualityTier === "high-risk") {
    return "high";
  }
  return "medium";
}

function normalizeLaneRiskTier(value, options = {}) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return deriveRiskTierFromQualityTier(options.qualityTier);
  }
  return normalized;
}

function setDeliveryLaneContext(laneId = "") {
  CURRENT_DELIVERY_LANE_ID = normalizeLaneId(laneId);
}

function getDeliveryLaneContext() {
  return CURRENT_DELIVERY_LANE_ID || null;
}

function validateLaneId(laneId = "") {
  const normalized = normalizeLaneId(laneId);
  if (!normalized) {
    fail("lane id is required");
  }
  if (!LANE_ID_PATTERN.test(normalized)) {
    fail(
      `invalid lane id: ${normalized}\n` +
      "Use letters, numbers, dots, underscores, or hyphens, and start with a letter or number."
    );
  }
  return normalized;
}

function getDefaultLaneTitle(laneId = "") {
  const normalizedLaneId = validateLaneId(laneId);
  if (normalizedLaneId === DEFAULT_LANE_ID) {
    return "默认交付线";
  }
  return normalizedLaneId.replace(/[._-]+/g, " ").trim() || normalizedLaneId;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripProjectRootPrefix(relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
    return normalized.slice(PROJECT_STATE_ROOT.length + 1);
  }
  if (normalized === PROJECT_STATE_ROOT) {
    return "";
  }
  return normalized;
}

function getProjectFilePath(targetDir, relPath = "") {
  const normalized = stripProjectRootPrefix(relPath);
  const laneId = getDeliveryLaneContext();
  if (laneId && normalized && isLaneArtifactPath(normalized)) {
    return getLaneFilePath(targetDir, laneId, normalized);
  }
  return path.join(getProjectRoot(targetDir), normalized);
}

function getProjectRelativePath(relPath = "") {
  const normalized = stripProjectRootPrefix(relPath);
  const laneId = getDeliveryLaneContext();
  if (laneId && normalized && isLaneArtifactPath(normalized)) {
    return getLaneRelativePath(laneId, normalized);
  }
  return normalized
    ? path.posix.join(PROJECT_STATE_ROOT, normalized).replace(/\\/g, "/")
    : PROJECT_STATE_ROOT;
}

function stripLaneRootPrefix(laneId, relPath = "") {
  const normalizedLaneId = normalizeLaneId(laneId);
  if (!normalizedLaneId) {
    fail("lane id is required");
  }

  const normalized = normalizeRelativePath(relPath);
  const lanePrefix = path.posix.join(LANES_DIR, normalizedLaneId);
  const projectLanePrefix = path.posix.join(PROJECT_STATE_ROOT, lanePrefix);

  if (normalized.startsWith(`${projectLanePrefix}/`)) {
    return normalized.slice(projectLanePrefix.length + 1);
  }
  if (normalized === projectLanePrefix) {
    return "";
  }
  if (normalized.startsWith(`${lanePrefix}/`)) {
    return normalized.slice(lanePrefix.length + 1);
  }
  if (normalized === lanePrefix) {
    return "";
  }
  return normalized;
}

function getLaneRelativePath(laneId, relPath = "") {
  const normalizedLaneId = normalizeLaneId(laneId);
  if (!normalizedLaneId) {
    fail("lane id is required");
  }

  const normalized = stripLaneRootPrefix(normalizedLaneId, relPath);
  return normalized
    ? path.posix.join(PROJECT_STATE_ROOT, LANES_DIR, normalizedLaneId, normalized).replace(/\\/g, "/")
    : path.posix.join(PROJECT_STATE_ROOT, LANES_DIR, normalizedLaneId).replace(/\\/g, "/");
}

function getLaneFilePath(targetDir, laneId, relPath = "") {
  const normalizedLaneId = normalizeLaneId(laneId);
  if (!normalizedLaneId) {
    fail("lane id is required");
  }

  const normalized = stripLaneRootPrefix(normalizedLaneId, relPath);
  return normalized
    ? path.join(getProjectLanesRoot(targetDir), normalizedLaneId, normalized)
    : path.join(getProjectLanesRoot(targetDir), normalizedLaneId);
}

function getLaneMetadataPath(targetDir, laneId) {
  return getLaneFilePath(targetDir, laneId, LANE_METADATA_FILE);
}

function listProjectLanes(targetDir) {
  const lanesRoot = getProjectLanesRoot(targetDir);
  if (!fs.existsSync(lanesRoot) || !fs.statSync(lanesRoot).isDirectory()) {
    return [];
  }

  return fs.readdirSync(lanesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((laneId) => laneId && laneId !== ".DS_Store")
    .sort()
    .map((laneId) => {
      const metadataPath = getLaneMetadataPath(targetDir, laneId);
      const metadataExists = fs.existsSync(metadataPath) && fs.statSync(metadataPath).isFile();
      const values = metadataExists
        ? parseSimpleToml(fs.readFileSync(metadataPath, "utf8"))
        : {};
      const status = normalizeLaneStatus(values.status);
      const qualityTier = values.quality_tier || "standard";
      const riskTier = normalizeLaneRiskTier(values.risk_tier, { qualityTier });
      return {
        id: laneId,
        title: values.title || null,
        status,
        isActive: status === "active",
        baselineId: values.baseline_id || null,
        qualityTier,
        qualityTierValid: !values.quality_tier || QUALITY_TIERS.includes(values.quality_tier),
        riskTier,
        riskTierValid: !values.risk_tier || RISK_TIERS.includes(riskTier),
        hasExplicitRiskTier: Boolean(values.risk_tier),
        owner: values.owner || null,
        rootPath: getLaneFilePath(targetDir, laneId),
        relativePath: getLaneRelativePath(laneId),
        metadataPath,
        metadataRelativePath: getLaneRelativePath(laneId, LANE_METADATA_FILE),
        metadataExists,
        configured: metadataExists,
        values,
      };
    });
}

function listLegacyDeliveryArtifactEntries(targetDir) {
  return [
    ...LEGACY_DELIVERY_ARTIFACT_FILES.map((relPath) => ({ kind: "file", relPath })),
    ...LEGACY_DELIVERY_ARTIFACT_DIRS.map((relPath) => ({ kind: "dir", relPath })),
  ]
    .map((entry) => ({
      ...entry,
      absolutePath: getProjectFilePath(targetDir, entry.relPath),
    }))
    .filter((entry) => fs.existsSync(entry.absolutePath))
    .map((entry) => ({
      ...entry,
      relativePath: getProjectRelativePath(entry.relPath),
    }))
    .sort((left, right) => left.relPath.localeCompare(right.relPath));
}

function inspectProjectDeliveryLayout(targetDir) {
  const projectRoot = getProjectRoot(targetDir);
  const projectRootExists = fs.existsSync(projectRoot) && fs.statSync(projectRoot).isDirectory();
  const lanesRoot = getProjectLanesRoot(targetDir);
  const lanesRootExists = fs.existsSync(lanesRoot) && fs.statSync(lanesRoot).isDirectory();
  const lanes = listProjectLanes(targetDir);
  const legacyRootEntries = listLegacyDeliveryArtifactEntries(targetDir);
  const activeLaneIds = lanes.filter((lane) => lane.isActive).map((lane) => lane.id);

  let model = DELIVERY_MODEL_NONE;
  if (lanesRootExists && legacyRootEntries.length > 0) {
    model = DELIVERY_MODEL_MIXED;
  } else if (lanesRootExists) {
    model = DELIVERY_MODEL_LANES;
  } else if (legacyRootEntries.length > 0) {
    model = DELIVERY_MODEL_LEGACY;
  }

  return {
    model,
    projectRoot,
    projectRootExists,
    lanesRoot,
    lanesRootExists,
    lanes,
    laneIds: lanes.map((lane) => lane.id),
    activeLaneIds,
    legacyRootEntries,
    legacyRootRelPaths: legacyRootEntries.map((entry) => entry.relPath),
    requiresMigration: model === DELIVERY_MODEL_MIXED,
  };
}

function formatLaneDescriptor(lane) {
  const label = lane.title ? `${lane.id} (${lane.title})` : lane.id;
  const meta = [`status=${lane.status || "unknown"}`];
  if (lane.baselineId) {
    meta.push(`baseline=${lane.baselineId}`);
  }
  if (lane.qualityTier) {
    meta.push(`quality=${lane.qualityTier}`);
  }
  if (lane.riskTier) {
    meta.push(`risk=${lane.riskTier}`);
  }
  if (lane.owner) {
    meta.push(`owner=${lane.owner}`);
  }
  return `- ${label} [${meta.join(", ")}]`;
}

function formatLaneFlagExamples(lanes) {
  return lanes
    .slice(0, 5)
    .map((lane) => `- --lane ${lane.id}`)
    .join("\n");
}

function formatLaneCommandExamples(commandPrefix, lanes) {
  const normalizedCommandPrefix = String(commandPrefix || "").trim();
  if (!normalizedCommandPrefix) {
    return formatLaneFlagExamples(lanes);
  }
  return lanes
    .slice(0, 5)
    .map((lane) => `- ${normalizedCommandPrefix} --lane ${lane.id}`)
    .join("\n");
}

function summarizePathList(paths, maxItems = 3) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))];
  if (uniquePaths.length === 0) {
    return "";
  }
  const sample = uniquePaths.slice(0, maxItems);
  if (uniquePaths.length > maxItems) {
    sample.push(`... (+${uniquePaths.length - maxItems} more)`);
  }
  return sample.join(", ");
}

function listTrackedGitChangedPaths(targetDir) {
  const result = spawnSync(
    "git",
    ["diff", "--name-only", "--relative", "HEAD", "--"],
    {
      cwd: targetDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }
  );

  if (result.error || result.status !== 0) {
    return {
      available: false,
      changedPaths: [],
    };
  }

  return {
    available: true,
    changedPaths: result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

function inspectLaneWorktreeImpact(targetDir, options = {}) {
  const layout = options.layout || inspectProjectDeliveryLayout(targetDir);
  const selectedLaneId = normalizeLaneId(options.selectedLaneId);
  const changeSource = Array.isArray(options.changedPaths)
    ? {
        available: true,
        changedPaths: options.changedPaths,
      }
    : listTrackedGitChangedPaths(targetDir);

  const changedPaths = [...new Set(
    (changeSource.changedPaths || [])
      .map((value) => String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, ""))
      .filter(Boolean)
  )];
  const lanes = layout && Array.isArray(layout.lanes) ? layout.lanes : [];
  const sharedArtifactPaths = [];
  const repoPaths = [];
  const selectedLanePaths = [];
  const otherLanePathsById = new Map();
  const touchedLaneIds = new Set();

  for (const changedPath of changedPaths) {
    const laneMatch = changedPath.match(/^\.ai-os\/lanes\/([^/]+)\/(.+)$/);
    if (laneMatch) {
      const laneId = laneMatch[1];
      touchedLaneIds.add(laneId);
      if (laneId === selectedLaneId) {
        selectedLanePaths.push(changedPath);
      } else {
        if (!otherLanePathsById.has(laneId)) {
          otherLanePathsById.set(laneId, []);
        }
        otherLanePathsById.get(laneId).push(changedPath);
      }
      continue;
    }

    if (
      changedPath === ".ai-os/project.md" ||
      changedPath === ".ai-os/CONVENTIONS.md" ||
      changedPath === ".ai-os/memory.md" ||
      changedPath.startsWith(".ai-os/shared/")
    ) {
      sharedArtifactPaths.push(changedPath);
      continue;
    }

    if (!changedPath.startsWith(".ai-os/")) {
      repoPaths.push(changedPath);
    }
  }

  const otherLanes = lanes.filter((lane) => lane.id !== selectedLaneId);
  const activeOtherLanes = otherLanes.filter((lane) => lane.isActive);
  const touchedOtherLanes = lanes.filter((lane) => otherLanePathsById.has(lane.id));
  const suggestedLaneIds = [];
  const suggestedLaneIdSet = new Set();

  function addSuggestedLanes(candidateLanes) {
    for (const lane of candidateLanes || []) {
      if (!lane || !lane.id || suggestedLaneIdSet.has(lane.id)) {
        continue;
      }
      suggestedLaneIds.push(lane.id);
      suggestedLaneIdSet.add(lane.id);
    }
  }

  if (selectedLaneId) {
    addSuggestedLanes(touchedOtherLanes);
    if (sharedArtifactPaths.length > 0 || repoPaths.length > 0) {
      addSuggestedLanes(activeOtherLanes.length > 0 ? activeOtherLanes : otherLanes);
    }
  } else {
    const touchedCandidateLanes = lanes.filter((lane) => touchedLaneIds.has(lane.id));
    addSuggestedLanes(touchedCandidateLanes);
    if (suggestedLaneIds.length === 0 && (sharedArtifactPaths.length > 0 || repoPaths.length > 0)) {
      addSuggestedLanes(lanes.filter((lane) => lane.isActive));
    }
  }

  return {
    available: changeSource.available,
    changedPaths,
    sharedArtifactPaths,
    repoPaths,
    selectedLanePaths,
    otherLanePathsById,
    touchedLaneIds: [...touchedLaneIds],
    touchedOtherLaneIds: touchedOtherLanes.map((lane) => lane.id),
    suggestedLaneIds,
    suggestedLanes: lanes.filter((lane) => suggestedLaneIdSet.has(lane.id)),
  };
}

function buildLaneResolutionMessage(code, layout, options = {}) {
  const requestedLaneId = normalizeLaneId(options.requestedLaneId);
  const commandPrefix = String(options.commandPrefix || "").trim();
  const laneListCommand = String(options.laneListCommand || "create-ai-os lane list .").trim();
  const laneAddCommand = String(options.laneAddCommand || "create-ai-os lane add <lane-id> .").trim();
  const laneActivateOnlyCommand = String(options.laneActivateOnlyCommand || "create-ai-os lane activate <lane-id> . --only").trim();
  const worktreeImpact = options.worktreeImpact || null;
  const lanes = layout && Array.isArray(layout.lanes) ? layout.lanes : [];
  const activeLanes = lanes.filter((lane) => lane.isActive);

  if (code === "legacy-does-not-support-lane-selection") {
    return [
      `Legacy single-delivery project does not support lane selection: ${requestedLaneId}`,
      "This project still reads delivery artifacts from .ai-os/.",
      "If you need lane-scoped delivery artifacts, run `create-ai-os upgrade . --to-lanes` first.",
    ].join("\n");
  }

  if (code === "no-lanes-found") {
    return [
      "Lane-based project has no lanes configured.",
      "Expected at least one `.ai-os/lanes/<lane-id>/lane.toml` file.",
      `Create the first lane with \`${laneAddCommand}\`.`,
      "If this is still a legacy single-delivery project, run `create-ai-os upgrade . --to-lanes` first.",
    ].join("\n");
  }

  if (code === "unknown-lane") {
    const lines = [`Unknown lane: ${requestedLaneId}`];
    if (worktreeImpact && worktreeImpact.available && worktreeImpact.suggestedLanes.length > 0) {
      lines.push("Current worktree suggests checking these lanes first:");
      lines.push(...worktreeImpact.suggestedLanes.map((lane) => formatLaneDescriptor(lane)));
      if (worktreeImpact.sharedArtifactPaths.length > 0) {
        lines.push(`Shared AI-OS artifacts changed: ${summarizePathList(worktreeImpact.sharedArtifactPaths)}`);
      }
      if (worktreeImpact.repoPaths.length > 0) {
        lines.push(`Repo files outside .ai-os changed: ${summarizePathList(worktreeImpact.repoPaths)}`);
      }
      if (worktreeImpact.touchedOtherLaneIds.length > 0) {
        lines.push(`Other lane artifacts changed: ${summarizePathList(worktreeImpact.touchedOtherLaneIds)}`);
      }
    }
    if (lanes.length > 0) {
      lines.push("Known lanes:");
      lines.push(...lanes.map((lane) => formatLaneDescriptor(lane)));
      lines.push("Re-run with one of:");
      lines.push(formatLaneCommandExamples(commandPrefix, lanes));
      lines.push(`Review current lane topology with \`${laneListCommand}\`.`);
    }
    return lines.join("\n");
  }

  if (code === "lane-selection-required") {
    if (activeLanes.length > 1) {
      const lines = [
        `Multiple active lanes found: ${activeLanes.map((lane) => lane.id).join(", ")}`,
        "Active lanes:",
        ...activeLanes.map((lane) => formatLaneDescriptor(lane)),
      ];
      if (worktreeImpact && worktreeImpact.available && worktreeImpact.suggestedLanes.length > 0) {
        lines.push("Current worktree suggests checking these lanes first:");
        lines.push(...worktreeImpact.suggestedLanes.map((lane) => formatLaneDescriptor(lane)));
        if (worktreeImpact.sharedArtifactPaths.length > 0) {
          lines.push(`Shared AI-OS artifacts changed: ${summarizePathList(worktreeImpact.sharedArtifactPaths)}`);
        }
        if (worktreeImpact.repoPaths.length > 0) {
          lines.push(`Repo files outside .ai-os changed: ${summarizePathList(worktreeImpact.repoPaths)}`);
        }
        if (worktreeImpact.touchedLaneIds.length > 0) {
          lines.push(`Touched lane artifacts: ${summarizePathList(worktreeImpact.touchedLaneIds)}`);
        }
      }
      lines.push(
        "Pick the lane you want to operate on:",
        formatLaneCommandExamples(commandPrefix, activeLanes),
        `Review current lane topology with \`${laneListCommand}\`.`,
        `If this work belongs to a new parallel delivery, create it first with \`${laneAddCommand}\`.`,
        `If only one lane should stay active, run \`${laneActivateOnlyCommand}\` to restore auto-selection.`,
      );
      return lines.join("\n");
    }

    const lines = ["No active lane found. Specify --lane."];
    if (worktreeImpact && worktreeImpact.available && worktreeImpact.suggestedLanes.length > 0) {
      lines.push("Current worktree suggests checking these lanes first:");
      lines.push(...worktreeImpact.suggestedLanes.map((lane) => formatLaneDescriptor(lane)));
      if (worktreeImpact.sharedArtifactPaths.length > 0) {
        lines.push(`Shared AI-OS artifacts changed: ${summarizePathList(worktreeImpact.sharedArtifactPaths)}`);
      }
      if (worktreeImpact.repoPaths.length > 0) {
        lines.push(`Repo files outside .ai-os changed: ${summarizePathList(worktreeImpact.repoPaths)}`);
      }
      if (worktreeImpact.touchedLaneIds.length > 0) {
        lines.push(`Touched lane artifacts: ${summarizePathList(worktreeImpact.touchedLaneIds)}`);
      }
    }
    if (lanes.length > 0) {
      lines.push("Configured lanes:");
      lines.push(...lanes.map((lane) => formatLaneDescriptor(lane)));
      lines.push("Re-run with one of:");
      lines.push(formatLaneCommandExamples(commandPrefix, lanes));
      lines.push(`Review current lane topology with \`${laneListCommand}\`.`);
      lines.push(`If this is a brand-new parallel delivery, create a lane first with \`${laneAddCommand}\`.`);
      lines.push(
        `Or mark one lane as \`status = "active"\` in \`.ai-os/lanes/<lane-id>/lane.toml\`, or run \`${laneActivateOnlyCommand}\`, to restore auto-selection.`
      );
    }
    return lines.join("\n");
  }

  return "";
}

function buildLaneScopeNote(laneResolution, options = {}) {
  if (!laneResolution || !laneResolution.ok || !laneResolution.laneId || !laneResolution.layout) {
    return "";
  }

  const layout = laneResolution.layout;
  const lanes = Array.isArray(layout.lanes) ? layout.lanes : [];
  if (layout.model !== DELIVERY_MODEL_LANES || lanes.length <= 1) {
    return "";
  }

  const selectedLane = laneResolution.lane || lanes.find((lane) => lane.id === laneResolution.laneId) || null;
  const otherLanes = lanes.filter((lane) => lane.id !== laneResolution.laneId);
  if (otherLanes.length === 0) {
    return "";
  }

  const commandPrefix = String(options.commandPrefix || "").trim();
  const laneListCommand = String(options.laneListCommand || "create-ai-os lane list .").trim();
  const laneActivateOnlyCommand = String(options.laneActivateOnlyCommand || "create-ai-os lane activate <lane-id> . --only").trim();
  const worktreeImpact = options.worktreeImpact || laneResolution.worktreeImpact || null;
  const otherActiveLanes = otherLanes.filter((lane) => lane.isActive);
  const heuristicSuggestedLanes = worktreeImpact && worktreeImpact.available && worktreeImpact.suggestedLanes.length > 0
    ? worktreeImpact.suggestedLanes
    : [];
  const suggestedLanes = heuristicSuggestedLanes.length > 0
    ? heuristicSuggestedLanes
    : (otherActiveLanes.length > 0 ? otherActiveLanes : otherLanes);

  const lines = [`Lane scope: this run only covers \`${laneResolution.laneId}\`.`];

  if (selectedLane && selectedLane.status && selectedLane.status !== LANE_STATUS_ACTIVE && otherActiveLanes.length > 0) {
    lines.push(
      `Selected lane \`${selectedLane.id}\` is currently \`${selectedLane.status}\`; active lanes still include ${otherActiveLanes.map((lane) => `\`${lane.id}\``).join(", ")}.`
    );
  }

  if (worktreeImpact && worktreeImpact.available) {
    if (worktreeImpact.sharedArtifactPaths.length > 0 || worktreeImpact.repoPaths.length > 0 || worktreeImpact.touchedOtherLaneIds.length > 0) {
      lines.push("Worktree impact signals:");
      if (worktreeImpact.sharedArtifactPaths.length > 0) {
        lines.push(`- shared AI-OS artifacts changed: ${summarizePathList(worktreeImpact.sharedArtifactPaths)}`);
      }
      if (worktreeImpact.repoPaths.length > 0) {
        lines.push(`- repo files outside .ai-os changed: ${summarizePathList(worktreeImpact.repoPaths)}`);
      }
      if (worktreeImpact.touchedOtherLaneIds.length > 0) {
        const touchedOtherLanePaths = [];
        for (const laneId of worktreeImpact.touchedOtherLaneIds) {
          const lanePaths = worktreeImpact.otherLanePathsById.get(laneId) || [];
          touchedOtherLanePaths.push(...lanePaths);
        }
        lines.push(`- other lane artifacts changed: ${summarizePathList(touchedOtherLanePaths)}`);
      }
    }
  }

  lines.push(heuristicSuggestedLanes.length > 0 ? "Most likely affected lanes:" : (otherActiveLanes.length > 0 ? "Other active lanes:" : "Other configured lanes:"));
  lines.push(...suggestedLanes.map((lane) => formatLaneDescriptor(lane)));

  if (commandPrefix) {
    lines.push(
      heuristicSuggestedLanes.length > 0
        ? "Start by rerunning the same command for these candidate lanes:"
        : otherActiveLanes.length > 0
        ? "If shared code / contracts / infra changed, start by rerunning the same command for other active lanes:"
        : "If shared code / contracts / infra changed, rerun the same command for affected lanes:"
    );
    lines.push(formatLaneCommandExamples(commandPrefix, suggestedLanes));
  }

  lines.push(`Review lane topology with \`${laneListCommand}\`.`);

  if (selectedLane && selectedLane.status && selectedLane.status !== LANE_STATUS_ACTIVE && otherActiveLanes.length > 0) {
    lines.push(
      `If you meant to work on the active delivery lane, rerun with one of the active lanes above or restore single-lane auto-selection via \`${laneActivateOnlyCommand}\`.`
    );
  }

  return lines.join("\n");
}

function resolveProjectLane(targetDir, options = {}) {
  const layout = options.layout || inspectProjectDeliveryLayout(targetDir);
  const requestedLaneId = normalizeLaneId(options.laneId);
  const worktreeImpact = options.worktreeImpact || inspectLaneWorktreeImpact(targetDir, {
    layout,
    selectedLaneId: requestedLaneId,
  });
  const messageOptions = {
    requestedLaneId,
    commandPrefix: options.commandPrefix,
    laneListCommand: options.laneListCommand,
    laneAddCommand: options.laneAddCommand,
    laneActivateOnlyCommand: options.laneActivateOnlyCommand,
    worktreeImpact,
  };

  if (layout.model === DELIVERY_MODEL_NONE) {
    return {
      ok: false,
      code: "no-delivery-model",
      message: "No AI-OS delivery artifacts found.",
      layout,
      requestedLaneId,
    };
  }

  if (layout.model === DELIVERY_MODEL_LEGACY) {
    if (requestedLaneId) {
      return {
        ok: false,
        code: "legacy-does-not-support-lane-selection",
        message: buildLaneResolutionMessage("legacy-does-not-support-lane-selection", layout, messageOptions),
        layout,
        requestedLaneId,
        worktreeImpact,
      };
    }
    return {
      ok: true,
      code: "legacy-fallback",
      model: layout.model,
      laneId: null,
      lane: null,
      autoSelected: false,
      isLegacyFallback: true,
      layout,
      requestedLaneId,
      worktreeImpact,
    };
  }

  if (layout.lanes.length === 0) {
    return {
      ok: false,
      code: "no-lanes-found",
      message: buildLaneResolutionMessage("no-lanes-found", layout, messageOptions),
      layout,
      requestedLaneId,
      worktreeImpact,
    };
  }

  if (requestedLaneId) {
    const requestedLane = layout.lanes.find((lane) => lane.id === requestedLaneId);
    if (!requestedLane) {
      return {
        ok: false,
        code: "unknown-lane",
        message: buildLaneResolutionMessage("unknown-lane", layout, messageOptions),
        layout,
        requestedLaneId,
        worktreeImpact,
      };
    }
    return {
      ok: true,
      code: "lane-selected",
      model: layout.model,
      laneId: requestedLane.id,
      lane: requestedLane,
      autoSelected: false,
      isLegacyFallback: false,
      layout,
      requestedLaneId,
      worktreeImpact,
    };
  }

  const activeLanes = layout.lanes.filter((lane) => lane.isActive);
  if (activeLanes.length === 1) {
    return {
      ok: true,
      code: "lane-auto-selected",
      model: layout.model,
      laneId: activeLanes[0].id,
      lane: activeLanes[0],
      autoSelected: true,
      isLegacyFallback: false,
      layout,
      requestedLaneId,
      worktreeImpact,
    };
  }

  return {
    ok: false,
    code: "lane-selection-required",
    message: buildLaneResolutionMessage("lane-selection-required", layout, messageOptions),
    layout,
    requestedLaneId,
    worktreeImpact,
  };
}

function isLaneArtifactPath(relPath = "") {
  const normalized = stripProjectRootPrefix(relPath);
  if (!normalized) {
    return false;
  }
  if (normalized === "baseline-log.md") {
    return true;
  }
  if (normalized.startsWith(`${LANES_DIR}/`)) {
    return true;
  }
  if (LANE_ARTIFACT_FILES.includes(normalized)) {
    return true;
  }
  return LANE_ARTIFACT_DIRS.some(
    (dirName) => normalized === dirName || normalized.startsWith(`${dirName}/`)
  );
}

function resolveDeliveryPath(targetDir, relPath = "", options = {}) {
  const laneId = normalizeLaneId(options.laneId);
  const normalized = normalizeRelativePath(relPath);

  if (!normalized) {
    return laneId ? getLaneFilePath(targetDir, laneId) : getProjectRoot(targetDir);
  }

  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/${LANES_DIR}/`) || normalized.startsWith(`${LANES_DIR}/`)) {
    return path.join(getProjectRoot(targetDir), stripProjectRootPrefix(normalized));
  }

  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
    return path.join(targetDir, normalized);
  }

  if (normalized === "baseline-log.md") {
    return laneId
      ? getLaneFilePath(targetDir, laneId, normalized)
      : getProjectFilePath(targetDir, normalized);
  }

  if (laneId && isLaneArtifactPath(normalized)) {
    return getLaneFilePath(targetDir, laneId, normalized);
  }

  if (isProjectArtifactPath(normalized)) {
    return getProjectFilePath(targetDir, normalized);
  }

  return path.join(targetDir, normalized);
}

function formatDeliveryPath(relPath = "", options = {}) {
  const laneId = normalizeLaneId(options.laneId);
  const normalized = normalizeRelativePath(relPath);

  if (!normalized) {
    return laneId ? getLaneRelativePath(laneId) : PROJECT_STATE_ROOT;
  }

  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/${LANES_DIR}/`) || normalized.startsWith(`${LANES_DIR}/`)) {
    return normalized.startsWith(`${PROJECT_STATE_ROOT}/`)
      ? normalized
      : path.posix.join(PROJECT_STATE_ROOT, normalized).replace(/\\/g, "/");
  }

  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
    return normalized;
  }

  if (normalized === "baseline-log.md") {
    return laneId
      ? getLaneRelativePath(laneId, normalized)
      : getProjectRelativePath(normalized);
  }

  if (laneId && isLaneArtifactPath(normalized)) {
    return getLaneRelativePath(laneId, normalized);
  }

  if (isProjectArtifactPath(normalized)) {
    return getProjectRelativePath(normalized);
  }

  return normalized;
}

function listProjectEvalFiles(targetDir, options = {}) {
  const laneId = options.laneId !== undefined ? options.laneId : getDeliveryLaneContext();
  const evalsDir = resolveDeliveryPath(targetDir, "evals", { laneId });
  if (!fs.existsSync(evalsDir) || !fs.statSync(evalsDir).isDirectory()) {
    return [];
  }

  return listFilesRecursively(evalsDir)
    .map((absolutePath) => path.relative(evalsDir, absolutePath).replace(/\\/g, "/"))
    .filter((relPath) => {
      const baseName = path.basename(relPath);
      return !relPath.endsWith(".DS_Store") && baseName !== "README.md";
    })
    .map((relPath) => path.posix.join("evals", relPath))
    .sort();
}

function getProjectMetadataPath(targetDir) {
  return getProjectFilePath(targetDir, PROJECT_METADATA_FILE);
}

function isProjectArtifactPath(relPath = "") {
  const normalized = stripProjectRootPrefix(relPath);
  if (!normalized) {
    return false;
  }
  if (PROJECT_ARTIFACT_FILES.includes(normalized)) {
    return true;
  }
  return PROJECT_ARTIFACT_DIRS.some(
    (dirName) => normalized === dirName || normalized.startsWith(`${dirName}/`)
  );
}

function resolveProjectPath(targetDir, relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (isProjectArtifactPath(normalized)) {
    return getProjectFilePath(targetDir, normalized);
  }
  return path.join(targetDir, normalized);
}

function formatProjectPath(relPath = "") {
  const normalized = normalizeRelativePath(relPath);
  if (!normalized) {
    return PROJECT_STATE_ROOT;
  }
  if (normalized.startsWith(`${PROJECT_STATE_ROOT}/`)) {
    return normalized;
  }
  if (isProjectArtifactPath(normalized)) {
    return getProjectRelativePath(normalized);
  }
  return normalized;
}

function parseSimpleToml(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*"((?:[^"\\]|\\.)*)"$/);
    if (match) {
      values[match[1]] = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }

  return values;
}

function serializeSimpleToml(values) {
  const lines = [];
  for (const [key, value] of Object.entries(values)) {
    const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`${key} = "${escaped}"`);
  }
  lines.push("");
  return lines.join("\n");
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatBaselineTimestamp(date = new Date()) {
  return [
    String(date.getUTCFullYear()),
    padNumber(date.getUTCMonth() + 1),
    padNumber(date.getUTCDate()),
  ].join("") +
    "-" +
    [
      padNumber(date.getUTCHours()),
      padNumber(date.getUTCMinutes()),
      padNumber(date.getUTCSeconds()),
    ].join("");
}

function formatBaselineConfirmedDate(date = new Date()) {
  return [
    String(date.getUTCFullYear()),
    padNumber(date.getUTCMonth() + 1),
    padNumber(date.getUTCDate()),
  ].join("-");
}

function sanitizeBaselineSlug(value, fallback = INITIAL_BASELINE_SLUG) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || fallback;
}

function buildBaselineRecordId(prefix, slug, options = {}) {
  const timestamp = options.timestamp || formatBaselineTimestamp(options.date || new Date());
  return `${prefix}-${timestamp}-${sanitizeBaselineSlug(
    slug,
    prefix === "CR" ? "change-request" : INITIAL_BASELINE_SLUG
  )}`;
}

function createInitialBaselineContext(options = {}) {
  const date = options.date || new Date();
  const baselineId = options.baselineId || buildBaselineRecordId(
    "BL",
    options.slug || INITIAL_BASELINE_SLUG,
    { date, timestamp: options.timestamp }
  );
  return {
    baselineId,
    baselineFileName: `${baselineId}.md`,
    baselineRecordRelPath: path.posix.join("baseline-log", `${baselineId}.md`),
    confirmedDate: options.confirmedDate || formatBaselineConfirmedDate(date),
  };
}

function buildLaneMetadata(laneId, options = {}) {
  const normalizedLaneId = validateLaneId(laneId);
  const qualityTier = normalizeQualityTier(options.qualityTier || "standard");
  const metadata = {
    id: normalizedLaneId,
    title: options.title || getDefaultLaneTitle(normalizedLaneId),
    status: normalizeLaneStatus(
      options.status || (normalizedLaneId === DEFAULT_LANE_ID ? LANE_STATUS_ACTIVE : LANE_STATUS_DRAFT)
    ),
    baseline_id: options.baselineId || "",
    quality_tier: qualityTier,
    risk_tier: normalizeLaneRiskTier(options.riskTier, { qualityTier }),
  };

  if (options.owner) {
    metadata.owner = options.owner;
  }

  return metadata;
}

function writeLaneMetadata(targetDir, laneId, values) {
  const normalizedLaneId = validateLaneId(laneId);
  const metadataPath = getLaneMetadataPath(targetDir, normalizedLaneId);
  ensureDir(path.dirname(metadataPath));
  fs.writeFileSync(metadataPath, serializeSimpleToml(values), "utf8");
  return metadataPath;
}

// ---------------------------------------------------------------------------
// Read target project metadata
// ---------------------------------------------------------------------------

/**
 * Read the installed AI-OS metadata from a target project.
 * Returns { exists, version, mode, installProfile, frameworkFootprint, frameworkTomlPath }
 * or { exists: false }.
 */
function readInstalledMeta(targetDir) {
  const tomlPath = getProjectMetadataPath(targetDir);

  if (!fs.existsSync(tomlPath)) {
    return {
      exists: false,
      version: null,
      mode: null,
      installProfile: null,
      frameworkFootprint: null,
      frameworkTomlPath: tomlPath,
    };
  }

  const content = fs.readFileSync(tomlPath, "utf8");
  const values = parseSimpleToml(content);

  return {
    exists: true,
    version: values.framework_version || "unknown",
    mode: values.mode || "unknown",
    installProfile: values.install_profile || null,
    frameworkFootprint: values.framework_footprint || null,
    frameworkTomlPath: tomlPath,
    values,
  };
}

// ---------------------------------------------------------------------------
// File copy helper
// ---------------------------------------------------------------------------

function copyFileWithMode(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, fs.statSync(src).mode);
}

function getProjectTemplatePath(fileName) {
  const templatePath = path.join(PROJECT_TEMPLATE_ROOT, fileName);
  if (!fs.existsSync(templatePath)) {
    fail(`missing project template: ${templatePath}`);
  }
  return templatePath;
}

function defaultLogger(message) {
  process.stdout.write(`${message}\n`);
}

function isLiteIncluded(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (LITE_INCLUDES.includes(normalized)) return true;
  return LITE_DIR_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isQuickIncluded(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  return QUICK_INCLUDES.includes(normalized);
}

function copyFramework(targetDir, options = {}) {
  const { overwrite = false, lite = false, quick = false, logger = defaultLogger } = options;

  for (const rootRel of MANAGED_ROOTS) {
    const srcRoot = path.join(FRAMEWORK_ROOT, rootRel);
    const dstRoot = path.join(targetDir, rootRel);

    if (fs.statSync(srcRoot).isFile()) {
      if (quick && !isQuickIncluded(rootRel)) continue;
      if (lite && !quick && !isLiteIncluded(rootRel)) continue;
      if (fs.existsSync(dstRoot) && !overwrite) {
        logger(`keep existing managed file: ${rootRel}`);
        continue;
      }
      copyFileWithMode(srcRoot, dstRoot);
      logger(`copied: ${rootRel}`);
      continue;
    }

    const files = listFilesRecursively(srcRoot);
    for (const srcFile of files) {
      const relativePath = path.relative(FRAMEWORK_ROOT, srcFile);
      if (quick && !isQuickIncluded(relativePath.replace(/\\/g, "/"))) continue;
      if (lite && !quick && !isLiteIncluded(relativePath.replace(/\\/g, "/"))) continue;
      const dstFile = path.join(targetDir, relativePath);
      if (fs.existsSync(dstFile) && !overwrite) {
        logger(`keep existing managed file: ${relativePath}`);
        continue;
      }
      copyFileWithMode(srcFile, dstFile);
      logger(`copied: ${relativePath}`);
    }
  }
}

function copyTemplateIfMissing(targetDir, src, dst, options = {}) {
  const { logger = defaultLogger } = options;

  ensureDir(path.dirname(dst));
  if (fs.existsSync(dst)) {
    logger(`keep existing project file: ${path.relative(targetDir, dst)}`);
    return false;
  }

  copyFileWithMode(src, dst);
  logger(`created project file: ${path.relative(targetDir, dst)}`);
  return true;
}

function applyProjectTemplateTokens(filePath, values) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  for (const [token, value] of Object.entries(values)) {
    if (!content.includes(token)) {
      continue;
    }
    content = content.split(token).join(value);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function listBaselineRecordRelativePaths(targetDir) {
  const baselineDir = getProjectFilePath(targetDir, "baseline-log");
  if (!fs.existsSync(baselineDir) || !fs.statSync(baselineDir).isDirectory()) {
    return [];
  }
  return fs.readdirSync(baselineDir)
    .filter((name) => name.endsWith(".md") && name !== ".DS_Store")
    .sort()
    .map((name) => path.posix.join("baseline-log", name));
}

function deriveBaselineContextFromExistingRecords(recordRelPaths, fallbackContext) {
  const preferredRelPath = [...recordRelPaths]
    .sort()
    .filter((relPath) => path.posix.basename(relPath).startsWith("BL-"))
    .pop() || [...recordRelPaths].sort().pop();

  if (!preferredRelPath) {
    return fallbackContext;
  }

  const baselineFileName = path.posix.basename(preferredRelPath);
  return {
    ...fallbackContext,
    baselineId: baselineFileName.replace(/\.md$/, ""),
    baselineFileName,
    baselineRecordRelPath: preferredRelPath,
  };
}

function createLaneProjectFiles(targetDir, options = {}) {
  const { logger = defaultLogger } = options;
  const requestedBaselineContext = options.baselineContext || createInitialBaselineContext();
  const laneId = validateLaneId(options.laneId || DEFAULT_LANE_ID);
  const createdPaths = [];

  ensureDir(getProjectRoot(targetDir));

  // --- Shared root files ---
  for (const fileName of PROJECT_SHARED_FILES) {
    const templatePath = path.join(PROJECT_TEMPLATE_ROOT, fileName);
    if (!fs.existsSync(templatePath)) {
      continue;
    }
    const destinationPath = getProjectFilePath(targetDir, fileName);
    if (copyTemplateIfMissing(targetDir, templatePath, destinationPath, { logger })) {
      createdPaths.push(destinationPath);
    }
  }

  // --- Lane directory and metadata ---
  const laneDir = getLaneFilePath(targetDir, laneId);
  ensureDir(laneDir);

  const laneTomlSrc = path.join(LANE_TEMPLATE_ROOT, LANE_METADATA_FILE);
  const laneTomlDst = getLaneMetadataPath(targetDir, laneId);
  if (copyTemplateIfMissing(targetDir, laneTomlSrc, laneTomlDst, { logger })) {
    createdPaths.push(laneTomlDst);
  }

  // --- Lane delivery files ---
  for (const fileName of LANE_DELIVERY_FILES) {
    const templatePath = getProjectTemplatePath(fileName);
    const destinationPath = getLaneFilePath(targetDir, laneId, fileName);
    if (copyTemplateIfMissing(targetDir, templatePath, destinationPath, { logger })) {
      createdPaths.push(destinationPath);
    }
  }

  // --- Lane delivery directories ---
  for (const dirName of LANE_DELIVERY_DIRS) {
    ensureDir(getLaneFilePath(targetDir, laneId, dirName));
  }

  // --- Specs example ---
  const exampleSpecPath = getLaneFilePath(targetDir, laneId, path.join("specs", "example.spec.md"));
  if (copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath(path.join("specs", "example.spec.md")),
    exampleSpecPath,
    { logger }
  )) {
    createdPaths.push(exampleSpecPath);
  }

  // --- Baseline record ---
  const laneBaselineDir = getLaneFilePath(targetDir, laneId, "baseline-log");
  const existingLaneBaselines = fs.existsSync(laneBaselineDir) && fs.statSync(laneBaselineDir).isDirectory()
    ? fs.readdirSync(laneBaselineDir).filter((n) => n.endsWith(".md") && n !== ".DS_Store")
    : [];
  const baselineContext = existingLaneBaselines.length > 0
    ? deriveBaselineContextFromExistingRecords(
        existingLaneBaselines.map((n) => path.posix.join("baseline-log", n)),
        requestedBaselineContext
      )
    : requestedBaselineContext;

  if (existingLaneBaselines.length === 0) {
    const baselineRecordPath = getLaneFilePath(targetDir, laneId, baselineContext.baselineRecordRelPath);
    if (copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(BASELINE_LOG_TEMPLATE_FILE),
      baselineRecordPath,
      { logger }
    )) {
      createdPaths.push(baselineRecordPath);
    }
  }

  // --- Token replacement ---
  const tokenValues = {
    [TEMPLATE_TOKEN_INITIAL_BASELINE_ID]: baselineContext.baselineId,
    [TEMPLATE_TOKEN_INITIAL_BASELINE_FILE]: baselineContext.baselineFileName,
    [TEMPLATE_TOKEN_INITIAL_BASELINE_DATE]: baselineContext.confirmedDate,
  };
  for (const filePath of createdPaths) {
    applyProjectTemplateTokens(filePath, tokenValues);
  }

  if (!fs.existsSync(laneTomlDst) || createdPaths.includes(laneTomlDst)) {
    const metadataSeed = options.laneMetadata || {};
    writeLaneMetadata(
      targetDir,
      laneId,
      buildLaneMetadata(laneId, {
        title: options.title || metadataSeed.title,
        status: options.status || metadataSeed.status,
        baselineId: options.baselineId || metadataSeed.baseline_id || baselineContext.baselineId,
        qualityTier: options.qualityTier || metadataSeed.quality_tier,
        riskTier: options.riskTier || metadataSeed.risk_tier,
        owner: options.owner || metadataSeed.owner,
      })
    );
  }
}

function createProjectFiles(targetDir, options = {}) {
  const { logger = defaultLogger, quick = false, legacyLayout = false } = options;

  // Lane-based layout is the default for non-quick, non-legacy installs
  if (!quick && !legacyLayout) {
    return createLaneProjectFiles(targetDir, options);
  }

  // --- Legacy / quick layout (root-level single-delivery) ---
  const requestedBaselineContext = options.baselineContext || createInitialBaselineContext();
  const existingBaselineRecords = listBaselineRecordRelativePaths(targetDir);
  const baselineContext = existingBaselineRecords.length > 0
    ? deriveBaselineContextFromExistingRecords(existingBaselineRecords, requestedBaselineContext)
    : requestedBaselineContext;
  const createdPaths = [];

  ensureDir(getProjectRoot(targetDir));

  const quickFileSet = new Set(QUICK_PROJECT_FILES);
  const quickDirSet = new Set(QUICK_PROJECT_DIRS);
  const dirsToCreate = quick
    ? PROJECT_CORE_ARTIFACT_DIRS.filter((d) => quickDirSet.has(d))
    : PROJECT_CORE_ARTIFACT_DIRS;
  const filesToCreate = quick
    ? PROJECT_CORE_ARTIFACT_FILES.filter((f) => quickFileSet.has(f))
    : PROJECT_CORE_ARTIFACT_FILES;

  for (const dirName of dirsToCreate) {
    ensureDir(getProjectFilePath(targetDir, dirName));
  }

  for (const fileName of filesToCreate) {
    const destinationPath = getProjectFilePath(targetDir, fileName);
    if (copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(fileName),
      destinationPath,
      { logger }
    )) {
      createdPaths.push(destinationPath);
    }
  }

  if (!quick) {
    const exampleSpecPath = getProjectFilePath(targetDir, path.join("specs", "example.spec.md"));
    if (copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(path.join("specs", "example.spec.md")),
      exampleSpecPath,
      { logger }
    )) {
      createdPaths.push(exampleSpecPath);
    }
  }

  if (existingBaselineRecords.length === 0) {
    const baselineRecordPath = getProjectFilePath(targetDir, baselineContext.baselineRecordRelPath);
    if (copyTemplateIfMissing(
      targetDir,
      getProjectTemplatePath(BASELINE_LOG_TEMPLATE_FILE),
      baselineRecordPath,
      { logger }
    )) {
      createdPaths.push(baselineRecordPath);
    }
  }

  const tokenValues = {
    [TEMPLATE_TOKEN_INITIAL_BASELINE_ID]: baselineContext.baselineId,
    [TEMPLATE_TOKEN_INITIAL_BASELINE_FILE]: baselineContext.baselineFileName,
    [TEMPLATE_TOKEN_INITIAL_BASELINE_DATE]: baselineContext.confirmedDate,
  };
  for (const filePath of createdPaths) {
    applyProjectTemplateTokens(filePath, tokenValues);
  }
}

function getProjectArtifactEntries(targetDir, options = {}) {
  const baselineContext = options.baselineContext || createInitialBaselineContext();
  const baselineRecordRelPaths = listBaselineRecordRelativePaths(targetDir);
  return [
    ...PROJECT_CORE_ARTIFACT_FILES.map((relPath) => ({
      kind: "file",
      relPath: getProjectRelativePath(relPath),
      absolutePath: getProjectFilePath(targetDir, relPath),
    })),
    ...PROJECT_CORE_ARTIFACT_DIRS.map((relPath) => ({
      kind: "dir",
      relPath: getProjectRelativePath(relPath),
      absolutePath: getProjectFilePath(targetDir, relPath),
    })),
    ...(baselineRecordRelPaths.length > 0 ? baselineRecordRelPaths : [baselineContext.baselineRecordRelPath]).map((relPath) => ({
      kind: "file",
      relPath: getProjectRelativePath(relPath),
      absolutePath: getProjectFilePath(targetDir, relPath),
    })),
    {
      kind: "file",
      relPath: getProjectRelativePath(path.join("specs", "example.spec.md")),
      absolutePath: getProjectFilePath(targetDir, path.join("specs", "example.spec.md")),
    },
  ];
}

function getLaneProjectArtifactEntries(targetDir, options = {}) {
  const baselineContext = options.baselineContext || createInitialBaselineContext();
  const laneId = options.laneId || DEFAULT_LANE_ID;
  const entries = [];

  // Shared root files
  for (const fileName of PROJECT_SHARED_FILES) {
    const templatePath = path.join(PROJECT_TEMPLATE_ROOT, fileName);
    if (fs.existsSync(templatePath)) {
      entries.push({
        kind: "file",
        relPath: getProjectRelativePath(fileName),
        absolutePath: getProjectFilePath(targetDir, fileName),
        scope: "shared",
      });
    }
  }

  // Lane metadata
  entries.push({
    kind: "file",
    relPath: getLaneRelativePath(laneId, LANE_METADATA_FILE),
    absolutePath: getLaneMetadataPath(targetDir, laneId),
    scope: "lane",
  });

  // Lane delivery files
  for (const fileName of LANE_DELIVERY_FILES) {
    entries.push({
      kind: "file",
      relPath: getLaneRelativePath(laneId, fileName),
      absolutePath: getLaneFilePath(targetDir, laneId, fileName),
      scope: "lane",
    });
  }

  // Lane delivery dirs
  for (const dirName of LANE_DELIVERY_DIRS) {
    entries.push({
      kind: "dir",
      relPath: getLaneRelativePath(laneId, dirName),
      absolutePath: getLaneFilePath(targetDir, laneId, dirName),
      scope: "lane",
    });
  }

  // Specs example
  entries.push({
    kind: "file",
    relPath: getLaneRelativePath(laneId, path.join("specs", "example.spec.md")),
    absolutePath: getLaneFilePath(targetDir, laneId, path.join("specs", "example.spec.md")),
    scope: "lane",
  });

  // Baseline record
  entries.push({
    kind: "file",
    relPath: getLaneRelativePath(laneId, baselineContext.baselineRecordRelPath),
    absolutePath: getLaneFilePath(targetDir, laneId, baselineContext.baselineRecordRelPath),
    scope: "lane",
  });

  return entries;
}

function buildInstallPlan(targetDir, options = {}) {
  const profile = getInstallProfile(options.installProfile);
  const overwriteFramework = Boolean(options.overwriteFramework);
  const lite = Boolean(options.lite);
  const quick = Boolean(options.quick);
  const baselineContext = options.baselineContext || createInitialBaselineContext();
  const frameworkFiles = listManagedFiles(FRAMEWORK_ROOT)
    .filter((relPath) => !lite || isLiteIncluded(relPath))
    .map((relPath) => {
    const destinationPath = path.join(targetDir, relPath);
    const exists = fs.existsSync(destinationPath);
    return {
      kind: "framework",
      relPath,
      absolutePath: destinationPath,
      exists,
      action: exists && !overwriteFramework ? "keep" : "copy",
    };
    });

  const metadataFiles = [
    getProjectRelativePath(PROJECT_METADATA_FILE),
    getProjectRelativePath(PROJECT_MANAGED_FILES_MANIFEST),
  ].map((relPath) => ({
    kind: "metadata",
    relPath,
    absolutePath: resolveProjectPath(targetDir, relPath),
    exists: fs.existsSync(resolveProjectPath(targetDir, relPath)),
    action: "write",
  }));

  let projectEntries = [];
  if (profile.includeProjectFiles) {
    const useLaneLayout = !quick;
    const rawEntries = useLaneLayout
      ? getLaneProjectArtifactEntries(targetDir, { baselineContext })
      : getProjectArtifactEntries(targetDir, { baselineContext });
    projectEntries = rawEntries.map((entry) => {
      const exists = fs.existsSync(entry.absolutePath);
      return {
        kind: entry.kind === "dir" ? "project-dir" : "project-file",
        relPath: entry.relPath,
        absolutePath: entry.absolutePath,
        exists,
        action: exists ? "keep" : "create",
        scope: entry.scope || null,
      };
    });
  }

  const allEntries = [...frameworkFiles, ...metadataFiles, ...projectEntries];
  const summary = {
    frameworkCopyCount: frameworkFiles.filter((entry) => entry.action === "copy").length,
    frameworkKeepCount: frameworkFiles.filter((entry) => entry.action === "keep").length,
    metadataWriteCount: metadataFiles.length,
    projectCreateCount: projectEntries.filter((entry) => entry.action === "create").length,
    projectKeepCount: projectEntries.filter((entry) => entry.action === "keep").length,
    totalEntries: allEntries.length,
  };

  return {
    targetDir,
    profile,
    lite,
    entries: allEntries,
    frameworkFiles,
    metadataFiles,
    projectEntries,
    summary,
  };
}

function writeMetadata(targetDir, options = {}) {
  const metadataDir = getProjectRoot(targetDir);
  const metadataFile = getProjectFilePath(targetDir, PROJECT_METADATA_FILE);
  const frameworkVersion = readFrameworkVersion();
  const packageJson = readPackageJson();
  const profileName = getInstallProfile(
    options.installProfile || detectInstallProfileName(targetDir)
  ).name;
  const frameworkFootprint = normalizeFrameworkFootprint(
    options.frameworkFootprint || detectFrameworkFootprint(targetDir)
  );

  ensureDir(metadataDir);
  fs.writeFileSync(
    metadataFile,
    serializeSimpleToml({
      mode: "npx-git",
      framework_version: frameworkVersion,
      package_name: packageJson.name,
      package_version: packageJson.version,
      install_profile: profileName,
      framework_footprint: frameworkFootprint,
      managed_files_manifest: getProjectRelativePath(PROJECT_MANAGED_FILES_MANIFEST),
    }),
    "utf8"
  );
}

function writeManagedFilesManifest(targetDir, options = {}) {
  const manifestPath = getProjectFilePath(targetDir, PROJECT_MANAGED_FILES_MANIFEST);
  const frameworkFootprint = normalizeFrameworkFootprint(
    options.frameworkFootprint || detectFrameworkFootprint(targetDir)
  );
  const lines = listSourceManagedFiles({ frameworkFootprint })
    .filter((relPath) => fs.existsSync(path.join(targetDir, relPath)))
    .map((relPath) => `${sha256File(path.join(targetDir, relPath))}\t${relPath}`);
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, [...lines, ""].join("\n"), "utf8");
}

function removeManagedPaths(targetDir) {
  for (const relPath of MANAGED_ROOTS) {
    const absolutePath = path.join(targetDir, relPath);
    try {
      fs.lstatSync(absolutePath);
    } catch (_e) {
      continue;
    }
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// YAML utilities shared by project-state and CLI validators
// ---------------------------------------------------------------------------

function cleanYamlScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }
  const body = trimmed.slice(1, -1).trim();
  if (!body) {
    return [];
  }
  return body
    .split(",")
    .map((item) => cleanYamlScalar(item))
    .filter(Boolean);
}

function countTopLevelYamlListEntries(content, key) {
  const keyName = String(key || "").trim();
  if (!content || !keyName) {
    return 0;
  }

  const lines = content.split(/\r?\n/);
  const sectionPattern = new RegExp(`^${escapeRegExp(keyName)}:\\s*(.*)$`);
  let foundSection = false;
  let itemIndent = null;
  let count = 0;

  for (const line of lines) {
    if (!foundSection) {
      const match = line.match(sectionPattern);
      if (!match) {
        continue;
      }

      foundSection = true;
      const inlineValue = match[1].trim();
      if (inlineValue) {
        return parseInlineArray(inlineValue).length;
      }
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (!/^\s/.test(line)) {
      break;
    }

    const itemMatch = line.match(/^(\s*)-\s+/);
    if (!itemMatch) {
      continue;
    }

    const indent = itemMatch[1].length;
    if (itemIndent === null) {
      itemIndent = indent;
    }
    if (indent === itemIndent) {
      count += 1;
    }
  }

  return count;
}

function normalizeFailureModeGuardReference(value) {
  return stripProjectRootPrefix(normalizeRelativePath(String(value || "").trim()));
}

function parseVerificationMatrixFailureModes(content) {
  const result = {
    hasSection: false,
    entries: [],
  };

  if (!content) {
    return result;
  }

  const lines = content.split(/\r?\n/);
  let inSection = false;
  let currentEntry = null;
  let currentListKey = "";

  for (const line of lines) {
    if (!inSection) {
      const sectionMatch = line.match(/^failure_modes:\s*(.*)$/);
      if (!sectionMatch) {
        continue;
      }

      result.hasSection = true;
      const inlineValue = sectionMatch[1].trim();
      if (inlineValue) {
        return result;
      }

      inSection = true;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    if (!/^\s/.test(line)) {
      break;
    }

    const entryStartMatch = line.match(/^\s*-\s+id:\s*(.+)$/);
    if (entryStartMatch) {
      currentEntry = {
        id: cleanYamlScalar(entryStartMatch[1]),
        guards: [],
      };
      result.entries.push(currentEntry);
      currentListKey = "";
      continue;
    }

    if (!currentEntry) {
      continue;
    }

    const fieldMatch = line.match(/^\s+([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      currentListKey = fieldName === "guards" ? "guards" : "";
      if (fieldName === "guards") {
        currentEntry.guards = fieldMatch[2]
          ? parseInlineArray(fieldMatch[2])
          : [];
      }
      continue;
    }

    const listItemMatch = line.match(/^\s*-\s+(.+)$/);
    if (currentListKey === "guards" && listItemMatch) {
      currentEntry.guards.push(cleanYamlScalar(listItemMatch[1]));
    }
  }

  return result;
}

function validateFailureModeGuards(content, options = {}) {
  const parsed = parseVerificationMatrixFailureModes(content);
  const knownEvidenceNames = new Set(
    (options.knownEvidenceNames || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
  const existingEvalFiles = new Set(
    (options.existingEvalFiles || [])
      .map((relPath) => normalizeFailureModeGuardReference(relPath))
      .filter(Boolean)
  );
  const issues = [];

  parsed.entries.forEach((entry, index) => {
    const entryLabel = entry.id || `failure_modes[${index + 1}]`;
    const guards = [...new Set((entry.guards || []).map((item) => String(item || "").trim()).filter(Boolean))];

    if (guards.length === 0) {
      issues.push(`${entryLabel}: guards is empty`);
      return;
    }

    for (const guard of guards) {
      if (knownEvidenceNames.has(guard)) {
        continue;
      }

      const normalizedGuard = normalizeFailureModeGuardReference(guard);
      if (normalizedGuard.startsWith("evals/")) {
        if (!existingEvalFiles.has(normalizedGuard)) {
          issues.push(`${entryLabel}: missing eval file: ${normalizedGuard}`);
        }
        continue;
      }

      issues.push(`${entryLabel}: unknown guard reference: ${guard}`);
    }
  });

  return {
    hasSection: parsed.hasSection,
    entries: parsed.entries,
    issues,
  };
}

// ---------------------------------------------------------------------------
// ANSI output symbols and colors
// ---------------------------------------------------------------------------

const SYM_OK = "\x1b[32m✓\x1b[0m";
const SYM_FAIL = "\x1b[31m✗\x1b[0m";
const SYM_WARN = "\x1b[33m⚠\x1b[0m";

const C_RESET = "\x1b[0m";
const C_RED = "\x1b[31m";
const C_GREEN = "\x1b[32m";
const C_YELLOW = "\x1b[33m";
const C_CYAN = "\x1b[36m";
const C_DIM = "\x1b[2m";

// ---------------------------------------------------------------------------
// Validation schemas (section names for artifact validation)
// ---------------------------------------------------------------------------

const VALIDATION_SCHEMAS = {
  mission: [
    "1. 交付基线摘要",
    "2. 用户与闭环场景",
    "3. 已确认约束与关键决策",
    "4. 范围边界与非目标",
    "5. 稳定风险与外部依赖",
  ],
  missionLegacy: [
    ["1. 宿主项目与当前交付定义", "1. 当前交付定义", "1. 任务定义"],
    "2. 用户与场景",
    "3. 项目模式、质量目标与关键选型",
    "4. 范围边界",
    "5. 阶段计划",
    "6. 已知输入与待确认项",
    "7. 风险与外部依赖",
  ],
  missionLegacyHotspots: [
    "## 5. 阶段计划",
    "### 待确认项",
    "### 澄清问题清单",
    "### 需求变更同步记录",
    "**当前阶段**",
    "**最新需求基准状态**",
    "**最近一次用户确认**",
  ],
  baselineRecordFields: [
    "Type",
    "Status",
    "Summary",
    "Affects",
    "Confirmed At",
  ],
  design: [
    "1. 设计目标",
    "2. 信息架构",
    "3. 关键页面与交互",
    "4. 关键流程",
    "5. 视觉方向",
    "6. 设计确认记录",
    "7. 差异与待确认项",
  ],
  releasePlan: [
    "1. 交付前检查",
    "2. 变更范围与依赖",
    "3. 发布步骤",
    "4. 运行态验证",
    "5. 回滚触发条件",
    "6. 交付说明与移交",
  ],
  memory: [
    "元数据",
    "1. 设计决策",
    "2. 逻辑与契约决策",
    "3. 工程约束",
    "4. 用户偏好",
    "5. 已知坑点",
  ],
  state: [
    "当前方位",
    "进度概览",
    "已锁定内容",
    "待确认项",
    "最近偏差 / 回退",
    "下一步",
    "最小阅读集",
  ],
  statePositionFields: [
    "项目模式",
    "当前阶段",
    "当前目标",
    "当前任务",
    "当前交付档位",
    "当前质量焦点",
    "当前确认停点",
    "最新需求基准状态",
  ],
  stateDeprecatedPositionFields: [
    "阶段",
  ],
  eval: [
    "场景",
    "错误交付",
    "AI-OS 预期行为",
    "最低证据",
    "若需改 framework，优先检查",
  ],
  spec: [
    "1. 模块概述",
    "2. 业务规则与目标",
    "3. 界面 / 接口 / 命令清单",
    "4. 关键流程与状态流转",
    "5. 数据与契约",
    "6. 边界条件与异常处理",
    "7. 验收与证据",
  ],
  specMarkers: [
    "**交互模式**",
    "**推荐模式理由**",
    "**拒绝的交互模式**",
    "**契约基准**",
    "**字段映射/适配说明**",
    "**共享层 / 包装层副作用审计**",
    "**集成触点**",
    "**路由 / 入口契约对照**",
    "**静态路径 / 动态路径冲突备注**",
    "**Schema / 存储一致性说明**",
    "**同仓正常实现对照**",
    "**异常/空数据证据**",
    "**最小验证步骤**",
  ],
  riskRegisterTablePattern: /\| ID \| 风险 \| 类型 \|/,
  tasksMarkers: [
    "version:",
    "baseline_id:",
    "milestones:",
    "tasks:",
    "wave:",
    "execution_role:",
    "approval_required:",
    "context_files:",
    "definition_of_ready:",
    "definition_of_done:",
    "evidence_required:",
    "parity_evidence_required:",
    "measurable_outcome:",
    "edge_cases:",
  ],
  tasksTransitionalMarkers: [
    "impact_tags:",
    "derived_checks:",
    "risk_triggers:",
    "parity_checks:",
    "similar_impl_refs:",
    "step_validation:",
  ],
  acceptanceMarkers: [
    "version:",
    "baseline_id:",
    "scope:",
    "gates:",
    "design-confirmation",
    "logic-confirmation",
    "implementation-quality",
    "delivery-readiness",
    "parity-gate",
  ],
  acceptanceMarkersTransitional: [
    "quality_tier:",
    "required_special_reviews:",
    "contract-baseline-check",
    "shared-impact-check",
    "route-contract-check",
    "schema-parity-check",
    "degraded-path-check",
    "static-validation-check",
    "manual-action-note",
    "state-triage-note",
  ],
  verificationMatrixMarkers: [
    "commands:",
    "rules:",
    "impact_rules:",
    "failure_modes:",
  ],
  releasePlanMarkersTransitional: [
    "AI 已完成",
    "需人工执行",
    "静态校验",
  ],
};

// ---------------------------------------------------------------------------
// IDE integration — generate Cursor / Claude Code / Antigravity files
// ---------------------------------------------------------------------------

const IDE_GENERATED_MARKER = "<!-- ai-os-generated -->";

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { name: "", description: "", body: content };
  const fm = match[1];
  const body = content.slice(match[0].length);
  let name = "";
  let description = "";
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  if (nameMatch) name = nameMatch[1].trim();
  const descMatch = fm.match(/^description:\s*(.+)$/m);
  if (descMatch) {
    const val = descMatch[1].trim();
    if (val !== ">" && val !== ">-") {
      description = val;
    }
  }
  if (!description) {
    const multiDescMatch = fm.match(/^description:\s*>-?\s*\n([\s\S]*?)(?=\n[a-zA-Z_-]+:|\s*$)/m);
    if (multiDescMatch) {
      description = multiDescMatch[1].replace(/\n\s+/g, " ").trim();
    }
  }
  return { name, description, body };
}

function sanitizeSlug(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Collect workflow metadata from the installed .agents/workflows/ directory.
 * Returns array of { slug, name, description, filePath }.
 */
function collectWorkflows(targetDir) {
  const workflowsDir = path.join(targetDir, ".agents", "workflows");
  if (!fs.existsSync(workflowsDir)) return [];
  const results = [];
  const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".md") && f !== "AGENTS.md");
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
    const { name, description } = extractFrontmatter(content);
    const slug = file.replace(/\.md$/, "");
    results.push({
      slug,
      name: name || slug,
      description: description || `AI-OS /${slug} workflow`,
      filePath: `.agents/workflows/${file}`,
    });
  }
  return results;
}

/**
 * Collect skill metadata from the installed .agents/skills/ directory.
 * Returns array of { slug, name, description, filePath }.
 */
function collectSkills(targetDir) {
  const skillsDir = path.join(targetDir, ".agents", "skills");
  if (!fs.existsSync(skillsDir)) return [];
  const results = [];
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, "utf8");
    const { name, description } = extractFrontmatter(content);
    results.push({
      slug: entry.name,
      name: name || entry.name,
      description: description || `AI-OS skill: ${entry.name}`,
      filePath: `.agents/skills/${entry.name}/SKILL.md`,
    });
  }
  return results;
}

const WORKFLOW_CURSOR_DESCRIPTIONS = {
  align: "AI-OS /align workflow：澄清目标、用户、范围、项目模式和质量标准。当用户提到 /align、需求对齐、项目启动、需求不清、目标确认、clarify goals 时触发。",
  design: "AI-OS /design workflow：锁定信息架构、关键页面、交互和视觉方向。当用户提到 /design、设计方案、锁定设计、页面设计、UI设计、lock design 时触发。",
  plan: "AI-OS /plan workflow：生成 spec、任务波次和验收计划。当用户提到 /plan、任务拆解、拆任务、规划任务、task planning 时触发。",
  build: "AI-OS /build workflow：按 wave 实现已确认的任务。当用户提到 /build、开始实现、开始开发、start building、implement 时触发。",
  verify: "AI-OS /verify workflow：验证设计一致性、逻辑正确性和交付证据。当用户提到 /verify、验证、验收、质量检查、quality check 时触发。",
  ship: "AI-OS /ship workflow：交付、发布、回滚和移交。当用户提到 /ship、发布、上线、交付、deploy、release 时触发。",
  "change-request": "AI-OS /change-request workflow：需求变更管理。当用户提到 /change-request、需求变更、改需求、scope change 时触发。",
  debug: "AI-OS /debug workflow：单点 bug 修复的轻量闭环。当用户提到 /debug、修 bug、调试、fix bug、troubleshoot 时触发。",
  review: "AI-OS /review workflow：多维度结构化审查。当用户提到 /review、代码审查、方案审查、code review 时触发。",
  postmortem: "AI-OS /postmortem workflow：复盘并沉淀经验。当用户提到 /postmortem、复盘、回顾、retrospective 时触发。",
  status: "AI-OS /status workflow：查看当前方位和进度。当用户提到 /status、项目状态、当前进度、project status 时触发。",
  next: "AI-OS /next workflow：推断下一个就绪任务。当用户提到 /next、下一步、接下来做什么、what's next 时触发。",
  resume: "AI-OS /resume workflow：恢复项目上下文。当用户提到 /resume、恢复上下文、继续项目、resume project 时触发。",
  "auto-advance": "AI-OS /auto-advance workflow：自动按任务波次推进。当用户提到 /auto-advance、自动推进、批量执行 时触发。",
};

const WORKFLOW_SUMMARIES = {
  align: "当用户需要澄清项目目标、启动新项目或处理模糊需求时使用。\n\n## 快速入口\n\n- 新项目/新模块/需求模糊 → 完整 /align\n- 已有项目局部变更 → 轻量确认目标、范围、验收",
  design: "当需要锁定关键页面、信息架构、交互和视觉方向时使用。\n\n## 快速入口\n\n- 有设计素材（截图/参考站） → 先收敛为 IA 和关键页面\n- 纯技术方案 → 锁定架构、接口和状态流转",
  plan: "当需求和设计已确认，需要拆解为可执行任务时使用。\n\n## 快速入口\n\n- P0 任务 → 完整拆解 spec / tasks / acceptance\n- P1 任务 → 轻量任务清单 + 验收标准",
  build: "当任务已确认，准备按 wave 实现时使用。\n\n## 快速入口\n\n- 有审批停点的任务 → 逐个确认后推进\n- 简单任务 → 按波次批量实现",
  verify: "当实现完成，需要验证质量和收集交付证据时使用。\n\n## 快速入口\n\n- 逐项核验需求 / 设计 / spec 的覆盖\n- 收集编译、测试、运行态证据",
  ship: "当验证通过，准备交付和发布时使用。\n\n## 快速入口\n\n- 输出交付说明、已实现/未实现清单\n- 确认回滚条件和人工操作清单",
  "change-request": "当已确认的需求发生变化时使用。\n\n## 快速入口\n\n- 先分析影响范围\n- 更新 MISSION / spec / DESIGN 基准后再执行",
  debug: "当遇到单点 bug 或轻量改动时使用。\n\n## 快速入口\n\n- 先定界：根因、影响、修复方案\n- 确认后定点修改 + 回归验证",
  review: "当需要对方案或代码做结构化审查时使用。\n\n## 快速入口\n\n- 输出带风险等级的问题清单\n- 按维度逐项审查",
  postmortem: "当项目或里程碑完成后需要复盘时使用。\n\n## 快速入口\n\n- 做得好/做得不好/改进措施\n- 沉淀到 memory.md",
  status: "查看当前项目状态、进度和待确认项。",
  next: "推断当前最值得执行且已满足条件的就绪任务。",
  resume: "从 STATE.md 恢复项目上下文和最小阅读集，用于新 session 或中断后继续。",
  "auto-advance": "在设计门和逻辑门通过后，按任务波次自动推进实现。需要用户明确授权。",
};

// --- Cursor generation ---

function generateCursorConstitutionRule(targetDir) {
  const cursorRulesDir = path.join(targetDir, ".cursor", "rules");
  ensureDir(cursorRulesDir);

  const agentsMdPath = path.join(targetDir, "AGENTS.md");
  if (!fs.existsSync(agentsMdPath)) return 0;

  const constitution = fs.readFileSync(agentsMdPath, "utf8");

  const workflowRouterPath = path.join(targetDir, ".agents", "workflows", "AGENTS.md");
  let routerSection = "";
  if (fs.existsSync(workflowRouterPath)) {
    routerSection = "\n\n---\n\n" + fs.readFileSync(workflowRouterPath, "utf8");
  }

  const skillRouterPath = path.join(targetDir, ".agents", "skills", "AGENTS.md");
  if (fs.existsSync(skillRouterPath)) {
    routerSection += "\n\n---\n\n" + fs.readFileSync(skillRouterPath, "utf8");
  }

  const lines = [
    "---",
    'description: "AI-OS delivery constitution — core rules for all AI actions in this project"',
    "alwaysApply: true",
    "---",
    "",
    IDE_GENERATED_MARKER,
    "",
    constitution.trim(),
    routerSection.trim(),
    "",
  ];

  fs.writeFileSync(
    path.join(cursorRulesDir, "ai-os-constitution.mdc"),
    lines.join("\n"),
    "utf8"
  );
  return 1;
}

function generateCursorSkills(targetDir) {
  const cursorSkillsDir = path.join(targetDir, ".cursor", "skills");
  let count = 0;

  const workflows = collectWorkflows(targetDir);
  for (const wf of workflows) {
    const skillDir = path.join(cursorSkillsDir, `ai-os-${sanitizeSlug(wf.slug)}`);
    ensureDir(skillDir);

    const desc = WORKFLOW_CURSOR_DESCRIPTIONS[wf.slug] ||
      `AI-OS /${wf.slug} workflow：${wf.description}。当用户提到 /${wf.slug} 时触发。`;
    const summary = WORKFLOW_SUMMARIES[wf.slug] || wf.description;

    const content = [
      "---",
      `name: ai-os-${sanitizeSlug(wf.slug)}`,
      "description: >-",
      `  ${desc}`,
      "---",
      IDE_GENERATED_MARKER,
      "",
      `# /${wf.slug} — ${wf.description}`,
      "",
      summary,
      "",
      "## 详细流程",
      "",
      `完整的 /${wf.slug} 工作流定义在 \`${wf.filePath}\`，请阅读该文件获取完整步骤和禁止事项。`,
      "",
    ];

    fs.writeFileSync(path.join(skillDir, "SKILL.md"), content.join("\n"), "utf8");
    count += 1;
  }

  const skills = collectSkills(targetDir);
  for (const sk of skills) {
    const skillDir = path.join(cursorSkillsDir, `ai-os-${sanitizeSlug(sk.slug)}`);
    ensureDir(skillDir);

    const content = [
      "---",
      `name: ai-os-${sanitizeSlug(sk.slug)}`,
      "description: >-",
      `  AI-OS skill：${sk.description}`,
      "---",
      IDE_GENERATED_MARKER,
      "",
      `# ${sk.name}`,
      "",
      sk.description,
      "",
      "## 详细指引",
      "",
      `完整的 skill 定义在 \`${sk.filePath}\`，请阅读该文件获取完整步骤。`,
      "",
    ];

    fs.writeFileSync(path.join(skillDir, "SKILL.md"), content.join("\n"), "utf8");
    count += 1;
  }

  return count;
}

// --- Claude Code generation ---

function generateClaudeMd(targetDir) {
  const claudePath = path.join(targetDir, "CLAUDE.md");

  if (fs.existsSync(claudePath)) {
    const existing = fs.readFileSync(claudePath, "utf8");
    if (!existing.includes(IDE_GENERATED_MARKER)) return 0;
  }

  const workflows = collectWorkflows(targetDir);
  const skills = collectSkills(targetDir);

  const wfRows = workflows.map((wf) =>
    `| /${wf.slug} | ${wf.description} | \`${wf.filePath}\` |`
  );

  const skRows = skills.map((sk) =>
    `| ${sk.name} | ${sk.description.slice(0, 80)}${sk.description.length > 80 ? "…" : ""} | \`${sk.filePath}\` |`
  );

  const lines = [
    IDE_GENERATED_MARKER,
    "",
    "# AI-OS 项目交付操作系统",
    "",
    "本项目使用 AI-OS 进行交付管理。完整规则见 `AGENTS.md`。",
    "",
    "## 会话初始化",
    "",
    "每次新 session 启动时，依次读取以下文件了解项目当前状态：",
    "",
    "1. `.ai-os/STATE.md` — 当前阶段、进度和待确认项",
    "2. `.ai-os/MISSION.md` — 已确认的当前交付基线章程",
    "3. `.ai-os/baseline-log/` — 最近的共享基线记录目录（优先读最新 confirmed 记录）",
    "4. `.ai-os/memory.md` — 稳定决策和约束（优先读 active 条目）",
    "",
    "如果上述文件不存在，说明项目尚未初始化，从 `/align` 开始。",
    "",
    "## 核心原则",
    "",
    "- 无已确认需求基准不编写业务代码",
    "- 关键设计和逻辑未锁定不大规模实现",
    "- 需求变更先更新基准再改代码",
    "- 完成必须有证据，不接受口头声明",
    "- 详细规则见 `AGENTS.md`",
    "",
    "## Workflow 命令",
    "",
    "| 命令 | 用途 | 详细流程 |",
    "|------|------|---------|",
    ...wfRows,
    "",
    "## Skill 能力",
    "",
    "遇到以下场景时，读取对应 skill 文件获取详细指引：",
    "",
    "| Skill | 触发场景 | 文件 |",
    "|-------|---------|------|",
    ...skRows,
    "",
    "## 分级流程",
    "",
    "- **P0**（新项目/大变更）：/align → /design → /plan → /build → /verify → /ship",
    "- **P1**（小功能）：/change-request → /plan → /build → /verify",
    "- **P2**（bug/微调）：/debug（方案确认 → 定界修改 → 验证回归）",
    "",
  ];

  fs.writeFileSync(claudePath, lines.join("\n"), "utf8");
  return 1;
}

// --- Antigravity (Gemini) generation ---

function generateGeminiMd(targetDir) {
  const geminiPath = path.join(targetDir, "GEMINI.md");

  if (fs.existsSync(geminiPath)) {
    const existing = fs.readFileSync(geminiPath, "utf8");
    if (!existing.includes(IDE_GENERATED_MARKER)) return 0;
  }

  const workflows = collectWorkflows(targetDir);

  const wfRows = workflows.map((wf) =>
    `| /${wf.slug} | ${wf.description} | \`${wf.filePath}\` |`
  );

  const lines = [
    IDE_GENERATED_MARKER,
    "",
    "# AI-OS 项目交付操作系统",
    "",
    "本项目使用 AI-OS 进行交付管理。完整规则已在 `AGENTS.md` 中定义（Antigravity 会自动加载）。",
    "本文件提供补充的快速参考。",
    "",
    "## 会话初始化",
    "",
    "每次新 session 启动时，依次读取：",
    "",
    "1. `.ai-os/STATE.md` — 当前阶段和进度",
    "2. `.ai-os/MISSION.md` — 已确认的当前交付基线",
    "3. `.ai-os/baseline-log/` — 最新基线确认记录目录",
    "4. `.ai-os/memory.md` — 稳定决策和约束",
    "",
    "## Workflow 命令",
    "",
    "| 命令 | 用途 | 详细流程 |",
    "|------|------|---------|",
    ...wfRows,
    "",
    "## Skill 引用",
    "",
    "专项能力定义在 `.agents/skills/` 下，每个子目录包含 `SKILL.md`。",
    "关键 skill 触发条件见 `.agents/skills/AGENTS.md`。",
    "",
  ];

  fs.writeFileSync(geminiPath, lines.join("\n"), "utf8");
  return 1;
}

// --- Clean generated IDE files ---

function cleanGeneratedIdeFiles(targetDir) {
  let removed = 0;

  const cursorRulesDir = path.join(targetDir, ".cursor", "rules");
  if (fs.existsSync(cursorRulesDir)) {
    for (const file of fs.readdirSync(cursorRulesDir).filter((f) => f.endsWith(".mdc"))) {
      const content = fs.readFileSync(path.join(cursorRulesDir, file), "utf8");
      if (content.includes(IDE_GENERATED_MARKER)) {
        fs.unlinkSync(path.join(cursorRulesDir, file));
        removed += 1;
      }
    }
  }

  const cursorSkillsDir = path.join(targetDir, ".cursor", "skills");
  if (fs.existsSync(cursorSkillsDir)) {
    for (const entry of fs.readdirSync(cursorSkillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith("ai-os-")) continue;
      const skillMd = path.join(cursorSkillsDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillMd)) {
        const content = fs.readFileSync(skillMd, "utf8");
        if (content.includes(IDE_GENERATED_MARKER)) {
          fs.rmSync(path.join(cursorSkillsDir, entry.name), { recursive: true, force: true });
          removed += 1;
        }
      }
    }
  }

  for (const file of ["CLAUDE.md", "GEMINI.md"]) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes(IDE_GENERATED_MARKER)) {
        fs.unlinkSync(filePath);
        removed += 1;
      }
    }
  }

  return removed;
}

/**
 * Generate IDE integration files for Cursor, Claude Code, and Antigravity.
 * Codex CLI needs no extra files (.agents/skills/ is natively compatible).
 */
function generateIdeFiles(targetDir, options = {}) {
  const { logger = defaultLogger } = options;

  if (!fs.existsSync(path.join(targetDir, "AGENTS.md"))) return null;

  cleanGeneratedIdeFiles(targetDir);

  const count = { cursor: 0, claude: 0, gemini: 0 };

  count.cursor += generateCursorConstitutionRule(targetDir);
  count.cursor += generateCursorSkills(targetDir);
  count.claude += generateClaudeMd(targetDir);
  count.gemini += generateGeminiMd(targetDir);

  logger(
    `IDE integration: Cursor (1 rule + ${count.cursor - 1} skills), ` +
    `Claude Code (CLAUDE.md), Antigravity (GEMINI.md)`
  );

  return count;
}

// ---------------------------------------------------------------------------
// Shared argument parsing
// ---------------------------------------------------------------------------

function parseCliArgs(argv, spec = {}) {
  const booleanFlags = spec.booleanFlags || [];
  const valuedFlags = spec.valuedFlags || [];
  const result = { positional: "", flags: {} };

  for (const flag of booleanFlags) {
    result.flags[flag.replace(/^--/, "")] = false;
  }

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      result.flags.help = true;
      continue;
    }
    if (booleanFlags.includes(arg)) {
      result.flags[arg.replace(/^--/, "")] = true;
      continue;
    }
    const valuedMatch = valuedFlags.find((f) => arg === f);
    if (valuedMatch) {
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
    if (result.positional) {
      fail(`unexpected argument: ${arg}`);
    }
    result.positional = arg;
  }

  return result;
}

function resolveTargetDir(positionalArg) {
  const targetDir = path.resolve(positionalArg || ".");
  if (!fs.existsSync(targetDir)) {
    fail(`target directory does not exist: ${targetDir}`);
  }
  return targetDir;
}

// ---------------------------------------------------------------------------
// Shared reporter factory
// ---------------------------------------------------------------------------

function createReporter() {
  let hasFailure = false;
  let warningCount = 0;

  function report(ok, label, options = {}) {
    const { warnOnly = false, details = [] } = typeof options === "object" && !Array.isArray(options)
      ? options
      : { details: Array.isArray(options) ? options : [] };

    if (ok) {
      process.stdout.write(`  ${SYM_OK}  ${label}\n`);
      return;
    }

    if (warnOnly) {
      warningCount += 1;
      process.stdout.write(`  ${SYM_WARN}  ${label}\n`);
    } else {
      hasFailure = true;
      process.stdout.write(`  ${SYM_FAIL}  ${label}\n`);
    }

    for (const detail of details) {
      process.stdout.write(`       - ${detail}\n`);
    }
  }

  return {
    report,
    markFailure() { hasFailure = true; },
    get hasFailure() { return hasFailure; },
    get warningCount() { return warningCount; },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  PACKAGE_ROOT,
  FRAMEWORK_ROOT,
  INSTALL_PROFILES_MANIFEST,
  MANAGED_ROOTS,
  PROJECT_STATE_ROOT,
  PROJECT_METADATA_FILE,
  PROJECT_MANAGED_FILES_MANIFEST,
  PROJECT_TEMPLATE_ROOT,
  LANE_TEMPLATE_ROOT,
  PROJECT_SHARED_FILES,
  LANE_DELIVERY_FILES,
  LANE_DELIVERY_DIRS,
  LANES_DIR,
  LANE_METADATA_FILE,
  DEFAULT_LANE_ID,
  LANE_ID_PATTERN,
  LANE_STATUS_ACTIVE,
  LANE_STATUS_DRAFT,
  LANE_STATUS_ARCHIVED,
  LANE_STATUSES,
  DELIVERY_MODEL_NONE,
  DELIVERY_MODEL_LEGACY,
  DELIVERY_MODEL_LANES,
  DELIVERY_MODEL_MIXED,
  PROJECT_CORE_ARTIFACT_FILES,
  PROJECT_OPTIONAL_ARTIFACT_FILES,
  PROJECT_ARTIFACT_FILES,
  PROJECT_CORE_ARTIFACT_DIRS,
  PROJECT_OPTIONAL_ARTIFACT_DIRS,
  PROJECT_ARTIFACT_DIRS,
  LEGACY_DELIVERY_ARTIFACT_FILES,
  LEGACY_DELIVERY_ARTIFACT_DIRS,
  LANE_CORE_ARTIFACT_FILES,
  LANE_OPTIONAL_ARTIFACT_FILES,
  LANE_CORE_ARTIFACT_DIRS,
  LANE_OPTIONAL_ARTIFACT_DIRS,
  LANE_ARTIFACT_FILES,
  LANE_ARTIFACT_DIRS,
  LITE_INCLUDES,
  LITE_DIR_PREFIXES,
  isLiteIncluded,
  QUICK_INCLUDES,
  QUICK_PROJECT_FILES,
  QUICK_PROJECT_DIRS,
  isQuickIncluded,
  QUALITY_TIERS,
  RISK_TIERS,
  IMPACT_TAGS,
  HIGH_RISK_SPECIAL_REVIEWS,
  readFrameworkVersion,
  readPackageJson,
  readInstallProfiles,
  detectInstallProfileName,
  detectFrameworkFootprint,
  getDefaultInstallProfileName,
  getInstallProfile,
  listSourceManagedFiles,
  ensureDir,
  fail,
  sha256File,
  listFilesRecursively,
  listManagedFiles,
  getProjectRoot,
  getProjectLanesRoot,
  getProjectFilePath,
  getProjectRelativePath,
  getLaneRelativePath,
  getLaneFilePath,
  getLaneMetadataPath,
  listProjectLanes,
  listLegacyDeliveryArtifactEntries,
  inspectLaneWorktreeImpact,
  inspectProjectDeliveryLayout,
  resolveProjectLane,
  buildLaneScopeNote,
  isLaneArtifactPath,
  resolveDeliveryPath,
  formatDeliveryPath,
  listProjectEvalFiles,
  getProjectMetadataPath,
  normalizeRelativePath,
  normalizeLaneId,
  validateLaneId,
  setDeliveryLaneContext,
  getDeliveryLaneContext,
  isProjectArtifactPath,
  resolveProjectPath,
  formatProjectPath,
  parseSimpleToml,
  serializeSimpleToml,
  createInitialBaselineContext,
  buildLaneMetadata,
  writeLaneMetadata,
  readInstalledMeta,
  copyFileWithMode,
  getProjectTemplatePath,
  copyFramework,
  copyTemplateIfMissing,
  createLaneProjectFiles,
  createProjectFiles,
  getProjectArtifactEntries,
  getLaneProjectArtifactEntries,
  buildInstallPlan,
  writeMetadata,
  writeManagedFilesManifest,
  removeManagedPaths,
  appendGitignoreEntries,
  appendGitattributesEntries,
  GITIGNORE_ENTRIES,
  GITATTRIBUTES_ENTRIES,
  cleanYamlScalar,
  parseInlineArray,
  countTopLevelYamlListEntries,
  validateFailureModeGuards,
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
  createReporter,
  VALIDATION_SCHEMAS,
  IDE_GENERATED_MARKER,
  generateIdeFiles,
  cleanGeneratedIdeFiles,
};
