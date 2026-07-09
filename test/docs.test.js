#!/usr/bin/env node

/**
 * Documentation / constitution consistency checks for the v10 layout
 * (core default artifacts + on-demand extension artifacts).
 */

const fs = require("fs");
const path = require("path");
const { assert, repoRoot, section } = require("./helpers");

const DISTRIBUTED_AGENTS_TEMPLATE = "framework/.agents/templates/root/AGENTS.md";
const CURRENT_VERSION = "11.0.0";

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

section("docs: repo AGENTS.md is a pure maintainer guard");

{
  const p = path.join(repoRoot, "AGENTS.md");
  assert(fs.existsSync(p), "AGENTS.md exists at repo root");
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split(/\r?\n/).length;
  assert(lines <= 80, `repo AGENTS.md is compact (got ${lines})`);
  assert(content.includes("AI-OS 仓库维护规则"), "repo AGENTS.md identifies itself as maintainer guidance");
  assert(content.includes("不在本仓库创建、恢复或维护 `.ai-os/`"), "repo AGENTS.md forbids repo .ai-os state");
  assert(content.includes(DISTRIBUTED_AGENTS_TEMPLATE), "repo AGENTS.md points to distributed constitution template");
  assert(content.includes("npm test"), "repo AGENTS.md uses project-native tests for closure");
  assert(!content.includes("当前交付基线在 `.ai-os/lanes/default/MISSION.md`"), "repo AGENTS.md does not route this repo through lane recovery");
}

section("docs: distributed AGENTS template is compact and core/on-demand structured");

{
  const p = path.join(repoRoot, DISTRIBUTED_AGENTS_TEMPLATE);
  assert(fs.existsSync(p), "distributed AGENTS template exists");
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split(/\r?\n/).length;
  assert(lines <= 150, `distributed AGENTS template within 150 lines (got ${lines})`);
  assert(content.includes("五条核心要求"), "AGENTS.md contains 'five core requirements' section");
  assert(content.includes("绝对禁止"), "AGENTS.md contains 'absolute prohibitions' section");
  assert(content.includes("核心工件"), "AGENTS.md contains core artifact table");
  assert(content.includes("按需工件"), "AGENTS.md documents on-demand artifacts");
  assert(content.includes(".ai-os/lanes/default/MISSION.md"), "AGENTS.md references lane mission");
  assert(content.includes("Activation Gate"), "AGENTS.md names Activation Gate");
  assert(content.includes("这是先讨论，还是要进入项目交付流程？"), "AGENTS.md includes the one confirmation question");
  assert(content.includes("反述"), "AGENTS.md keeps the restate-and-confirm gate");
  assert(content.includes("高风险动作"), "AGENTS.md keeps the high-risk escalation rule");
  assert(content.includes("隐式机制"), "AGENTS.md defines implicit mechanism guardrails");
  assert(content.includes("执行顺序"), "AGENTS.md requires implicit mechanism execution order");
  assert(content.includes("高风险状态流"), "AGENTS.md names high-risk state flow");
  assert(content.includes("不默认新增隐式机制"), "AGENTS.md forbids default implicit mechanism creation");
  // on-demand artifacts named with their triggers
  for (const term of ["risk-register.md", "release-plan.md", "verification-matrix.yaml", "specs/", "design-pack/", "evals/"]) {
    assert(content.includes(term), `AGENTS.md names on-demand artifact ${term}`);
  }
  // business-specific rules must not be hard-coded into the universal constitution
  assert(!content.includes("密码与默认凭证"), "AGENTS.md no longer carries the password/default credential business rule");
}

section("docs: key documentation files exist and deleted docs stay deleted");

