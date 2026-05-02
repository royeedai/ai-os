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
  const parity = read("framework/.agents/templates/lane/design-pack/parity-map.md");
  const matrix = read("framework/.agents/templates/lane/verification-matrix.yaml");

  for (const term of [
    "Reverse-spec evidence sources",
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
    "URL reverse-spec capture manifest",
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
}

section("docs: VERSION and package.json are in sync");

{
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert(version === pkg.version, `VERSION (${version}) matches package.json version (${pkg.version})`);
  assert(version === "9.2.0", `version is 9.2.0 (got ${version})`);
}

section("docs: package.json bin field is minimal");

{
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const binKeys = Object.keys(pkg.bin || {});
  assert(binKeys.length === 1, `package.json has exactly 1 bin entry (got ${binKeys.length})`);
  assert(binKeys[0] === "create-ai-os", `package.json bin key is create-ai-os (got ${binKeys[0]})`);
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
  assert(content.includes("Reference implementation"), "mcp-resources.md ships a reference implementation block");
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
