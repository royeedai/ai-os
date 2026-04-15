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
  assert(gi.includes(".ai-os/lanes/*/STATE.md"), "appendGitignoreEntries includes lane-scoped STATE.md");

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
  assert(gi.includes(".ai-os/lanes/*/STATE.md"), "appendGitignoreEntries appends lane-scoped state ignore");
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

section("lane-aware recovery commands");

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);

  const statusResult = run("ai-os-status.js", [dir]);
  assert(statusResult.status === 0, "status works on a lane-based project");
  assert(statusResult.stdout.includes("lane: default"), "status reports the selected lane");
  assert(statusResult.stdout.includes(".ai-os/lanes/default/STATE.md") || statusResult.stdout.includes("Delivery model"), "status uses lane-scoped state context");

  const nextResult = run("ai-os-next.js", [dir]);
  assert(nextResult.status === 0, "next works on a lane-based project");
  assert(nextResult.stdout.includes("lane: default"), "next reports the selected lane");

  const resumeResult = run("ai-os-resume.js", [dir, "--markdown"]);
  assert(resumeResult.status === 0, "resume works on a lane-based project");
  assert(resumeResult.stdout.includes(".ai-os/lanes/default/MISSION.md"), "resume references lane-scoped mission");
  assert(resumeResult.stdout.includes("当前 lane"), "resume markdown reports current lane");

  const doctorResult = run("ai-os-doctor.js", [dir]);
  assert(doctorResult.status === 0, "doctor works on a lane-based project");
  assert(doctorResult.stdout.includes("lane: default"), "doctor reports the selected lane");

  cleanup(dir);
}

{
  const dir = tmpDir();
  run("create-ai-os.js", [dir, "--with-project-files"]);
  fs.mkdirSync(path.join(dir, ".ai-os", "lanes", "beta"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".ai-os", "lanes", "beta", "lane.toml"),
    [
      'id = "beta"',
      'title = "beta lane"',
      'status = "active"',
      'baseline_id = "BL-20260101-000001-beta"',
      "",
    ].join("\n"),
    "utf8"
  );

  const ambiguousStatus = run("ai-os-status.js", [dir]);
  assert(ambiguousStatus.status === 1, "status blocks when multiple active lanes exist");
  assert(
    ambiguousStatus.stderr.includes("Multiple active lanes found"),
    "status explains lane selection is required"
  );
  assert(ambiguousStatus.stderr.includes("--lane default"), "status ambiguity error suggests explicit lane selection");
  assert(ambiguousStatus.stderr.includes("--lane beta"), "status ambiguity error lists alternate active lanes");
  assert(ambiguousStatus.stderr.includes("restore auto-selection"), "status ambiguity error explains how to restore auto-selection");

  const explicitStatus = run("ai-os-status.js", [dir, "--lane", "default"]);
  assert(explicitStatus.status === 0, "status accepts explicit lane selection");
  assert(explicitStatus.stdout.includes("lane: default"), "status reports the explicitly selected lane");

  const unknownLaneStatus = run("ai-os-status.js", [dir, "--lane", "gamma"]);
  assert(unknownLaneStatus.status === 1, "status blocks unknown lane selection");
  assert(unknownLaneStatus.stderr.includes("Known lanes:"), "status unknown-lane error lists known lanes");
  assert(unknownLaneStatus.stderr.includes("--lane beta"), "status unknown-lane error suggests valid lane flags");

  cleanup(dir);
}
