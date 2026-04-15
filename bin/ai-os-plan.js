#!/usr/bin/env node

/**
 * ai-os-plan — Preview an AI-OS installation plan without mutating files.
 *
 * Usage:
 *   ai-os-plan [target-dir] [--profile <name>] [--with-project-files] [--lite] [--json]
 *   ai-os-plan --help
 */

const path = require("path");
const {
  buildInstallPlan,
  detectInstallProfileName,
  readInstalledMeta,
  fail,
} = require("./shared");

function mapRelPaths(entries, action) {
  return entries
    .filter((entry) => entry.action === action)
    .map((entry) => entry.relPath)
    .sort();
}

function serializePlan(plan) {
  return {
    targetDir: plan.targetDir,
    profile: plan.profile,
    lite: plan.lite,
    framework: {
      copy: mapRelPaths(plan.frameworkFiles, "copy"),
      keep: mapRelPaths(plan.frameworkFiles, "keep"),
    },
    metadata: plan.metadataFiles.map((entry) => entry.relPath).sort(),
    project: plan.profile.includeProjectFiles
      ? {
        create: mapRelPaths(plan.projectEntries, "create"),
        keep: mapRelPaths(plan.projectEntries, "keep"),
      }
      : null,
    summary: plan.summary,
  };
}

function printHelp() {
  process.stdout.write(`Usage:
  ai-os-plan [target-dir] [--profile <name>] [--with-project-files] [--force-framework] [--lite] [--json]

Preview what create-ai-os would manage without copying files.
The target path may point to an existing project or a new directory.

Options:
  --profile <name>      Install profile to preview. Defaults to the detected install profile or manifest default.
  --with-project-files  Compatibility alias for --profile project.
  --force-framework     Preview framework overwrite instead of keep-existing behavior.
  --lite                Preview the minimal framework footprint.
  --json                Emit machine-readable JSON.
  -h, --help            Show this help message
`);
}

const args = process.argv.slice(2);
let targetArg = "";
let profileArg = "";
let useProjectProfile = false;
let forceFramework = false;
let lite = false;
let json = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }
  if (arg === "--with-project-files") {
    useProjectProfile = true;
    continue;
  }
  if (arg === "--force-framework") {
    forceFramework = true;
    continue;
  }
  if (arg === "--lite") {
    lite = true;
    continue;
  }
  if (arg === "--json") {
    json = true;
    continue;
  }
  if (arg === "--profile") {
    if (i + 1 >= args.length) {
      fail("--profile requires a value");
    }
    profileArg = args[i + 1];
    i += 1;
    continue;
  }
  if (arg.startsWith("-")) {
    fail(`unknown option: ${arg}`);
  }
  if (targetArg) {
    fail(`unexpected argument: ${arg}`);
  }
  targetArg = arg;
}

if (useProjectProfile && profileArg && profileArg !== "project") {
  fail("--with-project-files cannot be combined with a different --profile");
}

const targetDir = path.resolve(targetArg || ".");

const installedMeta = readInstalledMeta(targetDir);
const profileName = useProjectProfile
  ? "project"
  : (profileArg || detectInstallProfileName(targetDir, { meta: installedMeta }));
let plan;
try {
  plan = buildInstallPlan(targetDir, {
    installProfile: profileName,
    overwriteFramework: forceFramework,
    lite,
  });
} catch (error) {
  fail(error.message);
}

if (json) {
  process.stdout.write(`${JSON.stringify(serializePlan(plan), null, 2)}\n`);
  process.exit(0);
}

process.stdout.write(`\nAI-OS install plan — ${plan.targetDir}\n`);
process.stdout.write(`Profile: ${plan.profile.name}\n`);
process.stdout.write(`Description: ${plan.profile.description}\n\n`);

process.stdout.write("Managed scope:\n");
process.stdout.write(`  - framework: ${plan.frameworkFiles.length} file(s) under AGENTS.md and .agents/${plan.lite ? " (lite)" : ""}\n`);
process.stdout.write(`  - metadata: ${plan.metadataFiles.length} file(s) under .ai-os/\n`);
if (plan.profile.includeProjectFiles) {
  const sharedEntries = plan.projectEntries.filter((e) => e.scope === "shared");
  const laneEntries = plan.projectEntries.filter((e) => e.scope === "lane");
  if (sharedEntries.length > 0 && laneEntries.length > 0) {
    process.stdout.write(
      `  - shared project artifacts: ${sharedEntries.length} path(s) under .ai-os/\n`
    );
    process.stdout.write(
      `  - lane delivery artifacts: ${laneEntries.length} path(s) under .ai-os/lanes/default/\n`
    );
  } else {
    process.stdout.write(
      `  - project artifacts: ${plan.projectEntries.length} starter path(s) under .ai-os/\n`
    );
  }
} else {
  process.stdout.write("  - project artifacts: not included in this profile\n");
}

process.stdout.write("\nPlanned actions:\n");
process.stdout.write(`  - framework copy: ${plan.summary.frameworkCopyCount}\n`);
process.stdout.write(`  - framework keep: ${plan.summary.frameworkKeepCount}\n`);
process.stdout.write(`  - metadata write: ${plan.summary.metadataWriteCount}\n`);
if (plan.profile.includeProjectFiles) {
  process.stdout.write(`  - project create: ${plan.summary.projectCreateCount}\n`);
  process.stdout.write(`  - project keep: ${plan.summary.projectKeepCount}\n`);
}

process.stdout.write("\nApply with:\n");
process.stdout.write(`  create-ai-os ${plan.targetDir} --profile ${plan.profile.name}${plan.lite ? " --lite" : ""}\n\n`);
