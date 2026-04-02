#!/usr/bin/env node

const { assert, section } = require("./helpers");
const shared = require("../bin/shared");

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
