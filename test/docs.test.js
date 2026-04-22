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

section("docs: VERSION and package.json are in sync");

{
  const version = fs.readFileSync(path.join(repoRoot, "VERSION"), "utf8").trim();
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert(version === pkg.version, `VERSION (${version}) matches package.json version (${pkg.version})`);
  assert(version === "9.0.0", `version is 9.0.0 (got ${version})`);
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
  for (const ref of refs) {
    if (!ref.includes("/") || ref.includes("*")) continue;
    assert(fs.existsSync(path.join(repoRoot, ref)), `${ref} exists`);
  }
}

section("docs: legacy migration doc points to migrate-to-v9");

{
  const legacy = read("docs/migrate-v7-to-v8.md");
  assert(legacy.includes("migrate-to-v9.md"), "legacy migration doc points to migrate-to-v9");
}
