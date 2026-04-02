#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const shared = require("../bin/shared");
const { assert, run, tmpDir, cleanup, section } = require("./helpers");

section("team collaboration config");

{
  const dir = tmpDir();
  shared.appendGitignoreEntries(dir, { logger() {} });
  const gi = fs.readFileSync(path.join(dir, ".gitignore"), "utf8");
  assert(gi.includes("AI-OS session"), "appendGitignoreEntries creates .gitignore with marker");
  assert(gi.includes(".ai-os/STATE.md"), "appendGitignoreEntries includes STATE.md");

  const added2 = shared.appendGitignoreEntries(dir, { logger() {} });
  assert(added2 === false, "appendGitignoreEntries is idempotent");
  cleanup(dir);
}

{
  const dir = tmpDir();
  shared.appendGitattributesEntries(dir, { logger() {} });
  const ga = fs.readFileSync(path.join(dir, ".gitattributes"), "utf8");
  assert(ga.includes("AI-OS merge strategies"), "appendGitattributesEntries creates .gitattributes with marker");
  assert(ga.includes("memory.md merge=union"), "appendGitattributesEntries includes memory.md union merge");
  assert(!ga.includes("tasks.yaml merge=union"), "appendGitattributesEntries omits tasks.yaml union merge");
  assert(!ga.includes("baseline-log"), "appendGitattributesEntries leaves baseline-log to per-record file strategy");

  const added2 = shared.appendGitattributesEntries(dir, { logger() {} });
  assert(added2 === false, "appendGitattributesEntries is idempotent");
  cleanup(dir);
}

{
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, ".gitattributes"), ".ai-os/tasks.yaml merge=union\n", "utf8");
  shared.appendGitattributesEntries(dir, { logger() {} });
  const ga = fs.readFileSync(path.join(dir, ".gitattributes"), "utf8");
  assert(!ga.includes("tasks.yaml merge=union"), "appendGitattributesEntries removes obsolete tasks.yaml union merge");
  assert(ga.includes("memory.md merge=union"), "appendGitattributesEntries still adds memory.md union merge");
  cleanup(dir);
}

{
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\n", "utf8");
  shared.appendGitignoreEntries(dir, { logger() {} });
  const gi = fs.readFileSync(path.join(dir, ".gitignore"), "utf8");
  assert(gi.startsWith("node_modules/"), "appendGitignoreEntries preserves existing content");
  assert(gi.includes(".ai-os/STATE.md"), "appendGitignoreEntries appends to existing file");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  assert(fs.existsSync(path.join(dir, ".gitignore")), "create-ai-os writes .gitignore by default");
  assert(fs.existsSync(path.join(dir, ".gitattributes")), "create-ai-os writes .gitattributes by default");
  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files", "--no-team-config"]);
  assert(!fs.existsSync(path.join(dir, ".gitignore")), "--no-team-config skips .gitignore");
  assert(!fs.existsSync(path.join(dir, ".gitattributes")), "--no-team-config skips .gitattributes");
  cleanup(dir);
}
