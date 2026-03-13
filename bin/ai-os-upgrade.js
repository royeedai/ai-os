#!/usr/bin/env node

/**
 * ai-os-upgrade — Upgrade a project's framework files to the latest AI-OS source.
 *
 * Usage:
 *   ai-os-upgrade [target-dir] [--force] [--dry-run]
 *   ai-os-upgrade --help
 */

const fs = require("fs");
const path = require("path");
const {
  PACKAGE_ROOT,
  PROJECT_MANAGED_FILES_MANIFEST,
  readFrameworkVersion,
  readPackageJson,
  readInstalledMeta,
  copyFileWithMode,
  ensureDir,
  listManagedFiles,
  sha256File,
  getProjectFilePath,
  getProjectRelativePath,
  fail,
} = require("./shared");
const { computeDiff } = require("./ai-os-diff");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-upgrade [target-dir] [--force] [--dry-run] [--preflight]

Upgrade a project's framework files to the latest AI-OS source.

Options:
  --force     Skip conflict check and overwrite all framework files
  --dry-run   Show what would be done without making changes
  --preflight Check whether upgrade can proceed safely
  -h, --help  Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let force = false;
let dryRun = false;
let preflight = false;

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
  if (arg.startsWith("-")) {
    fail(`unknown option: ${arg}`);
  }
  if (targetArg) {
    fail(`unexpected argument: ${arg}`);
  }
  targetArg = arg;
}

const TARGET_DIR = path.resolve(targetArg || ".");

if (!fs.existsSync(TARGET_DIR)) {
  fail(`target directory does not exist: ${TARGET_DIR}`);
}

// ---------------------------------------------------------------------------
// Pre-flight
// ---------------------------------------------------------------------------

const meta = readInstalledMeta(TARGET_DIR);
if (!meta.exists) {
  fail(
    `No ${getProjectRelativePath("framework.toml")} found in ${TARGET_DIR}.\n` +
    `Initialize the project first:\n` +
    `  npx --yes github:royeedai/ai-os ${TARGET_DIR === process.cwd() ? "." : TARGET_DIR}`
  );
}
if (meta.mode === "submodule") {
  fail(
    [
      "ai-os-upgrade does not manage submodule installations.",
      "Update the framework by moving the submodule pointer instead.",
    ].join("\n")
  );
}

const frameworkVersion = readFrameworkVersion();
const packageJson = readPackageJson();

// ---------------------------------------------------------------------------
// Compute diff
// ---------------------------------------------------------------------------

const diff = computeDiff(TARGET_DIR);

const totalChanges = diff.modified.length + diff.outdated.length + diff.missing.length;

if (totalChanges === 0) {
  process.stdout.write(`\nAlready up to date (v${frameworkVersion}).\n\n`);
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

if (preflight) {
  process.stdout.write("\n");
  if (diff.modified.length > 0) {
    process.stdout.write("Preflight result: BLOCKED — rerun with --force only if overwriting conflicts is intended.\n\n");
    process.exit(1);
  }
  process.stdout.write("Preflight result: SAFE_TO_UPGRADE\n\n");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Detect stale files (in target but were previously managed, now removed from source)
// ---------------------------------------------------------------------------

// Files that exist in the target under managed roots but NOT in the source
// (diff.extra already captures these, but we label them differently if they
// were likely from a previous framework version rather than user-created)
// For simplicity, we just report extra as "kept as-is" above.

// ---------------------------------------------------------------------------
// Dry-run exit
// ---------------------------------------------------------------------------

if (dryRun) {
  process.stdout.write(`\n--dry-run: no changes were made.\n\n`);
  process.exit(0);
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
  const src = path.join(PACKAGE_ROOT, rel);
  const dst = path.join(TARGET_DIR, rel);
  copyFileWithMode(src, dst);
}

// Update framework.toml
const metaDir = path.dirname(getProjectFilePath(TARGET_DIR, "framework.toml"));
ensureDir(metaDir);
const nextMetaValues = {
  ...meta.values,
  mode: meta.mode || "npx-git",
  framework_version: frameworkVersion,
  package_name: packageJson.name,
  package_version: packageJson.version,
  managed_files_manifest: meta.values?.managed_files_manifest || getProjectRelativePath(PROJECT_MANAGED_FILES_MANIFEST),
};
fs.writeFileSync(
  getProjectFilePath(TARGET_DIR, "framework.toml"),
  [
    ...Object.entries(nextMetaValues).map(([key, value]) => `${key} = "${value}"`),
    "",
  ].join("\n"),
  "utf8"
);

const manifestPath = getProjectFilePath(TARGET_DIR, PROJECT_MANAGED_FILES_MANIFEST);
const manifestLines = listManagedFiles(TARGET_DIR).map((relPath) => `${sha256File(path.join(TARGET_DIR, relPath))}\t${relPath}`);
fs.writeFileSync(manifestPath, [...manifestLines, ""].join("\n"), "utf8");

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

process.stdout.write(`
Upgrade complete.

  Previous version: ${diff.targetVersion}
  Current version:  ${frameworkVersion}
  Target project:   ${TARGET_DIR}
  Updated files:    ${(force ? diff.modified.length : 0) + diff.outdated.length}
  Created files:    ${diff.missing.length}
`);

if (diff.extra.length > 0) {
  process.stdout.write(`  Extra files:     ${diff.extra.length} (kept)\n`);
}

process.stdout.write("\n");
