#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { test, assert, tmpDir, cleanup } = require("./helpers");
const {
  symlinkFixture,
  symlinkParentFixture,
  snapshotTree,
} = require("./fixtures");
const {
  inspectPath,
  resolveTargetRoot,
} = require("../bin/doctor-shared");

function canonicalTmpDir() {
  return fs.realpathSync.native(tmpDir());
}

test("managed file symlink is rejected before write", () => {
  const fixture = symlinkFixture(".ai-os/bin/doctor-shared.js");
  try {
    assert.throws(
      () => inspectPath(fixture.target, ".ai-os/bin/doctor-shared.js"),
      /symbolic link|junction/i,
    );
    assert.equal(fs.readFileSync(fixture.outside, "utf8"), "SENTINEL\n");
  } finally {
    fixture.cleanup();
  }
});

test("parent-directory symlink is rejected", () => {
  const fixture = symlinkParentFixture(".ai-os/bin");
  try {
    assert.throws(
      () => inspectPath(fixture.target, ".ai-os/bin/VERSION"),
      /symbolic link|junction/i,
    );
  } finally {
    fixture.cleanup();
  }
});

test("dot-dot destination cannot escape target", () => {
  const target = canonicalTmpDir();
  try {
    assert.throws(() => inspectPath(target, "../outside"), /outside target/i);
  } finally {
    cleanup(target);
  }
});

test("absolute destination cannot escape target", () => {
  const target = canonicalTmpDir();
  try {
    const outside = path.resolve(target, "..", "outside");
    assert.throws(() => inspectPath(target, outside), /outside target/i);
  } finally {
    cleanup(target);
  }
});

test("dangling managed-file symlink is rejected", () => {
  const root = canonicalTmpDir();
  const target = path.join(root, "target");
  const destination = path.join(target, ".ai-os", "bin", "doctor-shared.js");
  try {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(path.join(root, "does-not-exist"), destination, "file");
    assert.throws(
      () => inspectPath(target, ".ai-os/bin/doctor-shared.js"),
      /symbolic link|junction/i,
    );
  } finally {
    cleanup(root);
  }
});

test("target root symlink is rejected", () => {
  const root = canonicalTmpDir();
  const actual = path.join(root, "actual");
  const target = path.join(root, "target-link");
  try {
    fs.mkdirSync(actual);
    fs.symlinkSync(actual, target, "dir");
    assert.throws(() => resolveTargetRoot(target), /symbolic link|junction/i);
    assert.throws(() => inspectPath(target, ".ai-os/framework.toml"), /symbolic link|junction/i);
  } finally {
    cleanup(root);
  }
});

test("existing ancestor symlink is rejected", () => {
  const root = canonicalTmpDir();
  const actual = path.join(root, "actual");
  const linkedAncestor = path.join(root, "linked-ancestor");
  try {
    fs.mkdirSync(actual);
    fs.symlinkSync(actual, linkedAncestor, "dir");
    assert.throws(
      () => resolveTargetRoot(path.join(linkedAncestor, "future-target")),
      /symbolic link|junction/i,
    );
  } finally {
    cleanup(root);
  }
});

test("Unicode-and-space target paths remain contained", () => {
  const root = canonicalTmpDir();
  const target = path.join(root, "项目 with spaces");
  try {
    fs.mkdirSync(target);
    const resolved = resolveTargetRoot(target);
    const inspected = inspectPath(resolved, ".ai-os/资料 file.md");
    assert.equal(resolved, fs.realpathSync.native(target));
    assert.equal(inspected.absolute, path.join(resolved, ".ai-os", "资料 file.md"));
    assert.deepEqual(inspected, {
      absolute: path.join(resolved, ".ai-os", "资料 file.md"),
      exists: false,
      kind: "missing",
      link: false,
      contained: true,
    });
  } finally {
    cleanup(root);
  }
});

test("pre-existing non-directory parent is rejected", () => {
  const target = canonicalTmpDir();
  try {
    fs.writeFileSync(path.join(target, ".ai-os"), "not a directory\n");
    assert.throws(
      () => inspectPath(target, ".ai-os/bin/VERSION"),
      /non-directory parent|not a directory/i,
    );
  } finally {
    cleanup(target);
  }
});

test("regular files, directories, and missing paths are classified without writes", () => {
  const target = canonicalTmpDir();
  try {
    fs.mkdirSync(path.join(target, "dir"));
    fs.writeFileSync(path.join(target, "file.txt"), "bytes\n");
    const before = snapshotTree(target);

    assert.equal(inspectPath(target, "dir").kind, "dir");
    assert.equal(inspectPath(target, "file.txt").kind, "file");
    assert.deepEqual(inspectPath(target, "missing.txt"), {
      absolute: path.join(target, "missing.txt"),
      exists: false,
      kind: "missing",
      link: false,
      contained: true,
    });
    assert.deepEqual(snapshotTree(target), before);
  } finally {
    cleanup(target);
  }
});

test("read-only target inspection is detectable and makes no writes", (t) => {
  if (process.platform === "win32") {
    t.skip("Windows does not provide portable POSIX mode-bit enforcement");
    return;
  }

  const target = canonicalTmpDir();
  try {
    fs.chmodSync(target, 0o555);
    const mode = fs.lstatSync(target).mode & 0o777;
    if ((mode & 0o222) !== 0) {
      t.skip(`filesystem did not retain read-only mode bits (mode=${mode.toString(8)})`);
      return;
    }

    const before = snapshotTree(target);
    assert.equal(resolveTargetRoot(target), fs.realpathSync.native(target));
    assert.equal(inspectPath(target, ".ai-os/missing").exists, false);
    assert.deepEqual(snapshotTree(target), before);
  } finally {
    fs.chmodSync(target, 0o755);
    cleanup(target);
  }
});

test("Windows directory junction is rejected", (t) => {
  if (process.platform !== "win32") {
    t.skip(`directory junctions are Windows-only (platform=${process.platform})`);
    return;
  }

  const root = canonicalTmpDir();
  const target = path.join(root, "target");
  const outside = path.join(root, "outside");
  const junction = path.join(target, ".ai-os");
  try {
    fs.mkdirSync(target);
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, junction, "junction");
    assert.throws(
      () => inspectPath(target, ".ai-os/bin/VERSION"),
      /symbolic link|junction/i,
    );
  } finally {
    cleanup(root);
  }
});

test("resolveTargetRoot rejects an existing file target", () => {
  const root = canonicalTmpDir();
  const target = path.join(root, "target-file");
  try {
    fs.writeFileSync(target, "not a directory\n");
    assert.throws(() => resolveTargetRoot(target), /not a directory|target root/i);
  } finally {
    cleanup(root);
  }
});

test("resolveTargetRoot canonicalizes a missing suffix without creating it", () => {
  const root = canonicalTmpDir();
  const target = path.join(root, "not-created", "nested");
  try {
    const before = snapshotTree(root);
    assert.equal(resolveTargetRoot(target), target);
    assert.equal(fs.existsSync(target), false);
    assert.deepEqual(snapshotTree(root), before);
  } finally {
    cleanup(root);
  }
});