{
  const docs = [
    "PROJECT_PURPOSE.md",
    "README.md",
    "docs/artifacts.md",
    "docs/cli.md",
    "docs/maintainers.md",
    "docs/getting-started.md",
    "docs/interop.md",
    "CHANGELOG.md",
    "CHANGELOG-archive.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "VERSION",
    "package.json",
  ];
  for (const rel of docs) {
    assert(fs.existsSync(path.join(repoRoot, rel)), `${rel} exists`);
  }
  const removed = [
    "docs/constitution-spec.md",
    "docs/problem-ledger.md",
    "docs/codex-aios-field-feedback.md",
    "docs/reverse-spec-url-intake.md",
    "docs/change-evaluation-template.md",
    "docs/interop",
  ];
  for (const rel of removed) {
    assert(!fs.existsSync(path.join(repoRoot, rel)), `${rel} stays removed`);
  }
  const docsDir = fs.readdirSync(path.join(repoRoot, "docs")).sort();
  assert(docsDir.length === 5, `docs/ has exactly 5 files (got ${docsDir.length}: ${docsDir.join(", ")})`);
}

section("docs: default layout narrative is consistent");

{
  const files = [
    "README.md",
    "docs/artifacts.md",
    "docs/getting-started.md",
    "docs/cli.md",
    "docs/maintainers.md",
  ];
  for (const rel of files) {
    const content = read(rel);
    assert(content.includes(".ai-os/lanes/default/"), `${rel} references lanes/default`);
    assert(content.includes(".ai-os/MISSION.md"), `${rel} references shared root mission`);
  }
}

section("docs: no doc references deleted files or removed doctor codes");

{
  const targets = [
    "README.md",
    "PROJECT_PURPOSE.md",
    "docs/artifacts.md",
    "docs/cli.md",
    "docs/getting-started.md",
    "docs/maintainers.md",
    "docs/interop.md",
    DISTRIBUTED_AGENTS_TEMPLATE,
    "framework/skills/ai-os-delivery/SKILL.md",
  ];
  const forbidden = [
    "docs/constitution-spec.md",
    "docs/problem-ledger.md",
    "docs/codex-aios-field-feedback.md",
    "docs/reverse-spec-url-intake.md",
    "docs/change-evaluation-template.md",
    "docs/interop/",
    "W072",
    "W074",
    "W076",
    "W077",
    "W078",
  ];
  for (const rel of targets) {
    const content = read(rel);
    for (const term of forbidden) {
      assert(!content.includes(term), `${rel} does not reference removed ${term}`);
    }
  }
}

section("docs: bin contains exactly 3 scripts");

{
  const binDir = path.join(repoRoot, "bin");
  const files = fs.readdirSync(binDir).sort();
  const expected = ["ai-os-doctor.js", "create-ai-os.js", "shared.js"];
  assert(JSON.stringify(files) === JSON.stringify(expected), `bin/ has exactly 3 scripts: ${files.join(", ")}`);
}

section("docs: doctor semantic warnings are exactly W070 and W071");

{
  const doctor = read("bin/ai-os-doctor.js");
  assert(doctor.includes('["W070", "W071"]'), "doctor semantic warning range is W070-W071");
  for (const code of ["W072", "W074", "W076", "W077", "W078", "W079"]) {
    assert(!doctor.includes(code), `doctor does not contain removed code ${code}`);
  }
  const cli = read("docs/cli.md");
  assert(cli.includes("W070"), "cli.md documents W070");
  assert(cli.includes("W071"), "cli.md documents W071");
}

section("docs: framework templates ship core artifacts only");

{
  const sharedRoot = path.join(repoRoot, "framework/.agents/templates/shared-root");
  const lane = path.join(repoRoot, "framework/.agents/templates/lane");
  const root = path.join(repoRoot, "framework/.agents/templates/root");
  assert(fs.existsSync(path.join(root, "AGENTS.md")), "root template AGENTS.md exists");
  for (const file of ["MISSION.md", "memory.md"]) {
    assert(fs.existsSync(path.join(sharedRoot, file)), `shared-root template ${file} exists`);
  }
  for (const file of ["lane.toml", "MISSION.md", "DESIGN.md", "STATE.md", "tasks.yaml"]) {
    assert(fs.existsSync(path.join(lane, file)), `lane template ${file} exists`);
  }
  assert(fs.existsSync(path.join(lane, "baseline-log", "BL-template.md")), "lane baseline-log template exists");
  // on-demand artifacts must not have default templates
  for (const removed of ["risk-register.md", "release-plan.md", "verification-matrix.yaml", "specs", "design-pack", "evals"]) {
    assert(!fs.existsSync(path.join(lane, removed)), `lane template ${removed} stays removed (on-demand)`);
  }
  const laneEntries = fs.readdirSync(lane).sort();
  assert(
    JSON.stringify(laneEntries) === JSON.stringify(["DESIGN.md", "MISSION.md", "STATE.md", "baseline-log", "lane.toml", "tasks.yaml"]),
    `lane template dir contains exactly the core set (got ${laneEntries.join(", ")})`,
  );
}

