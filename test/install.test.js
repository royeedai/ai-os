#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const {
  assert, run, tmpDir, cleanup, listBaselineRecords,
  extractMissionBaselineId, section, BASELINE_RECORD_NAME_PATTERN,
} = require("./helpers");

section("create-ai-os init");
const initDir = tmpDir();
const initResult = run("create-ai-os.js", [initDir, "--with-project-files"]);
assert(initResult.status === 0, "init exits with code 0");
assert(fs.existsSync(path.join(initDir, "AGENTS.md")), "AGENTS.md created");
assert(fs.existsSync(path.join(initDir, ".agents", "skills")), ".agents/skills/ created");
assert(fs.existsSync(path.join(initDir, ".agents", "workflows")), ".agents/workflows/ created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "framework.toml")), "framework.toml created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "MISSION.md")), "MISSION.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "baseline-log")), "baseline-log/ created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "DESIGN.md")), "DESIGN.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "CONVENTIONS.md")), "CONVENTIONS.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "STATE.md")), "STATE.md created");
assert(fs.existsSync(path.join(initDir, ".ai-os", "tasks.yaml")), "tasks.yaml created");
assert(
  fs.readFileSync(path.join(initDir, ".ai-os", "framework.toml"), "utf8").includes('install_profile = "project"'),
  "framework metadata records project profile"
);
assert(
  fs.readFileSync(path.join(initDir, ".ai-os", "framework.toml"), "utf8").includes('framework_footprint = "full"'),
  "framework metadata records full footprint"
);
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
const conventionsTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "CONVENTIONS.md"), "utf8");
const tasksTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "tasks.yaml"), "utf8");
const acceptanceTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "acceptance.yaml"), "utf8");
const stateTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "STATE.md"), "utf8");
const specTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "specs", "example.spec.md"), "utf8");
const baselineStarterFiles = listBaselineRecords(initDir, "BL-");
assert(baselineStarterFiles.length === 1, "baseline-log starter record created");
assert(BASELINE_RECORD_NAME_PATTERN.test(baselineStarterFiles[0]), "baseline-log starter record uses timestamp + slug naming");
const initialBaselineFile = baselineStarterFiles[0];
const initialBaselineId = initialBaselineFile.replace(/\.md$/, "");
const baselineTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "baseline-log", initialBaselineFile), "utf8");

assert(missionTemplate.includes("## 1. 交付基线摘要"), "MISSION template has baseline summary section");
assert(missionTemplate.includes("宿主项目 / 系统"), "MISSION template includes host project field");
assert(missionTemplate.includes("当前交付主题"), "MISSION template includes current delivery subject");
assert(missionTemplate.includes("brownfield` / `change"), "MISSION template clarifies brownfield/change semantics");
assert(missionTemplate.includes("已确认约束与关键决策"), "MISSION template includes confirmed decision section");
assert(missionTemplate.includes("当前基线 ID"), "MISSION template includes current baseline id");
assert(missionTemplate.includes("## 4. 范围边界与非目标"), "MISSION template has scope/non-goal section");
assert(missionTemplate.includes("高风险触发因素"), "MISSION template includes high-risk triggers");
assert(missionTemplate.includes("当前治理档位"), "MISSION template includes governance tier");
assert(missionTemplate.includes("### 已确认非功能性约束"), "MISSION template includes confirmed non-functional constraints");
assert(!missionTemplate.includes("需求变更同步记录"), "MISSION template no longer includes change sync log");
assert(!missionTemplate.includes("## 5. 阶段计划"), "MISSION template no longer includes phase plan");
assert(extractMissionBaselineId(missionTemplate) === initialBaselineId, "MISSION template baseline id matches starter record");
assert(baselineTemplate.includes(`# ${initialBaselineId}`), "baseline template includes generated initial confirmed baseline");
assert(baselineTemplate.includes("**Type**: align"), "baseline template includes Type field");
assert(baselineTemplate.includes("CR-YYYYMMDD-HHMMSS-change-request.md"), "baseline template explains timestamp-based per-record file convention");
assert(designTemplate.includes("## 2. 信息架构"), "DESIGN template has IA section");
assert(designTemplate.includes("## 6. 设计确认记录"), "DESIGN template has confirmation record section");
assert(designTemplate.includes("必须用户确认的核心设计决策"), "DESIGN template includes required confirmations");
assert(designTemplate.includes("## 8. 方案选型依据"), "DESIGN template includes decision rationale section");
assert(designTemplate.includes("## 10. 风险与注意事项"), "DESIGN template includes risk notes section");
assert(designTemplate.includes("共享基础设施约定"), "DESIGN template includes shared infrastructure constraint");
assert(conventionsTemplate.includes("## 命名约定"), "CONVENTIONS template has naming section");
assert(conventionsTemplate.includes("## 代码模式"), "CONVENTIONS template has code patterns section");
assert(conventionsTemplate.includes("## 禁止模式"), "CONVENTIONS template has anti-pattern section");
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
assert(tasksTemplate.includes(`baseline_id: "${initialBaselineId}"`), "tasks template includes generated baseline_id");
assert(!tasksTemplate.includes("\nmission:"), "tasks template omits deprecated top-level mission field");
assert(tasksTemplate.includes("TASK-AI-001"), "tasks template uses collaboration-safe task ids");
assert(tasksTemplate.includes("owner: AI"), "tasks template includes stable owner field");
assert(acceptanceTemplate.includes("design-confirmation"), "acceptance template includes design gate");
assert(acceptanceTemplate.includes(`baseline_id: "${initialBaselineId}"`), "acceptance template includes generated baseline_id");
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
assert(stateTemplate.includes("项目模式"), "STATE template includes canonical 项目模式 field");
assert(stateTemplate.includes("当前阶段"), "STATE template includes canonical 当前阶段 field");
assert(stateTemplate.includes("当前确认停点"), "STATE template includes confirmation checkpoint");
assert(stateTemplate.includes("baseline-log/"), "STATE template minimum read set includes baseline-log directory");

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

