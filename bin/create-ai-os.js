#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  InstallConflictError,
  InstallFilesystemError,
  InstallPlannerError,
  installProject,
} = require("./installer");

const PINNED_PUBLIC_INSTALL = "npx --yes github:royeedai/ai-os#v10.5.1 .";

function readFrameworkVersion() {
  try {
    return fs.readFileSync(path.resolve(__dirname, "..", "VERSION"), "utf8").trim();
  } catch {
    return "0.0.0";
  }
}

function printHelp(io, version) {
  io.stdout.write(`create-ai-os v${version} — AI Delivery Constitution installer

Usage:
  create-ai-os [target-dir]               Install AI-OS into the target (default: current dir)
  create-ai-os install [target-dir]       Explicit install alias (same behavior)
  create-ai-os doctor  [target-dir]       Check layout health and constitution compliance

Primary operations:
  install   Default entrypoint plus explicit alias
  doctor    Layout health and constitution compliance checks

Options:
  --force          Refresh framework-owned artifacts; preserve project/session files
  --no-team-config Skip .gitignore / .gitattributes setup
  --no-ide-files   Skip CLAUDE.md / GEMINI.md generation
  -h, --help       Show this help
  -v, --version    Show version

The safe installer plans the complete change before writing and applies it transactionally.
Daily zero-network health check after install:
  node .ai-os/bin/ai-os-doctor.js .

Docs: https://github.com/royeedai/ai-os
`);
}

function parseInstallArgs(argv) {
  const options = { force: false, teamConfig: true, ideFiles: true };
  let target = null;

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") return { help: true, options, target };
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--no-team-config") {
      options.teamConfig = false;
      continue;
    }
    if (arg === "--no-ide-files") {
      options.ideFiles = false;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`unknown option: ${arg}`);
    if (target !== null) throw new Error(`unexpected argument: ${arg}`);
    target = arg;
  }

  return { help: false, options, target };
}

function installResultReport(targetDir, result) {
  const warnings = Array.isArray(result.warnings) && result.warnings.length > 0
    ? `\nWarnings:\n${result.warnings.map((warning) => `  - ${warning}`).join("\n")}\n`
    : "";
  return `Installation complete.

  Target:    ${targetDir}
  Baseline:  ${result.baselineId}
  Layout:    ${result.layoutVersion}
  Created:   ${result.created}
  Replaced:  ${result.replaced}
  Preserved: ${result.preserved}
${warnings}
Daily health check (zero network):
  node .ai-os/bin/ai-os-doctor.js .
`;
}

function oneLineDiagnostic(error) {
  const knownInstallError = error instanceof InstallConflictError
    || error instanceof InstallFilesystemError
    || error instanceof InstallPlannerError;
  const raw = knownInstallError || error instanceof Error ? error.message : String(error);
  return String(raw || "unknown failure").replace(/[\r\n]+/g, " ").trim();
}

function runInstall(argv, io, install) {
  const parsed = parseInstallArgs(argv);
  if (parsed.help) {
    printHelp(io, readFrameworkVersion());
    return 0;
  }

  const targetDir = path.resolve(parsed.target || ".");
  const result = install(targetDir, parsed.options);
  io.stdout.write(installResultReport(targetDir, result));
  return 0;
}

function main(argv = process.argv.slice(2), io = process, install = installProject) {
  try {
    if (argv[0] === "-h" || argv[0] === "--help") {
      printHelp(io, readFrameworkVersion());
      return 0;
    }
    if (argv[0] === "-v" || argv[0] === "--version") {
      io.stdout.write(`${readFrameworkVersion()}\n`);
      return 0;
    }
    if (argv[0] === "upgrade") {
      throw new Error(
        `the \`upgrade\` command was removed in v10. Run \`${PINNED_PUBLIC_INSTALL}\` to install the pinned public release instead.`,
      );
    }
    if (argv[0] === "doctor") {
      const doctor = require("./ai-os-doctor");
      return doctor.main(argv.slice(1), io);
    }
    if (argv[0] === "install") return runInstall(argv.slice(1), io, install);
    return runInstall(argv, io, install);
  } catch (error) {
    io.stderr.write(`Error: ${oneLineDiagnostic(error)}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main();

module.exports = { main };
