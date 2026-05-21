#!/usr/bin/env node

/**
 * Documentation / constitution consistency checks for v9.
 */

const fs = require("fs");
const path = require("path");
const { assert, repoRoot, section } = require("./helpers");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

section("docs: AGENTS.md exists and is within 150 lines");

{
  const p = path.join(repoRoot, "AGENTS.md");
  assert(fs.existsSync(p), "AGENTS.md exists at repo root");
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split(/\r?\n/).length;
  assert(lines <= 150, `AGENTS.md within 150 lines (got ${lines})`);
  assert(content.includes("五条核心要求"), "AGENTS.md contains 'five core requirements' section");
  assert(content.includes("绝对禁止"), "AGENTS.md contains 'absolute prohibitions' section");
  assert(content.includes(".ai-os/lanes/default/MISSION.md"), "AGENTS.md references lane mission");
}

section("docs: key documentation files exist");

{
  const docs = [
    "PROJECT_PURPOSE.md",
    "README.md",
    "docs/artifacts.md",
    "docs/cli.md",
    "docs/constitution-spec.md",
    "docs/migrate-to-v9.md",
    "docs/migrate-v7-to-v8.md",
    "docs/maintainers.md",
    "docs/getting-started.md",
    "docs/reverse-spec-url-intake.md",
    "docs/problems.md",
    "docs/problem-ledger.md",
    "docs/change-evaluation-template.md",
    "docs/interop/spec-kit-coexistence.md",
    "docs/interop/claude-code.md",
    "docs/interop/cursor.md",
    "docs/interop/kiro.md",
    "docs/interop/openspec.md",
    "docs/interop/mcp-resources.md",
    "docs/interop/eu-ai-act.md",
    "docs/interop/a2a.md",
    "docs/interop/memory-tool.md",
    "docs/interop/bmad.md",
    "docs/interop/long-horizon-agents.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "VERSION",
    "package.json",
  ];
  for (const rel of docs) {
    assert(fs.existsSync(path.join(repoRoot, rel)), `${rel} exists`);
  }
}

section("docs: default layout narrative is consistent");

