#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const matrixPath = path.join(
  repoRoot,
  "docs/superpowers/plans/2026-07-10-ai-os-v11-completion-matrix.md",
);
const REQUIREMENT_COUNTS = Object.freeze({
  D01: 2,
  D02: 6,
  D03: 5,
  D04: 5,
  D05: 6,
  D06: 23,
  D07: 10,
  D08: 22,
  D09: 15,
  D10: 6,
  D11: 24,
  D12: 6,
  D13: 6,
  D14: 10,
  D15: 16,
  D16: 8,
  D17: 5,
  D18: 13,
  D19: 7,
});
const REQUIREMENT_IDS = Object.freeze(Object.entries(REQUIREMENT_COUNTS).flatMap(
  ([section, count]) => Array.from(
    { length: count },
    (_, index) => `${section}-R${String(index + 1).padStart(2, "0")}`,
  ),
));
const STATUSES = new Set(["pending", "pass", "fail", "blocked", "live"]);
const EVIDENCE_ROOT_FILES = new Set([
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "PROJECT_PURPOSE.md",
  "README.md",
  "RELEASED_VERSION",
  "SECURITY.md",
  "VERSION",
  "package-lock.json",
  "package.json",
]);
const EVIDENCE_PREFIXES = Object.freeze([
  ".github/",
  "bin/",
  "docs/",
  "evals/",
  "examples/",
  "framework/",
  "scripts/",
  "test/",
]);

function splitMarkdownRow(line) {
  if (!line.startsWith("|") || !line.endsWith("|")) return null;
  const cells = [];
  let cell = "";
  let escaped = false;
  let code = false;
  for (let index = 1; index < line.length - 1; index += 1) {
    const character = line[index];
    if (escaped) {
      cell += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
      cell += character;
    } else if (character === "`") {
      code = !code;
      cell += character;
    } else if (character === "|" && !code) {
      cells.push(cell.trim().replace(/\\\|/gu, "|"));
      cell = "";
    } else {
      cell += character;
    }
  }
  if (escaped || code) throw new Error("matrix row has an unterminated escape or code span");
  cells.push(cell.trim().replace(/\\\|/gu, "|"));
  return cells;
}

function parseMatrix(content) {
  if (typeof content !== "string" || content.includes("\r")) {
    throw new Error("matrix must be canonical LF UTF-8 text");
  }
  const lines = content.split("\n");
  const header = "| ID | Requirement | Evidence command/source | Expected | Actual | Status |";
  const headerIndex = lines.indexOf(header);
  if (headerIndex < 0) throw new Error("matrix header is missing");
  if (lines[headerIndex + 1] !== "|---|---|---|---|---|---|") {
    throw new Error("matrix separator is not canonical");
  }
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) continue;
    const cells = splitMarkdownRow(line);
    if (!cells || cells.length !== 6) throw new Error("matrix row must have exactly six cells");
    const [id, requirement, evidence, expected, actual, status] = cells;
    if (!/^D\d{2}-R\d{2}$/u.test(id)) throw new Error(`invalid requirement ID: ${id}`);
    if ([requirement, evidence, expected, actual, status].some((value) => value.length === 0)) {
      throw new Error(`${id} has an empty matrix cell`);
    }
    if (!STATUSES.has(status)) throw new Error(`${id} has invalid status: ${status}`);
    rows.push(Object.freeze({ id, requirement, evidence, expected, actual, status }));
  }
  return Object.freeze(rows);
}

function verifyCatalog(rows) {
  const actual = rows.map((row) => row.id);
  const duplicates = actual.filter((id, index) => actual.indexOf(id) !== index);
  if (duplicates.length) throw new Error(`duplicate requirement IDs: ${[...new Set(duplicates)].join(", ")}`);
  const expectedSet = new Set(REQUIREMENT_IDS);
  const unknown = actual.filter((id) => !expectedSet.has(id));
  const actualSet = new Set(actual);
  const missing = REQUIREMENT_IDS.filter((id) => !actualSet.has(id));
  if (unknown.length || missing.length) {
    throw new Error(`requirement catalog mismatch; unknown=${unknown.join(",") || "none"}; missing=${missing.join(",") || "none"}`);
  }
  if (actual.some((id, index) => id !== REQUIREMENT_IDS[index])) {
    throw new Error("matrix requirement IDs are not in canonical order");
  }
}

