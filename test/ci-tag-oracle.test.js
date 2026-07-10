"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assert,
  readRepo,
  repoRoot,
  test,
} = require("./helpers");

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
  const jobHeader = lines.find((line) => line.trim() !== "");
  assert.ok(jobHeader, "full-suite block has a job header");
  const jobIndentation = jobHeader.match(/^\s*/)[0].length;
  const stepsLine = `${" ".repeat(jobIndentation + 2)}steps:`;
  const stepsIndexes = lines.flatMap((line, index) => line === stepsLine ? [index] : []);
  assert.equal(stepsIndexes.length, 1, "full-suite block has exactly one direct steps mapping");
  const [stepsStart] = stepsIndexes;
  const stepsIndentation = jobIndentation + 2;
  let stepsEnd = stepsStart + 1;
  while (stepsEnd < lines.length) {
    const line = lines[stepsEnd];
    if (line.trim() !== "" && line.match(/^\s*/)[0].length <= stepsIndentation) break;
    stepsEnd += 1;
  }
  const indentation = stepsIndentation + 2;
  const checkoutPattern = new RegExp(
    `^${" ".repeat(indentation)}- uses: actions/checkout@\\S+(?:\\s+#.*)?$`,
  );
  const starts = lines.flatMap((line, index) => (
    index > stepsStart && index < stepsEnd && checkoutPattern.test(line) ? [index] : []
  ));
  assert.equal(starts.length, 1, "full-suite block has exactly one actions/checkout step");
  const [start] = starts;
  let end = start + 1;
  while (end < stepsEnd) {
    const lineIndentation = lines[end].match(/^\s*/)[0].length;
    if (lineIndentation === indentation && lines[end].trimStart().startsWith("- ")) break;
    end += 1;
  }
  return { indentation, lines: lines.slice(start, end) };
}

function assertFullSuiteCheckout(source, label) {
  const checkout = checkoutStep(source);
  const withIndex = checkout.lines.findIndex((line) => (
    line.match(/^\s*/)[0].length === checkout.indentation + 2 && line.trim() === "with:"
  ));
  assert.notEqual(withIndex, -1, `${label}: checkout has a with mapping`);
  const withIndentation = checkout.lines[withIndex].match(/^\s*/)[0].length;
  let withEnd = withIndex + 1;
  while (withEnd < checkout.lines.length) {
    const line = checkout.lines[withEnd];
    if (line.trim() !== "" && line.match(/^\s*/)[0].length <= withIndentation) break;
    withEnd += 1;
  }
  const withLines = checkout.lines.slice(withIndex + 1, withEnd);
  const inputIndentation = " ".repeat(withIndentation + 2);
  assert.equal(
    withLines.filter((line) => line === `${inputIndentation}fetch-depth: 0`).length,
    1,
    `${label}: fetches complete history through the checkout with mapping`,
  );
  assert.equal(
    withLines.filter((line) => line === `${inputIndentation}fetch-tags: true`).length,
    1,
    `${label}: fetches compatibility tags through the checkout with mapping`,
  );
}

function runsFullSuite(source) {
  return /\bnpm (?:test|run(?:-script)? (?:test|test:coverage))(?=$|[\s'"`;&|()])/m.test(source);
}

function workflowFiles() {
  const directory = path.join(repoRoot, ".github", "workflows");
  return fs.readdirSync(directory)
    .filter((name) => /[.]ya?ml$/i.test(name))
    .sort();
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

test("CI full-suite scanner recognizes quoted and equivalent npm commands", () => {
  for (const command of [
    '- run: "npm test"',
    "- run: 'npm run test'",
    '- run: "npm run test:coverage"',
    "- run: 'npm run-script test:coverage'",
  ]) {
    assert.equal(runsFullSuite(command), true, command);
  }
});

test("CI checkout policy binds tag inputs to the checkout with mapping", () => {
  const nestedWith = [
    "  Full_Suite:",
    "    steps:",
    "      - uses: actions/checkout@example",
    "        env:",
    "          with:",
    "            fetch-depth: 0",
    "            fetch-tags: true",
    "      - run: npm test",
    "",
  ].join("\n");
  const fakeCheckoutInRunBlock = [
    "  Full_Suite:",
    "    steps:",
    "      - run: |",
    "          - uses: actions/checkout@example",
    "            with:",
    "              fetch-depth: 0",
    "              fetch-tags: true",
    "          npm test",
    "",
  ].join("\n");

  assert.throws(() => assertFullSuiteCheckout(nestedWith, "nested with job"));
  assert.throws(() => assertFullSuiteCheckout(fakeCheckoutInRunBlock, "run block job"));
});

test("every workflow full npm test job fetches the v10 tag oracle", () => {
  const fullSuiteJobs = workflowFiles().flatMap((name) => (
    workflowJobBlocks(readRepo(`.github/workflows/${name}`))
      .filter(({ source }) => runsFullSuite(source))
      .map((job) => ({ ...job, workflow: name }))
  ));

  assert.ok(fullSuiteJobs.length > 0, "workflows have at least one full-suite job");
  for (const job of fullSuiteJobs) {
    assertFullSuiteCheckout(job.source, `${job.workflow} job ${job.id}`);
  }
});

test("CI security plan preserves tags for every full-suite checkout", () => {
  const plan = readRepo("docs/superpowers/plans/2026-07-10-ai-os-v11-ci-security-plan.md");
  const yamlExamples = [...plan.matchAll(/```yaml\n([\s\S]*?)```/g)].map((match) => match[1]);
  const fullSuiteExamples = yamlExamples.flatMap((source) => (
    workflowJobBlocks(source).filter((job) => runsFullSuite(job.source))
  ));

  assert.ok(fullSuiteExamples.length > 0, "plan has a full-suite workflow example");
  for (const [index, job] of fullSuiteExamples.entries()) {
    assertFullSuiteCheckout(job.source, `plan full-suite example ${index + 1} job ${job.id}`);
  }
  assert.match(
    plan,
    /Every job that runs `npm test` or `npm run test:coverage`[^.]+`fetch-depth: 0`[^.]+`fetch-tags: true`\./s,
    "plan carries the tag-oracle checkout rule into omitted job examples",
  );
});
