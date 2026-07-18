"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const EVAL_ROOT = path.join(ROOT, "evals");
const SCENARIOS = [
  "goal-and-ambiguity.md",
  "high-risk-confirmation.md",
  "low-risk-execution.md",
  "verification-and-status.md",
];
const HEADINGS = ["Prompt", "Expected behavior", "Must not do"];

function read(relativePath) {
  return fs.readFileSync(path.join(EVAL_ROOT, relativePath), "utf8");
}

function section(content, heading, nextHeading) {
  const start = content.indexOf(`## ${heading}\n`);
  assert.notEqual(start, -1, `${heading} heading exists`);
  const bodyStart = start + `## ${heading}\n`.length;
  const end = nextHeading ? content.indexOf(`## ${nextHeading}\n`, bodyStart) : content.length;
  assert.notEqual(end, -1, `${nextHeading} heading exists after ${heading}`);
  return content.slice(bodyStart, end).trim();
}

test("eval surface is exactly one index and four focused scenarios", () => {
  const files = fs.readdirSync(EVAL_ROOT).sort();

  assert.deepEqual(files, ["README.md", ...SCENARIOS].sort());
  const index = read("README.md");
  for (const file of SCENARIOS) assert.match(index, new RegExp(`\\b${file.replaceAll(".", "\\.")}\\b`));
  assert.match(index, /manual oracles/i);
  assert.match(index, /not a runtime harness/i);
});

test("every scenario uses the same concise behavior-oracle structure", () => {
  for (const file of SCENARIOS) {
    const content = read(file);
    const levelTwoHeadings = [...content.matchAll(/^## (.+)$/gmu)].map((match) => match[1]);
    assert.deepEqual(levelTwoHeadings, HEADINGS, `${file}: canonical heading order`);

    const prompt = section(content, HEADINGS[0], HEADINGS[1]);
    assert.ok(prompt.length > 20, `${file}: concrete prompt`);
    for (let index = 1; index < HEADINGS.length; index += 1) {
      const body = section(content, HEADINGS[index], HEADINGS[index + 1]);
      const items = body.split("\n").filter((line) => line.startsWith("- "));
      assert.ok(items.length >= 2, `${file}: ${HEADINGS[index]} has at least two checks`);
      assert.equal(items.join("\n"), body, `${file}: ${HEADINGS[index]} is only a concise bullet list`);
    }
  }
});

test("evals judge decisions without requiring legacy AI-OS artifacts", () => {
  const content = [read("README.md"), ...SCENARIOS.map(read)].join("\n");
  for (const legacy of [
    /\.ai-os\//i,
    /lanes?\/default/i,
    /baseline-log/i,
    /tasks\.yaml/i,
    /MISSION\.md/i,
    /DESIGN\.md/i,
    /STATE\.md/i,
    /memory\.md/i,
    /doctor/i,
    /IDE pointer/i,
    /skill wrapper/i,
  ]) {
    assert.doesNotMatch(content, legacy);
  }
});
