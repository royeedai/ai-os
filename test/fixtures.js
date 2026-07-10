"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  afterEach,
  cleanup: cleanupDirs,
  readRepo,
  tmpDir,
} = require("./helpers");
const { installProject } = require("../bin/installer");

const fixtureOwners = new Set();

afterEach(() => {
  for (const owner of [...fixtureOwners]) owner.cleanup();
});

function ownedFixtureRoot() {
  const root = fs.realpathSync.native(tmpDir());
  let removed = false;
  const owner = {
    root,
    cleanup() {
      if (removed) return;
      removed = true;
      fixtureOwners.delete(owner);
      cleanupDirs(root);
    },
  };
  fixtureOwners.add(owner);
  return owner;
}

function fixturePath(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function symlinkFixture(relativePath) {
  const owner = ownedFixtureRoot();
  const target = path.join(owner.root, "target");
  const outside = path.join(owner.root, "outside.txt");
  const destination = fixturePath(target, relativePath);

  try {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(outside, "SENTINEL\n");
    fs.symlinkSync(outside, destination, "file");
    return { ...owner, target, outside, destination };
  } catch (error) {
    owner.cleanup();
    throw error;
  }
}

function symlinkParentFixture(relativePath) {
  const owner = ownedFixtureRoot();
  const target = path.join(owner.root, "target");
  const outside = path.join(owner.root, "outside-dir");
  const destination = fixturePath(target, relativePath);

  try {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.mkdirSync(outside, { recursive: true });
    fs.symlinkSync(outside, destination, "dir");
    return { ...owner, target, outside, destination };
  } catch (error) {
    owner.cleanup();
    throw error;
  }
}

function normalizedRelative(root, absolute) {
  return path.relative(root, absolute).split(path.sep).join("/");
}

function snapshotTree(root) {
  const snapshot = new Map();
  let rootStat;
  try {
    rootStat = fs.lstatSync(root);
  } catch (error) {
    if (error.code === "ENOENT") return snapshot;
    throw error;
  }

  function visit(absolute, stat) {
    const relative = absolute === root ? "." : normalizedRelative(root, absolute);
    const mode = stat.mode & 0o777;

    if (stat.isSymbolicLink()) {
      snapshot.set(relative, { kind: "link", mode, target: fs.readlinkSync(absolute) });
      return;
    }
    if (stat.isFile()) {
      snapshot.set(relative, { kind: "file", mode, content: fs.readFileSync(absolute) });
      return;
    }
    if (!stat.isDirectory()) {
      snapshot.set(relative, { kind: "other", mode });
      return;
    }

    snapshot.set(relative, { kind: "dir", mode });
    const entries = fs.readdirSync(absolute, { withFileTypes: true })
      .map((entry) => entry.name)
      .sort();
    for (const name of entries) {
      const child = path.join(absolute, name);
      visit(child, fs.lstatSync(child));
    }
  }

  visit(root, rootStat);
  return snapshot;
}

function materializePlanFixture(plan) {
  const owner = ownedFixtureRoot();
  const target = path.join(owner.root, "target");

  try {
    for (const operation of plan.operations) {
      if (operation.action !== "create") continue;
      const destination = fixturePath(target, operation.relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, operation.content, { mode: operation.mode });
    }
    return target;
  } catch (error) {
    owner.cleanup();
    throw error;
  }
}

function installedFixture(options = {}) {
  const owner = ownedFixtureRoot();
  const target = path.join(owner.root, "target");

  try {
    installProject(target, options);
    return target;
  } catch (error) {
    owner.cleanup();
    throw error;
  }
}

module.exports = {
  installedFixture,
  symlinkFixture,
  symlinkParentFixture,
  snapshotTree,
  materializePlanFixture,
  readRepo,
};
