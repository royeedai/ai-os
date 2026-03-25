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

process.stdout.write("\n=== Root docs / evals / examples ===\n");
assert(fs.existsSync(path.join(repoRoot, "PROJECT_PURPOSE.md")), "PROJECT_PURPOSE exists");
assert(fs.existsSync(path.join(repoRoot, "docs", "problem-ledger.md")), "problem ledger exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "design-not-locked-before-build.md")), "design-lock eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "ui-looks-right-but-logic-wrong.md")), "ui-vs-logic eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "logic-right-but-product-shape-wrong.md")), "product-shape eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "feature-visible-but-unusable.md")), "feature-visible eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "cross-layer-change-missed-linkage.md")), "cross-layer linkage eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "interaction-mode-misclassified.md")), "interaction-mode eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "sensitive-flow-not-escalated.md")), "high-risk escalation eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "happy-path-passed-but-null-path-broken.md")), "degraded-path eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "change-request-before-code.md")), "change-request eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "debug-overreach-regression.md")), "debug-overreach eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "brownfield-infrastructure-audit-missed.md")), "brownfield infrastructure eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "configurable-meant-operable-gap.md")), "config closure eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "problem-ledger-coverage-regression.md")), "problem-ledger eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "fallback-evidence-used-as-delivery.md")), "fallback-evidence eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "missing-user-confirmation.md")), "missing-user-confirmation eval exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product.md")), "greenfield example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console.md")), "reverse-spec example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "brownfield-change-journey.md")), "brownfield example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "interaction-mode-chat.md")), "interaction-mode example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "high-risk-state-change.md")), "high-risk example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "cross-layer-schema-change.md")), "cross-layer schema example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "degraded-path-verification.md")), "degraded-path example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "change-request-baseline-sync.md")), "change-request example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "debug-bounded-fix.md")), "debug example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "brownfield-infrastructure-audit.md")), "brownfield infrastructure example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "config-closure-clarification.md")), "config closure example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product", ".ai-os", "MISSION.md")), "greenfield skeleton includes MISSION");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product", ".ai-os", "DESIGN.md")), "greenfield skeleton includes DESIGN");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product", ".ai-os", "tasks.yaml")), "greenfield skeleton includes tasks");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product", ".ai-os", "acceptance.yaml")), "greenfield skeleton includes acceptance");
assert(fs.existsSync(path.join(repoRoot, "examples", "greenfield-guided-product", ".ai-os", "STATE.md")), "greenfield skeleton includes STATE");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "MISSION.md")), "reverse-spec skeleton includes MISSION");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "DESIGN.md")), "reverse-spec skeleton includes DESIGN");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "design-pack", "parity-map.md")), "reverse-spec skeleton includes parity map");
assert(fs.existsSync(path.join(repoRoot, "examples", "reverse-spec-admin-console", ".ai-os", "acceptance.yaml")), "reverse-spec skeleton includes acceptance");
assert(fs.existsSync(path.join(repoRoot, "examples", "brownfield-change-journey", ".ai-os", "MISSION.md")), "brownfield skeleton includes MISSION");
assert(fs.existsSync(path.join(repoRoot, "examples", "brownfield-change-journey", ".ai-os", "tasks.yaml")), "brownfield skeleton includes tasks");
assert(fs.existsSync(path.join(repoRoot, "examples", "brownfield-change-journey", ".ai-os", "STATE.md")), "brownfield skeleton includes STATE");

const maintainersDoc = fs.readFileSync(path.join(repoRoot, "docs", "maintainers.md"), "utf8");
const problemLedger = fs.readFileSync(path.join(repoRoot, "docs", "problem-ledger.md"), "utf8");
const agentsDoc = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
const readmeDoc = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
const changeEvaluationTemplate = fs.readFileSync(
  path.join(repoRoot, "docs", "change-evaluation-template.md"),
  "utf8"
);

