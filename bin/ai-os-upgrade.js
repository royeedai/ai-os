#!/usr/bin/env node

/**
 * AI-OS v8 upgrade: migrate v7 project to v8
 *
 * Mechanical transformations:
 *   1. Replace root AGENTS.md with v8 version
 *   2. Delete framework/.agents/workflows/, skills/, policies/ from target
 *   3. Flatten .ai-os/lanes/default/* to .ai-os/* (if single-lane project)
 *   4. Merge .ai-os/CONVENTIONS.md into .ai-os/memory.md as an appended section
 *   5. Merge .ai-os/project.md into .ai-os/MISSION.md as "宿主项目上下文" section
 *   6. Merge .ai-os/lanes/_/acceptance.yaml into matching DESIGN.md as an appended section
 *   7. Rewrite .ai-os/framework.toml
 *   8. Reset .ai-os/managed-files.tsv
 *   9. Remove .cursor/skills and .cursor/rules auto-generated files
 *
 * Does not touch: business code, user-written content inside MISSION/DESIGN/specs/tasks/memory/baseline-log.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const {
  PROJECT_STATE_ROOT,
  readFrameworkVersion,
  readMetadata,
  writeMetadata,
  writeManagedFilesManifest,
  installAgentsMd,
  installArtifacts,
  installIdeFiles,
  appendGitignoreEntries,
  appendGitattributesEntries,
  fail,
  fileExists,
  ensureDir,
} = require("./shared");

function printHelp() {
  process.stdout.write(`create-ai-os upgrade — Migrate AI-OS v7 project to v8

Usage:
  create-ai-os upgrade [target-dir]

Options:
  --dry-run    Show what would change without writing files
  --force      Overwrite v8 conflicts (advanced; normally not needed)
  -h, --help   Show this help

Safe operations only. Does not touch your business code or user-written content.
`);
}

function parseArgs(argv) {
  const opts = { target: "", dryRun: false, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { printHelp(); process.exit(0); }
    if (arg === "--dry-run") { opts.dryRun = true; continue; }
    if (arg === "--force") { opts.force = true; continue; }
    if (arg.startsWith("-")) fail(`unknown option: ${arg}`);
    if (opts.target) fail(`unexpected argument: ${arg}`);
    opts.target = arg;
  }
  return opts;
}

function log(dryRun, action, label) {
  const prefix = dryRun ? "[dry-run]" : "[upgrade]";
  process.stdout.write(`${prefix} ${action}: ${label}\n`);
}

function removeFile(abs, dryRun) {
  if (!fileExists(abs)) return false;
  if (!dryRun) fs.unlinkSync(abs);
  return true;
}

function removeDir(abs, dryRun) {
  if (!fileExists(abs)) return false;
  if (!dryRun) fs.rmSync(abs, { recursive: true, force: true });
  return true;
}

function readText(abs) {
  return fileExists(abs) ? fs.readFileSync(abs, "utf8") : "";
}

function appendSection(destFile, sectionTitle, sectionBody, dryRun) {
  if (!fileExists(destFile)) return false;
  if (dryRun) return true;
  const existing = fs.readFileSync(destFile, "utf8");
  const header = `\n\n## ${sectionTitle} (v7 migration)\n\n`;
  const block = `${header}${sectionBody.trimEnd()}\n`;
  fs.writeFileSync(destFile, existing.trimEnd() + block);
  return true;
}

function detectLanesLayout(aiOsDir) {
  const lanesDir = path.join(aiOsDir, "lanes");
  if (!fileExists(lanesDir)) return { hasLanes: false, laneIds: [] };
  const laneIds = fs.readdirSync(lanesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  return { hasLanes: laneIds.length > 0, laneIds };
}

function flattenDefaultLane(aiOsDir, dryRun) {
  // If only lanes/default exists and no other lanes, flatten to root
  const { hasLanes, laneIds } = detectLanesLayout(aiOsDir);
  if (!hasLanes) return { flattened: false, reason: "no-lanes" };
  if (laneIds.length !== 1 || laneIds[0] !== "default") {
    return { flattened: false, reason: `multiple-lanes: ${laneIds.join(", ")}` };
  }
  const laneDir = path.join(aiOsDir, "lanes", "default");
  const entries = fs.readdirSync(laneDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "lane.toml") continue; // drop
    const src = path.join(laneDir, entry.name);
    const dest = path.join(aiOsDir, entry.name);
    if (fileExists(dest)) {
      // Root already has this file (shouldn't normally happen)
      continue;
    }
    log(dryRun, "move", `lanes/default/${entry.name} -> ${entry.name}`);
    if (!dryRun) {
      fs.renameSync(src, dest);
    }
  }
  log(dryRun, "remove", `lanes/ (flattened default to root)`);
  removeDir(path.join(aiOsDir, "lanes"), dryRun);
  return { flattened: true };
}

function upgradeConventionsIntoMemory(aiOsDir, dryRun) {
  const src = path.join(aiOsDir, "CONVENTIONS.md");
  const dest = path.join(aiOsDir, "memory.md");
  if (!fileExists(src)) return false;
  const conventions = readText(src);
  if (!fileExists(dest)) {
    // memory.md missing — move CONVENTIONS as memory.md base
    log(dryRun, "move", "CONVENTIONS.md -> memory.md (base)");
    if (!dryRun) fs.renameSync(src, dest);
    return true;
  }
  log(dryRun, "merge", "CONVENTIONS.md -> memory.md (appended section)");
  appendSection(dest, "约定（从 v7 CONVENTIONS.md 合并）", conventions, dryRun);
  removeFile(src, dryRun);
  return true;
}

function upgradeProjectIntoMission(aiOsDir, dryRun) {
  const src = path.join(aiOsDir, "project.md");
  const dest = path.join(aiOsDir, "MISSION.md");
  if (!fileExists(src)) return false;
  const projectContent = readText(src);
  if (!fileExists(dest)) {
    log(dryRun, "move", "project.md -> MISSION.md (base)");
    if (!dryRun) fs.renameSync(src, dest);
    return true;
  }
  log(dryRun, "merge", "project.md -> MISSION.md (appended section)");
  appendSection(dest, "宿主项目上下文（从 v7 project.md 合并）", projectContent, dryRun);
  removeFile(src, dryRun);
  return true;
}

function upgradeAcceptanceIntoDesign(aiOsDir, dryRun) {
  const src = path.join(aiOsDir, "acceptance.yaml");
  const dest = path.join(aiOsDir, "DESIGN.md");
  if (!fileExists(src)) return false;
  const acceptance = readText(src);
  if (!fileExists(dest)) {
    log(dryRun, "keep", "acceptance.yaml kept (no DESIGN.md to merge into)");
    return false;
  }
  log(dryRun, "merge", "acceptance.yaml -> DESIGN.md §13 (appended section)");
  const body = "```yaml\n" + acceptance.trimEnd() + "\n```";
  appendSection(dest, "验收标准（从 v7 acceptance.yaml 合并）", body, dryRun);
  removeFile(src, dryRun);
  return true;
}

function cleanupIdeAutoGenerated(targetDir, dryRun) {
  const removedPaths = [];
  const candidates = [
    path.join(targetDir, ".cursor", "skills"),
    path.join(targetDir, ".cursor", "rules"),
  ];
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      log(dryRun, "remove", path.relative(targetDir, candidate));
      removeDir(candidate, dryRun);
      removedPaths.push(candidate);
    }
  }
  return removedPaths;
}

function cleanupObsoleteFramework(targetDir, dryRun) {
  const removed = [];
  const candidates = [
    path.join(targetDir, ".agents", "workflows"),
    path.join(targetDir, ".agents", "skills"),
    path.join(targetDir, ".agents", "policies"),
    path.join(targetDir, ".agents", "references"),
    path.join(targetDir, ".agents"),
  ];
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      log(dryRun, "remove", path.relative(targetDir, candidate));
      removeDir(candidate, dryRun);
      removed.push(candidate);
    }
  }
  return removed;
}

function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  const targetDir = path.resolve(opts.target || ".");
  const aiOsDir = path.join(targetDir, PROJECT_STATE_ROOT);

  if (!fileExists(aiOsDir) && !fileExists(path.join(targetDir, ".agents"))) {
    fail(`Not an AI-OS project: ${targetDir}. Run 'create-ai-os ${targetDir}' for a fresh install.`);
  }

  const version = readFrameworkVersion();
  const meta = readMetadata(targetDir);

  process.stdout.write(`AI-OS v${version} upgrade ${opts.dryRun ? "(dry-run)" : ""} for ${targetDir}\n`);
  if (meta && meta.framework_version) {
    process.stdout.write(`Installed: v${meta.framework_version} -> target: v${version}\n\n`);
  } else {
    process.stdout.write(`No existing framework.toml found. Will treat as pre-v8 project.\n\n`);
  }

  // Step 1: replace AGENTS.md
  log(opts.dryRun, "replace", "AGENTS.md with v8 constitution");
  if (!opts.dryRun) installAgentsMd(targetDir, { overwrite: true });

  // Step 2: remove obsolete framework
  cleanupObsoleteFramework(targetDir, opts.dryRun);

  // Step 3: flatten single-default-lane layout
  if (fileExists(aiOsDir)) {
    flattenDefaultLane(aiOsDir, opts.dryRun);

    // Step 4-6: merge legacy files
    upgradeConventionsIntoMemory(aiOsDir, opts.dryRun);
    upgradeProjectIntoMission(aiOsDir, opts.dryRun);
    upgradeAcceptanceIntoDesign(aiOsDir, opts.dryRun);
  } else {
    ensureDir(aiOsDir);
  }

  // Step 7: refresh framework metadata
  log(opts.dryRun, "write", ".ai-os/framework.toml (v8)");
  if (!opts.dryRun) writeMetadata(targetDir, { version });

  // Step 8: rewrite managed files manifest
  log(opts.dryRun, "write", ".ai-os/managed-files.tsv (v8)");
  if (!opts.dryRun) writeManagedFilesManifest(targetDir);

  // Step 9: clean up IDE auto-generated dirs
  cleanupIdeAutoGenerated(targetDir, opts.dryRun);

  // Step 10: install lightweight IDE pointers
  log(opts.dryRun, "write", "CLAUDE.md / GEMINI.md lightweight pointers");
  if (!opts.dryRun) installIdeFiles(targetDir, { overwrite: true });

  // Step 11: fill in any missing v8 artifacts with starter templates (non-overwriting)
  log(opts.dryRun, "fill", "missing v8 starter artifacts (non-overwriting)");
  if (!opts.dryRun) {
    installArtifacts(targetDir, { overwrite: false });
  }

  // Step 12: refresh .gitignore / .gitattributes
  log(opts.dryRun, "update", ".gitignore / .gitattributes");
  if (!opts.dryRun) {
    appendGitignoreEntries(targetDir);
    appendGitattributesEntries(targetDir);
  }

  process.stdout.write(`
${opts.dryRun ? "Dry-run complete. No files were written." : "Upgrade complete."}

Next steps:
  1. Review AGENTS.md for v8 constitution
  2. Review .ai-os/DESIGN.md if you had acceptance.yaml (merged into §13)
  3. Review .ai-os/memory.md if you had CONVENTIONS.md (merged)
  4. Review .ai-os/MISSION.md if you had project.md (merged)
  5. Run: create-ai-os doctor ${opts.target || "."}
`);
}

main();
