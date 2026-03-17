#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");
const crypto = require("crypto");

const BIN = path.resolve(__dirname, "..", "bin");
const NODE = process.execPath;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    process.stdout.write(`  \x1b[32m✓\x1b[0m ${label}\n`);
  } else {
    failed += 1;
    process.stdout.write(`  \x1b[31m✗\x1b[0m ${label}\n`);
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

const repoRoot = path.resolve(__dirname, "..");

process.stdout.write("\n=== Version sync ===\n");
const versionFile = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
const pkgVersion = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).version;
assert(versionFile === pkgVersion, `VERSION (${versionFile}) matches package.json (${pkgVersion})`);
assert(versionFile === "4.0.0", "major version bumped to 4.0.0");

process.stdout.write("\n=== Root docs / evals / examples ===\n");
assert(fs.existsSync(path.join(repoRoot, "PROJECT_PURPOSE.md")), "PROJECT_PURPOSE exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "design-not-locked-before-build.md")), "design-lock eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "ui-looks-right-but-logic-wrong.md")), "ui-vs-logic eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "logic-right-but-product-shape-wrong.md")), "product-shape eval exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product.md")), "greenfield example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console.md")), "reverse-spec example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "brownfield-change-journey.md")), "brownfield example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product", ".ai-os", "MISSION.md")), "greenfield skeleton includes MISSION");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "design-pack", "parity-map.md")), "reverse-spec skeleton includes parity map");
assert(fs.existsSync(path.join(repoRoot, "examples", "brownfield-change-journey", ".ai-os", "tasks.yaml")), "brownfield skeleton includes tasks");

const maintainersDoc = fs.readFileSync(path.join(repoRoot, "docs", "maintainers.md"), "utf8");
assert(maintainersDoc.includes("design-not-locked-before-build.md"), "maintainers doc references new evals");
assert(maintainersDoc.includes("greenfield-guided-product.md"), "maintainers doc references new examples");

process.stdout.write("\n=== shared.js exports ===\n");
const shared = require("../bin/shared");
assert(typeof shared.cleanYamlScalar === "function", "cleanYamlScalar exported");
assert(typeof shared.parseInlineArray === "function", "parseInlineArray exported");
assert(typeof shared.SYM_OK === "string", "SYM_OK exported");
assert(typeof shared.VALIDATION_SCHEMAS === "object", "VALIDATION_SCHEMAS exported");

process.stdout.write("\n=== create-ai-os init ===\n");
const initDir = tmpDir();
const initResult = run("create-ai-os.js", [initDir, "--with-project-files"]);
assert(initResult.status === 0, "init exits with code 0");
assert(fs.existsSync(path.join(initDir, "AGENTS.md")), "AGENTS.md created");
assert(fs.existsSync(path.join(initDir, ".agents", "skills")), ".agents/skills/ created");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows")), ".agents/workflows/ created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "framework.toml")), "framework.toml created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "MISSION.md")), "MISSION.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "DESIGN.md")), "DESIGN.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "STATE.md")), "STATE.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "tasks.yaml")), "tasks.yaml created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "acceptance.yaml")), "acceptance.yaml created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "memory.md")), "memory.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "specs", "example.spec.md")), "example spec created");
assert(!fs.existsSync(path.join(initDir, ".ai-os", "release-plan.md")), "release-plan.md is not created by default");
assert(!fs.existsSync(path.join(initDir, ".ai-os", "risk-register.md")), "risk-register.md is not created by default");

const missionTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "MISSION.md"), "utf8");
const designTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "DESIGN.md"), "utf8");
const tasksTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "tasks.yaml"), "utf8");
const acceptanceTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "acceptance.yaml"), "utf8");
const stateTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "STATE.md"), "utf8");

