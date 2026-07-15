"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { repoRoot } = require("./helpers");

const TRIGGERS = Object.freeze({
  "risk-register.md": "G2/high-risk",
  "release-plan.md": "release-intent-or-G2-release",
  "verification-matrix.yaml": "stable-failure-or-G2-guard",
  "specs/": "split-local-contracts",
  "design-pack/": "reverse-spec-parity",
  "evals/": "root-cause-observed-three-times",
});

const AUTHORITY = Object.freeze([
  "AGENTS.md",
  "lane.toml",
  "MISSION.md",
  "DESIGN.md",
  "tasks.yaml",
  "STATE.md",
]);

const SURFACE_PATHS = Object.freeze([
  "README.md",
  "PROJECT_PURPOSE.md",
  "CONTRIBUTING.md",
  "docs/interop.md",
  "docs/getting-started.md",
  "framework/.agents/templates/ide-pointers/CLAUDE.md",
  "framework/.agents/templates/ide-pointers/GEMINI.md",
  "framework/.agents/templates/root/AGENTS.md",
  "framework/skills/ai-os-delivery/SKILL.md",
]);

const SURFACE_RULES = Object.freeze(Object.fromEntries(SURFACE_PATHS.map((relativePath) => [
  relativePath,
  Object.freeze({
    required: Object.freeze(["{laneId}", "STATE", "rebuildable navigation"]),
    forbidden: Object.freeze([
      ".ai-os/lanes/default/STATE.md",
      "STATE priority highest",
      "STATE` 优先级最高",
      "union merge",
    ]),
  }),
])));

function readRepo(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function tableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function parseMarkdownRows(content, heading) {
  const lines = String(content).split(/\r?\n/u);
  const indexes = lines.flatMap((line, index) => line === heading ? [index] : []);
  if (indexes.length !== 1) throw new Error(`${heading} must occur exactly once`);
  let header = indexes[0] + 1;
  while (header < lines.length && !tableCells(lines[header] || "")) {
    if (/^#{1,6} /u.test(lines[header])) break;
    header += 1;
  }
  const headerCells = tableCells(lines[header] || "");
  const separator = tableCells(lines[header + 1] || "");
  if (!headerCells || headerCells.length < 2 || !separator
    || separator.length !== headerCells.length
    || separator.some((cell) => !/^:?-{3,}:?$/u.test(cell))) {
    throw new Error(`${heading} must own one canonical Markdown table`);
  }
  const rows = new Map();
  for (let index = header + 2; index < lines.length; index += 1) {
    if (!lines[index].trim() || /^#{1,6} /u.test(lines[index])) break;
    const cells = tableCells(lines[index]);
    if (!cells || cells.length !== headerCells.length || !cells[0] || !cells[1]) {
      throw new Error(`${heading} has an invalid row`);
    }
    const key = cells[0].replace(/^`|`$/gu, "");
    const value = cells[1].replace(/^`|`$/gu, "");
    if (rows.has(key)) throw new Error(`${heading} contains duplicate key ${key}`);
    rows.set(key, value);
  }
  if (rows.size === 0) throw new Error(`${heading} table must not be empty`);
  return rows;
}

module.exports = {
  AUTHORITY,
  SURFACE_RULES,
  TRIGGERS,
  parseMarkdownRows,
  readRepo,
};