section("install profiles / plan");

const coreDir = tmpDir();
const coreInitResult = run("create-ai-os.js", [coreDir]);
assert(coreInitResult.status === 0, "core profile init exits with code 0");
assert(fs.existsSync(path.join(coreDir, "AGENTS.md")), "core profile still installs framework files");
assert(!fs.existsSync(path.join(coreDir, ".ai-os", "STATE.md")), "core profile does not create starter project artifacts");

const coreMetadata = fs.readFileSync(path.join(coreDir, ".ai-os", "framework.toml"), "utf8");
assert(coreMetadata.includes('install_profile = "core"'), "framework metadata records core profile");
assert(coreMetadata.includes('framework_footprint = "full"'), "core metadata records full footprint");

const planJsonResult = run("ai-os-plan.js", [coreDir, "--json"]);
assert(planJsonResult.status === 0, "ai-os-plan --json exits with code 0");
const planJson = JSON.parse(planJsonResult.stdout);
assert(planJson.profile.name === "core", "ai-os-plan defaults to the core profile");
assert(planJson.project === null, "core plan omits starter project artifacts");

const subcommandPlanResult = run("create-ai-os.js", ["plan", coreDir, "--json"]);
assert(subcommandPlanResult.status === 0, "create-ai-os plan --json exits with code 0");
const subcommandPlanJson = JSON.parse(subcommandPlanResult.stdout);
assert(subcommandPlanJson.profile.name === "core", "create-ai-os plan delegates to the core profile preview");

const futureProjectDir = path.join(os.tmpdir(), `ai-os-plan-${crypto.randomBytes(4).toString("hex")}`);
const futurePlanResult = run("create-ai-os.js", ["plan", futureProjectDir, "--profile", "project", "--json"]);
assert(futurePlanResult.status === 0, "create-ai-os plan works on a new target path");
const futurePlanJson = JSON.parse(futurePlanResult.stdout);
assert(futurePlanJson.profile.name === "project", "create-ai-os plan accepts project profile for a new target path");
assert(futurePlanJson.summary.projectCreateCount > 0, "new-target plan reports starter project artifacts to create");
assert(futurePlanJson.project.create.includes(".ai-os/CONVENTIONS.md"), "project plan includes CONVENTIONS starter file");
assert(futurePlanJson.project.create.some((relPath) => /^\.ai-os\/baseline-log\/BL-\d{8}-\d{6}-[a-z0-9-]+\.md$/.test(relPath)), "project plan includes timestamped baseline starter record");
assert(!futurePlanJson.project.create.includes(".ai-os/evals/eval-example.md"), "plan omits on-demand eval starter files");

const litePlanResult = run("create-ai-os.js", ["plan", futureProjectDir, "--profile", "project", "--lite", "--json"]);
assert(litePlanResult.status === 0, "create-ai-os plan --lite works on a new target path");
const litePlanJson = JSON.parse(litePlanResult.stdout);
assert(litePlanJson.summary.frameworkCopyCount < futurePlanJson.summary.frameworkCopyCount, "plan --lite previews fewer framework files");

const projectPlanResult = run("ai-os-plan.js", [coreDir, "--profile", "project"]);
assert(projectPlanResult.status === 0, "ai-os-plan project profile exits with code 0");
assert(projectPlanResult.stdout.includes("project artifacts"), "project plan reports starter project artifacts");

const coreDoctorResult = run("ai-os-doctor.js", [coreDir]);
assert(coreDoctorResult.status === 0, "doctor passes on core-profile install");
assert(coreDoctorResult.stdout.includes("Install profile: core"), "doctor reports the installed core profile");
assert(coreDoctorResult.stdout.includes("optional in core profile"), "doctor treats starter artifacts as optional in core profile");