assert(missionTemplate.includes("## 1. 任务定义"), "MISSION template has mission definition section");
assert(missionTemplate.includes("## 5. 阶段计划"), "MISSION template has phase plan");
assert(designTemplate.includes("## 2. 信息架构"), "DESIGN template has IA section");
assert(designTemplate.includes("## 6. 设计确认记录"), "DESIGN template has confirmation record section");
assert(tasksTemplate.includes("version: 3"), "tasks template upgraded to version 3");
assert(tasksTemplate.includes("execution_role:"), "tasks template includes execution_role");
assert(tasksTemplate.includes("approval_required:"), "tasks template includes approval_required");
assert(tasksTemplate.includes("parity_evidence_required:"), "tasks template includes parity evidence field");
assert(acceptanceTemplate.includes("design-confirmation"), "acceptance template includes design gate");
assert(acceptanceTemplate.includes("logic-confirmation"), "acceptance template includes logic gate");
assert(acceptanceTemplate.includes("delivery-readiness"), "acceptance template includes delivery gate");
assert(stateTemplate.includes("## 已锁定内容"), "STATE template includes locked items section");
assert(stateTemplate.includes("## 最小阅读集"), "STATE template includes minimum reading set");

assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "align.md")), "align workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "design.md")), "design workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "plan.md")), "plan workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "build.md")), "build workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "verify.md")), "verify workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "ship.md")), "ship workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "status.md")), "status workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "resume.md")), "resume workflow installed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "new-project.md")), "legacy new-project workflow removed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "new-module.md")), "legacy new-module workflow removed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "quick.md")), "legacy quick workflow removed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "review.md")), "legacy review workflow removed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "init.md")), "legacy init workflow removed");

const workflowsIndex = fs.readFileSync(path.join(initDir, ".agents", "workflows", "AGENTS.md"), "utf8");
assert(workflowsIndex.includes("/align"), "workflow index documents /align");
assert(!workflowsIndex.includes("Compatibility Aliases"), "workflow index only documents phase workflows");

const projectPlannerSkill = path.join(initDir, ".agents", "skills", "project-planner");
const acceptanceGateSkill = path.join(initDir, ".agents", "skills", "acceptance-gate");
assert(run("ai-os-skill-check.js", [projectPlannerSkill, "--strict"]).status === 0, "project-planner passes strict skill-check");
assert(run("ai-os-skill-check.js", [acceptanceGateSkill, "--strict"]).status === 0, "acceptance-gate passes strict skill-check");

process.stdout.write("\n=== validate / doctor / status / next / resume ===\n");
const validateResult = run("ai-os-validate.js", [initDir]);
assert(validateResult.status === 0, "validate passes on fresh vNext project");

const doctorResult = run("ai-os-doctor.js", [initDir, "--strict"]);
assert(doctorResult.status === 0, "doctor --strict passes on fresh vNext project");

const statusResult = run("ai-os-status.js", [initDir]);
assert(statusResult.status === 0, "status exits with code 0");
assert(statusResult.stdout.includes("当前方位"), "status prints current orientation");
assert(statusResult.stdout.includes("已锁定内容"), "status prints locked items");

const nextResult = run("ai-os-next.js", [initDir]);
assert(nextResult.status === 0, "next exits with code 0");
assert(nextResult.stdout.includes("role="), "next includes execution role");

const resumeResult = run("ai-os-resume.js", [initDir]);
assert(resumeResult.status === 0, "resume exits with code 0");
assert(resumeResult.stdout.includes(".ai-os/MISSION.md"), "resume includes MISSION in reading set");

const resumeMarkdownResult = run("ai-os-resume.js", [initDir, "--markdown"]);
assert(resumeMarkdownResult.status === 0, "resume --markdown exits with code 0");
assert(resumeMarkdownResult.stdout.includes("## 已锁定内容"), "resume --markdown includes locked items");
assert(resumeMarkdownResult.stdout.includes(".ai-os/DESIGN.md"), "resume --markdown references DESIGN");

cleanup(initDir);

process.stdout.write(`\nSummary: ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
