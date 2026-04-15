#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, run, tmpDir, cleanup, section } = require("./helpers");

section("gate command");

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8").replace(/status: todo/g, "status: done"),
    "utf8"
  );

  const result = run("ai-os-gate.js", ["build", dir]);
  assert(result.status === 0, "gate/build passes when all tasks are done");
  assert(result.stdout.includes("tasks-all-completed"), "gate/build reports tasks-all-completed");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8").replace(/status: todo/g, "status: done"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "acceptance.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "acceptance.yaml"), "utf8").replace(/status: pending/g, "status: passed"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "verification-matrix.yaml"),
    `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: linkage-runtime
    impact_tags:
      - "runtime-config"
    actions:
      - "build"
    evidence:
      - "runtime-check"
    notes: "运行时配置变更后必须补运行态证据"

failure_modes: []
`,
    "utf8"
  );

  const result = run("ai-os-gate.js", ["verify", dir]);
  assert(result.status === 0, "gate/verify stays non-blocking when failure_modes guard is empty but warning-only");
  assert(result.stdout.includes("failure-modes-documented"), "gate/verify reports failure-modes-documented");
  assert(result.stdout.includes("PASSED with 1 warning"), "gate/verify surfaces the warning summary");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--legacy-layout"]);
  fs.writeFileSync(
    path.join(dir, ".ai-os", "tasks.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "utf8").replace(/status: todo/g, "status: done"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "acceptance.yaml"),
    fs.readFileSync(path.join(dir, ".ai-os", "acceptance.yaml"), "utf8").replace(/status: pending/g, "status: passed"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(dir, ".ai-os", "verification-matrix.yaml"),
    `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: linkage-runtime
    impact_tags:
      - "runtime-config"
    actions:
      - "build"
    evidence:
      - "runtime-check"
    notes: "运行时配置变更后必须补运行态证据"

failure_modes:
  - id: runtime-regression
    trigger: "配置切换后启动失败"
    guards:
      - "runtime-check"
      - "unknown-check"
      - "evals/missing-runtime-regression.md"
`,
    "utf8"
  );

  const result = run("ai-os-gate.js", ["verify", dir]);
  assert(result.status === 0, "gate/verify stays non-blocking when failure_modes guard references are invalid but warning-only");
  assert(result.stdout.includes("failure-mode-guards-traceable"), "gate/verify reports failure-mode-guards-traceable");
  assert(result.stdout.includes("PASSED with 1 warning"), "gate/verify surfaces the invalid-reference warning summary");
  cleanup(dir);
}
