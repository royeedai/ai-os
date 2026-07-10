#!/usr/bin/env node

/**
 * AI-OS v9 test helpers.
 */

const fs = require("fs");
const path = require("path");
const assert = require("node:assert/strict");
const { test, afterEach } = require("node:test");
const { spawnSync } = require("child_process");
const os = require("os");
const crypto = require("crypto");

const BIN = path.resolve(__dirname, "..", "bin");
const NODE = process.execPath;
const repoRoot = path.resolve(__dirname, "..");
const BASELINE_RECORD_NAME_PATTERN = /^(BL|CR)-\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*[.]md$/;

function run(script, args = [], cwd) {
  return spawnSync(NODE, [path.join(BIN, script), ...args], {
    cwd: cwd || process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runInstall(args = [], cwd) {
  return run("create-ai-os.js", args, cwd);
}

function runDoctor(args = [], cwd) {
  return run("ai-os-doctor.js", args, cwd);
}

// Runs the local doctor vendored into a target project (.ai-os/bin/ai-os-doctor.js).
// This is the zero-network entry teammates / CI use after a one-time install.
function runLocalDoctor(projectDir, args = [], cwd) {
  const doctor = path.join(projectDir, ".ai-os", "bin", "ai-os-doctor.js");
  return spawnSync(NODE, [doctor, ...args], {
    cwd: cwd || process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function tmpDir() {
  const dir = path.join(os.tmpdir(), `ai-os-v9-test-${crypto.randomBytes(4).toString("hex")}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function readFile(dir, relPath) {
  const abs = path.join(dir, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

function readRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function exists(dir, relPath) {
  return fs.existsSync(path.join(dir, relPath));
}

function listBaselineRecords(projectDir) {
  const baselineDir = path.join(projectDir, ".ai-os", "lanes", "default", "baseline-log");
  if (!fs.existsSync(baselineDir)) return [];
  return fs.readdirSync(baselineDir).filter((n) => n.endsWith(".md")).sort();
}

module.exports = {
  assert,
  test,
  afterEach,
  BIN,
  NODE,
  repoRoot,
  BASELINE_RECORD_NAME_PATTERN,
  run,
  runInstall,
  runDoctor,
  runLocalDoctor,
  tmpDir,
  cleanup,
  readFile,
  readRepo,
  exists,
  listBaselineRecords,
};