const coreDoctorStrictResult = run("ai-os-doctor.js", [coreDir, "--strict"]);
assert(coreDoctorStrictResult.status === 0, "doctor --strict skips validation for a core-only install");
assert(coreDoctorStrictResult.stdout.includes("skipped: project artifacts were not installed by this profile"), "doctor --strict explains why validation was skipped");

section("re-init on existing project");

const agentsMdBefore = fs.readFileSync(path.join(initDir, "AGENTS.md"), "utf8");
fs.writeFileSync(path.join(initDir, "AGENTS.md"), agentsMdBefore + "\n<!-- custom -->\n");
const customContent = fs.readFileSync(path.join(initDir, "AGENTS.md"), "utf8");

const reinitResult = run("create-ai-os.js", [initDir]);
assert(reinitResult.status === 0, "re-init on existing project exits with code 0");
assert(fs.existsSync(path.join(initDir, "AGENTS.md")), "AGENTS.md still exists after re-init");
assert(listBaselineRecords(initDir, "BL-").length === 1, "re-init does not create a duplicate baseline starter record");
assert(listBaselineRecords(initDir, "BL-")[0] === initialBaselineFile, "re-init preserves the original baseline starter record");

const agentsMdAfter = fs.readFileSync(path.join(initDir, "AGENTS.md"), "utf8");
assert(agentsMdAfter === customContent, "re-init preserves user-modified AGENTS.md (overwrite: false)");
assert(fs.existsSync(path.join(initDir, ".ai-os", "framework.toml")), "framework.toml still exists after re-init");

fs.writeFileSync(path.join(initDir, "AGENTS.md"), agentsMdBefore);

section("validate / doctor / status / next / resume");
const validateResult = run("ai-os-validate.js", [initDir]);
assert(validateResult.status === 0, "validate passes on fresh project");

const doctorResult = run("ai-os-doctor.js", [initDir, "--strict"]);
assert(doctorResult.status === 0, "doctor --strict passes on fresh project");

const statusResult = run("ai-os-status.js", [initDir]);
assert(statusResult.status === 0, "status exits with code 0");
assert(statusResult.stdout.includes("当前方位"), "status prints current orientation");
assert(statusResult.stdout.includes("基线概览"), "status prints baseline overview");
assert(statusResult.stdout.includes("Mission 当前基线 ID"), "status prints mission baseline id");
assert(statusResult.stdout.includes("已锁定内容"), "status prints locked items");

const nextResult = run("ai-os-next.js", [initDir]);
assert(nextResult.status === 0, "next exits with code 0");
assert(nextResult.stdout.includes("role="), "next includes execution role");

const resumeResult = run("ai-os-resume.js", [initDir]);
assert(resumeResult.status === 0, "resume exits with code 0");
assert(resumeResult.stdout.includes(".ai-os/MISSION.md"), "resume includes MISSION in reading set");
assert(resumeResult.stdout.includes(".ai-os/baseline-log"), "resume includes baseline-log in reading set");

const resumeMarkdownResult = run("ai-os-resume.js", [initDir, "--markdown"]);
assert(resumeMarkdownResult.status === 0, "resume --markdown exits with code 0");
assert(resumeMarkdownResult.stdout.includes("## 基线概览"), "resume --markdown includes baseline overview");
assert(resumeMarkdownResult.stdout.includes("## 已锁定内容"), "resume --markdown includes locked items");
assert(resumeMarkdownResult.stdout.includes(".ai-os/DESIGN.md"), "resume --markdown references DESIGN");

fs.unlinkSync(path.join(initDir, ".ai-os", "STATE.md"));
const rebuiltStatusResult = run("ai-os-status.js", [initDir]);
assert(rebuiltStatusResult.status === 0, "status rebuilds missing STATE.md");
assert(rebuiltStatusResult.stdout.includes("重建"), "status reports STATE rebuild");
assert(fs.existsSync(path.join(initDir, ".ai-os", "STATE.md")), "status recreates STATE.md");
assert(
  fs.readFileSync(path.join(initDir, ".ai-os", "STATE.md"), "utf8").includes("STATE 从项目工件重建"),
  "rebuilt STATE records reconstruction note"
);

fs.unlinkSync(path.join(initDir, ".ai-os", "STATE.md"));
const rebuiltNextResult = run("ai-os-next.js", [initDir]);
assert(rebuiltNextResult.status === 0, "next rebuilds missing STATE.md");
assert(rebuiltNextResult.stdout.includes("重建"), "next reports STATE rebuild");

fs.unlinkSync(path.join(initDir, ".ai-os", "STATE.md"));
const rebuiltResumeResult = run("ai-os-resume.js", [initDir]);
assert(rebuiltResumeResult.status === 0, "resume rebuilds missing STATE.md");
assert(rebuiltResumeResult.stdout.includes("重建"), "resume reports STATE rebuild");

cleanup(initDir);
cleanup(coreDir);