{
  const files = [
    "README.md",
    "docs/artifacts.md",
    "docs/constitution-spec.md",
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

section("docs: bin contains exactly 4 scripts");

{
  const binDir = path.join(repoRoot, "bin");
  const files = fs.readdirSync(binDir).sort();
  const expected = ["ai-os-doctor.js", "ai-os-upgrade.js", "create-ai-os.js", "shared.js"];
  assert(JSON.stringify(files) === JSON.stringify(expected), `bin/ has exactly 4 scripts: ${files.join(", ")}`);
}

section("docs: framework templates contain shared-root and lane starters");

{
  const sharedRoot = path.join(repoRoot, "framework/.agents/templates/shared-root");
  const lane = path.join(repoRoot, "framework/.agents/templates/lane");
  const sharedRequired = ["MISSION.md", "memory.md"];
  const laneRequired = ["lane.toml", "MISSION.md", "DESIGN.md", "STATE.md", "tasks.yaml", "risk-register.md", "release-plan.md", "verification-matrix.yaml"];
  for (const file of sharedRequired) {
    assert(fs.existsSync(path.join(sharedRoot, file)), `shared-root template ${file} exists`);
  }
  for (const file of laneRequired) {
    assert(fs.existsSync(path.join(lane, file)), `lane template ${file} exists`);
  }
  assert(fs.existsSync(path.join(lane, "baseline-log", "BL-template.md")), "lane baseline-log template exists");
  assert(fs.existsSync(path.join(lane, "specs", "example.spec.md")), "lane spec template exists");
  assert(fs.existsSync(path.join(lane, "design-pack", "parity-map.md")), "lane design-pack template exists");
}

section("docs: URL reverse-spec intake protocol is documented");

{
  const intake = read("docs/reverse-spec-url-intake.md");
  const requiredTerms = [
    "1440px",
    "768px",
    "390px",
    "DOM topology",
    "Computed CSS",
    "Network/API",
    "Evidence Package Adaptation Matrix",
    "trace.zip",
    "network log / HAR",
    "DOM snapshots",
    "rawHtml",
    "structured JSON",
    "Must redact",
    "API Observation Record",
    "Backend Behavior Record",
    "observed",
    "inferred",
    "unknown",
  ];
  for (const term of requiredTerms) {
    assert(intake.includes(term), `reverse-spec intake doc includes ${term}`);
  }
  assert(intake.includes("AI-OS does not run the browser"), "reverse-spec intake doc preserves no-runtime boundary");
}

section("docs: URL reverse-spec fields are present in lane templates");

{
  const spec = read("framework/.agents/templates/lane/specs/example.spec.md");
  const bugfixSpec = read("framework/.agents/templates/lane/specs/bugfix.spec.md");
  const baselineTemplate = read("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const parity = read("framework/.agents/templates/lane/design-pack/parity-map.md");
  const matrix = read("framework/.agents/templates/lane/verification-matrix.yaml");

  for (const term of [
    "Spec route",
    "Reverse-spec evidence sources",
    "Evidence package adaptation",
    "trace.zip",
    "API observation records",
    "Backend behavior records",
    "auth_signal",
    "evidence_source",
    "implementation_requirement",
    "observed / inferred / unknown",
  ]) {
    assert(spec.includes(term), `example spec includes ${term}`);
  }

  for (const term of [
    "Bugfix Spec",
    "Root cause",
    "Reproduction",
    "Blast radius",
    "Planned files",
    "Regression guard",
    "Code status",
    "Data status",
    "Runtime status",
  ]) {
    assert(bugfixSpec.toLowerCase().includes(term.toLowerCase()), `bugfix spec includes ${term}`);
  }

  for (const term of [
    "Current behavior",
    "Proposed delta",
    "Affected artifacts",
    "Acceptance delta",
    "Close/archive condition",
  ]) {
    assert(baselineTemplate.includes(term), `baseline template includes CR delta field ${term}`);
  }

  for (const term of [
    "URL reverse-spec capture manifest",
    "Evidence package adaptation matrix",
    "Visual parity",
    "Interaction parity",
    "API / interface parity",
    "Backend behavior parity",
    "Error paths",
    "Confidence",
  ]) {
    assert(parity.includes(term), `parity-map template includes ${term}`);
  }

  assert(matrix.includes("url-reverse-spec-intake"), "verification matrix includes URL reverse-spec impact rule");
  assert(matrix.includes("Network/API observation review"), "verification matrix includes Network/API guard");
  assert(matrix.includes("backend behavior confidence review"), "verification matrix includes backend behavior confidence guard");
  assert(matrix.includes("evidence package redaction + confidence review"), "verification matrix includes evidence package guard");
}

section("docs: agent handoff evidence loop fields are documented and templated");

{
  const tasks = read("framework/.agents/templates/lane/tasks.yaml");
  const baselineTemplate = read("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const matrix = read("framework/.agents/templates/lane/verification-matrix.yaml");
  const artifacts = read("docs/artifacts.md");
  const spec = read("docs/constitution-spec.md");
  const cli = read("docs/cli.md");
  const skill = read("framework/skills/ai-os-delivery/SKILL.md");
  const changelog = read("CHANGELOG.md");

  for (const term of [
    "handoff_to",
    "context_refs",
    "expected_return",
    "evidence_produced",
    "deviation_log",
  ]) {
    assert(tasks.includes(term), `tasks template includes ${term}`);
    assert(baselineTemplate.includes(term), `baseline template explains ${term}`);
    assert(artifacts.includes(term), `artifacts docs include ${term}`);
    assert(spec.includes(term), `constitution spec includes ${term}`);
  }

  assert(matrix.includes("agent-handoff-evidence-loop"), "verification matrix includes agent handoff impact rule");
  assert(matrix.includes("FM-HANDOFF-001"), "verification matrix includes handoff failure mode");
  assert(cli.includes("W076"), "CLI docs include W076");
  assert(cli.includes("W070-W078"), "CLI docs semantic_warnings range includes W078");
  assert(skill.includes("record `evidence_produced`"), "skill wrapper tells agents to record produced evidence");
  assert(artifacts.includes("它不接管执行"), "artifacts docs keep handoff outside execution");
  assert(spec.includes("不是执行层"), "constitution spec keeps handoff outside execution");
  assert(spec.includes("agent runner"), "constitution spec explicitly excludes runner surface");
  assert(changelog.includes("Agent Handoff + Evidence Loop"), "CHANGELOG records v9.4 handoff release");
  assert(changelog.includes("W076"), "CHANGELOG records W076");
}

section("docs: hallucination guard fact-state vocabulary is documented and checked");

{
  const agents = read("AGENTS.md");
  const tasks = read("framework/.agents/templates/lane/tasks.yaml");
  const baselineTemplate = read("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const matrix = read("framework/.agents/templates/lane/verification-matrix.yaml");
  const artifacts = read("docs/artifacts.md");
  const spec = read("docs/constitution-spec.md");
  const cli = read("docs/cli.md");
  const skill = read("framework/skills/ai-os-delivery/SKILL.md");
  const changelog = read("CHANGELOG.md");

  for (const term of [
    "fact_state_review",
    "observed",
    "confirmed",
    "inferred",
    "unknown",
  ]) {
    assert(tasks.includes(term), `tasks template includes ${term}`);
    assert(baselineTemplate.includes(term), `baseline template explains ${term}`);
    assert(artifacts.includes(term), `artifacts docs include ${term}`);
    assert(spec.includes(term), `constitution spec includes ${term}`);
    assert(skill.includes(term), `skill wrapper includes ${term}`);
  }

  assert(agents.includes("未观察、未确认、未验证"), "AGENTS.md blocks unverified facts from being presented as facts");
  assert(matrix.includes("hallucination-guard"), "verification matrix includes hallucination guard impact rule");
  assert(matrix.includes("FM-HALLUCINATION-001"), "verification matrix includes hallucination failure mode");
  assert(cli.includes("W077"), "CLI docs include W077");
  assert(changelog.includes("Hallucination Guard"), "CHANGELOG records hallucination guard release");
  assert(changelog.includes("W077"), "CHANGELOG records W077");
}

section("docs: v9.4/v9.5 governance closure tracked in ledger, maintainers guide, and evals");

{
  const ledger = read("docs/problem-ledger.md");
  assert(ledger.includes("PL-010"), "problem-ledger.md registers PL-010 (handoff evidence not returned)");
  assert(ledger.includes("PL-011"), "problem-ledger.md registers PL-011 (inferred treated as fact)");
  assert(ledger.includes("fact_state_review"), "problem-ledger.md PL-011 uses fact_state_review vocabulary");
  assert(ledger.includes("evidence_produced"), "problem-ledger.md PL-010 uses evidence_produced vocabulary");

  const maintainers = read("docs/maintainers.md");
  assert(maintainers.includes("v9 minor release 能力对照"), "maintainers.md has v9 minor release matrix");
  assert(maintainers.includes("发布前检查清单（公开口径）"), "maintainers.md has public-facing release checklist");
  assert(maintainers.includes("Hallucination guard"), "maintainers.md mentions hallucination guard");
  assert(maintainers.includes("Agent handoff + evidence loop"), "maintainers.md mentions agent handoff + evidence loop");
  assert(maintainers.includes("URL reverse-spec intake"), "maintainers.md mentions URL reverse-spec intake");
  assert(maintainers.includes("External learning fusion"), "maintainers.md mentions external learning fusion");
  assert(maintainers.includes("git tag -a vX.Y.Z"), "maintainers.md release checklist mentions git tag step");

  const evalsReadme = read("evals/README.md");
  assert(evalsReadme.includes("task-handoff-evidence-not-returned.md"), "evals/README.md lists handoff eval");
  assert(evalsReadme.includes("inferred-treated-as-fact-into-execution.md"), "evals/README.md lists fact-state eval");
  assert(evalsReadme.includes("Cross-cutting: Fact-state explicitness"), "evals/README.md groups fact-state evals");

  const handoffEval = read("evals/task-handoff-evidence-not-returned.md");
  assert(/trigger_source:\s*manual/.test(handoffEval), "handoff eval uses manual trigger_source");
  assert(handoffEval.includes("CR-20260502-224147-agent-handoff-evidence-loop"), "handoff eval references its baseline CR");
  assert(handoffEval.includes("evidence_produced"), "handoff eval requires evidence_produced field");
  assert(handoffEval.includes("W076"), "handoff eval references W076 doctor warning");

  const factEval = read("evals/inferred-treated-as-fact-into-execution.md");
  assert(/trigger_source:\s*manual/.test(factEval), "fact-state eval uses manual trigger_source");
  assert(factEval.includes("CR-20260507-092708-hallucination-guard"), "fact-state eval references its baseline CR");
  assert(factEval.includes("fact_state_review"), "fact-state eval requires fact_state_review");
  assert(factEval.includes("W077"), "fact-state eval references W077 doctor warning");
}

section("docs: long-horizon agent review is documented and checked");

{
  const tasks = read("framework/.agents/templates/lane/tasks.yaml");
  const baselineTemplate = read("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const matrix = read("framework/.agents/templates/lane/verification-matrix.yaml");
  const artifacts = read("docs/artifacts.md");
  const spec = read("docs/constitution-spec.md");
  const cli = read("docs/cli.md");
  const skill = read("framework/skills/ai-os-delivery/SKILL.md");
  const readme = read("README.md");
  const interop = read("docs/interop/long-horizon-agents.md");
  const example = read("examples/background-agent-handoff.md");
  const ledger = read("docs/problem-ledger.md");
  const changelog = read("CHANGELOG.md");

  for (const term of [
    "agent_run_review",
    "execution_surface",
    "run_refs",
    "write_scope",
    "progress_checkpoints",
    "return_packet",
    "human_review_status",
  ]) {
    assert(tasks.includes(term), `tasks template includes ${term}`);
    assert(artifacts.includes(term), `artifacts docs include ${term}`);
    assert(spec.includes(term), `constitution spec includes ${term}`);
    assert(skill.includes(term), `skill wrapper includes ${term}`);
    assert(interop.includes(term), `long-horizon interop includes ${term}`);
    assert(example.includes(term), `background handoff example includes ${term}`);
  }

  assert(baselineTemplate.includes("agent_run_review"), "baseline template explains agent_run_review");
  assert(matrix.includes("long-horizon-agent-run"), "verification matrix includes long-horizon impact rule");
  assert(matrix.includes("FM-LONGRUN-001"), "verification matrix includes orphaned background run failure mode");
  assert(matrix.includes("overlap"), "verification matrix covers overlapping write scopes");
  assert(cli.includes("W078"), "CLI docs include W078");
  assert(spec.includes("Version: 1.8"), "constitution spec bumped to v1.8");
  assert(spec.includes("Long-Horizon Agent Reliability Loop（v1.8）"), "constitution spec includes v1.8 section");
  assert(spec.includes("不得因此新增 CLI command"), "constitution spec preserves no-runtime boundary");
  assert(readme.includes("runtime runner, agent router"), "README preserves no-runtime / no-router boundary");
  assert(readme.includes("Delegate this to a background / cloud / PR agent"), "README includes background agent routing row");
  assert(interop.includes("Codex"), "long-horizon interop covers Codex");
  assert(interop.includes("Cursor Background Agents"), "long-horizon interop covers Cursor Background Agents");
  assert(interop.includes("GitHub Copilot cloud agent"), "long-horizon interop covers GitHub Copilot cloud agent");
  assert(interop.includes("Google Jules"), "long-horizon interop covers Jules");
  assert(interop.includes("Claude Code subagents / hooks"), "long-horizon interop covers Claude Code subagents/hooks");
  assert(example.includes("doctor --strict emits W078"), "background handoff example names W078 close rule");
  assert(ledger.includes("PL-011 长时程 / 后台 agent 交付回收不可审查"), "problem ledger tracks long-horizon agent review");
  assert(changelog.includes("Long-Horizon Agent Reliability"), "CHANGELOG records v9.6 long-horizon release");
  assert(changelog.includes("W078"), "CHANGELOG records W078");
}

section("docs: activation gate keeps ordinary conversation outside lane governance");

{
  const agents = read("AGENTS.md");
  const readme = read("README.md");
  const artifacts = read("docs/artifacts.md");
  const spec = read("docs/constitution-spec.md");
  const skill = read("framework/skills/ai-os-delivery/SKILL.md");
  const ledger = read("docs/problem-ledger.md");
  const example = read("examples/non-delivery-discussion.md");
  const changelog = read("CHANGELOG.md");

  assert(agents.includes("Activation Gate"), "AGENTS.md names Activation Gate");
  assert(agents.includes("delivery-affecting work"), "AGENTS.md gates on delivery-affecting work");
  assert(agents.includes("确认前不得读取或写入 `.ai-os/lanes/*`"), "AGENTS.md forbids lane access before activation confirmation");
  assert(agents.includes("这是先讨论，还是要进入项目交付流程？"), "AGENTS.md includes the one confirmation question");

  assert(readme.includes("run the Activation Gate before loading lane artifacts"), "README routes agents through Activation Gate before lane loading");
  assert(readme.includes("Just discuss / brainstorm / explain"), "README includes ordinary conversation row");
  assert(readme.includes("do not read or write lane artifacts"), "README tells agents not to touch lane artifacts for discussion");

  assert(artifacts.includes("Activation Gate（v9.5.1）"), "artifacts docs include Activation Gate section");
  assert(artifacts.includes("普通对话不进入 lane governance"), "artifacts docs exclude ordinary conversation from lane governance");
  assert(artifacts.includes("确认前不加载 L1 / L2 / L3 lane 工件"), "artifacts docs block progressive disclosure before confirmation");

  assert(spec.includes("Version: 1.8"), "constitution spec remains at latest v1.8");
  assert(spec.includes("Activation Gate（v1.7）"), "constitution spec includes Activation Gate section");
  assert(spec.includes("ordinary conversation"), "constitution spec changelog names ordinary conversation");
  assert(spec.includes("确认进入交付前，不加载 L1 / L2 / L3 lane 工件"), "constitution spec blocks lane loading before delivery confirmation");

  assert(skill.includes("## Activation Gate"), "skill wrapper includes Activation Gate section");
  assert(skill.includes("Run the Activation Gate before reading L1"), "skill invocation contract runs gate before L1");
  assert(skill.includes("ordinary conversation"), "skill wrapper excludes ordinary conversation");
  assert(skill.includes("do not read or write `.ai-os/lanes/*`"), "skill wrapper blocks lane artifact access for ordinary conversation");

  assert(ledger.includes("PL-010 非交付对话误触发治理"), "problem ledger tracks non-delivery misactivation");
  assert(example.includes("Does not read `.ai-os/lanes/default/STATE.md`"), "non-delivery example shows no lane read");
  assert(example.includes("现在进入实现"), "non-delivery example shows explicit transition into delivery");
  assert(changelog.includes("Activation Gate"), "CHANGELOG records activation gate release");
}

section("docs: VERSION and package.json are in sync");

{
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert(version === pkg.version, `VERSION (${version}) matches package.json version (${pkg.version})`);
  assert(version === "9.6.0", `version is 9.6.0 (got ${version})`);
}

section("docs: package.json bin field is minimal");

{
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const binKeys = Object.keys(pkg.bin || {});
  assert(binKeys.length === 1, `package.json has exactly 1 bin entry (got ${binKeys.length})`);
  assert(binKeys[0] === "create-ai-os", `package.json bin key is create-ai-os (got ${binKeys[0]})`);
}

section("docs: product surface wording stays precise");

{
  const readme = read("README.md");
  const cli = read("docs/cli.md");
  const mcp = read("docs/interop/mcp-resources.md");
  const changelog = read("CHANGELOG.md");

  assert(readme.includes("Three primary operations"), "README describes product operations, not command count");
  assert(readme.includes("No proprietary AI-OS skill system"), "README distinguishes proprietary skill systems from open adapters");
  assert(readme.includes("open-standard adapter"), "README describes agentskills.io wrapper as an open-standard adapter");
  assert(!readme.includes("No skill system."), "README does not imply the agentskills.io wrapper is forbidden");

  assert(cli.includes("3 primary product operations"), "CLI docs describe 3 primary product operations");
  assert(cli.includes("explicit alias"), "CLI docs identify create-ai-os install as an alias");
  assert(cli.includes("does not add a fourth product operation"), "CLI docs prevent install alias from becoming a fourth operation");

  assert(mcp.includes("does **not** ship or start an MCP server"), "MCP docs preserve default serverless boundary");
  assert(mcp.includes("Illustrative reference snippet"), "MCP docs describe the Node sample as an illustrative snippet");
  assert(mcp.includes("not a packaged AI-OS server"), "MCP docs clarify the sample is not shipped runtime surface");
  assert(!mcp.includes("Reference implementation"), "MCP docs avoid implying a packaged reference implementation");
  assert(!mcp.includes("reference MCP server"), "MCP docs avoid implying a shipped reference MCP server");

  assert(changelog.includes("three primary product operations"), "CHANGELOG uses primary product operation wording");
  assert(changelog.includes("open-standard adapter"), "CHANGELOG records skill wrapper wording");
  assert(changelog.includes("illustrative reference snippet"), "CHANGELOG records MCP snippet wording");
}

section("docs: maintainers guide only references existing examples");

{
  const content = read("docs/maintainers.md");
  const refs = [...content.matchAll(/`(examples\/[^`]+)`/g)].map((m) => m[1]);
  for (const rel of refs) {
    assert(fs.existsSync(path.join(repoRoot, rel)), `${rel} exists`);
  }
}

section("docs: problem-ledger current coverage only references existing files");

{
  const content = read("docs/problem-ledger.md");
  const current = content.split("## 历史归档")[0];
  const refs = [...current.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  // Session-local files are gitignored by design; doctor recreates them.
  const sessionLocalSuffixes = ["lanes/default/STATE.md"];
  for (const ref of refs) {
    if (!ref.includes("/") || ref.includes("*")) continue;
    if (sessionLocalSuffixes.some((suffix) => ref.endsWith(suffix))) continue;
    assert(fs.existsSync(path.join(repoRoot, ref)), `${ref} exists`);
  }
}

section("docs: legacy migration doc points to migrate-to-v9");

{
  const legacy = read("docs/migrate-v7-to-v8.md");
  assert(legacy.includes("migrate-to-v9.md"), "legacy migration doc points to migrate-to-v9");
}

section("docs: artifacts.md declares progressive-disclosure layers");

{
  const content = read("docs/artifacts.md");
  assert(content.includes("加载层级"), "artifacts.md declares loading layer for each artifact");
  assert(content.includes("加载分层（progressive disclosure）"), "artifacts.md has progressive disclosure section");
  for (const layer of ["L1", "L2", "L3"]) {
    assert(content.includes(`### ${layer} —`), `artifacts.md describes ${layer} loading tier`);
  }
}

section("docs: AGENTS.md declares progressive-disclosure rule");

{
  const content = read("AGENTS.md");
  assert(content.includes("L1/L2/L3"), "AGENTS.md mentions L1/L2/L3 progressive disclosure");
  assert(content.includes("trigger_source"), "AGENTS.md cites failure-mode trigger_source field");
}

section("docs: every eval has trigger_source frontmatter");

{
  const evalsDir = path.join(repoRoot, "evals");
  const files = fs.readdirSync(evalsDir).filter((f) => f.endsWith(".md") && f !== "README.md");
  assert(files.length >= 20, `evals/ has at least 20 failure-mode samples (found ${files.length})`);
  for (const file of files) {
    const content = fs.readFileSync(path.join(evalsDir, file), "utf8");
    assert(content.startsWith("---\n"), `${file} starts with YAML frontmatter`);
    assert(/trigger_source:\s*(manual|promoted-from-verification-matrix)/.test(content), `${file} declares valid trigger_source`);
    assert(content.includes("first_baseline_id:"), `${file} declares first_baseline_id field`);
    assert(content.includes("risk_source:"), `${file} declares risk_source field`);
    assert(content.includes("failure_mode:"), `${file} declares failure_mode field`);
    assert(content.includes("harm:"), `${file} declares harm field`);
    assert(content.includes("artifact_gate:"), `${file} declares artifact_gate field`);
  }
  const urlEval = read("evals/url-reverse-spec-backend-hallucination.md");
  assert(urlEval.includes("CR-20260502-204346-url-reverse-spec-intake"), "URL reverse-spec eval references its baseline CR");
  assert(urlEval.includes("API observation record"), "URL reverse-spec eval checks API observation records");
  assert(urlEval.includes("Backend behavior record"), "URL reverse-spec eval checks backend behavior records");
}

section("docs: interop folder has cross-tool coexistence docs");

{
  const required = [
    "docs/interop/spec-kit-coexistence.md",
    "docs/interop/claude-code.md",
    "docs/interop/cursor.md",
    "docs/interop/kiro.md",
    "docs/interop/openspec.md",
    "docs/interop/mcp-resources.md",
    "docs/interop/a2a.md",
    "docs/interop/memory-tool.md",
    "docs/interop/bmad.md",
    "docs/interop/long-horizon-agents.md",
  ];
  for (const rel of required) {
    const content = read(rel);
    const lines = content.split(/\r?\n/).length;
    assert(lines <= 200, `${rel} stays within 200 lines (got ${lines})`);
  }
}

section("docs: MCP resources URI scheme covers all 12 artifacts");

{
  const content = read("docs/interop/mcp-resources.md");
  const requiredUris = [
    "aios://shared/MISSION",
    "aios://shared/memory",
    "aios://shared/framework",
    "aios://shared/managed-files",
    "aios://lane/{laneId}/lane-toml",
    "aios://lane/{laneId}/MISSION",
    "aios://lane/{laneId}/DESIGN",
    "aios://lane/{laneId}/STATE",
    "aios://lane/{laneId}/tasks",
    "aios://lane/{laneId}/verification-matrix",
    "aios://lane/{laneId}/risk-register",
    "aios://lane/{laneId}/release-plan",
    "aios://lane/{laneId}/parity-map",
    "aios://lane/{laneId}/baseline-log/{id}",
    "aios://lane/{laneId}/spec/{slug}",
    "aios://lane/{laneId}/eval/{slug}",
  ];
  for (const uri of requiredUris) {
    assert(content.includes(uri), `mcp-resources.md declares ${uri}`);
  }
  assert(content.includes("Illustrative reference snippet"), "mcp-resources.md documents an illustrative reference snippet");
  assert(content.includes("lastModified"), "mcp-resources.md documents lastModified annotations");
  assert(content.includes('"subscribe": true'), "mcp-resources.md declares resource subscribe capability");
  assert(content.includes('"listChanged": true'), "mcp-resources.md declares resource listChanged capability");
}

section("docs: A2A interop maps handoff yaml fields without expanding the CLI surface");

{
  const a2a = read("docs/interop/a2a.md");
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");

  for (const field of [
    "handoff_to",
    "context_refs",
    "expected_return",
    "evidence_required",
    "evidence_produced",
    "deviation_log",
    "fact_state_review",
  ]) {
    assert(a2a.includes(field), `a2a.md maps ${field} to A2A objects`);
  }

  for (const term of [
    "Task",
    "Message",
    "AgentCard",
    "Artifact",
    "Part",
    "TaskState",
  ]) {
    assert(a2a.includes(term), `a2a.md references A2A core term ${term}`);
  }

  for (const state of [
    "submitted",
    "working",
    "input-required",
    "completed",
    "failed",
    "rejected",
  ]) {
    assert(a2a.includes(state), `a2a.md documents TaskState ${state}`);
  }

  assert(a2a.includes("aios://lane/"), "a2a.md reuses aios:// URI scheme inside A2A messages");
  assert(a2a.includes("mcp-resources.md"), "a2a.md links back to mcp-resources.md for URI scheme");
  assert(a2a.includes("does **not** ship or start an A2A server"), "a2a.md preserves no-runtime boundary for A2A");
  assert(a2a.includes("3 primary product operations"), "a2a.md restates the 3-primary-operation surface");
  assert(a2a.includes("W076"), "a2a.md routes terminal-state evidence through existing W076, not a new doctor warning");
  assert(!/W07[89]/.test(a2a) && !/W08\d/.test(a2a), "a2a.md does NOT introduce a new doctor warning code");
  assert(a2a.includes("Anti-patterns"), "a2a.md declares anti-patterns section");
  assert(a2a.includes("OAuth 2.1"), "a2a.md security note references OAuth 2.1");
  assert(a2a.includes("eu-ai-act.md"), "a2a.md security note links to eu-ai-act.md audit framing");
  assert(a2a.includes("ai-os-delivery-executor"), "a2a.md provides a minimal AgentCard example");

  assert(readme.includes("A2A integration"), "README documents A2A integration section");
  assert(readme.includes("docs/interop/a2a.md"), "README links to docs/interop/a2a.md");
  for (const term of ["MCP", "A2A", "EU AI Act"]) {
    assert(readme.includes(term), `README interop index includes ${term}`);
  }

  assert(changelog.includes("9.5.1"), "CHANGELOG records 9.5.1");
  assert(changelog.includes("A2A Interop"), "CHANGELOG names the v9.5.1 release theme");
  assert(changelog.includes("docs/interop/a2a.md"), "CHANGELOG references the new interop doc by path");
}

section("docs: Memory Tool / Memory MCP interop preserves AI-OS-as-truth boundary");

{
  const memory = read("docs/interop/memory-tool.md");
  const readme = read("README.md");

  for (const term of [
    "Memory tool",
    "Memory MCP",
    "/memories",
    "knowledge graph",
    "ZDR",
    "just-in-time",
  ]) {
    assert(memory.includes(term), `memory-tool.md references ${term}`);
  }

  assert(memory.includes("does **not** ship a Memory tool"), "memory-tool.md preserves no-runtime boundary");
  assert(memory.includes("3 primary product operations"), "memory-tool.md restates the 3-primary-operation surface");
  assert(memory.includes(".ai-os/memory.md"), "memory-tool.md anchors AI-OS memory.md as truth source");
  assert(memory.includes("STATE.md"), "memory-tool.md keeps lane STATE.md as session-local recovery anchor");
  assert(memory.includes("aios://"), "memory-tool.md reuses aios:// URI scheme inside Memory MCP");
  assert(memory.includes("mcp-resources.md"), "memory-tool.md links back to mcp-resources.md");
  assert(memory.includes("eu-ai-act.md"), "memory-tool.md security note links to eu-ai-act.md");
  assert(memory.includes("Anti-patterns"), "memory-tool.md declares anti-patterns section");
  assert(memory.includes("Read-only mount") || memory.includes("read-only mount") || memory.includes("Always read-only mount"), "memory-tool.md mandates read-only mount semantics");

  assert(readme.includes("Memory tool integration"), "README documents Memory tool integration section");
  assert(readme.includes("docs/interop/memory-tool.md"), "README links to memory-tool interop doc");
  assert(readme.includes("Memory Tool"), "README interop index lists Memory Tool");
}

section("docs: deterministic-guard narrative aligns doctor with cross-IDE hooks");

{
  const readme = read("README.md");
  const claude = read("docs/interop/claude-code.md");

  assert(readme.includes("Why deterministic"), "README adds deterministic-guard narrative section");
  assert(readme.includes("W070-W077"), "README narrative cites the W070-W077 doctor warning range");
  assert(readme.includes("`pre-tool-use`") || readme.includes("pre-tool-use"), "README narrative shows Claude Code pre-tool-use mapping");
  assert(readme.includes("45427") || readme.includes("RFC #45427"), "README narrative cites the 2026 hooks-vs-prompts RFC");
  assert(readme.includes("doctor . --strict") || readme.includes("doctor --strict"), "README narrative uses doctor --strict invocation");

  assert(claude.includes("Doctor as cross-IDE deterministic guard"), "claude-code.md adds doctor-as-deterministic-guard section");
  assert(claude.includes("subagent bypass") || claude.includes("hook-bypass"), "claude-code.md surfaces 2026 hook-bypass failure modes");
  assert(claude.includes("W070-W077"), "claude-code.md cites the W070-W077 doctor warning range");
}

section("docs: Cursor 2.0+ subagent / cloud agent fields align to v9.4 handoff");

{
  const cursor = read("docs/interop/cursor.md");

  assert(cursor.includes("Cursor 2.0+ subagents"), "cursor.md adds 2.0+ subagent / cloud agent section");
  for (const field of [
    "handoff_to",
    "context_refs",
    "expected_return",
    "evidence_produced",
    "deviation_log",
    "acceptance_refs",
  ]) {
    assert(cursor.includes(field), `cursor.md maps Cursor concept onto ${field}`);
  }
  assert(cursor.includes("worktree"), "cursor.md mentions Cursor worktree-based parallel execution");
  assert(cursor.includes("W076"), "cursor.md routes PR-without-evidence through existing W076");
  assert(cursor.includes("a2a.md"), "cursor.md links to a2a.md for non-Cursor delegation");
}

section("docs: BMAD coexistence keeps single-source-of-truth boundary");

{
  const bmad = read("docs/interop/bmad.md");
  const readme = read("README.md");

  assert(bmad.includes("BMAD-METHOD"), "bmad.md identifies the BMAD-METHOD framework");
  for (const persona of ["Analyst", "PM", "Architect", "Developer"]) {
    assert(bmad.includes(persona), `bmad.md references BMAD persona ${persona}`);
  }
  assert(bmad.includes("Mode A"), "bmad.md describes Mode A (BMAD leads, AI-OS governs)");
  assert(bmad.includes("Mode B"), "bmad.md describes Mode B (AI-OS self-contained)");
  assert(bmad.includes("doctor"), "bmad.md positions doctor as ongoing artifact-consistency guard");
  assert(bmad.includes("W076") || bmad.includes("W077"), "bmad.md ties BMAD pipeline outputs to AI-OS evidence gates");
  assert(bmad.includes("Anti-patterns"), "bmad.md declares anti-patterns section");
  assert(bmad.includes("spec-kit-coexistence.md"), "bmad.md links to spec-kit-coexistence.md for the pattern family");

  assert(readme.includes("BMAD"), "README interop index lists BMAD");
}

section("docs: trajectory_signature is opt-in and does not break existing evals");

{
  const evalsReadme = read("evals/README.md");
  assert(evalsReadme.includes("trajectory_signature"), "evals/README.md documents the optional trajectory_signature field");
  assert(evalsReadme.includes("ATBench") || evalsReadme.includes("Claw-Eval") || evalsReadme.includes("AgentRx"), "evals/README.md cites at least one trajectory-aware harness");
  assert(/optional/i.test(evalsReadme.split("trajectory_signature")[1] || ""), "evals/README.md marks trajectory_signature as optional");
  assert(/free-form|no enum/i.test(evalsReadme), "evals/README.md states trajectory_signature is free-form");

  const evalsDir = path.join(repoRoot, "evals");
  const files = fs.readdirSync(evalsDir).filter((f) => f.endsWith(".md") && f !== "README.md");
  for (const file of files) {
    const content = fs.readFileSync(path.join(evalsDir, file), "utf8");
    assert(/trigger_source:\s*(manual|promoted-from-verification-matrix)/.test(content), `${file} still has required trigger_source after trajectory_signature addition`);
  }
}

section("docs: 9.5.2 release notes cover all five open-standards expansions");

{
  const changelog = read("CHANGELOG.md");
  assert(changelog.includes("9.5.2"), "CHANGELOG records 9.5.2");
  assert(changelog.includes("Open-standards interop expansion"), "CHANGELOG names the v9.5.2 release theme");
  for (const ref of [
    "docs/interop/memory-tool.md",
    "docs/interop/bmad.md",
    "Doctor as cross-IDE deterministic guard",
    "Cursor 2.0+ subagents",
    "trajectory_signature",
  ]) {
    assert(changelog.includes(ref), `CHANGELOG 9.5.2 mentions ${ref}`);
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
  assert(!nameMatch[1].includes("--"), "SKILL.md name has no consecutive hyphens");
  assert(nameMatch[1].length <= 64, "SKILL.md name <=64 chars");
  const descMatch = fm.match(/^description:\s*(.*)$/m);
  assert(descMatch, "SKILL.md declares description");
  assert(descMatch[1].length <= 1024, `SKILL.md description <=1024 chars (got ${descMatch[1].length})`);
  const body = content.slice(fmEnd + 5);
  const bodyLines = body.split(/\r?\n/).length;
  assert(bodyLines <= 500, `SKILL.md body within 500 lines (got ${bodyLines})`);
}
