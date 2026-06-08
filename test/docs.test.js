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
    "docs/maintainers.md",
    "docs/getting-started.md",
    "docs/reverse-spec-url-intake.md",
    "docs/problem-ledger.md",
    "docs/change-evaluation-template.md",
    "docs/interop/spec-kit-coexistence.md",
    "docs/interop/claude-code.md",
    "docs/interop/cursor.md",
    "docs/interop/mcp-resources.md",
    "docs/interop/standards-map.md",
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

section("docs: bin contains exactly 3 scripts");

{
  const binDir = path.join(repoRoot, "bin");
  const files = fs.readdirSync(binDir).sort();
  const expected = ["ai-os-doctor.js", "create-ai-os.js", "shared.js"];
  assert(JSON.stringify(files) === JSON.stringify(expected), `bin/ has exactly 3 scripts: ${files.join(", ")}`);
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
  }

  assert(spec.includes("W076"), "constitution spec cites W076 for handoff loop");
  assert(spec.includes("docs/artifacts.md"), "constitution spec defers handoff schema to artifacts.md");

  assert(matrix.includes("agent-handoff-evidence-loop"), "verification matrix includes agent handoff impact rule");
  assert(matrix.includes("FM-HANDOFF-001"), "verification matrix includes handoff failure mode");
  assert(cli.includes("W076"), "CLI docs include W076");
  assert(cli.includes("W070-W078"), "CLI docs semantic_warnings range includes W078");
  assert(skill.includes("record `evidence_produced`"), "skill wrapper tells agents to record produced evidence");
  assert(artifacts.includes("它不接管执行"), "artifacts docs keep handoff outside execution");
  const archive = read("CHANGELOG-archive.md");
  assert(archive.includes("Agent Handoff + Evidence Loop"), "CHANGELOG-archive records v9.4 handoff release");
  assert(changelog.includes("W076") || archive.includes("W076"), "CHANGELOG records W076");
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
    assert(skill.includes(term), `skill wrapper includes ${term}`);
  }

  assert(spec.includes("W077"), "constitution spec cites W077 for fact-state review");
  assert(spec.includes("fact_state_review"), "constitution spec names fact_state_review");

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
  const interop = read("docs/interop/standards-map.md");
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
    assert(skill.includes(term), `skill wrapper includes ${term}`);
    assert(interop.includes(term), `long-horizon interop includes ${term}`);
    assert(example.includes(term), `background handoff example includes ${term}`);
  }

  assert(spec.includes("W078"), "constitution spec cites W078 for long-horizon review");
  assert(baselineTemplate.includes("agent_run_review"), "baseline template explains agent_run_review");
  assert(matrix.includes("long-horizon-agent-run"), "verification matrix includes long-horizon impact rule");
  assert(matrix.includes("FM-LONGRUN-001"), "verification matrix includes orphaned background run failure mode");
  assert(matrix.includes("overlap"), "verification matrix covers overlapping write scopes");
  assert(cli.includes("W078"), "CLI docs include W078");
  assert(spec.includes("Version: 2.1"), "constitution spec bumped to v2.1");
  assert(spec.includes("docs/artifacts.md"), "constitution spec references artifacts.md as schema truth source");
  assert(spec.includes("不 ship 任何 server"), "constitution spec preserves no-runtime boundary");
  assert(readme.includes("runtime runner, agent router"), "README preserves no-runtime / no-router boundary");
  assert(readme.includes("Delegate this to a background / cloud / PR agent"), "README includes background agent routing row");
  assert(interop.includes("Codex"), "long-horizon interop covers Codex");
  assert(interop.includes("Cursor Background Agents"), "long-horizon interop covers Cursor Background Agents");
  assert(interop.includes("GitHub Copilot cloud agent"), "long-horizon interop covers GitHub Copilot cloud agent");
  assert(interop.includes("Google Jules"), "long-horizon interop covers Jules");
  assert(interop.includes("Claude Code subagents / hooks"), "long-horizon interop covers Claude Code subagents/hooks");
  assert(example.includes("doctor --strict emits W078"), "background handoff example names W078 close rule");
  assert(ledger.includes("PL-015 长时程 / 后台 agent 交付回收不可审查"), "problem ledger tracks long-horizon agent review");
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

  assert(spec.includes("Version: 2.1"), "constitution spec remains at latest v2.1");
  assert(spec.includes("Activation Gate"), "constitution spec includes Activation Gate section");
  assert(spec.includes("普通对话不得读取或写入"), "constitution spec blocks ordinary conversation from lane access");
  assert(spec.includes("确认前不加载 L1/L2/L3"), "constitution spec blocks lane loading before delivery confirmation");

  assert(skill.includes("## Activation Gate"), "skill wrapper includes Activation Gate section");
  assert(skill.includes("Run the Activation Gate before reading L1"), "skill invocation contract runs gate before L1");
  assert(skill.includes("ordinary conversation"), "skill wrapper excludes ordinary conversation");
  assert(skill.includes("do not read or write `.ai-os/lanes/*`"), "skill wrapper blocks lane artifact access for ordinary conversation");

  assert(ledger.includes("PL-014 非交付对话误触发治理"), "problem ledger tracks non-delivery misactivation");
  assert(example.includes("Does not read `.ai-os/lanes/default/STATE.md`"), "non-delivery example shows no lane read");
  assert(example.includes("现在进入实现"), "non-delivery example shows explicit transition into delivery");
  assert(changelog.includes("Activation Gate"), "CHANGELOG records activation gate release");
}

