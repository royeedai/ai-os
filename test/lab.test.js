#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, run, tmpDir, cleanup, section } = require("./helpers");

section("lab command");
const labRoot = tmpDir();
const labResult = run("ai-os-lab.js", [labRoot, "--scenarios", "greenfield,high-risk"]);
assert(labResult.status === 0, "lab exits with code 0");
assert(labResult.stdout.includes("Acceptance report:"), "lab prints report path");
assert(fs.existsSync(path.join(labRoot, "lab-report.md")), "lab writes root report");
assert(fs.existsSync(path.join(labRoot, "greenfield", "LAB.md")), "lab writes greenfield scenario brief");
assert(fs.existsSync(path.join(labRoot, "high-risk", "LAB.md")), "lab writes high-risk scenario brief");
assert(fs.existsSync(path.join(labRoot, "high-risk", ".ai-os", "risk-register.md")), "lab creates high-risk risk register");
assert(fs.existsSync(path.join(labRoot, "high-risk", ".ai-os", "release-plan.md")), "lab creates high-risk release plan");
assert(fs.existsSync(path.join(labRoot, "high-risk", ".ai-os", "verification-matrix.yaml")), "lab creates high-risk verification matrix");
assert(fs.existsSync(path.join(labRoot, "greenfield", ".ai-os", "MISSION.md")), "lab creates scenario project files");
const labReport = fs.readFileSync(path.join(labRoot, "lab-report.md"), "utf8");
assert(labReport.includes("## 场景汇总"), "lab report includes scenario summary");
assert(labReport.includes("greenfield"), "lab report includes selected scenario");
assert(labReport.includes("high-risk"), "lab report includes second selected scenario");
cleanup(labRoot);
