#!/usr/bin/env node

/**
 * Documentation / constitution consistency checks.
 */

const fs = require("fs");
const path = require("path");
const { assert, repoRoot, section } = require("./helpers");

section("docs: AGENTS.md exists and is within 150 lines");

{
  const p = path.join(repoRoot, "AGENTS.md");
  assert(fs.existsSync(p), "AGENTS.md exists at repo root");
  const content = fs.readFileSync(p, "utf8");
  const lines = content.split(/\r?\n/).length;
  assert(lines <= 150, `AGENTS.md within 150 lines (got ${lines})`);
  assert(content.includes("五条核心要求"), "AGENTS.md contains 'five core requirements' section");
  assert(content.includes("绝对禁止"), "AGENTS.md contains 'absolute prohibitions' section");
  assert(content.includes("12 组工件"), "AGENTS.md references the 12-artifact set");
}

section("docs: key documentation files exist");

{
  const docs = [
    "PROJECT_PURPOSE.md",
    "README.md",
    "docs/artifacts.md",
    "docs/cli.md",
    "docs/constitution-spec.md",
    "docs/migrate-v7-to-v8.md",
    "docs/maintainers.md",
    "docs/getting-started.md",
    "docs/problems.md",
    "docs/problem-ledger.md",
    "docs/change-evaluation-template.md",
    "docs/interop/spec-kit-coexistence.md",
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

section("docs: obsolete v7 files removed");

{
  const obsolete = [
    "framework/AGENTS.md",
    "framework/.agents/workflows",
    "framework/.agents/skills",
    "framework/.agents/policies",
    "framework/.agents/references",
    "manifests",
    "docs/workflows.md",
    "docs/skill-tiers.md",
    "docs/ai-os-v2-customization-guide.md",
    "docs/evolution",
    "bin/ai-os-plan.js",
    "bin/ai-os-validate.js",
    "bin/ai-os-gate.js",
    "bin/ai-os-lane.js",
    "bin/ai-os-status.js",
    "bin/ai-os-next.js",
    "bin/ai-os-resume.js",
    "bin/ai-os-release-check.js",
    "bin/ai-os-skill-check.js",
    "bin/ai-os-token-budget.js",
    "bin/ai-os-cursor-rules.js",
    "bin/ai-os-lab.js",
    "bin/ai-os-diff.js",
    "bin/project-state.js",
  ];
  for (const rel of obsolete) {
    assert(!fs.existsSync(path.join(repoRoot, rel)), `${rel} does not exist (v7 cleanup)`);
  }
}

section("docs: bin contains exactly 4 scripts");

{
  const binDir = path.join(repoRoot, "bin");
  const files = fs.readdirSync(binDir).sort();
  const expected = ["ai-os-doctor.js", "ai-os-upgrade.js", "create-ai-os.js", "shared.js"];
  assert(JSON.stringify(files) === JSON.stringify(expected), `bin/ has exactly 4 scripts: ${files.join(", ")}`);
}

section("docs: framework templates contain 12-artifact starters");

{
  const tpl = path.join(repoRoot, "framework/.agents/templates/project");
  const required = ["MISSION.md", "DESIGN.md", "STATE.md", "memory.md", "tasks.yaml", "risk-register.md", "release-plan.md", "verification-matrix.yaml"];
  for (const f of required) {
    assert(fs.existsSync(path.join(tpl, f)), `template ${f} exists`);
  }
  assert(fs.existsSync(path.join(tpl, "baseline-log", "BL-template.md")), "baseline-log template exists");
  assert(fs.existsSync(path.join(tpl, "specs", "example.spec.md")), "specs example template exists");
  assert(fs.existsSync(path.join(tpl, "design-pack", "parity-map.md")), "design-pack parity-map template exists");
}

section("docs: VERSION and package.json are in sync");

{
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert(version === pkg.version, `VERSION (${version}) matches package.json version (${pkg.version})`);
  assert(version === "8.0.0", `version is 8.0.0 (got ${version})`);
}

section("docs: package.json bin field is minimal");

{
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const binKeys = Object.keys(pkg.bin || {});
  assert(binKeys.length === 1, `package.json has exactly 1 bin entry (got ${binKeys.length})`);
  assert(binKeys[0] === "create-ai-os", `package.json bin key is create-ai-os (got ${binKeys[0]})`);
}