section("docs: VERSION and package.json are in sync");

{
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert(version === pkg.version, `VERSION (${version}) matches package.json version (${pkg.version})`);
  assert(version === "10.1.0", `version is 10.1.0 (got ${version})`);
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

  assert(readme.includes("Two primary operations"), "README describes product operations, not command count");
  assert(readme.includes("No proprietary AI-OS skill system"), "README distinguishes proprietary skill systems from open adapters");
  assert(readme.includes("open-standard adapter"), "README describes agentskills.io wrapper as an open-standard adapter");
  assert(!readme.includes("No skill system."), "README does not imply the agentskills.io wrapper is forbidden");

  assert(cli.includes("2 primary product operations"), "CLI docs describe 2 primary product operations");
  assert(cli.includes("explicit alias"), "CLI docs identify create-ai-os install as an alias");
  assert(cli.includes("does not add a third product operation"), "CLI docs prevent install alias from becoming a third operation");

  assert(mcp.includes("does **not** ship or start an MCP server"), "MCP docs preserve default serverless boundary");
  assert(mcp.includes("Illustrative reference snippet"), "MCP docs describe the Node sample as an illustrative snippet");
  assert(mcp.includes("not a packaged AI-OS server"), "MCP docs clarify the sample is not shipped runtime surface");
  assert(!mcp.includes("Reference implementation"), "MCP docs avoid implying a packaged reference implementation");
  assert(!mcp.includes("reference MCP server"), "MCP docs avoid implying a shipped reference MCP server");

  const archive = read("CHANGELOG-archive.md");
  assert(changelog.includes("three primary product operations") || archive.includes("three primary product operations"), "CHANGELOG uses primary product operation wording");
  assert(changelog.includes("open-standard adapter") || archive.includes("open-standard adapter"), "CHANGELOG records skill wrapper wording");
  assert(changelog.includes("illustrative reference snippet") || archive.includes("illustrative reference snippet"), "CHANGELOG records MCP snippet wording");
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

section("docs: interop folder has core docs plus consolidated standards-map");

{
  const required = [
    "docs/interop/spec-kit-coexistence.md",
    "docs/interop/claude-code.md",
    "docs/interop/cursor.md",
    "docs/interop/mcp-resources.md",
    "docs/interop/standards-map.md",
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

section("docs: standards-map consolidates open-standard wire formats");

{
  const map = read("docs/interop/standards-map.md");
  const readme = read("README.md");

  for (const field of [
    "handoff_to",
    "context_refs",
    "expected_return",
    "evidence_produced",
    "fact_state_review",
    "agent_run_review",
    "execution_surface",
  ]) {
    assert(map.includes(field), `standards-map.md maps ${field}`);
  }

  for (const term of [
    "A2A",
    "Memory tool",
    "BMAD-METHOD",
    "OpenSpec",
    "Kiro",
    "EU AI Act",
    "Anti-patterns",
    "W076",
    "W078",
  ]) {
    assert(map.includes(term), `standards-map.md references ${term}`);
  }

  assert(map.includes("does **not** ship"), "standards-map.md preserves no-runtime boundary");
  assert(map.includes("2 primary product operations"), "standards-map.md restates 2-primary-operation surface");
  assert(map.includes("mcp-resources.md"), "standards-map.md links to mcp-resources.md");
  assert(map.includes("Read-only mount"), "standards-map.md mandates read-only Memory mount");

  assert(readme.includes("Open standards map"), "README documents Open standards map section");
  assert(readme.includes("docs/interop/standards-map.md"), "README links to standards-map.md");
}

section("docs: deterministic-guard narrative aligns doctor with cross-IDE hooks");

{
  const readme = read("README.md");
  const claude = read("docs/interop/claude-code.md");

  assert(readme.includes("Why deterministic"), "README adds deterministic-guard narrative section");
  assert(readme.includes("W070-W078"), "README narrative cites the W070-W078 doctor warning range");
  assert(readme.includes("`pre-tool-use`") || readme.includes("pre-tool-use"), "README narrative shows Claude Code pre-tool-use mapping");
  assert(readme.includes("45427") || readme.includes("RFC #45427"), "README narrative cites the 2026 hooks-vs-prompts RFC");
  assert(readme.includes("doctor . --strict") || readme.includes("doctor --strict"), "README narrative uses doctor --strict invocation");

  assert(claude.includes("Doctor as cross-IDE deterministic guard"), "claude-code.md adds doctor-as-deterministic-guard section");
  assert(claude.includes("subagent bypass") || claude.includes("hook-bypass"), "claude-code.md surfaces 2026 hook-bypass failure modes");
  assert(claude.includes("W070-W078"), "claude-code.md cites the W070-W078 doctor warning range");
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
  assert(cursor.includes("standards-map.md"), "cursor.md links to standards-map.md for non-Cursor delegation");
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
    "Doctor as cross-IDE deterministic guard",
    "Cursor 2.0+ subagents",
    "trajectory_signature",
  ]) {
    assert(changelog.includes(ref), `CHANGELOG 9.5.2 mentions ${ref}`);
  }
}

section("docs: framework feedback loop is documented and templated (v9.7)");

{
  const baselineTemplate = read("framework/.agents/templates/lane/baseline-log/BL-template.md");
  const agents = read("AGENTS.md");
  const artifacts = read("docs/artifacts.md");
  const spec = read("docs/constitution-spec.md");
  const cli = read("docs/cli.md");
  const maintainers = read("docs/maintainers.md");
  const ledger = read("docs/problem-ledger.md");
  const issueTemplate = read(".github/ISSUE_TEMPLATE/preventable-modification.md");
  const changelog = read("CHANGELOG.md");

  for (const term of [
    "Preventability review",
    "Preventable",
    "If yes, root cause",
    "Maps to",
    "Suggested guard",
    "BL-YYYYMMDD-HHMMSS-retrospective",
  ]) {
    assert(baselineTemplate.includes(term), `BL-template includes ${term}`);
  }

  assert(agents.includes("Preventability review"), "AGENTS.md behavior rule mentions Preventability review");
  assert(agents.includes("retrospective"), "AGENTS.md behavior rule mentions retrospective aggregation");
  assert(read("framework/skills/ai-os-delivery/SKILL.md").includes("Preventability review"), "skill wrapper routes CR Preventability review before close");

  assert(artifacts.includes("Framework Feedback Loop"), "artifacts.md documents Framework Feedback Loop section");
  assert(artifacts.includes("Preventability review"), "artifacts.md describes Preventability review schema");
  assert(!artifacts.includes("W079a"), "artifacts.md no longer cites removed W079a doctor check");

  assert(spec.includes("Framework feedback loop"), "constitution-spec.md references Framework feedback loop");
  assert(spec.includes("Version: 2.1"), "constitution-spec.md is at v2.1");
  assert(spec.includes("docs/artifacts.md"), "constitution-spec.md points to artifacts.md for schema");

  assert(!cli.includes("W079a"), "cli.md no longer documents removed W079a");
  assert(cli.includes("W070-W078"), "cli.md still scopes semantic_warnings to W070-W078");

  assert(maintainers.includes("Framework feedback 复盘"), "maintainers.md adds Framework feedback 复盘 section");
  assert(maintainers.includes("Framework feedback loop"), "maintainers.md release matrix lists Framework feedback loop");
  assert(maintainers.includes("Preventable: yes"), "maintainers.md shows git grep example for Preventable: yes");
  assert(maintainers.includes("framework-feedback"), "maintainers.md mentions framework-feedback issue label");

  assert(ledger.includes("PL-012"), "problem-ledger.md registers PL-012");
  assert(ledger.includes("Preventability review"), "PL-012 uses Preventability review vocabulary");

  assert(issueTemplate, ".github/ISSUE_TEMPLATE/preventable-modification.md exists");
  assert(issueTemplate.includes("framework-feedback"), "issue template uses framework-feedback label");
  assert(issueTemplate.includes("Preventability review"), "issue template asks for Preventability review section");

  assert(changelog.includes("9.7.0"), "CHANGELOG records 9.7.0");
  assert(changelog.includes("Framework feedback loop") || changelog.includes("Framework Feedback Loop"), "CHANGELOG names the v9.7 release theme");
  assert(changelog.includes("9.7.0") || changelog.includes("Framework feedback"), "CHANGELOG records framework feedback release");
  assert(changelog.includes("PL-012"), "CHANGELOG references PL-012");
}

section("docs: AI-OS self-hosted lane carries Preventability review on every historical CR");

{
  const baselineDir = path.join(repoRoot, ".ai-os", "lanes", "default", "baseline-log");
  const files = fs.readdirSync(baselineDir).filter((n) => /^CR-\d{8}-\d{6}-.*\.md$/.test(n));
  assert(files.length >= 6, `at least 6 historical CRs exist (got ${files.length})`);
  for (const file of files) {
    const content = fs.readFileSync(path.join(baselineDir, file), "utf8");
    assert(/^##\s+Preventability\s+review\s*$/im.test(content), `${file} has ## Preventability review section`);
    assert(/Preventable\*{0,2}:\s*\*{0,2}(yes|no|partial)/.test(content), `${file} declares Preventable: yes/no/partial`);
    assert(/Maps to\*{0,2}:/.test(content), `${file} declares Maps to:`);
  }

  const retrospectiveFiles = fs.readdirSync(baselineDir).filter((n) => /^BL-\d{8}-\d{6}-.*retrospective.*\.md$/i.test(n));
  assert(retrospectiveFiles.length >= 1, `at least one retrospective baseline-log exists (got ${retrospectiveFiles.length})`);
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

section("docs: v9.8 content slimming narrative and removed legacy paths");

{
  const purpose = read("PROJECT_PURPOSE.md");
  const readme = read("README.md");
  const changelog = read("CHANGELOG.md");
  const spec = read("docs/constitution-spec.md");

  assert(purpose.includes("GPT-5.5"), "PROJECT_PURPOSE cites GPT-5.5 era");
  assert(purpose.includes("Opus 4.8"), "PROJECT_PURPOSE cites Opus 4.8 era");
  assert(purpose.includes("脚手架层越该收敛"), "PROJECT_PURPOSE argues scaffolding should converge");

  assert(readme.includes("GPT-5.5"), "README cites GPT-5.5 era positioning");
  assert(readme.includes("standards-map.md"), "README links to standards-map");

  assert(changelog.includes("9.8.0"), "CHANGELOG records 9.8.0");
  assert(changelog.includes("Content slimming"), "CHANGELOG names v9.8 content slimming theme");
  assert(changelog.includes("standards-map.md"), "CHANGELOG references standards-map");

  assert(spec.split(/\r?\n/).length <= 160, `constitution-spec.md slimmed (got ${spec.split(/\r?\n/).length} lines)`);
  assert(!fs.existsSync(path.join(repoRoot, "docs/migrate-v7-to-v8.md")), "migrate-v7-to-v8 stub removed");
  assert(!fs.existsSync(path.join(repoRoot, "docs/problems.md")), "problems.md duplicate removed");
  assert(!fs.existsSync(path.join(repoRoot, "docs/interop/a2a.md")), "a2a.md merged into standards-map");
  assert(!fs.existsSync(path.join(repoRoot, "docs/migrate-to-v9.md")), "migrate-to-v9 removed in v10 (upgrade command dropped)");
}

section("docs: v10.1 restate-confirm gate + architecture guardrail");

{
  const agents = read("AGENTS.md");
  const laneMission = read("framework/.agents/templates/lane/MISSION.md");
  const design = read("framework/.agents/templates/lane/DESIGN.md");
  const memory = read("framework/.agents/templates/shared-root/memory.md");
  const artifacts = read("docs/artifacts.md");
  const spec = read("docs/constitution-spec.md");
  const map = read("docs/interop/standards-map.md");
  const ledger = read("docs/problem-ledger.md");
  const example = read("examples/greenfield-guided-product.md");

  assert(agents.includes("反述"), "AGENTS.md introduces the restate-and-confirm gate");
  assert(agents.includes("结构化方式反述"), "AGENTS.md §1 requires structured restatement before lock/implementation");
  assert(agents.includes("架构护栏"), "AGENTS.md verification rule cross-checks memory architecture guardrails");

  assert(laneMission.includes("核心主流程（步骤化反述）"), "lane MISSION template has a restated core-main-flow field");
  assert(laneMission.includes("关键异常 / 边界分支"), "lane MISSION template has a key exception / boundary branch field");
  assert(design.includes("契约层"), "DESIGN template names section 4 as the contract layer");
  assert(design.includes("反述确认门"), "DESIGN template section 9 is the restate-and-confirm gate");

  assert(memory.includes("架构护栏 / 编码契约登记表"), "memory template names section 2 as the architecture guardrail registry");
  assert(memory.includes("return-contract"), "memory guardrail registry carries a type field");
  assert(!fs.existsSync(path.join(repoRoot, ".ai-os-rules")), "no second-truth-source .ai-os-rules file is introduced");

  assert(artifacts.includes("反述确认 / 双向对齐门"), "artifacts.md documents the restate-and-confirm / double-loop gate");
  assert(artifacts.includes("不引入 doctor warning code"), "artifacts.md keeps the restate gate as a behavior gate, not a doctor code");
  assert(spec.includes("反述确认门（v2.1）"), "constitution spec v2.1 names the restate-and-confirm gate");
  assert(map.includes("Architecture style guide"), "standards-map maps an external style guide onto memory section 2");
  assert(map.includes("second truth-source"), "standards-map keeps memory section 2 as the single guardrail truth source");

  assert(ledger.includes("§1 反述确认门"), "problem-ledger PL-001 anchors the restate-confirm gate");
  assert(!ledger.includes("PL-020"), "no new problem-ledger id is introduced for v10.1");

  assert(example.includes("Restate-and-confirm gate"), "greenfield example demonstrates the restate-and-confirm gate");

  const exampleFiles = fs.readdirSync(path.join(repoRoot, "examples")).filter((f) => f.endsWith(".md") && f !== "README.md");
  assert(exampleFiles.length === 8, `examples stay at 8 excluding README (got ${exampleFiles.length})`);
}