section("docs: tasks.yaml template is minimal");

{
  const tasks = read("framework/.agents/templates/lane/tasks.yaml");
  for (const field of ["id:", "title:", "milestone:", "status:", "owner:", "priority:", "approval_required:", "depends_on:", "acceptance_refs:", "evidence_required:", "evidence_produced:", "change_scope:"]) {
    assert(tasks.includes(field), `tasks template includes ${field}`);
  }
  for (const removed of ["agent_run_review", "fact_state_review", "maintenance_review", "handoff_to", "context_refs", "expected_return", "impact_tags", "deviation_log"]) {
    assert(!tasks.includes(removed), `tasks template no longer includes ${removed}`);
  }
  const lines = tasks.split(/\r?\n/).length;
  assert(lines <= 60, `tasks template stays compact (got ${lines} lines)`);
}

section("docs: BL-template ships CR delta lifecycle and framework feedback schema");

{
  const baselineTemplate = read("framework/.agents/templates/lane/baseline-log/BL-template.md");
  for (const term of [
    "Current behavior",
    "Proposed delta",
    "Affected artifacts",
    "Acceptance delta",
    "Close/archive condition",
    "Preventability review",
    "Preventable",
    "If yes, root cause",
    "Suggested guard",
    "BL-YYYYMMDD-HHMMSS-retrospective",
  ]) {
    assert(baselineTemplate.includes(term), `BL-template includes ${term}`);
  }
}

section("docs: artifacts.md declares core + on-demand split and progressive disclosure");

{
  const content = read("docs/artifacts.md");
  assert(content.includes("核心工件（默认安装）"), "artifacts.md has core artifact section");
  assert(content.includes("按需工件（默认不安装）"), "artifacts.md has on-demand artifact section");
  for (const artifact of ["risk-register.md", "release-plan.md", "verification-matrix.yaml", "specs/", "design-pack/", "evals/"]) {
    assert(content.includes(artifact), `artifacts.md documents on-demand artifact ${artifact}`);
  }
  assert(content.includes("触发"), "artifacts.md documents on-demand triggers");
  assert(content.includes("加载分层（progressive disclosure）"), "artifacts.md has progressive disclosure section");
  for (const layer of ["L1", "L2", "L3"]) {
    assert(content.includes(`**${layer} —`), `artifacts.md describes ${layer} loading tier`);
  }
  assert(content.includes("Activation Gate"), "artifacts.md documents Activation Gate");
  assert(content.includes("普通对话"), "artifacts.md excludes ordinary conversation from lane governance");
  assert(content.includes("反述确认"), "artifacts.md documents the restate-and-confirm gate");
  assert(content.includes("隐式机制"), "artifacts.md documents implicit mechanism audit placement");
  assert(content.includes("不是新默认 artifact"), "artifacts.md keeps implicit mechanism audit out of default artifacts");
  assert(content.includes("CR-YYYYMMDD-HHMMSS"), "artifacts.md documents CR naming convention");
}

section("docs: templates carry implicit mechanism audit anchors");

{
  const design = read("framework/.agents/templates/lane/DESIGN.md");
  const memory = read("framework/.agents/templates/shared-root/memory.md");

  assert(design.includes("隐式机制 / 高风险状态流审计"), "DESIGN.md includes implicit mechanism audit section");
  assert(design.includes("触发入口"), "DESIGN.md asks for implicit mechanism trigger entry");
  assert(design.includes("执行顺序"), "DESIGN.md asks for execution order");
  assert(design.includes("重复请求路径"), "DESIGN.md asks for duplicate-request path");

  for (const type of ["implicit-mechanism", "technology-profile", "high-risk-state-flow"]) {
    assert(memory.includes(type), `memory.md engineering constraint types include ${type}`);
  }
}

