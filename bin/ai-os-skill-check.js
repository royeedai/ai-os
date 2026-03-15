#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  fail,
  listFilesRecursively,
  SYM_OK,
  SYM_FAIL,
  SYM_WARN,
} = require("./shared");

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const COMPLEXITY_LINE_THRESHOLD = 220;

const HEADING_GROUPS = {
  trigger: [
    /使用时机/u,
    /触发条件/u,
    /何时使用/u,
    /when to use/i,
    /适用场景/u,
  ],
  process: [
    /使用方式/u,
    /操作步骤/u,
    /流程/u,
    /阶段/u,
    /执行方式/u,
    /检查步骤/u,
  ],
  boundary: [
    /约束/u,
    /禁止事项/u,
    /边界/u,
    /不适用/u,
    /适用边界/u,
    /限制/u,
    /铁律/u,
    /强制规则/u,
  ],
  deliverable: [
    /模板/u,
    /交付输出/u,
    /输出/u,
    /示例/u,
    /examples/i,
    /报告模板/u,
    /模板引用/u,
    /参考资料/u,
  ],
  maintenance: [
    /维护/u,
    /maintenance/i,
    /已知限制/u,
    /更新时间/u,
    /来源/u,
  ],
};

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-skill-check [skill-dir] [--strict]

Validate a Skill directory that contains SKILL.md.

Checks:
  - frontmatter name / description
  - trigger and execution sections
  - boundary section and deliverable/template sections
  - references/ navigation and oversized SKILL.md

Options:
  --strict    Enforce the production-grade checks instead of baseline checks
  -h, --help  Show this help message