assert(problemLedger.includes("PL-001"), "problem ledger records existing product problems");
assert(problemLedger.includes("PL-013"), "problem ledger records targeted-mod overreach issue");
assert(problemLedger.includes("PL-014"), "problem ledger records product-shape issue");
assert(problemLedger.includes("PL-015"), "problem ledger records infrastructure audit issue");
assert(problemLedger.includes("PL-016"), "problem ledger records config closure issue");
assert(problemLedger.includes("PG-001"), "problem ledger records governance coverage issue");
assert(problemLedger.includes("每次重构、学习进步"), "problem ledger documents iteration review rule");
assert(agentsDoc.includes("docs/problem-ledger.md"), "AGENTS references problem ledger");
assert(readmeDoc.includes("docs/problem-ledger.md"), "README links to problem ledger");
assert(changeEvaluationTemplate.includes("关联问题台账与覆盖核对"), "change evaluation template includes ledger coverage section");
assert(changeEvaluationTemplate.includes("需补或更新的 eval / example / CLI / test"), "change evaluation template requires coverage follow-up");
assert(maintainersDoc.includes("design-not-locked-before-build.md"), "maintainers doc references new evals");
assert(maintainersDoc.includes("feature-visible-but-unusable.md"), "maintainers doc references usability eval");
assert(maintainersDoc.includes("cross-layer-change-missed-linkage.md"), "maintainers doc references linkage eval");
assert(maintainersDoc.includes("change-request-before-code.md"), "maintainers doc references change-request eval");
assert(maintainersDoc.includes("debug-overreach-regression.md"), "maintainers doc references debug eval");
assert(maintainersDoc.includes("brownfield-infrastructure-audit-missed.md"), "maintainers doc references infrastructure audit eval");
assert(maintainersDoc.includes("configurable-meant-operable-gap.md"), "maintainers doc references config closure eval");
assert(maintainersDoc.includes("docs/problem-ledger.md"), "maintainers doc references problem ledger");
assert(maintainersDoc.includes("problem-ledger-coverage-regression.md"), "maintainers doc references problem ledger eval");
assert(maintainersDoc.includes("interaction-mode-chat.md"), "maintainers doc references interaction-mode example");
assert(maintainersDoc.includes("greenfield-guided-product.md"), "maintainers doc references new examples");
assert(maintainersDoc.includes("change-request-baseline-sync.md"), "maintainers doc references change-request example");
assert(maintainersDoc.includes("brownfield-infrastructure-audit.md"), "maintainers doc references infrastructure example");
assert(maintainersDoc.includes("config-closure-clarification.md"), "maintainers doc references config closure example");

process.stdout.write("\n=== eval content structure ===\n");
const EVAL_REQUIRED_SECTIONS = ["## 场景", "## 错误交付", "## AI-OS 预期行为", "## 最低证据", "## 若需改 framework，优先检查"];
const evalDir = path.join(repoRoot, "evals");
const evalFiles = fs.readdirSync(evalDir).filter((f) => f !== "README.md" && f.endsWith(".md"));
for (const evalFile of evalFiles) {
  const evalContent = fs.readFileSync(path.join(evalDir, evalFile), "utf8");
  const missingSections = EVAL_REQUIRED_SECTIONS.filter((s) => !evalContent.includes(s));
  assert(missingSections.length === 0, `eval ${evalFile} has all required sections${missingSections.length ? " (missing: " + missingSections.join(", ") + ")" : ""}`);
}

