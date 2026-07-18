#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  InstallConflictError,
  InstallFilesystemError,
  installProject,
} = require("./installer");

const REMOVED_COMMANDS = new Set(["doctor", "upgrade"]);

function readFrameworkVersion() {
  try {
    return fs.readFileSync(path.resolve(__dirname, "..", "VERSION"), "utf8").trim();
  } catch {
    return "0.0.0";
  }
}

function printHelp(io, version = readFrameworkVersion()) {
  io.stdout.write(`create-ai-os v${version} — lightweight AI delivery constitution

Usage:
  create-ai-os [target-dir]
  create-ai-os install [target-dir]

Installs or refreshes only an AI-OS managed block in AGENTS.md.
Existing project-specific content outside the block is preserved.

Options:
  -h, --help       Show this help
  -v, --version    Show version

Docs: https://github.com/royeedai/ai-os
`);
}

function parseArgs(argv) {
  const args = [...argv];
  if (args[0] === "install") args.shift();
  if (REMOVED_COMMANDS.has(args[0])) {
    throw new Error(`the \`${args[0]}\` command was removed in v11`);
  }
  if (args.some((arg) => arg.startsWith("-"))) {
    throw new Error(`unknown option: ${args.find((arg) => arg.startsWith("-"))}`);
  }
  if (args.length > 1) throw new Error(`unexpected argument: ${args[1]}`);
  return path.resolve(args[0] || ".");
}

function installReport(result) {
  return `AI-OS lightweight constitution installed.

  Target:    ${result.targetDir}
  AGENTS.md: ${result.action}
`;
}

function oneLineDiagnostic(error) {
  const known = error instanceof InstallConflictError
    || error instanceof InstallFilesystemError;
  const raw = known || error instanceof Error ? error.message : String(error);
  return String(raw || "unknown failure").replace(/[\r\n]+/gu, " ").trim();
}

function main(argv = process.argv.slice(2), io = process, install = installProject) {
  try {
    const effective = argv[0] === "install" ? argv.slice(1) : argv;
    if (effective[0] === "-h" || effective[0] === "--help") {
      printHelp(io);
      return 0;
    }
    if (effective[0] === "-v" || effective[0] === "--version") {
      io.stdout.write(`${readFrameworkVersion()}\n`);
      return 0;
    }
    const targetDir = parseArgs(argv);
    io.stdout.write(installReport(install(targetDir)));
    return 0;
  } catch (error) {
    io.stderr.write(`Error: ${oneLineDiagnostic(error)}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main();

module.exports = Object.freeze({ main });
