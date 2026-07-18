"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const CURRENT_DOCS = [
  "AGENTS.md",
  "README.md",
  "PROJECT_PURPOSE.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "CHANGELOG-archive.md",
  "docs/maintainers.md",
  "framework/.agents/templates/root/AGENTS.md",
  ...fs.readdirSync(path.join(ROOT, "evals"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `evals/${entry.name}`),
];

function localLinks(markdown) {
  return [...markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)]
    .map((match) => match[1].trim())
    .map((target) => target.startsWith("<") && target.endsWith(">") ? target.slice(1, -1) : target)
    .filter((target) => !target.startsWith("#"))
    .filter((target) => !/^[a-z][a-z\d+.-]*:/iu.test(target));
}

test("all links in current documentation resolve", () => {
  for (const relativePath of CURRENT_DOCS) {
    const source = path.join(ROOT, relativePath);
    const markdown = fs.readFileSync(source, "utf8");
    for (const rawTarget of localLinks(markdown)) {
      const fileTarget = decodeURIComponent(rawTarget.split("#", 1)[0]);
      const resolved = path.resolve(path.dirname(source), fileTarget);
      assert.ok(
        resolved === ROOT || resolved.startsWith(`${ROOT}${path.sep}`),
        `${relativePath}: link stays inside the repository: ${rawTarget}`,
      );
      assert.ok(fs.existsSync(resolved), `${relativePath}: ${rawTarget} resolves`);
    }
  }
});