process.stdout.write("\n=== shared.js exports ===\n");
const shared = require("../bin/shared");
assert(typeof shared.cleanYamlScalar === "function", "cleanYamlScalar exported");
assert(typeof shared.parseInlineArray === "function", "parseInlineArray exported");
assert(typeof shared.SYM_OK === "string", "SYM_OK exported");
assert(typeof shared.VALIDATION_SCHEMAS === "object", "VALIDATION_SCHEMAS exported");
assert(Array.isArray(shared.QUALITY_TIERS), "QUALITY_TIERS exported");
assert(Array.isArray(shared.IMPACT_TAGS), "IMPACT_TAGS exported");
assert(Array.isArray(shared.HIGH_RISK_SPECIAL_REVIEWS), "HIGH_RISK_SPECIAL_REVIEWS exported");

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
const memoryTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "memory.md"), "utf8");
assert(memoryTemplate.includes("活跃条目数"), "memory template includes active count metadata");
assert(memoryTemplate.includes("归档条目数"), "memory template includes archived count metadata");
assert(memoryTemplate.includes("分层策略"), "memory template includes layered strategy");
assert(memoryTemplate.includes("归档区"), "memory template includes archive section");
assert(memoryTemplate.includes("active"), "memory template uses active status");
assert(fs.existsSync(path.join(initDir, ".ai-os", "specs", "example.spec.md")), "example spec created");
assert(!fs.existsSync(path.join(initDir, ".ai-os", "release-plan.md")), "release-plan.md is not created by default");
assert(!fs.existsSync(path.join(initDir, ".ai-os", "risk-register.md")), "risk-register.md is not created by default");
assert(!fs.existsSync(path.join(initDir, ".ai-os", "verification-matrix.yaml")), "verification-matrix.yaml is not created by default");

const missionTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "MISSION.md"), "utf8");
const designTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "DESIGN.md"), "utf8");
const tasksTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "tasks.yaml"), "utf8");
const acceptanceTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "acceptance.yaml"), "utf8");
const stateTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "STATE.md"), "utf8");
const specTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "specs", "example.spec.md"), "utf8");

assert(missionTemplate.includes("## 1. 任务定义"), "MISSION template has mission definition section");
assert(missionTemplate.includes("关键选型"), "MISSION template includes key decisions");
assert(missionTemplate.includes("## 5. 阶段计划"), "MISSION template has phase plan");
assert(missionTemplate.includes("高风险触发因素"), "MISSION template includes high-risk triggers");
assert(missionTemplate.includes("当前治理档位"), "MISSION template includes governance tier");
assert(missionTemplate.includes("需求变更同步记录"), "MISSION template includes change sync log");
assert(missionTemplate.includes("### 非功能性约束"), "MISSION template includes non-functional constraints");
assert(missionTemplate.includes("### 验收标准基线"), "MISSION template includes acceptance baseline");
assert(missionTemplate.includes("配置 / 设置 / 选项"), "MISSION template includes config closure guidance");
assert(designTemplate.includes("## 2. 信息架构"), "DESIGN template has IA section");
assert(designTemplate.includes("## 6. 设计确认记录"), "DESIGN template has confirmation record section");
assert(designTemplate.includes("必须用户确认的核心设计决策"), "DESIGN template includes required confirmations");
assert(designTemplate.includes("## 8. 方案选型依据"), "DESIGN template includes decision rationale section");
assert(designTemplate.includes("## 10. 风险与注意事项"), "DESIGN template includes risk notes section");
assert(designTemplate.includes("共享基础设施约定"), "DESIGN template includes shared infrastructure constraint");
assert(tasksTemplate.includes("version: 3"), "tasks template upgraded to version 3");
assert(tasksTemplate.includes("execution_role:"), "tasks template includes execution_role");
assert(tasksTemplate.includes("approval_required:"), "tasks template includes approval_required");
assert(tasksTemplate.includes("parity_evidence_required:"), "tasks template includes parity evidence field");
assert(tasksTemplate.includes("impact_tags:"), "tasks template includes impact tags");
assert(tasksTemplate.includes("derived_checks:"), "tasks template includes derived checks");
assert(tasksTemplate.includes("risk_triggers:"), "tasks template includes risk triggers");
assert(tasksTemplate.includes("requirement_refs:"), "tasks template includes requirement traceability");
assert(tasksTemplate.includes("priority:"), "tasks template includes task priority");
assert(tasksTemplate.includes("acceptance_criteria:"), "tasks template includes task acceptance criteria");
assert(tasksTemplate.includes("measurable_outcome:"), "tasks template includes measurable_outcome");
assert(tasksTemplate.includes("edge_cases:"), "tasks template includes edge_cases");
assert(acceptanceTemplate.includes("design-confirmation"), "acceptance template includes design gate");
assert(acceptanceTemplate.includes("logic-confirmation"), "acceptance template includes logic gate");
assert(acceptanceTemplate.includes("delivery-readiness"), "acceptance template includes delivery gate");
assert(acceptanceTemplate.includes("quality_tier"), "acceptance template includes quality_tier");
assert(acceptanceTemplate.includes("required_special_reviews"), "acceptance template includes special reviews");
assert(acceptanceTemplate.includes("contract-baseline-check"), "acceptance template includes contract baseline evidence");
assert(acceptanceTemplate.includes("degraded-path-check"), "acceptance template includes degraded-path evidence");
assert(acceptanceTemplate.includes("static-validation-check"), "acceptance template includes static validation evidence");
assert(acceptanceTemplate.includes("manual-action-note"), "acceptance template includes manual action evidence");
assert(acceptanceTemplate.includes("confirmed_stack_decisions"), "acceptance template records confirmed stack decisions");
assert(acceptanceTemplate.includes("task-flow-check"), "acceptance template includes task flow evidence");
assert(acceptanceTemplate.includes("baseline_source"), "acceptance template includes baseline source");
assert(specTemplate.includes("**交互模式**"), "spec template includes interaction mode");
assert(specTemplate.includes("**契约基准**"), "spec template includes contract baseline");
assert(specTemplate.includes("**异常/空数据证据**"), "spec template includes degraded-path evidence");
assert(stateTemplate.includes("## 已锁定内容"), "STATE template includes locked items section");
assert(stateTemplate.includes("## 最小阅读集"), "STATE template includes minimum reading set");
assert(stateTemplate.includes("当前确认停点"), "STATE template includes confirmation checkpoint");

assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "align.md")), "align workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "design.md")), "design workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "plan.md")), "plan workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "build.md")), "build workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "verify.md")), "verify workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "ship.md")), "ship workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "change-request.md")), "change-request workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "debug.md")), "debug workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "review.md")), "review workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "postmortem.md")), "postmortem workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "status.md")), "status workflow installed");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows", "resume.md")), "resume workflow installed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "new-project.md")), "legacy new-project workflow removed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "new-module.md")), "legacy new-module workflow removed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "quick.md")), "legacy quick workflow removed");
assert(!fs.existsSync(path.join(initDir, ".agents", "workflows", "init.md")), "legacy init workflow removed");

const workflowsIndex = fs.readFileSync(path.join(initDir, ".agents", "workflows", "AGENTS.md"), "utf8");
assert(workflowsIndex.includes("/align"), "workflow index documents /align");
assert(workflowsIndex.includes("/change-request"), "workflow index documents /change-request");
assert(workflowsIndex.includes("/debug"), "workflow index documents /debug");
assert(workflowsIndex.includes("/review"), "workflow index documents /review");
assert(workflowsIndex.includes("/postmortem"), "workflow index documents /postmortem");

const projectPlannerSkill = path.join(initDir, ".agents", "skills", "project-planner");
const acceptanceGateSkill = path.join(initDir, ".agents", "skills", "acceptance-gate");
const specValidatorSkill = path.join(initDir, ".agents", "skills", "spec-validator");
const taskOrchestratorSkill = path.join(initDir, ".agents", "skills", "task-orchestrator");
assert(run("ai-os-skill-check.js", [projectPlannerSkill, "--strict"]).status === 0, "project-planner passes strict skill-check");
assert(run("ai-os-skill-check.js", [acceptanceGateSkill, "--strict"]).status === 0, "acceptance-gate passes strict skill-check");
assert(run("ai-os-skill-check.js", [specValidatorSkill, "--strict"]).status === 0, "spec-validator passes strict skill-check");
assert(run("ai-os-skill-check.js", [taskOrchestratorSkill, "--strict"]).status === 0, "task-orchestrator passes strict skill-check");

