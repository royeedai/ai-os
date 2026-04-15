#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, section, tmpDir, cleanup, run } = require("./helpers");
const ps = require("../bin/project-state");
const { getLaneFilePath } = require("../bin/shared");

section("splitMarkdownSections unit tests");
{
  const content = `# Title

## Section A

Content A line 1
Content A line 2

## Section B

Content B
`;
  const sections = ps.splitMarkdownSections(content);
  assert(sections.size === 2, "parses two sections");
  assert(sections.has("Section A"), "finds Section A");
  assert(sections.has("Section B"), "finds Section B");
  assert(sections.get("Section A").includes("Content A line 1"), "Section A has correct content");
  assert(sections.get("Section B").includes("Content B"), "Section B has correct content");
}
{
  const sections = ps.splitMarkdownSections("# No h2 sections\n\nJust text.");
  assert(sections.size === 0, "returns empty map when no h2 sections");
}
{
  const content = "## Only One\n\nSingle section content";
  const sections = ps.splitMarkdownSections(content);
  assert(sections.size === 1, "handles single section");
  assert(sections.get("Only One").includes("Single section content"), "single section content correct");
}

section("parseBulletKeyValueSection unit tests");
{
  const content = `- **项目模式**：greenfield
- **当前阶段**：align
- **无关行**
Some random text`;
  const result = ps.parseBulletKeyValueSection(content);
  assert(result["项目模式"] === "greenfield", "parses Chinese key-value with Chinese colon");
  assert(result["当前阶段"] === "align", "parses second key-value");
  assert(!result["无关行"], "ignores non-kv bullet items");
}
{
  const content = "- **key**: value with: colons";
  const result = ps.parseBulletKeyValueSection(content);
  assert(result["key"] === "value with: colons", "preserves colons in value");
}
{
  const result = ps.parseBulletKeyValueSection("");
  assert(Object.keys(result).length === 0, "returns empty object for empty input");
}

section("parseMarkdownBulletList unit tests");
{
  const content = `- Item one
- Item two
- Item three`;
  const items = ps.parseMarkdownBulletList(content);
  assert(items.length === 3, "parses three bullet items");
  assert(items[0] === "Item one", "first item correct");
  assert(items[2] === "Item three", "third item correct");
}
{
  const content = "- [无]\n- 无\n- (无)\n- （无）";
  const items = ps.parseMarkdownBulletList(content);
  assert(items.length === 0, "filters out Chinese empty markers");
}
{
  const content = `> blockquote
| table | row |
## heading
Fallback plain text line`;
  const items = ps.parseMarkdownBulletList(content);
  assert(items.length === 1, "uses fallback for non-bullet content");
  assert(items[0] === "Fallback plain text line", "fallback captures plain text");
}

section("collectDuplicateValues unit tests");
{
  const dupes = ps.collectDuplicateValues(["a", "b", "a", "c", "b"]);
  assert(dupes.length === 2, "finds two duplicate values");
  assert(dupes.includes("a"), "detects duplicate a");
  assert(dupes.includes("b"), "detects duplicate b");
}
{
  const dupes = ps.collectDuplicateValues(["x", "y", "z"]);
  assert(dupes.length === 0, "no duplicates in unique list");
}
{
  const dupes = ps.collectDuplicateValues([]);
  assert(dupes.length === 0, "handles empty array");
}
{
  const dupes = ps.collectDuplicateValues(null);
  assert(dupes.length === 0, "handles null input");
}

section("summarizeTasks unit tests");
{
  const tasks = [
    { id: "T1", status: "done", risk: "low" },
    { id: "T2", status: "todo", risk: "medium" },
    { id: "T3", status: "in-progress", risk: "high" },
    { id: "T4", status: "done", risk: "low" },
  ];
  const summary = ps.summarizeTasks(tasks);
  assert(summary.done === 2, "done count correct");
  assert(summary.inProgress === 1, "in-progress count correct");
  assert(summary.todo === 1, "todo count correct");
  assert(summary.blocked === 0, "blocked count correct");
}
{
  const summary = ps.summarizeTasks([]);
  assert(summary.done === 0, "handles empty task list");
}

section("taskStatusCategory unit tests");
{
  assert(ps.taskStatusCategory({ status: "done" }) === "done", "done maps to done");
  assert(ps.taskStatusCategory({ status: "in-progress" }) === "inProgress", "in-progress maps to inProgress");
  assert(ps.taskStatusCategory({ status: "todo" }) === "todo", "todo maps to todo");
  assert(ps.taskStatusCategory({ status: "blocked" }) === "blocked", "blocked maps to blocked");
  assert(ps.taskStatusCategory({ status: "UNKNOWN" }) === "other", "unknown maps to other");
}

