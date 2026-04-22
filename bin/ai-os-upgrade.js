#!/usr/bin/env node

/**
 * AI-OS v9 upgrade: migrate older AI-OS layouts to the canonical
 * shared-root + .ai-os/lanes/default/ structure.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const {
  DEFAULT_LANE_ID,
  ROOT_ONLY_LEGACY_FILES,
  ROOT_ONLY_LEGACY_DIRS,
  readFrameworkVersion,
  readMetadata,
  writeMetadata,
  writeManagedFilesManifest,
  installAgentsMd,
  installArtifacts,
  installIdeFiles,
  appendGitignoreEntries,
  appendGitattributesEntries,
  getAiOsDir,
  getLaneDir,
  detectLayout,
  parseMissionBaselineId,
  normalizeLaneToml,
  inferQualityTier,
  inferRiskTier,
  fail,
  fileExists,
  isDirectory,
  readText,
} = require("./shared");

function printHelp() {
  process.stdout.write(`create-ai-os upgrade — Migrate older AI-OS layouts to v9

Usage:
  create-ai-os upgrade [target-dir]

Options:
  --dry-run    Show what would change without writing files
  --force      Reserved for forward compatibility (currently ignored)
  -h, --help   Show this help

Safe operations only. Does not touch business code outside AI-OS-managed files.
`);
}

function parseArgs(argv) {
  const opts = { target: "", dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { printHelp(); process.exit(0); }
    if (arg === "--dry-run") { opts.dryRun = true; continue; }
    if (arg === "--force") { continue; }
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

function ensureDirIfNeeded(absPath, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(absPath, { recursive: true });
}

function removeFile(absPath, dryRun) {
  if (!fileExists(absPath)) return false;
  if (!dryRun) fs.unlinkSync(absPath);
  return true;
}

function removeDir(absPath, dryRun) {
  if (!fileExists(absPath)) return false;
  if (!dryRun) fs.rmSync(absPath, { recursive: true, force: true });
  return true;
}

function movePath(src, dest, dryRun, label) {
  if (!fileExists(src)) return false;
  log(dryRun, "move", label || `${src} -> ${dest}`);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
  }
  return true;
}

function appendMarkdownSection(destFile, title, body, dryRun) {
  if (!body || !body.trim()) return false;
  if (!fileExists(destFile)) return false;
  const header = `\n\n## ${title}\n\n`;
  const block = `${header}${body.trimEnd()}\n`;
  if (dryRun) return true;
  const existing = fs.readFileSync(destFile, "utf8");
  fs.writeFileSync(destFile, existing.trimEnd() + block);
  return true;
}

function appendCommentAppendix(destFile, title, body, dryRun) {
  if (!body || !body.trim()) return false;
  if (!fileExists(destFile)) return false;
  const commentLines = body.trimEnd().split(/\r?\n/).map((line) => `# ${line}`);
  const block = `\n# --- ${title} ---\n${commentLines.join("\n")}\n`;
  if (dryRun) return true;
  const existing = fs.readFileSync(destFile, "utf8");
  fs.writeFileSync(destFile, existing.trimEnd() + block);
  return true;
}

function appendMigrationAppendix(destFile, title, body, dryRun) {
  const ext = path.extname(destFile).toLowerCase();
  if (ext === ".yaml" || ext === ".yml") {
    return appendCommentAppendix(destFile, title, body, dryRun);
  }
  return appendMarkdownSection(destFile, title, body, dryRun);
}

function uniqueLegacyPath(destFile, suffix = "root-legacy") {
  const dir = path.dirname(destFile);
  const ext = path.extname(destFile);
  const base = path.basename(destFile, ext);
  let candidate = path.join(dir, `${base}-${suffix}${ext}`);
  let index = 2;
  while (fileExists(candidate)) {
    candidate = path.join(dir, `${base}-${suffix}-${index}${ext}`);
    index += 1;
  }
  return candidate;
}

function listFilesRecursive(rootDir, relPrefix = "") {
  if (!isDirectory(rootDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const nextRel = relPrefix ? path.join(relPrefix, entry.name) : entry.name;
    const abs = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(abs, nextRel));
    } else if (entry.isFile()) {
      out.push(nextRel);
    }
  }
  return out.sort();
}

function mergeDirectoryInto(srcDir, destDir, dryRun, labelPrefix) {
  if (!isDirectory(srcDir)) return;
  const relFiles = listFilesRecursive(srcDir);
  for (const rel of relFiles) {
    const srcFile = path.join(srcDir, rel);
    const destFile = path.join(destDir, rel);
    const srcContent = readText(srcFile);
    if (!fileExists(destFile)) {
      log(dryRun, "move", `${labelPrefix}/${rel} -> ${path.relative(path.dirname(destDir), destFile)}`);
      if (!dryRun) {
        fs.mkdirSync(path.dirname(destFile), { recursive: true });
        fs.renameSync(srcFile, destFile);
      }
      continue;
    }
    const destContent = readText(destFile);
    if (srcContent === destContent) {
      log(dryRun, "remove", `${labelPrefix}/${rel} (duplicate)`);
      if (!dryRun) fs.unlinkSync(srcFile);
      continue;
    }
    const altDest = uniqueLegacyPath(destFile);
    log(dryRun, "conflict", `${labelPrefix}/${rel} -> ${path.relative(path.dirname(destDir), altDest)}`);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(altDest), { recursive: true });
      fs.renameSync(srcFile, altDest);
    }
  }
  removeDir(srcDir, dryRun);
}

function mergeLegacyFileIntoLane(srcFile, destFile, dryRun, title) {
  if (!fileExists(srcFile)) return;
  const srcContent = readText(srcFile);
  if (!fileExists(destFile)) {
    movePath(srcFile, destFile, dryRun, `${path.basename(srcFile)} -> ${path.relative(path.dirname(destFile), destFile)}`);
    return;
  }
  if (readText(destFile) !== srcContent) {
    log(dryRun, "merge", `${path.basename(srcFile)} -> ${path.relative(path.dirname(destFile), destFile)} (${title})`);
    appendMigrationAppendix(destFile, title, srcContent, dryRun);
  } else {
    log(dryRun, "remove", `${path.basename(srcFile)} (duplicate)`);
  }
  removeFile(srcFile, dryRun);
}

function rootLegacyPath(aiOsDir, relPath) {
  return path.join(aiOsDir, relPath);
}

function lanePath(laneDir, relPath) {
  return path.join(laneDir, relPath);
}

function collectLegacyPayloads(aiOsDir, laneDir) {
  return {
    rootMission: readText(rootLegacyPath(aiOsDir, "MISSION.md")),
    rootProject: readText(rootLegacyPath(aiOsDir, "project.md")),
    rootConventions: readText(rootLegacyPath(aiOsDir, "CONVENTIONS.md")),
    rootAcceptance: readText(rootLegacyPath(aiOsDir, "acceptance.yaml")),
    laneAcceptance: readText(lanePath(laneDir, "acceptance.yaml")),
    laneMemory: readText(lanePath(laneDir, "memory.md")),
    hadLaneToml: fileExists(lanePath(laneDir, "lane.toml")),
  };
}

function normalizeRootOnlyIntoLane(aiOsDir, laneDir, dryRun) {
  ensureDirIfNeeded(laneDir, dryRun);
  for (const file of ROOT_ONLY_LEGACY_FILES) {
    const src = rootLegacyPath(aiOsDir, file);
    if (!fileExists(src)) continue;
    const dest = lanePath(laneDir, file);
    movePath(src, dest, dryRun, `${file} -> lanes/default/${file}`);
  }
  for (const dirName of ROOT_ONLY_LEGACY_DIRS) {
    const src = rootLegacyPath(aiOsDir, dirName);
    if (!fileExists(src)) continue;
    const dest = lanePath(laneDir, dirName);
    if (!fileExists(dest)) {
      movePath(src, dest, dryRun, `${dirName}/ -> lanes/default/${dirName}/`);
    } else {
      mergeDirectoryInto(src, dest, dryRun, dirName);
    }
  }
}

function normalizeHybridIntoLane(aiOsDir, laneDir, dryRun) {
  ensureDirIfNeeded(laneDir, dryRun);
  for (const file of ROOT_ONLY_LEGACY_FILES) {
    const src = rootLegacyPath(aiOsDir, file);
    if (!fileExists(src)) continue;
    const dest = lanePath(laneDir, file);
    const title = `迁移附录（来自 legacy root ${file}）`;
    mergeLegacyFileIntoLane(src, dest, dryRun, title);
  }
  for (const dirName of ROOT_ONLY_LEGACY_DIRS) {
    const src = rootLegacyPath(aiOsDir, dirName);
    if (!fileExists(src)) continue;
    const dest = lanePath(laneDir, dirName);
    if (!fileExists(dest)) {
      movePath(src, dest, dryRun, `${dirName}/ -> lanes/default/${dirName}/`);
    } else {
      mergeDirectoryInto(src, dest, dryRun, dirName);
    }
  }
}

function cleanupLegacyAuxFiles(aiOsDir, laneDir, dryRun) {
  const legacyFiles = [
    rootLegacyPath(aiOsDir, "project.md"),
    rootLegacyPath(aiOsDir, "CONVENTIONS.md"),
    rootLegacyPath(aiOsDir, "acceptance.yaml"),
    lanePath(laneDir, "acceptance.yaml"),
    lanePath(laneDir, "memory.md"),
  ];
  for (const file of legacyFiles) {
    if (!fileExists(file)) continue;
    log(dryRun, "remove", path.relative(aiOsDir, file));
    removeFile(file, dryRun);
  }
}

function cleanupIdeAutoGenerated(targetDir, dryRun) {
  const candidates = [
    path.join(targetDir, ".cursor", "skills"),
    path.join(targetDir, ".cursor", "rules"),
  ];
  for (const candidate of candidates) {
    if (!fileExists(candidate)) continue;
    log(dryRun, "remove", path.relative(targetDir, candidate));
    removeDir(candidate, dryRun);
  }
}

function cleanupObsoleteFramework(targetDir, dryRun) {
  const candidates = [
    path.join(targetDir, ".agents", "workflows"),
    path.join(targetDir, ".agents", "skills"),
    path.join(targetDir, ".agents", "policies"),
    path.join(targetDir, ".agents", "references"),
    path.join(targetDir, ".agents"),
  ];
  for (const candidate of candidates) {
    if (!fileExists(candidate)) continue;
    log(dryRun, "remove", path.relative(targetDir, candidate));
    removeDir(candidate, dryRun);
  }
}

function finalizeSharedMission(targetDir, payloads, dryRun) {
  const dest = path.join(getAiOsDir(targetDir), "MISSION.md");
  if (payloads.rootMission && payloads.rootMission.trim()) {
    log(dryRun, "merge", ".ai-os/MISSION.md <- legacy root MISSION.md");
    appendMarkdownSection(dest, "宿主项目上下文（从 legacy root MISSION.md 合并）", payloads.rootMission, dryRun);
  }
  if (payloads.rootProject && payloads.rootProject.trim()) {
    log(dryRun, "merge", ".ai-os/MISSION.md <- legacy project.md");
    appendMarkdownSection(dest, "宿主项目上下文（从 legacy project.md 合并）", payloads.rootProject, dryRun);
  }
}

function finalizeSharedMemory(targetDir, payloads, dryRun) {
  const dest = path.join(getAiOsDir(targetDir), "memory.md");
  if (payloads.rootConventions && payloads.rootConventions.trim()) {
    log(dryRun, "merge", ".ai-os/memory.md <- legacy CONVENTIONS.md");
    appendMarkdownSection(dest, "约定（从 legacy CONVENTIONS.md 合并）", payloads.rootConventions, dryRun);
  }
  if (payloads.laneMemory && payloads.laneMemory.trim()) {
    log(dryRun, "merge", ".ai-os/memory.md <- lanes/default/memory.md");
    appendMarkdownSection(dest, "约定（从 lanes/default/memory.md 合并）", payloads.laneMemory, dryRun);
  }
}

function finalizeLaneDesign(targetDir, payloads, dryRun) {
  const dest = path.join(getLaneDir(targetDir, DEFAULT_LANE_ID), "DESIGN.md");
  if (payloads.rootAcceptance && payloads.rootAcceptance.trim()) {
    const body = `\`\`\`yaml\n${payloads.rootAcceptance.trimEnd()}\n\`\`\``;
    log(dryRun, "merge", ".ai-os/lanes/default/DESIGN.md <- legacy acceptance.yaml");
    appendMarkdownSection(dest, "验收标准（从 legacy root acceptance.yaml 合并）", body, dryRun);
  }
  if (payloads.laneAcceptance && payloads.laneAcceptance.trim()) {
    const body = `\`\`\`yaml\n${payloads.laneAcceptance.trimEnd()}\n\`\`\``;
    log(dryRun, "merge", ".ai-os/lanes/default/DESIGN.md <- lanes/default/acceptance.yaml");
    appendMarkdownSection(dest, "验收标准（从 lanes/default/acceptance.yaml 合并）", body, dryRun);
  }
}

function writeNormalizedLaneToml(targetDir, payloads, dryRun) {
  const laneDir = getLaneDir(targetDir, DEFAULT_LANE_ID);
  const missionContent = readText(path.join(laneDir, "MISSION.md"));
  const baselineId = parseMissionBaselineId(missionContent);
  const qualityTier = inferQualityTier({
    hasRiskRegister: fileExists(path.join(laneDir, "risk-register.md")),
    hasReleasePlan: fileExists(path.join(laneDir, "release-plan.md")),
    hasVerificationMatrix: fileExists(path.join(laneDir, "verification-matrix.yaml")),
  });
  const riskTier = inferRiskTier({
    hasRiskRegister: fileExists(path.join(laneDir, "risk-register.md")),
    hasReleasePlan: fileExists(path.join(laneDir, "release-plan.md")),
  });
  log(dryRun, "normalize", ".ai-os/lanes/default/lane.toml");
  if (!dryRun) {
    normalizeLaneToml(targetDir, {
      laneId: DEFAULT_LANE_ID,
      baselineId,
      qualityTier,
      riskTier,
    });
  }
}

function main() {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  const targetDir = path.resolve(opts.target || ".");
  const aiOsDir = getAiOsDir(targetDir);
  const laneDir = getLaneDir(targetDir, DEFAULT_LANE_ID);

  if (!fileExists(aiOsDir) && !fileExists(path.join(targetDir, ".agents"))) {
    fail(`Not an AI-OS project: ${targetDir}. Run 'create-ai-os ${targetDir}' for a fresh install.`);
  }

  const version = readFrameworkVersion();
  const meta = readMetadata(targetDir);
  const layoutBefore = detectLayout(targetDir);

  process.stdout.write(`AI-OS v${version} upgrade ${opts.dryRun ? "(dry-run)" : ""} for ${targetDir}\n`);
  if (meta && meta.framework_version) {
    process.stdout.write(`Installed: v${meta.framework_version} -> target: v${version}\n`);
  }
  process.stdout.write(`Detected layout: ${layoutBefore}\n\n`);

  const payloads = collectLegacyPayloads(aiOsDir, laneDir);

  log(opts.dryRun, "replace", "AGENTS.md with v9 constitution");
  if (!opts.dryRun) installAgentsMd(targetDir, { overwrite: true });

  cleanupObsoleteFramework(targetDir, opts.dryRun);
  cleanupIdeAutoGenerated(targetDir, opts.dryRun);

  ensureDirIfNeeded(aiOsDir, opts.dryRun);

  if (layoutBefore === "shared-root-default-lane") {
    normalizeHybridIntoLane(aiOsDir, laneDir, opts.dryRun);
  } else if (layoutBefore === "hybrid-drift") {
    normalizeHybridIntoLane(aiOsDir, laneDir, opts.dryRun);
  } else {
    normalizeRootOnlyIntoLane(aiOsDir, laneDir, opts.dryRun);
  }

  cleanupLegacyAuxFiles(aiOsDir, laneDir, opts.dryRun);

  log(opts.dryRun, "fill", "missing v9 starter artifacts (non-overwriting)");
  if (!opts.dryRun) {
    installArtifacts(targetDir, { overwrite: false, createInitialBaselineRecord: false });
  }

  finalizeSharedMission(targetDir, payloads, opts.dryRun);
  finalizeSharedMemory(targetDir, payloads, opts.dryRun);
  finalizeLaneDesign(targetDir, payloads, opts.dryRun);
  writeNormalizedLaneToml(targetDir, payloads, opts.dryRun);

  log(opts.dryRun, "write", ".ai-os/framework.toml (v9)");
  if (!opts.dryRun) writeMetadata(targetDir, { version });

  log(opts.dryRun, "write", ".ai-os/managed-files.tsv (v9)");
  if (!opts.dryRun) writeManagedFilesManifest(targetDir);

  log(opts.dryRun, "write", "CLAUDE.md / GEMINI.md lightweight pointers");
  if (!opts.dryRun) installIdeFiles(targetDir, { overwrite: true });

  log(opts.dryRun, "update", ".gitignore / .gitattributes");
  if (!opts.dryRun) {
    appendGitignoreEntries(targetDir);
    appendGitattributesEntries(targetDir);
  }

  process.stdout.write(`
${opts.dryRun ? "Dry-run complete. No files were written." : "Upgrade complete."}

Next steps:
  1. Review .ai-os/MISSION.md for shared host-project context
  2. Review .ai-os/lanes/default/MISSION.md for the current delivery baseline
  3. Review .ai-os/lanes/default/DESIGN.md if you had acceptance.yaml
  4. Review .ai-os/memory.md if you had CONVENTIONS.md or lane-local memory
  5. Run: create-ai-os doctor ${opts.target || "."}
`);
}

main();