process.stdout.write("\n=== validate / doctor / status / next / resume ===\n");
const validateResult = run("ai-os-validate.js", [initDir]);
assert(validateResult.status === 0, "validate passes on fresh project");

const doctorResult = run("ai-os-doctor.js", [initDir, "--strict"]);
assert(doctorResult.status === 0, "doctor --strict passes on fresh project");

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

process.stdout.write("\n=== lab command ===\n");
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

process.stdout.write("\n=== validate compatibility / high-risk release-check ===\n");
const legacyDir = tmpDir();
run("create-ai-os.js", [legacyDir, "--with-project-files"]);
const legacySpecPath = path.join(legacyDir, ".ai-os", "specs", "example.spec.md");
const legacyTasksPath = path.join(legacyDir, ".ai-os", "tasks.yaml");
const legacyAcceptancePath = path.join(legacyDir, ".ai-os", "acceptance.yaml");

fs.writeFileSync(
  legacySpecPath,
  fs.readFileSync(legacySpecPath, "utf8")
    .replace(/- \*\*交互模式\*\*：[^\n]*\n/, "")
    .replace(/- \*\*推荐模式理由\*\*：[^\n]*\n/, "")
    .replace(/- \*\*拒绝的交互模式\*\*：[^\n]*\n/, "")
    .replace(/- \*\*契约基准\*\*：[^\n]*\n/, "")
    .replace(/- \*\*字段映射\/适配说明\*\*：[^\n]*\n/, "")
    .replace(/- \*\*集成触点\*\*：[^\n]*\n/, "")
    .replace(/- \*\*异常\/空数据证据\*\*：[^\n]*\n/, ""),
  "utf8"
);
fs.writeFileSync(
  legacyTasksPath,
  fs.readFileSync(legacyTasksPath, "utf8")
    .replace(/\n    impact_tags:\n(?:      - "[^"]+"\n)+/g, "\n")
    .replace(/\n    derived_checks:\n(?:      - "[^"]+"\n)+/g, "\n")
    .replace(/\n    risk_triggers: \[\]\n/g, "\n"),
  "utf8"
);
fs.writeFileSync(
  legacyAcceptancePath,
  fs.readFileSync(legacyAcceptancePath, "utf8")
    .replace(/  quality_tier: "standard"\n/, "")
    .replace(/\nrequired_special_reviews: \[\]\n/, "\n")
    .replace(/\n      - "contract-baseline-check"\n/g, "")
    .replace(/\n      - "degraded-path-check"\n/g, ""),
  "utf8"
);

const legacyValidateResult = run("ai-os-validate.js", [legacyDir]);
assert(legacyValidateResult.status === 0, "validate tolerates legacy transitional artifacts");
assert(legacyValidateResult.stdout.includes("VALID WITH"), "legacy validate reports warnings");
cleanup(legacyDir);

const highRiskBlockedDir = tmpDir();
run("create-ai-os.js", [highRiskBlockedDir, "--with-project-files"]);
const blockedTasksPath = path.join(highRiskBlockedDir, ".ai-os", "tasks.yaml");
const blockedAcceptancePath = path.join(highRiskBlockedDir, ".ai-os", "acceptance.yaml");
fs.writeFileSync(
  blockedTasksPath,
  fs.readFileSync(blockedTasksPath, "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"'),
  "utf8"
);
fs.writeFileSync(
  blockedAcceptancePath,
  fs.readFileSync(blockedAcceptancePath, "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"'),
  "utf8"
);
const highRiskValidateResult = run("ai-os-validate.js", [highRiskBlockedDir]);
assert(highRiskValidateResult.status === 1, "validate blocks explicit high-risk project without required artifacts");
cleanup(highRiskBlockedDir);

const highRiskReadyDir = tmpDir();
run("create-ai-os.js", [highRiskReadyDir, "--with-project-files"]);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "tasks.yaml"),
  fs.readFileSync(path.join(highRiskReadyDir, ".ai-os", "tasks.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace(/status: todo/g, "status: done")
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"\n      - "state-transition"'),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "acceptance.yaml"),
  fs.readFileSync(path.join(highRiskReadyDir, ".ai-os", "acceptance.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('required_special_reviews: []', 'required_special_reviews: ["security-guard", "authorization-boundary-check", "concurrency-safety-check"]')
    .replace(/status: pending/g, "status: passed"),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "release-plan.md"),
  `# Test Release

## 1. 交付前检查

- Mission、Design、Spec、Acceptance 已同步
- 高风险审批点已完成确认
- 高风险专项审查（权限 / 并发 / 不可逆状态流转）已记录
- 静态校验证据已记录（npm run build）
- 关键证据已收集齐全

## 2. 变更范围与依赖

- 覆盖权益扣减接口、状态流转和通知写入
- 依赖正式鉴权、中台账户服务和数据库迁移

## 3. 发布步骤

1. [AI 已完成] 已完成发布前配置检查并整理验证证据
2. [需人工执行] 执行数据库迁移并重启 API
3. [AI 已完成] 按 smoke 流程验证授权、并发和异常路径并通知值守

## 4. 运行态验证

- authorization-boundary-check：权限 / 越权边界验证完成
- concurrency-safety-check：并发 / 幂等 / 状态竞争验证完成
- degraded-path-check：空值 / 缺字段 / 权限拒绝 / 超时 / 部分失败场景验证完成
- 静态校验证据已记录（npm run build）
- 目标运行态证据已记录

## 5. 回滚触发条件

- 出现重复扣减或越权访问
- 关键任务链路失败率持续升高

## 6. 交付说明与移交

- AI 已完成：已同步运维和值守联系人，已记录 smoke 与静态校验证据
- 需人工执行：发布窗口内执行数据库迁移、重启 API 并回填执行记录
- 已记录已知风险与观察指标
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "risk-register.md"),
  `# 风险登记表

| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |
|----|------|------|------|----------|----------|------|
| R-001 | 权益扣减并发覆盖 | 逻辑 / 发布 | 高 | 高并发重复提交 | 幂等键 + 审计日志 + 专项审查 | open |
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskReadyDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"
  restart_api: "npm run restart:api"
  cold-start-smoke_api: "npm run smoke:api"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
      - "restart_api"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: sensitive-flow
    impact_tags:
      - "state-transition"
      - "auth"
    actions:
      - "verify"
      - "build"
    evidence:
      - "contract-baseline-check"
      - "degraded-path-check"
    notes: "高风险状态流转必须补齐契约和异常路径证据"
`,
  "utf8"
);
const releaseReadyResult = run("ai-os-release-check.js", [highRiskReadyDir]);
assert(releaseReadyResult.status === 0, "release-check passes for explicit high-risk project with required artifacts");
cleanup(highRiskReadyDir);

const highRiskMissingMarkersDir = tmpDir();
run("create-ai-os.js", [highRiskMissingMarkersDir, "--with-project-files"]);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "tasks.yaml"),
  fs.readFileSync(path.join(highRiskMissingMarkersDir, ".ai-os", "tasks.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace(/status: todo/g, "status: done")
    .replace('risk: medium', 'risk: high')
    .replace('risk_triggers: []', 'risk_triggers:\n      - "asset-deduction"\n      - "state-transition"'),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "acceptance.yaml"),
  fs.readFileSync(path.join(highRiskMissingMarkersDir, ".ai-os", "acceptance.yaml"), "utf8")
    .replace('quality_tier: "standard"', 'quality_tier: "high-risk"')
    .replace('required_special_reviews: []', 'required_special_reviews: ["security-guard", "authorization-boundary-check", "concurrency-safety-check"]')
    .replace(/status: pending/g, "status: passed"),
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "release-plan.md"),
  `# Test Release

## 1. 交付前检查

- Mission、Design、Spec、Acceptance 已同步
- 高风险审批点已完成确认
- 高风险专项审查（权限 / 并发 / 不可逆状态流转）已记录
- 关键证据已收集齐全

## 2. 变更范围与依赖

- 覆盖权益扣减接口、状态流转和通知写入
- 依赖正式鉴权、中台账户服务和数据库迁移

## 3. 发布步骤

1. 执行数据库迁移并重启 API
2. 按 smoke 流程验证授权、并发和异常路径
3. 记录交付说明并通知值守

## 4. 运行态验证

- authorization-boundary-check：权限 / 越权边界验证完成
- concurrency-safety-check：并发 / 幂等 / 状态竞争验证完成
- degraded-path-check：空值 / 缺字段 / 权限拒绝 / 超时 / 部分失败场景验证完成
- 目标运行态证据已记录

## 5. 回滚触发条件

- 出现重复扣减或越权访问
- 关键任务链路失败率持续升高

## 6. 交付说明与移交

- 已同步运维和值守联系人
- 已记录已知风险与观察指标
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "risk-register.md"),
  `# 风险登记表

| ID | 风险 | 类型 | 影响 | 触发条件 | 缓解措施 | 状态 |
|----|------|------|------|----------|----------|------|
| R-001 | 权益扣减并发覆盖 | 逻辑 / 发布 | 高 | 高并发重复提交 | 幂等键 + 审计日志 + 专项审查 | open |
`,
  "utf8"
);
fs.writeFileSync(
  path.join(highRiskMissingMarkersDir, ".ai-os", "verification-matrix.yaml"),
  `version: 1

commands:
  validate: "create-ai-os doctor . --strict"
  verify: "npm test"
  build: "npm run build"
  restart_api: "npm run restart:api"
  cold-start-smoke_api: "npm run smoke:api"

rules:
  - id: runtime-config
    paths:
      - ".env"
    affected_components:
      - "runtime"
    actions:
      - "build"
      - "restart_api"
    notes: "配置变更后必须重新验证运行态"

impact_rules:
  - id: sensitive-flow
    impact_tags:
      - "state-transition"
      - "auth"
    actions:
      - "verify"
      - "build"
    evidence:
      - "contract-baseline-check"
      - "degraded-path-check"
    notes: "高风险状态流转必须补齐契约和异常路径证据"
`,
  "utf8"
);
const releaseMissingMarkersResult = run("ai-os-release-check.js", [highRiskMissingMarkersDir]);
assert(releaseMissingMarkersResult.status === 1, "release-check blocks high-risk release plan missing manual-action/static-validation markers");
cleanup(highRiskMissingMarkersDir);

// ---------------------------------------------------------------------------
// diff / upgrade
// ---------------------------------------------------------------------------

process.stdout.write("\n=== diff / upgrade ===\n");

const diffUpgradeDir = tmpDir();
run("create-ai-os.js", [diffUpgradeDir, "--with-project-files"]);

const diffCleanResult = run("ai-os-diff.js", [diffUpgradeDir]);
assert(diffCleanResult.status === 0, "diff exits with code 0 on clean project");
assert(diffCleanResult.stdout.includes("0 modified") && diffCleanResult.stdout.includes("0 missing"), "diff reports no changes on fresh project");

const upgradeCleanResult = run("ai-os-upgrade.js", [diffUpgradeDir]);
assert(upgradeCleanResult.status === 0, "upgrade exits with code 0 on up-to-date project");
assert(upgradeCleanResult.stdout.includes("Already up to date"), "upgrade reports already up to date");

const upgradeDryRunResult = run("ai-os-upgrade.js", [diffUpgradeDir, "--dry-run"]);
assert(upgradeDryRunResult.status === 0, "upgrade --dry-run exits with code 0");

const upgradePreflightResult = run("ai-os-upgrade.js", [diffUpgradeDir, "--preflight"]);
assert(upgradePreflightResult.status === 0, "upgrade --preflight exits with code 0 on clean project");

cleanup(diffUpgradeDir);

process.stdout.write(`\nSummary: ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