section("docs: activation gate keeps ordinary conversation outside lane governance");

{
  const agents = read(DISTRIBUTED_AGENTS_TEMPLATE);
  const readme = read("README.md");
  const skill = read("framework/skills/ai-os-delivery/SKILL.md");

  assert(agents.includes("delivery-affecting work"), "AGENTS.md gates on delivery-affecting work");
  assert(agents.includes("不读写 `.ai-os/lanes/*`") || agents.includes("不读取或写入"), "AGENTS.md forbids lane access for ordinary conversation");
  assert(agents.includes("用户已明确要求分析、修复、实现、验证或发布时视为已进入交付"), "AGENTS.md lets explicit delivery requests enter governance without re-asking");

  assert(readme.includes("run the Activation Gate before loading lane artifacts"), "README routes agents through Activation Gate before lane loading");
  assert(readme.includes("Just discuss / brainstorm / explain"), "README includes ordinary conversation row");
  assert(readme.includes("do not read or write lane artifacts"), "README tells agents not to touch lane artifacts for discussion");
  assert(readme.includes("if the user already asked to fix and scope is clear"), "README does not force a second go on already-authorized fixes");

  assert(skill.includes("Run the Activation Gate before reading L1"), "skill invocation contract runs gate before L1");
  assert(skill.includes("ordinary conversation"), "skill wrapper excludes ordinary conversation");
  assert(skill.includes("Explicit delivery requests"), "skill wrapper recognizes explicit delivery requests");
}

section("docs: on-demand artifacts documented consistently across surfaces");

{
  const readme = read("README.md");
  const cli = read("docs/cli.md");
  const skill = read("framework/skills/ai-os-delivery/SKILL.md");
  const gettingStarted = read("docs/getting-started.md");

  assert(readme.includes("On-demand artifacts"), "README documents on-demand artifacts");
  assert(cli.includes("on-demand"), "cli.md documents on-demand artifacts");
  assert(skill.includes("On-demand artifacts"), "skill wrapper documents on-demand artifacts");
  assert(gettingStarted.includes("created on demand"), "getting-started documents on-demand artifacts");
  for (const surface of [readme, cli, skill]) {
    assert(surface.includes("docs/artifacts.md") || surface.includes("artifacts.md"), "surface points to artifacts.md for schemas");
  }
}

section("docs: interop.md consolidates all tool coexistence guidance");

{
  const interop = read("docs/interop.md");
  for (const term of ["Cursor", "Claude Code", "Spec-Kit", "Product Design", "aios://", "A2A"]) {
    assert(interop.includes(term), `interop.md covers ${term}`);
  }
  assert(interop.includes("薄壳"), "interop.md keeps tool surfaces as thin shells");
  assert(interop.includes("doctor --strict"), "interop.md documents doctor as the cross-IDE guard");
  const lines = interop.split(/\r?\n/).length;
  assert(lines <= 120, `interop.md stays compact (got ${lines} lines)`);
}

section("docs: VERSION, package.json, and install pins are in sync");

{
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(repoRoot, "package-lock.json"), "utf8"));
  assert(version === pkg.version, `VERSION (${version}) matches package.json version (${pkg.version})`);
  assert(lock.version === pkg.version, `package-lock root version (${lock.version}) matches package.json version (${pkg.version})`);
  assert(lock.packages[""].version === pkg.version, `package-lock package version (${lock.packages[""].version}) matches package.json version (${pkg.version})`);
  assert(version === CURRENT_VERSION, `version is ${CURRENT_VERSION} (got ${version})`);

  const readme = read("README.md");
  const gettingStarted = read("docs/getting-started.md");
  assert(readme.includes(`github:royeedai/ai-os#v${CURRENT_VERSION}`), "README pins install commands to the current release tag");
  assert(gettingStarted.includes(`github:royeedai/ai-os#v${CURRENT_VERSION}`), "getting-started pins the install command");
  const changelog = read("CHANGELOG.md");
  assert(changelog.includes(CURRENT_VERSION), `CHANGELOG records ${CURRENT_VERSION}`);
}

