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
  readFrameworkVersion,
  readPackageJson,
  readInstalledMeta,
  copyFileWithMode,
  ensureDir,
  fail,
} = require("./shared");
const { computeDiff } = require("./ai-os-diff");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-upgrade [target-dir] [--force] [--dry-run]

Upgrade a project's framework files to the latest AI-OS source.

Options:
  --force     Skip conflict check and overwrite all framework files
  --dry-run   Show what would be done without making changes
  -h, --help  Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let force = false;
let dryRun = false;

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
    `No .ai-os-project/framework.toml found in ${TARGET_DIR}.\n` +
    `Initialize the project first:\n` +
    `  npx --yes github:royeedai/ai-os ${TARGET_DIR === process.cwd() ? "." : TARGET_DIR}`
  );
}

const frameworkVersion = readFrameworkVersion();
const packageJson = readPackageJson();

// ---------------------------------------------------------------------------
// Compute diff
// ---------------------------------------------------------------------------

const diff = computeDiff(TARGET_DIR);

const totalChanges = diff.modified.length + diff.missing.length;

if (totalChanges === 0) {
  process.stdout.write(`\nAlready up to date (v${frameworkVersion}).\n\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Show plan
// ---------------------------------------------------------------------------

process.stdout.write(`\nAI-OS upgrade: v${diff.targetVersion} → v${diff.sourceVersion}\n\n`);

if (diff.modified.length > 0) {
  process.stdout.write(`  Files to update (${diff.modified.length}):\n`);
  for (const f of diff.modified) {
    process.stdout.write(`    ↻ ${f}\n`);
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

// ---------------------------------------------------------------------------
// Execute upgrade
// ---------------------------------------------------------------------------

const filesToWrite = [...diff.modified, ...diff.missing];

for (const rel of filesToWrite) {
  const src = path.join(PACKAGE_ROOT, rel);
  const dst = path.join(TARGET_DIR, rel);
  copyFileWithMode(src, dst);
}

// Update framework.toml
const metaDir = path.join(TARGET_DIR, ".ai-os-project");
ensureDir(metaDir);
fs.writeFileSync(
  path.join(metaDir, "framework.toml"),
  [
    `mode = "${meta.mode || "npx-git"}"`,
    `framework_version = "${frameworkVersion}"`,
    `package_name = "${packageJson.name}"`,
    `package_version = "${packageJson.version}"`,
    "",
  ].join("\n"),
  "utf8"
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

process.stdout.write(`
Upgrade complete.

  Previous version: ${diff.targetVersion}
  Current version:  ${frameworkVersion}
  Target project:   ${TARGET_DIR}
  Updated files:    ${diff.modified.length}
  Created files:    ${diff.missing.length}
`);

if (diff.extra.length > 0) {
  process.stdout.write(`  Extra files:     ${diff.extra.length} (kept)\n`);
}

process.stdout.write("\n");
