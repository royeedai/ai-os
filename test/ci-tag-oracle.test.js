"use strict";

const { assert, readRepo, test } = require("./helpers");

function workflowJobBlocks(source) {
  const lines = source.split("\n");
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^  ([A-Za-z_][A-Za-z0-9_-]*):\s*$/);
    if (!match || match[1] === "jobs") continue;
    let end = index + 1;
    while (end < lines.length && !/^  [A-Za-z_][A-Za-z0-9_-]*:\s*$/.test(lines[end])) end += 1;
    blocks.push({ id: match[1], source: lines.slice(index, end).join("\n") });
    index = end - 1;
  }
  return blocks;
}

function checkoutStep(source) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line.includes("- uses: actions/checkout@"));
  assert.notEqual(start, -1, "full-suite block has an actions/checkout step");
  const indentation = lines[start].match(/^\s*/)[0].length;
  let end = start + 1;
  while (end < lines.length) {
    const lineIndentation = lines[end].match(/^\s*/)[0].length;
    if (lineIndentation === indentation && lines[end].trimStart().startsWith("- ")) break;
    end += 1;
  }
  return lines.slice(start, end).join("\n");
}

function assertFullSuiteCheckout(source, label) {
  const checkout = checkoutStep(source);
  assert.match(checkout, /^\s+fetch-depth: 0\s*$/m, `${label}: fetches complete history`);
  assert.match(checkout, /^\s+fetch-tags: true\s*$/m, `${label}: fetches compatibility tags`);
}

function runsFullSuite(source) {
  return /\bnpm test(?:\s|$)|\bnpm run test:coverage(?:\s|$)/m.test(source);
}

test("CI job scanner includes underscore and uppercase GitHub job IDs", () => {
  const workflow = [
    "jobs:",
    "  Full_Suite:",
    "    steps:",
    "      - uses: actions/checkout@example",
    "      - run: npm test",
    "",
  ].join("\n");

  assert.deepEqual(workflowJobBlocks(workflow).map(({ id }) => id), ["Full_Suite"]);
});

test("CI full npm test jobs fetch the v10 tag oracle", () => {
  const workflow = readRepo(".github/workflows/ci.yml");
  const fullSuiteJobs = workflowJobBlocks(workflow)
    .filter(({ source }) => runsFullSuite(source));

  assert.ok(fullSuiteJobs.length > 0, "workflow has at least one full-suite job");
  for (const job of fullSuiteJobs) assertFullSuiteCheckout(job.source, `job ${job.id}`);
});

test("CI security plan preserves tags for every full-suite checkout", () => {
  const plan = readRepo("docs/superpowers/plans/2026-07-10-ai-os-v11-ci-security-plan.md");
  const yamlExamples = [...plan.matchAll(/```yaml\n([\s\S]*?)```/g)].map((match) => match[1]);
  const fullSuiteExamples = yamlExamples.filter((source) => runsFullSuite(source));

  assert.ok(fullSuiteExamples.length > 0, "plan has a full-suite workflow example");
  for (const [index, source] of fullSuiteExamples.entries()) {
    assertFullSuiteCheckout(source, `plan full-suite example ${index + 1}`);
  }
  assert.match(
    plan,
    /Every job that runs `npm test` or `npm run test:coverage`[^.]+`fetch-depth: 0`[^.]+`fetch-tags: true`\./s,
    "plan carries the tag-oracle checkout rule into omitted job examples",
  );
});
