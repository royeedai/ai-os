"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");

const repoRoot = path.resolve(__dirname, "..");
const roots = new Set();
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const expectedFiles = [
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "VERSION",
  "bin/create-ai-os.js",
  "bin/installer.js",
  "framework/.agents/templates/root/AGENTS.md",
  "package.json",
];

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-package-"));
  roots.add(root);
  return root;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.clear();
});

test("package is a small zero-dependency lightweight installer", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(manifest.private, true);
  assert.deepEqual(manifest.dependencies || {}, {});
  assert.equal(manifest.bin["create-ai-os"], "./bin/create-ai-os.js");
  assert.deepEqual(manifest.files, expectedFiles.slice(0, -1));

  const report = JSON.parse(run("npm", ["pack", "--dry-run", "--json"]).stdout)[0];
  assert.deepEqual(report.files.map((entry) => entry.path).sort(), expectedFiles);
  assert.ok(report.unpackedSize <= 75_000, `unpacked package is ${report.unpackedSize} bytes`);
});

test("packed CLI installs only AGENTS.md in an isolated consumer", () => {
  const root = temporaryRoot();
  const packDir = path.join(root, "pack");
  const target = path.join(root, "consumer project");
  const cache = path.join(root, "npm-cache");
  fs.mkdirSync(packDir);
  const pack = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", packDir]).stdout)[0];
  const tarball = path.join(packDir, pack.filename);

  run(npx, ["--yes", "--package", tarball, "create-ai-os", target], {
    cwd: root,
    env: { ...process.env, npm_config_cache: cache },
  });

  assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
  const installed = fs.readFileSync(path.join(target, "AGENTS.md"), "utf8");
  assert.match(installed, /^<!-- AI-OS:BEGIN -->$/m);
  assert.match(installed, /^<!-- AI-OS:END -->$/m);
  assert.doesNotMatch(installed, /lane|baseline|tasks[.]yaml|doctor|[.]ai-os/i);
});
