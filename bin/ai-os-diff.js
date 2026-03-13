#!/usr/bin/env node

/**
 * ai-os-diff — Compare a project's framework files against the AI-OS source.
 *
 * Usage:
 *   ai-os-diff [target-dir] [--quiet] [--stat]
 *   ai-os-diff --help
 */

const fs = require("fs");
const path = require("path");
const {
  FRAMEWORK_ROOT,
  PROJECT_MANAGED_FILES_MANIFEST,
  readFrameworkVersion,
  listManagedFiles,
  readInstalledMeta,
  sha256File,
  fail,
} = require("./shared");

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const C_RESET = "\x1b[0m";
const C_RED = "\x1b[31m";
const C_GREEN = "\x1b[32m";
const C_YELLOW = "\x1b[33m";
const C_CYAN = "\x1b[36m";
const C_DIM = "\x1b[2m";

// ---------------------------------------------------------------------------
// Diff logic (exported for reuse by upgrade)
// ---------------------------------------------------------------------------

/**
 * Compute the diff between source (mother repo) and target project.
 *
 * Returns { modified, outdated, missing, extra, unchanged, sourceVersion, targetVersion }
 * Each bucket is an array of relative paths.
 */
function readManagedFilesManifest(targetDir, meta) {
  const manifestRelPath = meta.values?.managed_files_manifest || path.posix.join(".ai-os", PROJECT_MANAGED_FILES_MANIFEST);
  const manifestPath = path.join(targetDir, manifestRelPath);
  if (!fs.existsSync(manifestPath)) {
    return new Map();
  }

  const manifest = new Map();
  for (const line of fs.readFileSync(manifestPath, "utf8").split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const [hash, relPath] = line.split("\t");
    if (hash && relPath) {
      manifest.set(relPath.trim(), hash.trim());
    }
  }

  return manifest;
}

function computeDiff(targetDir) {
  const sourceManaged = listManagedFiles(FRAMEWORK_ROOT);
  const targetManaged = listManagedFiles(targetDir);
  const sourceSet = new Set(sourceManaged);
  const targetSet = new Set(targetManaged);
  const meta = readInstalledMeta(targetDir);
  const installedManifest = readManagedFilesManifest(targetDir, meta);

  const modified = [];
  const outdated = [];
  const missing = [];
  const unchanged = [];
  const extra = [];

  // Compare source files against target
  for (const rel of sourceManaged) {
    const targetPath = path.join(targetDir, rel);
    if (!targetSet.has(rel)) {
      missing.push(rel);
      continue;
    }
    const srcHash = sha256File(path.join(FRAMEWORK_ROOT, rel));
    const dstHash = sha256File(targetPath);
    if (srcHash !== dstHash) {
      const baselineHash = installedManifest.get(rel);
      if (baselineHash && baselineHash === dstHash) {
        outdated.push(rel);
      } else {
        modified.push(rel);
      }
    } else {
      unchanged.push(rel);
    }
  }

  // Files in target but not in source
  for (const rel of targetManaged) {
    if (!sourceSet.has(rel)) {
      extra.push(rel);
    }
  }
  return {
    modified,
    outdated,
    missing,
    extra,
    unchanged,
    sourceVersion: readFrameworkVersion(),
    targetVersion: meta.exists ? meta.version : "unknown",
    baselineAvailable: installedManifest.size > 0,
  };
}

// Allow upgrade command to import this
module.exports = { computeDiff };

// ---------------------------------------------------------------------------
// CLI — only runs when this file is the main entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  function printHelp() {
    process.stdout.write(`Usage:
  ai-os-diff [target-dir] [--quiet] [--stat]

Compare a project's framework files against the AI-OS source.

Options:
  --quiet   Only show modified, outdated, missing, and extra files (hide unchanged)
  --stat    Only show the summary statistics line
  -h, --help   Show this help message
`);
  }

  const args = process.argv.slice(2);
  let targetArg = "";
  let quiet = false;
  let statOnly = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--quiet") {
      quiet = true;
      continue;
    }
    if (arg === "--stat") {
      statOnly = true;
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

  const result = computeDiff(TARGET_DIR);

  const header = `AI-OS diff: project v${result.targetVersion} ↔ source v${result.sourceVersion}\n`;

  if (statOnly) {
    process.stdout.write(header);
    process.stdout.write(
      `\n${result.modified.length} modified, ${result.outdated.length} outdated, ${result.missing.length} missing, ${result.extra.length} extra, ${result.unchanged.length} unchanged\n`
    );
    process.exit(0);
  }

  process.stdout.write(`\n${header}\n`);

  for (const f of result.modified) {
    process.stdout.write(`  ${C_YELLOW}modified:${C_RESET}   ${f}\n`);
  }
  for (const f of result.outdated) {
    process.stdout.write(`  ${C_CYAN}outdated:${C_RESET}   ${f}  ${C_DIM}(safe to upgrade)${C_RESET}\n`);
  }
  for (const f of result.missing) {
    process.stdout.write(`  ${C_RED}missing:${C_RESET}    ${f}  ${C_DIM}(new in source)${C_RESET}\n`);
  }
  for (const f of result.extra) {
    process.stdout.write(`  ${C_CYAN}extra:${C_RESET}      ${f}  ${C_DIM}(not in source)${C_RESET}\n`);
  }
  if (!quiet) {
    for (const f of result.unchanged) {
      process.stdout.write(`  ${C_GREEN}unchanged:${C_RESET}  ${f}\n`);
    }
  }

  process.stdout.write(
    `\nSummary: ${result.modified.length} modified, ${result.outdated.length} outdated, ${result.missing.length} missing, ${result.extra.length} extra, ${result.unchanged.length} unchanged\n\n`
  );
}
