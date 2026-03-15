#!/usr/bin/env node

/**
 * AI-OS integration test suite — zero-dependency.
 *
 * Runs core CLI commands against a temp project and verifies results.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
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

// ---------------------------------------------------------------------------
// Test: VERSION / package.json sync
// ---------------------------------------------------------------------------

process.stdout.write("\n=== Version sync ===\n");

const versionFile = fs.readFileSync(path.resolve(__dirname, "..", "VERSION"), "utf8").trim();
const pkgVersion = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version;
assert(versionFile === pkgVersion, `VERSION (${versionFile}) matches package.json (${pkgVersion})`);

// ---------------------------------------------------------------------------
// Test: root governance assets
// ---------------------------------------------------------------------------

process.stdout.write("\n=== Root governance assets ===\n");

const repoRoot = path.resolve(__dirname, "..");
const rootAgents = fs.readFileSync(path.join(repoRoot, "AGENTS.md"), "utf8");
const maintainersDoc = fs.readFileSync(path.join(repoRoot, "docs", "maintainers.md"), "utf8");

assert(fs.existsSync(path.join(repoRoot, "evals", "README.md")), "root evals README exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "minimum-sufficient-flow.md")), "minimum sufficient flow eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "shared-foundation-first.md")), "shared foundation eval exists");
assert(fs.existsSync(path.join(repoRoot, "evals", "reference-project-boundary.md")), "reference project boundary eval exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "README.md")), "root examples README exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "platform-project-foundation-first.md")), "platform project example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "minimum-sufficient-change.md")), "minimum sufficient change example exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "platform-project-foundation-first", "README.md")), "platform project skeleton exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "platform-project-foundation-first", ".ai-os", "project-charter.md")), "platform project skeleton includes project charter");
assert(fs.existsSync(path.join(repoRoot, "examples", "minimum-sufficient-change", "README.md")), "minimum sufficient change skeleton exists");
assert(fs.existsSync(path.join(repoRoot, "examples", "minimum-sufficient-change", ".ai-os", "STATE.md")), "minimum sufficient change skeleton includes state");
assert(fs.existsSync(path.join(repoRoot, "docs", "change-evaluation-template.md")), "change evaluation template exists");
assert(rootAgents.includes("docs/change-evaluation-template.md"), "root AGENTS references change evaluation template");
assert(maintainersDoc.includes("../evals/minimum-sufficient-flow.md"), "maintainers doc references root evals");
assert(maintainersDoc.includes("../examples/platform-project-foundation-first.md"), "maintainers doc references root examples");
assert(maintainersDoc.includes("change-evaluation-template.md"), "maintainers doc references change evaluation template");

// ---------------------------------------------------------------------------
// Test: shared.js exports
// ---------------------------------------------------------------------------

process.stdout.write("\n=== shared.js exports ===\n");

const shared = require("../bin/shared");
assert(typeof shared.cleanYamlScalar === "function", "cleanYamlScalar exported");
assert(typeof shared.parseInlineArray === "function", "parseInlineArray exported");
assert(typeof shared.SYM_OK === "string", "SYM_OK exported");
assert(typeof shared.VALIDATION_SCHEMAS === "object", "VALIDATION_SCHEMAS exported");

// ---------------------------------------------------------------------------
// Test: YAML utilities
// ---------------------------------------------------------------------------

process.stdout.write("\n=== YAML utilities ===\n");

assert(shared.cleanYamlScalar('"hello"') === "hello", 'cleanYamlScalar strips double quotes');
assert(shared.cleanYamlScalar("'hello'") === "hello", "cleanYamlScalar strips single quotes");
assert(shared.cleanYamlScalar("  plain  ") === "plain", "cleanYamlScalar trims whitespace");
assert(shared.cleanYamlScalar("") === "", "cleanYamlScalar handles empty string");

const arr = shared.parseInlineArray('[a, "b", c]');
assert(arr.length === 3, "parseInlineArray parses 3 items");
assert(arr[1] === "b", "parseInlineArray strips quotes from items");
assert(shared.parseInlineArray("[]").length === 0, "parseInlineArray handles empty array");
assert(shared.parseInlineArray("not-an-array").length === 0, "parseInlineArray handles non-array");

// ---------------------------------------------------------------------------
// Test: create-ai-os init
// ---------------------------------------------------------------------------

process.stdout.write("\n=== create-ai-os init ===\n");

const initDir = tmpDir();
const initResult = run("create-ai-os.js", [initDir, "--with-project-files"]);
assert(initResult.status === 0, "init exits with code 0");
assert(fs.existsSync(path.join(initDir, "AGENTS.md")), "AGENTS.md created");
assert(fs.existsSync(path.join(initDir, ".agents", "skills")), ".agents/skills/ created");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows")), ".agents/workflows/ created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "framework.toml")), "framework.toml created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "STATE.md")), "STATE.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "tasks.yaml")), "tasks.yaml created");

const projectCharterTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "project-charter.md"), "utf8");
assert(projectCharterTemplate.includes("适配范围 / 支持环境"), "project charter uses support-environment wording");
assert(!projectCharterTemplate.includes("兼容性"), "project charter avoids compatibility wording");
assert(projectCharterTemplate.includes("目标市场 / 主要使用地区"), "project charter includes target market field");
assert(projectCharterTemplate.includes("体验 / 视觉参考方向"), "project charter includes design reference direction");
assert(projectCharterTemplate.includes("| M0 | 基础能力层"), "project charter template includes M0 foundation milestone");
assert(projectCharterTemplate.includes("| 基础能力层 | 页面类 / API 类 | 登录、权限、多语言"), "project charter template includes foundation capability layer");
assert(projectCharterTemplate.includes("**默认交付等级**"), "project charter template includes default delivery level");
assert(projectCharterTemplate.includes("**共享基础能力依赖结构**"), "project charter template includes shared-foundation flag");
assert(projectCharterTemplate.includes("| 模块 | 模块类型 |"), "project charter template tracks module type");

const exampleSpecTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "specs", "example.spec.md"), "utf8");
assert(exampleSpecTemplate.includes("适配范围 / 支持环境"), "example spec uses support-environment wording");
assert(!exampleSpecTemplate.includes("- **兼容**"), "example spec avoids compatibility wording");
assert(exampleSpecTemplate.includes("目标市场 / 主要使用地区"), "example spec includes target market field");
assert(exampleSpecTemplate.includes("交互 / 视觉约束"), "example spec includes UX style constraint");
assert(exampleSpecTemplate.includes("**模块类型**"), "example spec records module type");
assert(exampleSpecTemplate.includes("**交付等级**"), "example spec records delivery level");
assert(exampleSpecTemplate.includes("命令 / 调度 / 输入输出"), "example spec supports tool and data-processing modules");

const cloneSpecTemplate = fs.readFileSync(
  path.join(initDir, ".agents", "skills", "reverse-engineer", "references", "clone-spec-template.md"),
  "utf8"
);
assert(cloneSpecTemplate.includes("## 参考来源"), "clone spec template uses reference-source section");
assert(!cloneSpecTemplate.includes("## 原型信息"), "clone spec template avoids prototype-section naming");

const stateTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "STATE.md"), "utf8");
assert(stateTemplate.includes("**当前里程碑目标**"), "STATE template includes current milestone goal");

const quickWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "quick.md"), "utf8");
assert(quickWorkflow.includes("读取 `.ai-os/project-charter.md` 和 `.ai-os/STATE.md`"), "quick workflow aligns with project purpose and state");
assert(quickWorkflow.includes("最低足够流程"), "quick workflow is framed as minimum sufficient flow");

const debugWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "debug.md"), "utf8");
assert(debugWorkflow.includes("阻塞当前里程碑目标"), "debug workflow checks blocker status against current milestone goal");

const changeRequestWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "change-request.md"), "utf8");
assert(changeRequestWorkflow.includes("当前里程碑目标"), "change-request workflow checks change priority against current milestone goal");

const newModuleWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "new-module.md"), "utf8");
assert(newModuleWorkflow.includes("模块类型"), "new-module workflow identifies module type first");
assert(newModuleWorkflow.includes("交付等级"), "new-module workflow identifies delivery level first");
assert(newModuleWorkflow.includes("仅在以下情况创建 `.ai-os/specs/[模块名].context.md`"), "new-module workflow creates context file only when needed");
assert(newModuleWorkflow.includes("技术设计不再固定套用所有 Skill"), "new-module workflow adapts technical design by module type");

const fullstackChecklist = fs.readFileSync(path.join(initDir, ".agents", "skills", "fullstack-dev-checklist", "SKILL.md"), "utf8");
assert(fullstackChecklist.includes("目标市场 / 主要使用地区"), "fullstack checklist requires target market alignment");
assert(fullstackChecklist.includes("国内项目默认"), "fullstack checklist guards against mismatched overseas-style defaults");
assert(fullstackChecklist.includes("只有当一个模块同时涉及页面、API、持久化或复杂前后端联动链路时"), "fullstack checklist is limited to true cross-layer modules");
assert(fullstackChecklist.includes("纯页面、纯 API、纯数据处理或纯工具"), "fullstack checklist avoids being forced onto single-type modules");

const skillsIndex = fs.readFileSync(path.join(initDir, ".agents", "skills", "AGENTS.md"), "utf8");
assert(skillsIndex.includes("页面 + API + 持久化强耦合模块"), "skills index narrows fullstack checklist trigger to strongly coupled modules");
assert(skillsIndex.includes("不是所有模块的默认 Skill"), "skills index states fullstack checklist is not the default for every module");

const projectPlannerSkill = fs.readFileSync(path.join(initDir, ".agents", "skills", "project-planner", "SKILL.md"), "utf8");
assert(projectPlannerSkill.includes("目标市场 / 主要使用地区"), "project planner requires target market planning");
assert(projectPlannerSkill.includes("每个核心模块声明"), "project planner requires module type and delivery level planning");
assert(projectPlannerSkill.includes("共享基础能力优先"), "project planner references shared-foundation planning rule");

const specValidatorSkill = fs.readFileSync(path.join(initDir, ".agents", "skills", "spec-validator", "SKILL.md"), "utf8");
assert(specValidatorSkill.includes("通用必填项 + 类型专项项 + 等级附加项"), "spec validator validates universal, type-specific, and level-specific requirements");
assert(specValidatorSkill.includes("### 工具类"), "spec validator supports tool modules");
assert(specValidatorSkill.includes("### L3 高风险"), "spec validator scales checks by delivery level");

const newProjectWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "new-project.md"), "utf8");
assert(newProjectWorkflow.includes("模块类型（`页面类` / `API 类` / `数据处理类` / `工具类`）"), "new-project workflow classifies modules by type");
assert(newProjectWorkflow.includes("基础能力可用 + 首条核心业务闭环可运行"), "new-project workflow prioritizes foundation plus first runnable business loop");

const workflowsIndex = fs.readFileSync(path.join(initDir, ".agents", "workflows", "AGENTS.md"), "utf8");
assert(workflowsIndex.includes("模块类型和交付等级"), "workflow index describes adaptive new-module flow");
assert(workflowsIndex.includes("最低足够流程"), "workflow index describes quick as minimum sufficient flow");

const initWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "init.md"), "utf8");
assert(initWorkflow.includes("目标市场与体验风格推断"), "init workflow infers target market and UX style for existing projects");
assert(initWorkflow.includes("模块类型和默认交付等级"), "init workflow records module types and default delivery levels");

const mapCodebaseWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "map-codebase.md"), "utf8");
assert(mapCodebaseWorkflow.includes("待确认"), "map-codebase workflow records target market assumptions as pending confirmation");
assert(mapCodebaseWorkflow.includes("模块类型（页面类 / API 类 / 数据处理类 / 工具类）"), "map-codebase workflow suggests module types");

const archetypesRef = fs.readFileSync(path.join(initDir, ".agents", "skills", "project-planner", "references", "archetypes.md"), "utf8");
assert(archetypesRef.includes("WMS、ERP、OMS、SaaS 后台、管理系统、多租户运营平台只是常见示例"), "archetypes treat industry names as examples rather than rule trigger");

const taskOrchestratorSkill = fs.readFileSync(path.join(initDir, ".agents", "skills", "task-orchestrator", "SKILL.md"), "utf8");
assert(taskOrchestratorSkill.includes("按模块类型拆任务"), "task orchestrator splits tasks by module type");
assert(taskOrchestratorSkill.includes("按交付等级缩放任务"), "task orchestrator scales tasks by delivery level");

const acceptanceGateSkill = fs.readFileSync(path.join(initDir, ".agents", "skills", "acceptance-gate", "SKILL.md"), "utf8");
assert(acceptanceGateSkill.includes("按模块类型检查验收证据"), "acceptance gate checks evidence by module type");
assert(acceptanceGateSkill.includes("按交付等级缩放验收"), "acceptance gate scales acceptance by delivery level");

const reviewWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "review.md"), "utf8");
assert(reviewWorkflow.includes("模块类型和交付等级"), "review workflow scales review depth by module type and delivery level");

const shipWorkflow = fs.readFileSync(path.join(initDir, ".agents", "workflows", "ship.md"), "utf8");
assert(shipWorkflow.includes("`L3` 模块"), "ship workflow highlights L3 release constraints");

const codeReviewGuardSkill = fs.readFileSync(path.join(initDir, ".agents", "skills", "code-review-guard", "SKILL.md"), "utf8");
assert(codeReviewGuardSkill.includes("不是“默认所有模块都走同一套重审流程”"), "code review guard avoids a single heavy review flow for every module");
assert(codeReviewGuardSkill.includes("仅在模块存在明显跨层联动时调用 `fullstack-dev-checklist`"), "code review guard limits fullstack checklist to cross-layer modules");
assert(codeReviewGuardSkill.includes("按交付等级缩放自审"), "code review guard scales review by delivery level");

const releaseManagerSkill = fs.readFileSync(path.join(initDir, ".agents", "skills", "release-manager", "SKILL.md"), "utf8");
assert(releaseManagerSkill.includes("不是所有模块默认都走完整发布流程"), "release manager avoids forcing full release flow onto every module");
assert(releaseManagerSkill.includes("按模块类型检查发布要点"), "release manager checks release requirements by module type");
assert(releaseManagerSkill.includes("按交付等级缩放发布要求"), "release manager scales release requirements by delivery level");

const derivedRulesRef = fs.readFileSync(path.join(initDir, ".agents", "references", "derived-rules.md"), "utf8");
assert(derivedRulesRef.includes("目标市场适配"), "derived rules reference centralizes target-market guidance");
assert(derivedRulesRef.includes("共享基础能力优先"), "derived rules reference centralizes shared-foundation guidance");

const frameworkAgents = fs.readFileSync(path.join(initDir, "AGENTS.md"), "utf8");
assert(frameworkAgents.includes("## 二、通用性优先"), "framework constitution is reorganized around the six core requirements");
assert(frameworkAgents.includes("模块进入实现前，必须明确模块类型"), "framework constitution requires module type classification");
assert(frameworkAgents.includes("仅在需求存在明显决策空间时创建 `.context.md`"), "framework constitution enforces context-file complexity budget");

// ---------------------------------------------------------------------------
// Test: re-init on existing project (should not fail)
// ---------------------------------------------------------------------------

process.stdout.write("\n=== re-init on existing project ===\n");

const agentsMdBefore = fs.readFileSync(path.join(initDir, "AGENTS.md"), "utf8");
fs.writeFileSync(path.join(initDir, "AGENTS.md"), agentsMdBefore + "\n<!-- custom -->\n");
const customContent = fs.readFileSync(path.join(initDir, "AGENTS.md"), "utf8");

const reinitResult = run("create-ai-os.js", [initDir]);
assert(reinitResult.status === 0, "re-init on existing project exits with code 0");
assert(fs.existsSync(path.join(initDir, "AGENTS.md")), "AGENTS.md still exists after re-init");

const agentsMdAfter = fs.readFileSync(path.join(initDir, "AGENTS.md"), "utf8");
assert(agentsMdAfter === customContent, "re-init preserves user-modified AGENTS.md (overwrite: false)");
assert(fs.existsSync(path.join(initDir, ".ai-os", "framework.toml")), "framework.toml still exists after re-init");

fs.writeFileSync(path.join(initDir, "AGENTS.md"), agentsMdBefore);

// ---------------------------------------------------------------------------
// Test: doctor
// ---------------------------------------------------------------------------

process.stdout.write("\n=== doctor ===\n");

const doctorResult = run("ai-os-doctor.js", [initDir]);
assert(doctorResult.status === 0, "doctor passes on fresh project");
assert(doctorResult.stdout.includes("HEALTHY"), "doctor reports HEALTHY");

// ---------------------------------------------------------------------------
// Test: diff
// ---------------------------------------------------------------------------

process.stdout.write("\n=== diff ===\n");

const diffResult = run("ai-os-diff.js", [initDir, "--stat"]);
assert(diffResult.status === 0, "diff exits with code 0");
assert(diffResult.stdout.includes("unchanged"), "diff shows unchanged files");

// ---------------------------------------------------------------------------
// Test: diff detects modifications
// ---------------------------------------------------------------------------

process.stdout.write("\n=== diff detects changes ===\n");

fs.writeFileSync(path.join(initDir, "AGENTS.md"), "# Modified\n");
const diffResult2 = run("ai-os-diff.js", [initDir, "--stat"]);
assert(diffResult2.stdout.includes("1 modified"), "diff detects modified AGENTS.md");

// ---------------------------------------------------------------------------
// Test: upgrade repairs
// ---------------------------------------------------------------------------

process.stdout.write("\n=== upgrade ===\n");

const upgradeResult = run("ai-os-upgrade.js", [initDir, "--force"]);
assert(upgradeResult.status === 0, "upgrade --force succeeds");

const diffAfter = run("ai-os-diff.js", [initDir, "--stat"]);
assert(diffAfter.stdout.includes("0 modified"), "upgrade repaired the modification");

// ---------------------------------------------------------------------------
// Test: validate
// ---------------------------------------------------------------------------

process.stdout.write("\n=== validate ===\n");

const validateResult = run("ai-os-validate.js", [initDir]);
assert(validateResult.status === 0, "validate passes on template project");

// ---------------------------------------------------------------------------
// Test: status / next / resume (graceful on template data)
// ---------------------------------------------------------------------------

process.stdout.write("\n=== status / next / resume ===\n");

const statusResult = run("ai-os-status.js", [initDir]);
assert(statusResult.status === 0, "status exits with code 0");

const nextResult = run("ai-os-next.js", [initDir]);
assert(nextResult.status === 0, "next exits with code 0");

const resumeResult = run("ai-os-resume.js", [initDir]);
assert(resumeResult.status === 0, "resume exits with code 0");

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

cleanup(initDir);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

process.stdout.write(`\n=== Results ===\n`);
process.stdout.write(`${passed} passed, ${failed} failed\n\n`);

if (failed > 0) {
  process.exit(1);
}