function evidenceReferences(evidence) {
  const references = new Set();
  const addToken = (rawToken, explicitLink = false) => {
    const token = rawToken
      .replace(/^[`("'[{<]+/u, "")
      .replace(/[`)"'\]},;:>]+$/u, "");
    if (
      token.length === 0
      || /^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(token)
      || /^refs\/(?:heads|remotes|tags)\//u.test(token)
    ) {
      return;
    }
    const pathLike = (
      explicitLink
      || EVIDENCE_ROOT_FILES.has(token)
      || EVIDENCE_PREFIXES.some((prefix) => token.startsWith(prefix))
      || /^(?:\/|\.{1,2}\/|[A-Za-z]:[\\/])/u.test(token)
      || token.includes("\\")
      || /^[^/\s]+\/(?:[^/\s]+\/|[^/\s]*\.[^/\s]+$)/u.test(token)
    );
    if (pathLike) references.add(token);
  };
  let remaining = String(evidence);
  remaining = remaining.replace(
    /\[[^\]\r\n]*\]\(([^)\s]+)(?:\s+["'][^)\r\n]*["'])?\)/gu,
    (_match, destination) => {
      addToken(destination, true);
      return " ";
    },
  );
  for (const rawToken of remaining.split(/\s+/u)) {
    addToken(rawToken);
  }
  return [...references].sort();
}

function verifyEvidenceReferences(rows, repositoryRoot = repoRoot) {
  const root = fs.realpathSync.native(path.resolve(repositoryRoot));
  for (const row of rows) {
    for (const relativePath of evidenceReferences(row.evidence)) {
      const normalized = path.posix.normalize(relativePath);
      if (
        relativePath.includes("\\")
        || normalized !== relativePath
        || path.posix.isAbsolute(relativePath)
        || normalized === ".."
        || normalized.startsWith("../")
      ) {
        throw new Error(`${row.id} has unsafe evidence reference: ${relativePath}`);
      }
      if (
        !EVIDENCE_ROOT_FILES.has(relativePath)
        && !EVIDENCE_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
      ) {
        throw new Error(`${row.id} has unsupported evidence reference: ${relativePath}`);
      }
      const absolute = path.resolve(root, ...relativePath.split("/"));
      const fromRoot = path.relative(root, absolute);
      if (fromRoot === ".." || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) {
        throw new Error(`${row.id} evidence reference escapes repository: ${relativePath}`);
      }
      let stat;
      try {
        stat = fs.lstatSync(absolute);
      } catch (error) {
        if (!["ENOENT", "ENOTDIR"].includes(error.code)) throw error;
        throw new Error(
          `${row.id} evidence reference is missing: ${relativePath}`,
          { cause: error },
        );
      }
      if (stat.isSymbolicLink()) {
        throw new Error(`${row.id} evidence reference is a symbolic link: ${relativePath}`);
      }
      if (!stat.isFile()) {
        throw new Error(`${row.id} evidence reference is not a regular file: ${relativePath}`);
      }
      const real = fs.realpathSync.native(absolute);
      const realFromRoot = path.relative(root, real);
      if (
        realFromRoot === ".."
        || realFromRoot.startsWith(`..${path.sep}`)
        || path.isAbsolute(realFromRoot)
      ) {
        throw new Error(`${row.id} evidence reference escapes repository: ${relativePath}`);
      }
    }
  }
}

function runValidator(relativePath) {
  const result = spawnSync(process.execPath, [path.join(repoRoot, relativePath)], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.signal || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || "").trim();
    throw new Error(`${relativePath} failed${detail ? `: ${detail}` : ""}`);
  }
}

function verifyRows(rows, { allowPending = false, runLiveValidators = true } = {}) {
  verifyCatalog(rows);
  verifyEvidenceReferences(rows);
  const failed = rows.filter((row) => row.status === "fail");
  if (failed.length) throw new Error(`failed requirements: ${failed.map((row) => row.id).join(", ")}`);
  const unresolved = rows.filter((row) => ["pending", "blocked"].includes(row.status));
  if (!allowPending && unresolved.length) {
    throw new Error(`unresolved requirements: ${unresolved.map((row) => row.id).join(", ")}`);
  }
  for (const row of rows) {
    if (row.actual === "pending" && !allowPending) throw new Error(`${row.id} still has pending evidence`);
    if (row.status === "pass" && row.actual === "pending") throw new Error(`${row.id} is pass without actual evidence`);
  }
  if (!allowPending && runLiveValidators && rows.some((row) => row.status === "live")) {
    runValidator("scripts/verify-remote-evidence.js");
    runValidator("scripts/verify-repository-settings.js");
  }
  return Object.freeze({ requirements: rows.length, unresolved: unresolved.length });
}

function main(argv = process.argv.slice(2)) {
  const allowed = new Set(["--allow-pending"]);
  const unknown = argv.filter((argument) => !allowed.has(argument));
  if (unknown.length) throw new Error(`unknown option: ${unknown.join(", ")}`);
  const rows = parseMatrix(fs.readFileSync(matrixPath, "utf8"));
  const summary = verifyRows(rows, { allowPending: argv.includes("--allow-pending") });
  process.stdout.write(`completion matrix: ${summary.requirements} requirements, ${summary.unresolved} unresolved\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(`completion matrix verification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  REQUIREMENT_COUNTS,
  REQUIREMENT_IDS,
  evidenceReferences,
  main,
  parseMatrix,
  splitMarkdownRow,
  verifyCatalog,
  verifyEvidenceReferences,
  verifyRows,
});
