#!/usr/bin/env node

/**
 * ai-os-cursor-rules — Regenerate IDE integration files from AI-OS framework.
 *
 * This is now a thin wrapper around shared.generateIdeFiles().
 * IDE files are generated automatically during install/upgrade;
 * this command exists for manual regeneration (e.g. after deleting .cursor/).
 *
 * Usage:
 *   ai-os-cursor-rules [target-dir]
 *   ai-os-cursor-rules [target-dir] --clean
 *   ai-os-cursor-rules --help
 */

const {
  parseCliArgs,
  resolveTargetDir,
  generateIdeFiles,
  cleanGeneratedIdeFiles,
  fail,
  C_RESET,
  C_GREEN,
  C_CYAN,
  C_DIM,
} = require("./shared");
const fs = require("fs");
const path = require("path");

const parsed = parseCliArgs(process.argv, {
  booleanFlags: ["--clean"],
});

if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-cursor-rules [target-dir] [--clean]

Regenerate IDE integration files from the installed AI-OS framework.

Generated files:
  .cursor/rules/ai-os-constitution.mdc    Cursor alwaysApply rule
  .cursor/skills/ai-os-*/SKILL.md         Cursor skills (progressive disclosure)
  CLAUDE.md                               Claude Code session init + command table
  GEMINI.md                               Antigravity workflow reference

IDE files are now generated automatically during install/upgrade.
This command is for manual regeneration only.

Options:
  --clean     Remove all AI-OS generated IDE files
  -h, --help  Show this help message
`);
  process.exit(0);
}

const targetDir = resolveTargetDir(parsed.positional);

if (!fs.existsSync(path.join(targetDir, "AGENTS.md"))) {
  fail("No AGENTS.md found. Run create-ai-os first to install the framework.");
}

if (parsed.flags.clean) {
  const removed = cleanGeneratedIdeFiles(targetDir);
  process.stdout.write(`\n${C_GREEN}Removed ${removed} generated IDE files${C_RESET}\n\n`);
  process.exit(0);
}

const count = generateIdeFiles(targetDir);
if (!count) {
  fail("Failed to generate IDE files. Is AGENTS.md present?");
}

process.stdout.write(`\n${C_GREEN}IDE integration files regenerated${C_RESET}\n`);
process.stdout.write(`${C_CYAN}Cursor:${C_RESET}      1 rule + ${count.cursor - 1} skills\n`);
process.stdout.write(`${C_CYAN}Claude Code:${C_RESET} CLAUDE.md\n`);
process.stdout.write(`${C_CYAN}Antigravity:${C_RESET} GEMINI.md\n`);
process.stdout.write(`${C_DIM}Codex CLI:   .agents/skills/ natively compatible${C_RESET}\n\n`);
