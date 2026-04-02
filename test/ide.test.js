#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assert, run, tmpDir, cleanup, section } = require("./helpers");

section("IDE integration");

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);

  // install auto-generates IDE files
  assert(fs.existsSync(path.join(dir, ".cursor", "rules", "ai-os-constitution.mdc")), "install: constitution .mdc created");
  assert(fs.existsSync(path.join(dir, ".cursor", "skills", "ai-os-align", "SKILL.md")), "install: align Cursor skill created");
  assert(fs.existsSync(path.join(dir, ".cursor", "skills", "ai-os-build", "SKILL.md")), "install: build Cursor skill created");
  assert(fs.existsSync(path.join(dir, ".cursor", "skills", "ai-os-acceptance-gate", "SKILL.md")), "install: acceptance-gate Cursor skill created");
  assert(fs.existsSync(path.join(dir, "CLAUDE.md")), "install: CLAUDE.md created");
  assert(fs.existsSync(path.join(dir, "GEMINI.md")), "install: GEMINI.md created");

  const constitutionContent = fs.readFileSync(path.join(dir, ".cursor", "rules", "ai-os-constitution.mdc"), "utf8");
  assert(constitutionContent.includes("alwaysApply: true"), "constitution .mdc is always-apply");
  assert(constitutionContent.includes("<!-- ai-os-generated -->"), "constitution .mdc has generated marker");
  assert(constitutionContent.includes("Workflows 使用指南"), "constitution .mdc includes workflow router");
  assert(constitutionContent.includes("Skills 使用指南"), "constitution .mdc includes skill router");

  const alignSkill = fs.readFileSync(path.join(dir, ".cursor", "skills", "ai-os-align", "SKILL.md"), "utf8");
  assert(alignSkill.includes("name: ai-os-align"), "align skill has correct name");
  assert(alignSkill.includes("/align"), "align skill references slash command");
  assert(alignSkill.includes("<!-- ai-os-generated -->"), "align skill has generated marker");
  assert(alignSkill.includes(".agents/workflows/align.md"), "align skill references original file");

  const claudeContent = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  assert(claudeContent.includes("<!-- ai-os-generated -->"), "CLAUDE.md has generated marker");
  assert(claudeContent.includes("/align"), "CLAUDE.md includes workflow commands");
  assert(claudeContent.includes("STATE.md"), "CLAUDE.md includes session init");
  assert(claudeContent.includes("acceptance-gate"), "CLAUDE.md includes skills");

  const geminiContent = fs.readFileSync(path.join(dir, "GEMINI.md"), "utf8");
  assert(geminiContent.includes("<!-- ai-os-generated -->"), "GEMINI.md has generated marker");
  assert(geminiContent.includes("/align"), "GEMINI.md includes workflow commands");

  // cursor-rules regeneration
  const cursorResult = run("ai-os-cursor-rules.js", [dir]);
  assert(cursorResult.status === 0, "cursor-rules exits with code 0");
  assert(cursorResult.stdout.includes("regenerated"), "cursor-rules prints regeneration message");

  // cursor-rules --clean
  const cleanResult = run("ai-os-cursor-rules.js", [dir, "--clean"]);
  assert(cleanResult.status === 0, "cursor-rules --clean exits with code 0");
  assert(!fs.existsSync(path.join(dir, ".cursor", "rules", "ai-os-constitution.mdc")), "clean removes constitution .mdc");
  assert(!fs.existsSync(path.join(dir, ".cursor", "skills", "ai-os-align")), "clean removes align Cursor skill");
  assert(!fs.existsSync(path.join(dir, "CLAUDE.md")), "clean removes CLAUDE.md");
  assert(!fs.existsSync(path.join(dir, "GEMINI.md")), "clean removes GEMINI.md");

  // --no-ide-files skips generation
  const dir2 = tmpDir();
  run("create-ai-os.js", [dir2, "--with-project-files", "--no-ide-files"]);
  assert(!fs.existsSync(path.join(dir2, ".cursor", "rules", "ai-os-constitution.mdc")), "--no-ide-files: no Cursor files");
  assert(!fs.existsSync(path.join(dir2, "CLAUDE.md")), "--no-ide-files: no CLAUDE.md");
  assert(!fs.existsSync(path.join(dir2, "GEMINI.md")), "--no-ide-files: no GEMINI.md");
  cleanup(dir2);

  cleanup(dir);
}