section("getReadyTasks unit tests");
{
  const tasks = [
    { id: "T1", status: "todo", depends_on: [], approval_required: false, wave: 1 },
    { id: "T2", status: "todo", depends_on: ["T1"], approval_required: false, wave: 1 },
    { id: "T3", status: "done", depends_on: [], approval_required: false, wave: 1 },
    { id: "T4", status: "todo", depends_on: ["T3"], approval_required: false, wave: 1 },
  ];
  const ready = ps.getReadyTasks(tasks);
  assert(ready.some((t) => t.id === "T1"), "T1 is ready (no deps)");
  assert(!ready.some((t) => t.id === "T2"), "T2 not ready (depends on undone T1)");
  assert(!ready.some((t) => t.id === "T3"), "T3 not ready (already done)");
  assert(ready.some((t) => t.id === "T4"), "T4 is ready (deps are done)");
}

section("isDeclaredHighRisk unit tests");
{
  assert(
    ps.isDeclaredHighRisk(
      { exists: true, qualityTier: "high-risk" },
      { qualityTier: "standard" }
    ) === true,
    "high-risk acceptance triggers isDeclaredHighRisk"
  );
  assert(
    ps.isDeclaredHighRisk(
      { exists: true, qualityTier: "standard" },
      { qualityTier: "high-risk" }
    ) === true,
    "high-risk tasks triggers isDeclaredHighRisk"
  );
  assert(
    ps.isDeclaredHighRisk(
      { exists: true, qualityTier: "standard" },
      { qualityTier: "standard" }
    ) === false,
    "standard both returns false"
  );
}

section("parseTasksFile edge cases");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const tasksPath = getLaneFilePath(dir, "default", "tasks.yaml");
  const parsed = ps.parseTasksFile(tasksPath);
  assert(parsed.exists === true, "parsed tasks exist flag is true");
  assert(parsed.tasks.length >= 2, "parses at least 2 tasks from template");
  assert(parsed.tasks[0].id === "TASK-AI-001", "first task has correct id");
  assert(parsed.tasks[0].owner === "AI", "first task has owner field");
  assert(Array.isArray(parsed.tasks[0].impact_tags), "impact_tags parsed as array");
  assert(parsed.milestoneIds.length >= 1, "parses milestone ids");
  assert(parsed.qualityTier === "standard", "parses quality tier");
  assert(parsed.baselineId.startsWith("BL-"), "parses baseline id");
  cleanup(dir);
}
{
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".ai-os"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".ai-os", "tasks.yaml"), "", "utf8");
  const parsed = ps.parseTasksFile(path.join(dir, ".ai-os", "tasks.yaml"));
  assert(parsed.tasks.length === 0, "empty file returns empty tasks");
  cleanup(dir);
}

section("parseAcceptanceFile edge cases");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const acceptancePath = getLaneFilePath(dir, "default", "acceptance.yaml");
  const parsed = ps.parseAcceptanceFile(acceptancePath);
  assert(parsed.exists === true, "parsed acceptance exists flag is true");
  assert(parsed.qualityTier === "standard", "parses qualityTier from template");
  assert(Object.keys(parsed.gateStatuses).length >= 3, "parses at least 3 gate statuses from template");
  assert("design-confirmation" in parsed.gateStatuses, "finds design-confirmation gate");
  assert(Array.isArray(parsed.requiredSpecialReviews), "parses requiredSpecialReviews");
  cleanup(dir);
}

section("readMissionFile unit tests");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const laneResolver = (d, relPath) => getLaneFilePath(d, "default", relPath);
  const missionInfo = ps.readMissionFile(dir, { artifactPathResolver: laneResolver });
  assert(missionInfo.exists === true, "mission exists on fresh project");
  assert(missionInfo.content.length > 0, "mission content not empty");
  assert(typeof missionInfo.summaryFields === "object", "mission has summaryFields");
  assert(typeof missionInfo.currentBaselineId === "string", "mission has currentBaselineId");
  assert(missionInfo.currentBaselineId.startsWith("BL-"), "baseline id starts with BL-");
  assert(missionInfo.isLegacy === false, "fresh template is not legacy");
  cleanup(dir);
}
{
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".ai-os"), { recursive: true });
  const missionInfo = ps.readMissionFile(dir);
  assert(missionInfo.exists === false, "mission does not exist when file missing");
  cleanup(dir);
}

section("readBaselineLogFile unit tests");
{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  const laneResolver = (d, relPath) => getLaneFilePath(d, "default", relPath);
  const baselineInfo = ps.readBaselineLogFile(dir, { artifactPathResolver: laneResolver });
  assert(baselineInfo.exists === true, "baseline log exists on fresh project");
  assert(baselineInfo.format === "directory", "fresh project uses directory format");
  assert(baselineInfo.entries.length >= 1, "has at least one baseline entry");
  assert(baselineInfo.entries[0].type === "align", "first entry type is align");
  assert(baselineInfo.latestConfirmed !== null, "has a latest confirmed entry");
  cleanup(dir);
}
{
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, ".ai-os"), { recursive: true });
  const baselineInfo = ps.readBaselineLogFile(dir);
  assert(baselineInfo.exists === false, "baseline log does not exist when directory missing");
  assert(baselineInfo.format === "missing", "reports missing format");
  cleanup(dir);
}
