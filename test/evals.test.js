"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { AUTHORITY, TRIGGERS, readRepo } = require("./contract-fixtures");

const ROOT = path.resolve(__dirname, "..");
const REQUIRED_FIELDS = [
  "oracle_version", "framework_version", "trigger_source", "first_baseline_id",
  "risk_source", "failure_mode", "harm", "artifact_gate",
];
const OPTIONAL_FIELDS = ["trajectory_signature"];
const REQUIRED_HEADINGS = [
  "Input", "Expected decisions", "Forbidden actions", "Required artifact deltas",
  "Minimum evidence", "Framework change targets",
];
const PREFIXES = Object.freeze({
  "Expected decisions": "DECISION:",
  "Forbidden actions": "FORBID:",
  "Required artifact deltas": "DELTA:",
  "Minimum evidence": "EVIDENCE:",
  "Framework change targets": "TARGET:",
});

function parseScalar(raw) {
  const value = raw.trim();
  if (/^".*"$/.test(value)) return value.slice(1, -1);
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

function parseEval(relativePath) {
  const content = readRepo(relativePath);
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/);
  assert.ok(match, `${relativePath}: bounded frontmatter`);

  const frontmatter = Object.create(null);
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([a-z_]+):\s*(.*)$/);
    assert.ok(field, `${relativePath}: scalar frontmatter line ${line}`);
    assert.ok(!Object.hasOwn(frontmatter, field[1]), `${relativePath}: duplicate ${field[1]}`);
    assert.ok([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].includes(field[1]), `${relativePath}: unknown ${field[1]}`);
    frontmatter[field[1]] = parseScalar(field[2]);
  }

  const sections = new Map();
  const headingCounts = new Map();
  const headingPattern = /^## (.+)$/gm;
  const matches = [...match[2].matchAll(headingPattern)];
  for (let index = 0; index < matches.length; index += 1) {
    const heading = matches[index][1];
    assert.ok(REQUIRED_HEADINGS.includes(heading), `${relativePath}: unknown heading ${heading}`);
    headingCounts.set(heading, (headingCounts.get(heading) || 0) + 1);
    sections.set(heading, match[2].slice(matches[index].index + matches[index][0].length, matches[index + 1]?.index).trim());
  }

  return { content, frontmatter, headingCounts, sections };
}

function assertItems(relativePath, section, prefix) {
  for (const line of section.split("\n").filter(Boolean)) {
    assert.match(line, new RegExp(`^- ${prefix.replace(":", "\\:")} \\S`), `${relativePath}: ${prefix} item`);
  }
}

const evalFiles = fs.readdirSync(path.join(ROOT, "evals"))
  .filter((file) => file.endsWith(".md") && file !== "README.md")
  .sort()
  .map((file) => `evals/${file}`);

test("all eleven evals are strict machine-readable behavior oracles", () => {
  assert.equal(evalFiles.length, 11);
  for (const file of evalFiles) {
    const parsed = parseEval(file);
    assert.deepEqual(Object.keys(parsed.frontmatter).filter((key) => REQUIRED_FIELDS.includes(key)), REQUIRED_FIELDS, `${file}: field order`);
    for (const field of REQUIRED_FIELDS) {
      assert.ok(Object.hasOwn(parsed.frontmatter, field), `${file}: ${field}`);
      if (field !== "first_baseline_id") assert.notEqual(String(parsed.frontmatter[field]).trim(), "", `${file}: nonempty ${field}`);
    }
    assert.equal(parsed.frontmatter.oracle_version, 1, `${file}: oracle version`);
    assert.equal(parsed.frontmatter.framework_version, "11.0.0", `${file}: framework version`);
    assert.ok(["manual", "promoted-from-verification-matrix"].includes(parsed.frontmatter.trigger_source), `${file}: trigger source enum`);
    assert.equal(parsed.frontmatter.risk_source, "delivery-governance", `${file}: risk source enum`);
    assert.ok(["delivery-regression", "hidden-regression", "wrong-work", "false-completion"].includes(parsed.frontmatter.harm), `${file}: harm enum`);
    for (const heading of REQUIRED_HEADINGS) {
      assert.equal(parsed.headingCounts.get(heading), 1, `${file}: unique ${heading}`);
      assert.notEqual(parsed.sections.get(heading).trim(), "", `${file}: nonempty ${heading}`);
      if (PREFIXES[heading]) assertItems(file, parsed.sections.get(heading), PREFIXES[heading]);
    }
  }
});

test("every oracle locks the authority order and canonical on-demand triggers", () => {
  const authority = AUTHORITY.join(" > ");
  const triggers = Object.entries(TRIGGERS).map(([name, trigger]) => `${name}=${trigger}`).join(", ");
  for (const file of evalFiles) {
    const content = readRepo(file);
    assert.match(content, new RegExp(`DECISION: Authority order: ${authority.replaceAll(".", "\\.")}`), `${file}: authority`);
    assert.ok(content.includes(`DECISION: On-demand triggers: ${triggers}`), `${file}: triggers`);
  }
});

test("named oracle corrections preserve the intended governance behavior", () => {
  const release = readRepo("evals/release-truth-drift.md");
  assert.match(release, /DECISION: Create `release-plan\.md` because the input contains explicit release intent/);

  const feature = readRepo("evals/feature-visible-but-unusable.md");
  assert.match(feature, /DELTA: none — `specs\/` is not required unless split-local-contracts is triggered/);

  const debug = readRepo("evals/debug-overreach-regression.md");
  assert.match(debug, /DECISION: Treat the explicit bounded fix request as authorization to continue/);

  const inferred = readRepo("evals/inferred-treated-as-fact-into-execution.md");
  assert.match(inferred, /EVIDENCE: Every material claim is marked observed, inferred, or unknown/);

  for (const file of ["evals/implicit-mechanism-change-gate-missed.md", "evals/release-truth-drift.md"]) {
    assert.match(readRepo(file), /EVIDENCE: Structured human approval binds the current baseline/, `${file}: G2 approval`);
  }
});
