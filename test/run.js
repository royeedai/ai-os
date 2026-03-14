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

const exampleSpecTemplate = fs.readFileSync(path.join(initDir, ".ai-os", "specs", "example.spec.md"), "utf8");
assert(exampleSpecTemplate.includes("适配范围 / 支持环境"), "example spec uses support-environment wording");
assert(!exampleSpecTemplate.includes("- **兼容**"), "example spec avoids compatibility wording");

const cloneSpecTemplate = fs.readFileSync(
  path.join(initDir, ".agents", "skills", "reverse-engineer", "references", "clone-spec-template.md"),
  "utf8"
);
assert(cloneSpecTemplate.includes("## 参考来源"), "clone spec template uses reference-source section");
assert(!cloneSpecTemplate.includes("## 原型信息"), "clone spec template avoids prototype-section naming");

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
