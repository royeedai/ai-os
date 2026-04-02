#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");
const crypto = require("crypto");

const BIN = path.resolve(__dirname, "..", "bin");
const NODE = process.execPath;
const repoRoot = path.resolve(__dirname, "..");
const BASELINE_RECORD_NAME_PATTERN = /^(BL|CR)-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*[.]md$/;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    process.stdout.write(`  \x1b[32m\u2713\x1b[0m ${label}\n`);
  } else {
    failed += 1;
    process.stdout.write(`  \x1b[31m\u2717\x1b[0m ${label}\n`);
  }
}

function run(script, args = [], cwd) {
  return spawnSync(NODE, [path.join(BIN, script), ...args], {
    cwd: cwd || process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function tmpDir() {
  const dir = path.join(os.tmpdir(), `ai-os-test-${crypto.randomBytes(4).toString("hex")}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function listBaselineRecords(projectDir, prefix = "") {
  const baselineDir = path.join(projectDir, ".ai-os", "baseline-log");
  if (!fs.existsSync(baselineDir)) {
    return [];
  }
  return fs.readdirSync(baselineDir)
    .filter((name) => name.endsWith(".md") && (!prefix || name.startsWith(prefix)))
    .sort();
}

function extractMissionBaselineId(content) {
  const match = content.match(/^- \*\*当前基线 ID\*\*[:：]\s*(.+)$/m);
  return match ? match[1].trim() : "";
}

function section(title) {
  process.stdout.write(`\n=== ${title} ===\n`);
}

function getSummary() {
  return { passed, failed };
}

function resetCounters() {
  passed = 0;
  failed = 0;
}

module.exports = {
  BIN,
  NODE,
  repoRoot,
  BASELINE_RECORD_NAME_PATTERN,
  assert,
  run,
  tmpDir,
  cleanup,
  listBaselineRecords,
  extractMissionBaselineId,
  section,
  getSummary,
  resetCounters,
};