section("docs: package.json bin field is minimal");

{
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const binKeys = Object.keys(pkg.bin || {});
  assert(binKeys.length === 1, `package.json has exactly 1 bin entry (got ${binKeys.length})`);
  assert(binKeys[0] === "create-ai-os", `package.json bin key is create-ai-os (got ${binKeys[0]})`);
  assert((pkg.files || []).includes("framework"), "package files include framework templates");
  assert(!(pkg.files || []).includes("AGENTS.md"), "package files do not ship repo maintainer AGENTS.md as the distributed constitution");
}

section("docs: product surface wording stays precise");

{
  const readme = read("README.md");
  const cli = read("docs/cli.md");

  assert(readme.includes("Two primary operations"), "README describes product operations, not command count");
  assert(readme.includes("No proprietary AI-OS skill system"), "README distinguishes proprietary skill systems from open adapters");
  assert(readme.includes("open-standard adapter"), "README describes agentskills.io wrapper as an open-standard adapter");
  assert(readme.includes("runtime runner, agent router"), "README preserves no-runtime / no-router boundary");

  assert(cli.includes("2 primary product operations"), "CLI docs describe 2 primary product operations");
  assert(cli.includes("explicit alias"), "CLI docs identify create-ai-os install as an alias");
}

section("docs: local zero-network doctor entry is documented");

{
  const readme = read("README.md");
  const cli = read("docs/cli.md");
  const gettingStarted = read("docs/getting-started.md");
  const interop = read("docs/interop.md");

  assert(readme.includes("node .ai-os/bin/ai-os-doctor.js ."), "README uses the local doctor entry");
  assert(gettingStarted.includes("node .ai-os/bin/ai-os-doctor.js ."), "getting-started uses the local doctor entry");
  assert(cli.includes("Local doctor entry"), "cli.md documents the local doctor entry section");
  assert(cli.includes(".ai-os/bin/"), "cli.md lists the committed .ai-os/bin/ entry");
  assert(interop.includes("node .ai-os/bin/ai-os-doctor.js . --strict"), "interop hooks call the local doctor entry");
  assert(/zero (external request|network)/i.test(readme), "README states the daily flow makes zero external request");
}

section("docs: maintainers guide only references existing examples");

