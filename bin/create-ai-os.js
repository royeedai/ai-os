#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Subcommand routing: doctor / diff / upgrade
// ---------------------------------------------------------------------------

const _sub = process.argv[2];
if (["doctor", "diff", "upgrade", "validate", "status", "next", "resume", "release-check"].includes(_sub)) {
  process.argv.splice(2, 1);
  require(`./ai-os-${_sub}`);
} else {
// ---------------------------------------------------------------------------
// create-ai-os (init)
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const {
  PACKAGE_ROOT,
  PROJECT_ARTIFACT_DIRS,
  PROJECT_MANAGED_FILES_MANIFEST,
  PROJECT_STATE_ROOT,
  readFrameworkVersion,
  readPackageJson,
  ensureDir,
  fail,
  listFilesRecursively,
  listManagedFiles,
  sha256File,
  copyFileWithMode,
  getProjectTemplatePath,
  getProjectFilePath,
  getProjectRelativePath,
  getProjectRoot,
} = require("./shared");

const FRAMEWORK_VERSION = readFrameworkVersion();
const PACKAGE_JSON = readPackageJson();

function printHelp() {
  process.stdout.write(`Usage:
  create-ai-os [target-dir] [--target <dir>] [--with-project-files] [--force-framework]
  create-ai-os doctor [target-dir]     Check project health
  create-ai-os diff   [target-dir]     Compare framework files against source
  create-ai-os upgrade [target-dir]    Upgrade framework files to latest
  create-ai-os validate [target-dir]   Validate delivery artifacts
  create-ai-os status [target-dir]     Show current delivery status
  create-ai-os next [target-dir]       Show next ready tasks
  create-ai-os resume [target-dir]     Print resume context pack
  create-ai-os release-check [target-dir]  Check release readiness

  Cross-tool compatibility: The generated AGENTS.md and .agents/skills/*/SKILL.md
  are open standards supported by Antigravity, Cursor, and Codex.

Options:
  --target <dir>        Target project directory. Defaults to the first positional arg or the current directory.
  --with-project-files  Create missing project files under ${PROJECT_STATE_ROOT}/ such as project-charter.md, risk-register.md, tasks.yaml, acceptance.yaml, release-plan.md, memory.md, STATE.md, specs/, evals/
  --force-framework     Overwrite existing framework-managed files: AGENTS.md and .agents/
  -h, --help            Show this help message
`);
}

// Utility functions are now imported from ./shared.js

// listFilesRecursively is now imported from ./shared.js

function copyFramework(targetDir) {
  const managedRoots = ["AGENTS.md", ".agents"];

  for (const rootRel of managedRoots) {
    const srcRoot = path.join(PACKAGE_ROOT, rootRel);
    const dstRoot = path.join(targetDir, rootRel);

    if (fs.statSync(srcRoot).isFile()) {
      copyFileWithMode(srcRoot, dstRoot);
      process.stdout.write(`copied: ${rootRel}\n`);
      continue;
    }

    const files = listFilesRecursively(srcRoot);
    for (const srcFile of files) {
      const relativePath = path.relative(PACKAGE_ROOT, srcFile);
      const dstFile = path.join(targetDir, relativePath);
      copyFileWithMode(srcFile, dstFile);
      process.stdout.write(`copied: ${relativePath}\n`);
    }
  }
}

function copyTemplateIfMissing(targetDir, src, dst) {
  ensureDir(path.dirname(dst));
  if (fs.existsSync(dst)) {
    process.stdout.write(`keep existing project file: ${path.relative(targetDir, dst)}\n`);
    return;
  }

  copyFileWithMode(src, dst);
  process.stdout.write(`created project file: ${path.relative(targetDir, dst)}\n`);
}

function createProjectFiles(targetDir) {
  for (const dirName of PROJECT_ARTIFACT_DIRS) {
    ensureDir(getProjectFilePath(targetDir, dirName));
  }
  ensureDir(getProjectRoot(targetDir));

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath("project-charter.md"),
    getProjectFilePath(targetDir, "project-charter.md")
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath("risk-register.md"),
    getProjectFilePath(targetDir, "risk-register.md")
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath("tasks.yaml"),
    getProjectFilePath(targetDir, "tasks.yaml")
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath("acceptance.yaml"),
    getProjectFilePath(targetDir, "acceptance.yaml")
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath("release-plan.md"),
    getProjectFilePath(targetDir, "release-plan.md")
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath("memory.md"),
    getProjectFilePath(targetDir, "memory.md")
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath("STATE.md"),
    getProjectFilePath(targetDir, "STATE.md")
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath(path.join("specs", "example.spec.md")),
    getProjectFilePath(targetDir, path.join("specs", "example.spec.md"))
  );

  copyTemplateIfMissing(
    targetDir,
    getProjectTemplatePath(path.join("evals", "eval-example.md")),
    getProjectFilePath(targetDir, path.join("evals", "eval-example.md"))
  );
}

