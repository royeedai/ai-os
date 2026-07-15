"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { installProject } = require("../bin/installer");
const { afterEach, assert, cleanup, test, tmpDir } = require("./helpers");
const { readRepo } = require("./contract-fixtures");

const roots = new Set();

afterEach(() => {
  cleanup(...roots);
  roots.clear();
});

function localReferences(content) {
  const values = new Set();
  for (const match of content.matchAll(/`([^`]+)`/gu)) values.add(match[1]);
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) values.add(match[1]);
  return [...values]
    .map((value) => value.replaceAll("{laneId}", "default"))
    .filter((value) => (
      !value.includes(" ")
      && !value.includes("*")
      && (value === "AGENTS.md" || value.startsWith(".ai-os/"))
    ));
}

test("installed pointers and source skill resolve every local artifact reference", () => {
  const root = fs.realpathSync.native(tmpDir());
  roots.add(root);
  installProject(root, { clock: () => new Date("2026-07-11T01:00:00.000Z") });
  const surfaces = [
    fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"),
    fs.readFileSync(path.join(root, "CLAUDE.md"), "utf8"),
    fs.readFileSync(path.join(root, "GEMINI.md"), "utf8"),
    readRepo("framework/skills/ai-os-delivery/SKILL.md"),
  ];
  for (const reference of new Set(surfaces.flatMap(localReferences))) {
    const absolute = path.join(root, ...reference.replace(/\/$/u, "").split("/"));
    const stat = fs.lstatSync(absolute);
    assert.equal(stat.isSymbolicLink(), false, reference);
    assert.ok(stat.isFile() || stat.isDirectory(), reference);
  }
  assert.equal(
    fs.readFileSync(path.join(root, ".ai-os/reference/artifacts.md"), "utf8"),
    readRepo("docs/artifacts.md"),
  );
  assert.doesNotMatch(surfaces.join("\n"), /`docs\/|\]\(docs\//u);
});