`);
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") {
    return { error: "SKILL.md must start with YAML frontmatter" };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { error: "YAML frontmatter is not closed" };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const data = {};
  let currentBlockKey = "";
  let currentBlockValue = [];

  function flushBlock() {
    if (!currentBlockKey) {
      return;
    }
    data[currentBlockKey] = currentBlockValue.join(" ").replace(/\s+/g, " ").trim();
    currentBlockKey = "";
    currentBlockValue = [];
  }

  for (const rawLine of frontmatterLines) {
    if (/^\s*$/.test(rawLine)) {
      if (currentBlockKey) {
        currentBlockValue.push("");
      }
      continue;
    }

    const keyMatch = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      flushBlock();
      const key = keyMatch[1];
      const rawValue = keyMatch[2];
      if (rawValue === ">" || rawValue === "|") {
        currentBlockKey = key;
        currentBlockValue = [];
      } else {
        data[key] = stripQuotes(rawValue);
      }
      continue;
    }

    if (currentBlockKey && (/^\s+/.test(rawLine) || rawLine === "")) {
      currentBlockValue.push(rawLine.trim());
    }
  }

  flushBlock();

  return {
    data,
    body: lines.slice(endIndex + 1).join("\n"),
  };
}

function removeCodeFences(content) {
  const lines = content.split(/\r?\n/);
  const kept = [];
  let inFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      kept.push(line);
    }
  }

  return kept.join("\n");
}

function collectH2Headings(content) {
  return removeCodeFences(content)
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^##\s+(.+?)\s*$/);
      return match ? match[1].trim() : "";
    })
    .filter(Boolean);
}

function collectExampleHeadings(content) {
  return removeCodeFences(content)
    .split(/\r?\n/)
    .filter((line) => /^###\s+/.test(line))
    .filter((line) => /示例|example/i.test(line));
}

function hasMatchingHeading(headings, patterns) {
  return headings.some((heading) => patterns.some((pattern) => pattern.test(heading)));
}

function descriptionLooksOperational(description) {
  if (!description) {
    return false;
  }
  const normalized = description.replace(/\s+/g, " ").trim();
  if (normalized.length < 12) {
    return false;
  }
  return /(使用|用于|当|触发|适用|when|use)/i.test(normalized);
}

const args = process.argv.slice(2);
let targetArg = "";
let strict = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--strict") {
    strict = true;
    continue;
  }
  if (arg.startsWith("-")) {
    fail(`unknown option: ${arg}`);
  }
  if (targetArg) {
    fail(`unexpected argument: ${arg}`);
  }
  targetArg = arg;
}

const skillDir = path.resolve(targetArg || ".");
if (!fs.existsSync(skillDir)) {
  fail(`skill directory does not exist: ${skillDir}`);
}
if (!fs.statSync(skillDir).isDirectory()) {
  fail(`not a directory: ${skillDir}`);
}

const skillMdPath = path.join(skillDir, "SKILL.md");
if (!fs.existsSync(skillMdPath)) {
  fail(`missing SKILL.md: ${skillMdPath}`);
}

const skillContent = fs.readFileSync(skillMdPath, "utf8");
const parsed = parseFrontmatter(skillContent);
const headings = parsed.body ? collectH2Headings(parsed.body) : [];
const exampleHeadings = parsed.body ? collectExampleHeadings(parsed.body) : [];
const skillLineCount = skillContent.split(/\r?\n/).length;
const refsDir = path.join(skillDir, "references");
const refsExists = fs.existsSync(refsDir) && fs.statSync(refsDir).isDirectory();
const refsIndexPath = path.join(refsDir, "index.md");
const refsFiles = refsExists ? listFilesRecursively(refsDir) : [];
const dirName = path.basename(skillDir);

let failures = 0;
let warnings = 0;

function report(ok, label, options = {}) {
  const { warnOnly = false, details = [] } = options;
  if (ok) {
    process.stdout.write(`  ${SYM_OK}  ${label}\n`);
    return;
  }

  if (warnOnly) {
    warnings += 1;
    process.stdout.write(`  ${SYM_WARN}  ${label}\n`);
  } else {
    failures += 1;
    process.stdout.write(`  ${SYM_FAIL}  ${label}\n`);
  }

  for (const detail of details) {
    process.stdout.write(`       - ${detail}\n`);
  }
}

process.stdout.write(`\nAI-OS Skill Check — ${skillDir}${strict ? " (strict)" : ""}\n\n`);

report(parsed.error === undefined, "SKILL.md frontmatter is present", {
  details: parsed.error ? [parsed.error] : [],
});

if (parsed.error) {
  process.stdout.write(`\nSummary: ${failures} failed, ${warnings} warnings\n`);
  process.exit(1);
}

const name = parsed.data.name || "";
const description = parsed.data.description || "";
const hasTriggerSection = hasMatchingHeading(headings, HEADING_GROUPS.trigger);
const hasProcessSection = hasMatchingHeading(headings, HEADING_GROUPS.process);
const hasBoundarySection = hasMatchingHeading(headings, HEADING_GROUPS.boundary);
const hasDeliverableSection = hasMatchingHeading(headings, HEADING_GROUPS.deliverable);
const hasMaintenanceSection = hasMatchingHeading(headings, HEADING_GROUPS.maintenance);
const operationalDescription = descriptionLooksOperational(description);

report(Boolean(name), "frontmatter includes name");
report(Boolean(description), "frontmatter includes description");
report(Boolean(name) && NAME_PATTERN.test(name), "frontmatter name uses skill-safe format", {
  details: name && !NAME_PATTERN.test(name)
    ? ["expected ^[a-z][a-z0-9-]*$"]
    : [],
});
report(hasTriggerSection || operationalDescription, "has trigger signal via section or description", {
  details: (hasTriggerSection || operationalDescription)
    ? []
    : ["add a dedicated trigger section or make description explicitly say when to use this skill"],
});
report(hasTriggerSection, "has dedicated trigger / usage section", {
  warnOnly: !strict,
  details: hasTriggerSection
    ? []
    : ["add a section such as '使用时机' or '触发条件' for more reliable activation"],
});
report(hasProcessSection, "has execution / process section");
report(operationalDescription, "description explains what + when", {
  warnOnly: !strict,
  details: operationalDescription
    ? []
    : ["description should say what the skill does and when it should be used"],
});
report(hasBoundarySection, "has boundary / constraints section", {
  warnOnly: !strict,
  details: hasBoundarySection
    ? []
    : ["add a section such as '约束'、'禁止事项' or '适用边界'"],
});
report(hasDeliverableSection, "has template / deliverable / example section", {
  warnOnly: !strict,
  details: hasDeliverableSection
    ? []
    : ["add at least one output template, report template, or concrete example section"],
});
report(exampleHeadings.length > 0, "includes example headings", {
  warnOnly: true,
  details: exampleHeadings.length > 0
    ? []
    : ["examples are recommended for complex or high-frequency skills"],
});

report(!strict || name === dirName, "frontmatter name matches directory name", {
  warnOnly: !strict,
  details: name && name !== dirName ? [`name='${name}', directory='${dirName}'`] : [],
});

report(!strict || hasMaintenanceSection, "has maintenance section", {
  warnOnly: !strict,
  details: hasMaintenanceSection
    ? []
    : ["strict mode expects a section such as '维护信息' or 'Maintenance'"],
});

if (refsExists) {
  report(fs.existsSync(refsIndexPath), "references/ includes index.md", {
    warnOnly: !strict,
    details: fs.existsSync(refsIndexPath)
      ? []
      : ["add references/index.md as the navigation entrypoint"],
  });
  report(refsFiles.length > 0, "references/ includes at least one file", {
    warnOnly: true,
  });
} else {
  report(skillLineCount <= COMPLEXITY_LINE_THRESHOLD, "SKILL.md length stays within baseline budget", {
    warnOnly: !strict,
    details: skillLineCount > COMPLEXITY_LINE_THRESHOLD
      ? [
          `current length: ${skillLineCount} lines`,
          "consider moving long content into references/",
        ]
      : [],
  });
}

process.stdout.write(`\nSummary: ${failures} failed, ${warnings} warnings\n`);

if (failures > 0) {
  process.exit(1);
}
