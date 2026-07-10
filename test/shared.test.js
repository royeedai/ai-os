#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { test, assert } = require("./helpers");
const doctorShared = require("../bin/doctor-shared");

const EXPECTED_FRAMEWORK_FILES = [
  ".ai-os/bin/VERSION",
  ".ai-os/bin/ai-os-doctor.js",
  ".ai-os/bin/doctor-shared.js",
  ".ai-os/framework.toml",
  ".ai-os/managed-files.tsv",
  ".ai-os/reference/artifacts.md",
];
const EXPECTED_PROJECT_FILES = [
  ".gitattributes",
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "GEMINI.md",
  ".ai-os/MISSION.md",
  ".ai-os/memory.md",
  ".ai-os/lanes/default/DESIGN.md",
  ".ai-os/lanes/default/MISSION.md",
  ".ai-os/lanes/default/baseline-log/{{INITIAL_BASELINE_FILE}}",
  ".ai-os/lanes/default/lane.toml",
  ".ai-os/lanes/default/tasks.yaml",
];
const EXPECTED_SESSION_FILES = [
  ".ai-os/lanes/default/STATE.md",
];
const EXPECTED_GENERATED_FILES = new Set([
  ".ai-os/framework.toml",
  ".ai-os/managed-files.tsv",
  ".gitattributes",
  ".gitignore",
  ".ai-os/lanes/default/baseline-log/{{INITIAL_BASELINE_FILE}}",
]);

test("doctor-shared: hash accepts strings and buffers", () => {
  const expected = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  assert.equal(doctorShared.sha256("abc"), expected);
  assert.equal(doctorShared.sha256(Buffer.from("abc")), expected);
});

test("doctor-shared: canonical v11 inventory is immutable and disjoint", () => {
  assert.equal(doctorShared.LAYOUT_VERSION, "11");
  assert.equal(doctorShared.LAYOUT_MODE, "shared-root-default-lane");
  assert.deepEqual(doctorShared.OWNERSHIP, {
    FRAMEWORK: "framework",
    PROJECT: "project",
    SESSION: "session",
  });
  assert.deepEqual(doctorShared.FRAMEWORK_FILES, EXPECTED_FRAMEWORK_FILES);
  assert.deepEqual(doctorShared.PROJECT_FILES, EXPECTED_PROJECT_FILES);
  assert.deepEqual(doctorShared.SESSION_FILES, EXPECTED_SESSION_FILES);

  assert.equal(Object.isFrozen(doctorShared.OWNERSHIP), true);
  assert.equal(Object.isFrozen(doctorShared.FRAMEWORK_FILES), true);
  assert.equal(Object.isFrozen(doctorShared.PROJECT_FILES), true);
  assert.equal(Object.isFrozen(doctorShared.SESSION_FILES), true);
  assert.equal(Object.isFrozen(doctorShared.FILE_SPECS), true);

  const ownershipSets = [
    new Set(doctorShared.FRAMEWORK_FILES),
    new Set(doctorShared.PROJECT_FILES),
    new Set(doctorShared.SESSION_FILES),
  ];
  for (let left = 0; left < ownershipSets.length; left += 1) {
    for (let right = left + 1; right < ownershipSets.length; right += 1) {
      assert.deepEqual(
        [...ownershipSets[left]].filter((item) => ownershipSets[right].has(item)),
        [],
      );
    }
  }

  const allFiles = [
    ...doctorShared.FRAMEWORK_FILES,
    ...doctorShared.PROJECT_FILES,
    ...doctorShared.SESSION_FILES,
  ];
  assert.equal(new Set(allFiles).size, allFiles.length);
  assert.deepEqual(Object.keys(doctorShared.FILE_SPECS).sort(), [...allFiles].sort());
  assert.ok(doctorShared.FRAMEWORK_FILES.includes(".ai-os/managed-files.tsv"));

  for (const relative of allFiles) {
    assert.equal(path.isAbsolute(relative), false, `${relative}: relative path`);
    assert.equal(path.posix.normalize(relative), relative, `${relative}: normalized path`);
    assert.equal(relative.includes("\\"), false, `${relative}: POSIX separators`);
    assert.equal(relative.split("/").includes(".."), false, `${relative}: no dot-dot segment`);

    const descriptor = doctorShared.FILE_SPECS[relative];
    assert.equal(Object.isFrozen(descriptor), true, `${relative}: frozen descriptor`);
    assert.deepEqual(Object.keys(descriptor).sort(), [
      "generated",
      "mode",
      "ownership",
      "path",
      "source",
      "type",
    ]);
    assert.equal(descriptor.path, relative);
    assert.equal(descriptor.type, "file");
    assert.ok([0o644, 0o755].includes(descriptor.mode), `${relative}: supported file mode`);

    const expectedOwnership = ownershipSets[0].has(relative)
      ? doctorShared.OWNERSHIP.FRAMEWORK
      : ownershipSets[1].has(relative)
        ? doctorShared.OWNERSHIP.PROJECT
        : doctorShared.OWNERSHIP.SESSION;
    assert.equal(descriptor.ownership, expectedOwnership);

    if (EXPECTED_GENERATED_FILES.has(relative)) {
      assert.equal(descriptor.generated, true, `${relative}: generated`);
      assert.equal(descriptor.source, null, `${relative}: no invented generator source`);
    } else {
      assert.equal(descriptor.generated, false, `${relative}: source-backed`);
      assert.equal(typeof descriptor.source, "string", `${relative}: source path`);
      assert.equal(path.isAbsolute(descriptor.source), false, `${relative}: source is repo-relative`);
      assert.doesNotThrow(() => fs.readFileSync(path.join(__dirname, "..", descriptor.source)));
    }
  }
});
