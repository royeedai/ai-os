#!/usr/bin/env node

/**
 * ai-os-token-budget — Analyze token cost of installed framework files.
 *
 * Usage:
 *   ai-os-token-budget [target-dir] [--source]
 *   ai-os-token-budget --help
 */

const fs = require("fs");
const path = require("path");
const {
  FRAMEWORK_ROOT,
  MANAGED_ROOTS,
  isLiteIncluded,
  listFilesRecursively,
  parseCliArgs,
  C_RESET,
  C_CYAN,
  C_DIM,
  C_GREEN,
  C_YELLOW,
} = require("./shared");

const parsed = parseCliArgs(process.argv, {
  booleanFlags: ["--source", "--lite"],
});

if (parsed.flags.help) {
  process.stdout.write(`Usage:
  ai-os-token-budget [target-dir] [--source] [--lite]

Analyze the token budget consumed by AI-OS framework files.

Options:
  --source    Analyze the source framework (mother repo) instead of an installed project
  --lite      Show only files included in --lite install mode
  -h, --help  Show this help message
`);
  process.exit(0);
}

const baseDir = parsed.flags.source
  ? FRAMEWORK_ROOT
  : path.resolve(parsed.positional || ".");

if (!fs.existsSync(baseDir)) {
  process.stderr.write(`Directory not found: ${baseDir}\n`);
  process.exit(1);
}

// -------------------------------------------------------------------------
// Collect framework files
// -------------------------------------------------------------------------

const allEntries = [];
const liteFilter = parsed.flags.lite;

for (const rootRel of MANAGED_ROOTS) {
  const rootPath = path.join(baseDir, rootRel);
  if (!fs.existsSync(rootPath)) continue;
  if (fs.statSync(rootPath).isFile()) {
    const rel = rootRel;
    if (liteFilter && !isLiteIncluded(rel)) continue;
    allEntries.push({ rel, abs: rootPath });
    continue;
  }
  for (const absFile of listFilesRecursively(rootPath)) {
    const rel = path.relative(baseDir, absFile).replace(/\\/g, "/");
    if (liteFilter && !isLiteIncluded(rel)) continue;
    allEntries.push({ rel, abs: absFile });
  }
}

if (allEntries.length === 0) {
  process.stdout.write("No framework files found.\n");
  process.exit(0);
}

// -------------------------------------------------------------------------
// Character counting and token estimation
// -------------------------------------------------------------------------

function countChars(content) {
  let cjk = 0;
  let ascii = 0;
  for (const ch of content) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3000 && code <= 0x303f) ||
      (code >= 0xff00 && code <= 0xffef)
    ) {
      cjk += 1;
    } else {
      ascii += 1;
    }
  }
  return { cjk, ascii, total: cjk + ascii };
}

function estimateTokens(chars) {
  return Math.ceil(chars.cjk * 1.5 + chars.ascii * 0.25);
}

// -------------------------------------------------------------------------
// Categorize and measure
// -------------------------------------------------------------------------

function categorize(rel) {
  if (rel === "AGENTS.md" || rel === ".agents/AGENTS.md") return "AGENTS.md (root)";
  if (rel.startsWith(".agents/workflows/")) return "workflows";
  if (rel.startsWith(".agents/skills/")) return "skills";
  if (rel.startsWith(".agents/templates/")) return "templates";
  if (rel.startsWith(".agents/policies/")) return "policies";
  if (rel.startsWith(".agents/references/")) return "references";
  return "other";
}

const measured = allEntries.map((entry) => {
  const content = fs.readFileSync(entry.abs, "utf8");
  const chars = countChars(content);
  return {
    rel: entry.rel,
    chars: chars.total,
    tokens: estimateTokens(chars),
    category: categorize(entry.rel),
  };
});

// -------------------------------------------------------------------------
// Report
// -------------------------------------------------------------------------

const modeLabel = liteFilter ? " (lite mode)" : "";
process.stdout.write(`\nAI-OS Token Budget${modeLabel} — ${baseDir}\n\n`);

const categoryOrder = ["AGENTS.md (root)", "workflows", "skills", "templates", "policies", "references", "other"];
let grandChars = 0;
let grandTokens = 0;
let grandFiles = 0;

for (const cat of categoryOrder) {
  const entries = measured.filter((e) => e.category === cat);
  if (entries.length === 0) continue;
  const catChars = entries.reduce((sum, e) => sum + e.chars, 0);
  const catTokens = entries.reduce((sum, e) => sum + e.tokens, 0);
  grandChars += catChars;
  grandTokens += catTokens;
  grandFiles += entries.length;

  process.stdout.write(
    `  ${C_CYAN}${cat.padEnd(20)}${C_RESET} ${String(entries.length).padStart(3)} files  ~${String(catTokens).padStart(6)} tokens  ${String(catChars).padStart(8)} chars\n`
  );
}

process.stdout.write(
  `\n  ${C_GREEN}${"Total".padEnd(20)}${C_RESET} ${String(grandFiles).padStart(3)} files  ~${String(grandTokens).padStart(6)} tokens  ${String(grandChars).padStart(8)} chars\n`
);

process.stdout.write(`\n${C_YELLOW}Top 10 largest files:${C_RESET}\n`);
const sorted = [...measured].sort((a, b) => b.tokens - a.tokens);
for (const entry of sorted.slice(0, 10)) {
  process.stdout.write(`  ${String(entry.tokens).padStart(6)} tokens  ${entry.rel}\n`);
}

process.stdout.write(`\n${C_DIM}Context window reference (estimated):${C_RESET}\n`);
const models = [
  ["GPT-4o", 128000],
  ["Claude Sonnet/Opus", 200000],
  ["Gemini 2.5", 1000000],
];
for (const [name, window] of models) {
  const pct = ((grandTokens / window) * 100).toFixed(1);
  process.stdout.write(`${C_DIM}  ${name.padEnd(20)} ${String(window / 1000).padStart(5)}K — framework ≈ ${pct}%${C_RESET}\n`);
}
process.stdout.write("\n");