{
  const content = read("docs/maintainers.md");
  const refs = [...content.matchAll(/`(examples\/[^`]+)`/g)].map((m) => m[1]);
  assert(refs.length >= 1, "maintainers guide lists at least one example");
  for (const rel of refs) {
    assert(fs.existsSync(path.join(repoRoot, rel)), `${rel} exists`);
  }
}

section("docs: examples contain exactly 3 scenarios and reference current pins");

{
  const examplesDir = path.join(repoRoot, "examples");
  const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith(".md") && f !== "README.md").sort();
  const expected = ["brownfield-change-journey.md", "debug-bounded-fix.md", "greenfield-guided-product.md"];
  assert(JSON.stringify(files) === JSON.stringify(expected), `examples/ has exactly 3 scenarios (got ${files.join(", ")})`);
  const readme = read("examples/README.md");
  for (const file of expected) {
    assert(readme.includes(file), `examples/README.md lists ${file}`);
  }
}

section("docs: every eval has valid frontmatter and no stale references");

{
  const evalsDir = path.join(repoRoot, "evals");
  const files = fs.readdirSync(evalsDir).filter((f) => f.endsWith(".md") && f !== "README.md");
  assert(files.length === 11, `evals/ has exactly 11 failure-mode samples (found ${files.length})`);
  const evalsReadme = read("evals/README.md");
  assert(evalsReadme.includes("implicit-mechanism-change-gate-missed.md"), "evals/README.md lists implicit mechanism change gate eval");
  for (const file of files) {
    const content = fs.readFileSync(path.join(evalsDir, file), "utf8");
    assert(content.startsWith("---\n"), `${file} starts with YAML frontmatter`);
    assert(/trigger_source:\s*(manual|promoted-from-verification-matrix)/.test(content), `${file} declares valid trigger_source`);
    for (const field of ["first_baseline_id:", "risk_source:", "failure_mode:", "harm:", "artifact_gate:"]) {
      assert(content.includes(field), `${file} declares ${field} field`);
    }
    assert(evalsReadme.includes(file), `evals/README.md lists ${file}`);
    // no references to removed doctor codes or deleted docs/templates
    for (const stale of ["W072", "W074", "W076", "W077", "W078", "docs/problem-ledger.md", "docs/constitution-spec.md", "docs/codex-aios-field-feedback.md", "framework/.agents/templates/lane/verification-matrix.yaml", "framework/.agents/templates/lane/specs", "framework/.agents/templates/lane/release-plan.md"]) {
      assert(!content.includes(stale), `${file} does not reference removed ${stale}`);
    }
  }
}

section("docs: official ai-os-delivery SKILL.md follows agentskills.io spec");

{
  const skillPath = path.join(repoRoot, "framework/skills/ai-os-delivery/SKILL.md");
  assert(fs.existsSync(skillPath), "framework/skills/ai-os-delivery/SKILL.md exists");
  const content = fs.readFileSync(skillPath, "utf8");
  assert(content.startsWith("---\n"), "SKILL.md starts with YAML frontmatter");
  const fmEnd = content.indexOf("\n---\n", 4);
  assert(fmEnd > 0, "SKILL.md frontmatter has closing ---");
  const fm = content.slice(4, fmEnd);
  const nameMatch = fm.match(/^name:\s*(\S+)\s*$/m);
  assert(nameMatch && nameMatch[1] === "ai-os-delivery", "SKILL.md name equals parent dir 'ai-os-delivery'");
  assert(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(nameMatch[1]), "SKILL.md name uses lowercase a-z, 0-9, hyphens only");
  const descMatch = fm.match(/^description:\s*(.*)$/m);
  assert(descMatch, "SKILL.md declares description");
  assert(descMatch[1].length <= 1024, `SKILL.md description <=1024 chars (got ${descMatch[1].length})`);
  const body = content.slice(fmEnd + 5);
  const bodyLines = body.split(/\r?\n/).length;
  assert(bodyLines <= 200, `SKILL.md body stays compact (got ${bodyLines} lines)`);
  assert(body.includes("Five core requirements"), "SKILL.md carries the five core requirements");
  assert(body.includes("On-demand artifacts"), "SKILL.md documents on-demand artifacts");
  assert(body.includes("Implicit mechanism change gate"), "SKILL.md documents implicit mechanism change gate");
  assert(body.includes("High-risk state flow"), "SKILL.md documents high-risk state flow");
}

section("docs: AI-OS repo does not commit lane state");

{
  assert(!fs.existsSync(path.join(repoRoot, ".ai-os")), "AI-OS repository has no committed .ai-os artifacts");
  assert(fs.existsSync(path.join(repoRoot, "framework/.agents/templates/lane/baseline-log/BL-template.md")), "install lane baseline template still exists");
  assert(fs.existsSync(path.join(repoRoot, "framework/.agents/templates/lane/tasks.yaml")), "install lane tasks template still exists");

  const readme = read("README.md");
  const maintainers = read("docs/maintainers.md");
  assert(readme.includes("does not commit its own `.ai-os/` lane state"), "README documents no repo lane state");
  assert(maintainers.includes("不提交"), "maintainers guide documents no repo lane state");
}

section("docs: framework feedback loop is documented");

{
  const agents = read(DISTRIBUTED_AGENTS_TEMPLATE);
  const maintainers = read("docs/maintainers.md");
  const issueTemplate = read(".github/ISSUE_TEMPLATE/preventable-modification.md");

  assert(agents.includes("Preventability review"), "distributed AGENTS template behavior rule mentions Preventability review");
  assert(maintainers.includes("Framework feedback 复盘"), "maintainers.md has Framework feedback 复盘 section");
  assert(maintainers.includes("framework-feedback"), "maintainers.md mentions framework-feedback issue label");
  assert(issueTemplate.includes("framework-feedback"), "issue template uses framework-feedback label");
  assert(issueTemplate.includes("Preventability review"), "issue template asks for Preventability review section");
}
