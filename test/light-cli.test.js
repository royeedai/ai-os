"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { afterEach, test } = require("node:test");
const assert = require("node:assert/strict");
const { main } = require("../bin/create-ai-os");

const cliPath = path.resolve(__dirname, "../bin/create-ai-os.js");
const roots = new Set();

function temporaryRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-os-cli-"));
  roots.add(root);
  return root;
}

function run(args, cwd = temporaryRoot()) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

afterEach(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  roots.clear();
});

test("help exposes only the lightweight install surface", () => {
  const result = run(["--help"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /create-ai-os \[target-dir\]/);
  assert.match(result.stdout, /create-ai-os install \[target-dir\]/);
  assert.match(result.stdout, /only an AI-OS managed block in AGENTS[.]md/i);
  assert.doesNotMatch(result.stdout, /doctor|baseline|lane|\.ai-os|--force|--no-ide|--no-team/i);
  assert.equal(result.stderr, "");
});

test("version prints the unreleased framework version", () => {
  const result = run(["--version"]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "11.0.0\n");
  assert.equal(result.stderr, "");
});

test("version falls back safely when package metadata cannot be read", () => {
  const output = { stdout: "", stderr: "" };
  const io = {
    stdout: { write: (value) => { output.stdout += value; } },
    stderr: { write: (value) => { output.stderr += value; } },
  };
  const originalRead = fs.readFileSync;
  fs.readFileSync = (file, ...args) => {
    if (path.basename(String(file)) === "VERSION") throw new Error("unavailable");
    return originalRead(file, ...args);
  };
  try {
    assert.equal(main(["--version"], io), 0);
  } finally {
    fs.readFileSync = originalRead;
  }
  assert.equal(output.stdout, "0.0.0\n");
  assert.equal(output.stderr, "");
});

test("default and explicit install entrypoints report only the AGENTS.md action", () => {
  for (const explicit of [false, true]) {
    const root = temporaryRoot();
    const target = path.join(root, explicit ? "explicit" : "default");
    const result = run(explicit ? ["install", target] : [target], root);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /AI-OS lightweight constitution installed/i);
    assert.match(result.stdout, /AGENTS[.]md:\s+created/i);
    assert.match(result.stdout, new RegExp(target.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
    assert.doesNotMatch(result.stdout, /baseline|layout|doctor|\.ai-os/i);
    assert.equal(result.stderr, "");
    assert.deepEqual(fs.readdirSync(target), ["AGENTS.md"]);
  }
});

for (const args of [
  ["doctor"],
  ["upgrade"],
  ["--force"],
  ["--no-ide-files"],
  ["--no-team-config"],
  ["one", "two"],
]) {
  test(`removed or invalid arguments fail without writes: ${args.join(" ")}`, () => {
    const root = temporaryRoot();
    const result = run(args, root);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^Error: [^\r\n]+\n$/);
    assert.deepEqual(fs.readdirSync(root), []);
  });
}