function writeMetadata(targetDir) {
  const metadataDir = getProjectRoot(targetDir);
  const metadataFile = getProjectFilePath(targetDir, "framework.toml");

  ensureDir(metadataDir);
  fs.writeFileSync(
    metadataFile,
    [
      'mode = "npx-git"',
      `framework_version = "${FRAMEWORK_VERSION}"`,
      `package_name = "${PACKAGE_JSON.name}"`,
      `package_version = "${PACKAGE_JSON.version}"`,
      `managed_files_manifest = "${getProjectRelativePath(PROJECT_MANAGED_FILES_MANIFEST)}"`,
      ""
    ].join("\n"),
    "utf8"
  );
}

function writeManagedFilesManifest(targetDir) {
  const manifestPath = getProjectFilePath(targetDir, PROJECT_MANAGED_FILES_MANIFEST);
  const lines = listManagedFiles(targetDir).map((relPath) => `${sha256File(path.join(targetDir, relPath))}\t${relPath}`);
  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, [...lines, ""].join("\n"), "utf8");
}

function removeManagedPaths(targetDir) {
  for (const relPath of ["AGENTS.md", ".agents"]) {
    const absolutePath = path.join(targetDir, relPath);
    let exists = false;
    try {
      fs.lstatSync(absolutePath);
      exists = true;
    } catch (_error) {
      exists = false;
    }

    if (!exists) {
      continue;
    }
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }
}

const args = process.argv.slice(2);
let targetArg = "";
let withProjectFiles = false;
let forceFramework = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === "-h" || arg === "--help") {
    printHelp();
    process.exit(0);
  }

  if (arg === "--with-project-files") {
    withProjectFiles = true;
    continue;
  }

  if (arg === "--force-framework") {
    forceFramework = true;
    continue;
  }

  if (arg === "--target") {
    if (i + 1 >= args.length) {
      fail("--target requires a value");
    }
    targetArg = args[i + 1];
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

const TARGET_DIR = path.resolve(targetArg || ".");
ensureDir(TARGET_DIR);

if (!forceFramework) {
  const existingFrameworkPaths = ["AGENTS.md", ".agents"]
    .map((relPath) => path.join(TARGET_DIR, relPath))
    .filter((absolutePath) => fs.existsSync(absolutePath));

  if (existingFrameworkPaths.length > 0) {
    fail(
      [
        "target project already contains framework-managed paths:",
        ...existingFrameworkPaths.map((absolutePath) => `- ${absolutePath}`),
        "rerun with --force-framework to overwrite them"
      ].join("\n")
    );
  }
} else {
  removeManagedPaths(TARGET_DIR);
}

process.stdout.write(`Initializing AI-OS ${FRAMEWORK_VERSION} into ${TARGET_DIR}\n`);

copyFramework(TARGET_DIR);

if (withProjectFiles) {
  createProjectFiles(TARGET_DIR);
}

writeMetadata(TARGET_DIR);
writeManagedFilesManifest(TARGET_DIR);

process.stdout.write(`
Initialization complete.

Framework version: ${FRAMEWORK_VERSION}
Package: ${PACKAGE_JSON.name}@${PACKAGE_JSON.version}
Target project: ${TARGET_DIR}

Next steps:
1. Open ${path.join(TARGET_DIR, getProjectRelativePath("project-charter.md"))} if you created project-local files.
2. Start with the /new-project workflow for a new project.
3. Commit the generated framework and project state files into the target repository.

Cross-tool compatibility:
- AGENTS.md: supported by Antigravity, Cursor, and Codex
- .agents/skills/*/SKILL.md: supported by Antigravity, Cursor, and Codex
`);

} // end else (init)
