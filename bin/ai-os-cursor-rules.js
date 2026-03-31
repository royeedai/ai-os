#!/usr/bin/env node

/**
 * ai-os-cursor-rules — Generate .cursor/rules/*.mdc from AI-OS framework files.
 *
 * Usage:
 *   ai-os-cursor-rules [target-dir]
 *   ai-os-cursor-rules --help
 */

const fs = require("fs");
const path = require("path");
const {
  MANAGED_ROOTS,
  listFilesRecursively,
  ensureDir,
  parseCliArgs,
  resolveTargetDir,
  fail,
  C_RESET,
  C_GREEN,
  C_CYAN,
  C_DIM,
} = require("./shared");

const parsed = parseCliArgs(process.argv, {
  booleanFlags: ["--clean"],
});

if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-cursor-rules [target-dir] [--clean]

Generate .cursor/rules/*.mdc files from the installed AI-OS framework,
so Cursor can natively load workflows and skills as project rules.

Options:
  --clean     Remove previously generated AI-OS .mdc files before writing
  -h, --help  Show this help message
`);
  process.exit(0);
}

const targetDir = resolveTargetDir(parsed.positional);
const cursorRulesDir = path.join(targetDir, ".cursor", "rules");

if (!fs.existsSync(path.join(targetDir, "AGENTS.md"))) {
  fail("No AGENTS.md found. Run create-ai-os first to install the framework.");
}

const GENERATED_MARKER = "<!-- ai-os-generated -->";

if (parsed.flags.clean) {
  if (fs.existsSync(cursorRulesDir)) {
    const existing = fs.readdirSync(cursorRulesDir).filter((f) => f.endsWith(".mdc"));
    for (const file of existing) {
      const content = fs.readFileSync(path.join(cursorRulesDir, file), "utf8");
      if (content.includes(GENERATED_MARKER)) {
        fs.unlinkSync(path.join(cursorRulesDir, file));
      }
    }
  }
}

ensureDir(cursorRulesDir);

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { name: "", description: "", body: content };
  const fm = match[1];
  const body = content.slice(match[0].length);
  let name = "";
  let description = "";
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  if (nameMatch) name = nameMatch[1].trim();
  const descMatch = fm.match(/^description:\s*(.+)$/m);
  if (descMatch) description = descMatch[1].trim();
  if (!description) {
    const multiDescMatch = fm.match(/^description:\s*>\s*\n([\s\S]*?)(?=\n\w|\n---)/m);
    if (multiDescMatch) {
      description = multiDescMatch[1].replace(/\n\s+/g, " ").trim();
    }
  }
  return { name, description, body };
}

function toMdc(description, alwaysApply, globs, body) {
  const lines = ["---"];
  lines.push(`description: "${description.replace(/"/g, '\\"')}"`);
  if (globs && globs.length > 0) {
    lines.push(`globs: ${JSON.stringify(globs)}`);
  }
  lines.push(`alwaysApply: ${alwaysApply}`);
  lines.push("---");
  lines.push("");
  lines.push(GENERATED_MARKER);
  lines.push("");
  lines.push(body.trim());
  lines.push("");
  return lines.join("\n");
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

let count = 0;

const agentsMdPath = path.join(targetDir, "AGENTS.md");
if (fs.existsSync(agentsMdPath)) {
  const content = fs.readFileSync(agentsMdPath, "utf8");
  const mdcContent = toMdc(
    "AI-OS delivery constitution — core rules for all AI actions in this project",
    true,
    [],
    content
  );
  fs.writeFileSync(path.join(cursorRulesDir, "ai-os-constitution.mdc"), mdcContent, "utf8");
  count += 1;
}

const workflowsDir = path.join(targetDir, ".agents", "workflows");
if (fs.existsSync(workflowsDir)) {
  const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const content = fs.readFileSync(path.join(workflowsDir, file), "utf8");
    const { name, description, body } = extractFrontmatter(content);
    const slug = file.replace(/\.md$/, "");

    if (slug === "AGENTS") {
      const mdcContent = toMdc(
        "AI-OS workflow router — decides which workflow to enter",
        false,
        [],
        content
      );
      fs.writeFileSync(path.join(cursorRulesDir, "ai-os-workflow-router.mdc"), mdcContent, "utf8");
    } else {
      const desc = description || `AI-OS /${slug} workflow`;
      const mdcContent = toMdc(desc, false, [], body || content);
      fs.writeFileSync(
        path.join(cursorRulesDir, `ai-os-wf-${sanitizeFileName(slug)}.mdc`),
        mdcContent,
        "utf8"
      );
    }
    count += 1;
  }
}

const skillsDir = path.join(targetDir, ".agents", "skills");
if (fs.existsSync(skillsDir)) {
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "AGENTS.md") {
      const content = fs.readFileSync(path.join(skillsDir, entry.name), "utf8");
      const mdcContent = toMdc(
        "AI-OS skills router — when to use which skill",
        false,
        [],
        content
      );
      fs.writeFileSync(path.join(cursorRulesDir, "ai-os-skill-router.mdc"), mdcContent, "utf8");
      count += 1;
      continue;
    }
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    const content = fs.readFileSync(skillMd, "utf8");
    const { description, body } = extractFrontmatter(content);
    const desc = description || `AI-OS skill: ${entry.name}`;
    const mdcContent = toMdc(desc, false, [], body || content);
    fs.writeFileSync(
      path.join(cursorRulesDir, `ai-os-sk-${sanitizeFileName(entry.name)}.mdc`),
      mdcContent,
      "utf8"
    );
    count += 1;

    const refDir = path.join(skillsDir, entry.name, "references");
    if (fs.existsSync(refDir)) {
      for (const refFile of fs.readdirSync(refDir).filter((f) => f.endsWith(".md"))) {
        const refContent = fs.readFileSync(path.join(refDir, refFile), "utf8");
        const refSlug = refFile.replace(/\.md$/, "");
        const refMdc = toMdc(
          `AI-OS skill reference: ${entry.name}/${refSlug}`,
          false,
          [],
          refContent
        );
        fs.writeFileSync(
          path.join(cursorRulesDir, `ai-os-ref-${sanitizeFileName(entry.name)}-${sanitizeFileName(refSlug)}.mdc`),
          refMdc,
          "utf8"
        );
        count += 1;
      }
    }
  }
}

process.stdout.write(`\n${C_GREEN}Generated ${count} .cursor/rules/*.mdc files${C_RESET}\n`);
process.stdout.write(`${C_CYAN}Location:${C_RESET} ${cursorRulesDir}\n`);
process.stdout.write(`${C_DIM}Files marked with ${GENERATED_MARKER} — use --clean to remove before regenerating${C_RESET}\n\n`);
