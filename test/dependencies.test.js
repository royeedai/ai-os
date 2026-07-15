"use strict";

const { test, assert, readRepo } = require("./helpers");

test("lockfile excludes vulnerable brace-expansion 5.0.0 through 5.0.5", () => {
  const lock = JSON.parse(readRepo("package-lock.json"));
  const entry = lock.packages["node_modules/brace-expansion"];
  assert.ok(entry, "brace-expansion is locked");
  assert.doesNotMatch(entry.version, /^5\.0\.[0-5]$/);
});

test("supported Node floor matches package and contributing docs", () => {
  const pkg = JSON.parse(readRepo("package.json"));
  assert.equal(pkg.engines.node, ">=22.13.0");
  assert.match(readRepo("CONTRIBUTING.md"), /Node\.js 22\.13\+/);
});

test("package remains private with no lifecycle scripts or production dependencies", () => {
  const pkg = JSON.parse(readRepo("package.json"));
  assert.equal(pkg.private, true);
  assert.equal(pkg.dependencies, undefined);
  for (const name of Object.keys(pkg.scripts || {})) {
    assert.doesNotMatch(name, /^(pre|post)?(install|publish|pack)$/);
  }
});
