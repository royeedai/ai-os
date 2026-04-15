#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, section } = require("./helpers");
const shared = require("../bin/shared");
const { tmpDir, cleanup } = require("./helpers");

function writeFile(filePath, content = "") {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

section("cleanYamlScalar unit tests");
assert(shared.cleanYamlScalar('  "hello"  ') === "hello", "strips double quotes and whitespace");
assert(shared.cleanYamlScalar("  'world'  ") === "world", "strips single quotes and whitespace");
assert(shared.cleanYamlScalar("  plain  ") === "plain", "trims plain values");
assert(shared.cleanYamlScalar("") === "", "returns empty for empty string");
assert(shared.cleanYamlScalar("   ") === "", "returns empty for whitespace-only");
assert(shared.cleanYamlScalar('"nested "quote""') === 'nested "quote"', "handles quotes inside quotes");

section("parseInlineArray unit tests");
assert(JSON.stringify(shared.parseInlineArray('["a", "b", "c"]')) === '["a","b","c"]', "parses basic inline array");
assert(JSON.stringify(shared.parseInlineArray("[]")) === "[]", "parses empty array");
assert(JSON.stringify(shared.parseInlineArray("not-array")) === "[]", "returns empty for non-array input");
assert(JSON.stringify(shared.parseInlineArray('[  "x" ,  "y"  ]')) === '["x","y"]', "handles extra whitespace");
assert(JSON.stringify(shared.parseInlineArray('["only"]')) === '["only"]', "handles single-element array");
assert(JSON.stringify(shared.parseInlineArray('["", "a"]')) === '["a"]', "filters empty items");

section("countTopLevelYamlListEntries unit tests");
assert(shared.countTopLevelYamlListEntries("", "failure_modes") === 0, "returns 0 for empty content");
assert(shared.countTopLevelYamlListEntries("failure_modes: []\n", "failure_modes") === 0, "treats empty inline list as zero entries");
assert(shared.countTopLevelYamlListEntries("impact_rules:\n  - id: foo\n", "failure_modes") === 0, "returns 0 for missing top-level key");
assert(
  shared.countTopLevelYamlListEntries(
    [
      "failure_modes:",
      "  - id: missing-auth-context",
      "    trigger: token missing",
      "    guards:",
      "      - degraded-path-check",
      "      - evals/auth-context-missing.md",
      "  - id: duplicate-submit",
      "    trigger: same request sent twice",
      "commands:",
      '  verify: "npm test"',
      "",
    ].join("\n"),
    "failure_modes"
  ) === 2,
  "counts only top-level list entries and ignores nested guards"
);

section("validateFailureModeGuards unit tests");
{
  const result = shared.validateFailureModeGuards(
    [
      "failure_modes:",
      "  - id: duplicate-submit",
      "    guards:",
      "      - degraded-path-check",
      "      - .ai-os/evals/duplicate-submit.md",
      "",
    ].join("\n"),
    {
      knownEvidenceNames: ["degraded-path-check", "runtime-check"],
      existingEvalFiles: ["evals/duplicate-submit.md"],
    }
  );
  assert(result.issues.length === 0, "accepts known evidence names and existing eval refs");
}
{
  const result = shared.validateFailureModeGuards(
    [
      "failure_modes:",
      "  - id: duplicate-submit",
      "    guards:",
      "      - made-up-check",
      "      - evals/missing.md",
      "",
    ].join("\n"),
    {
      knownEvidenceNames: ["degraded-path-check", "runtime-check"],
      existingEvalFiles: ["evals/duplicate-submit.md"],
    }
  );
  assert(result.issues.includes("duplicate-submit: unknown guard reference: made-up-check"), "reports unknown evidence guard");
  assert(result.issues.includes("duplicate-submit: missing eval file: evals/missing.md"), "reports missing eval guard");
}
{
  const result = shared.validateFailureModeGuards(
    [
      "failure_modes:",
      "  - id: duplicate-submit",
      "    guards: []",
      "",
    ].join("\n"),
    {
      knownEvidenceNames: ["degraded-path-check"],
      existingEvalFiles: [],
    }
  );
  assert(result.issues.includes("duplicate-submit: guards is empty"), "reports empty guard lists");
}

section("parseSimpleToml unit tests");
{
  const result = shared.parseSimpleToml('key = "value"\nanother = "test"');
  assert(result.key === "value", "parses basic key-value");
  assert(result.another === "test", "parses second key-value");
}
{
  const result = shared.parseSimpleToml('# comment\n\nkey = "value"');
  assert(result.key === "value", "ignores comments and blank lines");
  assert(Object.keys(result).length === 1, "only parses valid lines");
}
{
  const result = shared.parseSimpleToml('escaped = "has \\"quotes\\""');
  assert(result.escaped === 'has "quotes"', "unescapes double quotes");
}
{
  const result = shared.parseSimpleToml("");
  assert(Object.keys(result).length === 0, "returns empty object for empty input");
}

section("serializeSimpleToml unit tests");
{
  const result = shared.serializeSimpleToml({ key: "value", another: "test" });
  assert(result.includes('key = "value"'), "serializes key-value pair");
  assert(result.includes('another = "test"'), "serializes second pair");
  assert(result.endsWith("\n"), "ends with newline");
}
{
  const result = shared.serializeSimpleToml({ has_quote: 'say "hello"' });
  assert(result.includes('has_quote = "say \\"hello\\""'), "escapes double quotes");
}

section("parseCliArgs unit tests");
{
  const result = shared.parseCliArgs(["node", "script", "mydir"], {
    booleanFlags: ["--force"],
  });
  assert(result.positional === "mydir", "parses positional argument");
  assert(result.flags.force === false, "boolean flag defaults to false");
}
{
  const result = shared.parseCliArgs(["node", "script", "--force", "mydir"], {
    booleanFlags: ["--force"],
  });
  assert(result.positional === "mydir", "positional after flag");
  assert(result.flags.force === true, "boolean flag parsed");
}
{
  const result = shared.parseCliArgs(["node", "script", "--profile", "project"], {
    valuedFlags: ["--profile"],
  });
  assert(result.flags.profile === "project", "valued flag parsed");
}
{
  const result = shared.parseCliArgs(["node", "script", "-h"], {});
  assert(result.flags.help === true, "-h sets help flag");
}
{
  const result = shared.parseCliArgs(["node", "script", "--help"], {});
  assert(result.flags.help === true, "--help sets help flag");
}

section("isLiteIncluded unit tests");
assert(shared.isLiteIncluded("AGENTS.md") === true, "AGENTS.md is always included in lite");
assert(shared.isLiteIncluded(".agents/workflows/AGENTS.md") === true, "workflow router included in lite");
assert(shared.isLiteIncluded(".agents/skills/AGENTS.md") === true, "skill router included in lite");
assert(shared.isLiteIncluded(".agents/workflows/align.md") === true, "align workflow in lite");
assert(shared.isLiteIncluded(".agents/workflows/design.md") === true, "design workflow in lite");
assert(shared.isLiteIncluded(".agents/workflows/build.md") === true, "build workflow in lite");
assert(shared.isLiteIncluded(".agents/workflows/verify.md") === true, "verify workflow in lite");
assert(shared.isLiteIncluded(".agents/workflows/ship.md") === true, "ship workflow in lite");
assert(shared.isLiteIncluded(".agents/workflows/plan.md") === true, "plan workflow in lite");
assert(shared.isLiteIncluded(".agents/workflows/change-request.md") === true, "change-request in lite");
assert(shared.isLiteIncluded(".agents/workflows/resume.md") === true, "resume in lite");
assert(shared.isLiteIncluded(".agents/workflows/review.md") === false, "review NOT in lite");
assert(shared.isLiteIncluded(".agents/workflows/postmortem.md") === false, "postmortem NOT in lite");
assert(shared.isLiteIncluded(".agents/skills/api-design/SKILL.md") === false, "supplementary api-design not in lite");
assert(shared.isLiteIncluded(".agents/skills/database-schema-design/SKILL.md") === false, "supplementary database-schema not in lite");
assert(shared.isLiteIncluded(".agents/skills/acceptance-gate/SKILL.md") === true, "acceptance-gate in lite");
assert(shared.isLiteIncluded(".agents/skills/project-planner/SKILL.md") === true, "project-planner in lite");
assert(shared.isLiteIncluded(".agents/skills/code-review-guard/SKILL.md") === true, "code-review-guard in lite");
assert(shared.isLiteIncluded(".agents/references/derived-rules.md") === true, "derived-rules included");

section("formatProjectPath unit tests");
assert(shared.formatProjectPath("MISSION.md") === ".ai-os/MISSION.md", "prepends .ai-os to project artifact");
assert(shared.formatProjectPath("specs/example.spec.md") === ".ai-os/specs/example.spec.md", "prepends .ai-os to nested path");

section("isProjectArtifactPath unit tests");
assert(shared.isProjectArtifactPath("MISSION.md") === true, "MISSION.md is a project artifact");
assert(shared.isProjectArtifactPath("DESIGN.md") === true, "DESIGN.md is a project artifact");
assert(shared.isProjectArtifactPath("tasks.yaml") === true, "tasks.yaml is a project artifact");
assert(shared.isProjectArtifactPath("AGENTS.md") === false, "AGENTS.md is NOT a project artifact");
assert(shared.isProjectArtifactPath("random-file.txt") === false, "random file is not a project artifact");

section("lane path helper unit tests");
{
  const root = shared.getProjectLanesRoot("/tmp/example");
  assert(root.endsWith(path.join(".ai-os", "lanes")), "getProjectLanesRoot points to .ai-os/lanes");
  assert(
    shared.getLaneRelativePath("default", "MISSION.md") === ".ai-os/lanes/default/MISSION.md",
    "getLaneRelativePath formats lane artifact path"
  );
  assert(
    shared.getLaneRelativePath("default", ".ai-os/lanes/default/tasks.yaml") === ".ai-os/lanes/default/tasks.yaml",
    "getLaneRelativePath accepts already-prefixed lane paths"
  );
  assert(
    shared.getLaneFilePath("/tmp/example", "default", "tasks.yaml").endsWith(path.join(".ai-os", "lanes", "default", "tasks.yaml")),
    "getLaneFilePath resolves lane file path"
  );
  assert(
    shared.getLaneMetadataPath("/tmp/example", "default").endsWith(path.join(".ai-os", "lanes", "default", "lane.toml")),
    "getLaneMetadataPath resolves lane metadata path"
  );
  assert(shared.isLaneArtifactPath("MISSION.md") === true, "MISSION.md is lane-scoped");
  assert(shared.isLaneArtifactPath("memory.md") === false, "memory.md remains shared at project root");
  assert(
    shared.formatDeliveryPath("MISSION.md", { laneId: "default" }) === ".ai-os/lanes/default/MISSION.md",
    "formatDeliveryPath maps lane-scoped artifact into lane root"
  );
  assert(
    shared.formatDeliveryPath("memory.md", { laneId: "default" }) === ".ai-os/memory.md",
    "formatDeliveryPath keeps shared artifact at root"
  );
  assert(
    shared.resolveDeliveryPath("/tmp/example", "MISSION.md", { laneId: "default" }).endsWith(path.join(".ai-os", "lanes", "default", "MISSION.md")),
    "resolveDeliveryPath maps lane-scoped artifact into lane root"
  );
  assert(
    shared.resolveDeliveryPath("/tmp/example", "memory.md", { laneId: "default" }).endsWith(path.join(".ai-os", "memory.md")),
    "resolveDeliveryPath keeps shared artifact at root"
  );
  assert(
    shared.resolveDeliveryPath("/tmp/example", ".ai-os/lanes/default/MISSION.md").endsWith(path.join(".ai-os", "lanes", "default", "MISSION.md")),
    "resolveDeliveryPath preserves .ai-os prefix for already-prefixed lane paths"
  );
  assert(
    shared.resolveDeliveryPath("/tmp/example", "lanes/default/tasks.yaml").endsWith(path.join(".ai-os", "lanes", "default", "tasks.yaml")),
    "resolveDeliveryPath adds .ai-os prefix for bare lane paths"
  );
}

section("lane delivery layout unit tests");
{
  const dir = tmpDir();
  try {
    const layout = shared.inspectProjectDeliveryLayout(dir);
    assert(layout.model === shared.DELIVERY_MODEL_NONE, "detects missing AI-OS project as none");

    const resolution = shared.resolveProjectLane(dir);
    assert(resolution.ok === false, "lane resolution fails when no delivery model exists");
    assert(resolution.code === "no-delivery-model", "uses no-delivery-model code");
  } finally {
    cleanup(dir);
  }
}
{
  const dir = tmpDir();
  try {
    writeFile(path.join(dir, ".ai-os", "MISSION.md"), "# mission\n");
    writeFile(path.join(dir, ".ai-os", "tasks.yaml"), "baseline_id: BL-1\n");
    writeFile(path.join(dir, ".ai-os", "memory.md"), "# shared\n");

    const layout = shared.inspectProjectDeliveryLayout(dir);
    assert(layout.model === shared.DELIVERY_MODEL_LEGACY, "detects legacy single-delivery layout");
    assert(layout.legacyRootRelPaths.includes("MISSION.md"), "tracks legacy mission artifact");
    assert(layout.legacyRootRelPaths.includes("tasks.yaml"), "tracks legacy task artifact");

    const resolution = shared.resolveProjectLane(dir);
    assert(resolution.ok === true, "legacy projects resolve without lane");
    assert(resolution.isLegacyFallback === true, "legacy projects resolve through fallback");

    const laneResolution = shared.resolveProjectLane(dir, { laneId: "default" });
    assert(laneResolution.ok === false, "legacy projects reject explicit lane selection");
    assert(
      laneResolution.code === "legacy-does-not-support-lane-selection",
      "legacy lane selection returns explicit error code"
    );
  } finally {
    cleanup(dir);
  }
}
{
  const dir = tmpDir();
  try {
    writeFile(
      path.join(dir, ".ai-os", "lanes", "default", "lane.toml"),
      [
        'id = "default"',
        'title = "Default lane"',
        'status = "active"',
        'baseline_id = "BL-default"',
        'quality_tier = "high-risk"',
        'owner = "team-core"',
        "",
      ].join("\n")
    );

    const lanes = shared.listProjectLanes(dir);
    assert(lanes.length === 1, "lists configured lane directories");
    assert(lanes[0].id === "default", "uses directory name as lane id");
    assert(lanes[0].isActive === true, "marks active lane from metadata");
    assert(lanes[0].baselineId === "BL-default", "reads lane baseline id");

    const layout = shared.inspectProjectDeliveryLayout(dir);
    assert(layout.model === shared.DELIVERY_MODEL_LANES, "detects lanes layout");
    assert(layout.activeLaneIds.length === 1 && layout.activeLaneIds[0] === "default", "tracks active lane ids");

    const resolution = shared.resolveProjectLane(dir);
    assert(resolution.ok === true, "single active lane auto-selects");
    assert(resolution.autoSelected === true, "marks single active lane as auto-selected");
    assert(resolution.laneId === "default", "returns selected lane id");
  } finally {
    cleanup(dir);
  }
}
{
  const dir = tmpDir();
  try {
    writeFile(
      path.join(dir, ".ai-os", "lanes", "alpha", "lane.toml"),
      ['status = "active"', ""].join("\n")
    );
    writeFile(
      path.join(dir, ".ai-os", "lanes", "beta", "lane.toml"),
      ['status = "active"', ""].join("\n")
    );

    const layout = shared.inspectProjectDeliveryLayout(dir);
    assert(layout.model === shared.DELIVERY_MODEL_LANES, "detects lanes layout with multiple lanes");
    assert(layout.activeLaneIds.length === 2, "tracks multiple active lanes");

    const unresolved = shared.resolveProjectLane(dir);
    assert(unresolved.ok === false, "multiple active lanes require explicit selection");
    assert(unresolved.code === "lane-selection-required", "uses lane-selection-required code");
    assert(unresolved.message.includes("Active lanes:"), "multiple active lanes message lists active lanes");
    assert(unresolved.message.includes("--lane alpha"), "multiple active lanes message suggests explicit lane flags");
    assert(unresolved.message.includes("restore auto-selection"), "multiple active lanes message explains how to restore auto-selection");

    const selected = shared.resolveProjectLane(dir, { laneId: "beta" });
    assert(selected.ok === true, "explicit lane selection succeeds");
    assert(selected.laneId === "beta", "returns requested lane");

    const unknownLane = shared.resolveProjectLane(dir, { laneId: "gamma" });
    assert(unknownLane.ok === false, "unknown lane selection fails");
    assert(unknownLane.code === "unknown-lane", "unknown lane uses explicit code");
    assert(unknownLane.message.includes("Known lanes:"), "unknown lane message lists known lanes");
    assert(unknownLane.message.includes("--lane beta"), "unknown lane message suggests a valid lane flag");
  } finally {
    cleanup(dir);
  }
}
{
  const dir = tmpDir();
  try {
    writeFile(
      path.join(dir, ".ai-os", "lanes", "alpha", "lane.toml"),
      ['status = "archived"', ""].join("\n")
    );
    writeFile(
      path.join(dir, ".ai-os", "lanes", "beta", "lane.toml"),
      ['status = "paused"', ""].join("\n")
    );

    const unresolved = shared.resolveProjectLane(dir);
    assert(unresolved.ok === false, "lane layout without active lanes requires explicit selection");
    assert(unresolved.code === "lane-selection-required", "no-active-lane uses lane-selection-required code");
    assert(unresolved.message.includes("Configured lanes:"), "no-active-lane message lists configured lanes");
    assert(unresolved.message.includes("status = \"active\""), "no-active-lane message explains how to restore auto-selection");
  } finally {
    cleanup(dir);
  }
}
{
  const dir = tmpDir();
  try {
    writeFile(path.join(dir, ".ai-os", "MISSION.md"), "# mission\n");
    writeFile(path.join(dir, ".ai-os", "lanes", "default", "lane.toml"), 'status = "active"\n');

    const layout = shared.inspectProjectDeliveryLayout(dir);
    assert(layout.model === shared.DELIVERY_MODEL_MIXED, "detects mixed legacy + lanes layout");
    assert(layout.requiresMigration === true, "mixed layout flags migration requirement");

    const resolution = shared.resolveProjectLane(dir);
    assert(resolution.ok === true, "mixed layout can still resolve explicit lane model");
    assert(resolution.laneId === "default", "mixed layout auto-selects sole active lane");
  } finally {
    cleanup(dir);
  }
}
