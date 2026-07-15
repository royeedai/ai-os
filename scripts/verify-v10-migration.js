#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const PRESERVED_PATHS = Object.freeze([
  ".ai-os/MISSION.md",
  ".ai-os/memory.md",
  ".ai-os/lanes/default/MISSION.md",
  ".ai-os/lanes/default/DESIGN.md",
  ".ai-os/lanes/default/STATE.md",
  ".ai-os/lanes/default/risk-register.md",
]);
const LEGACY_TEAM_CONFIG = Object.freeze({
  ".gitignore": Object.freeze([
    "# AI-OS v9 managed (session-local and generated files)",
    ".ai-os/lanes/*/STATE.md",
    ".ai-os/framework.toml",
    ".ai-os/managed-files.tsv",
  ]),
  ".gitattributes": Object.freeze([
    "# AI-OS v9 managed (append-only knowledge)",
    ".ai-os/memory.md merge=union",
  ]),
});

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    env: options.env || process.env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const acceptedStatuses = options.acceptedStatuses || [0];
  if (result.error || result.signal || !acceptedStatuses.includes(result.status)) {
    throw new Error(`${path.basename(command)} failed (${result.status ?? result.signal ?? "spawn"}): ${String(result.stderr || result.error?.message || "").trim()}`);
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function hashFiles(root, relativePaths) {
  return Object.fromEntries(relativePaths.map((relativePath) => {
    const absolute = path.join(root, relativePath);
    assert.ok(fs.statSync(absolute).isFile(), `${relativePath} is a regular file`);
    return [relativePath, sha256(fs.readFileSync(absolute))];
  }));
}

function outsideManagedBlock(content) {
  const begin = "# BEGIN AI-OS";
  const end = "# END AI-OS";
  const beginIndex = content.indexOf(begin);
  const endIndex = content.indexOf(end);
  assert.ok(beginIndex >= 0 && endIndex > beginIndex, "one ordered managed block exists");
  assert.equal(content.indexOf(begin, beginIndex + begin.length), -1, "managed begin is unique");
  assert.equal(content.indexOf(end, endIndex + end.length), -1, "managed end is unique");
  return `${content.slice(0, beginIndex)}<AI-OS-MANAGED>${content.slice(endIndex + end.length)}`;
}

function outsideTeamConfig(content, relativePath) {
  if (content.includes("# BEGIN AI-OS") || content.includes("# END AI-OS")) {
    return outsideManagedBlock(content);
  }
  const lines = LEGACY_TEAM_CONFIG[relativePath];
  assert.ok(lines, `${relativePath} is a known team config`);
  const first = content.indexOf(lines[0]);
  assert.ok(first >= 0, `${relativePath} legacy block exists`);
  let cursor = first;
  for (let index = 0; index < lines.length; index += 1) {
    assert.equal(content.slice(cursor, cursor + lines[index].length), lines[index]);
    cursor += lines[index].length;
    if (index < lines.length - 1) {
      const eol = content.startsWith("\r\n", cursor) ? "\r\n" : "\n";
      assert.ok(content.startsWith(eol, cursor), `${relativePath} legacy line ending exists`);
      cursor += eol.length;
    }
  }
  assert.equal(content.indexOf(lines[0], first + lines[0].length), -1, "legacy block is unique");
  return `${content.slice(0, first)}<AI-OS-MANAGED>${content.slice(cursor)}`;
}

function snapshotTree(root) {
  const rows = [];
  function visit(relativePath) {
    const absolute = path.join(root, relativePath);
    for (const name of fs.readdirSync(absolute).sort()) {
      const child = path.join(relativePath, name);
      const stat = fs.lstatSync(path.join(root, child));
      if (stat.isSymbolicLink()) rows.push([child, "link", fs.readlinkSync(path.join(root, child))]);
      else if (stat.isDirectory()) {
        rows.push([child, "dir"]);
        visit(child);
      } else rows.push([child, "file", sha256(fs.readFileSync(path.join(root, child)))]);
    }
  }
  visit("");
  return rows;
}

function main() {
  const tempRoot = fs.realpathSync.native(
    fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-v10-migration-")),
  );
  const target = path.join(tempRoot, "project with 空格");
  const probeRoot = path.join(tempRoot, "external-write-probe");
  const sentinel = path.join(tempRoot, "outside-sentinel.txt");
  const npmCache = path.join(tempRoot, "npm-cache");
  const env = { ...process.env, npm_config_cache: npmCache };
  try {
    const tags = run("git", [
      "ls-remote",
      "--exit-code",
      "https://github.com/royeedai/ai-os.git",
      "refs/tags/v10.5.1^{}",
    ], { env }).stdout.trim().split(/\s+/u);
    assert.equal(tags[0], "8c6e2b710fcafd709a69a79f99b823b3ed66c23e");

    run(npx, ["--yes", "github:royeedai/ai-os#v10.5.1", target], { env });
    assert.equal(fs.readFileSync(path.join(target, ".ai-os/bin/VERSION"), "utf8").trim(), "10.5.1");
    assert.ok(fs.existsSync(path.join(target, ".ai-os/bin/shared.js")));

    for (const relativePath of [
      ".ai-os/lanes/default/release-plan.md",
      ".ai-os/lanes/default/verification-matrix.yaml",
      ".ai-os/lanes/default/specs",
      ".ai-os/lanes/default/design-pack",
      ".ai-os/lanes/default/evals",
    ]) {
      fs.rmSync(path.join(target, relativePath), { recursive: true, force: true });
    }
    fs.writeFileSync(
      path.join(target, PRESERVED_PATHS[5]),
      "# Risk Register\n\n| ID | Risk | Impact | Mitigation | Status |\n|---|---|---|---|---|\n| R-migration | legacy migration | medium | verify preserved bytes | open |\n",
    );

    for (const relativePath of PRESERVED_PATHS.slice(0, 5)) {
      fs.appendFileSync(path.join(target, relativePath), `\nAI-OS-USER-SENTINEL: ${relativePath}\n`);
    }
    const riskPath = path.join(target, PRESERVED_PATHS[5]);
    fs.appendFileSync(riskPath, "\nAI-OS-USER-SENTINEL: risk register\n");
    const before = hashFiles(target, PRESERVED_PATHS);
    const managedOutside = Object.fromEntries([".gitignore", ".gitattributes"].map((relativePath) => {
      const absolute = path.join(target, relativePath);
      fs.appendFileSync(absolute, "\r\nAI-OS-USER-OUTSIDE-BLOCK\r\n");
      return [relativePath, outsideTeamConfig(fs.readFileSync(absolute, "utf8"), relativePath)];
    }));

    run(process.execPath, [path.join(repoRoot, "bin/create-ai-os.js"), "install", target], { env });
    assert.deepEqual(hashFiles(target, PRESERVED_PATHS), before);
    for (const [relativePath, expected] of Object.entries(managedOutside)) {
      assert.equal(outsideTeamConfig(fs.readFileSync(path.join(target, relativePath), "utf8"), relativePath), expected);
    }
    assert.match(fs.readFileSync(path.join(target, ".ai-os/framework.toml"), "utf8"), /^layout_version = "11"$/m);
    assert.equal(fs.readFileSync(path.join(target, ".ai-os/bin/VERSION"), "utf8").trim(), "11.0.0");
    assert.ok(!fs.existsSync(path.join(target, ".ai-os/bin/shared.js")));
    assert.match(fs.readFileSync(path.join(target, "AGENTS.md"), "utf8"), /## 按需工件触发矩阵/);
    assert.match(fs.readFileSync(path.join(target, ".ai-os/lanes/default/tasks.yaml"), "utf8"), /^version: 5$/m);
    assert.deepEqual(
      fs.readFileSync(path.join(target, ".ai-os/reference/artifacts.md")),
      fs.readFileSync(path.join(repoRoot, "docs/artifacts.md")),
    );
    const doctor = run(process.execPath, [
      path.join(target, ".ai-os/bin/ai-os-doctor.js"),
      target,
      "--json",
    ], { env, acceptedStatuses: [0, 1] });
    const report = JSON.parse(doctor.stdout);
    assert.equal(report.layout_ok, true, JSON.stringify(report.issues, null, 2));
    assert.equal(report.delivery_ready, false);

    run(process.execPath, [path.join(repoRoot, "bin/create-ai-os.js"), "install", probeRoot], { env });
    fs.writeFileSync(sentinel, "SENTINEL\n");
    const linked = path.join(probeRoot, ".ai-os/bin/doctor-shared.js");
    fs.unlinkSync(linked);
    fs.symlinkSync(sentinel, linked, "file");
    const probeBefore = snapshotTree(probeRoot);
    const conflict = spawnSync(process.execPath, [path.join(repoRoot, "bin/create-ai-os.js"), "install", probeRoot], {
      cwd: repoRoot,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.notEqual(conflict.status, 0, "linked managed target must reject install");
    assert.equal(fs.readFileSync(sentinel, "utf8"), "SENTINEL\n");
    assert.deepEqual(snapshotTree(probeRoot), probeBefore);

    process.stdout.write("v10 migration and external-write probe: pass\n");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) main();

module.exports = {
  PRESERVED_PATHS,
  hashFiles,
  main,
  outsideManagedBlock,
  outsideTeamConfig,
  snapshotTree,
};
